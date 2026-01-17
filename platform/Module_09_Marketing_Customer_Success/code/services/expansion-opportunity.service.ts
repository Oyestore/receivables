import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Expansion Opportunity Engine
 * 
 * Gap Resolution: Phase 9.2 - Missing expansion opportunity identification and automation
 * 
 * Systematically identifies upsell, cross-sell, and expansion opportunities
 * to drive revenue growth from existing customers.
 */

export enum OpportunityType {
    UPSELL = 'upsell',                // Upgrade to higher tier
    CROSS_SELL = 'cross_sell',        // Additional modules/features
    USER_EXPANSION = 'user_expansion', // More seats/users
    VOLUME_EXPANSION = 'volume_expansion', // Higher usage limits
    FEATURE_UNLOCK = 'feature_unlock', // Premium features
}

export enum OpportunityStage {
    IDENTIFIED = 'identified',
    QUALIFIED = 'qualified',
    ENGAGED = 'engaged',
    PROPOSAL_SENT = 'proposal_sent',
    NEGOTIATING = 'negotiating',
    WON = 'won',
    LOST = 'lost',
}

export interface ExpansionOpportunity {
    id: string;
    customerId: string;
    tenantId: string;

    // Opportunity details
    type: OpportunityType;
    stage: OpportunityStage;
    priority: 'critical' | 'high' | 'medium' | 'low';

    // Value
    estimatedMRR: number;              // Monthly Recurring Revenue
    estimatedContract: number;         // Total contract value
    probability: number;               // 0-1
    expectedCloseDate?: Date;

    // Recommendations
    recommendedProduct: string;
    recommendedTier?: string;
    currentValue: number;              // Current MRR
    expansionValue: number;            // Additional MRR

    // Triggers (why this opportunity exists)
    triggers: Array<{
        type: string;
        description: string;
        weight: number;
    }>;

    // Context
    usageData?: {
        currentUsage: number;
        limit: number;
        utilizationPercent: number;
    };

    // Actions
    suggestedActions: Array<{
        action: string;
        timing: string;
        channel: 'email' | 'call' | 'in-app' | 'meeting';
        priority: number;
    }>;

    // Metadata
    identifiedAt: Date;
    lastUpdated: Date;
    assignedTo?: string;              // CSM or sales rep
}

export interface ExpansionScore {
    customerId: string;
    overallScore: number;              // 0-100

    // Component scores
    readinessScore: number;            // Customer's readiness to expand
    valueScore: number;                // Potential value
    urgencyScore: number;              // Time sensitivity

    // Indicators
    positiveIndicators: string[];
    barriers: string[];

    // Recommendations
    bestOpportunityType: OpportunityType;
    nextBestAction: string;
    timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
}

export interface RenewalForecast {
    customerId: string;
    renewalDate: Date;
    currentMRR: number;

    // Predictions
    renewalProbability: number;        // 0-1
    expansionProbability: number;      // Probability of upsell during renewal
    expectedMRR: number;               // Forecasted MRR after renewal

    // Risk factors
    riskFactors: Array<{
        factor: string;
        impact: 'high' | 'medium' | 'low';
    }>;

    // Recommended actions
    actions: Array<{
        action: string;
        timing: string;
        expectedImpact: string;
    }>;
}

@Injectable()
export class ExpansionOpportunityService {
    private readonly logger = new Logger(ExpansionOpportunityService.name);

    constructor(
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Identify expansion opportunities for a customer
     */
    async identifyOpportunities(
        tenantId: string,
        customerId: string,
        customerData: {
            currentMRR: number;
            currentPlan: string;
            usageMetrics: Record<string, any>;
            healthScore: number;
            tenure: number;                // months as customer
            engagementLevel: 'high' | 'medium' | 'low';
        },
    ): Promise<ExpansionOpportunity[]> {
        const opportunities: ExpansionOpportunity[] = [];

        // Check for usage-based expansion
        const usageExpansion = this.checkUsageExpansion(customerData);
        if (usageExpansion) {
            opportunities.push(usageExpansion);
        }

        // Check for tier upgrade
        const tierUpgrade = this.checkTierUpgrade(customerData);
        if (tierUpgrade) {
            opportunities.push(tierUpgrade);
        }

        // Check for feature unlock
        const featureUnlock = this.checkFeatureUnlock(customerData);
        if (featureUnlock) {
            opportunities.push(featureUnlock);
        }

        // Check for module cross-sell
        const crossSell = this.checkModuleCrossSell(customerData);
        if (crossSell) {
            opportunities.push(crossSell);
        }

        // Sort by priority and probability
        opportunities.sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return b.probability - a.probability;
        });

        this.logger.log(
            `Identified ${opportunities.length} expansion opportunities for ${customerId}`,
        );

        return opportunities;
    }

    /**
     * Calculate expansion readiness score
     */
    async calculateExpansionScore(
        customerId: string,
        customerData: {
            healthScore: number;
            npsScore?: number;
            usageGrowth: number;           // % growth over last 3 months
            productAdoption: number;        // % of features used
            supportSatisfaction: number;    // CSAT score
            paymentHistory: 'excellent' | 'good' | 'fair' | 'poor';
        },
    ): Promise<ExpansionScore> {
        // Calculate component scores
        const readinessScore = this.calculateReadinessScore(customerData);
        const valueScore = this.calculateValueScore(customerData);
        const urgencyScore = this.calculateUrgencyScore(customerData);

        // Overall expansion score (weighted average)
        const overallScore = Math.round(
            readinessScore * 0.4 +
            valueScore * 0.35 +
            urgencyScore * 0.25,
        );

        // Identify positive indicators and barriers
        const positiveIndicators = this.identifyPositiveIndicators(customerData);
        const barriers = this.identifyBarriers(customerData);

        // Determine best opportunity type
        const bestOpportunityType = this.determineBestOpportunityType(customerData);

        return {
            customerId,
            overallScore,
            readinessScore,
            valueScore,
            urgencyScore,
            positiveIndicators,
            barriers,
            bestOpportunityType,
            nextBestAction: this.determineNextAction(overallScore, bestOpportunityType),
            timeframe: this.determineTimeframe(urgencyScore),
        };
    }

    /**
     * Get renewal forecast for customer
     */
    async getRenewalForecast(
        customerId: string,
        contractData: {
            renewalDate: Date;
            currentMRR: number;
            contractLength: number;         // months
            healthScore: number;
            churnRisk: number;
        },
    ): Promise<RenewalForecast> {
        // Calculate renewal probability (inverse of churn risk)
        const renewalProbability = Math.max(0, Math.min(1, 1 - contractData.churnRisk));

        // Expansion probability based on health and engagement
        const expansionProbability = contractData.healthScore > 70
            ? (contractData.healthScore - 70) / 30 * 0.6
            : 0;

        // Expected MRR after renewal (with potential expansion)
        const expectedMRR = contractData.currentMRR * (
            renewalProbability + (expansionProbability * 0.3)
        );

        const riskFactors = this.identifyRenewalRisks(contractData);
        const actions = this.generateRenewalActions(contractData, riskFactors);

        return {
            customerId,
            renewalDate: contractData.renewalDate,
            currentMRR: contractData.currentMRR,
            renewalProbability,
            expansionProbability,
            expectedMRR,
            riskFactors,
            actions,
        };
    }

    /**
     * Trigger automated expansion campaigns
     */
    async triggerExpansionCampaign(
        opportunity: ExpansionOpportunity,
    ): Promise<void> {
        // Create personalized campaign based on opportunity type
        const campaign = this.buildExpansionCampaign(opportunity);

        // Emit event for campaign service
        this.eventEmitter.emit('expansion.campaign.create', {
            customerId: opportunity.customerId,
            opportunityId: opportunity.id,
            campaign,
        });

        this.logger.log(
            `Triggered expansion campaign for ${opportunity.customerId}: ${opportunity.type}`,
        );
    }

    /**
     * Get expansion pipeline metrics
     */
    async getExpansionPipeline(
        tenantId: string,
    ): Promise<{
        totalOpportunities: number;
        totalValue: number;
        byStage: Record<OpportunityStage, { count: number; value: number }>;
        byType: Record<OpportunityType, { count: number; value: number }>;
        forecastedMRR: number;
        conversionRate: number;
    }> {
        // Mock implementation - in production, query database
        const opportunities = 50;
        const totalValue = 250000;

        return {
            totalOpportunities: opportunities,
            totalValue,
            byStage: {
                [OpportunityStage.IDENTIFIED]: { count: 20, value: 100000 },
                [OpportunityStage.QUALIFIED]: { count: 15, value: 80000 },
                [OpportunityStage.ENGAGED]: { count: 8, value: 40000 },
                [OpportunityStage.PROPOSAL_SENT]: { count: 5, value: 20000 },
                [OpportunityStage.NEGOTIATING]: { count: 2, value: 10000 },
                [OpportunityStage.WON]: { count: 0, value: 0 },
                [OpportunityStage.LOST]: { count: 0, value: 0 },
            },
            byType: {
                [OpportunityType.UPSELL]: { count: 15, value: 100000 },
                [OpportunityType.CROSS_SELL]: { count: 20, value: 80000 },
                [OpportunityType.USER_EXPANSION]: { count: 10, value: 50000 },
                [OpportunityType.VOLUME_EXPANSION]: { count: 3, value: 15000 },
                [OpportunityType.FEATURE_UNLOCK]: { count: 2, value: 5000 },
            },
            forecastedMRR: totalValue * 0.3, // Weighted probability
            conversionRate: 0.32,
        };
    }

    // Private helper methods

    private checkUsageExpansion(data: any): ExpansionOpportunity | null {
        // Check if customer is hitting usage limits
        const usagePercent = (data.usageMetrics?.currentUsage / data.usageMetrics?.limit) * 100;

        if (usagePercent >= 80) {
            return {
                id: this.generateId(),
                customerId: data.customerId || 'cust_001',
                tenantId: data.tenantId || 'tenant_001',
                type: OpportunityType.VOLUME_EXPANSION,
                stage: OpportunityStage.IDENTIFIED,
                priority: usagePercent >= 95 ? 'critical' : 'high',
                estimatedMRR: data.currentMRR * 0.3,
                estimatedContract: data.currentMRR * 0.3 * 12,
                probability: usagePercent / 100,
                recommendedProduct: 'Higher Volume Tier',
                currentValue: data.currentMRR,
                expansionValue: data.currentMRR * 0.3,
                triggers: [
                    {
                        type: 'usage_threshold',
                        description: `Approaching ${usagePercent.toFixed(0)}% of usage limit`,
                        weight: 0.9,
                    },
                ],
                usageData: {
                    currentUsage: data.usageMetrics?.currentUsage || 0,
                    limit: data.usageMetrics?.limit || 100,
                    utilizationPercent: usagePercent,
                },
                suggestedActions: [
                    {
                        action: 'Send in-app notification about usage',
                        timing: 'immediate',
                        channel: 'in-app',
                        priority: 1,
                    },
                    {
                        action: 'Schedule  call to discuss upgrade',
                        timing: 'within 3 days',
                        channel: 'call',
                        priority: 2,
                    },
                ],
                identifiedAt: new Date(),
                lastUpdated: new Date(),
            };
        }

        return null;
    }

    private checkTierUpgrade(data: any): ExpansionOpportunity | null {
        // High engagement + long tenure = good upsell candidate
        if (data.engagementLevel === 'high' && data.tenure >= 6 && data.healthScore > 75) {
            return {
                id: this.generateId(),
                customerId: data.customerId || 'cust_001',
                tenantId: data.tenantId || 'tenant_001',
                type: OpportunityType.UPSELL,
                stage: OpportunityStage.IDENTIFIED,
                priority: 'high',
                estimatedMRR: data.currentMRR * 0.5,
                estimatedContract: data.currentMRR * 0.5 * 12,
                probability: 0.65,
                recommendedProduct: 'Premium Tier',
                currentValue: data.currentMRR,
                expansionValue: data.currentMRR * 0.5,
                triggers: [
                    {
                        type: 'high_engagement',
                        description: 'Customer shows high engagement and satisfaction',
                        weight: 0.8,
                    },
                    {
                        type: 'tenure',
                        description: `${data.tenure} months as customer - established relationship`,
                        weight: 0.7,
                    },
                ],
                suggestedActions: [
                    {
                        action: 'Personalized email highlighting premium features',
                        timing: 'this week',
                        channel: 'email',
                        priority: 1,
                    },
                    {
                        action: 'Offer premium trial (14 days)',
                        timing: 'within 1 week',
                        channel: 'in-app',
                        priority: 2,
                    },
                ],
                identifiedAt: new Date(),
                lastUpdated: new Date(),
            };
        }

        return null;
    }

    private checkFeatureUnlock(data: any): ExpansionOpportunity | null {
        // Mock - in production, check feature usage patterns
        if (Math.random() > 0.7) {
            return {
                id: this.generateId(),
                customerId: data.customerId || 'cust_001',
                tenantId: data.tenantId || 'tenant_001',
                type: OpportunityType.FEATURE_UNLOCK,
                stage: OpportunityStage.IDENTIFIED,
                priority: 'medium',
                estimatedMRR: data.currentMRR * 0.15,
                estimatedContract: data.currentMRR * 0.15 * 12,
                probability: 0.45,
                recommendedProduct: 'Advanced Analytics Add-on',
                currentValue: data.currentMRR,
                expansionValue: data.currentMRR * 0.15,
                triggers: [
                    {
                        type: 'feature_interest',
                        description: 'Viewed advanced analytics page 5 times',
                        weight: 0.6,
                    },
                ],
                suggestedActions: [
                    {
                        action: 'Send targeted content about analytics benefits',
                        timing: 'this week',
                        channel: 'email',
                        priority: 1,
                    },
                ],
                identifiedAt: new Date(),
                lastUpdated: new Date(),
            };
        }

        return null;
    }

    private checkModuleCrossSell(data: any): ExpansionOpportunity | null {
        // Mock - suggest additional modules
        if (data.tenure >= 3 && Math.random() > 0.6) {
            return {
                id: this.generateId(),
                customerId: data.customerId || 'cust_001',
                tenantId: data.tenantId || 'tenant_001',
                type: OpportunityType.CROSS_SELL,
                stage: OpportunityStage.IDENTIFIED,
                priority: 'medium',
                estimatedMRR: data.currentMRR * 0.4,
                estimatedContract: data.currentMRR * 0.4 * 12,
                probability: 0.5,
                recommendedProduct: 'Credit Scoring Module',
                currentValue: data.currentMRR,
                expansionValue: data.currentMRR * 0.4,
                triggers: [
                    {
                        type: 'related_need',
                        description: 'Customer uses invoicing - credit scoring is complementary',
                        weight: 0.7,
                    },
                ],
                suggestedActions: [
                    {
                        action: 'Demo credit scoring capabilities',
                        timing: 'next business review',
                        channel: 'meeting',
                        priority: 1,
                    },
                ],
                identifiedAt: new Date(),
                lastUpdated: new Date(),
            };
        }

        return null;
    }

    private calculateReadinessScore(data: any): number {
        let score = 0;

        // Health score contributes 40%
        score += (data.healthScore / 100) * 40;

        // NPS contributes 30%
        if (data.npsScore !== undefined) {
            score += ((data.npsScore + 100) / 200) * 30;
        }

        // Product adoption contributes 20%
        score += (data.productAdoption / 100) * 20;

        // Support satisfaction contributes 10%
        score += (data.supportSatisfaction / 5) * 10;

        return Math.round(score);
    }

    private calculateValueScore(data: any): number {
        // Mock - in production, use LTV models
        return 60 + Math.random() * 30;
    }

    private calculateUrgencyScore(data: any): number {
        let score = 0;

        // Usage growth indicates urgency
        if (data.usageGrowth > 50) score += 40;
        else if (data.usageGrowth > 25) score += 25;
        else if (data.usageGrowth > 10) score += 10;

        // Payment history
        if (data.paymentHistory === 'excellent') score += 30;
        else if (data.paymentHistory === 'good') score += 20;

        // Random factor for demo
        score += Math.random() * 30;

        return Math.min(100, Math.round(score));
    }

    private identifyPositiveIndicators(data: any): string[] {
        const indicators = [];

        if (data.healthScore >= 80) {
            indicators.push('Excellent health score - customer is thriving');
        }

        if (data.npsScore >= 50) {
            indicators.push('Strong NPS - customer is a promoter');
        }

        if (data.usageGrowth >= 25) {
            indicators.push(`Usage growing ${data.usageGrowth}% - clear value from platform`);
        }

        if (data.productAdoption >= 70) {
            indicators.push('High feature adoption - power user');
        }

        return indicators;
    }

    private identifyBarriers(data: any): string[] {
        const barriers = [];

        if (data.healthScore < 60) {
            barriers.push('Low health score - address concerns first');
        }

        if (data.supportSatisfaction < 3) {
            barriers.push('Poor support satisfaction - improve experience');
        }

        if (data.paymentHistory === 'poor') {
            barriers.push('Payment issues - resolve billing concerns');
        }

        return barriers;
    }

    private determineBestOpportunityType(data: any): OpportunityType {
        if (data.usageGrowth > 50) return OpportunityType.VOLUME_EXPANSION;
        if (data.healthScore > 80) return OpportunityType.UPSELL;
        if (data.productAdoption > 70) return OpportunityType.FEATURE_UNLOCK;
        return OpportunityType.CROSS_SELL;
    }

    private determineNextAction(score: number, type: OpportunityType): string {
        if (score >= 75) {
            return `Immediate outreach - present ${type} opportunity`;
        } else if (score >= 50) {
            return `Nurture campaign - educate about ${type} benefits`;
        } else {
            return 'Focus on satisfaction improvement first';
        }
    }

    private determineTimeframe(urgency: number): 'immediate' | 'short_term' | 'medium_term' | 'long_term' {
        if (urgency >= 75) return 'immediate';
        if (urgency >= 50) return 'short_term';
        if (urgency >= 25) return 'medium_term';
        return 'long_term';
    }

    private identifyRenewalRisks(data: any): RenewalForecast['riskFactors'] {
        const risks = [];

        if (data.healthScore < 60) {
            risks.push({
                factor: 'Low customer health score',
                impact: 'high',
            });
        }

        if (data.churnRisk > 0.5) {
            risks.push({
                factor: 'High churn prediction',
                impact: 'high',
            });
        }

        return risks as RenewalForecast['riskFactors'];
    }

    private generateRenewalActions(data: any, risks: any[]): RenewalForecast['actions'] {
        const actions = [];

        if (risks.length > 0) {
            actions.push({
                action: 'Schedule retention meeting with decision maker',
                timing: '90 days before renewal',
                expectedImpact: '+25% renewal probability',
            });
        }

        actions.push({
            action: 'Present expansion options',
            timing: '60 days before renewal',
            expectedImpact: '+30% expansion probability',
        });

        return actions;
    }

    private buildExpansionCampaign(opportunity: ExpansionOpportunity): any {
        return {
            name: `Expansion: ${opportunity.type} for ${opportunity.customerId}`,
            type: opportunity.type,
            channels: opportunity.suggestedActions.map(a => a.channel),
            estimatedValue: opportunity.expansionValue,
        };
    }

    private generateId(): string {
        return `expansion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
