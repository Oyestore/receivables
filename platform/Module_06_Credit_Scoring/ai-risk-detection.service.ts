import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskIndicator } from '../entities/risk-indicator.entity';
import { RiskLevel } from '../enums/risk-level.enum';
import { CreditAssessment } from '../entities/credit-assessment.entity';
import { BuyerProfile } from '../entities/buyer-profile.entity';
import { PaymentHistory } from '../entities/payment-history.entity';

/**
 * Service for AI-powered risk detection with optional DeepSeek R1 integration
 * This service provides advanced risk detection capabilities using AI models
 * with fallback to traditional methods when AI is not available
 */
@Injectable()
export class AiRiskDetectionService {
  private readonly logger = new Logger(AiRiskDetectionService.name);
  private readonly isDeepSeekEnabled: boolean;
  private readonly deepSeekApiKey: string;
  private readonly deepSeekEndpoint: string;
  private readonly modelVersion: string;
  private readonly confidenceThreshold: number;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(RiskIndicator)
    private riskIndicatorRepository: Repository<RiskIndicator>,
    @Optional() private readonly deepSeekConnector?: any, // Placeholder for DeepSeek connector
  ) {
    // Load configuration
    this.isDeepSeekEnabled = this.configService.get<boolean>('ai.deepseek.enabled', false);
    this.deepSeekApiKey = this.configService.get<string>('ai.deepseek.apiKey', '');
    this.deepSeekEndpoint = this.configService.get<string>('ai.deepseek.endpoint', '');
    this.modelVersion = this.configService.get<string>('ai.deepseek.modelVersion', 'latest');
    this.confidenceThreshold = this.configService.get<number>('ai.confidenceThreshold', 0.7);
    
    this.logger.log(`AI Risk Detection Service initialized. DeepSeek enabled: ${this.isDeepSeekEnabled}`);
  }

  /**
   * Detect risks using AI with fallback to traditional methods
   * @param buyerId The ID of the buyer to analyze
   * @param tenantId The tenant ID for multi-tenancy support
   * @returns Array of detected risk indicators
   */
  async detectRisks(buyerId: string, tenantId: string): Promise<RiskIndicator[]> {
    this.logger.log(`Detecting risks for buyer ${buyerId} in tenant ${tenantId}`);
    
    try {
      // Check if DeepSeek is enabled and available
      if (this.isDeepSeekEnabled && this.deepSeekConnector) {
        return await this.detectRisksWithAI(buyerId, tenantId);
      } else {
        this.logger.log('DeepSeek not enabled or connector not available, using fallback method');
        return await this.detectRisksWithFallback(buyerId, tenantId);
      }
    } catch (error) {
      this.logger.error(`Error in risk detection: ${error.message}`, error.stack);
      // Fallback to traditional methods in case of AI failure
      return await this.detectRisksWithFallback(buyerId, tenantId);
    }
  }

  /**
   * Detect risks using DeepSeek R1 AI model
   * @param buyerId The ID of the buyer to analyze
   * @param tenantId The tenant ID for multi-tenancy support
   * @returns Array of detected risk indicators
   */
  private async detectRisksWithAI(buyerId: string, tenantId: string): Promise<RiskIndicator[]> {
    this.logger.log(`Using DeepSeek R1 for risk detection for buyer ${buyerId}`);
    
    try {
      // Gather data for AI analysis
      const buyerData = await this.gatherBuyerData(buyerId, tenantId);
      
      // Prepare input for DeepSeek model
      const modelInput = this.prepareModelInput(buyerData);
      
      // Call DeepSeek R1 model
      const aiResponse = await this.callDeepSeekModel(modelInput);
      
      // Process AI response
      const riskIndicators = this.processAIResponse(aiResponse, buyerId, tenantId);
      
      this.logger.log(`AI detected ${riskIndicators.length} risk indicators for buyer ${buyerId}`);
      return riskIndicators;
    } catch (error) {
      this.logger.error(`Error in AI risk detection: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Fallback method for risk detection using traditional algorithms
   * @param buyerId The ID of the buyer to analyze
   * @param tenantId The tenant ID for multi-tenancy support
   * @returns Array of detected risk indicators
   */
  private async detectRisksWithFallback(buyerId: string, tenantId: string): Promise<RiskIndicator[]> {
    this.logger.log(`Using fallback method for risk detection for buyer ${buyerId}`);
    
    try {
      // Gather data for analysis
      const buyerData = await this.gatherBuyerData(buyerId, tenantId);
      
      // Apply traditional risk detection algorithms
      const riskIndicators: RiskIndicator[] = [];
      
      // Check for payment delays
      if (buyerData.paymentHistory && buyerData.paymentHistory.length > 0) {
        const paymentDelays = this.analyzePaymentDelays(buyerData.paymentHistory);
        if (paymentDelays.hasSignificantDelays) {
          riskIndicators.push(this.createRiskIndicator(
            buyerId,
            tenantId,
            'PAYMENT_DELAY',
            'Significant payment delays detected',
            paymentDelays.averageDelay > 30 ? RiskLevel.HIGH : RiskLevel.MEDIUM,
            { averageDelay: paymentDelays.averageDelay, delayFrequency: paymentDelays.frequency }
          ));
        }
      }
      
      // Check for credit score deterioration
      if (buyerData.creditAssessments && buyerData.creditAssessments.length >= 2) {
        const scoreDeterioration = this.analyzeCreditScoreDeterioration(buyerData.creditAssessments);
        if (scoreDeterioration.hasDeterioration) {
          riskIndicators.push(this.createRiskIndicator(
            buyerId,
            tenantId,
            'SCORE_DETERIORATION',
            'Credit score deterioration detected',
            scoreDeterioration.deteriorationPercent > 15 ? RiskLevel.HIGH : RiskLevel.MEDIUM,
            { deteriorationPercent: scoreDeterioration.deteriorationPercent }
          ));
        }
      }
      
      // Check for high credit utilization
      if (buyerData.creditUtilization && buyerData.creditUtilization > 0.8) {
        riskIndicators.push(this.createRiskIndicator(
          buyerId,
          tenantId,
          'HIGH_UTILIZATION',
          'High credit utilization detected',
          buyerData.creditUtilization > 0.9 ? RiskLevel.HIGH : RiskLevel.MEDIUM,
          { utilizationRatio: buyerData.creditUtilization }
        ));
      }
      
      this.logger.log(`Fallback method detected ${riskIndicators.length} risk indicators for buyer ${buyerId}`);
      return riskIndicators;
    } catch (error) {
      this.logger.error(`Error in fallback risk detection: ${error.message}`, error.stack);
      return []; // Return empty array in case of error
    }
  }

  /**
   * Gather all relevant data for a buyer
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID for multi-tenancy support
   * @returns Consolidated buyer data for analysis
   */
  private async gatherBuyerData(buyerId: string, tenantId: string): Promise<any> {
    // This would be implemented to gather data from various repositories
    // For now, we'll return mock data
    return {
      buyerProfile: { id: buyerId, tenantId },
      creditAssessments: [
        { score: 75, date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        { score: 70, date: new Date() }
      ],
      paymentHistory: [
        { dueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), paymentDate: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000) },
        { dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), paymentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) }
      ],
      creditUtilization: 0.85
    };
  }

  /**
   * Prepare input for DeepSeek model
   * @param buyerData Consolidated buyer data
   * @returns Formatted input for the AI model
   */
  private prepareModelInput(buyerData: any): any {
    // Transform buyer data into format expected by DeepSeek
    return {
      buyer_profile: {
        id: buyerData.buyerProfile.id,
        // Add other relevant profile fields
      },
      credit_history: buyerData.creditAssessments.map(assessment => ({
        score: assessment.score,
        date: assessment.date.toISOString()
      })),
      payment_history: buyerData.paymentHistory.map(payment => ({
        due_date: payment.dueDate.toISOString(),
        payment_date: payment.paymentDate.toISOString(),
        days_late: this.calculateDaysDifference(payment.dueDate, payment.paymentDate)
      })),
      credit_utilization: buyerData.creditUtilization
    };
  }

  /**
   * Call DeepSeek R1 model for risk analysis
   * @param modelInput Formatted input for the model
   * @returns Raw model response
   */
  private async callDeepSeekModel(modelInput: any): Promise<any> {
    // This would be implemented to call the actual DeepSeek API
    // For now, we'll return mock response
    this.logger.log('Calling DeepSeek model (mock implementation)');
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      risk_indicators: [
        {
          type: 'PAYMENT_PATTERN',
          description: 'Increasing payment delays detected',
          risk_level: 'HIGH',
          confidence: 0.85,
          details: {
            trend: 'increasing',
            average_delay: 12.5
          }
        },
        {
          type: 'CREDIT_DETERIORATION',
          description: 'Credit score declining over time',
          risk_level: 'MEDIUM',
          confidence: 0.78,
          details: {
            decline_rate: 0.07,
            months_declining: 3
          }
        }
      ]
    };
  }

  /**
   * Process AI response into risk indicators
   * @param aiResponse Raw response from AI model
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID for multi-tenancy support
   * @returns Array of risk indicators
   */
  private processAIResponse(aiResponse: any, buyerId: string, tenantId: string): RiskIndicator[] {
    const riskIndicators: RiskIndicator[] = [];
    
    if (aiResponse && aiResponse.risk_indicators && Array.isArray(aiResponse.risk_indicators)) {
      for (const indicator of aiResponse.risk_indicators) {
        // Only include indicators with confidence above threshold
        if (indicator.confidence >= this.confidenceThreshold) {
          riskIndicators.push(this.createRiskIndicator(
            buyerId,
            tenantId,
            indicator.type,
            indicator.description,
            this.mapRiskLevel(indicator.risk_level),
            indicator.details,
            indicator.confidence
          ));
        }
      }
    }
    
    return riskIndicators;
  }

  /**
   * Create a new risk indicator entity
   */
  private createRiskIndicator(
    buyerId: string,
    tenantId: string,
    type: string,
    description: string,
    riskLevel: RiskLevel,
    details: any,
    confidence: number = 1.0
  ): RiskIndicator {
    const indicator = new RiskIndicator();
    indicator.buyerId = buyerId;
    indicator.tenantId = tenantId;
    indicator.type = type;
    indicator.description = description;
    indicator.riskLevel = riskLevel;
    indicator.details = details;
    indicator.confidence = confidence;
    indicator.detectionMethod = this.isDeepSeekEnabled ? 'AI' : 'TRADITIONAL';
    indicator.detectedAt = new Date();
    
    return indicator;
  }

  /**
   * Analyze payment history for delays
   * @param paymentHistory Array of payment records
   * @returns Analysis of payment delays
   */
  private analyzePaymentDelays(paymentHistory: any[]): { hasSignificantDelays: boolean, averageDelay: number, frequency: number } {
    let totalDelay = 0;
    let delayedPayments = 0;
    
    for (const payment of paymentHistory) {
      const delay = this.calculateDaysDifference(payment.dueDate, payment.paymentDate);
      if (delay > 0) {
        totalDelay += delay;
        delayedPayments++;
      }
    }
    
    const averageDelay = delayedPayments > 0 ? totalDelay / delayedPayments : 0;
    const frequency = paymentHistory.length > 0 ? delayedPayments / paymentHistory.length : 0;
    
    return {
      hasSignificantDelays: averageDelay > 7 && frequency > 0.3,
      averageDelay,
      frequency
    };
  }

  /**
   * Analyze credit score deterioration
   * @param creditAssessments Array of credit assessments
   * @returns Analysis of credit score deterioration
   */
  private analyzeCreditScoreDeterioration(creditAssessments: any[]): { hasDeterioration: boolean, deteriorationPercent: number } {
    // Sort assessments by date
    const sortedAssessments = [...creditAssessments].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const oldestScore = sortedAssessments[0].score;
    const newestScore = sortedAssessments[sortedAssessments.length - 1].score;
    
    const deteriorationPercent = oldestScore > 0 ? ((oldestScore - newestScore) / oldestScore) * 100 : 0;
    
    return {
      hasDeterioration: deteriorationPercent > 5,
      deteriorationPercent
    };
  }

  /**
   * Calculate days difference between two dates
   * @param date1 First date
   * @param date2 Second date
   * @returns Number of days between dates
   */
  private calculateDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Map string risk level to enum
   * @param riskLevelString Risk level as string
   * @returns Risk level enum value
   */
  private mapRiskLevel(riskLevelString: string): RiskLevel {
    switch (riskLevelString.toUpperCase()) {
      case 'VERY_LOW':
        return RiskLevel.VERY_LOW;
      case 'LOW':
        return RiskLevel.LOW;
      case 'MEDIUM':
        return RiskLevel.MEDIUM;
      case 'HIGH':
        return RiskLevel.HIGH;
      case 'VERY_HIGH':
        return RiskLevel.VERY_HIGH;
      case 'CRITICAL':
        return RiskLevel.CRITICAL;
      default:
        return RiskLevel.MEDIUM;
    }
  }
}
