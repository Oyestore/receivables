import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { CreditLimit } from '../entities/credit-limit.entity';
import { CreditLimitHistory } from '../entities/credit-limit-history.entity';
import { CreditAssessment } from '../entities/credit-assessment.entity';
import { BuyerProfile } from '../entities/buyer-profile.entity';
import { PaymentHistory } from '../entities/payment-history.entity';

/**
 * Service responsible for credit limit calculation.
 * This service provides functionality for calculating recommended credit limits based on various factors.
 */
@Injectable()
export class CreditLimitCalculationService {
  private readonly logger = new Logger(CreditLimitCalculationService.name);

  constructor(
    @InjectRepository(CreditLimit)
    private creditLimitRepository: Repository<CreditLimit>,
    @InjectRepository(CreditLimitHistory)
    private creditLimitHistoryRepository: Repository<CreditLimitHistory>,
    @InjectRepository(CreditAssessment)
    private creditAssessmentRepository: Repository<CreditAssessment>,
    @InjectRepository(BuyerProfile)
    private buyerProfileRepository: Repository<BuyerProfile>,
    @InjectRepository(PaymentHistory)
    private paymentHistoryRepository: Repository<PaymentHistory>,
  ) {}

  /**
   * Calculate recommended credit limit for a buyer
   * @param buyerId - Buyer ID
   * @param tenantId - Tenant ID
   * @param options - Calculation options
   * @returns Calculated credit limit recommendation
   */
  async calculateRecommendedLimit(
    buyerId: string,
    tenantId: string,
    options: any = {},
  ): Promise<any> {
    this.logger.log(`Calculating recommended credit limit for buyer ${buyerId}`);
    
    // Get latest credit assessment
    const assessment = await this.creditAssessmentRepository.findOne({
      where: { buyerId, tenantId },
      order: { createdAt: 'DESC' },
    });
    
    if (!assessment) {
      throw new Error(`No credit assessment found for buyer ${buyerId}`);
    }
    
    // Get buyer profile
    const buyerProfile = await this.buyerProfileRepository.findOne({
      where: { buyerId, tenantId },
    });
    
    if (!buyerProfile) {
      throw new Error(`No buyer profile found for buyer ${buyerId}`);
    }
    
    // Select calculation method based on options or default to score-based
    const calculationMethod = options.calculationMethod || 'score-based';
    
    // Calculate limit based on selected method
    let recommendedLimit: number;
    let calculationParameters: Record<string, any> = {};
    let confidenceLevel: number;
    
    switch (calculationMethod) {
      case 'score-based':
        const scoreBased = await this.calculateScoreBasedLimit(assessment, buyerProfile, options);
        recommendedLimit = scoreBased.recommendedLimit;
        calculationParameters = scoreBased.parameters;
        confidenceLevel = scoreBased.confidenceLevel;
        break;
        
      case 'payment-history':
        const paymentBased = await this.calculatePaymentHistoryBasedLimit(buyerId, tenantId, assessment, options);
        recommendedLimit = paymentBased.recommendedLimit;
        calculationParameters = paymentBased.parameters;
        confidenceLevel = paymentBased.confidenceLevel;
        break;
        
      case 'industry-benchmark':
        const industryBased = await this.calculateIndustryBenchmarkBasedLimit(assessment, buyerProfile, options);
        recommendedLimit = industryBased.recommendedLimit;
        calculationParameters = industryBased.parameters;
        confidenceLevel = industryBased.confidenceLevel;
        break;
        
      case 'hybrid':
        const hybrid = await this.calculateHybridLimit(buyerId, tenantId, assessment, buyerProfile, options);
        recommendedLimit = hybrid.recommendedLimit;
        calculationParameters = hybrid.parameters;
        confidenceLevel = hybrid.confidenceLevel;
        break;
        
      default:
        throw new Error(`Unsupported calculation method: ${calculationMethod}`);
    }
    
    // Apply minimum and maximum limits if specified
    if (options.minimumLimit !== undefined && recommendedLimit < options.minimumLimit) {
      recommendedLimit = options.minimumLimit;
      calculationParameters.minimumLimitApplied = true;
    }
    
    if (options.maximumLimit !== undefined && recommendedLimit > options.maximumLimit) {
      recommendedLimit = options.maximumLimit;
      calculationParameters.maximumLimitApplied = true;
    }
    
    // Round to nearest appropriate value based on amount
    recommendedLimit = this.roundCreditLimit(recommendedLimit);
    
    // Determine risk level based on assessment
    const riskLevel = this.determineRiskLevel(assessment);
    
    return {
      buyerId,
      tenantId,
      creditAssessmentId: assessment.id,
      recommendedLimit,
      currencyCode: options.currencyCode || 'INR',
      confidenceLevel,
      riskLevel,
      calculationMethod,
      calculationParameters,
      effectiveDate: new Date(),
      reviewDate: this.calculateReviewDate(riskLevel),
    };
  }

  /**
   * Calculate credit limit based on credit score
   * @param assessment - Credit assessment
   * @param buyerProfile - Buyer profile
   * @param options - Calculation options
   * @returns Calculated credit limit and parameters
   */
  private async calculateScoreBasedLimit(
    assessment: CreditAssessment,
    buyerProfile: BuyerProfile,
    options: any = {},
  ): Promise<any> {
    // Get credit score from assessment
    const creditScore = assessment.scoreValue;
    
    // Define base multiplier based on score ranges
    let baseMultiplier = 0;
    let confidenceLevel = 0;
    
    if (creditScore >= 90) {
      baseMultiplier = 5.0;
      confidenceLevel = 90;
    } else if (creditScore >= 80) {
      baseMultiplier = 4.0;
      confidenceLevel = 85;
    } else if (creditScore >= 70) {
      baseMultiplier = 3.0;
      confidenceLevel = 80;
    } else if (creditScore >= 60) {
      baseMultiplier = 2.0;
      confidenceLevel = 75;
    } else if (creditScore >= 50) {
      baseMultiplier = 1.5;
      confidenceLevel = 70;
    } else if (creditScore >= 40) {
      baseMultiplier = 1.0;
      confidenceLevel = 65;
    } else if (creditScore >= 30) {
      baseMultiplier = 0.5;
      confidenceLevel = 60;
    } else {
      baseMultiplier = 0.25;
      confidenceLevel = 50;
    }
    
    // Get base amount from buyer profile or options
    const baseAmount = options.baseAmount || buyerProfile.averageTransactionAmount || 100000;
    
    // Calculate recommended limit
    const recommendedLimit = baseAmount * baseMultiplier;
    
    return {
      recommendedLimit,
      confidenceLevel,
      parameters: {
        creditScore,
        baseAmount,
        baseMultiplier,
        method: 'score-based',
      },
    };
  }

  /**
   * Calculate credit limit based on payment history
   * @param buyerId - Buyer ID
   * @param tenantId - Tenant ID
   * @param assessment - Credit assessment
   * @param options - Calculation options
   * @returns Calculated credit limit and parameters
   */
  private async calculatePaymentHistoryBasedLimit(
    buyerId: string,
    tenantId: string,
    assessment: CreditAssessment,
    options: any = {},
  ): Promise<any> {
    // Get payment history for the last 12 months
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    
    const paymentHistory = await this.paymentHistoryRepository.find({
      where: { buyerId, tenantId, paidDate: MoreThanOrEqual(startDate) },
      order: { paidDate: 'DESC' },
    });
    
    if (paymentHistory.length === 0) {
      // Fall back to score-based if no payment history
      return this.calculateScoreBasedLimit(assessment, null, options);
    }
    
    // Calculate average and maximum payment amounts
    let totalAmount = 0;
    let maxAmount = 0;
    let onTimeCount = 0;
    
    paymentHistory.forEach(payment => {
      totalAmount += payment.paidAmount;
      maxAmount = Math.max(maxAmount, payment.paidAmount);
      
      if (payment.daysPastDue <= 0) {
        onTimeCount++;
      }
    });
    
    const avgAmount = totalAmount / paymentHistory.length;
    const onTimePercentage = (onTimeCount / paymentHistory.length) * 100;
    
    // Calculate multiplier based on on-time payment percentage
    let historyMultiplier = 0;
    let confidenceLevel = 0;
    
    if (onTimePercentage >= 95) {
      historyMultiplier = 3.0;
      confidenceLevel = 90;
    } else if (onTimePercentage >= 90) {
      historyMultiplier = 2.5;
      confidenceLevel = 85;
    } else if (onTimePercentage >= 80) {
      historyMultiplier = 2.0;
      confidenceLevel = 80;
    } else if (onTimePercentage >= 70) {
      historyMultiplier = 1.5;
      confidenceLevel = 75;
    } else if (onTimePercentage >= 60) {
      historyMultiplier = 1.0;
      confidenceLevel = 70;
    } else {
      historyMultiplier = 0.5;
      confidenceLevel = 60;
    }
    
    // Apply credit score adjustment
    const creditScore = assessment.scoreValue;
    const scoreAdjustment = (creditScore - 50) / 100; // -0.5 to +0.5
    
    historyMultiplier += scoreAdjustment;
    
    // Calculate recommended limit
    const recommendedLimit = maxAmount * historyMultiplier;
    
    return {
      recommendedLimit,
      confidenceLevel,
      parameters: {
        paymentHistoryCount: paymentHistory.length,
        averageAmount: avgAmount,
        maximumAmount: maxAmount,
        onTimePercentage,
        historyMultiplier,
        creditScore,
        scoreAdjustment,
        method: 'payment-history',
      },
    };
  }

  /**
   * Calculate credit limit based on industry benchmarks
   * @param assessment - Credit assessment
   * @param buyerProfile - Buyer profile
   * @param options - Calculation options
   * @returns Calculated credit limit and parameters
   */
  private async calculateIndustryBenchmarkBasedLimit(
    assessment: CreditAssessment,
    buyerProfile: BuyerProfile,
    options: any = {},
  ): Promise<any> {
    // This would typically involve looking up industry benchmarks
    // For simplicity, using a basic implementation here
    
    // Get industry code from buyer profile
    const industryCode = buyerProfile.industryCode;
    
    if (!industryCode) {
      // Fall back to score-based if no industry code
      return this.calculateScoreBasedLimit(assessment, buyerProfile, options);
    }
    
    // In a real implementation, would look up industry benchmarks from a database
    // For now, using simplified logic
    
    // Base amount would come from industry benchmark data
    const baseAmount = options.baseAmount || 200000;
    
    // Credit score still influences the multiplier
    const creditScore = assessment.scoreValue;
    
    let industryMultiplier = 0;
    let confidenceLevel = 0;
    
    if (creditScore >= 90) {
      industryMultiplier = 2.5;
      confidenceLevel = 85;
    } else if (creditScore >= 80) {
      industryMultiplier = 2.0;
      confidenceLevel = 80;
    } else if (creditScore >= 70) {
      industryMultiplier = 1.5;
      confidenceLevel = 75;
    } else if (creditScore >= 60) {
      industryMultiplier = 1.0;
      confidenceLevel = 70;
    } else if (creditScore >= 50) {
      industryMultiplier = 0.8;
      confidenceLevel = 65;
    } else {
      industryMultiplier = 0.5;
      confidenceLevel = 60;
    }
    
    // Calculate recommended limit
    const recommendedLimit = baseAmount * industryMultiplier;
    
    return {
      recommendedLimit,
      confidenceLevel,
      parameters: {
        industryCode,
        baseAmount,
        creditScore,
        industryMultiplier,
        method: 'industry-benchmark',
      },
    };
  }

  /**
   * Calculate credit limit using a hybrid approach combining multiple methods
   * @param buyerId - Buyer ID
   * @param tenantId - Tenant ID
   * @param assessment - Credit assessment
   * @param buyerProfile - Buyer profile
   * @param options - Calculation options
   * @returns Calculated credit limit and parameters
   */
  private async calculateHybridLimit(
    buyerId: string,
    tenantId: string,
    assessment: CreditAssessment,
    buyerProfile: BuyerProfile,
    options: any = {},
  ): Promise<any> {
    // Calculate limits using different methods
    const scoreBased = await this.calculateScoreBasedLimit(assessment, buyerProfile, options);
    const paymentBased = await this.calculatePaymentHistoryBasedLimit(buyerId, tenantId, assessment, options);
    const industryBased = await this.calculateIndustryBenchmarkBasedLimit(assessment, buyerProfile, options);
    
    // Define weights for each method
    const scoreWeight = options.scoreWeight || 0.3;
    const paymentWeight = options.paymentWeight || 0.5;
    const industryWeight = options.industryWeight || 0.2;
    
    // Calculate weighted average
    const weightedLimit = 
      (scoreBased.recommendedLimit * scoreWeight) +
      (paymentBased.recommendedLimit * paymentWeight) +
      (industryBased.recommendedLimit * industryWeight);
    
    // Calculate weighted confidence level
    const weightedConfidence = 
      (scoreBased.confidenceLevel * scoreWeight) +
      (paymentBased.confidenceLevel * paymentWeight) +
      (industryBased.confidenceLevel * industryWeight);
    
    return {
      recommendedLimit: weightedLimit,
      confidenceLevel: Math.round(weightedConfidence),
      parameters: {
        scoreBasedLimit: scoreBased.recommendedLimit,
        paymentBasedLimit: paymentBased.recommendedLimit,
        industryBasedLimit: industryBased.recommendedLimit,
        scoreWeight,
        paymentWeight,
        industryWeight,
        method: 'hybrid',
      },
    };
  }

  /**
   * Round credit limit to appropriate value based on amount
   * @param amount - Credit limit amount
   * @returns Rounded credit limit
   */
  private roundCreditLimit(amount: number): number {
    if (amount >= 10000000) { // 1 crore or more
      return Math.round(amount / 1000000) * 1000000; // Round to nearest 10 lakh
    } else if (amount >= 1000000) { // 10 lakh or more
      return Math.round(amount / 100000) * 100000; // Round to nearest 1 lakh
    } else if (amount >= 100000) { // 1 lakh or more
      return Math.round(amount / 10000) * 10000; // Round to nearest 10k
    } else {
      return Math.round(amount / 1000) * 1000; // Round to nearest 1k
    }
  }

  /**
   * Determine risk level based on credit assessment
   * @param assessment - Credit assessment
   * @returns Risk level (1-10)
   */
  private determineRiskLevel(assessment: CreditAssessment): number {
    const creditScore = assessment.scoreValue;
    
    // Convert credit score (0-100) to risk level (1-10, where 10 is highest risk)
    return Math.max(1, Math.min(10, Math.round(11 - (creditScore / 10))));
  }

  /**
   * Calculate review date based on risk level
   * @param riskLevel - Risk level (1-10)
   * @returns Review date
   */
  private calculateReviewDate(riskLevel: number): Date {
    const reviewDate = new Date();
    
    // Higher risk means more frequent reviews
    if (riskLevel >= 8) {
      reviewDate.setMonth(reviewDate.getMonth() + 3); // 3 months
    } else if (riskLevel >= 6) {
      reviewDate.setMonth(reviewDate.getMonth() + 6); // 6 months
    } else if (riskLevel >= 4) {
      reviewDate.setMonth(reviewDate.getMonth() + 9); // 9 months
    } else {
      reviewDate.setFullYear(reviewDate.getFullYear() + 1); // 1 year
    }
    
    return reviewDate;
  }
}
