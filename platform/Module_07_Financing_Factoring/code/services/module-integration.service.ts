import { Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
    ApplicationCreatedEvent,
    ApplicationSubmittedEvent,
    ApplicationApprovedEvent,
    ApplicationDisbursedEvent,
    DiscountOfferCreatedEvent,
    DiscountOfferAcceptedEvent,
    CreditNoteRequiredEvent,
    FinancingActivityEvent,
    FINANCING_EVENTS,
} from '../events/financing.events';
import {
    IWorkflowService,
    INotificationService,
    ICreditNoteService,
    ICreditScoringService,
    IntegrationHealth,
} from '../interfaces/module-integration.interfaces';

/**
 * Module Integration Orchestrator
 * 
 * Coordinates cross-module communication and integration
 * Handles event emission and service calls to other modules
 * 
 * Uses @Optional() for dependencies to gracefully handle
 * modules that aren't yet implemented
 */
@Injectable()
export class ModuleIntegrationService {
    private readonly logger = new Logger(ModuleIntegrationService.name);

    constructor(
        private readonly eventEmitter: EventEmitter2,

        // Optional integrations - will be null if not available
        @Optional() private readonly workflowService?: IWorkflowService,
        @Optional() private readonly notificationService?: INotificationService,
        @Optional() private readonly creditNoteService?: ICreditNoteService,
        @Optional() private readonly creditScoringService?: ICreditScoringService,
    ) {
        this.logger.log('Module Integration Service initialized');
        this.logIntegrationStatus();
    }

    // ============================================
    // Application Lifecycle Integration
    // ============================================

    /**
     * Handle application created
     * Emit event + trigger notifications
     */
    async onApplicationCreated(
        applicationId: string,
        tenantId: string,
        userId: string,
        financingType: string,
        amount: number,
        invoiceIds?: string[],
    ): Promise<void> {
        try {
            // Emit event for other modules
            const event = new ApplicationCreatedEvent(
                applicationId,
                tenantId,
                userId,
                financingType,
                amount,
                invoiceIds,
            );

            this.eventEmitter.emit(FINANCING_EVENTS.APPLICATION_CREATED, event);

            // Trigger notification if service available
            if (this.notificationService) {
                await this.notificationService.sendApplicationNotification(
                    { userId },
                    'application_submitted',
                    { applicationId, amount, financingType },
                );
            } else {
                this.logger.warn('Notification service not available - skipping notification');
            }

            // Report to credit scoring
            if (this.creditScoringService) {
                await this.creditScoringService.reportFinancingActivity({
                    tenantId,
                    userId,
                    activityType: 'loan_application',
                    amount,
                    partnerId: 'platform',
                    timestamp: new Date(),
                });
            }

        } catch (error) {
            this.logger.error(`Failed to handle application created: ${error.message}`);
            // Don't throw - integration failures shouldn't break core functionality
        }
    }

    /**
     * Handle application submitted to partners
     */
    async onApplicationSubmitted(
        applicationId: string,
        tenantId: string,
        userId: string,
        partnerIds: string[],
    ): Promise<void> {
        try {
            const event = new ApplicationSubmittedEvent(
                applicationId,
                tenantId,
                userId,
                partnerIds,
                new Date(),
            );

            this.eventEmitter.emit(FINANCING_EVENTS.APPLICATION_SUBMITTED, event);

            this.logger.log(`Application ${applicationId} submitted to ${partnerIds.length} partners`);

        } catch (error) {
            this.logger.error(`Failed to handle application submitted: ${error.message}`);
        }
    }

    /**
     * Handle application approved
     */
    async onApplicationApproved(
        applicationId: string,
        tenantId: string,
        userId: string,
        partnerId: string,
        approvedAmount: number,
        interestRate: number,
    ): Promise<void> {
        try {
            const event = new ApplicationApprovedEvent(
                applicationId,
                tenantId,
                userId,
                partnerId,
                approvedAmount,
                interestRate,
                new Date(),
            );

            this.eventEmitter.emit(FINANCING_EVENTS.APPLICATION_APPROVED, event);

            // Send approval notification
            if (this.notificationService) {
                await this.notificationService.sendMultiChannelNotification(
                    { userId },
                    ['email', 'whatsapp', 'sms'],
                    {
                        templateId: 'loan_approved',
                        channel: 'email',
                        variables: {
                            amount: approvedAmount,
                            rate: interestRate,
                            partner: partnerId,
                        },
                    },
                );
            }

            // Report positive credit activity
            if (this.creditScoringService) {
                await this.creditScoringService.reportFinancingActivity({
                    tenantId,
                    userId,
                    activityType: 'loan_approval',
                    amount: approvedAmount,
                    partnerId,
                    interestRate,
                    timestamp: new Date(),
                });
            }

        } catch (error) {
            this.logger.error(`Failed to handle application approved: ${error.message}`);
        }
    }

    /**
     * Handle loan disbursed
     */
    async onLoanDisbursed(
        applicationId: string,
        tenantId: string,
        userId: string,
        partnerId: string,
        disbursedAmount: number,
    ): Promise<void> {
        try {
            const event = new ApplicationDisbursedEvent(
                applicationId,
                tenantId,
                userId,
                partnerId,
                disbursedAmount,
                new Date(),
            );

            this.eventEmitter.emit(FINANCING_EVENTS.APPLICATION_DISBURSED, event);

            // Send disbursal confirmation
            if (this.notificationService) {
                await this.notificationService.sendApplicationNotification(
                    { userId },
                    'loan_disbursed',
                    { amount: disbursedAmount, partner: partnerId },
                );
            }

            // Report disbursal to credit scoring
            if (this.creditScoringService) {
                await this.creditScoringService.reportFinancingActivity({
                    tenantId,
                    userId,
                    activityType: 'loan_disbursal',
                    amount: disbursedAmount,
                    partnerId,
                    timestamp: new Date(),
                });
            }

        } catch (error) {
            this.logger.error(`Failed to handle loan disbursed: ${error.message}`);
        }
    }

    // ============================================
    // Discount Offer Integration (Module 05)
    // ============================================

    /**
     * Handle discount offer created
     * Trigger workflow for supplier approval
     */
    async onDiscountOfferCreated(
        offerId: string,
        invoiceId: string,
        tenantId: string,
        buyerId: string,
        supplierId: string,
        discountRate: number,
        expiryDate: Date,
    ): Promise<void> {
        try {
            const event = new DiscountOfferCreatedEvent(
                offerId,
                invoiceId,
                tenantId,
                buyerId,
                supplierId,
                discountRate,
                expiryDate,
            );

            this.eventEmitter.emit(FINANCING_EVENTS.DISCOUNT_OFFER_CREATED, event);

            // Trigger workflow for offer lifecycle
            if (this.workflowService) {
                await this.workflowService.triggerWorkflow('discount_offer_lifecycle', {
                    entityType: 'discount_offer',
                    entityId: offerId,
                    tenantId,
                    userId: buyerId,
                    metadata: {
                        supplierId,
                        discountRate,
                        expiryDate,
                    },
                });
            }

            // Notify supplier
            if (this.notificationService) {
                await this.notificationService.sendDiscountOfferNotification(
                    { userId: supplierId },
                    'offer_received',
                    { offerId, discountRate, expiryDate },
                );
            }

        } catch (error) {
            this.logger.error(`Failed to handle discount offer created: ${error.message}`);
        }
    }

    /**
     * Handle discount offer accepted
     * Create credit note for invoice
     */
    async onDiscountOfferAccepted(
        offerId: string,
        invoiceId: string,
        tenantId: string,
        buyerId: string,
        supplierId: string,
        discountedAmount: number,
        originalAmount: number,
    ): Promise<void> {
        try {
            const event = new DiscountOfferAcceptedEvent(
                offerId,
                invoiceId,
                tenantId,
                buyerId,
                supplierId,
                discountedAmount,
                new Date(),
            );

            this.eventEmitter.emit(FINANCING_EVENTS.DISCOUNT_OFFER_ACCEPTED, event);

            // Create credit note for discount
            const discountAmount = originalAmount - discountedAmount;

            if (this.creditNoteService) {
                const result = await this.creditNoteService.createCreditNote({
                    invoiceId,
                    tenantId,
                    reason: 'Early payment discount',
                    creditAmount: discountAmount,
                    description: `Early payment discount of ${discountAmount} accepted by supplier`,
                });

                if (result.success) {
                    this.logger.log(`Credit note ${result.creditNoteId} created for discount`);
                }
            } else {
                // Emit event for Module 01 to handle
                const creditNoteEvent = new CreditNoteRequiredEvent(
                    invoiceId,
                    tenantId,
                    'early_payment_discount',
                    discountAmount,
                    originalAmount,
                    discountedAmount,
                );

                this.eventEmitter.emit(FINANCING_EVENTS.CREDIT_NOTE_REQUIRED, creditNoteEvent);
            }

            // Notify both parties
            if (this.notificationService) {
                await Promise.all([
                    this.notificationService.sendDiscountOfferNotification(
                        { userId: supplierId },
                        'offer_accepted',
                        { discountAmount, newAmount: discountedAmount },
                    ),
                    this.notificationService.sendDiscountOfferNotification(
                        { userId: buyerId },
                        'offer_accepted',
                        { discountAmount, savings: discountAmount },
                    ),
                ]);
            }

        } catch (error) {
            this.logger.error(`Failed to handle discount offer accepted: ${error.message}`);
        }
    }

    // ============================================
    // Integration Health
    // ============================================

    /**
     * Get integration status for monitoring
     */
    getIntegrationHealth(): IntegrationHealth {
        return {
            module05_workflow: {
                module: 'Module 05 - Workflow',
                integrated: !!this.workflowService,
                capabilities: this.workflowService ? ['discount_offer_lifecycle'] : [],
            },
            module11_notification: {
                module: 'Module 11 - Notification',
                integrated: !!this.notificationService,
                capabilities: this.notificationService ? ['email', 'sms', 'whatsapp'] : [],
            },
            module01_creditNote: {
                module: 'Module 01 - Credit Notes',
                integrated: !!this.creditNoteService,
                capabilities: this.creditNoteService ? ['automated_credit_notes'] : [],
            },
            module06_creditScoring: {
                module: 'Module 06 - Credit Scoring',
                integrated: !!this.creditScoringService,
                capabilities: this.creditScoringService ? ['activity_reporting', 'score_retrieval'] : [],
            },
        };
    }

    /**
     * Log integration status on startup
     */
    private logIntegrationStatus(): void {
        const health = this.getIntegrationHealth();

        this.logger.log('=== Module Integration Status ===');
        Object.values(health).forEach(status => {
            const icon = status.integrated ? '✅' : '⚠️';
            this.logger.log(`${icon} ${status.module}: ${status.integrated ? 'READY' : 'NOT AVAILABLE'}`);
        });
        this.logger.log('================================');
    }
}
