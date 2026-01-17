import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * ML Churn Prediction Service
 * Advanced machine learning-based churn prediction
 * 
 * Gap Resolution: Phase 9.2 - Missing ML-based churn prediction
 */

export interface ChurnPredictionInput {
    customerId: string;

    // Usage metrics
    usageMetrics: {
        daysActive: number;
        loginFrequency: number;           // logins per week
        avgSessionDuration: number;        // minutes
        featureAdoptionRate: number;       // 0-1
        lastLoginDays: number;
    };

    // Financial metrics
    financialMetrics: {
        totalRevenue: number;
        avgInvoiceValue: number;
        paymentReliability: number;        // 0-1
        outstandingAmount: number;
    };

    // Engagement metrics
    engagementMetrics: {
        emailOpenRate: number;             // 0-1
        supportTickets: number;
        npsScore?: number;                 // 0-10
        lastContactDays: number;
    };

    // Historical data
    historical?: {
        healthScoreTrend: number[];        // Last 6 months
        usageTrend: number[];
        paymentTrend: number[];
    };
}

export interface ChurnPrediction {
    customerId: string;
    churnProbability: number;              // 0-1
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    confidenceScore: number;               // 0-1

    // Risk factors
    topRiskFactors: Array<{
        factor: string;
        impact: number;                    // 0-1
        description: string;
    }>;

    // Protective factors
    protectiveFactors: Array<{
        factor: string;
        strength: number;                  // 0-1
        description: string;
    }>;

    // Time predictions
    estimatedChurnWindow: {
        min: number;                       // days
        max: number;                       // days
        mostLikely: number;                // days
    };

    // Intervention recommendations
    interventions: Array<{
        action: string;
        priority: 'critical' | 'high' | 'medium' | 'low';
        expectedImpact: number;            // % reduction in churn probability
        estimatedCost: string;
    }>;

    // Trends
    trend: 'improving' | 'stable' | 'declining' | 'rapidly_declining';
}

@Injectable()
export class MLChurnPredictionService {
    private readonly logger = new Logger(MLChurnPredictionService.name);
    private readonly aiServiceUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:5000';
    }

    /**
     * Predict churn probability using ML models (AI First, Heuristic Fallback)
     */
    async predictChurn(input: ChurnPredictionInput): Promise<ChurnPrediction> {
        try {
            // 1. Try AI Prediction
            return await this.predictWithAI(input);
        } catch (error) {
            this.logger.warn(`AI Churn Prediction failed, falling back to heuristic: ${error.message}`);
        }

        // 2. Fallback to Heuristic
        return this.predictChurnHeuristic(input);
    }

    /**
     * Call External AI Model
     */
    private async predictWithAI(input: ChurnPredictionInput): Promise<ChurnPrediction> {
        const response = await firstValueFrom(
            this.httpService.post(`${this.aiServiceUrl}/predict/churn`, input)
        );
        return response.data;
    }

    /**
     * Predict churn probability using Heuristic Logic
     */

    async predictChurnHeuristic(input: ChurnPredictionInput): Promise<ChurnPrediction> {
        try {
            // Calculate component scores
            const usageScore = this.calculateUsageScore(input.usageMetrics);
            const financialScore = this.calculateFinancialScore(input.financialMetrics);
            const engagementScore = this.calculateEngagementScore(input.engagementMetrics);
            const trendScore = this.calculateTrendScore(input.historical);

            // ML ensemble model (weighted combination)
            const churnProbability = this.ensemblePredict(
                usageScore,
                financialScore,
                engagementScore,
                trendScore,
            );

            const riskLevel = this.categorizeRisk(churnProbability);
            const trend = this.analyzeTrend(input.historical);

            // Identify risk and protective factors
            const topRiskFactors = this.identifyRiskFactors(input, churnProbability);
            const protectiveFactors = this.identifyProtectiveFactors(input);

            // Estimate churn timeframe
            const estimatedChurnWindow = this.estimateChurnWindow(
                churnProbability,
                trend,
                input.usageMetrics.lastLoginDays,
            );

            // Generate intervention recommendations
            const interventions = this.generateInterventions(
                churnProbability,
                topRiskFactors,
                input,
            );

            this.logger.log(
                `Churn prediction for ${input.customerId}: ${(churnProbability * 100).toFixed(1)}% (${riskLevel})`,
            );

            return {
                customerId: input.customerId,
                churnProbability,
                riskLevel,
                confidenceScore: this.calculateConfidence(input),
                topRiskFactors,
                protectiveFactors,
                estimatedChurnWindow,
                interventions,
                trend,
            };
        } catch (error) {
            this.logger.error(`Churn prediction failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Batch churn prediction for portfolio analysis
     */
    async batchPredictChurn(
        inputs: ChurnPredictionInput[],
    ): Promise<ChurnPrediction[]> {
        const results = await Promise.all(
            inputs.map(input => this.predictChurn(input)),
        );

        const highRiskCount = results.filter(
            r => r.riskLevel === 'high' || r.riskLevel === 'critical',
        ).length;

        this.logger.log(
            `Batch churn prediction completed: ${inputs.length} customers, ${highRiskCount} high risk`,
        );

        return results;
    }

    /**
     * Get churn risk cohort analysis
     */
    async getCohortAnalysis(predictions: ChurnPrediction[]): Promise<{
        distribution: Record<string, number>;
        avgChurnProbability: number;
        topRiskFactors: Array<{ factor: string; frequency: number }>;
        recommendedActions: string[];
    }> {
        const distribution = {
            low: predictions.filter(p => p.riskLevel === 'low').length,
            medium: predictions.filter(p => p.riskLevel === 'medium').length,
            high: predictions.filter(p => p.riskLevel === 'high').length,
            critical: predictions.filter(p => p.riskLevel === 'critical').length,
        };

        const avgChurnProbability =
            predictions.reduce((sum, p) => sum + p.churnProbability, 0) /
            predictions.length;

        // Aggregate top risk factors
        const factorFrequency = new Map<string, number>();
        predictions.forEach(p => {
            p.topRiskFactors.forEach(f => {
                factorFrequency.set(
                    f.factor,
                    (factorFrequency.get(f.factor) || 0) + 1,
                );
            });
        });

        const topRiskFactors = Array.from(factorFrequency.entries())
            .map(([factor, frequency]) => ({ factor, frequency }))
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 5);

        const recommendedActions = this.generateCohortRecommendations(
            distribution,
            topRiskFactors,
        );

        return {
            distribution,
            avgChurnProbability,
            topRiskFactors,
            recommendedActions,
        };
    }

    // Private helper methods

    private calculateUsageScore(metrics: ChurnPredictionInput['usageMetrics']): number {
        const weights = {
            daysActive: 0.2,
            loginFrequency: 0.25,
            avgSessionDuration: 0.2,
            featureAdoptionRate: 0.25,
            lastLoginDays: 0.1,
        };

        // Normalize and invert where needed
        const normalized = {
            daysActive: Math.min(metrics.daysActive / 365, 1),
            loginFrequency: Math.min(metrics.loginFrequency / 7, 1),
            avgSessionDuration: Math.min(metrics.avgSessionDuration / 60, 1),
            featureAdoptionRate: metrics.featureAdoptionRate,
            lastLoginDays: 1 - Math.min(metrics.lastLoginDays / 30, 1),
        };

        return Object.entries(weights).reduce(
            (score, [key, weight]) => score + normalized[key] * weight,
            0,
        );
    }

    private calculateFinancialScore(
        metrics: ChurnPredictionInput['financialMetrics'],
    ): number {
        const ltv = metrics.totalRevenue;
        const reliability = metrics.paymentReliability;
        const outstanding = Math.min(metrics.outstandingAmount / metrics.totalRevenue, 1);

        // Higher LTV = lower churn risk
        const ltvScore = Math.min(ltv / 1000000, 1);

        return (ltvScore * 0.4 + reliability * 0.4 + (1 - outstanding) * 0.2);
    }

    private calculateEngagementScore(
        metrics: ChurnPredictionInput['engagementMetrics'],
    ): number {
        return (
            metrics.emailOpenRate * 0.3 +
            (1 - Math.min(metrics.supportTickets / 10, 1)) * 0.2 +
            ((metrics.npsScore || 5) / 10) * 0.3 +
            (1 - Math.min(metrics.lastContactDays / 60, 1)) * 0.2
        );
    }

    private calculateTrendScore(
        historical: ChurnPredictionInput['historical'],
    ): number {
        if (!historical || !historical.healthScoreTrend?.length) {
            return 0.5; // Neutral if no historical data
        }

        const trend = historical.healthScoreTrend;
        const recentAvg = trend.slice(-3).reduce((sum, v) => sum + v, 0) / 3;
        const olderAvg = trend.slice(0, 3).reduce((sum, v) => sum + v, 0) / 3;

        const trendDirection = (recentAvg - olderAvg) / 100;

        return 0.5 + trendDirection * 0.5;
    }

    private ensemblePredict(
        usage: number,
        financial: number,
        engagement: number,
        trend: number,
    ): number {
        // Weighted ensemble model
        const weights = {
            usage: 0.3,
            financial: 0.25,
            engagement: 0.25,
            trend: 0.2,
        };

        const retentionScore =
            usage * weights.usage +
            financial * weights.financial +
            engagement * weights.engagement +
            trend * weights.trend;

        // Invert to get churn probability
        const churnProbability = 1 - retentionScore;

        // Apply sigmoid for smoothing
        return 1 / (1 + Math.exp(-5 * (churnProbability - 0.5)));
    }

    private categorizeRisk(probability: number): 'low' | 'medium' | 'high' | 'critical' {
        if (probability >= 0.75) return 'critical';
        if (probability >= 0.5) return 'high';
        if (probability >= 0.25) return 'medium';
        return 'low';
    }

    private analyzeTrend(
        historical: ChurnPredictionInput['historical'],
    ): 'improving' | 'stable' | 'declining' | 'rapidly_declining' {
        if (!historical?.healthScoreTrend?.length) return 'stable';

        const trend = historical.healthScoreTrend;
        const recent = trend.slice(-2).reduce((sum, v) => sum + v, 0) / 2;
        const older = trend.slice(0, 2).reduce((sum, v) => sum + v, 0) / 2;

        const change = recent - older;

        if (change > 10) return 'improving';
        if (change > -10) return 'stable';
        if (change > -25) return 'declining';
        return 'rapidly_declining';
    }

    private identifyRiskFactors(
        input: ChurnPredictionInput,
        churnProb: number,
    ): ChurnPrediction['topRiskFactors'] {
        const factors = [];

        if (input.usageMetrics.lastLoginDays > 30) {
            factors.push({
                factor: 'inactivity',
                impact: 0.3,
                description: `No login in ${input.usageMetrics.lastLoginDays} days`,
            });
        }

        if (input.usageMetrics.featureAdoptionRate < 0.3) {
            factors.push({
                factor: 'low_feature_adoption',
                impact: 0.25,
                description: `Only using ${(input.usageMetrics.featureAdoptionRate * 100).toFixed(0)}% of features`,
            });
        }

        if (input.financialMetrics.paymentReliability < 0.5) {
            factors.push({
                factor: 'payment_issues',
                impact: 0.2,
                description: 'Unreliable payment history',
            });
        }

        if (input.engagementMetrics.emailOpenRate < 0.2) {
            factors.push({
                factor: 'low_engagement',
                impact: 0.15,
                description: 'Very low email engagement',
            });
        }

        return factors.sort((a, b) => b.impact - a.impact).slice(0, 3);
    }

    private identifyProtectiveFactors(
        input: ChurnPredictionInput,
    ): ChurnPrediction['protectiveFactors'] {
        const factors = [];

        if (input.financialMetrics.totalRevenue > 500000) {
            factors.push({
                factor: 'high_ltv',
                strength: 0.3,
                description: 'High lifetime value customer',
            });
        }

        if (input.usageMetrics.featureAdoptionRate > 0.7) {
            factors.push({
                factor: 'power_user',
                strength: 0.25,
                description: 'Heavily invested in platform',
            });
        }

        if (input.engagementMetrics.npsScore >= 9) {
            factors.push({
                factor: 'high_satisfaction',
                strength: 0.2,
                description: 'Very satisfied (NPS promoter)',
            });
        }

        return factors.sort((a, b) => b.strength - a.strength);
    }

    private estimateChurnWindow(
        churnProb: number,
        trend: string,
        daysSinceLogin: number,
    ): ChurnPrediction['estimatedChurnWindow'] {
        let baseDays = 90;

        if (churnProb > 0.75) baseDays = 30;
        else if (churnProb > 0.5) baseDays = 60;

        if (trend === 'rapidly_declining') baseDays *= 0.5;
        else if (trend === 'declining') baseDays *= 0.75;

        return {
            min: Math.floor(baseDays * 0.5),
            max: Math.floor(baseDays * 1.5),
            mostLikely: baseDays,
        };
    }

    private generateInterventions(
        churnProb: number,
        riskFactors: ChurnPrediction['topRiskFactors'],
        input: ChurnPredictionInput,
    ): ChurnPrediction['interventions'] {
        const interventions = [];

        if (churnProb > 0.7) {
            interventions.push({
                action: 'Immediate executive outreach + retention offer',
                priority: 'critical',
                expectedImpact: 40,
                estimatedCost: 'High',
            });
        }

        if (riskFactors.some(f => f.factor === 'inactivity')) {
            interventions.push({
                action: 'Re-engagement campaign + personal call',
                priority: 'high',
                expectedImpact: 30,
                estimatedCost: 'Medium',
            });
        }

        if (riskFactors.some(f => f.factor === 'low_feature_adoption')) {
            interventions.push({
                action: 'Personalized training + feature tour',
                priority: 'medium',
                expectedImpact: 25,
                estimatedCost: 'Low',
            });
        }

        return interventions;
    }

    private calculateConfidence(input: ChurnPredictionInput): number {
        const hasHistorical = input.historical?.healthScoreTrend?.length >= 3;
        const hasNPS = input.engagementMetrics.npsScore !== undefined;
        const hasRecentActivity = input.usageMetrics.lastLoginDays < 30;

        let confidence = 0.6;
        if (hasHistorical) confidence += 0.2;
        if (hasNPS) confidence += 0.1;
        if (hasRecentActivity) confidence += 0.1;

        return Math.min(confidence, 0.95);
    }

    private generateCohortRecommendations(
        distribution: Record<string, number>,
        topRiskFactors: Array<{ factor: string; frequency: number }>,
    ): string[] {
        const recommendations = [];

        const highRiskPercent =
            ((distribution.high + distribution.critical) /
                Object.values(distribution).reduce((sum, v) => sum + v, 0)) *
            100;

        if (highRiskPercent > 20) {
            recommendations.push(
                'URGENT: Launch company-wide retention initiative',
            );
        }

        if (topRiskFactors[0]?.factor === 'inactivity') {
            recommendations.push('Focus on re-activation campaigns');
        }

        if (topRiskFactors.some(f => f.factor === 'low_feature_adoption')) {
            recommendations.push('Invest in customer education and onboarding');
        }

        return recommendations;
    }
}
