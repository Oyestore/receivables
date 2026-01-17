import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FollowUpSequence } from '../entities/follow-up-sequence.entity';
import { FollowUpStep } from '../entities/follow-up-step.entity';
import { DistributionService } from './distribution.service';
import { TemplateManagementService } from './template-management.service';

export interface FollowUpJobData {
    invoiceId: string;
    stepId: string;
    templateId: string;
    sequenceId: string;
    retryCount: number;
    maxRetries: number;
    scheduledFor: Date;
}

@Injectable()
@Processor('follow-up')
export class EnhancedFollowUpEngineService {
    private readonly logger = new Logger(EnhancedFollowUpEngineService.name);

    constructor(
        @InjectRepository(FollowUpSequence)
        private sequenceRepo: Repository<FollowUpSequence>,
        @InjectRepository(FollowUpStep)
        private stepRepo: Repository<FollowUpStep>,
        @InjectQueue('follow-up') private followUpQueue: Queue,
        private distributionService: DistributionService,
        private templateService: TemplateManagementService,
    ) { }

    /**
     * Schedule follow-up sequence for an invoice
     */
    async scheduleFollowUpSequence(
        invoiceId: string,
        sequenceId: string,
        options: {
            startDelay?: number; // Hours
            tenantId: string;
        },
    ): Promise<void> {
        const sequence = await this.sequenceRepo.findOne({
            where: { id: sequenceId },
            relations: ['steps'],
        });

        if (!sequence || !sequence.is_active) {
            throw new Error(`Follow-up sequence ${sequenceId} not found or inactive`);
        }

        // Sort steps by order
        const steps = sequence.steps.sort((a, b) => a.step_order - b.step_order);

        let cumulativeDelay = options.startDelay || 0;

        for (const step of steps) {
            cumulativeDelay += step.delay_hours;

            const scheduledFor = new Date();
            scheduledFor.setHours(scheduledFor.getHours() + cumulativeDelay);

            const jobData: FollowUpJobData = {
                invoiceId,
                stepId: step.id,
                templateId: step.template_id,
                sequenceId,
                retryCount: 0,
                maxRetries: 3,
                scheduledFor,
            };

            await this.followUpQueue.add('send-follow-up', jobData, {
                delay: cumulativeDelay * 3600 * 1000, // Convert to milliseconds
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 60000, // Start with 1 minute
                },
                removeOnComplete: false,
                removeOnFail: false,
            });

            this.logger.log(
                `Scheduled follow-up step ${step.id} for invoice ${invoiceId} at ${scheduledFor}`,
            );
        }
    }

    /**
     * Process follow-up job
     */
    @Process('send-follow-up')
    async handleFollowUp(job: Job<FollowUpJobData>): Promise<void> {
        const { invoiceId, stepId, templateId, retryCount, maxRetries, sequenceId } = job.data;

        this.logger.log(`Processing follow-up: invoice=${invoiceId}, step=${stepId}, attempt=${retryCount + 1}`);

        try {
            // Get invoice data
            const invoiceData = await this.getInvoiceData(invoiceId);

            // Check if invoice status requires skip
            if (this.shouldSkipFollowUp(invoiceData)) {
                this.logger.log(`Skipping follow-up for invoice ${invoiceId} - status: ${invoiceData.status}`);
                await this.markStepSkipped(stepId, 'Invoice status changed');
                return;
            }

            // Render template
            const rendered = await this.templateService.renderTemplate(
                templateId,
                invoiceData.tenant_id,
                {
                    invoice_number: invoiceData.number,
                    client_name: invoiceData.client_name,
                    amount: invoiceData.grand_total,
                    due_date: invoiceData.due_date,
                    payment_link: invoiceData.payment_link,
                    balance_due: invoiceData.balance_due,
                },
            );

            // Send via distribution service
            const step = await this.stepRepo.findOne({ where: { id: stepId } });

            const result = await this.distributionService.send({
                invoiceId,
                channel: step.channel,
                content: rendered.body,
                subject: rendered.subject,
                recipient: invoiceData.client_email || invoiceData.client_phone,
            });

            if (result.success) {
                await this.markStepCompleted(stepId, result.messageId);
                this.logger.log(`Follow-up sent successfully: ${result.messageId}`);
            } else {
                throw new Error(result.error || 'Distribution failed');
            }
        } catch (error) {
            this.logger.error(`Follow-up failed: ${error.message}`, error.stack);

            if (retryCount < maxRetries) {
                // Retry with exponential backoff
                const backoffDelay = Math.pow(2, retryCount) * 60000; // Exponential: 1min, 2min, 4min

                await this.followUpQueue.add(
                    'send-follow-up',
                    {
                        ...job.data,
                        retryCount: retryCount + 1,
                    },
                    {
                        delay: backoffDelay,
                    },
                );

                this.logger.log(`Scheduled retry ${retryCount + 1}/${maxRetries} in ${backoffDelay / 1000}s`);
            } else {
                // Max retries exceeded
                await this.markStepFailed(stepId, error.message);
                this.logger.error(`Follow-up failed permanently after ${maxRetries} retries`);
            }
        }
    }

    /**
     * Pause follow-up sequence
     */
    async pauseFollowUpSequence(invoiceId: string, sequenceId: string): Promise<void> {
        // Find all pending jobs for this invoice/sequence
        const jobs = await this.followUpQueue.getJobs(['delayed', 'waiting']);

        for (const job of jobs) {
            if (
                job.data.invoiceId === invoiceId &&
                job.data.sequenceId === sequenceId
            ) {
                await job.remove();
                this.logger.log(`Removed follow-up job ${job.id} for invoice ${invoiceId}`);
            }
        }
    }

    /**
     * Resume follow-up sequence
     */
    async resumeFollowUpSequence(invoiceId: string, sequenceId: string): Promise<void> {
        // Reschedule from current step
        const sequence = await this.sequenceRepo.findOne({
            where: { id: sequenceId },
            relations: ['steps'],
        });

        const completedSteps = await this.getCompletedSteps(invoiceId, sequenceId);
        const remainingSteps = sequence.steps.filter(
            (step) => !completedSteps.includes(step.id),
        );

        let cumulativeDelay = 0;

        for (const step of remainingSteps.sort((a, b) => a.step_order - b.step_order)) {
            cumulativeDelay += step.delay_hours;

            await this.followUpQueue.add(
                'send-follow-up',
                {
                    invoiceId,
                    stepId: step.id,
                    templateId: step.template_id,
                    sequenceId,
                    retryCount: 0,
                    maxRetries: 3,
                    scheduledFor: new Date(Date.now() + cumulativeDelay * 3600 * 1000),
                },
                {
                    delay: cumulativeDelay * 3600 * 1000,
                },
            );
        }

        this.logger.log(`Resumed follow-up sequence for invoice ${invoiceId}`);
    }

    /**
     * Cron job to process scheduled follow-ups
     */
    @Cron(CronExpression.EVERY_HOUR)
    async processScheduledFollowUps(): Promise<void> {
        this.logger.log('Processing scheduled follow-ups (hourly check)');

        const activeJobs = await this.followUpQueue.getJobCounts();
        this.logger.log(`Active follow-up jobs: ${JSON.stringify(activeJobs)}`);

        // Clean up completed jobs older than 7 days
        const completedJobs = await this.followUpQueue.getCompleted();
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        for (const job of completedJobs) {
            if (job.finishedOn && job.finishedOn < sevenDaysAgo) {
                await job.remove();
            }
        }

        this.logger.log(`Cleaned up old completed jobs`);
    }

    /**
     * Get follow-up analytics
     */
    async getFollowUpAnalytics(
        tenantId: string,
        dateRange: { start: Date; end: Date },
    ): Promise<{
        total_sent: number;
        success_rate: number;
        by_sequence: Array<{ sequence_id: string; sent: number; success: number }>;
        by_channel: Array<{ channel: string; sent: number; success: number }>;
        avg_response_time: number;
    }> {
        // Implementation would query from step execution history
        // Placeholder for now
        return {
            total_sent: 0,
            success_rate: 0,
            by_sequence: [],
            by_channel: [],
            avg_response_time: 0,
        };
    }

    // Private helper methods

    private async getInvoiceData(invoiceId: string): Promise<any> {
        // Call M01 to get invoice data
        // For now, return mock data
        return {
            id: invoiceId,
            number: 'INV-001',
            tenant_id: 'tenant-123',
            status: 'sent',
            grand_total: 10000,
            balance_due: 10000,
            due_date: new Date(),
            client_name: 'Acme Corp',
            client_email: 'billing@acme.com',
            client_phone: '+1234567890',
            payment_link: 'https://pay.example.com/inv-001',
        };
    }

    private shouldSkipFollowUp(invoiceData: any): boolean {
        // Skip if invoice is paid or cancelled
        return ['paid', 'cancelled', 'void'].includes(invoiceData.status);
    }

    private async markStepCompleted(stepId: string, messageId?: string): Promise<void> {
        await this.stepRepo.update(stepId, {
            status: 'completed',
            executed_at: new Date(),
            message_id: messageId,
        } as any);
    }

    private async markStepFailed(stepId: string, errorMessage: string): Promise<void> {
        await this.stepRepo.update(stepId, {
            status: 'failed',
            executed_at: new Date(),
            error_message: errorMessage,
        } as any);
    }

    private async markStepSkipped(stepId: string, reason: string): Promise<void> {
        await this.stepRepo.update(stepId, {
            status: 'skipped',
            executed_at: new Date(),
            error_message: reason,
        } as any);
    }

    private async getCompletedSteps(invoiceId: string, sequenceId: string): Promise<string[]> {
        // Query completed steps from history
        return [];
    }
}
