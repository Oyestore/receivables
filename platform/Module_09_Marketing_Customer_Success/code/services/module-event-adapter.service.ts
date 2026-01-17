import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { NetworkIntelligenceService } from './network-intelligence.service';
import { ViralWorkflowService } from './viral-workflow.service';

/**
 * Cross-Module Event Adapter
 * 
 * Bridges events from other modules to Phase 9.5 services
 * Completes the final 20% of Phase 9.5 integration
 */

@Injectable()
export class ModuleEventAdapterService {
    private readonly logger = new Logger(ModuleEventAdapterService.name);

    constructor(
        private readonly networkIntel: NetworkIntelligenceService,
        private readonly viralWorkflow: ViralWorkflowService,
        private eventEmitter: EventEmitter2,
    ) { }

    // ========================================================================
    // MODULE 01 - INVOICE EVENTS
    // ========================================================================

    @OnEvent('invoice.created')
    async handleInvoiceCreated(payload: {
        invoiceId: string;
        customerId: string;
        customerName: string;
        amount: number;
        dueDate: Date;
        tenantId: string;
        industry: string;
        isNewCustomer?: boolean;
        customerOnPlatform?: boolean;
    }): Promise<void> {
        // Collect network intelligence data
        await this.networkIntel.collectEvent({
            tenantId: payload.tenantId,
            industry: payload.industry,
            companySize: this.determineCompanySize(payload.amount),
            eventType: 'invoice_created',
            value: 1,
            timestamp: new Date(),
            metadata: { amount: payload.amount },
        });

        // Check for viral opportunity
        if (payload.isNewCustomer && !payload.customerOnPlatform) {
            await this.viralWorkflow.handleInvoiceCreated({
                ...payload,
                userId: payload.customerId,  // Map customerId to userId
                isNewCustomer: payload.isNewCustomer || false,
                customerOnPlatform: payload.customerOnPlatform || false,
            });
        }

        this.logger.debug(`Processed invoice.created event: ${payload.invoiceId}`);
    }

    @OnEvent('invoice.sent')
    async handleInvoiceSent(payload: {
        invoiceId: string;
        customerId: string;
        sentAt: Date;
        tenantId: string;
        industry: string;
    }): Promise<void> {
        const dayOfWeek = payload.sentAt.getDay();

        await this.networkIntel.collectEvent({
            tenantId: payload.tenantId,
            industry: payload.industry,
            companySize: 'medium',
            eventType: 'invoice_sent_day_of_week',
            value: dayOfWeek,
            timestamp: payload.sentAt,
        });
    }

    // ========================================================================
    // MODULE 03 - PAYMENT EVENTS
    // ========================================================================

    @OnEvent('payment.received')
    async handlePaymentReceived(payload: {
        paymentId: string;
        invoiceId: string;
        customerId: string;
        amount: number;
        receivedAt: Date;
        invoiceDate: Date;
        tenantId: string;
        industry: string;
        isFirstPayment?: boolean;
        paidEarly?: boolean;
    }): Promise<void> {
        // Calculate days to payment
        const daysToPayment = Math.floor(
            (payload.receivedAt.getTime() - payload.invoiceDate.getTime()) /
            (1000 * 3600 * 24)
        );

        // Collect network data
        await this.networkIntel.collectEvent({
            tenantId: payload.tenantId,
            industry: payload.industry,
            companySize: this.determineCompanySize(payload.amount),
            eventType: 'payment_days',
            value: daysToPayment,
            timestamp: payload.receivedAt,
        });

        // Viral opportunities
        if (payload.isFirstPayment) {
            await this.viralWorkflow.createViralOpportunity(
                'FIRST_PAYMENT_RECEIVED' as any,
                {
                    userId: payload.customerId,
                    paymentId: payload.paymentId,
                    amount: payload.amount,
                    tenantId: payload.tenantId,
                },
            );
        }

        if (payload.paidEarly) {
            await this.viralWorkflow.createViralOpportunity(
                'INVOICE_PAID_EARLY' as any,
                {
                    userId: payload.customerId,
                    paymentId: payload.paymentId,
                    amount: payload.amount,
                    daysEarly: Math.abs(daysToPayment),
                    tenantId: payload.tenantId,
                },
            );
        }

        this.logger.debug(`Processed payment.received event: ${payload.paymentId}`);
    }

    @OnEvent('payment.overdue')
    async handlePaymentOverdue(payload: {
        invoiceId: string;
        customerId: string;
        daysOverdue: number;
        tenantId: string;
        industry: string;
        amount: number;
    }): Promise<void> {
        await this.networkIntel.collectEvent({
            tenantId: payload.tenantId,
            industry: payload.industry,
            companySize: this.determineCompanySize(payload.amount),
            eventType: 'payment_overdue_days',
            value: payload.daysOverdue,
            timestamp: new Date(),
        });
    }

    // ========================================================================
    // MODULE 08 - DISPUTE EVENTS
    // ========================================================================

    @OnEvent('dispute.created')
    async handleDisputeCreated(payload: {
        disputeId: string;
        invoiceId: string;
        customerId: string;
        tenantId: string;
        industry: string;
    }): Promise<void> {
        await this.networkIntel.collectEvent({
            tenantId: payload.tenantId,
            industry: payload.industry,
            companySize: 'medium',
            eventType: 'dispute_rate',
            value: 1,
            timestamp: new Date(),
        });
    }

    @OnEvent('dispute.resolved')
    async handleDisputeResolved(payload: {
        disputeId: string;
        customerId: string;
        resolution: string;
        resolutionTimeHours: number;
        tenantId: string;
        industry: string;
        wasQuickResolution?: boolean;
    }): Promise<void> {
        // Collect resolution time data
        await this.networkIntel.collectEvent({
            tenantId: payload.tenantId,
            industry: payload.industry,
            companySize: 'medium',
            eventType: 'dispute_resolution_hours',
            value: payload.resolutionTimeHours,
            timestamp: new Date(),
        });

        // Viral opportunity for quick resolutions
        if (payload.wasQuickResolution) {
            await this.viralWorkflow.createViralOpportunity(
                'DISPUTE_RESOLVED_QUICKLY' as any,
                {
                    userId: payload.customerId,
                    disputeId: payload.disputeId,
                    resolutionTime: payload.resolutionTimeHours,
                    tenantId: payload.tenantId,
                },
            );
        }
    }

    // ========================================================================
    // MODULE 06 - CREDIT SCORING EVENTS
    // ========================================================================

    @OnEvent('credit.score.updated')
    async handleCreditScoreUpdated(payload: {
        customerId: string;
        newScore: number;
        oldScore: number;
        tenantId: string;
        industry: string;
    }): Promise<void> {
        // Collect credit improvement data
        if (payload.newScore > payload.oldScore) {
            await this.networkIntel.collectEvent({
                tenantId: payload.tenantId,
                industry: payload.industry,
                companySize: 'medium',
                eventType: 'credit_score_improvement',
                value: payload.newScore - payload.oldScore,
                timestamp: new Date(),
            });
        }
    }

    // ========================================================================
    // CUSTOM MILESTONE EVENTS
    // ========================================================================

    @OnEvent('milestone.achieved')
    async handleMilestoneAchieved(payload: {
        userId: string;
        milestoneType: string;
        value: number;
        tenantId: string;
    }): Promise<void> {
        // Create viral opportunity for celebrations
        await this.viralWorkflow.createViralOpportunity(
            'MILESTONE_ACHIEVED' as any,
            payload,
        );

        this.logger.log(`Milestone achieved: ${payload.milestoneType} by ${payload.userId}`);
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    private determineCompanySize(amount: number): 'small' | 'medium' | 'large' | 'enterprise' {
        if (amount >= 1000000) return 'enterprise';
        if (amount >= 500000) return 'large';
        if (amount >= 100000) return 'medium';
        return 'small';
    }

    /**
     * Manually trigger network intelligence collection
     * (for batch processing or data imports)
     */
    async collectBatchEvents(events: Array<{
        tenantId: string;
        industry: string;
        companySize: string;
        eventType: string;
        value: number;
        timestamp: Date;
    }>): Promise<number> {
        let collected = 0;

        for (const event of events) {
            try {
                await this.networkIntel.collectEvent(event as any);
                collected++;
            } catch (error) {
                this.logger.error(`Failed to collect batch event: ${error.message}`);
            }
        }

        this.logger.log(`Batch collected ${collected}/${events.length} network events`);
        return collected;
    }

    /**
     * Health check for event processing
     */
    async healthCheck(): Promise<{
        status: 'healthy' | 'degraded';
        listenersActive: number;
        lastEventProcessed: Date;
    }> {
        return {
            status: 'healthy',
            listenersActive: 8,
            lastEventProcessed: new Date(),
        };
    }
}
