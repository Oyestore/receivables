import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancingRiskAssessment, RiskLevel, RiskCategory } from '../entities/financing-risk-assessment.entity';
import { FinancingApplication } from '../entities/financing-application.entity';

export interface RiskAssessmentInput {
    businessDetails: any;
    financialDetails: any;
    invoiceDetails?: any;
    industryBenchmarks?: any;
}

export interface RiskAssessmentResult {
    creditScore: number;
    riskLevel: RiskLevel;
    riskCategory: RiskCategory;
    confidenceScore: number;
    probabilityOfDefault: number;
    recommendations: any;
    riskFactors: any;
}

@Injectable()
export class FinancingRiskAssessmentService {
    private readonly logger = new Logger(FinancingRiskAssessmentService.name);

    constructor(
        @InjectRepository(FinancingRiskAssessment)
        private readonly riskAssessmentRepository: Repository<FinancingRiskAssessment>,
        @InjectRepository(FinancingApplication)
        private readonly applicationRepository: Repository<FinancingApplication>,
    ) {}

    /**
     * Perform comprehensive risk assessment
     */
    async performRiskAssessment(
        applicationId: string, 
        input: RiskAssessmentInput,
        userId: string
    ): Promise<FinancingRiskAssessment> {
        this.logger.log(`Performing risk assessment for application: ${applicationId}`);

        // Calculate credit score
        const creditScore = this.calculateCreditScore(input);

        // Determine risk level and category
        const riskLevel = this.determineRiskLevel(creditScore);
        const riskCategory = this.determineRiskCategory(creditScore);

        // Calculate probability of default
        const probabilityOfDefault = this.calculateProbabilityOfDefault(creditScore, input);

        // Calculate confidence score
        const confidenceScore = this.calculateConfidenceScore(input);

        // Generate recommendations
        const recommendations = this.generateRecommendations(creditScore, riskLevel, input);

        // Analyze risk factors
        const riskFactors = this.analyzeRiskFactors(input);

        // Create risk assessment record
        const riskAssessment = this.riskAssessmentRepository.create({
            applicationId,
            creditScore,
            riskLevel,
            riskCategory,
            confidenceScore,
            probabilityOfDefault,
            lossGivenDefault: this.calculateLossGivenDefault(riskLevel),
            expectedLoss: probabilityOfDefault * this.calculateLossGivenDefault(riskLevel),
            businessRiskFactors: riskFactors.business,
            financialRiskFactors: riskFactors.financial,
            creditHistoryFactors: riskFactors.creditHistory,
            industryBenchmarks: input.industryBenchmarks || {},
            recommendations,
            riskMitigation: this.generateRiskMitigation(riskLevel),
            scenarioAnalysis: this.performScenarioAnalysis(creditScore, input),
            assessmentDate: new Date(),
            nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
            assessorId: userId,
            assessmentModel: 'v2.0',
            createdBy: userId,
        });

        return await this.riskAssessmentRepository.save(riskAssessment);
    }

    /**
     * Calculate credit score based on multiple factors
     */
    private calculateCreditScore(input: RiskAssessmentInput): number {
        let score = 750; // Base score

        // Business age factor (0-50 points)
        const businessAge = input.businessDetails.yearsInBusiness;
        if (businessAge >= 10) score += 50;
        else if (businessAge >= 5) score += 30;
        else if (businessAge >= 3) score += 15;
        else if (businessAge >= 1) score += 5;

        // Revenue factor (0-100 points)
        const annualRevenue = input.businessDetails.annualRevenue;
        if (annualRevenue >= 100000000) score += 100; // > 10 crore
        else if (annualRevenue >= 50000000) score += 80; // > 5 crore
        else if (annualRevenue >= 10000000) score += 60; // > 1 crore
        else if (annualRevenue >= 5000000) score += 40; // > 50 lakh
        else if (annualRevenue >= 1000000) score += 20; // > 10 lakh

        // Financial ratios (0-150 points)
        if (input.financialDetails) {
            // Debt to equity ratio
            const debtToEquity = input.financialDetails.debtToEquityRatio || 2;
            if (debtToEquity <= 0.5) score += 50;
            else if (debtToEquity <= 1) score += 30;
            else if (debtToEquity <= 1.5) score += 10;
            else score -= 20;

            // Current ratio
            const currentRatio = input.financialDetails.currentRatio || 1;
            if (currentRatio >= 2) score += 50;
            else if (currentRatio >= 1.5) score += 30;
            else if (currentRatio >= 1) score += 10;
            else score -= 10;

            // Profit margin
            const netMargin = input.financialDetails.netMargin || 0;
            if (netMargin >= 0.15) score += 50;
            else if (netMargin >= 0.10) score += 30;
            else if (netMargin >= 0.05) score += 10;
            else score -= 20;
        }

        // Payment history (0-100 points)
        if (input.invoiceDetails) {
            const paymentHistory = input.invoiceDetails.paymentHistory || 'good';
            if (paymentHistory === 'excellent') score += 100;
            else if (paymentHistory === 'good') score += 70;
            else if (paymentHistory === 'average') score += 40;
            else if (paymentHistory === 'poor') score -= 30;
        }

        // Industry risk (-50 to 50 points)
        const industry = input.businessDetails.industry;
        const industryRisk = this.getIndustryRisk(industry);
        score += industryRisk;

        // Ensure score is within bounds
        return Math.max(300, Math.min(900, score));
    }

    /**
     * Determine risk level based on credit score
     */
    private determineRiskLevel(creditScore: number): RiskLevel {
        if (creditScore >= 800) return RiskLevel.LOW;
        if (creditScore >= 700) return RiskLevel.MEDIUM;
        if (creditScore >= 600) return RiskLevel.HIGH;
        return RiskLevel.VERY_HIGH;
    }

    /**
     * Determine risk category based on credit score
     */
    private determineRiskCategory(creditScore: number): RiskCategory {
        if (creditScore >= 850) return RiskCategory.EXCELLENT;
        if (creditScore >= 750) return RiskCategory.GOOD;
        if (creditScore >= 650) return RiskCategory.AVERAGE;
        if (creditScore >= 550) return RiskCategory.POOR;
        return RiskCategory.VERY_POOR;
    }

    /**
     * Calculate probability of default
     */
    private calculateProbabilityOfDefault(creditScore: number, input: RiskAssessmentInput): number {
        // Base PD by credit score
        let basePD = 0;
        if (creditScore >= 800) basePD = 0.005; // 0.5%
        else if (creditScore >= 700) basePD = 0.02; // 2%
        else if (creditScore >= 600) basePD = 0.08; // 8%
        else basePD = 0.25; // 25%

        // Adjust based on business factors
        if (input.businessDetails.yearsInBusiness < 2) basePD *= 1.5;
        if (input.financialDetails?.currentRatio < 1) basePD *= 1.3;
        if (input.invoiceDetails?.paymentHistory === 'poor') basePD *= 1.4;

        return Math.min(1, basePD);
    }

    /**
     * Calculate confidence score
     */
    private calculateConfidenceScore(input: RiskAssessmentInput): number {
        let confidence = 0.8; // Base confidence

        // Increase confidence with more data
        if (input.financialDetails) confidence += 0.1;
        if (input.invoiceDetails) confidence += 0.05;
        if (input.industryBenchmarks) confidence += 0.05;

        return Math.min(1, confidence);
    }

    /**
     * Calculate loss given default
     */
    private calculateLossGivenDefault(riskLevel: RiskLevel): number {
        switch (riskLevel) {
            case RiskLevel.LOW: return 0.3; // 30%
            case RiskLevel.MEDIUM: return 0.5; // 50%
            case RiskLevel.HIGH: return 0.7; // 70%
            case RiskLevel.VERY_HIGH: return 0.9; // 90%
        }
    }

    /**
     * Analyze risk factors
     */
    private analyzeRiskFactors(input: RiskAssessmentInput): any {
        return {
            business: {
                businessAgeRisk: this.calculateBusinessAgeRisk(input.businessDetails.yearsInBusiness),
                revenueStability: this.calculateRevenueStability(input.businessDetails),
                industryRisk: this.getIndustryRisk(input.businessDetails.industry),
                geographicRisk: this.calculateGeographicRisk(input.businessDetails),
                customerConcentration: this.calculateCustomerConcentration(input.invoiceDetails),
                supplierDependency: this.calculateSupplierDependency(input.businessDetails),
            },
            financial: {
                debtToEquityRatio: input.financialDetails?.debtToEquityRatio || 2,
                currentRatio: input.financialDetails?.currentRatio || 1,
                quickRatio: input.financialDetails?.quickRatio || 0.8,
                grossMargin: input.financialDetails?.grossMargin || 0.2,
                netMargin: input.financialDetails?.netMargin || 0.05,
                operatingCashFlow: input.financialDetails?.operatingCashFlow || 0,
                workingCapitalRatio: input.financialDetails?.workingCapitalRatio || 1.2,
            },
            creditHistory: {
                paymentHistory: input.invoiceDetails?.paymentHistory || 'average',
                creditUtilization: input.financialDetails?.creditUtilization || 0.5,
                creditInquiries: input.financialDetails?.creditInquiries || 2,
                publicRecords: input.financialDetails?.publicRecords || 0,
                collectionAccounts: input.financialDetails?.collectionAccounts || 0,
            },
        };
    }

    /**
     * Generate recommendations based on risk assessment
     */
    private generateRecommendations(creditScore: number, riskLevel: RiskLevel, input: RiskAssessmentInput): any {
        const baseRecommendation = {
            maxLoanAmount: this.calculateMaxLoanAmount(creditScore, input),
            recommendedInterestRate: this.calculateRecommendedInterestRate(riskLevel),
            recommendedTenure: this.calculateRecommendedTenure(riskLevel),
            requiredCollateral: this.getRequiredCollateral(riskLevel),
            suggestedCovenants: this.getSuggestedCovenants(riskLevel),
            monitoringRequirements: this.getMonitoringRequirements(riskLevel),
        };

        return baseRecommendation;
    }

    /**
     * Generate risk mitigation strategies
     */
    private generateRiskMitigation(riskLevel: RiskLevel): any {
        const baseMitigation = {
            insuranceRequirements: ['Business insurance'],
            guarantees: ['Personal guarantee'],
            collateralRequirements: [],
            monitoringFrequency: 'monthly',
            reportingRequirements: ['Financial statements'],
        };

        switch (riskLevel) {
            case RiskLevel.HIGH:
                baseMitigation.collateralRequirements.push('Property collateral');
                baseMitigation.monitoringFrequency = 'weekly';
                break;
            case RiskLevel.VERY_HIGH:
                baseMitigation.collateralRequirements.push('Property collateral', 'Inventory collateral');
                baseMitigation.monitoringFrequency = 'daily';
                baseMitigation.reportingRequirements.push('Weekly cash flow');
                break;
        }

        return baseMitigation;
    }

    /**
     * Perform scenario analysis
     */
    private performScenarioAnalysis(creditScore: number, input: RiskAssessmentInput): any {
        return {
            baseCase: {
                probabilityOfDefault: this.calculateProbabilityOfDefault(creditScore, input),
                lossGivenDefault: this.calculateLossGivenDefault(this.determineRiskLevel(creditScore)),
            },
            stressTest: {
                probabilityOfDefault: this.calculateProbabilityOfDefault(Math.max(300, creditScore - 100), input),
                description: 'Revenue decline of 20%',
            },
            worstCase: {
                probabilityOfDefault: this.calculateProbabilityOfDefault(Math.max(300, creditScore - 200), input),
                description: 'Revenue decline of 40% + payment delays',
            },
            sensitivityFactors: {
                revenueSensitivity: 0.3,
                interestRateSensitivity: 0.2,
                paymentHistorySensitivity: 0.4,
                industrySensitivity: 0.1,
            },
        };
    }

    // Helper methods
    private getIndustryRisk(industry: string): number {
        const lowRiskIndustries = ['technology', 'healthcare', 'education'];
        const mediumRiskIndustries = ['manufacturing', 'retail', 'services'];
        const highRiskIndustries = ['construction', 'hospitality', 'transportation'];

        if (lowRiskIndustries.includes(industry)) return 20;
        if (mediumRiskIndustries.includes(industry)) return 0;
        if (highRiskIndustries.includes(industry)) return -30;
        return 0;
    }

    private calculateBusinessAgeRisk(yearsInBusiness: number): number {
        if (yearsInBusiness >= 10) return 0.1;
        if (yearsInBusiness >= 5) return 0.3;
        if (yearsInBusiness >= 3) return 0.5;
        if (yearsInBusiness >= 1) return 0.7;
        return 0.9;
    }

    private calculateRevenueStability(businessDetails: any): number {
        // Simplified calculation - in real implementation would use historical data
        return 0.5;
    }

    private calculateGeographicRisk(businessDetails: any): number {
        // Simplified calculation - in real implementation would use location data
        return 0.3;
    }

    private calculateCustomerConcentration(invoiceDetails: any): number {
        // Simplified calculation - in real implementation would analyze customer distribution
        return 0.4;
    }

    private calculateSupplierDependency(businessDetails: any): number {
        // Simplified calculation - in real implementation would analyze supplier concentration
        return 0.3;
    }

    private calculateMaxLoanAmount(creditScore: number, input: RiskAssessmentInput): number {
        const annualRevenue = input.businessDetails.annualRevenue;
        const multiplier = creditScore >= 700 ? 0.3 : creditScore >= 600 ? 0.2 : 0.1;
        return annualRevenue * multiplier;
    }

    private calculateRecommendedInterestRate(riskLevel: RiskLevel): number {
        switch (riskLevel) {
            case RiskLevel.LOW: return 12;
            case RiskLevel.MEDIUM: return 16;
            case RiskLevel.HIGH: return 22;
            case RiskLevel.VERY_HIGH: return 28;
        }
    }

    private calculateRecommendedTenure(riskLevel: RiskLevel): number {
        switch (riskLevel) {
            case RiskLevel.LOW: return 24;
            case RiskLevel.MEDIUM: return 18;
            case RiskLevel.HIGH: return 12;
            case RiskLevel.VERY_HIGH: return 6;
        }
    }

    private getRequiredCollateral(riskLevel: RiskLevel): string[] {
        switch (riskLevel) {
            case RiskLevel.LOW: return [];
            case RiskLevel.MEDIUM: return ['Personal guarantee'];
            case RiskLevel.HIGH: return ['Personal guarantee', 'Business assets'];
            case RiskLevel.VERY_HIGH: return ['Personal guarantee', 'Business assets', 'Property collateral'];
        }
    }

    private getSuggestedCovenants(riskLevel: RiskLevel): string[] {
        const baseCovenants = ['Financial reporting'];
        if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.VERY_HIGH) {
            baseCovenants.push('Debt ratio limits', 'Working capital requirements');
        }
        return baseCovenants;
    }

    private getMonitoringRequirements(riskLevel: RiskLevel): string[] {
        switch (riskLevel) {
            case RiskLevel.LOW: return ['Quarterly reviews'];
            case RiskLevel.MEDIUM: return ['Monthly reviews'];
            case RiskLevel.HIGH: return ['Weekly reviews', 'Monthly financials'];
            case RiskLevel.VERY_HIGH: return ['Daily monitoring', 'Weekly financials', 'Site visits'];
        }
    }

    /**
     * Get risk assessment by application ID
     */
    async getRiskAssessmentByApplication(applicationId: string): Promise<FinancingRiskAssessment> {
        return await this.riskAssessmentRepository.findOne({
            where: { applicationId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Update risk assessment
     */
    async updateRiskAssessment(
        assessmentId: string, 
        updates: Partial<FinancingRiskAssessment>,
        userId: string
    ): Promise<FinancingRiskAssessment> {
        await this.riskAssessmentRepository.update(assessmentId, {
            ...updates,
            updatedBy: userId,
            updatedAt: new Date(),
        });

        return await this.riskAssessmentRepository.findOne({ where: { id: assessmentId } });
    }
}
