import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancingOffer, OfferStatus, OfferType } from '../entities/financing-offer.entity';
import { FinancingApplication, FinancingApplicationStatus } from '../entities/financing-application.entity';
import { FinancingProvider } from '../entities/financing-offer.entity';
import { FinancingProduct } from '../entities/financing-offer.entity';

export interface CalculationInput {
    principalAmount: number;
    interestRate: number;
    tenureMonths: number;
    processingFee: number;
    repaymentFrequency?: 'monthly' | 'quarterly' | 'biannual';
}

export interface CalculationResult {
    emiAmount: number;
    totalInterest: number;
    totalAmount: number;
    netDisbursementAmount: number;
    effectiveInterestRate: number;
    repaymentSchedule: any[];
    costBreakdown: {
        interestAmount: number;
        processingFeeAmount: number;
        otherCharges: number;
        totalCost: number;
    };
}

export interface ComparisonResult {
    offers: any[];
    bestByLowestRate: any;
    bestByLowestEmi: any;
    bestByLowestTotalCost: any;
    recommendations: string[];
}

@Injectable()
export class FinancingCalculatorService {
    private readonly logger = new Logger(FinancingCalculatorService.name);

    constructor(
        @InjectRepository(FinancingOffer)
        private readonly offerRepository: Repository<FinancingOffer>,
        @InjectRepository(FinancingProvider)
        private readonly providerRepository: Repository<FinancingProvider>,
        @InjectRepository(FinancingProduct)
        private readonly productRepository: Repository<FinancingProduct>,
    ) {}

    /**
     * Calculate EMI and other financing details
     */
    calculateFinancingCost(input: CalculationInput): CalculationResult {
        const { principalAmount, interestRate, tenureMonths, processingFee, repaymentFrequency = 'monthly' } = input;

        // Convert annual interest rate to monthly
        const monthlyRate = interestRate / 12 / 100;
        
        // Calculate EMI using the formula: EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
        const emiAmount = principalAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) / 
                         (Math.pow(1 + monthlyRate, tenureMonths) - 1);

        const totalAmount = emiAmount * tenureMonths;
        const totalInterest = totalAmount - principalAmount;
        const processingFeeAmount = principalAmount * (processingFee / 100);
        const netDisbursementAmount = principalAmount - processingFeeAmount;

        // Calculate effective interest rate (including processing fee)
        const effectiveInterestRate = ((totalInterest + processingFeeAmount) / principalAmount) * 100;

        // Generate repayment schedule
        const repaymentSchedule = this.generateRepaymentSchedule(
            principalAmount, 
            monthlyRate, 
            emiAmount, 
            tenureMonths,
            repaymentFrequency
        );

        const costBreakdown = {
            interestAmount: totalInterest,
            processingFeeAmount,
            otherCharges: 0,
            totalCost: totalInterest + processingFeeAmount,
        };

        return {
            emiAmount: Math.round(emiAmount * 100) / 100,
            totalInterest: Math.round(totalInterest * 100) / 100,
            totalAmount: Math.round(totalAmount * 100) / 100,
            netDisbursementAmount: Math.round(netDisbursementAmount * 100) / 100,
            effectiveInterestRate: Math.round(effectiveInterestRate * 100) / 100,
            repaymentSchedule,
            costBreakdown,
        };
    }

    /**
     * Generate detailed repayment schedule
     */
    private generateRepaymentSchedule(
        principal: number, 
        monthlyRate: number, 
        emi: number, 
        tenureMonths: number,
        frequency: string
    ): any[] {
        const schedule = [];
        let remainingPrincipal = principal;
        const installments = frequency === 'monthly' ? tenureMonths : 
                            frequency === 'quarterly' ? Math.ceil(tenureMonths / 3) :
                            Math.ceil(tenureMonths / 6);

        const adjustedRate = frequency === 'monthly' ? monthlyRate :
                            frequency === 'quarterly' ? monthlyRate * 3 :
                            monthlyRate * 6;

        const adjustedEmi = frequency === 'monthly' ? emi :
                           frequency === 'quarterly' ? emi * 3 :
                           emi * 6;

        for (let i = 1; i <= installments; i++) {
            const interestPayment = remainingPrincipal * adjustedRate;
            const principalPayment = adjustedEmi - interestPayment;
            remainingPrincipal -= principalPayment;

            schedule.push({
                installmentNumber: i,
                dueDate: this.calculateDueDate(i, frequency),
                principalAmount: Math.round(principalPayment * 100) / 100,
                interestAmount: Math.round(interestPayment * 100) / 100,
                totalAmount: Math.round(adjustedEmi * 100) / 100,
                remainingPrincipal: Math.max(0, Math.round(remainingPrincipal * 100) / 100),
            });
        }

        return schedule;
    }

    /**
     * Calculate due date based on frequency
     */
    private calculateDueDate(installment: number, frequency: string): Date {
        const now = new Date();
        const monthsToAdd = frequency === 'monthly' ? installment :
                           frequency === 'quarterly' ? installment * 3 :
                           installment * 6;
        
        const dueDate = new Date(now);
        dueDate.setMonth(dueDate.getMonth() + monthsToAdd);
        return dueDate;
    }

    /**
     * Compare multiple financing offers
     */
    async compareOffers(offers: FinancingOffer[]): Promise<ComparisonResult> {
        if (offers.length === 0) {
            throw new Error('No offers to compare');
        }

        // Calculate additional metrics for each offer
        const enrichedOffers = offers.map(offer => {
            const calculation = this.calculateFinancingCost({
                principalAmount: offer.offerAmount,
                interestRate: offer.interestRate,
                tenureMonths: offer.tenureMonths,
                processingFee: offer.processingFee,
            });

            return {
                ...offer,
                calculatedEmi: calculation.emiAmount,
                calculatedTotalCost: calculation.totalInterest + (offer.offerAmount * offer.processingFee / 100),
                effectiveRate: calculation.effectiveInterestRate,
                monthlyCost: calculation.emiAmount,
            };
        });

        // Find best offers by different criteria
        const bestByLowestRate = enrichedOffers.reduce((best, current) => 
            current.interestRate < best.interestRate ? current : best
        );

        const bestByLowestEmi = enrichedOffers.reduce((best, current) => 
            current.calculatedEmi < best.calculatedEmi ? current : best
        );

        const bestByLowestTotalCost = enrichedOffers.reduce((best, current) => 
            current.calculatedTotalCost < best.calculatedTotalCost ? current : best
        );

        // Generate recommendations
        const recommendations = this.generateRecommendations(enrichedOffers);

        return {
            offers: enrichedOffers,
            bestByLowestRate,
            bestByLowestEmi,
            bestByLowestTotalCost,
            recommendations,
        };
    }

    /**
     * Generate recommendations based on offer comparison
     */
    private generateRecommendations(offers: any[]): string[] {
        const recommendations: string[] = [];

        if (offers.length === 1) {
            recommendations.push('Only one offer available. Review terms carefully before accepting.');
            return recommendations;
        }

        const lowestRate = Math.min(...offers.map(o => o.interestRate));
        const lowestEmi = Math.min(...offers.map(o => o.calculatedEmi));
        const lowestCost = Math.min(...offers.map(o => o.calculatedTotalCost));

        if (offers.find(o => o.interestRate === lowestRate && o.calculatedEmi === lowestEmi)) {
            recommendations.push('Best offer available with lowest rate and EMI - Strong recommendation to accept.');
        } else if (offers.find(o => o.interestRate === lowestRate)) {
            recommendations.push('Lowest interest rate available - Good for long-term cost savings.');
        } else if (offers.find(o => o.calculatedEmi === lowestEmi)) {
            recommendations.push('Lowest EMI available - Good for monthly cash flow management.');
        }

        // Check for special features
        const flexibleRepaymentOffers = offers.filter(o => o.features?.flexibleRepayment);
        if (flexibleRepaymentOffers.length > 0) {
            recommendations.push('Offers with flexible repayment available - Consider if cash flow is variable.');
        }

        const prepaymentOffers = offers.filter(o => o.features?.prepaymentAllowed);
        if (prepaymentOffers.length > 0) {
            recommendations.push('Prepayment allowed - Good option if you expect early repayment.');
        }

        return recommendations;
    }

    /**
     * Calculate eligibility for different products
     */
    async calculateEligibility(businessDetails: any, financialDetails: any): Promise<any> {
        const eligibleProducts = await this.productRepository.find({
            where: { isActive: true },
            relations: ['provider'],
        });

        const eligibilityResults = eligibleProducts.map(product => {
            const isEligible = this.checkEligibilityCriteria(product.eligibility, businessDetails, financialDetails);
            
            return {
                productId: product.id,
                productName: product.displayName,
                providerName: product.provider?.displayName,
                isEligible,
                maxAmount: isEligible ? this.calculateMaxAmount(product, businessDetails, financialDetails) : 0,
                reasons: isEligible ? [] : this.getIneligibilityReasons(product.eligibility, businessDetails, financialDetails),
            };
        });

        return {
            eligibleProducts: eligibilityResults.filter(p => p.isEligible),
            ineligibleProducts: eligibilityResults.filter(p => !p.isEligible),
            recommendedProducts: this.getRecommendedProducts(eligibilityResults),
        };
    }

    /**
     * Check if business meets eligibility criteria
     */
    private checkEligibilityCriteria(eligibility: any, businessDetails: any, financialDetails: any): boolean {
        // Check business age
        if (businessDetails.yearsInBusiness < eligibility.minBusinessAge) {
            return false;
        }

        if (eligibility.maxBusinessAge && businessDetails.yearsInBusiness > eligibility.maxBusinessAge) {
            return false;
        }

        // Check annual revenue
        if (businessDetails.annualRevenue < eligibility.minAnnualRevenue) {
            return false;
        }

        if (eligibility.maxAnnualRevenue && businessDetails.annualRevenue > eligibility.maxAnnualRevenue) {
            return false;
        }

        // Check credit score (if available)
        if (eligibility.minCreditScore && financialDetails.creditScore < eligibility.minCreditScore) {
            return false;
        }

        // Check industry restrictions
        if (eligibility.excludedIndustries && eligibility.excludedIndustries.includes(businessDetails.industry)) {
            return false;
        }

        return true;
    }

    /**
     * Calculate maximum eligible amount
     */
    private calculateMaxAmount(product: any, businessDetails: any, financialDetails: any): number {
        // Simple calculation based on revenue - can be enhanced with more complex logic
        const revenueBasedAmount = businessDetails.annualRevenue * 0.2; // 20% of annual revenue
        return Math.min(revenueBasedAmount, product.terms.maxAmount);
    }

    /**
     * Get reasons for ineligibility
     */
    private getIneligibilityReasons(eligibility: any, businessDetails: any, financialDetails: any): string[] {
        const reasons: string[] = [];

        if (businessDetails.yearsInBusiness < eligibility.minBusinessAge) {
            reasons.push(`Business age too low (minimum ${eligibility.minBusinessAge} years required)`);
        }

        if (businessDetails.annualRevenue < eligibility.minAnnualRevenue) {
            reasons.push(`Annual revenue too low (minimum ₹${eligibility.minAnnualRevenue.toLocaleString()} required)`);
        }

        if (eligibility.minCreditScore && financialDetails.creditScore < eligibility.minCreditScore) {
            reasons.push(`Credit score too low (minimum ${eligibility.minCreditScore} required)`);
        }

        if (eligibility.excludedIndustries && eligibility.excludedIndustries.includes(businessDetails.industry)) {
            reasons.push('Industry not supported by this product');
        }

        return reasons;
    }

    /**
     * Get recommended products based on business profile
     */
    private getRecommendedProducts(eligibilityResults: any[]): any[] {
        // Simple recommendation logic - can be enhanced with ML
        return eligibilityResults
            .filter(p => p.isEligible)
            .sort((a, b) => b.maxAmount - a.maxAmount)
            .slice(0, 3);
    }

    /**
     * Calculate cost savings for early repayment
     */
    calculateEarlyRepaymentSavings(offer: FinancingOffer, remainingMonths: number): any {
        const calculation = this.calculateFinancingCost({
            principalAmount: offer.offerAmount,
            interestRate: offer.interestRate,
            tenureMonths: offer.tenureMonths,
            processingFee: offer.processingFee,
        });

        const remainingInterest = calculation.repaymentSchedule
            .slice(-remainingMonths)
            .reduce((sum, installment) => sum + installment.interestAmount, 0);

        const prepaymentCharges = remainingInterest * (offer.terms.prepaymentCharges || 0) / 100;
        const netSavings = remainingInterest - prepaymentCharges;

        return {
            remainingInterest,
            prepaymentCharges,
            netSavings,
            savingsPercentage: (netSavings / remainingInterest) * 100,
        };
    }
}
