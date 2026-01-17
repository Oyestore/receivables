import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { RiskIndicator } from '../entities/risk-indicator.entity';
import { BuyerProfile } from '../entities/buyer-profile.entity';
import { CreditAssessment } from '../entities/credit-assessment.entity';
import { PaymentHistory } from '../entities/payment-history.entity';
import { CreditLimit } from '../entities/credit-limit.entity';
import { RiskLevel } from '../enums/risk-level.enum';

/**
 * Service responsible for monitoring and detecting risk indicators.
 * This service provides functionality for identifying potential risks based on various data sources.
 */
@Injectable()
export class RiskIndicatorMonitoringService {
  private readonly logger = new Logger(RiskIndicatorMonitoringService.name);

  constructor(
    @InjectRepository(RiskIndicator)
    private riskIndicatorRepository: Repository<RiskIndicator>,
    @InjectRepository(BuyerProfile)
    private buyerProfileRepository: Repository<BuyerProfile>,
    @InjectRepository(CreditAssessment)
    private creditAssessmentRepository: Repository<CreditAssessment>,
    @InjectRepository(PaymentHistory)
    private paymentHistoryRepository: Repository<PaymentHistory>,
    @InjectRepository(CreditLimit)
    private creditLimitRepository: Repository<CreditLimit>,
  ) {}

  /**
   * Monitor buyer for risk indicators
   * @param buyerId - Buyer ID
   * @param tenantId - Tenant ID
   * @returns Array of detected risk indicators
   */
  async monitorBuyer(buyerId: string, tenantId: string): Promise<RiskIndicator[]> {
    this.logger.log(`Monitoring buyer ${buyerId} for risk indicators`);
    
    const detectedIndicators: RiskIndicator[] = [];
    
    // Run all monitoring checks
    const creditScoreIndicators = await this.monitorCreditScoreChanges(buyerId, tenantId);
    const paymentIndicators = await this.monitorPaymentBehavior(buyerId, tenantId);
    const utilizationIndicators = await this.monitorCreditUtilization(buyerId, tenantId);
    const activityIndicators = await this.monitorBuyerActivity(buyerId, tenantId);
    
    // Combine all detected indicators
    detectedIndicators.push(
      ...creditScoreIndicators,
      ...paymentIndicators,
      ...utilizationIndicators,
      ...activityIndicators
    );
    
    // Save all detected indicators
    if (detectedIndicators.length > 0) {
      await this.riskIndicatorRepository.save(detectedIndicators);
    }
    
    return detectedIndicators;
  }

  /**
   * Monitor credit score changes
   * @param buyerId - Buyer ID
   * @param tenantId - Tenant ID
   * @returns Array of detected risk indicators
   */
  private async monitorCreditScoreChanges(buyerId: string, tenantId: string): Promise<RiskIndicator[]> {
    this.logger.log(`Monitoring credit score changes for buyer ${buyerId}`);
    
    const indicators: RiskIndicator[] = [];
    
    // Get the two most recent credit assessments
    const assessments = await this.creditAssessmentRepository.find({
      where: { buyerId, tenantId },
      order: { createdAt: 'DESC' },
      take: 2,
    });
    
    if (assessments.length < 2) {
      // Not enough history for comparison
      return indicators;
    }
    
    const currentAssessment = assessments[0];
    const previousAssessment = assessments[1];
    
    // Check for significant score decrease
    const scoreDifference = currentAssessment.scoreValue - previousAssessment.scoreValue;
    
    if (scoreDifference <= -10) {
      // Significant score decrease (10+ points)
      indicators.push(this.createRiskIndicator({
        buyerId,
        tenantId,
        indicatorType: 'credit_score',
        indicatorName: 'significant_score_decrease',
        description: `Credit score decreased by ${Math.abs(scoreDifference)} points`,
        riskLevel: this.determineScoreDecreaseRiskLevel(scoreDifference),
        indicatorValue: scoreDifference,
        thresholdValue: -10,
        trend: 'decreasing',
        confidenceLevel: 90,
        source: 'credit_assessment',
        sourceReferenceId: currentAssessment.id,
        additionalData: {
          currentScore: currentAssessment.scoreValue,
          previousScore: previousAssessment.scoreValue,
          currentAssessmentId: currentAssessment.id,
          previousAssessmentId: previousAssessment.id,
          assessmentDate: currentAssessment.createdAt,
        },
      }));
    }
    
    // Check for low absolute score
    if (currentAssessment.scoreValue < 40) {
      indicators.push(this.createRiskIndicator({
        buyerId,
        tenantId,
        indicatorType: 'credit_score',
        indicatorName: 'low_credit_score',
        description: `Credit score is below threshold at ${currentAssessment.scoreValue}`,
        riskLevel: this.determineLowScoreRiskLevel(currentAssessment.scoreValue),
        indicatorValue: currentAssessment.scoreValue,
        thresholdValue: 40,
        trend: scoreDifference < 0 ? 'decreasing' : (scoreDifference > 0 ? 'increasing' : 'stable'),
        confidenceLevel: 85,
        source: 'credit_assessment',
        sourceReferenceId: currentAssessment.id,
        additionalData: {
          currentScore: currentAssessment.scoreValue,
          assessmentDate: currentAssessment.createdAt,
        },
      }));
    }
    
    return indicators;
  }

  /**
   * Monitor payment behavior
   * @param buyerId - Buyer ID
   * @param tenantId - Tenant ID
   * @returns Array of detected risk indicators
   */
  private async monitorPaymentBehavior(buyerId: string, tenantId: string): Promise<RiskIndicator[]> {
    this.logger.log(`Monitoring payment behavior for buyer ${buyerId}`);
    
    const indicators: RiskIndicator[] = [];
    
    // Get payment history for the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const paymentHistory = await this.paymentHistoryRepository.find({
      where: { buyerId, tenantId, dueDate: MoreThanOrEqual(ninetyDaysAgo) },
      order: { dueDate: 'DESC' },
    });
    
    if (paymentHistory.length === 0) {
      // No recent payment history
      return indicators;
    }
    
    // Check for late payments
    const latePayments = paymentHistory.filter(payment => payment.daysPastDue > 0);
    const latePaymentPercentage = (latePayments.length / paymentHistory.length) * 100;
    
    if (latePaymentPercentage >= 30) {
      // 30% or more payments are late
      indicators.push(this.createRiskIndicator({
        buyerId,
        tenantId,
        indicatorType: 'payment_behavior',
        indicatorName: 'high_late_payment_percentage',
        description: `${latePaymentPercentage.toFixed(1)}% of recent payments were late`,
        riskLevel: this.determineLatePaymentRiskLevel(latePaymentPercentage),
        indicatorValue: latePaymentPercentage,
        thresholdValue: 30,
        trend: 'increasing', // Assuming increasing risk
        confidenceLevel: 85,
        source: 'payment_history',
        additionalData: {
          totalPayments: paymentHistory.length,
          latePayments: latePayments.length,
          periodDays: 90,
        },
      }));
    }
    
    // Check for very late payments (15+ days)
    const veryLatePayments = paymentHistory.filter(payment => payment.daysPastDue >= 15);
    
    if (veryLatePayments.length > 0) {
      indicators.push(this.createRiskIndicator({
        buyerId,
        tenantId,
        indicatorType: 'payment_behavior',
        indicatorName: 'very_late_payments',
        description: `${veryLatePayments.length} payments were 15+ days past due in the last 90 days`,
        riskLevel: veryLatePayments.length >= 3 ? RiskLevel.HIGH : RiskLevel.MEDIUM,
        indicatorValue: veryLatePayments.length,
        thresholdValue: 1,
        trend: 'increasing', // Assuming increasing risk
        confidenceLevel: 90,
        source: 'payment_history',
        additionalData: {
          totalPayments: paymentHistory.length,
          veryLatePayments: veryLatePayments.length,
          periodDays: 90,
        },
      }));
    }
    
    // Check for increasing days past due trend
    if (paymentHistory.length >= 3) {
      const recentPayments = paymentHistory.slice(0, 3);
      let increasingTrend = true;
      
      for (let i = 0; i < recentPayments.length - 1; i++) {
        if (recentPayments[i].daysPastDue <= recentPayments[i + 1].daysPastDue) {
          increasingTrend = false;
          break;
        }
      }
      
      if (increasingTrend && recentPayments[0].daysPastDue > 0) {
        indicators.push(this.createRiskIndicator({
          buyerId,
          tenantId,
          indicatorType: 'payment_behavior',
          indicatorName: 'increasing_days_past_due',
          description: 'Days past due is increasing across recent payments',
          riskLevel: RiskLevel.MEDIUM,
          trend: 'increasing',
          confidenceLevel: 75,
          source: 'payment_history',
          additionalData: {
            recentPayments: recentPayments.map(p => ({
              id: p.id,
              dueDate: p.dueDate,
              daysPastDue: p.daysPastDue,
            })),
          },
        }));
      }
    }
    
    return indicators;
  }

  /**
   * Monitor credit utilization
   * @param buyerId - Buyer ID
   * @param tenantId - Tenant ID
   * @returns Array of detected risk indicators
   */
  private async monitorCreditUtilization(buyerId: string, tenantId: string): Promise<RiskIndicator[]> {
    this.logger.log(`Monitoring credit utilization for buyer ${buyerId}`);
    
    const indicators: RiskIndicator[] = [];
    
    // Get active credit limit
    const creditLimit = await this.creditLimitRepository.findOne({
      where: { buyerId, tenantId, isActive: true },
    });
    
    if (!creditLimit) {
      // No active credit limit
      return indicators;
    }
    
    // Check for high utilization
    if (creditLimit.utilizationPercentage >= 85) {
      indicators.push(this.createRiskIndicator({
        buyerId,
        tenantId,
        indicatorType: 'credit_utilization',
        indicatorName: 'high_utilization',
        description: `Credit utilization is at ${creditLimit.utilizationPercentage}%`,
        riskLevel: this.determineUtilizationRiskLevel(creditLimit.utilizationPercentage),
        indicatorValue: creditLimit.utilizationPercentage,
        thresholdValue: 85,
        trend: 'increasing', // Assuming increasing risk
        confidenceLevel: 95,
        source: 'credit_limit',
        sourceReferenceId: creditLimit.id,
        additionalData: {
          approvedLimit: creditLimit.approvedLimit,
          currentUtilization: creditLimit.currentUtilization,
          availableCredit: creditLimit.availableCredit,
          currencyCode: creditLimit.currencyCode,
        },
      }));
    }
    
    // Check for rapid utilization increase
    // This would typically involve comparing historical utilization data
    // For simplicity, we're not implementing this check in this example
    
    return indicators;
  }

  /**
   * Monitor buyer activity
   * @param buyerId - Buyer ID
   * @param tenantId - Tenant ID
   * @returns Array of detected risk indicators
   */
  private async monitorBuyerActivity(buyerId: string, tenantId: string): Promise<RiskIndicator[]> {
    this.logger.log(`Monitoring buyer activity for ${buyerId}`);
    
    const indicators: RiskIndicator[] = [];
    
    // Get buyer profile
    const buyerProfile = await this.buyerProfileRepository.findOne({
      where: { buyerId, tenantId },
    });
    
    if (!buyerProfile) {
      // No buyer profile
      return indicators;
    }
    
    // Check for recent changes in business information
    // This would typically involve comparing historical profile data
    // For simplicity, we're not implementing this check in this example
    
    return indicators;
  }

  /**
   * Create a risk indicator
   * @param data - Risk indicator data
   * @returns Risk indicator
   */
  private createRiskIndicator(data: Partial<RiskIndicator>): RiskIndicator {
    return this.riskIndicatorRepository.create({
      ...data,
      detectionDate: new Date(),
      status: 'active',
    });
  }

  /**
   * Determine risk level for score decrease
   * @param scoreDifference - Score difference
   * @returns Risk level
   */
  private determineScoreDecreaseRiskLevel(scoreDifference: number): RiskLevel {
    if (scoreDifference <= -30) {
      return RiskLevel.CRITICAL;
    } else if (scoreDifference <= -20) {
      return RiskLevel.VERY_HIGH;
    } else if (scoreDifference <= -15) {
      return RiskLevel.HIGH;
    } else if (scoreDifference <= -10) {
      return RiskLevel.MEDIUM;
    } else {
      return RiskLevel.LOW;
    }
  }

  /**
   * Determine risk level for low score
   * @param score - Credit score
   * @returns Risk level
   */
  private determineLowScoreRiskLevel(score: number): RiskLevel {
    if (score < 20) {
      return RiskLevel.CRITICAL;
    } else if (score < 30) {
      return RiskLevel.VERY_HIGH;
    } else if (score < 40) {
      return RiskLevel.HIGH;
    } else {
      return RiskLevel.MEDIUM;
    }
  }

  /**
   * Determine risk level for late payment percentage
   * @param percentage - Late payment percentage
   * @returns Risk level
   */
  private determineLatePaymentRiskLevel(percentage: number): RiskLevel {
    if (percentage >= 70) {
      return RiskLevel.CRITICAL;
    } else if (percentage >= 50) {
      return RiskLevel.VERY_HIGH;
    } else if (percentage >= 40) {
      return RiskLevel.HIGH;
    } else if (percentage >= 30) {
      return RiskLevel.MEDIUM;
    } else {
      return RiskLevel.LOW;
    }
  }

  /**
   * Determine risk level for utilization percentage
   * @param percentage - Utilization percentage
   * @returns Risk level
   */
  private determineUtilizationRiskLevel(percentage: number): RiskLevel {
    if (percentage >= 95) {
      return RiskLevel.CRITICAL;
    } else if (percentage >= 90) {
      return RiskLevel.VERY_HIGH;
    } else if (percentage >= 85) {
      return RiskLevel.HIGH;
    } else {
      return RiskLevel.MEDIUM;
    }
  }

  /**
   * Get active risk indicators for a buyer
   * @param buyerId - Buyer ID
   * @param tenantId - Tenant ID
   * @returns Array of active risk indicators
   */
  async getActiveRiskIndicators(buyerId: string, tenantId: string): Promise<RiskIndicator[]> {
    return await this.riskIndicatorRepository.find({
      where: { buyerId, tenantId, status: 'active' },
      order: { detectionDate: 'DESC' },
    });
  }

  /**
   * Acknowledge a risk indicator
   * @param id - Risk indicator ID
   * @param tenantId - Tenant ID
   * @param userId - User ID acknowledging the indicator
   * @returns Updated risk indicator
   */
  async acknowledgeRiskIndicator(id: string, tenantId: string, userId: string): Promise<RiskIndicator> {
    const indicator = await this.riskIndicatorRepository.findOne({
      where: { id, tenantId },
    });
    
    if (!indicator) {
      throw new Error(`Risk indicator with ID ${id} not found`);
    }
    
    indicator.isAcknowledged = true;
    indicator.acknowledgedBy = userId;
    indicator.acknowledgedAt = new Date();
    
    return await this.riskIndicatorRepository.save(indicator);
  }

  /**
   * Resolve a risk indicator
   * @param id - Risk indicator ID
   * @param tenantId - Tenant ID
   * @param resolutionNotes - Resolution notes
   * @param userId - User ID resolving the indicator
   * @returns Updated risk indicator
   */
  async resolveRiskIndicator(
    id: string,
    tenantId: string,
    resolutionNotes: string,
    userId: string,
  ): Promise<RiskIndicator> {
    const indicator = await this.riskIndicatorRepository.findOne({
      where: { id, tenantId },
    });
    
    if (!indicator) {
      throw new Error(`Risk indicator with ID ${id} not found`);
    }
    
    indicator.status = 'resolved';
    indicator.resolutionDate = new Date();
    indicator.resolutionNotes = resolutionNotes;
    
    return await this.riskIndicatorRepository.save(indicator);
  }

  /**
   * Mark a risk indicator as false positive
   * @param id - Risk indicator ID
   * @param tenantId - Tenant ID
   * @param notes - Notes explaining why it's a false positive
   * @param userId - User ID marking the indicator
   * @returns Updated risk indicator
   */
  async markAsFalsePositive(
    id: string,
    tenantId: string,
    notes: string,
    userId: string,
  ): Promise<RiskIndicator> {
    const indicator = await this.riskIndicatorRepository.findOne({
      where: { id, tenantId },
    });
    
    if (!indicator) {
      throw new Error(`Risk indicator with ID ${id} not found`);
    }
    
    indicator.status = 'false_positive';
    indicator.resolutionDate = new Date();
    indicator.resolutionNotes = notes;
    
    return await this.riskIndicatorRepository.save(indicator);
  }
}
