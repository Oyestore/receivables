import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DisputeManagementService } from './dispute-management.service';
import { CollectionManagementService } from './collection-management.service';
import { AuditService } from './audit.service';

/**
 * Invoice Overdue Event Payload
 */
interface InvoiceOverdueEvent {
    invoiceId: string;
    invoiceNumber: string;
    customerId: string;
    customerName: string;
    amount: number;
    dueDate: Date;
    overdueDays: number;
    tenantId: string;
    metadata?: Record<string, any>;
}

/**
 * Payment Failed Event Payload
 */
interface PaymentFailedEvent {
    paymentId: string;
    invoiceId: string;
    invoiceNumber: string;
    customerId: string;
    customerName: string;
    amount: number;
    attemptedAt: Date;
    failureReason: string;
    failureCode?: string;
    attemptNumber: number;
    tenantId: string;
    metadata?: Record<string, any>;
}

/**
 * Invoice Event Handler Service
 * 
 * Automatically handles invoice-related events from Module 01 and Module 03
 * Creates collection cases and disputes based on business rules
 */
@Injectable()
export class InvoiceEventHandlerService {
    private readonly logger = new Logger(InvoiceEventHandlerService.name);

    // Configuration
    private readonly GRACE_PERIOD_DAYS = parseInt(process.env.COLLECTION_GRACE_PERIOD_DAYS || '7', 10);
    private readonly AUTO_DISPUTE_THRESHOLD = parseInt(process.env.AUTO_DISPUTE_PAYMENT_ATTEMPTS || '3', 10);
    private readonly IMMEDIATE_ESCALATION_AMOUNT = parseInt(process.env.COLLECTION_IMMEDIATE_ESCALATION_AMOUNT || '100000', 10);

    // Deduplication cache (prevent duplicate case creation)
    private readonly processedEvents = new Map<string, Date>();
    private readonly DEDUP_TTL = 3600000; // 1 hour

    constructor(
        private readonly disputeManagementService: DisputeManagementService,
        private readonly collectionManagementService: CollectionManagementService,
        private readonly auditService: AuditService,
    ) {
        this.logger.log('Invoice Event Handler initialized');
        this.logger.log(`Grace Period: ${this.GRACE_PERIOD_DAYS} days`);
        this.logger.log(`Auto-Dispute Threshold: ${this.AUTO_DISPUTE_THRESHOLD} attempts`);
        this.logger.log(`Immediate Escalation: ₹${this.IMMEDIATE_ESCALATION_AMOUNT}+`);
    }

    /**
     * Handle invoice.overdue event from Module 01
     * Auto-creates collection case after grace period
     */
    @OnEvent('invoice.overdue')
    async handleInvoiceOverdue(event: InvoiceOverdueEvent): Promise<void> {
        const eventKey = `overdue_${event.invoiceId}_${event.overdueDays}`;

        try {
            // Check deduplication
            if (this.isEventProcessed(eventKey)) {
                this.logger.debug(`Skipping duplicate invoice.overdue event: ${event.invoiceNumber}`);
                return;
            }

            this.logger.log(`Processing invoice.overdue event: ${event.invoiceNumber} (${event.overdueDays} days overdue)`);

            // Business Rule: Only create collection case after grace period
            if (event.overdueDays < this.GRACE_PERIOD_DAYS) {
                this.logger.debug(`Invoice ${event.invoiceNumber} within grace period (${event.overdueDays}/${this.GRACE_PERIOD_DAYS} days)`);
                return;
            }

            // Check if collection case already exists for this invoice
            const existingCase = await this.collectionManagementService.findByInvoiceId(event.invoiceId);

            if (existingCase) {
                this.logger.debug(`Collection case already exists for invoice ${event.invoiceNumber}: ${existingCase.id}`);

                // Update case with latest overdue info
                await this.collectionManagementService.updateOverdueInfo(existingCase.id, {
                    overdueDays: event.overdueDays,
                    currentAmount: event.amount,
                });

                return;
            }

            // Determine priority based on amount and overdue days
            const priority = this.calculatePriority(event.amount, event.overdueDays);

            // Determine if immediate legal escalation needed
            const requiresImmediateEscalation =
                event.amount >= this.IMMEDIATE_ESCALATION_AMOUNT ||
                event.overdueDays >= 90;

            // Create collection case
            const collectionCase = await this.collectionManagementService.create({
                invoiceId: event.invoiceId,
                invoiceNumber: event.invoiceNumber,
                customerId: event.customerId,
                customerName: event.customerName,
                outstandingAmount: event.amount,
                dueDate: event.dueDate,
                overdueDays: event.overdueDays,
                priority,
                status: 'NEW',
                tenantId: event.tenantId,
                source: 'AUTO_CREATED',
                metadata: {
                    ...event.metadata,
                    triggeredBy: 'invoice.overdue',
                    gracePeriodDays: this.GRACE_PERIOD_DAYS,
                },
            });

            this.logger.log(`✅ Created collection case ${collectionCase.id} for invoice ${event.invoiceNumber}`);

            // If requires immediate escalation, create dispute as well
            if (requiresImmediateEscalation) {
                const dispute = await this.disputeManagementService.create({
                    invoiceId: event.invoiceId,
                    invoiceNumber: event.invoiceNumber,
                    customerId: event.customerId,
                    customerName: event.customerName,
                    disputeType: 'PAYMENT_DELAY',
                    amount: event.amount,
                    description: `Automatic dispute created: Invoice ${event.invoiceNumber} overdue ${event.overdueDays} days`,
                    status: 'OPEN',
                    priority: 'HIGH',
                    tenantId: event.tenantId,
                    metadata: {
                        ...event.metadata,
                        triggeredBy: 'invoice.overdue',
                        collectionCaseId: collectionCase.id,
                        autoEscalated: true,
                        reason: event.amount >= this.IMMEDIATE_ESCALATION_AMOUNT
                            ? 'HIGH_VALUE'
                            : 'EXTENDED_OVERDUE',
                    },
                });

                this.logger.warn(`⚠️ Created high-priority dispute ${dispute.id} for invoice ${event.invoiceNumber} (amount: ₹${event.amount}, overdue: ${event.overdueDays} days)`);
            }

            // Mark event as processed
            this.markEventProcessed(eventKey);

            // Audit log
            await this.auditService.log({
                action: 'COLLECTION_CASE_AUTO_CREATED',
                entityType: 'COLLECTION_CASE',
                entityId: collectionCase.id,
                metadata: {
                    invoiceId: event.invoiceId,
                    invoiceNumber: event.invoiceNumber,
                    overdueDays: event.overdueDays,
                    amount: event.amount,
                    priority,
                    immediateEscalation: requiresImmediateEscalation,
                },
                tenantId: event.tenantId,
            });

        } catch (error: any) {
            this.logger.error(`Failed to handle invoice.overdue event for ${event.invoiceNumber}:`, error?.message || error);

            // Audit error
            await this.auditService.log({
                action: 'COLLECTION_CASE_AUTO_CREATE_FAILED',
                entityType: 'INVOICE',
                entityId: event.invoiceId,
                metadata: {
                    error: error?.message || 'Unknown error',
                    invoiceNumber: event.invoiceNumber,
                },
                tenantId: event.tenantId,
            });

            // Don't throw - event handler should not crash
            // Error is logged and audited
        }
    }

    /**
     * Handle payment.failed event from Module 03
     * Auto-creates dispute after threshold attempts
     */
    @OnEvent('payment.failed')
    async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
        const eventKey = `payment_failed_${event.paymentId}`;

        try {
            // Check deduplication
            if (this.isEventProcessed(eventKey)) {
                this.logger.debug(`Skipping duplicate payment.failed event: ${event.invoiceNumber}`);
                return;
            }

            this.logger.log(`Processing payment.failed event: ${event.invoiceNumber} (attempt ${event.attemptNumber})`);

            // Business Rule: Only create dispute after threshold attempts
            if (event.attemptNumber < this.AUTO_DISPUTE_THRESHOLD) {
                this.logger.debug(
                    `Payment ${event.paymentId} below threshold (${event.attemptNumber}/${this.AUTO_DISPUTE_THRESHOLD} attempts)`
                );
                return;
            }

            // Check if dispute already exists for this invoice
            const existingDispute = await this.disputeManagementService.findByInvoiceId(event.invoiceId);

            if (existingDispute) {
                this.logger.debug(`Dispute already exists for invoice ${event.invoiceNumber}: ${existingDispute.id}`);

                // Update dispute with payment failure info
                await this.disputeManagementService.addNote(existingDispute.id, {
                    note: `Payment attempt ${event.attemptNumber} failed: ${event.failureReason}`,
                    addedBy: 'SYSTEM',
                    metadata: {
                        paymentId: event.paymentId,
                        failureCode: event.failureCode,
                        attemptedAt: event.attemptedAt,
                    },
                });

                return;
            }

            // Categorize dispute based on failure reason
            const disputeCategory = this.categorizePaymentFailure(event.failureReason, event.failureCode);

            // Create dispute
            const dispute = await this.disputeManagementService.create({
                invoiceId: event.invoiceId,
                invoiceNumber: event.invoiceNumber,
                customerId: event.customerId,
                customerName: event.customerName,
                disputeType: 'PAYMENT_FAILURE',
                amount: event.amount,
                description: `Automatic dispute: ${event.attemptNumber} failed payment attempts. Last failure: ${event.failureReason}`,
                status: 'OPEN',
                priority: event.attemptNumber >= 5 ? 'HIGH' : 'MEDIUM',
                category: disputeCategory,
                tenantId: event.tenantId,
                metadata: {
                    ...event.metadata,
                    triggeredBy: 'payment.failed',
                    paymentId: event.paymentId,
                    failureReason: event.failureReason,
                    failureCode: event.failureCode,
                    attemptNumber: event.attemptNumber,
                    autoCreated: true,
                },
            });

            this.logger.log(`✅ Created dispute ${dispute.id} for invoice ${event.invoiceNumber} after ${event.attemptNumber} failed payment attempts`);

            // If multiple failures, also create collection case
            if (event.attemptNumber >= 5) {
                const collectionCase = await this.collectionManagementService.create({
                    invoiceId: event.invoiceId,
                    invoiceNumber: event.invoiceNumber,
                    customerId: event.customerId,
                    customerName: event.customerName,
                    outstandingAmount: event.amount,
                    priority: 'HIGH',
                    status: 'NEW',
                    tenantId: event.tenantId,
                    source: 'AUTO_CREATED',
                    metadata: {
                        triggeredBy: 'payment.failed',
                        disputeId: dispute.id,
                        paymentFailures: event.attemptNumber,
                    },
                });

                this.logger.warn(`⚠️ Created collection case ${collectionCase.id} due to ${event.attemptNumber} payment failures`);
            }

            // Mark event as processed
            this.markEventProcessed(eventKey);

            // Audit log
            await this.auditService.log({
                action: 'DISPUTE_AUTO_CREATED_PAYMENT_FAILURE',
                entityType: 'DISPUTE',
                entityId: dispute.id,
                metadata: {
                    invoiceId: event.invoiceId,
                    invoiceNumber: event.invoiceNumber,
                    paymentId: event.paymentId,
                    attemptNumber: event.attemptNumber,
                    failureReason: event.failureReason,
                    category: disputeCategory,
                },
                tenantId: event.tenantId,
            });

        } catch (error: any) {
            this.logger.error(`Failed to handle payment.failed event for ${event.invoiceNumber}:`, error?.message || error);

            // Audit error
            await this.auditService.log({
                action: 'DISPUTE_AUTO_CREATE_FAILED',
                entityType: 'PAYMENT',
                entityId: event.paymentId,
                metadata: {
                    error: error?.message || 'Unknown error',
                    invoiceNumber: event.invoiceNumber,
                },
                tenantId: event.tenantId,
            });

            // Don't throw - event handler should not crash
        }
    }

    /**
     * Calculate collection priority based on amount and overdue days
     */
    private calculatePriority(amount: number, overdueDays: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
        // Critical: High amount + very overdue
        if (amount >= this.IMMEDIATE_ESCALATION_AMOUNT && overdueDays >= 60) {
            return 'CRITICAL';
        }

        // High: High amount or very overdue
        if (amount >= this.IMMEDIATE_ESCALATION_AMOUNT || overdueDays >= 90) {
            return 'HIGH';
        }

        // Medium: Moderate amount or moderately overdue
        if (amount >= 50000 || overdueDays >= 30) {
            return 'MEDIUM';
        }

        // Low: Everything else
        return 'LOW';
    }

    /**
     * Categorize payment failure for dispute routing
     */
    private categorizePaymentFailure(failureReason: string, failureCode?: string): string {
        const reason = failureReason.toLowerCase();

        if (reason.includes('insufficient') || reason.includes('balance')) {
            return 'INSUFFICIENT_FUNDS';
        }

        if (reason.includes('invalid') || reason.includes('expired')) {
            return 'INVALID_PAYMENT_METHOD';
        }

        if (reason.includes('declined') || reason.includes('rejected')) {
            return 'PAYMENT_DECLINED';
        }

        if (reason.includes('timeout') || reason.includes('network')) {
            return 'TECHNICAL_FAILURE';
        }

        if (reason.includes('fraud') || reason.includes('security')) {
            return 'SECURITY_ISSUE';
        }

        return 'UNKNOWN_FAILURE';
    }

    /**
     * Check if event already processed (deduplication)
     */
    private isEventProcessed(eventKey: string): boolean {
        const lastProcessed = this.processedEvents.get(eventKey);

        if (!lastProcessed) {
            return false;
        }

        // Check if still within TTL
        const age = Date.now() - lastProcessed.getTime();
        if (age > this.DEDUP_TTL) {
            // Expired, remove from cache
            this.processedEvents.delete(eventKey);
            return false;
        }

        return true;
    }

    /**
     * Mark event as processed
     */
    private markEventProcessed(eventKey: string): void {
        this.processedEvents.set(eventKey, new Date());

        // Clean up old entries periodically
        if (this.processedEvents.size > 1000) {
            const now = Date.now();
            for (const [key, timestamp] of this.processedEvents.entries()) {
                if (now - timestamp.getTime() > this.DEDUP_TTL) {
                    this.processedEvents.delete(key);
                }
            }
        }
    }
}
