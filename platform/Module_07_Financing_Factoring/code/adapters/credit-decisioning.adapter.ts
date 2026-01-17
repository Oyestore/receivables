import { Injectable, Logger, Optional } from '@nestjs/common';
import {
    CreditDecisionRequest,
    CreditDecision,
    DecisionFactor,
} from '../interfaces/pre-qualification.interfaces';

/**
 * Credit Decisioning Adapter
 * 
 * Interfaces with Module 15 Credit Decisioning
 * Falls back to rule-based assessment if Module 15 unavailable
 */
@Injectable()
export class CreditDecisioningAdapter {
    private readonly logger = new Logger(CreditDecisioningAdapter.name);

    constructor(
        // Module 15 services - optional, may not be available
        // @Optional() private readonly creditDecisionService?: ICreditDecisionService,
        // For now, always use fallback until Module 15 services are available
    ) {
        this.logger.log('Credit Decisioning Adapter initialized');
        this.logAvailability();
    }

    /**
     * Assess credit application
     */
    async assessApplication(request: CreditDecisionRequest): Promise<CreditDecision> {
        // TODO: When Module 15 is available, use ML model
        // if (this.creditDecisionService) {
        //   return await this.useMlModel(request);
        // }

        // Fallback: Rule-based assessment
        return this.ruleBasedAssessment(request);
    }

    /**
     * Rule-based assessment fallback
     */
    private ruleBasedAssessment(request: CreditDecisionRequest): CreditDecision {
        this.logger.log('Using rule-based credit assessment (fallback)');

        const { businessProfile, requestedAmount } = request;

        // Calculate overall score
        const score = this.calculateBasicScore(businessProfile, requestedAmount);

        // Determine recommendation
        let recommendation: 'approve' | 'review' | 'decline';
        if (score >= 70) {
            recommendation = 'approve';
        } else if (score >= 50) {
            recommendation = 'review';
        } else {
            recommendation = 'decline';
        }

        // Calculate risk score (inverse of approval score)
        const riskScore = Math.max(0, 100 - score);

        // Estimate partner scores
        const partnerScores = this.estimatePartnerScores(score, businessProfile);

        // Identify top partners
        const recommendedPartnerIds = Object.entries(partnerScores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([id]) => id);

        // Identify decision factors
        const factors = this.identifyFactors(businessProfile, requestedAmount);

        return {
            recommendation,
            overallScore: score,
            riskScore,
            creditScore: businessProfile.creditScore,
            partnerScores,
            recommendedPartnerIds,
            factors,
            modelVersion: 'rule_based_v1',
            confidence: 75, // Rule-based has moderate confidence
        };
    }

    /**
     * Calculate basic credit score
     */
    private calculateBasicScore(
        businessProfile: any,
        requestedAmount: number,
    ): number {
        let score = 0;

        // Years in business (max 25 points)
        const years = businessProfile.yearsInBusiness || 0;
        if (years >= 5) score += 25;
        else if (years >= 3) score += 20;
        else if (years >= 2) score += 15;
        else if (years >= 1) score += 10;
        else score += 5;

        // Annual revenue (max 30 points)
        const revenue = businessProfile.annualRevenue || 0;
        if (revenue >= 50000000) score += 30; // ₹5Cr+
        else if (revenue >= 20000000) score += 25; // ₹2Cr+
        else if (revenue >= 10000000) score += 20; // ₹1Cr+
        else if (revenue >= 5000000) score += 15; // ₹50L+
        else if (revenue >= 1000000) score += 10; // ₹10L+
        else score += 5;

        // Credit score (max 30 points)
        const creditScore = businessProfile.creditScore || 650;
        if (creditScore >= 750) score += 30;
        else if (creditScore >= 700) score += 25;
        else if (creditScore >= 650) score += 20;
        else if (creditScore >= 600) score += 15;
        else score += 10;

        // Requested amount vs revenue ratio (max 15 points)
        if (revenue > 0) {
            const ratio = requestedAmount / revenue;
            if (ratio <= 0.1) score += 15; // 10% or less
            else if (ratio <= 0.2) score += 12;
            else if (ratio <= 0.3) score += 9;
            else if (ratio <= 0.5) score += 6;
            else score += 3;
        } else {
            score += 3; // Default low score if no revenue data
        }

        return Math.min(100, score);
    }

    /**
     * Estimate partner-specific approval probabilities
     */
    private estimatePartnerScores(
        overallScore: number,
        businessProfile: any,
    ): Record<string, number> {
        const scores: Record<string, number> = {};

        // LendingKart - conservative, prefers established businesses
        scores['lendingkart'] = this.calculatePartnerScore('lendingkart', overallScore, businessProfile);

        // Capital Float - more flexible, open to younger businesses
        scores['capital_float'] = this.calculatePartnerScore('capital_float', overallScore, businessProfile);

        return scores;
    }

    /**
     * Calculate score for specific partner
     */
    private calculatePartnerScore(
        partnerId: string,
        baseScore: number,
        businessProfile: any,
    ): number {
        let score = baseScore;

        if (partnerId === 'lendingkart') {
            // LendingKart prefers 2+ years
            if (businessProfile.yearsInBusiness >= 2) {
                score += 5;
            } else {
                score -= 10;
            }

            // Prefers higher revenue
            if (businessProfile.annualRevenue >= 10000000) {
                score += 5;
            }
        } else if (partnerId === 'capital_float') {
            // Capital Float more flexible on age
            if (businessProfile.yearsInBusiness >= 1) {
                score += 5;
            }

            // Offers credit lines for higher scores
            if (businessProfile.creditScore >= 720) {
                score += 10;
            }
        }

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Identify decision factors
     */
    private identifyFactors(
        businessProfile: any,
        requestedAmount: number,
    ): DecisionFactor[] {
        const factors: DecisionFactor[] = [];

        const years = businessProfile.yearsInBusiness || 0;
        const revenue = businessProfile.annualRevenue || 0;
        const creditScore = businessProfile.creditScore || 650;

        // Business age
        if (years >= 3) {
            factors.push({
                factor: 'Business Age',
                impact: 'positive',
                weight: 20,
                description: `Established business with ${years} years of operation`,
            });
        } else if (years < 2) {
            factors.push({
                factor: 'Business Age',
                impact: 'negative',
                weight: 15,
                description: `Young business (${years} years)`,
            });
        }

        // Revenue
        if (revenue >= 10000000) {
            factors.push({
                factor: 'Annual Revenue',
                impact: 'positive',
                weight: 25,
                description: `Strong revenue: ₹${(revenue / 10000000).toFixed(1)}Cr`,
            });
        } else if (revenue < 5000000) {
            factors.push({
                factor: 'Annual Revenue',
                impact: 'negative',
                weight: 20,
                description: `Limited revenue: ₹${(revenue / 100000).toFixed(1)}L`,
            });
        }

        // Credit score
        if (creditScore >= 720) {
            factors.push({
                factor: 'Credit Score',
                impact: 'positive',
                weight: 25,
                description: `Excellent credit score: ${creditScore}`,
            });
        } else if (creditScore < 650) {
            factors.push({
                factor: 'Credit Score',
                impact: 'negative',
                weight: 25,
                description: `Below average credit score: ${creditScore}`,
            });
        }

        // Loan to revenue ratio
        if (revenue > 0) {
            const ratio = (requestedAmount / revenue) * 100;
            if (ratio <= 20) {
                factors.push({
                    factor: 'Loan/Revenue Ratio',
                    impact: 'positive',
                    weight: 15,
                    description: `Conservative request: ${ratio.toFixed(1)}% of revenue`,
                });
            } else if (ratio > 50) {
                factors.push({
                    factor: 'Loan/Revenue Ratio',
                    impact: 'negative',
                    weight: 20,
                    description: `High request: ${ratio.toFixed(1)}% of revenue`,
                });
            }
        }

        return factors;
    }

    /**
     * Log service availability
     */
    private logAvailability(): void {
        this.logger.log('=== Credit Decisioning Status ===');
        this.logger.warn('⚠️ Module 15: NOT AVAILABLE - Using rule-based fallback');
        this.logger.log('================================');
    }

    /**
     * Check if ML model available
     */
    isMLAvailable(): boolean {
        return false; // TODO: Check Module 15 availability
    }
}
