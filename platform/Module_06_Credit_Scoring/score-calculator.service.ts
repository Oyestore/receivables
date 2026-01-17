import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoringModel } from '../entities/scoring-model.entity';
import { CreditScoreFactor } from '../entities/credit-score-factor.entity';
import { AssessmentDataSource } from '../entities/assessment-data-source.entity';
import { ConfidenceLevel } from '../enums/confidence-level.enum';
import { RiskLevel } from '../enums/risk-level.enum';

/**
 * Service responsible for calculating credit scores based on collected data.
 * This service implements the core scoring algorithms and factor calculations.
 */
@Injectable()
export class ScoreCalculatorService {
  private readonly logger = new Logger(ScoreCalculatorService.name);

  constructor(
    @InjectRepository(ScoringModel)
    private scoringModelRepository: Repository<ScoringModel>,
    @InjectRepository(CreditScoreFactor)
    private creditScoreFactorRepository: Repository<CreditScoreFactor>,
  ) {}

  /**
   * Calculate factor scores based on collected data
   * @param assessmentId - ID of the assessment
   * @param tenantId - Tenant ID
   * @param scoringModel - The scoring model to use
   * @param dataSources - Collected data sources
   * @returns Object containing factor scores and entities
   */
  async calculateFactorScores(
    assessmentId: string,
    tenantId: string,
    scoringModel: ScoringModel,
    dataSources: AssessmentDataSource[]
  ): Promise<{
    factorScores: Record<string, any>;
    factorEntities: CreditScoreFactor[];
  }> {
    this.logger.log(`Calculating factor scores for assessment ${assessmentId}`);
    
    const factorScores: Record<string, any> = {};
    const factorEntities: CreditScoreFactor[] = [];
    
    // Get factor definitions from the model
    const { factorDefinitions } = scoringModel;
    
    if (!factorDefinitions || Object.keys(factorDefinitions).length === 0) {
      throw new Error('Scoring model has no factor definitions');
    }
    
    // Process each factor defined in the model
    for (const [factorKey, factorDef] of Object.entries(factorDefinitions)) {
      try {
        this.logger.debug(`Calculating factor: ${factorKey}`);
        
        // Calculate raw factor value based on data sources
        const rawValue = await this.calculateRawFactorValue(
          factorKey, 
          factorDef as any, 
          dataSources
        );
        
        // Normalize the raw value to the factor's scale
        const normalizedValue = this.normalizeFactorValue(
          rawValue,
          factorDef as any
        );
        
        // Calculate the contribution to the overall score
        const weight = (factorDef as any).weight || 0;
        const contribution = (normalizedValue * weight) / 100;
        
        // Determine impact direction
        const impactDirection = normalizedValue >= 50 ? 'positive' : 'negative';
        
        // Create factor entity
        const factorEntity = this.creditScoreFactorRepository.create({
          assessmentId,
          tenantId,
          name: (factorDef as any).name || factorKey,
          description: (factorDef as any).description || '',
          category: (factorDef as any).category || 'general',
          rawValue,
          normalizedValue,
          weight,
          contribution,
          impactDirection,
          explanation: this.generateFactorExplanation(factorKey, normalizedValue, factorDef as any),
          factorData: {
            definition: factorDef,
            calculationDetails: {
              dataSourcesUsed: this.getDataSourcesUsedForFactor(factorKey, dataSources),
              calculationMethod: (factorDef as any).calculationMethod || 'standard',
            },
          }
        });
        
        factorEntities.push(factorEntity);
        
        // Add to factor scores object
        factorScores[factorKey] = {
          name: factorEntity.name,
          normalizedValue,
          weight,
          contribution,
          impactDirection,
        };
      } catch (error) {
        this.logger.warn(`Error calculating factor ${factorKey}: ${error.message}`);
        // Add failed factor with zero values
        factorScores[factorKey] = {
          name: (factorDef as any).name || factorKey,
          normalizedValue: 0,
          weight: (factorDef as any).weight || 0,
          contribution: 0,
          impactDirection: 'negative',
          error: error.message,
        };
      }
    }
    
    return { factorScores, factorEntities };
  }

  /**
   * Calculate raw value for a specific factor
   * @param factorKey - Key identifying the factor
   * @param factorDef - Factor definition from the scoring model
   * @param dataSources - Collected data sources
   * @returns Raw factor value
   */
  private async calculateRawFactorValue(
    factorKey: string,
    factorDef: any,
    dataSources: AssessmentDataSource[]
  ): Promise<number> {
    // Get the calculation method from the factor definition
    const calculationMethod = factorDef.calculationMethod || 'standard';
    
    // Get data sources relevant to this factor
    const relevantDataSources = this.getRelevantDataSources(factorKey, factorDef, dataSources);
    
    if (relevantDataSources.length === 0) {
      this.logger.warn(`No relevant data sources found for factor ${factorKey}`);
      return factorDef.defaultValue || 50; // Use default value if no data available
    }
    
    // Calculate based on factor type
    switch (factorKey) {
      case 'payment_timeliness':
        return this.calculatePaymentTimelinessFactor(relevantDataSources);
      
      case 'payment_consistency':
        return this.calculatePaymentConsistencyFactor(relevantDataSources);
      
      case 'business_longevity':
        return this.calculateBusinessLongevityFactor(relevantDataSources);
      
      case 'transaction_volume':
        return this.calculateTransactionVolumeFactor(relevantDataSources);
      
      case 'industry_risk':
        return this.calculateIndustryRiskFactor(relevantDataSources);
      
      case 'financial_stability':
        return this.calculateFinancialStabilityFactor(relevantDataSources);
      
      case 'geographic_risk':
        return this.calculateGeographicRiskFactor(relevantDataSources);
      
      default:
        // For unknown factors, use a generic calculation method
        return this.calculateGenericFactor(factorKey, factorDef, relevantDataSources);
    }
  }

  /**
   * Get data sources relevant to a specific factor
   * @param factorKey - Key identifying the factor
   * @param factorDef - Factor definition from the scoring model
   * @param dataSources - All collected data sources
   * @returns Array of relevant data sources
   */
  private getRelevantDataSources(
    factorKey: string,
    factorDef: any,
    dataSources: AssessmentDataSource[]
  ): AssessmentDataSource[] {
    // If factor definition specifies required source types, filter by those
    if (factorDef.requiredSourceTypes && Array.isArray(factorDef.requiredSourceTypes)) {
      return dataSources.filter(ds => 
        factorDef.requiredSourceTypes.includes(ds.sourceType)
      );
    }
    
    // Otherwise, use factor-specific logic to determine relevant sources
    switch (factorKey) {
      case 'payment_timeliness':
      case 'payment_consistency':
      case 'transaction_volume':
        return dataSources.filter(ds => 
          ds.sourceType === 'internal_payment_history' ||
          ds.sourceType === 'banking_data' ||
          ds.sourceType === 'credit_bureau'
        );
      
      case 'business_longevity':
      case 'industry_risk':
        return dataSources.filter(ds => 
          ds.sourceType === 'manual_input' ||
          ds.sourceType === 'government_database' ||
          ds.sourceType === 'industry_association'
        );
      
      case 'financial_stability':
        return dataSources.filter(ds => 
          ds.sourceType === 'financial_statements' ||
          ds.sourceType === 'banking_data' ||
          ds.sourceType === 'credit_bureau'
        );
      
      case 'geographic_risk':
        return dataSources.filter(ds => 
          ds.sourceType === 'manual_input' ||
          ds.sourceType === 'market_intelligence' ||
          ds.sourceType === 'government_database'
        );
      
      default:
        // For unknown factors, return all data sources
        return dataSources;
    }
  }

  /**
   * Calculate payment timeliness factor
   * @param dataSources - Relevant data sources
   * @returns Raw factor value
   */
  private calculatePaymentTimelinessFactor(dataSources: AssessmentDataSource[]): number {
    // Look for payment history data
    const paymentHistorySource = dataSources.find(ds => 
      ds.sourceType === 'internal_payment_history' && 
      ds.sourceMetadata?.averageDaysPastDue !== undefined
    );
    
    if (paymentHistorySource) {
      const { averageDaysPastDue, onTimePaymentPercentage } = paymentHistorySource.sourceMetadata;
      
      // Combine metrics (higher is better)
      return Math.max(0, 100 - (averageDaysPastDue * 2) + (onTimePaymentPercentage * 0.5));
    }
    
    // If no payment history data, check credit bureau data
    const creditBureauSource = dataSources.find(ds => 
      ds.sourceType === 'credit_bureau' && 
      ds.sourceMetadata?.paymentScore !== undefined
    );
    
    if (creditBureauSource) {
      return creditBureauSource.sourceMetadata.paymentScore;
    }
    
    // Default value if no relevant data found
    return 50;
  }

  /**
   * Calculate payment consistency factor
   * @param dataSources - Relevant data sources
   * @returns Raw factor value
   */
  private calculatePaymentConsistencyFactor(dataSources: AssessmentDataSource[]): number {
    // Look for payment history data with standard deviation
    const paymentHistorySource = dataSources.find(ds => 
      ds.sourceType === 'internal_payment_history' && 
      ds.sourceMetadata?.recordCount > 2
    );
    
    if (paymentHistorySource && paymentHistorySource.sourceMetadata?.daysPastDueStdDev !== undefined) {
      // Lower standard deviation means more consistent payments (higher score)
      const stdDev = paymentHistorySource.sourceMetadata.daysPastDueStdDev;
      return Math.max(0, 100 - (stdDev * 3));
    }
    
    // If standard deviation not pre-calculated, use other metrics
    if (paymentHistorySource) {
      const recordCount = paymentHistorySource.sourceMetadata.recordCount;
      const consistencyScore = Math.min(100, recordCount * 5); // More records = more data = better score
      return consistencyScore;
    }
    
    // Default value if no relevant data found
    return 50;
  }

  /**
   * Calculate business longevity factor
   * @param dataSources - Relevant data sources
   * @returns Raw factor value
   */
  private calculateBusinessLongevityFactor(dataSources: AssessmentDataSource[]): number {
    // Look for buyer profile data with business age
    const profileSource = dataSources.find(ds => 
      (ds.sourceType === 'manual_input' || ds.sourceType === 'government_database') && 
      ds.sourceMetadata?.businessAge !== undefined
    );
    
    if (profileSource) {
      const businessAge = profileSource.sourceMetadata.businessAge;
      
      // Score increases with age but caps at 20 years
      return Math.min(100, businessAge * 5);
    }
    
    // Default value if no relevant data found
    return 50;
  }

  /**
   * Calculate transaction volume factor
   * @param dataSources - Relevant data sources
   * @returns Raw factor value
   */
  private calculateTransactionVolumeFactor(dataSources: AssessmentDataSource[]): number {
    // Look for payment history data with record count
    const paymentHistorySource = dataSources.find(ds => 
      ds.sourceType === 'internal_payment_history' && 
      ds.sourceMetadata?.recordCount !== undefined
    );
    
    if (paymentHistorySource) {
      const recordCount = paymentHistorySource.sourceMetadata.recordCount;
      
      // More transactions means more data, which is better
      return Math.min(100, recordCount * 5);
    }
    
    // Default value if no relevant data found
    return 50;
  }

  /**
   * Calculate industry risk factor
   * @param dataSources - Relevant data sources
   * @returns Raw factor value
   */
  private calculateIndustryRiskFactor(dataSources: AssessmentDataSource[]): number {
    // Look for industry data
    const industrySource = dataSources.find(ds => 
      ds.sourceMetadata?.industry !== undefined
    );
    
    if (industrySource) {
      const industry = industrySource.sourceMetadata.industry;
      
      // In a real implementation, this would use industry risk tables
      // For this example, we'll use a simplified approach
      
      // Lower risk industries get higher scores
      const lowRiskIndustries = ['technology', 'healthcare', 'education'];
      const mediumRiskIndustries = ['manufacturing', 'retail', 'services'];
      const highRiskIndustries = ['construction', 'hospitality', 'entertainment'];
      
      if (lowRiskIndustries.some(i => industry.toLowerCase().includes(i))) {
        return 80;
      } else if (mediumRiskIndustries.some(i => industry.toLowerCase().includes(i))) {
        return 60;
      } else if (highRiskIndustries.some(i => industry.toLowerCase().includes(i))) {
        return 40;
      }
    }
    
    // Default value if no relevant data found
    return 50;
  }

  /**
   * Calculate financial stability factor
   * @param dataSources - Relevant data sources
   * @returns Raw factor value
   */
  private calculateFinancialStabilityFactor(dataSources: AssessmentDataSource[]): number {
    // In a real implementation, this would analyze financial statements
    // For this example, we'll use a simplified approach based on available data
    
    // Look for financial data
    const financialSource = dataSources.find(ds => 
      ds.sourceType === 'financial_statements' || 
      (ds.sourceType === 'banking_data' && ds.sourceMetadata?.financialMetrics !== undefined)
    );
    
    if (financialSource) {
      // Use pre-calculated financial stability score if available
      if (financialSource.sourceMetadata?.stabilityScore !== undefined) {
        return financialSource.sourceMetadata.stabilityScore;
      }
      
      // Otherwise, use a default value with slight boost for having financial data
      return 60;
    }
    
    // Default value if no relevant data found
    return 50;
  }

  /**
   * Calculate geographic risk factor
   * @param dataSources - Relevant data sources
   * @returns Raw factor value
   */
  private calculateGeographicRiskFactor(dataSources: AssessmentDataSource[]): number {
    // Look for location data
    const locationSource = dataSources.find(ds => 
      ds.sourceMetadata?.location !== undefined
    );
    
    if (locationSource) {
      const location = locationSource.sourceMetadata.location;
      
      // In a real implementation, this would use geographic risk tables
      // For this example, we'll use a simplified approach for Indian states
      
      // Lower risk regions get higher scores
      const lowRiskRegions = ['maharashtra', 'karnataka', 'gujarat', 'tamil nadu', 'delhi'];
      const mediumRiskRegions = ['telangana', 'uttar pradesh', 'west bengal', 'rajasthan', 'punjab'];
      
      if (location.state && lowRiskRegions.some(r => location.state.toLowerCase().includes(r))) {
        return 80;
      } else if (location.state && mediumRiskRegions.some(r => location.state.toLowerCase().includes(r))) {
        return 60;
      }
    }
    
    // Default value if no relevant data found
    return 50;
  }

  /**
   * Calculate a generic factor when no specific calculation method is defined
   * @param factorKey - Key identifying the factor
   * @param factorDef - Factor definition from the scoring model
   * @param dataSources - Relevant data sources
   * @returns Raw factor value
   */
  private calculateGenericFactor(
    factorKey: string,
    factorDef: any,
    dataSources: AssessmentDataSource[]
  ): number {
    // If factor definition has a default value, use it
    if (factorDef.defaultValue !== undefined) {
      return factorDef.defaultValue;
    }
    
    // Otherwise, return a neutral value
    return 50;
  }

  /**
   * Normalize a raw factor value to the standard scale
   * @param rawValue - Raw calculated value
   * @param factorDef - Factor definition from the scoring model
   * @returns Normalized value (typically 0-100)
   */
  private normalizeFactorValue(rawValue: number, factorDef: any): number {
    // Get min/max from factor definition or use defaults
    const minValue = factorDef.minValue !== undefined ? factorDef.minValue : 0;
    const maxValue = factorDef.maxValue !== undefined ? factorDef.maxValue : 100;
    
    // Normalize to 0-100 scale
    let normalizedValue = ((rawValue - minValue) / (maxValue - minValue)) * 100;
    
    // Ensure value is within bounds
    normalizedValue = Math.max(0, Math.min(100, normalizedValue));
    
    // Round to 2 decimal places
    return Math.round(normalizedValue * 100) / 100;
  }

  /**
   * Generate an explanation for a factor score
   * @param factorKey - Key identifying the factor
   * @param normalizedValue - Normalized factor value
   * @param factorDef - Factor definition from the scoring model
   * @returns Human-readable explanation
   */
  private generateFactorExplanation(factorKey: string, normalizedValue: number, factorDef: any): string {
    // Use custom explanation template if provided in factor definition
    if (factorDef.explanationTemplates) {
      if (normalizedValue >= 80 && factorDef.explanationTemplates.excellent) {
        return factorDef.explanationTemplates.excellent;
      } else if (normalizedValue >= 60 && factorDef.explanationTemplates.good) {
        return factorDef.explanationTemplates.good;
      } else if (normalizedValue >= 40 && factorDef.explanationTemplates.average) {
        return factorDef.explanationTemplates.average;
      } else if (normalizedValue >= 20 && factorDef.explanationTemplates.belowAverage) {
        return factorDef.explanationTemplates.belowAverage;
      } else if (factorDef.explanationTemplates.poor) {
        return factorDef.explanationTemplates.poor;
      }
    }
    
    // Otherwise, use default templates
    const factorName = factorDef.name || factorKey;
    
    if (normalizedValue >= 80) {
      return `${factorName} is excellent, positively impacting your credit score.`;
    } else if (normalizedValue >= 60) {
      return `${factorName} is good, contributing positively to your credit score.`;
    } else if (normalizedValue >= 40) {
      return `${factorName} is average, having a neutral impact on your credit score.`;
    } else if (normalizedValue >= 20) {
      return `${factorName} is below average, negatively affecting your credit score.`;
    } else {
      return `${factorName} is poor, significantly reducing your credit score.`;
    }
  }

  /**
   * Get list of data sources used for a specific factor
   * @param factorKey - Key identifying the factor
   * @param dataSources - All collected data sources
   * @returns Array of data source names used
   */
  private getDataSourcesUsedForFactor(factorKey: string, dataSources: AssessmentDataSource[]): string[] {
    // In a real implementation, this would track which data sources were actually used
    // For this example, we'll return all relevant data sources
    
    const relevantSources = this.getRelevantDataSources(factorKey, {}, dataSources);
    return relevantSources.map(ds => ds.sourceName);
  }

  /**
   * Calculate overall score based on factor scores
   * @param factorScores - Object containing factor scores
   * @param scoringModel - The scoring model to use
   * @returns Object with overall score, confidence level, and risk level
   */
  calculateOverallScore(
    factorScores: Record<string, any>,
    scoringModel: ScoringModel
  ): { scoreValue: number; confidenceLevel: ConfidenceLevel; riskLevel: RiskLevel } {
    this.logger.log('Calculating overall score');
    
    // Calculate weighted sum of factor contributions
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.values(factorScores).forEach(factor => {
      totalScore += (factor.contribution || 0) * 100; // Scale up contributions
      totalWeight += factor.weight || 0;
    });
    
    // Normalize to model's scale
    const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 50;
    
    // Scale to model's min/max range
    const scoreValue = scoringModel.minScore + 
      ((normalizedScore / 100) * (scoringModel.maxScore - scoringModel.minScore));
    
    // Determine confidence level based on data quality
    const confidenceLevel = this.determineConfidenceLevel(factorScores);
    
    // Determine risk level based on score
    const riskLevel = this.determineRiskLevel(normalizedScore);
    
    return {
      scoreValue: Math.round(scoreValue * 100) / 100, // Round to 2 decimal places
      confidenceLevel,
      riskLevel,
    };
  }

  /**
   * Determine confidence level based on factor scores
   * @param factorScores - Object containing factor scores
   * @returns Confidence level enum value
   */
  private determineConfidenceLevel(factorScores: Record<string, any>): ConfidenceLevel {
    // Count factors with errors or missing data
    const totalFactors = Object.keys(factorScores).length;
    const factorsWithErrors = Object.values(factorScores).filter(
      factor => factor.error || factor.normalizedValue === 0
    ).length;
    
    const errorPercentage = (factorsWithErrors / Math.max(1, totalFactors)) * 100;
    
    if (errorPercentage >= 50) {
      return ConfidenceLevel.VERY_LOW;
    } else if (errorPercentage >= 30) {
      return ConfidenceLevel.LOW;
    } else if (errorPercentage >= 15) {
      return ConfidenceLevel.MODERATE;
    } else if (errorPercentage >= 5) {
      return ConfidenceLevel.HIGH;
    } else {
      return ConfidenceLevel.VERY_HIGH;
    }
  }

  /**
   * Determine risk level based on normalized score
   * @param normalizedScore - Normalized score (0-100)
   * @returns Risk level enum value
   */
  private determineRiskLevel(normalizedScore: number): RiskLevel {
    if (normalizedScore >= 90) {
      return RiskLevel.VERY_LOW;
    } else if (normalizedScore >= 75) {
      return RiskLevel.LOW;
    } else if (normalizedScore >= 50) {
      return RiskLevel.MODERATE;
    } else if (normalizedScore >= 25) {
      return RiskLevel.HIGH;
    } else if (normalizedScore >= 10) {
      return RiskLevel.VERY_HIGH;
    } else {
      return RiskLevel.EXTREME;
    }
  }

  /**
   * Calculate recommended credit limit based on score and buyer data
   * @param scoreValue - The calculated credit score
   * @param buyerAnnualRevenue - Annual revenue of the buyer (if available)
   * @param scoringModel - The scoring model used
   * @returns Recommended credit limit
   */
  calculateRecommendedCreditLimit(
    scoreValue: number,
    buyerAnnualRevenue: number | null,
    scoringModel: ScoringModel
  ): number {
    // Base limit on annual revenue if available
    let baseLimit = 10000; // Default base limit
    
    if (buyerAnnualRevenue) {
      // Set base limit to 10% of annual revenue
      baseLimit = buyerAnnualRevenue * 0.1;
    }
    
    // Adjust based on score (normalized to 0-1 scale)
    const normalizedScore = (scoreValue - scoringModel.minScore) / 
      (scoringModel.maxScore - scoringModel.minScore);
    
    // Apply score multiplier (0.1x to 2x)
    const scoreMultiplier = 0.1 + (normalizedScore * 1.9);
    
    // Calculate final limit
    const recommendedLimit = baseLimit * scoreMultiplier;
    
    // Round to nearest 1000
    return Math.round(recommendedLimit / 1000) * 1000;
  }
}
