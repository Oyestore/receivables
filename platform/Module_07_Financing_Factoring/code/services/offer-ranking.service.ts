import { Injectable, Logger } from '@nestjs/common';
import { StandardOffer } from './offer-normalization.service';

/**
 * Ranking Context - User preferences and business context
 */
export interface RankingContext {
    prioritize: 'lowest_rate' | 'fastest_disbursal' | 'flexible_terms' | 'highest_approval_chance';
    urgency: 'same_day' | '3_days' | '1_week' | 'flexible';
    businessProfile?: {
        creditScore?: number;
        industry?: string;
        yearsInBusiness?: number;
    };
}

/**
 * Scored Offer - Offer with detailed scoring
 */
export interface ScoredOffer extends StandardOffer {
    scores: {
        costScore: number;
        speedScore: number;
        reliabilityScore: number;
        flexibilityScore: number;
        approvalProbability: number;
    };
    overallScore: number;
}

/**
 * Ranked Offer - Offer with rank and recommendation
 */
export interface RankedOffer extends ScoredOffer {
    rank: number;
    badge?: string;
    recommendation: string;
    pros: string[];
    cons: string[];
}

/**
 * Offer Ranking Service
 * 
 * AI-powered intelligent ranking of financing offers
 * Considers multiple factors weighted by user preferences
 * 
 * Phase 1: Rule-based scoring
 * Phase 4: ML-based personalized ranking
 */
@Injectable()
export class OfferRankingService {
    private readonly logger = new Logger(OfferRankingService.name);

    /**
     * Rank normalized offers based on context
     */
    async rankOffers(
        offers: StandardOffer[],
        context: RankingContext,
    ): Promise<RankedOffer[]> {
        if (offers.length === 0) {
            return [];
        }

        try {
            // 1. Score each offer
            const scored = await Promise.all(
                offers.map(offer => this.scoreOffer(offer, context)),
            );

            // 2. Sort by overall score (descending)
            const sorted = scored.sort((a, b) => b.overallScore - a.overallScore);

            // 3. Add rankings and recommendations
            const ranked: RankedOffer[] = sorted.map((offer, index) => ({
                ...offer,
                rank: index + 1,
                badge: this.getBadge(offer, index, sorted),
                recommendation: this.generateRecommendation(offer, context),
                pros: this.extractPros(offer, context),
                cons: this.extractCons(offer, context),
            }));

            this.logger.log(`Ranked ${ranked.length} offers, best: ${ranked[0].partnerName}`);

            return ranked;

        } catch (error) {
            this.logger.error(`Failed to rank offers: ${error.message}`);
            throw error;
        }
    }

    // ========================================
    // Private Scoring Methods
    // ========================================

    /**
     * Score a single offer across multiple dimensions
     */
    private async scoreOffer(
        offer: StandardOffer,
        context: RankingContext,
    ): Promise<ScoredOffer> {
        // Calculate individual scores
        const costScore = this.calculateCostScore(offer, context);
        const speedScore = this.calculateSpeedScore(offer, context);
        const reliabilityScore = this.calculateReliabilityScore(offer);
        const flexibilityScore = offer.flexibility; // Already 0-100
        const approvalProbability = await this.predictApprovalProbability(offer, context);

        // Get weights based on user priority
        const weights = this.getWeights(context.prioritize);

        // Calculate overall weighted score
        const overallScore =
            costScore * weights.cost +
            speedScore * weights.speed +
            reliabilityScore * weights.reliability +
            flexibilityScore * weights.flexibility +
            approvalProbability * weights.approval;

        return {
            ...offer,
            scores: {
                costScore,
                speedScore,
                reliabilityScore,
                flexibilityScore,
                approvalProbability,
            },
            overallScore: parseFloat(overallScore.toFixed(2)),
        };
    }

    /**
     * Calculate cost score (0-100, higher is better)
     * Lower effective APR = Higher score
     */
    private calculateCostScore(offer: StandardOffer, context: RankingContext): number {
        // Normalize APR to 0-100 scale (inverse)
        // Assume APR range: 10% (best) to 25% (worst)
        const minAPR = 10;
        const maxAPR = 25;

        const normalizedAPR = (offer.effectiveAPR - minAPR) / (maxAPR - minAPR);
        const score = (1 - Math.max(0, Math.min(1, normalizedAPR))) * 100;

        return parseFloat(score.toFixed(2));
    }

    /**
     * Calculate speed score (0-100, higher is better)
     * Faster disbursal = Higher score
     */
    private calculateSpeedScore(offer: StandardOffer, context: RankingContext): number {
        // Normalize days to 0-100 scale (inverse)
        // Assume range: 0.5 days (best) to 7 days (worst)
        const minDays = 0.5;
        const maxDays = 7;

        const normalizedDays = (offer.disbursalSpeed - minDays) / (maxDays - minDays);
        const score = (1 - Math.max(0, Math.min(1, normalizedDays))) * 100;

        // Boost if urgency matches
        let boost = 0;
        if (context.urgency === 'same_day' && offer.disbursalSpeed <= 1) {
            boost = 10;
        } else if (context.urgency === '3_days' && offer.disbursalSpeed <= 3) {
            boost = 5;
        }

        return parseFloat(Math.min(100, score + boost).toFixed(2));
    }

    /**
     * Calculate reliability score (0-100)
     * Based on partner reputation
     */
    private calculateReliabilityScore(offer: StandardOffer): number {
        return offer.reputation; // Already 0-100
    }

    /**
     * Predict approval probability (0-100)
     * Phase 1: Simplified heuristic
     * Phase 4: ML model
     */
    private async predictApprovalProbability(
        offer: StandardOffer,
        context: RankingContext,
    ): Promise<number> {
        let probability = 70; // Base probability

        // Adjust based on credit score
        if (context.businessProfile?.creditScore) {
            const score = context.businessProfile.creditScore;
            if (score >= 750) probability = 90;
            else if (score >= 700) probability = 80;
            else if (score >= 650) probability = 70;
            else probability = 50;
        }

        // Adjust based on years in business
        if (context.businessProfile?.yearsInBusiness) {
            const years = context.businessProfile.yearsInBusiness;
            if (years >= 5) probability += 10;
            else if (years >= 3) probability += 5;
            else if (years < 1) probability -= 20;
        }

        // Partner-specific adjustments (Phase 1: hardcoded)
        if (offer.partnerId === 'capital_float') {
            probability += 5; // Capital Float has higher approval rate
        }

        return Math.max(0, Math.min(100, probability));
    }

    /**
     * Get weights based on user priority
     */
    private getWeights(priority: string): {
        cost: number;
        speed: number;
        reliability: number;
        flexibility: number;
        approval: number;
    } {
        const weights = {
            lowest_rate: {
                cost: 0.45,
                speed: 0.15,
                reliability: 0.20,
                flexibility: 0.10,
                approval: 0.10,
            },
            fastest_disbursal: {
                cost: 0.20,
                speed: 0.45,
                reliability: 0.15,
                flexibility: 0.10,
                approval: 0.10,
            },
            flexible_terms: {
                cost: 0.25,
                speed: 0.10,
                reliability: 0.15,
                flexibility: 0.40,
                approval: 0.10,
            },
            highest_approval_chance: {
                cost: 0.20,
                speed: 0.10,
                reliability: 0.20,
                flexibility: 0.10,
                approval: 0.40,
            },
        };

        return weights[priority] || weights.lowest_rate;
    }

    /**
     * Get badge for offer
     */
    private getBadge(offer: ScoredOffer, rank: number, allOffers: ScoredOffer[]): string | undefined {
        if (rank === 0) return 'Best Overall';

        const lowestAPR = Math.min(...allOffers.map(o => o.effectiveAPR));
        const fastestSpeed = Math.min(...allOffers.map(o => o.disbursalSpeed));
        const highestReliability = Math.max(...allOffers.map(o => o.reputation));
        const highestApproval = Math.max(...allOffers.map(o => o.scores.approvalProbability));

        if (offer.effectiveAPR === lowestAPR) return 'Lowest Rate';
        if (offer.disbursalSpeed === fastestSpeed) return 'Fastest';
        if (offer.reputation === highestReliability) return 'Most Reliable';
        if (offer.scores.approvalProbability === highestApproval) return 'Likely Approval';

        return undefined;
    }

    /**
     * Generate natural language recommendation
     */
    private generateRecommendation(offer: ScoredOffer, context: RankingContext): string {
        const { scores } = offer;

        // Best overall
        if (offer.overallScore >= 80) {
            return `Excellent choice! ${offer.partnerName} offers competitive rates (${offer.effectiveAPR}% APR) with ${offer.disbursalSpeed < 1 ? 'same-day' : `${offer.disbursalSpeed}-day`} disbursal.`;
        }

        // Good for low rate seekers
        if (context.prioritize === 'lowest_rate' && scores.costScore >= 75) {
            return `Best rate available at ${offer.effectiveAPR}% APR. Total cost: ₹${offer.totalCost.toLocaleString()}.`;
        }

        // Good for urgent needs
        if (context.prioritize === 'fastest_disbursal' && scores.speedScore >= 75) {
            return `Lightning fast! Get funds in ${offer.disbursalSpeed < 1 ? 'hours' : `${offer.disbursalSpeed} days`}. Perfect for urgent needs.`;
        }

        // Good for flexibility
        if (context.prioritize === 'flexible_terms' && scores.flexibilityScore >= 75) {
            return `Maximum flexibility with prepayment options and flexible repayment terms.`;
        }

        // Good approval chances
        if (context.prioritize === 'highest_approval_chance' && scores.approvalProbability >= 75) {
            return `High approval probability (${scores.approvalProbability}%) based on your profile. ${offer.partnerName} welcomes businesses like yours.`;
        }

        // Generic
        return `Solid option from ${offer.partnerName} at ${offer.effectiveAPR}% APR with ${offer.disbursalSpeed}-day disbursal.`;
    }

    /**
     * Extract pros for offer
     */
    private extractPros(offer: ScoredOffer, context: RankingContext): string[] {
        const pros: string[] = [];
        const { scores } = offer;

        if (scores.costScore >= 75) {
            pros.push(`Competitive rate: ${offer.effectiveAPR}% APR`);
        }

        if (scores.speedScore >= 75) {
            pros.push(`Fast disbursal: ${offer.disbursalSpeed < 1 ? 'Same day' : `${offer.disbursalSpeed} days`}`);
        }

        if (scores.reliabilityScore >= 80) {
            pros.push(`Highly reliable partner (${offer.reputation}/100 rating)`);
        }

        if (scores.flexibilityScore >= 75) {
            pros.push('Flexible repayment terms');
        }

        if (scores.approvalProbability >= 75) {
            pros.push(`High approval chances (${scores.approvalProbability}%)`);
        }

        if (offer.monthlyEMI) {
            pros.push(`Affordable EMI: ₹${offer.monthlyEMI.toLocaleString()}/month`);
        }

        return pros.length > 0 ? pros : ['Standard financing terms'];
    }

    /**
     * Extract cons for offer
     */
    private extractCons(offer: ScoredOffer, context: RankingContext): string[] {
        const cons: string[] = [];
        const { scores } = offer;

        if (scores.costScore < 50) {
            cons.push(`Higher interest rate: ${offer.effectiveAPR}% APR`);
        }

        if (scores.speedScore < 50) {
            cons.push(`Slower disbursal: ${offer.disbursalSpeed} days`);
        }

        if (scores.flexibilityScore < 50) {
            cons.push('Limited flexibility in repayment');
        }

        if (scores.approvalProbability < 60) {
            cons.push('Lower approval probability for your profile');
        }

        if (offer.processingFee > offer.principalAmount * 0.03) {
            cons.push(`Higher processing fee: ₹${offer.processingFee.toLocaleString()}`);
        }

        return cons.length > 0 ? cons : ['Standard terms apply'];
    }
}
