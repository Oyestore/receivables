import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

/**
 * Viral Workflow Service
 * 
 * PHASE 9.5 TIER 1: Viral Workflow Embedding
 * 
 * Identifies "magic moments" in user workflows and embeds viral mechanics
 * contextually to drive organic growth.
 * 
 * Key Concept: Make sharing/inviting a natural part of core workflows
 */

// ============================================================================
// TYPES
// ============================================================================

export enum MagicMomentTrigger {
    FIRST_PAYMENT_RECEIVED = 'first_payment_received',
    INVOICE_PAID_EARLY = 'invoice_paid_early',
    MILESTONE_ACHIEVED = 'milestone_achieved',
    DISPUTE_RESOLVED_QUICKLY = 'dispute_resolved_quickly',
    NEW_CUSTOMER_INVOICE = 'new_customer_invoice',
    HIGH_VALUE_PAYMENT = 'high_value_payment',
}

export enum ViralActionType {
    CUSTOMER_INVITATION = 'customer_invitation',
    SUCCESS_SHARING = 'success_sharing',
    TEMPLATE_SHARING = 'template_sharing',
    REFERRAL_SUGGESTION = 'referral_suggestion',
}

export interface ViralOpportunity {
    id: string;
    type: ViralActionType;
    trigger: MagicMomentTrigger;
    userId: string;
    customerId: string;
    tenantId: string;

    // Emotional context
    emotion: 'success' | 'relief' | 'excitement' | 'achievement';
    shareability: 'high' | 'medium' | 'low';

    // Opportunity details
    title: string;
    message: string;

    // Call to action
    cta: {
        primary: string;
        secondary?: string;
    };

    // Incentives
    incentive?: {
        forSender: string;
        forRecipient?: string;
    };

    // Social proof
    socialProof?: {
        conversionRate: number;         // %
        benefit: string;
    };

    // Context data
    context: Record<string, any>;

    // Tracking
    createdAt: Date;
    expiresAt?: Date;
    priority: number;                   // 0-100
}

export interface ViralExecution {
    opportunityId: string;
    actionTaken: 'primary' | 'secondary' | 'dismissed';
    userId: string;
    timestamp: Date;
    result?: {
        success: boolean;
        invitesSent?: number;
        sharesPosts?: number;
    };
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class ViralWorkflowService {
    private readonly logger = new Logger(ViralWorkflowService.name);

    constructor(
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Create viral opportunity when magic moment occurs
     * Called by event listeners in this service
     */
    async createViralOpportunity(
        trigger: MagicMomentTrigger,
        context: Record<string, any>,
    ): Promise<ViralOpportunity> {
        const opportunity = this.buildOpportunity(trigger, context);

        // Emit event for UI to display
        this.eventEmitter.emit('viral.opportunity.created', opportunity);

        this.logger.log(
            `Viral opportunity created: ${opportunity.type} for user ${opportunity.userId}`,
        );

        return opportunity;
    }

    /**
     * Track viral action execution
     */
    async trackViralAction(execution: ViralExecution): Promise<void> {
        // Store execution for analytics
        this.logger.log(
            `Viral action: ${execution.actionTaken} for opportunity ${execution.opportunityId}`,
        );

        // Update metrics
        await this.updateViralMetrics(execution);

        // Emit event for analytics
        this.eventEmitter.emit('viral.action.executed', execution);
    }

    /**
     * Calculate viral coefficient  (K-factor)
     */
    async calculateViralCoefficient(): Promise<{
        overall: number;
        byOpportunityType: Map<string, number>;
        byUserSegment: Map<string, number>;
        trend: 'increasing' | 'stable' | 'decreasing';
    }> {
        // Mock implementation - in production, query from analytics
        return {
            overall: 1.8, // Current K-factor
            byOpportunityType: new Map([
                ['customer_invitation', 2.3],
                ['success_sharing', 1.4],
                ['template_sharing', 1.6],
            ]),
            byUserSegment: new Map([
                ['enterprise', 2.5],
                ['medium', 1.9],
                ['small', 1.3],
            ]),
            trend: 'increasing',
        };
    }

    // ========================================================================
    // EVENT LISTENERS (Module Integrations)
    // ========================================================================

    /**
     * Module 01: Invoice Created Event
     * 
     * Magic Moment: Creating invoice for NEW customer not on platform
     * Viral Action: Suggest inviting customer to platform
     */
    @OnEvent('invoice.created')
    async handleInvoiceCreated(payload: {
        invoiceId: string;
        customerId: string;
        customerName: string;
        amount: number;
        userId: string;
        tenantId: string;
        isNewCustomer: boolean;
        customerOnPlatform: boolean;
    }): Promise<void> {
        if (!payload.isNewCustomer || payload.customerOnPlatform) {
            return; // Only trigger for new off-platform customers
        }

        const context = {
            userId: payload.userId,
            customerId: payload.customerId,
            customerName: payload.customerName,
            invoiceId: payload.invoiceId,
            amount: payload.amount,
            tenantId: payload.tenantId,
        };

        await this.createViralOpportunity(
            MagicMomentTrigger.NEW_CUSTOMER_INVOICE,
            context,
        );
    }

    /**
     * Module 03: Payment Received Event
     * 
     * Magic Moment: Payment received (customer is happy!)
     * Viral Action: Suggest platform to paying customer
     */
    @OnEvent('payment.received')
    async handlePaymentReceived(payload: {
        paymentId: string;
        invoiceId: string;
        customerId: string;
        customerName: string;
        amount: number;
        daysTaken: number;
        userId: string;
        tenantId: string;
    }): Promise<void> {
        const context = {
            userId: payload.userId,
            customerId: payload.customerId,
            customerName: payload.customerName,
            paymentId: payload.paymentId,
            amount: payload.amount,
            daysTaken: payload.daysTaken,
            tenantId: payload.tenantId,
        };

        // Different triggers based on payment speed
        if (payload.daysTaken <= 15) {
            await this.createViralOpportunity(
                MagicMomentTrigger.INVOICE_PAID_EARLY,
                context,
            );
        } else if (payload.amount > 100000) {
            await this.createViralOpportunity(
                MagicMomentTrigger.HIGH_VALUE_PAYMENT,
                context,
            );
        } else {
            await this.createViralOpportunity(
                MagicMomentTrigger.FIRST_PAYMENT_RECEIVED,
                context,
            );
        }
    }

    /**
     * Module 08: Dispute Resolved Event
     * 
     * Magic Moment: Dispute resolved quickly
     * Viral Action: Share resolution template with network
     */
    @OnEvent('dispute.resolved')
    async handleDisputeResolved(payload: {
        disputeId: string;
        resolution: string;
        resolutionDays: number;
        userId: string;
        tenantId: string;
    }): Promise<void> {
        // Only trigger for quick resolutions (< 10 days)
        if (payload.resolutionDays >= 10) {
            return;
        }

        const context = {
            userId: payload.userId,
            disputeId: payload.disputeId,
            resolutionDays: payload.resolutionDays,
            resolution: payload.resolution,
            tenantId: payload.tenantId,
        };

        await this.createViralOpportunity(
            MagicMomentTrigger.DISPUTE_RESOLVED_QUICKLY,
            context,
        );
    }

    /**
     * Achievement Event (Cross-Module)
     * 
     * Magic Moment: Major milestone achieved
     * Viral Action: Celebrate and encourage referrals
     */
    @OnEvent('milestone.achieved')
    async handleMilestoneAchieved(payload: {
        userId: string;
        tenantId: string;
        milestone: string;
        value: number;
    }): Promise<void> {
        const context = {
            userId: payload.userId,
            tenantId: payload.tenantId,
            milestone: payload.milestone,
            value: payload.value,
        };

        await this.createViralOpportunity(
            MagicMomentTrigger.MILESTONE_ACHIEVED,
            context,
        );
    }

    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================

    private buildOpportunity(
        trigger: MagicMomentTrigger,
        context: Record<string, any>,
    ): ViralOpportunity {
        switch (trigger) {
            case MagicMomentTrigger.NEW_CUSTOMER_INVOICE:
                return this.buildNewCustomerInvitation(context);

            case MagicMomentTrigger.INVOICE_PAID_EARLY:
                return this.buildEarlyPaymentSharing(context);

            case MagicMomentTrigger.HIGH_VALUE_PAYMENT:
                return this.buildHighValueSharing(context);

            case MagicMomentTrigger.DISPUTE_RESOLVED_QUICKLY:
                return this.buildDisputeTemplateSharing(context);

            case MagicMomentTrigger.MILESTONE_ACHIEVED:
                return this.buildMilestoneCelebration(context);

            default:
                return this.buildGenericOpportunity(context);
        }
    }

    private buildNewCustomerInvitation(context: any): ViralOpportunity {
        return {
            id: this.generateId(),
            type: ViralActionType.CUSTOMER_INVITATION,
            trigger: MagicMomentTrigger.NEW_CUSTOMER_INVOICE,
            userId: context.userId,
            customerId: context.customerId,
            tenantId: context.tenantId,
            emotion: 'excitement',
            shareability: 'high',
            title: `Invite ${context.customerName} to get paid faster!`,
            message: `${context.customerName} isn't on our platform yet! 

✨ Send them an invite to:
   • Pay instantly via customer portal (30% faster payment)
   • Set up auto-pay (you get paid 7 days faster on avg)
   • Track invoice status in real-time

📊 Based on 12,487 similar invites:
   • 68% of customers accept invite
   • Average 8.5 days faster payment
   • 23% set up recurring payments`,

            cta: {
                primary: 'Send Invite + Invoice',
                secondary: 'Just send invoice',
            },
            incentive: {
                forSender: '₹500 credit + faster payment',
                forRecipient: '₹500 welcome bonus',
            },
            socialProof: {
                conversionRate: 68,
                benefit: '8.5 days faster payment',
            },
            context,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 3600000), // 24 hours
            priority: 85,
        };
    }

    private buildEarlyPaymentSharing(context: any): ViralOpportunity {
        return {
            id: this.generateId(),
            type: ViralActionType.SUCCESS_SHARING,
            trigger: MagicMomentTrigger.INVOICE_PAID_EARLY,
            userId: context.userId,
            customerId: context.customerId,
            tenantId: context.tenantId,
            emotion: 'success',
            shareability: 'high',
            title: '🎉 Great! Payment received early',
            message: `You received ₹${context.amount.toLocaleString()} from ${context.customerName} in just ${context.daysTaken} days!

💡 ${context.customerName} could benefit from our platform too!

📈 If they join:
   • You both get ₹500 credit
   • Future benchmarking insights from their data
   • Potential collaboration opportunities

🌟 High conversion likely!`,

            cta: {
                primary: `Suggest Platform to ${context.customerName}`,
                secondary: 'Share Your Success',
            },
            incentive: {
                forSender: '₹500 credit + benchmark insights',
                forRecipient: '₹500 welcome bonus',
            },
            socialProof: {
                conversionRate: 67,
                benefit: 'Mutual benefits',
            },
            context,
            createdAt: new Date(),
            priority: 80,
        };
    }

    private buildHighValueSharing(context: any): ViralOpportunity {
        return {
            id: this.generateId(),
            type: ViralActionType.REFERRAL_SUGGESTION,
            trigger: MagicMomentTrigger.HIGH_VALUE_PAYMENT,
            userId: context.userId,
            customerId: context.customerId,
            tenantId: context.tenantId,
            emotion: 'achievement',
            shareability: 'medium',
            title: '🏆 High-value payment received!',
            message: `Congratulations! ₹${context.amount.toLocaleString()} payment received!

This customer likely handles significant receivables. Referring them could unlock:
   • ₹5,000 bonus (high-value referral)
   • Premium features for both
   • Network intelligence benefits`,

            cta: {
                primary: 'Send Referral',
                secondary: 'Learn More',
            },
            incentive: {
                forSender: '₹5,000 referral bonus',
                forRecipient: '₹2,000 welcome bonus',
            },
            socialProof: {
                conversionRate: 72,
                benefit: '₹5K bonus',
            },
            context,
            createdAt: new Date(),
            priority: 90,
        };
    }

    private buildDisputeTemplateSharing(context: any): ViralOpportunity {
        return {
            id: this.generateId(),
            type: ViralActionType.TEMPLATE_SHARING,
            trigger: MagicMomentTrigger.DISPUTE_RESOLVED_QUICKLY,
            userId: context.userId,
            customerId: '',
            tenantId: context.tenantId,
            emotion: 'relief',
            shareability: 'medium',
            title: '⚡ Dispute resolved in record time!',
            message: `Dispute resolved in ${context.resolutionDays} days (70% faster than average)!

📝 Your resolution approach worked great.
   Share this template with your network?

🎯 Benefits of sharing:
   • Establish yourself as industry thought leader
   • Help peers resolve disputes faster
   • Get "Expert" badge in community
   • Potential consulting opportunities

📊 Top shared templates get 10,000+ views`,

            cta: {
                primary: 'Share Resolution Template',
                secondary: 'Make Template Public',
            },
            socialProof: {
                conversionRate: 45,
                benefit: '10K+ views average',
            },
            context,
            createdAt: new Date(),
            priority: 70,
        };
    }

    private buildMilestoneCelebration(context: any): ViralOpportunity {
        return {
            id: this.generateId(),
            type: ViralActionType.SUCCESS_SHARING,
            trigger: MagicMomentTrigger.MILESTONE_ACHIEVED,
            userId: context.userId,
            customerId: '',
            tenantId: context.tenantId,
            emotion: 'achievement',
            shareability: 'high',
            title: `🏆 Milestone: ${context.milestone}!`,
            message: `Amazing! You've achieved ${context.milestone}!

Share this achievement with your network:
   • LinkedIn auto-post (optional)
   • Twitter announcement
   • Email to your contacts

Plus: Get 3 bonus referrals (₹1,500 each) this week to celebrate!`,

            cta: {
                primary: 'Share Achievement',
                secondary: 'Send Referrals',
            },
            socialProof: {
                conversionRate: 55,
                benefit: 'Celebrate success',
            },
            context,
            createdAt: new Date(),
            priority: 75,
        };
    }

    private buildGenericOpportunity(context: any): ViralOpportunity {
        return {
            id: this.generateId(),
            type: ViralActionType.REFERRAL_SUGGESTION,
            trigger: MagicMomentTrigger.FIRST_PAYMENT_RECEIVED,
            userId: context.userId,
            customerId: context.customerId || '',
            tenantId: context.tenantId,
            emotion: 'success',
            shareability: 'medium',
            title: 'Share the platform!',
            message: 'Invite others and earn rewards',
            cta: {
                primary: 'Invite',
            },
            context,
            createdAt: new Date(),
            priority: 50,
        };
    }

    private async updateViralMetrics(execution: ViralExecution): Promise<void> {
        // In production: Update analytics database
        this.logger.debug(`Updated viral metrics for ${execution.opportunityId}`);
    }

    private generateId(): string {
        return `viral_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
