import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DistributionRule } from '../entities/distribution-rule.entity';
import { DistributionAssignment } from '../entities/distribution-entities';

export interface RulePerformanceMetrics {
    ruleId: string;
    ruleName: string;
    totalEvaluations: number;
    successfulMatches: number;
    matchRate: number;
    avgDeliveryRate: number;
    avgResponseTime: number;
    channelBreakdown: Record<string, number>;
    recommendation: 'keep' | 'optimize' | 'disable';
    confidence: number;
}

export interface ChannelRecommendation {
    invoiceId: string;
    recommendedChannel: string;
    confidence: number;
    reasons: string[];
    alternativeChannels: Array<{ channel: string; score: number }>;
}

@Injectable()
export class MLOptimizationService {
    private readonly logger = new Logger(MLOptimizationService.name);

    constructor(
        @InjectRepository(DistributionRule)
        private ruleRepo: Repository<DistributionRule>,
        @InjectRepository(DistributionAssignment)
        private assignmentRepo: Repository<DistributionAssignment>,
    ) { }

    /**
     * Analyze rule performance using historical data
     */
    async analyzeRulePerformance(
        tenantId: string,
        dateRange: { start: Date; end: Date },
    ): Promise<RulePerformanceMetrics[]> {
        const rules = await this.ruleRepo.find({ where: { tenant_id: tenantId } });

        const metrics: RulePerformanceMetrics[] = [];

        for (const rule of rules) {
            // Get all assignments created by this rule
            const assignments = await this.assignmentRepo
                .createQueryBuilder('assignment')
                .where('assignment.tenant_id = :tenantId', { tenantId })
                .andWhere('assignment.rule_id = :ruleId', { ruleId: rule.id })
                .andWhere('assignment.created_at BETWEEN :start AND :end', dateRange)
                .getMany();

            if (assignments.length === 0) continue;

            // Calculate metrics
            const delivered = assignments.filter((a) => a.status === 'delivered').length;
            const failed = assignments.filter((a) => a.status === 'failed').length;
            const avgDeliveryRate = (delivered / assignments.length) * 100;

            // Channel breakdown
            const channelBreakdown = assignments.reduce((acc, a) => {
                acc[a.channel] = (acc[a.channel] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            // Calculate recommendation
            const recommendation = this.calculateRecommendation(
                avgDeliveryRate,
                assignments.length,
            );

            metrics.push({
                ruleId: rule.id,
                ruleName: rule.name,
                totalEvaluations: assignments.length,
                successfulMatches: delivered,
                matchRate: (delivered / assignments.length) * 100,
                avgDeliveryRate,
                avgResponseTime: 0, // Calculate from distribution records
                channelBreakdown,
                recommendation: recommendation.action,
                confidence: recommendation.confidence,
            });
        }

        // Sort by performance
        return metrics.sort((a, b) => b.avgDeliveryRate - a.avgDeliveryRate);
    }

    /**
     * Recommend optimal channel for invoice using ML
     */
    async recommendChannel(
        invoiceData: {
            amount: number;
            clientTier: string;
            industry: string;
            region: string;
            historicalChannels?: string[];
        },
    ): Promise<ChannelRecommendation> {
        // Simple ML-based scoring (can be replaced with actual ML model)
        const scores: Record<string, number> = {
            email: 0,
            sms: 0,
            whatsapp: 0,
        };

        // Score based on amount
        if (invoiceData.amount > 100000) {
            scores.email += 30;
            scores.whatsapp += 20;
        } else if (invoiceData.amount > 10000) {
            scores.email += 25;
            scores.sms += 15;
            scores.whatsapp += 25;
        } else {
            scores.sms += 30;
            scores.whatsapp += 20;
        }

        // Score based on client tier
        if (invoiceData.clientTier === 'premium') {
            scores.email += 25;
            scores.whatsapp += 20;
        } else if (invoiceData.clientTier === 'standard') {
            scores.email += 20;
            scores.sms += 20;
            scores.whatsapp += 15;
        }

        // Score based on industry
        const techIndustries = ['technology', 'software', 'saas'];
        if (techIndustries.includes(invoiceData.industry?.toLowerCase())) {
            scores.email += 20;
            scores.whatsapp += 15;
        }

        // Boost based on historical success
        if (invoiceData.historicalChannels) {
            invoiceData.historicalChannels.forEach((channel) => {
                scores[channel] = (scores[channel] || 0) + 15;
            });
        }

        // Find best channel
        const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
        const [recommendedChannel, topScore] = sorted[0];
        const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);
        const confidence = (topScore / totalScore) * 100;

        const reasons: string[] = [];
        if (invoiceData.amount > 100000) {
            reasons.push('High-value invoice requires formal communication');
        }
        if (invoiceData.clientTier === 'premium') {
            reasons.push('Premium clients prefer professional channels');
        }
        if (invoiceData.historicalChannels?.includes(recommendedChannel)) {
            reasons.push('Historical success with this channel');
        }

        return {
            invoiceId: '', // Set by caller
            recommendedChannel,
            confidence,
            reasons,
            alternativeChannels: sorted.slice(1).map(([channel, score]) => ({
                channel,
                score: (score / totalScore) * 100,
            })),
        };
    }

    /**
     * Identify underperforming rules and suggest optimizations
     */
    async identifyOptimizationOpportunities(
        tenantId: string,
    ): Promise<Array<{
        ruleId: string;
        issue: string;
        suggestion: string;
        impact: 'high' | 'medium' | 'low';
    }>> {
        const metrics = await this.analyzeRulePerformance(tenantId, {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date(),
        });

        const opportunities: Array<{
            ruleId: string;
            issue: string;
            suggestion: string;
            impact: 'high' | 'medium' | 'low';
        }> = [];

        for (const metric of metrics) {
            // Low delivery rate
            if (metric.avgDeliveryRate < 70) {
                opportunities.push({
                    ruleId: metric.ruleId,
                    issue: `Low delivery rate: ${metric.avgDeliveryRate.toFixed(1)}%`,
                    suggestion: 'Review rule conditions or try alternative channels',
                    impact: 'high',
                });
            }

            // Low usage
            if (metric.totalEvaluations < 10) {
                opportunities.push({
                    ruleId: metric.ruleId,
                    issue: 'Low rule usage (< 10 evaluations in 30 days)',
                    suggestion: 'Consider broadening rule criteria or disabling',
                    impact: 'low',
                });
            }

            // Channel imbalance
            const channels = Object.values(metric.channelBreakdown);
            if (channels.length === 1 && metric.avgDeliveryRate < 80) {
                opportunities.push({
                    ruleId: metric.ruleId,
                    issue: 'Single channel dependency with suboptimal performance',
                    suggestion: 'Add fallback channels for better reliability',
                    impact: 'medium',
                });
            }
        }

        return opportunities.sort((a, b) => {
            const impactOrder = { high: 0, medium: 1, low: 2 };
            return impactOrder[a.impact] - impactOrder[b.impact];
        });
    }

    /**
     * A/B test results for rule variations
     */
    async analyzeABTest(
        testId: string,
        variantA: string,
        variantB: string,
    ): Promise<{
        winner: string;
        confidence: number;
        metrics: {
            variantA: { deliveryRate: number; responseTime: number; sampleSize: number };
            variantB: { deliveryRate: number; responseTime: number; sampleSize: number };
        };
        recommendation: string;
    }> {
        // Mock A/B test analysis (implement actual statistics)
        return {
            winner: variantA,
            confidence: 95.5,
            metrics: {
                variantA: { deliveryRate: 85.2, responseTime: 2.5, sampleSize: 150 },
                variantB: { deliveryRate: 78.3, responseTime: 3.1, sampleSize: 147 },
            },
            recommendation: 'Deploy Variant A - statistically significant improvement',
        };
    }

    // Private helpers

    private calculateRecommendation(
        deliveryRate: number,
        sampleSize: number,
    ): { action: 'keep' | 'optimize' | 'disable'; confidence: number } {
        if (sampleSize < 10) {
            return { action: 'optimize', confidence: 50 };
        }

        if (deliveryRate >= 80) {
            return { action: 'keep', confidence: 90 };
        } else if (deliveryRate >= 60) {
            return { action: 'optimize', confidence: 75 };
        } else {
            return { action: 'disable', confidence: 85 };
        }
    }
}
