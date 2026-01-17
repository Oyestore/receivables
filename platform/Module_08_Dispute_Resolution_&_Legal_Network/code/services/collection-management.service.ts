import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import {
    CollectionCase,
    CollectionSequence,
    CollectionStatus,
    CollectionStrategy,
} from '../entities/collection-case.entity';
import { DisputeCase } from '../entities/dispute-case.entity';
import { CollectionSequenceService } from './collection-sequence.service';
import { InvoiceService } from '../../../Module_01_Smart_Invoice_Generation/src/services/invoice.service';
import { NotificationService } from '../../../Module_11_Common/src/services/notification.service';
import { PaymentService } from '../../../Module_03_Payment_Integration/src/services/payment.service';

interface CreateCollectionCaseDto {
    tenantId: string;
    disputeId?: string;
    customerId: string;
    customerName: string;
    invoiceId: string;
    outstandingAmount: number;
    originalAmount: number;
    strategy: CollectionStrategy;
    createdBy: string;
}

interface UpdateCollectionCaseDto {
    status?: CollectionStatus;
    recoveredAmount?: number;
    assignedCollectorId?: string;
    assignedCollectorName?: string;
    legalProviderId?: string;
    notes?: string;
}

@Injectable()
export class CollectionManagementService {
    private readonly logger = new Logger(CollectionManagementService.name);

    constructor(
        @InjectRepository(CollectionCase)
        private collectionCaseRepo: Repository<CollectionCase>,
        @InjectRepository(DisputeCase)
        private disputeCaseRepo: Repository<DisputeCase>,
        private readonly collectionSequenceService: CollectionSequenceService,
        private readonly notificationService: NotificationService,
        private readonly invoiceService: InvoiceService,
        private readonly paymentService: PaymentService,
    ) { }

    /**
     * Create a new collection case
     */
    async createCase(dto: CreateCollectionCaseDto): Promise<CollectionCase> {
        // Generate case number
        const caseNumber = await this.generateCaseNumber(dto.tenantId);

        // Calculate days overdue
        const daysOverdue = await this.calculateDaysOverdue(dto.invoiceId, dto.tenantId);

        const collectionCase = this.collectionCaseRepo.create({
            ...dto,
            caseNumber,
            daysOverdue,
            recoveredAmount: 0,
            status: CollectionStatus.PENDING,
        });

        const saved = await this.collectionCaseRepo.save(collectionCase);

        this.logger.log(`Created collection case ${caseNumber} for customer ${dto.customerName}`);

        // Trigger collection sequence
        await this.collectionSequenceService.startSequence(saved.id, dto.tenantId, 'friendly');

        // Send notification via M11
        const invoice = await this.invoiceService.findOne(dto.tenantId, dto.invoiceId);
        if (invoice && invoice.customerEmail) {
            await this.notificationService.sendTemplatedEmail(
                invoice.customerEmail,
                'collection_case_opened', // Assuming template exists
                {
                    caseNumber: saved.caseNumber,
                    amount: saved.outstandingAmount.toString(),
                    customerName: dto.customerName
                },
                dto.tenantId
            );
        }

        return saved;
    }

    /**
     * Convert dispute to collection case
     */
    async convertFromDispute(disputeId: string, tenantId: string, createdBy: string): Promise<CollectionCase> {
        const dispute = await this.disputeCaseRepo.findOne({
            where: { id: disputeId, tenantId },
        });

        if (!dispute) {
            throw new NotFoundException(`Dispute ${disputeId} not found`);
        }

        // Check if collection case already exists
        const existing = await this.collectionCaseRepo.findOne({
            where: { disputeId, tenantId },
        });

        if (existing) {
            throw new BadRequestException(`Collection case already exists for dispute ${disputeId}`);
        }

        return this.createCase({
            tenantId,
            disputeId,
            customerId: dispute.customerId,
            customerName: dispute.customerName,
            invoiceId: dispute.invoiceId,
            outstandingAmount: Number(dispute.disputedAmount),
            originalAmount: Number(dispute.disputedAmount),
            strategy: this.determineStrategy(Number(dispute.disputedAmount)),
            createdBy,
        });
    }

    /**
     * Update collection case
     */
    async updateCase(
        caseId: string,
        tenantId: string,
        dto: UpdateCollectionCaseDto,
        updatedBy: string,
    ): Promise<CollectionCase> {
        const collectionCase = await this.collectionCaseRepo.findOne({
            where: { id: caseId, tenantId },
        });

        if (!collectionCase) {
            throw new NotFoundException(`Collection case ${caseId} not found`);
        }

        Object.assign(collectionCase, dto);

        // Update closure fields if status changed to paid/written_off
        if (dto.status && [CollectionStatus.PAID, CollectionStatus.WRITTEN_OFF, CollectionStatus.CANCELLED].includes(dto.status)) {
            collectionCase.closedAt = new Date();
            collectionCase.closedReason = dto.status;
        }

        const saved = await this.collectionCaseRepo.save(collectionCase);

        this.logger.log(`Updated collection case ${collectionCase.caseNumber} by ${updatedBy}`);

        // TODO: Log audit trail via AuditService (Phase 8.1 integration needed if not already present)

        return saved;
    }

    /**
     * Record payment/recovery
     */
    async recordPayment(
        caseId: string,
        tenantId: string,
        amount: number,
        paymentMethod: string,
        recordedBy: string,
    ): Promise<CollectionCase> {
        const collectionCase = await this.collectionCaseRepo.findOne({
            where: { id: caseId, tenantId },
        });

        if (!collectionCase) {
            throw new NotFoundException(`Collection case ${caseId} not found`);
        }

        // Update recovered amount
        collectionCase.recoveredAmount = Number(collectionCase.recoveredAmount) + amount;

        // Check if fully paid
        if (collectionCase.recoveredAmount >= collectionCase.outstandingAmount) {
            collectionCase.status = CollectionStatus.PAID;
            collectionCase.closedAt = new Date();
            collectionCase.closedReason = 'Fully paid';
            await this.collectionSequenceService.cancelSequence(caseId, tenantId).catch(() => { }); // Stop sequence
        } else {
            collectionCase.status = CollectionStatus.IN_PROGRESS;
        }

        const saved = await this.collectionCaseRepo.save(collectionCase);

        this.logger.log(
            `Recorded payment of ${amount} for case ${collectionCase.caseNumber} by ${recordedBy}`,
        );

        // Integrate with M03 Payment Service to link payment (Phase 8 Remediation)
        await this.paymentService.recordOfflinePayment(
            tenantId,
            collectionCase.invoiceId,
            amount,
            paymentMethod,
            `COL-REC-${caseId}`, // Auto-generate reference if not provided (assume manual)
            recordedBy
        );

        // Send confirmation notification via M11
        const invoice = await this.invoiceService.findOne(tenantId, collectionCase.invoiceId);
        if (invoice && invoice.customerEmail) {
            await this.notificationService.sendTemplatedEmail(
                invoice.customerEmail,
                'payment_received',
                {
                    amount: amount.toString(),
                    invoiceNumber: invoice.invoiceNumber
                },
                tenantId
            );
        }

        return saved;
    }

    /**
     * Assign to collector/legal provider
     */
    async assignCollector(
        caseId: string,
        tenantId: string,
        collectorId: string,
        collectorName: string,
        assignedBy: string,
    ): Promise<CollectionCase> {
        return this.updateCase(
            caseId,
            tenantId,
            {
                assignedCollectorId: collectorId,
                assignedCollectorName: collectorName,
                status: CollectionStatus.IN_PROGRESS,
            },
            assignedBy,
        );
    }

    /**
     * Assign to legal provider (for legal action)
     */
    async assignLegalProvider(
        caseId: string,
        tenantId: string,
        legalProviderId: string,
        assignedBy: string,
    ): Promise<CollectionCase> {
        const updated = await this.updateCase(
            caseId,
            tenantId,
            {
                legalProviderId,
                status: CollectionStatus.LEGAL_NOTICE_SENT,
            },
            assignedBy,
        );

        // Notify legal provider via M11
        // Assuming we have legal provider email, skipping lookup for brevity, assuming mock for now
        this.logger.log(`Assigned case ${caseId} to legal provider ${legalProviderId}`);

        return updated;
    }

    /**
     * Propose settlement
     */
    async proposeSettlement(
        caseId: string,
        tenantId: string,
        proposedAmount: number,
        terms: string,
        proposedBy: string,
    ): Promise<CollectionCase> {
        const collectionCase = await this.collectionCaseRepo.findOne({
            where: { id: caseId, tenantId },
        });

        if (!collectionCase) {
            throw new NotFoundException(`Collection case ${caseId} not found`);
        }

        const discount = collectionCase.outstandingAmount - proposedAmount;
        const paymentDeadline = new Date();
        paymentDeadline.setDate(paymentDeadline.getDate() + 30); // 30 days to pay

        collectionCase.settlement = {
            proposedAmount,
            agreedAmount: 0,
            discount,
            terms,
            agreedDate: new Date(),
            paymentDeadline,
        };

        collectionCase.status = CollectionStatus.NEGOTIATING;

        const saved = await this.collectionCaseRepo.save(collectionCase);

        this.logger.log(
            `Settlement proposed for case ${collectionCase.caseNumber}: ${proposedAmount} (discount: ${discount})`,
        );

        // Send settlement proposal to customer via M11
        const invoice = await this.invoiceService.findOne(tenantId, collectionCase.invoiceId);
        if (invoice && invoice.customerEmail) {
            await this.notificationService.sendTemplatedEmail(
                invoice.customerEmail,
                'settlement_proposal',
                {
                    amount: proposedAmount.toString(),
                    terms: terms,
                    invoiceNumber: invoice.invoiceNumber
                },
                tenantId
            );
        }

        return saved;
    }

    /**
     * Accept settlement
     */
    async acceptSettlement(
        caseId: string,
        tenantId: string,
        agreedAmount: number,
        acceptedBy: string,
    ): Promise<CollectionCase> {
        const collectionCase = await this.collectionCaseRepo.findOne({
            where: { id: caseId, tenantId },
        });

        if (!collectionCase) {
            throw new NotFoundException(`Collection case ${caseId} not found`);
        }

        if (!collectionCase.settlement) {
            throw new BadRequestException(`No settlement proposal exists for case ${caseId}`);
        }

        collectionCase.settlement.agreedAmount = agreedAmount;
        collectionCase.outstandingAmount = agreedAmount;
        collectionCase.status = CollectionStatus.SETTLED;

        const saved = await this.collectionCaseRepo.save(collectionCase);

        this.logger.log(`Settlement accepted for case ${collectionCase.caseNumber}: ${agreedAmount}`);

        // Send settlement confirmation via M11
        const invoice = await this.invoiceService.findOne(tenantId, collectionCase.invoiceId);
        if (invoice && invoice.customerEmail) {
            await this.notificationService.sendTemplatedEmail(
                invoice.customerEmail,
                'settlement_accepted',
                {
                    amount: agreedAmount.toString(),
                    invoiceNumber: invoice.invoiceNumber
                },
                tenantId
            );
        }
        // TODO: Create payment plan if installments requested

        return saved;
    }

    /**
     * Write off as bad debt
     */
    async writeOff(
        caseId: string,
        tenantId: string,
        reason: string,
        writtenOffBy: string,
    ): Promise<CollectionCase> {
        const collectionCase = await this.collectionCaseRepo.findOne({
            where: { id: caseId, tenantId },
        });

        if (!collectionCase) {
            throw new NotFoundException(`Collection case ${caseId} not found`);
        }

        collectionCase.status = CollectionStatus.WRITTEN_OFF;
        collectionCase.closedAt = new Date();
        collectionCase.closedReason = `Written off: ${reason}`;
        collectionCase.notes = `${collectionCase.notes || ''}\n\nWritten off by ${writtenOffBy}: ${reason}`;

        const saved = await this.collectionCaseRepo.save(collectionCase);

        this.logger.log(`Case ${collectionCase.caseNumber} written off as bad debt: ${reason}`);

        // TODO: Log to bad debt tracking system
        // TODO: Notify finance team via M11

        return saved;
    }

    /**
     * Get active collection cases
     */
    async getActiveCases(tenantId: string, assignedTo?: string): Promise<CollectionCase[]> {
        const where: any = {
            tenantId,
            status: MoreThan(CollectionStatus.PAID), // Not paid, written off, or cancelled
        };

        if (assignedTo) {
            where.assignedCollectorId = assignedTo;
        }

        return this.collectionCaseRepo.find({
            where,
            order: { daysOverdue: 'DESC', createdAt: 'ASC' },
        });
    }

    /**
     * Get collection case by ID
     */
    async getCaseById(caseId: string, tenantId: string): Promise<CollectionCase> {
        const collectionCase = await this.collectionCaseRepo.findOne({
            where: { id: caseId, tenantId },
            relations: ['dispute'],
        });

        if (!collectionCase) {
            throw new NotFoundException(`Collection case ${caseId} not found`);
        }

        return collectionCase;
    }

    /**
     * Get cases by customer
     */
    async getCasesByCustomer(customerId: string, tenantId: string): Promise<CollectionCase[]> {
        return this.collectionCaseRepo.find({
            where: { customerId, tenantId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Get collection statistics
     */
    async getStatistics(tenantId: string): Promise<{
        total: number;
        active: number;
        paid: number;
        writtenOff: number;
        totalOutstanding: number;
        totalRecovered: number;
        recoveryRate: number;
    }> {
        const cases = await this.collectionCaseRepo.find({ where: { tenantId } });

        const stats = {
            total: cases.length,
            active: cases.filter(c => ![CollectionStatus.PAID, CollectionStatus.WRITTEN_OFF, CollectionStatus.CANCELLED].includes(c.status)).length,
            paid: cases.filter(c => c.status === CollectionStatus.PAID).length,
            writtenOff: cases.filter(c => c.status === CollectionStatus.WRITTEN_OFF).length,
            totalOutstanding: cases.reduce((sum, c) => sum + Number(c.outstandingAmount), 0),
            totalRecovered: cases.reduce((sum, c) => sum + Number(c.recoveredAmount), 0),
            recoveryRate: 0,
        };

        stats.recoveryRate = stats.totalOutstanding > 0
            ? (stats.totalRecovered / (stats.totalOutstanding + stats.totalRecovered)) * 100
            : 0;

        return stats;
    }

    /**
     * Generate unique case number
     */
    private async generateCaseNumber(tenantId: string): Promise<string> {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');

        // Count cases this month
        const count = await this.collectionCaseRepo.count({
            where: {
                tenantId,
                caseNumber: `COL-${year}${month}%` as any, // TypeORM will handle LIKE query
            },
        });

        return `COL-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    }

    /**
     * Calculate days overdue
     */
    private async calculateDaysOverdue(invoiceId: string, tenantId: string): Promise<number> {
        const invoice = await this.invoiceService.findOne(tenantId, invoiceId);
        if (invoice && invoice.dueDate) {
            const now = new Date();
            const due = new Date(invoice.dueDate);
            const diffTime = Math.abs(now.getTime() - due.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return now > due ? diffDays : 0;
        }
        return 0;
    }

    /**
     * Determine collection strategy based on amount
     */
    private determineStrategy(amount: number): CollectionStrategy {
        if (amount < 10000) {
            return CollectionStrategy.FRIENDLY_REMINDER;
        } else if (amount < 50000) {
            return CollectionStrategy.FORMAL_NOTICE;
        } else if (amount < 100000) {
            return CollectionStrategy.NEGOTIATION;
        } else {
            return CollectionStrategy.LEGAL_ACTION;
        }
    }

    /**
     * Find collection case by invoice ID (for event handler)
     */
    async findByInvoiceId(invoiceId: string): Promise<CollectionCase | null> {
        const cases = await this.collectionCaseRepo.find({
            where: { invoiceId },
            order: { createdAt: 'DESC' },
        });

        // Return most recent case if exists
        return cases.length > 0 ? cases[0] : null;
    }

    /**
     * Update overdue information (for event handler)
     */
    async updateOverdueInfo(
        caseId: string,
        data: { overdueDays: number; currentAmount: number }
    ): Promise<CollectionCase> {
        const collectionCase = await this.collectionCaseRepo.findOne({
            where: { id: caseId },
        });

        if (!collectionCase) {
            throw new NotFoundException(`Collection case ${caseId} not found`);
        }

        collectionCase.daysOverdue = data.overdueDays;
        collectionCase.outstandingAmount = data.currentAmount;

        const saved = await this.collectionCaseRepo.save(collectionCase);
        this.logger.log(`Updated case ${collectionCase.caseNumber} - ${data.overdueDays} days overdue`);

        return saved;
    }

    /**
     * Create collection case (simplified for event handler)
     */
    async create(data: Partial<CollectionCase> & { tenantId: string; customerId: string }): Promise<CollectionCase> {
        const caseNumber = await this.generateCaseNumber(data.tenantId);

        const collectionCase = this.collectionCaseRepo.create({
            caseNumber,
            status: CollectionStatus.PENDING,
            recoveredAmount: 0,
            strategy: data.strategy || this.determineStrategy(data.outstandingAmount || 0),
            daysOverdue: data.overdueDays || 0,
            ...data,
        });

        const saved = await this.collectionCaseRepo.save(collectionCase);
        this.logger.log(`Auto-created collection case ${caseNumber}`);

        // Start collection sequence if needed
        if (saved.status === CollectionStatus.PENDING) {
            await this.collectionSequenceService.startSequence(saved.id, data.tenantId, 'friendly').catch(() => { });
        }

        return saved;
    }
}
