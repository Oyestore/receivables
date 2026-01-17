import { Injectable, Logger } from '@nestjs/common';
import { EnhancedEmailService } from '../../../Module_02_Intelligent_Distribution/code/services/enhanced-email.service';

export enum HealthCategory {
    EXCELLENT = 'excellent',
    GOOD = 'good',
    FAIR = 'fair',
    POOR = 'poor',
    AT_RISK = 'at_risk',
}

export interface CustomerHealthScore {
    customerId: string;
    overallScore: number;          // 0-100
    healthCategory: HealthCategory;

    // Component scores
    engagementScore: number;       // 0-100
    paymentHealthScore: number;    // 0-100
    churnRiskScore: number;        // 0-100 (inverted, 100 = no risk)

    // Metrics
    metrics: {
        totalInvoices: number;
        totalRevenue: number;
        avgPaymentDays: number;
        lastActivityDays: number;
    };

    // Insights
    strengths: string[];
    concerns: string[];
    recommendations: string[];

    // Actions
    suggestedActions: Array<{
        priority: 'high' | 'medium' | 'low';
        action: string;
        expectedImpact: string;
    }>;

    // Trends
    trend: 'improving' | 'stable' | 'declining';
    trendPercentage: number;
}

interface CustomerDataInput {
    engagement?: Record<string, unknown>;
    payment?: Record<string, unknown>;
    churn?: Record<string, unknown>;
    metrics?: {
        totalInvoices?: number;
        totalRevenue?: number;
        avgPaymentDays?: number;
        lastActivityDays?: number;
    };
    historical?: Record<string, unknown>;
}

interface EngagementResult {
    score: number;
}

interface PaymentResult {
    probability: number;
}

interface ChurnResult {
    riskScore: number;
}

/**
 * Customer Health Service
 * ML-powered customer health scoring and intervention management
 */
@Injectable()
export class CustomerHealthService {
    private readonly logger = new Logger(CustomerHealthService.name);

    constructor(
        private readonly emailService: EnhancedEmailService,
    ) { }

    /**
     * Calculate comprehensive customer health score
     */
    async calculateHealthScore(
        tenantId: string,
        customerId: string,
        customerData: CustomerDataInput,
    ): Promise<CustomerHealthScore> {
        try {
            // Get all ML insights in parallel
            const engagementInput = {
                customerId,
                emailOpenRate: Number((customerData.engagement as any)?.emailOpenRate ?? 0),
                messageCount: Number((customerData.engagement as any)?.messageCount ?? 0),
                paymentCount: Number((customerData.engagement as any)?.paymentCount ?? 0),
                avgResponseTimeHours: Number((customerData.engagement as any)?.avgResponseTimeHours ?? 0),
                lastInteractionDays: Number((customerData.engagement as any)?.lastInteractionDays ?? 0),
                totalInvoiceValue: Number((customerData.engagement as any)?.totalInvoiceValue ?? 0),
                disputeCount: Number((customerData.engagement as any)?.disputeCount ?? 0),
                rating: Number((customerData.engagement as any)?.rating ?? 0),
                daysSinceSignup: Number((customerData.engagement as any)?.daysSinceSignup ?? 0),
                isPremium: Boolean((customerData.engagement as any)?.isPremium ?? false),
            };
            const paymentInput = {
                customerId,
                invoiceId: String((customerData.payment as any)?.invoiceId ?? ''),
                daysOverdue: Number((customerData.payment as any)?.daysOverdue ?? 0),
                previousPayments: Number((customerData.payment as any)?.previousPayments ?? 0),
                avgDaysToPay: Number((customerData.payment as any)?.avgDaysToPay ?? 0),
                totalOutstanding: Number((customerData.payment as any)?.totalOutstanding ?? 0),
                engagementScore: Number((customerData.payment as any)?.engagementScore ?? 0),
                lastContactDays: Number((customerData.payment as any)?.lastContactDays ?? 0),
            };
            const churnInput = {
                customerId,
                messagesSent30d: Number((customerData.churn as any)?.messagesSent30d ?? 0),
                messagesOpened30d: Number((customerData.churn as any)?.messagesOpened30d ?? 0),
                paymentsReceived30d: Number((customerData.churn as any)?.paymentsReceived30d ?? 0),
                disputesCreated30d: Number((customerData.churn as any)?.disputesCreated30d ?? 0),
                lastLoginDays: Number((customerData.churn as any)?.lastLoginDays ?? 0),
                totalValue30d: Number((customerData.churn as any)?.totalValue30d ?? 0),
            };
            const [engagement, payment, churn] = await Promise.all([
                this.emailService.calculateEngagementScore(engagementInput),
                this.emailService.predictPaymentProbability(paymentInput),
                this.emailService.assessChurnRisk(churnInput),
            ]);

            // Calculate component scores
            const engagementScore = engagement.score;
            const paymentHealthScore = payment.probability * 100;
            const churnRiskScore = (1 - churn.riskScore) * 100; // Invert so 100 = healthy

            // Calculate overall health score (weighted average)
            const overallScore = Math.round(
                engagementScore * 0.3 +
                paymentHealthScore * 0.4 +
                churnRiskScore * 0.3,
            );

            const healthCategory = this.categorizeHealth(overallScore);
            const trend = this.calculateTrend(customerData.historical);
            const trendPercentage = this.calculateTrendPercentage(customerData.historical);

            // Generate insights
            const strengths = this.identifyStrengths(
                engagement,
                payment,
                churn,
                customerData,
            );
            const concerns = this.identifyConcerns(
                engagement,
                payment,
                churn,
                customerData,
            );
            const recommendations = this.generateRecommendations(
                healthCategory,
                engagement,
                payment,
                churn,
            );

            const suggestedActions = this.getSuggestedActions(
                healthCategory,
                concerns,
                churn.riskScore,
            );

            this.logger.log(
                `Customer health calculated: ${customerId}, score: ${overallScore} (${healthCategory})`,
            );

            return {
                customerId,
                overallScore,
                healthCategory,
                engagementScore,
                paymentHealthScore,
                churnRiskScore,
                metrics: {
                    totalInvoices: customerData.metrics?.totalInvoices || 0,
                    totalRevenue: customerData.metrics?.totalRevenue || 0,
                    avgPaymentDays: customerData.metrics?.avgPaymentDays || 0,
                    lastActivityDays: customerData.metrics?.lastActivityDays || 0,
                },
                strengths,
                concerns,
                recommendations,
                suggestedActions,
                trend,
                trendPercentage,
            };
        } catch (error) {
            this.logger.error(
                `Failed to calculate health score for ${customerId}: ${error.message}`,
            );
            throw error;
        }
    }

    /**
     * Batch health scoring for portfolio analysis
     */
    async batchHealthScoring(
        tenantId: string,
        customerIds: string[],
    ): Promise<Map<string, CustomerHealthScore>> {
        const results = new Map();

        // Process in batches to avoid overwhelming the system
        const BATCH_SIZE = 20;
        for (let i = 0; i < customerIds.length; i += BATCH_SIZE) {
            const batch = customerIds.slice(i, i + BATCH_SIZE);

            // Mock customer data - in production, fetch from database
            const batchResults = await Promise.all(
                batch.map((customerId) =>
                    this.calculateHealthScore(tenantId, customerId, this.getMockData()),
                ),
            );

            batch.forEach((customerId, index) => {
                results.set(customerId, batchResults[index]);
            });
        }

        this.logger.log(
            `Batch health scoring completed: ${customerIds.length} customers`,
        );

        return results;
    }

    /**
     * Identify at-risk customers requiring intervention
     */
    async identifyAtRiskCustomers(
        tenantId: string,
        threshold: number = 50,
    ): Promise<Array<{
        customerId: string;
        healthScore: number;
        riskLevel: string;
        urgency: 'critical' | 'high' | 'medium';
    }>> {
        // Mock implementation - in production, query database
        const mockAtRisk = [
            {
                customerId: 'cust_001',
                healthScore: 35,
                riskLevel: 'High',
                urgency: 'critical' as const,
            },
            {
                customerId: 'cust_002',
                healthScore: 45,
                riskLevel: 'Medium',
                urgency: 'high' as const,
            },
        ];

        this.logger.log(`Identified ${mockAtRisk.length} at-risk customers`);

        return mockAtRisk;
    }

    /**
     * Trigger automated interventions for at-risk customers
     */
    async triggerInterventions(
        tenantId: string,
        customerId: string,
        healthScore: CustomerHealthScore,
    ): Promise<{
        interventionsTriggered: string[];
        scheduledActions: Array<{ action: string; scheduledFor: Date }>;
    }> {
        const interventions = [];
        const scheduledActions = [];

        if (healthScore.healthCategory === HealthCategory.AT_RISK) {
            interventions.push('Account manager outreach');
            interventions.push('Personalized retention offer');

            scheduledActions.push({
                action: 'Send retention email',
                scheduledFor: new Date(Date.now() + 3600000), // 1 hour
            });
            scheduledActions.push({
                action: 'Schedule call with account manager',
                scheduledFor: new Date(Date.now() + 86400000), // 1 day
            });
        } else if (healthScore.healthCategory === HealthCategory.POOR) {
            interventions.push('Enhanced monitoring');
            interventions.push('Payment reminder with incentive');

            scheduledActions.push({
                action: 'Send engagement survey',
                scheduledFor: new Date(Date.now() + 7200000), // 2 hours
            });
        }

        this.logger.log(
            `Interventions triggered for ${customerId}: ${interventions.length} actions`,
        );

        return {
            interventionsTriggered: interventions,
            scheduledActions,
        };
    }

    /**
     * Get portfolio health summary
     */
    async getPortfolioHealthSummary(
        tenantId: string,
        customerIds: string[],
    ): Promise<{
        totalCustomers: number;
        byCategory: Record<HealthCategory, number>;
        avgHealthScore: number;
        atRiskCount: number;
        improvingCount: number;
        decliningCount: number;
    }> {
        // Mock implementation
        const summary = {
            totalCustomers: customerIds.length,
            byCategory: {
                [HealthCategory.EXCELLENT]: Math.floor(customerIds.length * 0.2),
                [HealthCategory.GOOD]: Math.floor(customerIds.length * 0.3),
                [HealthCategory.FAIR]: Math.floor(customerIds.length * 0.25),
                [HealthCategory.POOR]: Math.floor(customerIds.length * 0.15),
                [HealthCategory.AT_RISK]: Math.floor(customerIds.length * 0.1),
            },
            avgHealthScore: 65,
            atRiskCount: Math.floor(customerIds.length * 0.1),
            improvingCount: Math.floor(customerIds.length * 0.4),
            decliningCount: Math.floor(customerIds.length * 0.2),
        };

        return summary;
    }

    // Helper methods

    private categorizeHealth(score: number): HealthCategory {
        if (score >= 80) return HealthCategory.EXCELLENT;
        if (score >= 65) return HealthCategory.GOOD;
        if (score >= 50) return HealthCategory.FAIR;
        if (score >= 35) return HealthCategory.POOR;
        return HealthCategory.AT_RISK;
    }

    private calculateTrend(historical: Record<string, unknown> | undefined): 'improving' | 'stable' | 'declining' {
        // Mock trend calculation
        const random = Math.random();
        if (random > 0.6) return 'improving';
        if (random > 0.3) return 'stable';
        return 'declining';
    }

    private calculateTrendPercentage(historical: Record<string, unknown> | undefined): number {
        return Math.random() * 20 - 10; // -10% to +10%
    }

    private identifyStrengths(
        engagement: EngagementResult,
        payment: PaymentResult,
        churn: ChurnResult,
        data: CustomerDataInput,
    ): string[] {
        const strengths = [];

        if (engagement.score >= 75) {
            strengths.push('High engagement - customer actively uses platform');
        }

        if (payment.probability >= 0.8) {
            strengths.push('Excellent payment history - reliable payer');
        }

        if (churn.riskScore < 0.2) {
            strengths.push('Low churn risk - highly satisfied customer');
        }

        if (data.metrics?.totalRevenue > 1000000) {
            strengths.push('High-value customer - significant revenue contribution');
        }

        return strengths;
    }

    private identifyConcerns(
        engagement: EngagementResult,
        payment: PaymentResult,
        churn: ChurnResult,
        data: CustomerDataInput,
    ): string[] {
        const concerns = [];

        if (engagement.score < 40) {
            concerns.push('Low engagement - customer not actively using platform');
        }

        if (payment.probability < 0.5) {
            concerns.push('Payment reliability concerns - high default risk');
        }

        if (churn.riskScore > 0.6) {
            concerns.push('High churn risk - customer may leave soon');
        }

        if (data.metrics?.lastActivityDays > 30) {
            concerns.push('No recent activity - customer may be disengaging');
        }

        return concerns;
    }

    private generateRecommendations(
        category: HealthCategory,
        engagement: EngagementResult,
        payment: PaymentResult,
        churn: ChurnResult,
    ): string[] {
        const recommendations = [];

        if (category === HealthCategory.AT_RISK) {
            recommendations.push('Immediate intervention required - assign account manager');
            recommendations.push('Offer retention incentive or personalized discount');
            recommendations.push('Schedule urgent call to understand pain points');
        } else if (category === HealthCategory.POOR) {
            recommendations.push('Increase touchpoints and communication frequency');
            recommendations.push('Provide additional training or support');
        } else if (category === HealthCategory.EXCELLENT) {
            recommendations.push('Upsell opportunity - offer premium features');
            recommendations.push('Request testimonial or case study');
            recommendations.push('Encourage referrals through referral program');
        }

        return recommendations;
    }

    private getSuggestedActions(
        category: HealthCategory,
        concerns: string[],
        churnRisk: number,
    ): Array<{ priority: 'high' | 'medium' | 'low'; action: string; expectedImpact: string }> {
        const actions = [];

        if (category === HealthCategory.AT_RISK || churnRisk > 0.7) {
            actions.push({
                priority: 'high',
                action: 'Immediate outreach from senior account manager',
                expectedImpact: 'Reduce churn risk by 40-50%',
            });
            actions.push({
                priority: 'high',
                action: 'Offer 20% discount for next 3 months',
                expectedImpact: 'Improve retention probability by 60%',
            });
        }

        if (concerns.some((c) => c.includes('payment'))) {
            actions.push({
                priority: 'medium',
                action: 'Set up payment plan or flexible terms',
                expectedImpact: 'Improve payment probability by 30%',
            });
        }

        if (concerns.some((c) => c.includes('engagement'))) {
            actions.push({
                priority: 'medium',
                action: 'Send targeted re-engagement email campaign',
                expectedImpact: 'Increase activity by 25%',
            });
        }

        return actions;
    }

    private getMockData(): CustomerDataInput {
        return {
            engagement: {
                emailOpenRate: 0.25 + Math.random() * 0.3,
                messageCount: Math.floor(Math.random() * 50) + 10,
                paymentCount: Math.floor(Math.random() * 20) + 5,
                avgResponseTimeHours: Math.random() * 24,
                lastInteractionDays: Math.floor(Math.random() * 30),
                totalInvoiceValue: Math.floor(Math.random() * 500000) + 50000,
                disputeCount: Math.floor(Math.random() * 3),
                rating: 3 + Math.random() * 2,
                daysSinceSignup: Math.floor(Math.random() * 365) + 90,
                isPremium: Math.random() > 0.5,
            },
            payment: {
                daysOverdue: Math.floor(Math.random() * 15),
                previousPayments: Math.floor(Math.random() * 25) + 5,
                avgDaysToPay: Math.random() * 20,
                totalOutstanding: Math.floor(Math.random() * 100000),
                engagementScore: 50 + Math.random() * 40,
                lastContactDays: Math.floor(Math.random() * 15),
            },
            churn: {
                messagesSent30d: Math.floor(Math.random() * 20),
                messagesOpened30d: Math.floor(Math.random() * 15),
                paymentsReceived30d: Math.floor(Math.random() * 5),
                disputesCreated30d: Math.floor(Math.random() * 2),
                lastLoginDays: Math.floor(Math.random() * 20),
                totalValue30d: Math.floor(Math.random() * 200000),
            },
            metrics: {
                totalInvoices: Math.floor(Math.random() * 100) + 20,
                totalRevenue: Math.floor(Math.random() * 5000000) + 500000,
                avgPaymentDays: Math.random() * 30,
                lastActivityDays: Math.floor(Math.random() * 40),
            },
            historical: {},
        };
    }
}
