import { Injectable, Logger } from '@nestjs/common';
import { PartnerOffer } from '../interfaces/financing-partner-plugin.interface';

/**
 * Standard Offer Format (normalized for comparison)
 */
export interface StandardOffer {
    // Partner identification
    partnerId: string;
    partnerName: string;
    offerId: string;

    // Core terms
    principalAmount: number;
    tenure: number; // months

    // True cost breakdown
    nominalAPR: number;
    effectiveAPR: number; // Including all fees
    processingFee: number;
    totalInterest: number;
    totalCost: number; // Principal + Interest + Fees
    monthlyEMI?: number;

    // Qualitative factors (scored 0-100)
    disbursalSpeed: number; // Lower is better (in days)
    flexibility: number; // Higher is better
    reputation: number; // Partner reliability score

    // For UI display
    savings?: number; // Compared to baseline
    badge?: string; // "Best Overall", "Lowest Rate", etc.

    // References
    rawOffer: PartnerOffer;
    expiresAt: Date;

    // AI scoring (Phase 4)
    overallScore?: number;
}

/**
 * Offer Normalization Service
 * 
 * Converts partner-specific offers to standardized format
 * Enables apples-to-apples comparison across partners
 * 
 * Key Functions:
 * - Calculate true effective APR (including hidden fees)
 * - Normalize disbursal time to standard format
 * - Score qualitative factors (flexibility, reputation)
 * - Enrich with additional metadata
 */
@Injectable()
export class OfferNormalizationService {
    private readonly logger = new Logger(OfferNormalizationService.name);

    /**
     * Normalize a single partner offer to standard format
     */
    async normalizeOffer(
        partnerOffer: PartnerOffer,
        partnerId: string,
        partnerName: string,
    ): Promise<StandardOffer> {
        try {
            // Calculate true effective APR
            const effectiveAPR = this.calculateEffectiveAPR(partnerOffer);

            // Calculate total interest
            const totalInterest = this.calculateTotalInterest(partnerOffer);

            // Calculate total cost
            const totalCost = this.calculateTotalCost(partnerOffer);

            // Quantify disbursal speed
            const disbursalSpeed = this.quantifyDisbursalSpeed(partnerOffer.disbursalTime);

            // Score flexibility
            const flexibility = this.scoreFlexibility(partnerOffer);

            // Get partner reputation
            const reputation = await this.getPartnerReputation(partnerId);

            // Calculate EMI if not provided
            const monthlyEMI = partnerOffer.emi || this.calculateEMI(
                partnerOffer.amount,
                partnerOffer.interestRate,
                partnerOffer.tenure,
            );

            return {
                partnerId,
                partnerName,
                offerId: partnerOffer.offerId,

                principalAmount: partnerOffer.amount,
                tenure: partnerOffer.tenure,

                nominalAPR: partnerOffer.interestRate,
                effectiveAPR,
                processingFee: partnerOffer.processingFee,
                totalInterest,
                totalCost,
                monthlyEMI,

                disbursalSpeed,
                flexibility,
                reputation,

                rawOffer: partnerOffer,
                expiresAt: partnerOffer.expiresAt,
            };

        } catch (error) {
            this.logger.error(`Failed to normalize offer from ${partnerName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Normalize multiple offers in parallel
     */
    async normalizeOffers(
        offers: Array<{ offer: PartnerOffer; partnerId: string; partnerName: string }>,
    ): Promise<StandardOffer[]> {
        const normalized = await Promise.all(
            offers.map(({ offer, partnerId, partnerName }) =>
                this.normalizeOffer(offer, partnerId, partnerName),
            ),
        );

        return normalized;
    }

    // ========================================
    // Private Calculation Methods
    // ========================================

    /**
     * Calculate effective APR including all fees
     */
    private calculateEffectiveAPR(offer: PartnerOffer): number {
        const principal = offer.amount;
        const nominalRate = offer.interestRate;
        const tenure = offer.tenure;
        const processingFee = offer.processingFee;

        // Effective principal (amount you actually get)
        const effectivePrincipal = principal - processingFee;

        // If total repayment is provided, use it
        if (offer.totalRepayment) {
            const totalInterestPlusFees = offer.totalRepayment - effectivePrincipal;
            const effectiveAPR = (totalInterestPlusFees / effectivePrincipal / tenure * 12) * 100;
            return parseFloat(effectiveAPR.toFixed(2));
        }

        // Otherwise calculate from nominal rate + fees
        const monthlyRate = nominalRate / 12 / 100;
        const emi = this.calculateEMI(principal, nominalRate, tenure);
        const totalRepayment = emi * tenure;
        const totalInterestPlusFees = totalRepayment - effectivePrincipal;

        const effectiveAPR = (totalInterestPlusFees / effectivePrincipal / tenure * 12) * 100;

        return parseFloat(effectiveAPR.toFixed(2));
    }

    /**
     * Calculate total interest paid
     */
    private calculateTotalInterest(offer: PartnerOffer): number {
        if (offer.totalRepayment) {
            return offer.totalRepayment - offer.amount;
        }

        const emi = offer.emi || this.calculateEMI(
            offer.amount,
            offer.interestRate,
            offer.tenure,
        );

        const totalRepayment = emi * offer.tenure;
        return parseFloat((totalRepayment - offer.amount).toFixed(2));
    }

    /**
     * Calculate total cost (principal + interest + fees)
     */
    private calculateTotalCost(offer: PartnerOffer): number {
        const totalInterest = this.calculateTotalInterest(offer);
        const totalFees = offer.processingFee;
        const totalCost = offer.amount + totalInterest + totalFees;

        return parseFloat(totalCost.toFixed(2));
    }

    /**
     * Calculate EMI
     */
    private calculateEMI(principal: number, annualRate: number, tenure: number): number {
        const monthlyRate = annualRate / 12 / 100;

        if (monthlyRate === 0) {
            return principal / tenure;
        }

        const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
            (Math.pow(1 + monthlyRate, tenure) - 1);

        return parseFloat(emi.toFixed(2));
    }

    /**
     * Convert disbursal time string to numeric days
     */
    private quantifyDisbursalSpeed(disbursalTime: string): number {
        const lowerTime = disbursalTime.toLowerCase();

        // Same day
        if (lowerTime.includes('same day') || lowerTime.includes('instant')) {
            return 0.5;
        }

        // Extract number of hours
        const hoursMatch = lowerTime.match(/(\d+)\s*hour/);
        if (hoursMatch) {
            return parseFloat(hoursMatch[1]) / 24;
        }

        // Extract number of days
        const daysMatch = lowerTime.match(/(\d+)\s*day/);
        if (daysMatch) {
            return parseFloat(daysMatch[1]);
        }

        // Extract range (e.g., "3-5 days")
        const rangeMatch = lowerTime.match(/(\d+)-(\d+)\s*day/);
        if (rangeMatch) {
            return (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
        }

        // Default: assume 2 days
        return 2;
    }

    /**
     * Score flexibility (0-100)
     * Based on prepayment, partial payments, holidays, etc.
     */
    private scoreFlexibility(offer: PartnerOffer): number {
        let score = 50; // Base score

        const conditions = offer.conditions.join(' ').toLowerCase();

        // Prepayment allowed
        if (conditions.includes('prepayment') || conditions.includes('pre-payment')) {
            score += 20;
        }

        // No prepayment penalty
        if (conditions.includes('no penalty') || conditions.includes('no charge')) {
            score += 10;
        }

        // Flexible repayment
        if (conditions.includes('flexible') || conditions.includes('revolving')) {
            score += 15;
        }

        // Payment holidays
        if (conditions.includes('holiday') || conditions.includes('moratorium')) {
            score += 10;
        }

        // Partial withdrawals
        if (conditions.includes('partial') || conditions.includes('top-up')) {
            score += 5;
        }

        return Math.min(100, score);
    }

    /**
     * Get partner reputation score (0-100)
     * Phase 1: Hardcoded scores
     * Phase 4: ML-based from historical data
     */
    private async getPartnerReputation(partnerId: string): Promise<number> {
        // Hardcoded reputation scores (Phase 1)
        const reputations: Record<string, number> = {
            lendingkart: 85,
            capital_float: 90,
            // Future partners will have ML-based scores
        };

        return reputations[partnerId] || 70; // Default: 70
    }

    /**
     * Calculate savings compared to baseline
     */
    calculateSavings(offer: StandardOffer, baselineCost: number): number {
        const savings = baselineCost - offer.totalCost;
        return parseFloat(savings.toFixed(2));
    }

    /**
     * Add badges to offers (UI enhancement)
     */
    addBadges(offers: StandardOffer[]): StandardOffer[] {
        if (offers.length === 0) return offers;

        // Find best in each category
        const lowestAPR = Math.min(...offers.map(o => o.effectiveAPR));
        const fastestDisbursal = Math.min(...offers.map(o => o.disbursalSpeed));
        const lowestCost = Math.min(...offers.map(o => o.totalCost));
        const highestFlexibility = Math.max(...offers.map(o => o.flexibility));

        return offers.map((offer, index) => {
            let badge: string | undefined;

            // Best overall (rank 1 after scoring)
            if (index === 0 && offer.overallScore) {
                badge = 'Best Overall';
            }
            // Lowest effective APR
            else if (offer.effectiveAPR === lowestAPR) {
                badge = 'Lowest Rate';
            }
            // Fastest disbursal
            else if (offer.disbursalSpeed === fastestDisbursal) {
                badge = 'Fastest';
            }
            // Lowest total cost
            else if (offer.totalCost === lowestCost) {
                badge = 'Best Value';
            }
            // Most flexible
            else if (offer.flexibility === highestFlexibility) {
                badge = 'Most Flexible';
            }

            return {
                ...offer,
                badge,
            };
        });
    }
}
