import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RiskIndicator } from '../entities/risk-indicator.entity';
import { RiskAlert } from '../entities/risk-alert.entity';
import { CreditLimit } from '../entities/credit-limit.entity';
import { PaymentHistory } from '../entities/payment-history.entity';
import { CreditAssessment } from '../entities/credit-assessment.entity';
import { RiskIndicatorMonitoringService } from './risk-indicator-monitoring.service';
import { RiskAlertService } from './risk-alert.service';
import { RiskLevel } from '../enums/risk-level.enum';

/**
 * Service responsible for integrating early warning systems with other modules.
 * This service provides functionality for connecting risk monitoring with credit limit and payment analysis.
 */
@Injectable()
export class EarlyWarningIntegrationService {
  private readonly logger = new Logger(EarlyWarningIntegrationService.name);

  constructor(
    @InjectRepository(RiskIndicator)
    private riskIndicatorRepository: Repository<RiskIndicator>,
    @InjectRepository(RiskAlert)
    private riskAlertRepository: Repository<RiskAlert>,
    @InjectRepository(CreditLimit)
    private creditLimitRepository: Repository<CreditLimit>,
    @InjectRepository(PaymentHistory)
    private paymentHistoryRepository: Repository<PaymentHistory>,
    @InjectRepository(CreditAssessment)
    private creditAssessmentRepository: Repository<CreditAssessment>,
    private riskIndicatorMonitoringService: RiskIndicatorMonitoringService,
    private riskAlertService: RiskAlertService,
  ) {}

  /**
   * Process new credit assessment for risk indicators
   * @param creditAssessmentId - Credit assessment ID
   * @param tenantId - Tenant ID
   * @returns Generated risk indicators and alerts
   */
  async processNewCreditAssessment(
    creditAssessmentId: string,
    tenantId: string,
  ): Promise<any> {
    this.logger.log(`Processing new credit assessment ${creditAssessmentId} for risk indicators`);
    
    // Get credit assessment
    const assessment = await this.creditAssessmentRepository.findOne({
      where: { id: creditAssessmentId, tenantId },
    });
    
    if (!assessment) {
      throw new Error(`Credit assessment with ID ${creditAssessmentId} not found`);
    }
    
    const buyerId = assessment.buyerId;
    
    // Monitor buyer for risk indicators
    const indicators = await this.riskIndicatorMonitoringService.monitorBuyer(buyerId, tenantId);
    
    // Generate alerts from indicators
    const alerts = await this.riskAlertService.generateAlertsFromIndicators(indicators, tenantId);
    
    return {
      indicators,
      alerts,
    };
  }

  /**
   * Process new payment history for risk indicators
   * @param paymentHistoryId - Payment history ID
   * @param tenantId - Tenant ID
   * @returns Generated risk indicators and alerts
   */
  async processNewPaymentHistory(
    paymentHistoryId: string,
    tenantId: string,
  ): Promise<any> {
    this.logger.log(`Processing new payment history ${paymentHistoryId} for risk indicators`);
    
    // Get payment history
    const payment = await this.paymentHistoryRepository.findOne({
      where: { id: paymentHistoryId, tenantId },
    });
    
    if (!payment) {
      throw new Error(`Payment history with ID ${paymentHistoryId} not found`);
    }
    
    const buyerId = payment.buyerId;
    
    // Check for late payment risk indicator
    const indicators: RiskIndicator[] = [];
    
    if (payment.daysPastDue > 0) {
      // Create late payment risk indicator
      const indicator = this.riskIndicatorRepository.create({
        buyerId,
        tenantId,
        indicatorType: 'payment_behavior',
        indicatorName: 'late_payment',
        description: `Payment is ${payment.daysPastDue} days past due`,
        riskLevel: this.determineLatePaymentRiskLevel(payment.daysPastDue),
        indicatorValue: payment.daysPastDue,
        thresholdValue: 0,
        trend: 'increasing',
        confidenceLevel: 95,
        source: 'payment_history',
        sourceReferenceId: paymentHistoryId,
        detectionDate: new Date(),
        status: 'active',
        additionalData: {
          invoiceId: payment.invoiceId,
          invoiceAmount: payment.invoiceAmount,
          dueDate: payment.dueDate,
          currencyCode: payment.currencyCode,
        },
      });
      
      await this.riskIndicatorRepository.save(indicator);
      indicators.push(indicator);
    }
    
    // Monitor buyer for additional risk indicators
    const additionalIndicators = await this.riskIndicatorMonitoringService.monitorBuyer(buyerId, tenantId);
    indicators.push(...additionalIndicators);
    
    // Generate alerts from indicators
    const alerts = await this.riskAlertService.generateAlertsFromIndicators(indicators, tenantId);
    
    return {
      indicators,
      alerts,
    };
  }

  /**
   * Process credit limit changes for risk indicators
   * @param creditLimitId - Credit limit ID
   * @param tenantId - Tenant ID
   * @returns Generated risk indicators and alerts
   */
  async processCreditLimitChange(
    creditLimitId: string,
    tenantId: string,
  ): Promise<any> {
    this.logger.log(`Processing credit limit change ${creditLimitId} for risk indicators`);
    
    // Get credit limit
    const creditLimit = await this.creditLimitRepository.findOne({
      where: { id: creditLimitId, tenantId },
    });
    
    if (!creditLimit) {
      throw new Error(`Credit limit with ID ${creditLimitId} not found`);
    }
    
    const buyerId = creditLimit.buyerId;
    
    // Check for high utilization risk indicator
    const indicators: RiskIndicator[] = [];
    
    if (creditLimit.utilizationPercentage >= 85) {
      // Create high utilization risk indicator
      const indicator = this.riskIndicatorRepository.create({
        buyerId,
        tenantId,
        indicatorType: 'credit_utilization',
        indicatorName: 'high_utilization',
        description: `Credit utilization is at ${creditLimit.utilizationPercentage}%`,
        riskLevel: this.determineUtilizationRiskLevel(creditLimit.utilizationPercentage),
        indicatorValue: creditLimit.utilizationPercentage,
        thresholdValue: 85,
        trend: 'increasing',
        confidenceLevel: 95,
        source: 'credit_limit',
        sourceReferenceId: creditLimitId,
        detectionDate: new Date(),
        status: 'active',
        additionalData: {
          approvedLimit: creditLimit.approvedLimit,
          currentUtilization: creditLimit.currentUtilization,
          availableCredit: creditLimit.availableCredit,
          currencyCode: creditLimit.currencyCode,
        },
      });
      
      await this.riskIndicatorRepository.save(indicator);
      indicators.push(indicator);
    }
    
    // Generate alerts from indicators
    const alerts = await this.riskAlertService.generateAlertsFromIndicators(indicators, tenantId);
    
    return {
      indicators,
      alerts,
    };
  }

  /**
   * Run scheduled risk monitoring for all buyers
   * @param tenantId - Tenant ID
   * @returns Summary of monitoring results
   */
  async runScheduledRiskMonitoring(tenantId: string): Promise<any> {
    this.logger.log(`Running scheduled risk monitoring for tenant ${tenantId}`);
    
    // Get all active credit limits to identify buyers to monitor
    const activeLimits = await this.creditLimitRepository.find({
      where: { tenantId, isActive: true },
    });
    
    const buyerIds = activeLimits.map(limit => limit.buyerId);
    
    // Deduplicate buyer IDs
    const uniqueBuyerIds = [...new Set(buyerIds)];
    
    this.logger.log(`Monitoring ${uniqueBuyerIds.length} buyers for risk indicators`);
    
    const results = {
      totalBuyers: uniqueBuyerIds.length,
      totalIndicators: 0,
      totalAlerts: 0,
      buyersWithIndicators: 0,
      indicatorsByRiskLevel: {
        critical: 0,
        veryHigh: 0,
        high: 0,
        medium: 0,
        low: 0,
        veryLow: 0,
      },
    };
    
    // Process each buyer
    for (const buyerId of uniqueBuyerIds) {
      // Monitor buyer for risk indicators
      const indicators = await this.riskIndicatorMonitoringService.monitorBuyer(buyerId, tenantId);
      
      if (indicators.length > 0) {
        results.buyersWithIndicators++;
        results.totalIndicators += indicators.length;
        
        // Count indicators by risk level
        indicators.forEach(indicator => {
          switch (indicator.riskLevel) {
            case RiskLevel.CRITICAL:
              results.indicatorsByRiskLevel.critical++;
              break;
            case RiskLevel.VERY_HIGH:
              results.indicatorsByRiskLevel.veryHigh++;
              break;
            case RiskLevel.HIGH:
              results.indicatorsByRiskLevel.high++;
              break;
            case RiskLevel.MEDIUM:
              results.indicatorsByRiskLevel.medium++;
              break;
            case RiskLevel.LOW:
              results.indicatorsByRiskLevel.low++;
              break;
            case RiskLevel.VERY_LOW:
              results.indicatorsByRiskLevel.veryLow++;
              break;
          }
        });
        
        // Generate alerts from indicators
        const alerts = await this.riskAlertService.generateAlertsFromIndicators(indicators, tenantId);
        results.totalAlerts += alerts.length;
      }
    }
    
    return results;
  }

  /**
   * Get risk summary for buyer
   * @param buyerId - Buyer ID
   * @param tenantId - Tenant ID
   * @returns Risk summary
   */
  async getBuyerRiskSummary(buyerId: string, tenantId: string): Promise<any> {
    this.logger.log(`Getting risk summary for buyer ${buyerId}`);
    
    // Get active risk indicators
    const activeIndicators = await this.riskIndicatorRepository.find({
      where: { buyerId, tenantId, status: 'active' },
      order: { detectionDate: 'DESC' },
    });
    
    // Get active alerts
    const activeAlerts = await this.riskAlertRepository.find({
      where: { buyerId, tenantId, status: In(['new', 'in_progress']) },
      order: { createdAt: 'DESC' },
    });
    
    // Get credit assessment
    const creditAssessment = await this.creditAssessmentRepository.findOne({
      where: { buyerId, tenantId },
      order: { createdAt: 'DESC' },
    });
    
    // Get credit limit
    const creditLimit = await this.creditLimitRepository.findOne({
      where: { buyerId, tenantId, isActive: true },
    });
    
    // Determine overall risk level
    let overallRiskLevel = RiskLevel.LOW;
    
    if (activeIndicators.length > 0) {
      // Find highest risk level among active indicators
      activeIndicators.forEach(indicator => {
        if (this.getRiskLevelValue(indicator.riskLevel) > this.getRiskLevelValue(overallRiskLevel)) {
          overallRiskLevel = indicator.riskLevel;
        }
      });
    }
    
    // Count indicators by type
    const indicatorsByType = activeIndicators.reduce((acc, indicator) => {
      if (!acc[indicator.indicatorType]) {
        acc[indicator.indicatorType] = 0;
      }
      acc[indicator.indicatorType]++;
      return acc;
    }, {});
    
    return {
      buyerId,
      overallRiskLevel,
      activeIndicatorsCount: activeIndicators.length,
      activeAlertsCount: activeAlerts.length,
      indicatorsByType,
      creditScore: creditAssessment ? creditAssessment.scoreValue : null,
      creditUtilization: creditLimit ? creditLimit.utilizationPercentage : null,
      recentIndicators: activeIndicators.slice(0, 5),
      recentAlerts: activeAlerts.slice(0, 5),
    };
  }

  /**
   * Get risk level value for comparison
   * @param riskLevel - Risk level
   * @returns Numeric value for comparison
   */
  private getRiskLevelValue(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case RiskLevel.VERY_LOW:
        return 1;
      case RiskLevel.LOW:
        return 2;
      case RiskLevel.MEDIUM:
        return 3;
      case RiskLevel.HIGH:
        return 4;
      case RiskLevel.VERY_HIGH:
        return 5;
      case RiskLevel.CRITICAL:
        return 6;
      default:
        return 0;
    }
  }

  /**
   * Determine risk level for late payment
   * @param daysPastDue - Days past due
   * @returns Risk level
   */
  private determineLatePaymentRiskLevel(daysPastDue: number): RiskLevel {
    if (daysPastDue >= 90) {
      return RiskLevel.CRITICAL;
    } else if (daysPastDue >= 60) {
      return RiskLevel.VERY_HIGH;
    } else if (daysPastDue >= 30) {
      return RiskLevel.HIGH;
    } else if (daysPastDue >= 15) {
      return RiskLevel.MEDIUM;
    } else if (daysPastDue >= 7) {
      return RiskLevel.LOW;
    } else {
      return RiskLevel.VERY_LOW;
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
}
