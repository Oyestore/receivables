import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CollectionCase, CollectionSequence } from '../entities/collection-case.entity';
import { InvoiceService } from '../../../Module_01_Smart_Invoice_Generation/src/services/invoice.service';
import { NotificationService } from '../../../Module_11_Common/src/services/notification.service';

interface CollectionStep {
    sequence: number;
    type: 'email' | 'sms' | 'call' | 'whatsapp' | 'legal_notice';
    templateId: string;
    delayDays: number;
    status: 'pending' | 'sent' | 'skipped' | 'failed';
    scheduledAt: Date | null;
    executedAt: Date | null;
    metadata: Record<string, any>;
}

@Injectable()
export class CollectionSequenceService {
    private readonly logger = new Logger(CollectionSequenceService.name);

    // Default collection sequence templates
    private readonly DEFAULT_SEQUENCES = {
        friendly: [
            { type: 'email', templateId: 'friendly_reminder_1', delayDays: 0 },
            { type: 'email', templateId: 'friendly_reminder_2', delayDays: 7 },
            { type: 'sms', templateId: 'payment_reminder', delayDays: 14 },
        ],
        formal: [
            { type: 'email', templateId: 'formal_notice_1', delayDays: 0 },
            { type: 'email', templateId: 'formal_notice_2', delayDays: 7 },
            { type: 'sms', templateId: 'formal_notice_sms', delayDays: 7 },
            { type: 'email', templateId: 'final_notice', delayDays: 14 },
            { type: 'sms', templateId: 'final_notice_sms', delayDays: 14 },
        ],
        legal: [
            { type: 'email', templateId: 'pre_legal_warning', delayDays: 0 },
            { type: 'sms', templateId: 'pre_legal_warning_sms', delayDays: 0 },
            { type: 'legal_notice', templateId: 'legal_demand_letter', delayDays: 7 },
            { type: 'email', templateId: 'legal_notice_sent', delayDays: 14 },
        ],
    };

    constructor(
        @InjectRepository(CollectionSequence)
        private sequenceRepo: Repository<CollectionSequence>,
        @InjectRepository(CollectionCase)
        private collectionCaseRepo: Repository<CollectionCase>,
        private readonly invoiceService: InvoiceService,
        private readonly notificationService: NotificationService,
    ) { }

    /**
     * Start collection sequence for a case
     */
    async startSequence(
        collectionCaseId: string,
        tenantId: string,
        sequenceType: 'friendly' | 'formal' | 'legal' = 'friendly',
    ): Promise<CollectionSequence> {
        const collectionCase = await this.collectionCaseRepo.findOne({
            where: { id: collectionCaseId, tenantId },
        });

        if (!collectionCase) {
            throw new NotFoundException(`Collection case ${collectionCaseId} not found`);
        }

        // Check if sequence already exists
        const existing = await this.sequenceRepo.findOne({
            where: { collectionCaseId, tenantId, status: 'active' as any },
        });

        if (existing) {
            this.logger.warn(`Active sequence already exists for case ${collectionCaseId}`);
            return existing;
        }

        // Get template
        const template = this.DEFAULT_SEQUENCES[sequenceType];
        const now = new Date();

        // Create steps
        const steps: CollectionStep[] = template.map((step, index) => ({
            sequence: index,
            type: step.type as any,
            templateId: step.templateId,
            delayDays: step.delayDays,
            status: 'pending',
            scheduledAt: new Date(now.getTime() + step.delayDays * 24 * 60 * 60 * 1000),
            executedAt: null,
            metadata: {},
        }));

        const sequence = this.sequenceRepo.create({
            collectionCaseId,
            tenantId,
            name: `${sequenceType}_sequence`,
            steps,
            status: 'active',
            currentStep: 0,
            startedAt: now,
        });

        const saved = await this.sequenceRepo.save(sequence);

        this.logger.log(`Started ${sequenceType} sequence for collection case ${collectionCase.caseNumber}`);

        return saved;
    }

    /**
     * Process scheduled sequence steps (runs every hour)
     */
    @Cron(CronExpression.EVERY_HOUR)
    async processScheduledSteps(): Promise<void> {
        this.logger.debug('Processing scheduled collection sequence steps...');

        const activeSequences = await this.sequenceRepo.find({
            where: { status: 'active' as any },
        });

        for (const sequence of activeSequences) {
            try {
                await this.processSequence(sequence);
            } catch (error) {
                this.logger.error(
                    `Error processing sequence ${sequence.id}: ${(error as Error).message}`,
                );
            }
        }
    }

    /**
     * Process a single sequence
     */
    private async processSequence(sequence: CollectionSequence): Promise<void> {
        const now = new Date();
        const currentStep = sequence.steps[sequence.currentStep];

        if (!currentStep) {
            // No more steps, complete sequence
            sequence.status = 'completed';
            sequence.completedAt = now;
            await this.sequenceRepo.save(sequence);
            this.logger.log(`Completed sequence ${sequence.id}`);
            return;
        }

        // Check if step is due
        if (currentStep.scheduledAt && currentStep.scheduledAt <= now && currentStep.status === 'pending') {
            await this.executeStep(sequence, sequence.currentStep);
        }
    }

    /**
     * Execute a sequence step
     */
    private async executeStep(sequence: CollectionSequence, stepIndex: number): Promise<void> {
        const step = sequence.steps[stepIndex];

        this.logger.log(
            `Executing step ${stepIndex} (${step.type}) for sequence ${sequence.id}`,
        );

        try {
            // TODO: Integrate with M11 for actual sending
            switch (step.type) {
                case 'email':
                    await this.sendEmail(sequence, step);
                    break;
                case 'sms':
                    await this.sendSMS(sequence, step);
                    break;
                case 'whatsapp':
                    await this.sendWhatsApp(sequence, step);
                    break;
                case 'legal_notice':
                    await this.generateLegalNotice(sequence, step);
                    break;
                case 'call':
                    await this.scheduleCall(sequence, step);
                    break;
            }

            // Mark step as sent
            step.status = 'sent';
            step.executedAt = new Date();

            // Move to next step
            sequence.currentStep += 1;

            await this.sequenceRepo.save(sequence);

            this.logger.log(`Successfully executed step ${stepIndex} for sequence ${sequence.id}`);
        } catch (error) {
            step.status = 'failed';
            step.metadata.error = (error as Error).message;
            await this.sequenceRepo.save(sequence);

            this.logger.error(`Failed to execute step ${stepIndex}: ${(error as Error).message}`);
        }
    }

    /**
     * Pause sequence
     */
    async pauseSequence(sequenceId: string, tenantId: string): Promise<CollectionSequence> {
        const sequence = await this.sequenceRepo.findOne({
            where: { id: sequenceId, tenantId },
        });

        if (!sequence) {
            throw new NotFoundException(`Sequence ${sequenceId} not found`);
        }

        sequence.status = 'paused';
        const saved = await this.sequenceRepo.save(sequence);

        this.logger.log(`Paused sequence ${sequenceId}`);
        return saved;
    }

    /**
     * Resume sequence
     */
    async resumeSequence(sequenceId: string, tenantId: string): Promise<CollectionSequence> {
        const sequence = await this.sequenceRepo.findOne({
            where: { id: sequenceId, tenantId },
        });

        if (!sequence) {
            throw new NotFoundException(`Sequence ${sequenceId} not found`);
        }

        if (sequence.status !== 'paused') {
            throw new Error(`Sequence is not paused (current status: ${sequence.status})`);
        }

        sequence.status = 'active';
        const saved = await this.sequenceRepo.save(sequence);

        this.logger.log(`Resumed sequence ${sequenceId}`);
        return saved;
    }

    /**
     * Cancel sequence
     */
    async cancelSequence(sequenceId: string, tenantId: string): Promise<CollectionSequence> {
        const sequence = await this.sequenceRepo.findOne({
            where: { id: sequenceId, tenantId },
        });

        if (!sequence) {
            throw new NotFoundException(`Sequence ${sequenceId} not found`);
        }

        sequence.status = 'cancelled';
        sequence.completedAt = new Date();
        const saved = await this.sequenceRepo.save(sequence);

        this.logger.log(`Cancelled sequence ${sequenceId}`);
        return saved;
    }

    /**
     * Get sequence for collection case
     */
    async getSequence(collectionCaseId: string, tenantId: string): Promise<CollectionSequence | null> {
        return this.sequenceRepo.findOne({
            where: { collectionCaseId, tenantId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Integration methods (TODO: complete with M11)
     */
    private async sendEmail(sequence: CollectionSequence, step: CollectionStep): Promise<void> {
        const collectionCase = await this.collectionCaseRepo.findOne({ where: { id: sequence.collectionCaseId } });
        if (!collectionCase) return;

        // Fetch invoice to get customer email
        const invoice = await this.invoiceService.findOne(collectionCase.tenantId, collectionCase.invoiceId);
        if (!invoice || !invoice.customerEmail) {
            this.logger.warn(`Cannot send email for sequence ${sequence.id}: Customer email not found`);
            return;
        }

        await this.notificationService.sendTemplatedEmail(
            invoice.customerEmail,
            step.templateId,
            {
                name: invoice.customerName || 'Customer',
                amount: collectionCase.outstandingAmount.toString(),
                invoiceNumber: invoice.invoiceNumber,
                dueDate: invoice.dueDate ? invoice.dueDate.toString() : 'Immediate'
            },
            collectionCase.tenantId
        );
        this.logger.log(`Sent email using template ${step.templateId} to ${invoice.customerEmail}`);
    }

    private async sendSMS(sequence: CollectionSequence, step: CollectionStep): Promise<void> {
        const collectionCase = await this.collectionCaseRepo.findOne({ where: { id: sequence.collectionCaseId } });
        if (!collectionCase) return;

        const invoice = await this.invoiceService.findOne(collectionCase.tenantId, collectionCase.invoiceId);
        if (!invoice || !invoice.customerPhone) {
            this.logger.warn(`Cannot send SMS for sequence ${sequence.id}: Customer phone not found`);
            return;
        }

        await this.notificationService.sendSMS({
            to: invoice.customerPhone,
            message: `Reminder: Invoice ${invoice.invoiceNumber} for ${collectionCase.outstandingAmount} is overdue. Please pay immediately.`,
            tenantId: collectionCase.tenantId
        });
        this.logger.log(`Sent SMS using template ${step.templateId} to ${invoice.customerPhone}`);
    }

    private async sendWhatsApp(sequence: CollectionSequence, step: CollectionStep): Promise<void> {
        const collectionCase = await this.collectionCaseRepo.findOne({ where: { id: sequence.collectionCaseId } });
        if (!collectionCase) return;

        const invoice = await this.invoiceService.findOne(collectionCase.tenantId, collectionCase.invoiceId);
        if (!invoice || !invoice.customerPhone) {
            this.logger.warn(`Cannot send WhatsApp for sequence ${sequence.id}: Customer phone not found`);
            return;
        }

        await this.notificationService.sendWhatsApp({
            to: invoice.customerPhone,
            templateName: step.templateId, // Assuming templateId matches WhatsApp template name
            templateParams: {
                1: invoice.customerName || 'Customer',
                2: invoice.invoiceNumber,
                3: collectionCase.outstandingAmount.toString()
            },
            tenantId: collectionCase.tenantId
        });
        this.logger.log(`Sent WhatsApp using template ${step.templateId} to ${invoice.customerPhone}`);
    }

    private async generateLegalNotice(sequence: CollectionSequence, step: CollectionStep): Promise<void> {
        // TODO: Integrate with DocumentGeneratorService (Next Step)
        this.logger.log(`Would generate legal notice using template ${step.templateId}`);
    }

    private async scheduleCall(sequence: CollectionSequence, step: CollectionStep): Promise<void> {
        // TODO: Create task for collection agent (Next Step)
        this.logger.log(`Would schedule call for sequence ${sequence.id}`);
    }
}
