import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Milestone } from '../../entities/milestone.entity';
import { MilestoneVerification } from '../../entities/milestone-verification.entity';
import { PAYMENT_EVENTS } from '../../events/event-constants';
import { PaymentReleasedEvent, PaymentCompletedEvent, PaymentFailedEvent } from '../../events/workflow.events';

/**
 * Payment Integration Service
 * 
 * Handles all integration with Module 03 (Payment Processing)
 * - Auto-releases payments upon verification approval
 * - Tracks payment status
 * - Listens to payment events
 */
@Injectable()
export class PaymentIntegrationService {
    private readonly logger = new Logger(PaymentIntegrationService.name);
    private readonly module03BaseUrl: string;

    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly httpService: HttpService,
        @InjectRepository(Milestone)
        private readonly milestoneRepository: Repository<Milestone>,
        @InjectRepository(MilestoneVerification)
        private readonly verificationRepository: Repository<MilestoneVerification>,
    ) {
        this.module03BaseUrl = process.env.MODULE_03_URL || 'http://localhost:3003';
        this.logger.log(`Payment Integration initialized - Module 03 URL: ${this.module03BaseUrl}`);
    }

    /**
     * Release payment for verified milestone
     */
    async releasePayment(verificationId: string): Promise<{
        paymentId: string;
        amount: number;
        status: string;
    }> {
        try {
            this.logger.log(`Releasing payment for verification: ${verificationId}`);

            // Fetch verification with milestone details
            const verification = await this.verificationRepository.findOne({
                where: { id: verificationId, isDeleted: false },
                relations: ['milestone', 'milestone.workflowInstance'],
            });

            if (!verification) {
                throw new HttpException(
                    `Verification ${verificationId} not found`,
                    HttpStatus.NOT_FOUND,
                );
            }

            if (verification.status !== 'APPROVED') {
                throw new HttpException(
                    `Cannot release payment for non-approved verification`,
                    HttpStatus.BAD_REQUEST,
                );
            }

            const milestone = verification.milestone;

            if (milestone.paymentId) {
                this.logger.warn(`Milestone ${milestone.id} already has payment: ${milestone.paymentId}`);
                return {
                    paymentId: milestone.paymentId,
                    amount: milestone.paymentAmount,
                    status: milestone.paymentStatus,
                };
            }

            // Prepare payment data
            const paymentData = {
                tenantId: milestone.tenantId,
                invoiceId: milestone.invoiceId,
                amount: milestone.paymentAmount,
                currency: milestone.currency || 'INR',
                recipientId: milestone.ownerId || milestone.customerId,
                recipientType: 'vendor',
                paymentMethod: 'bank_transfer',
                description: `Milestone Payment: ${milestone.name}`,
                metadata: {
                    verificationId: verification.id,
                    milestoneId: milestone.id,
                    workflowInstanceId: milestone.workflowInstanceId,
                    approvedBy: verification.approvedBy,
                    approvedAt: verification.approvedAt,
                    autoReleased: true,
                    source: 'Module_05_Milestone',
                },
            };

            // Call Module 03 API to release payment
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.module03BaseUrl}/api/v1/payments/release`,
                    paymentData,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Tenant-ID': milestone.tenantId,
                        },
                        timeout: 10000,
                    }
                )
            );

            const payment = response.data.data || response.data;

            // Update milestone with payment reference
            await this.milestoneRepository.update(milestone.id, {
                paymentId: payment.id,
                paymentStatus: 'RELEASED',
                paymentReleasedAt: new Date(),
                updatedAt: new Date(),
            });

            this.logger.log(
                `Payment released successfully - Payment ID: ${payment.id}, Milestone ID: ${milestone.id}`
            );

            return {
                paymentId: payment.id,
                amount: payment.amount,
                status: payment.status,
            };
        } catch (error) {
            this.logger.error(
                `Failed to release payment for verification ${verificationId}: ${error.message}`,
                error.stack,
            );

            // Log failure
            await this.verificationRepository.update(verificationId, {
                paymentReleaseError: error.message,
                updatedAt: new Date(),
            });

            throw new HttpException(
                `Payment release failed: ${error.message}`,
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Handle payment released event from Module 03
     */
    async handlePaymentReleased(event: PaymentReleasedEvent): Promise<void> {
        try {
            const milestoneId = event.metadata?.milestoneId;

            if (!milestoneId) {
                return;
            }

            this.logger.log(`Received payment.released event for milestone: ${milestoneId}`);

            // Update milestone status
            await this.milestoneRepository.update(milestoneId, {
                paymentId: event.paymentId,
                paymentStatus: 'RELEASED',
                paymentReleasedAt: event.releasedAt,
                updatedAt: new Date(),
            });

            // Emit milestone payment released event
            this.eventEmitter.emit('milestone.payment.released', {
                milestoneId,
                paymentId: event.paymentId,
                amount: event.amount,
                releasedAt: event.releasedAt,
            });

        } catch (error) {
            this.logger.error(`Error handling payment.released event: ${error.message}`);
        }
    }

    /**
     * Handle payment completed event from Module 03
     */
    async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
        try {
            const milestoneId = event.metadata?.milestoneId;

            if (!milestoneId) {
                return;
            }

            this.logger.log(`Received payment.completed event for milestone: ${milestoneId}`);

            // Update milestone status
            const milestone = await this.milestoneRepository.findOne({
                where: { id: milestoneId, isDeleted: false },
                relations: ['workflowInstance'],
            });

            if (milestone) {
                await this.milestoneRepository.update(milestoneId, {
                    paymentStatus: 'COMPLETED',
                    paidAt: event.completedAt,
                    updatedAt: new Date(),
                });

                // Unlock dependent milestones
                await this.unlockDependentMilestones(milestoneId);

                // Emit milestone fully paid event
                this.eventEmitter.emit('milestone.fully.paid', {
                    milestoneId,
                    paymentId: event.paymentId,
                    completedAt: event.completedAt,
                });

                this.logger.log(`Milestone ${milestoneId} payment completed, dependent milestones unlocked`);
            }
        } catch (error) {
            this.logger.error(`Error handling payment.completed event: ${error.message}`);
        }
    }

    /**
     * Handle payment failed event from Module 03
     */
    async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
        try {
            const milestoneId = event.metadata?.milestoneId;

            if (!milestoneId) {
                return;
            }

            this.logger.log(`Received payment.failed event for milestone: ${milestoneId}`);

            // Update milestone status
            await this.milestoneRepository.update(milestoneId, {
                paymentStatus: 'FAILED',
                paymentFailureReason: event.failureReason,
                updatedAt: new Date(),
            });

            // Create escalation for failed payment
            this.eventEmitter.emit('escalation.create', {
                milestoneId,
                escalationLevel: 'HIGH',
                reason: `Payment failed: ${event.failureReason}`,
                assignedTo: [], // Will be auto-assigned by escalation service
            });

            this.logger.log(`Milestone ${milestoneId} payment failed, escalation created`);
        } catch (error) {
            this.logger.error(`Error handling payment.failed event: ${error.message}`);
        }
    }

    /**
     * Unlock dependent milestones after payment completion
     */
    private async unlockDependentMilestones(milestoneId: string): Promise<void> {
        try {
            const milestone = await this.milestoneRepository.findOne({
                where: { id: milestoneId, isDeleted: false },
            });

            if (!milestone) {
                return;
            }

            // Find milestones dependent on this one
            const dependentMilestones = await this.milestoneRepository.find({
                where: {
                    workflowInstanceId: milestone.workflowInstanceId,
                    status: 'BLOCKED',
                    isDeleted: false,
                },
            });

            for (const dependent of dependentMilestones) {
                // Check if this milestone was blocking the dependent
                const dependencies = dependent.dependencies || [];
                if (dependencies.includes(milestoneId)) {
                    // Check if all dependencies are now satisfied
                    const allCompleted = await this.checkAllDependenciesCompleted(
                        dependencies,
                        dependent.workflowInstanceId,
                    );

                    if (allCompleted) {
                        await this.milestoneRepository.update(dependent.id, {
                            status: 'PENDING',
                            blockedReason: null,
                            unblockedAt: new Date(),
                            updatedAt: new Date(),
                        });

                        this.eventEmitter.emit('milestone.unblocked', {
                            milestoneId: dependent.id,
                            unblockedBy: milestoneId,
                        });

                        this.logger.log(`Milestone ${dependent.id} unblocked`);
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Error unlocking dependent milestones: ${error.message}`);
        }
    }

    /**
     * Check if all dependencies are completed and paid
     */
    private async checkAllDependenciesCompleted(
        dependencyIds: string[],
        workflowInstanceId: string,
    ): Promise<boolean> {
        const milestones = await this.milestoneRepository.find({
            where: {
                workflowInstanceId,
                id: In(dependencyIds),
                isDeleted: false,
            },
        });

        return milestones.every(
            m => m.status === 'COMPLETED' && m.paymentStatus === 'COMPLETED'
        );
    }

    /**
     * Get payment status for milestone
     */
    async getMilestonePaymentStatus(milestoneId: string): Promise<any> {
        try {
            const milestone = await this.milestoneRepository.findOne({
                where: { id: milestoneId, isDeleted: false },
            });

            if (!milestone || !milestone.paymentId) {
                return null;
            }

            // Fetch payment details from Module 03
            const response = await firstValueFrom(
                this.httpService.get(
                    `${this.module03BaseUrl}/api/v1/payments/${milestone.paymentId}`,
                    {
                        timeout: 10000,
                    }
                )
            );

            return response.data.data || response.data;
        } catch (error) {
            this.logger.error(`Failed to fetch payment status: ${error.message}`);
            return null;
        }
    }

    /**
     * Check if milestone is eligible for payment release
     */
    isEligibleForPaymentRelease(milestone: Milestone, verification: MilestoneVerification): boolean {
        return (
            verification.status === 'APPROVED' &&
            milestone.paymentAmount > 0 &&
            !milestone.paymentId &&
            milestone.autoReleasePayment !== false &&
            milestone.invoiceId != null // Must have invoice first
        );
    }
}
