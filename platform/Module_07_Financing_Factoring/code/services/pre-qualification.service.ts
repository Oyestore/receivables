import { Injectable, Logger } from '@nestjs/common';
import { CreditDecisioningAdapter } from '../adapters/credit-decisioning.adapter';
import { PartnerRegistryService } from './partner-registry.service';
import { FinancingApplication } from '../entities/financing-application.entity';
import {
    PreQualificationResult,
    PreQualificationOptions,
    PartnerRecommendation,
    RiskAssessment,
    CreditDecisionRequest,
} from '../interfaces/pre-qualification.interfaces';
import { IFinancingPartnerPlugin } from '../interfaces/financing-partner-plugin.interface';

/**
 * Pre-Qualification Service
 * 
 * Intelligent partner recommendation and approval prediction
 * Powered by Module 15 Credit Decisioning (with fallback)
 */
@Injectable()
export class PreQualificationService {
    private readonly logger = new Logger(PreQualificationService.name);

    // Cache for performance
    private readonly cache = new Map<string, { result: PreQualificationResult; timestamp: number }>();
    private readonly CACHE_TTL = 3600000; // 1 hour

    constructor(
        private readonly creditDecisioningAdapter: CreditDecisioningAdapter,
        private readonly partnerRegistry: PartnerRegistryService,
    ) { }

    /**
     * Pre-qualify financing application
     */
    async preQualify(
        application: FinancingApplication,
        options: PreQualificationOptions = {},
    ): Promise<PreQualificationResult> {
        this.logger.log(`Pre-qualifying application ${application.id}`);

        // Check cache
        const cacheKey = this.getCacheKey(application);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            this.logger.log('Returning cached pre-qualification result');
            return cached;
        }

        // 1. Get credit decision
        const creditDecision = await this.creditDecisioningAdapter.assessApplication({
            businessProfile: application.businessDetails,
            requestedAmount: application.requestedAmount,
            purpose: application.financingType,
            urgency: application.urgency,
        });

        // 2. Get available partners
        const allPartners = this.partnerRegistry.getPartnersByProduct(
            application.financingType as any,
        );

        // 3. Filter and rank partners
        const minProbability = options.minApprovalProbability || 50;
        const recommendedPartners = await this.recommendPartners(
            allPartners,
            creditDecision.partnerScores,
            application,
            minProbability,
            options.maxPartners || 5,
        );

        // 4. Calculate risk assessment
        const riskAssessment = this.calculateRiskAssessment(
            application.businessDetails,
            creditDecision,
        );

        // 5. Generate suggestions
        const suggestions = this.generateSuggestions(
            creditDecision,
            riskAssessment,
            application,
        );

        // Build result
        const result: PreQualificationResult = {
            decision: creditDecision.recommendation,
            approvalProbability: creditDecision.overallScore,
            riskScore: creditDecision.riskScore,
            creditScore: creditDecision.creditScore,
            recommendedPartners,
            partnerScores: creditDecision.partnerScores,
            factors: creditDecision.factors,
            suggestions,
            assessedAt: new Date(),
            source: this.creditDecisioningAdapter.isMLAvailable() ? 'ml_model' : 'rule_based',
            confidence: creditDecision.confidence || 75,
        };

        // Cache result
        this.setCache(cacheKey, result);

        return result;
    }

    /**
     * Recommend partners for application
     */
    private async recommendPartners(
        allPartners: IFinancingPartnerPlugin[],
        partnerScores: Record<string, number>,
        application: FinancingApplication,
        minProbability: number,
        maxPartners: number,
    ): Promise<PartnerRecommendation[]> {
        const recommendations: PartnerRecommendation[] = [];

        for (const partner of allPartners) {
            const approvalProbability = partnerScores[partner.partnerId] || 50;

            // Skip if below threshold
            if (approvalProbability < minProbability) {
                continue;
            }

            // Check eligibility
            let matchScore = approvalProbability;
            let estimatedRate = 16; // Default
            let estimatedAmount = application.requestedAmount;
            let estimatedApprovalTime = '2-3 days';

            try {
                const eligibility = await partner.checkEligibility(
                    application.businessDetails,
                );

                if (!eligibility.eligible) {
                    continue; // Skip ineligible partners
                }

                estimatedRate = eligibility.estimatedRate || 16;
                estimatedAmount = Math.min(
                    application.requestedAmount,
                    eligibility.maximumAmount || application.requestedAmount,
                );

                // Adjust match score based on amount match
                const amountMatchPercent =
                    (estimatedAmount / application.requestedAmount) * 100;
                if (amountMatchPercent < 100) {
                    matchScore -= (100 - amountMatchPercent) / 2;
                }
            } catch (error: any) {
                this.logger.warn(`Eligibility check failed for ${partner.partnerId}: ${error?.message || error}`);
                // Continue with defaults
            }

            // Generate reasoning
            const reasons = this.generatePartnerReasons(
                partner,
                approvalProbability,
                matchScore,
            );

            const strengths = this.identifyPartnerStrengths(
                partner,
                estimatedRate,
                estimatedApprovalTime,
            );

            const considerations = this.identifyConsiderations(
                partner,
                estimatedAmount,
                application.requestedAmount,
            );

            recommendations.push({
                partnerId: partner.partnerId,
                partnerName: partner.partnerName,
                approvalProbability,
                matchScore,
                estimatedRate,
                estimatedAmount,
                estimatedApprovalTime,
                reasons,
                strengths,
                considerations,
                rank: 0, // Will be set after sorting
            });
        }

        // Sort by match score and set ranks
        recommendations.sort((a, b) => b.matchScore - a.matchScore);
        recommendations.forEach((rec, index) => {
            rec.rank = index + 1;
        });

        return recommendations.slice(0, maxPartners);
    }

    /**
     * Calculate risk assessment
     */
    private calculateRiskAssessment(
        businessProfile: any,
        creditDecision: any,
    ): RiskAssessment {
        const years = businessProfile.yearsInBusiness || 0;
        const revenue = businessProfile.annualRevenue || 0;
        const creditScore = businessProfile.creditScore || 650;

        // Calculate individual factor scores
        const businessAgeScore = years >= 3 ? 80 : years >= 2 ? 60 : years >= 1 ? 40 : 20;
        const revenueScore = revenue >= 20000000 ? 90 : revenue >= 10000000 ? 75 : revenue >= 5000000 ? 60 : 40;
        const creditScoreValue = creditScore >= 750 ? 90 : creditScore >= 700 ? 75 : creditScore >= 650 ? 60 : 40;

        // Overall risk level
        const avgScore = (businessAgeScore + revenueScore + creditScoreValue) / 3;
        let level: 'low' | 'medium' | 'high' | 'very_high';

        if (avgScore >= 75) level = 'low';
        else if (avgScore >= 60) level = 'medium';
        else if (avgScore >= 40) level = 'high';
        else level = 'very_high';

        const recommendations: string[] = [];

        if (years < 2) {
            recommendations.push('Build business history - 2+ years significantly improves approval chances');
        }

        if (creditScore < 700) {
            recommendations.push('Improve credit score by making timely payments');
        }

        if (revenue < 10000000) {
            recommendations.push('Grow revenue to access better rates and higher limits');
        }

        return {
            level,
            score: creditDecision.riskScore,
            factors: {
                businessAge: {
                    score: businessAgeScore,
                    risk: years >= 3 ? 'low' : years >= 2 ? 'medium' : 'high',
                },
                revenue: {
                    score: revenueScore,
                    risk: revenue >= 10000000 ? 'low' : revenue >= 5000000 ? 'medium' : 'high',
                },
                debtToIncome: {
                    score: 70, // Placeholder
                    risk: 'medium',
                },
                creditHistory: {
                    score: creditScoreValue,
                    risk: creditScore >= 700 ? 'low' : creditScore >= 650 ? 'medium' : 'high',
                },
                industry: {
                    score: 65, // Placeholder
                    risk: 'medium',
                },
            },
            recommendations,
        };
    }

    /**
     * Generate actionable suggestions
     */
    private generateSuggestions(
        creditDecision: any,
        riskAssessment: RiskAssessment,
        application: FinancingApplication,
    ): string[] {
        const suggestions: string[] = [];

        if (creditDecision.recommendation === 'approve') {
            suggestions.push('✅ Your application has high approval probability');
            suggestions.push('Submit to top 3-5 partners for best competitive rates');
        } else if (creditDecision.recommendation === 'review') {
            suggestions.push('⚠️ Your application may require manual review');
            suggestions.push('Provide complete documentation to improve chances');
            suggestions.push('Consider lower loan amounts or longer tenure');
        } else {
            suggestions.push('❌ Current profile has low approval probability');
            suggestions.push('Work on improving credit profile before applying');
        }

        // Add risk-based suggestions
        suggestions.push(...riskAssessment.recommendations);

        return suggestions.slice(0, 5); // Max 5
    }

    /**
     * Generate partner-specific reasons
     */
    private generatePartnerReasons(
        partner: IFinancingPartnerPlugin,
        approvalProb: number,
        matchScore: number,
    ): string[] {
        const reasons: string[] = [];

        if (approvalProb >= 80) {
            reasons.push(`${approvalProb}% approval probability - Excellent match`);
        } else if (approvalProb >= 65) {
            reasons.push(`${approvalProb}% approval probability - Good match`);
        } else {
            reasons.push(`${approvalProb}% approval probability - Moderate match`);
        }

        reasons.push(`${partner.partnerType.toUpperCase()} - ${partner.supportedProducts.length} products`);

        return reasons;
    }

    /**
     * Identify partner strengths
     */
    private identifyPartnerStrengths(
        partner: IFinancingPartnerPlugin,
        rate: number,
        approvalTime: string,
    ): string[] {
        const strengths: string[] = [];

        if (rate < 15) {
            strengths.push('Competitive interest rates');
        }

        if (approvalTime.includes('24') || approvalTime.includes('same')) {
            strengths.push('Fast approval and disbursal');
        }

        if (partner.supportedProducts.length > 2) {
            strengths.push('Flexible product options');
        }

        return strengths;
    }

    /**
     * Identify considerations
     */
    private identifyConsiderations(
        partner: IFinancingPartnerPlugin,
        estimatedAmount: number,
        requestedAmount: number,
    ): string[] {
        const considerations: string[] = [];

        if (estimatedAmount < requestedAmount) {
            const percentage = ((estimatedAmount / requestedAmount) * 100).toFixed(0);
            considerations.push(`May approve ${percentage}% of requested amount`);
        }

        return considerations;
    }

    /**
     * Cache management
     */
    private getCacheKey(application: FinancingApplication): string {
        return `${application.tenantId}_${application.userId}_${application.requestedAmount}_${application.financingType}`;
    }

    private getFromCache(key: string): PreQualificationResult | null {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        if (age > this.CACHE_TTL) {
            this.cache.delete(key);
            return null;
        }

        return cached.result;
    }

    private setCache(key: string, result: PreQualificationResult): void {
        this.cache.set(key, {
            result,
            timestamp: Date.now(),
        });

        // Clean old cache entries
        if (this.cache.size > 100) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey as string);
        }
    }
}
