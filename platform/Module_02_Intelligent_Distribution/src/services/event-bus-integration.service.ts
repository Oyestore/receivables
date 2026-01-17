import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { DistributionService } from '../services/distribution.service';
import { EnhancedFollowUpEngineService } from '../services/enhanced-followup-engine.service';

// Event interfaces
export interface InvoiceCreatedEvent {
    invoiceId: string;
    tenantId: string;
    clientId: string;
    amount: number;
    dueDate: Date;
    customerData: {
        tier?: string;
        industry?: string;
        region?: string;
        email?: string;
        phone?: string;
    };
}

export interface InvoiceSentEvent {
    invoiceId: string;
    tenantId: string;
    channel: string;
    sentAt: Date;
}

export interface PaymentReceivedEvent {
    invoiceId: string;
    tenantId: string;
    amount: number;
    paymentMethod: string;
    paidAt: Date;
}

export interface InvoiceOverdueEvent {
    invoiceId: string;
    tenantId: string;
    daysPastDue: number;
}

@Injectable()
export class EventBusIntegrationService implements OnModuleInit {
    private readonly logger = new Logger(EventBusIntegrationService.name);

    constructor(
        private eventEmitter: EventEmitter2,
        private distributionService: DistributionService,
        private followUpEngine: EnhancedFollowUpEngineService,
    ) { }

    onModuleInit() {
        this.logger.log('Event bus integration initialized');
    }

    // ========== M01 Invoice Events ==========

    /**
     * Handle invoice created event
     * Trigger: M01 creates new invoice
     * Action: Evaluate distribution rules and create assignments
     */
    @OnEvent('invoice.created')
    async handleInvoiceCreated(event: InvoiceCreatedEvent): Promise<void> {
        this.logger.log(`Invoice created event received: ${event.invoiceId}`);

        try {
            // Evaluate distribution rules
            const assignments = await this.distributionService.evaluateAndCreateAssignments(
                event.tenantId,
                {
                    invoiceId: event.invoiceId,
                    customerId: event.clientId,
                    amount: event.amount,
                    dueDate: event.dueDate,
                    customerData: event.customerData,
                },
            );

            this.logger.log(`Created ${assignments.length} distribution assignments for invoice ${event.invoiceId}`);

            // Emit distribution assigned event
            this.eventEmitter.emit('distribution.assigned', {
                invoiceId: event.invoiceId,
                assignments: assignments.map((a) => ({
                    id: a.id,
                    channel: a.channel,
                })),
            });
        } catch (error) {
            this.logger.error(`Failed to handle invoice.created event: ${error.message}`, error.stack);
        }
    }

    /**
     * Handle invoice sent event
     * Trigger: M01 sends invoice
     * Action: Start follow-up sequence
     */
    @OnEvent('invoice.sent')
    async handleInvoiceSent(event: InvoiceSentEvent): Promise<void> {
        this.logger.log(`Invoice sent event received: ${event.invoiceId}`);

        try {
            // Get default follow-up sequence for tenant
            const defaultSequenceId = await this.getDefaultFollowUpSequence(event.tenantId);

            if (defaultSequenceId) {
                await this.followUpEngine.scheduleFollowUpSequence(event.invoiceId, defaultSequenceId, {
                    startDelay: 24, // Start follow-ups 24 hours after sending
                    tenantId: event.tenantId,
                });

                this.logger.log(`Scheduled follow-up sequence for invoice ${event.invoiceId}`);
            }
        } catch (error) {
            this.logger.error(`Failed to handle invoice.sent event: ${error.message}`, error.stack);
        }
    }

    /**
     * Handle payment received event
     * Trigger: M03 processes payment
     * Action: Cancel follow-ups, send thank you
     */
    @OnEvent('payment.received')
    async handlePaymentReceived(event: PaymentReceivedEvent): Promise<void> {
        this.logger.log(`Payment received event: ${event.invoiceId}`);

        try {
            // Pause all follow-ups for this invoice
            const sequences = await this.getActiveFollowUpSequences(event.invoiceId);

            for (const sequenceId of sequences) {
                await this.followUpEngine.pauseFollowUpSequence(event.invoiceId, sequenceId);
            }

            this.logger.log(`Paused follow-ups for paid invoice ${event.invoiceId}`);

            // Optionally send thank you message
            // await this.sendThankYouMessage(event);

            // Emit payment processed event
            this.eventEmitter.emit('distribution.payment_processed', {
                invoiceId: event.invoiceId,
                amount: event.amount,
            });
        } catch (error) {
            this.logger.error(`Failed to handle payment.received event: ${error.message}`, error.stack);
        }
    }

    /**
     * Handle invoice overdue event
     * Trigger: M01 detects overdue invoice
     * Action: Escalate follow-ups, notify admin
     */
    @OnEvent('invoice.overdue')
    async handleInvoiceOverdue(event: InvoiceOverdueEvent): Promise<void> {
        this.logger.log(`Invoice overdue event: ${event.invoiceId}, ${event.daysPastDue} days`);

        try {
            // Trigger escalated follow-up sequence
            const escalationSequenceId = await this.getEscalationSequence(event.tenantId);

            if (escalationSequenceId) {
                await this.followUpEngine.scheduleFollowUpSequence(
                    event.invoiceId,
                    escalationSequenceId,
                    {
                        startDelay: 0, // Send immediately
                        tenantId: event.tenantId,
                    },
                );
            }

            // Emit notification event for M11
            this.eventEmitter.emit('notification.required', {
                type: 'invoice_overdue',
                invoiceId: event.invoiceId,
                tenantId: event.tenantId,
                severity: event.daysPastDue > 30 ? 'high' : 'medium',
                data: {
                    daysPastDue: event.daysPastDue,
                },
            });

            this.logger.log(`Triggered overdue escalation for invoice ${event.invoiceId}`);
        } catch (error) {
            this.logger.error(`Failed to handle invoice.overdue event: ${error.message}`, error.stack);
        }
    }

    // ========== Outgoing Events to Other Modules ==========

    /**
     * Emit distribution status update to M01
     */
    async emitDistributionStatusUpdate(
        invoiceId: string,
        status: 'sent' | 'delivered' | 'failed' | 'bounced',
        details: {
            channel: string;
            messageId?: string;
            error?: string;
        },
    ): Promise<void> {
        this.eventEmitter.emit('distribution.status_updated', {
            invoiceId,
            status,
            details,
            timestamp: new Date(),
        });

        this.logger.log(`Emitted distribution status update: ${invoiceId} - ${status}`);
    }

    /**
     * Emit notification request to M11
     */
    async emitNotificationRequest(
        type: string,
        tenantId: string,
        data: Record<string, any>,
    ): Promise<void> {
        this.eventEmitter.emit('notification.required', {
            type,
            tenantId,
            data,
            timestamp: new Date(),
        });

        this.logger.log(`Emitted notification request: ${type}`);
    }

    // ========== Helper Methods ==========

    private async getDefaultFollowUpSequence(tenantId: string): Promise<string | null> {
        // Query default sequence for tenant
        // For now, return mock
        return 'default-sequence-id';
    }

    private async getActiveFollowUpSequences(invoiceId: string): Promise<string[]> {
        // Query active sequences for invoice
        return ['sequence-1'];
    }

    private async getEscalationSequence(tenantId: string): Promise<string | null> {
        // Query escalation sequence for tenant
        return 'escalation-sequence-id';
    }
}
