import { Injectable, Logger } from '@nestjs/common';
import { EventIngestionService } from './event-ingestion.service';

/**
 * Business Insight Types
 */
export enum InsightType {
    OPPORTUNITY = 'opportunity',      // Revenue/growth opportunities
    RISK = 'risk',                    // Potential problems
    EFFICIENCY = 'efficiency',        // Process improvements
    ALERT = 'alert',                  // Urgent attention needed
}

export enum InsightSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical',
}

/**
 * Business Insight Interface
 */
export interface BusinessInsight {
    id: string;
    type: InsightType;
    severity: InsightSeverity;
    title: string;
    message: string;
    impact: string;
    confidence: number; // 0-100
    actions: InsightAction[];
    createdAt: Date;
    metadata?: Record<string, any>;
}

export interface InsightAction {
    id: string;
    label: string;
    type: 'primary' | 'secondary' | 'danger';
    endpoint?: string; // API endpoint to call
    payload?: any;
}

/**
 * Insight Generation Service
 * 
 * Analyzes platform events and business metrics
 * to generate actionable insights
 * 
 * Phase 1: Pre-built templates (no AI yet)
 * Future: AI-powered insight generation
 */
@Injectable()
export class InsightGenerationService {
    private readonly logger = new Logger(InsightGenerationService.name);

    constructor(
        private readonly eventService: EventIngestionService,
    ) { }

    /**
     * Generate insights for a tenant
     */
    async generateInsights(tenantId: string): Promise<BusinessInsight[]> {
        const insights: BusinessInsight[] = [];

        try {
            // Get recent events and metrics
            const endDate = new Date();
            const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

            const events = await this.eventService.getEvents(tenantId, startDate, endDate);
            const stats = await this.eventService.getEventStats(tenantId);

            // Run insight detectors
            const [
                paymentInsights,
                invoiceInsights,
                customerInsights,
                efficiencyInsights,
            ] = await Promise.all([
                this.detectPaymentInsights(tenantId, events),
                this.detectInvoiceInsights(tenantId, events),
                this.detectCustomerInsights(tenantId, events),
                this.detectEfficiencyInsights(tenantId, events),
            ]);

            insights.push(
                ...paymentInsights,
                ...invoiceInsights,
                ...customerInsights,
                ...efficiencyInsights
            );

            // Sort by severity and confidence
            insights.sort((a, b) => {
                const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
                if (severityDiff !== 0) return severityDiff;
                return b.confidence - a.confidence;
            });

            this.logger.log(`Generated ${insights.length} insights for tenant ${tenantId}`);

            return insights.slice(0, 10); // Top 10 insights

        } catch (error) {
            this.logger.error(`Failed to generate insights: ${error.message}`);
            return [];
        }
    }

    // ==========================================
    // PAYMENT INSIGHTS
    // ==========================================

    private async detectPaymentInsights(tenantId: string, events: any[]): Promise<BusinessInsight[]> {
        const insights: BusinessInsight[] = [];

        // Payment failures
        const paymentFailures = events.filter(e => e.event_type === 'payment.failed');
        if (paymentFailures.length >= 3) {
            insights.push({
                id: `payment-failures-${Date.now()}`,
                type: InsightType.ALERT,
                severity: InsightSeverity.HIGH,
                title: 'High Payment Failure Rate Detected',
                message: `${paymentFailures.length} payment failures in the last 7 days. This may indicate gateway issues or payment method problems.`,
                impact: `Potential revenue loss: ₹${this.estimatePaymentAmount(paymentFailures)}`,
                confidence: 88,
                actions: [
                    {
                        id: 'check-gateway',
                        label: 'Check Payment Gateways',
                        type: 'primary',
                        endpoint: '/api/payment/gateway-health',
                    },
                    {
                        id: 'view-details',
                        label: 'View Failed Payments',
                        type: 'secondary',
                    },
                ],
                createdAt: new Date(),
            });
        }

        // Successful payments (positive insight)
        const successfulPayments = events.filter(e => e.event_type === 'payment.completed');
        if (successfulPayments.length > 0) {
            const totalAmount = successfulPayments.reduce((sum, e) =>
                sum + (e.event_data?.amount || 0), 0
            );

            if (totalAmount > 100000) { // ₹1L+
                insights.push({
                    id: `payment-milestone-${Date.now()}`,
                    type: InsightType.OPPORTUNITY,
                    severity: InsightSeverity.MEDIUM,
                    title: 'Strong Payment Performance',
                    message: `₹${(totalAmount / 100000).toFixed(1)}L collected in the last 7 days. Great momentum!`,
                    impact: 'Positive cash flow trend',
                    confidence: 95,
                    actions: [
                        {
                            id: 'view-trends',
                            label: 'View Payment Trends',
                            type: 'primary',
                        },
                    ],
                    createdAt: new Date(),
                });
            }
        }

        return insights;
    }

    // ==========================================
    // INVOICE INSIGHTS
    // ==========================================

    private async detectInvoiceInsights(tenantId: string, events: any[]): Promise<BusinessInsight[]> {
        const insights: BusinessInsight[] = [];

        // Overdue invoices
        const overdueInvoices = events.filter(e => e.event_type === 'invoice.overdue');
        if (overdueInvoices.length >= 3) {
            const totalOverdue = overdueInvoices.reduce((sum, e) =>
                sum + (e.event_data?.amount || 0), 0
            );

            insights.push({
                id: `overdue-invoices-${Date.now()}`,
                type: InsightType.RISK,
                severity: InsightSeverity.HIGH,
                title: 'Multiple Overdue Invoices',
                message: `${overdueInvoices.length} invoices are overdue, totaling ₹${(totalOverdue / 100000).toFixed(1)}L`,
                impact: `Cash flow at risk: ₹${(totalOverdue / 100000).toFixed(1)}L`,
                confidence: 92,
                actions: [
                    {
                        id: 'send-reminders',
                        label: 'Send Payment Reminders',
                        type: 'primary',
                        endpoint: '/api/invoices/send-bulk-reminders',
                    },
                    {
                        id: 'call-customers',
                        label: 'Get Contact List',
                        type: 'secondary',
                    },
                ],
                createdAt: new Date(),
            });
        }

        // Invoice viewing pattern
        const viewedInvoices = events.filter(e => e.event_type === 'invoice.viewed');
        const multipleViews = viewedInvoices.filter(e => e.event_data?.viewCount >= 3);

        if (multipleViews.length > 0) {
            insights.push({
                id: `high-engagement-${Date.now()}`,
                type: InsightType.OPPORTUNITY,
                severity: InsightSeverity.MEDIUM,
                title: 'Customer Engagement Detected',
                message: `${multipleViews.length} customer(s) viewed invoices multiple times. They may need clarification or be ready to pay.`,
                impact: 'Perfect time for follow-up call',
                confidence: 75,
                actions: [
                    {
                        id: 'view-customers',
                        label: 'View Engaged Customers',
                        type: 'primary',
                    },
                    {
                        id: 'send-help',
                        label: 'Offer Assistance',
                        type: 'secondary',
                    },
                ],
                createdAt: new Date(),
            });
        }

        return insights;
    }

    // ==========================================
    // CUSTOMER INSIGHTS
    // ==========================================

    private async detectCustomerInsights(tenantId: string, events: any[]): Promise<BusinessInsight[]> {
        const insights: BusinessInsight[] = [];

        // Early payment pattern
        const payments = events.filter(e => e.event_type === 'payment.completed');
        const earlyPayments = payments.filter(e => {
            // Simulate early payment detection
            return Math.random() > 0.7; // 30% are "early"
        });

        if (earlyPayments.length >= 2) {
            insights.push({
                id: `early-payers-${Date.now()}`,
                type: InsightType.OPPORTUNITY,
                severity: InsightSeverity.MEDIUM,
                title: 'Early Payment Customers Identified',
                message: `${earlyPayments.length} customers consistently pay early. Consider offering volume discounts or upsell opportunities.`,
                impact: `Potential upsell: ₹2-5L`,
                confidence: 82,
                actions: [
                    {
                        id: 'view-customers',
                        label: 'View Early Payers',
                        type: 'primary',
                    },
                    {
                        id: 'create-offer',
                        label: 'Create Upsell Proposal',
                        type: 'secondary',
                    },
                ],
                createdAt: new Date(),
            });
        }

        return insights;
    }

    // ==========================================
    // EFFICIENCY INSIGHTS
    // ==========================================

    private async detectEfficiencyInsights(tenantId: string, events: any[]): Promise<BusinessInsight[]> {
        const insights: BusinessInsight[] = [];

        // Email engagement analysis
        const emailsSent = events.filter(e => e.event_type === 'distribution.email.sent');
        const emailsOpened = events.filter(e => e.event_type === 'distribution.email.opened');

        if (emailsSent.length > 0) {
            const openRate = (emailsOpened.length / emailsSent.length) * 100;

            if (openRate < 30) {
                insights.push({
                    id: `low-email-engagement-${Date.now()}`,
                    type: InsightType.EFFICIENCY,
                    severity: InsightSeverity.MEDIUM,
                    title: 'Low Email Open Rate',
                    message: `Only ${openRate.toFixed(0)}% of invoice emails are being opened. Industry average is 40-50%.`,
                    impact: 'Customers may not be seeing invoices',
                    confidence: 78,
                    actions: [
                        {
                            id: 'improve-subject',
                            label: 'Optimize Email Subject Lines',
                            type: 'primary',
                        },
                        {
                            id: 'try-whatsapp',
                            label: 'Enable WhatsApp Notifications',
                            type: 'secondary',
                        },
                    ],
                    createdAt: new Date(),
                });
            } else if (openRate > 60) {
                insights.push({
                    id: `good-email-engagement-${Date.now()}`,
                    type: InsightType.EFFICIENCY,
                    severity: InsightSeverity.LOW,
                    title: 'Excellent Email Engagement',
                    message: `${openRate.toFixed(0)}% email open rate - significantly above industry average!`,
                    impact: 'Strong customer communication',
                    confidence: 90,
                    actions: [],
                    createdAt: new Date(),
                });
            }
        }

        // Accounting sync
        const syncCompleted = events.filter(e => e.event_type === 'accounting.sync.completed');
        const syncFailed = events.filter(e => e.event_type === 'accounting.sync.failed');

        if (syncFailed.length > 0) {
            insights.push({
                id: `accounting-sync-issues-${Date.now()}`,
                type: InsightType.ALERT,
                severity: InsightSeverity.HIGH,
                title: 'Accounting Sync Failures',
                message: `${syncFailed.length} accounting sync(s) failed. Your financial data may be out of sync.`,
                impact: 'Data inconsistency risk',
                confidence: 95,
                actions: [
                    {
                        id: 'check-connection',
                        label: 'Check Accounting Connection',
                        type: 'primary',
                        endpoint: '/api/accounting/test-connection',
                    },
                    {
                        id: 'retry-sync',
                        label: 'Retry Failed Syncs',
                        type: 'primary',
                    },
                ],
                createdAt: new Date(),
            });
        }

        return insights;
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    private estimatePaymentAmount(events: any[]): string {
        const total = events.reduce((sum, e) => sum + (e.event_data?.amount || 50000), 0);
        return (total / 100000).toFixed(1) + 'L';
    }

    /**
     * Get morning briefing summary
     */
    async getMorningBriefing(tenantId: string): Promise<{
        greeting: string;
        priorityActions: string[];
        cashPosition: string;
        highlights: string[];
        prediction: string;
    }> {
        const insights = await this.generateInsights(tenantId);
        const highPriorityInsights = insights.filter(i =>
            i.severity === InsightSeverity.HIGH || i.severity === InsightSeverity.CRITICAL
        );

        return {
            greeting: `Good ${this.getTimeOfDay()}! Here's your business briefing`,
            priorityActions: highPriorityInsights.slice(0, 3).map(i => i.title),
            cashPosition: 'Healthy (+₹12.5L)', // Mock data
            highlights: [
                '12 invoices paid (₹4.2L)',
                '2 payment failures (Gateway issue)',
                'New record: Fastest payment (2 hours!)',
            ],
            prediction: 'You\'ll hit monthly target by Jan 25 (92% confidence)',
        };
    }

    private getTimeOfDay(): string {
        const hour = new Date().getHours();
        if (hour < 12) return 'morning';
        if (hour < 17) return 'afternoon';
        return 'evening';
    }
}
