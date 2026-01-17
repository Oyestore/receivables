import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditAssessment } from '../entities/credit-assessment.entity';
import { ScoringModel } from '../entities/scoring-model.entity';
import { BuyerProfile } from '../entities/buyer-profile.entity';
import { PaymentHistory } from '../entities/payment-history.entity';
import { CreditScoreFactor } from '../entities/credit-score-factor.entity';
import { AssessmentDataSource } from '../entities/assessment-data-source.entity';
import { CreateCreditAssessmentDto } from '../dto/create-credit-assessment.dto';
import { UpdateCreditAssessmentDto } from '../dto/update-credit-assessment.dto';
import { CreditAssessmentStatus } from '../enums/credit-assessment-status.enum';
import { ConfidenceLevel } from '../enums/confidence-level.enum';
import { RiskLevel } from '../enums/risk-level.enum';
import { DataSourceType } from '../enums/data-source-type.enum';

/**
 * Service responsible for credit assessment and scoring operations.
 * This is the core service of the Buyer Credit Scoring Module.
 */
@Injectable()
export class CreditAssessmentService {
  private readonly logger = new Logger(CreditAssessmentService.name);

  constructor(
    @InjectRepository(CreditAssessment)
    private creditAssessmentRepository: Repository<CreditAssessment>,
    @InjectRepository(ScoringModel)
    private scoringModelRepository: Repository<ScoringModel>,
    @InjectRepository(BuyerProfile)
    private buyerProfileRepository: Repository<BuyerProfile>,
    @InjectRepository(PaymentHistory)
    private paymentHistoryRepository: Repository<PaymentHistory>,
    @InjectRepository(CreditScoreFactor)
    private creditScoreFactorRepository: Repository<CreditScoreFactor>,
    @InjectRepository(AssessmentDataSource)
    private assessmentDataSourceRepository: Repository<AssessmentDataSource>,
  ) {}

  /**
   * Create a new credit assessment for a buyer
   * @param createCreditAssessmentDto - DTO containing assessment creation data
   * @returns The created credit assessment
   */
  async create(createCreditAssessmentDto: CreateCreditAssessmentDto): Promise<CreditAssessment> {
    this.logger.log(`Creating credit assessment for buyer: ${createCreditAssessmentDto.buyerId}`);
    
    // Create the assessment with initial status
    const assessment = this.creditAssessmentRepository.create({
      ...createCreditAssessmentDto,
      status: CreditAssessmentStatus.PENDING,
    });
    
    // Save the initial assessment
    const savedAssessment = await this.creditAssessmentRepository.save(assessment);
    
    // Start the assessment process asynchronously
    this.processAssessment(savedAssessment.id).catch(error => {
      this.logger.error(`Error processing assessment ${savedAssessment.id}: ${error.message}`, error.stack);
    });
    
    return savedAssessment;
  }

  /**
   * Process a credit assessment
   * @param assessmentId - ID of the assessment to process
   */
  async processAssessment(assessmentId: string): Promise<void> {
    this.logger.log(`Processing credit assessment: ${assessmentId}`);
    
    try {
      // Update status to in progress
      await this.updateStatus(assessmentId, CreditAssessmentStatus.IN_PROGRESS);
      
      // Get the assessment
      const assessment = await this.creditAssessmentRepository.findOne({ where: { id: assessmentId } });
      if (!assessment) {
        throw new Error(`Assessment not found: ${assessmentId}`);
      }
      
      // Get the scoring model
      const scoringModel = await this.getScoringModel(assessment);
      
      // Collect data from various sources
      const dataSources = await this.collectDataSources(assessment);
      
      // Calculate factor scores
      const factorScores = await this.calculateFactorScores(assessment, scoringModel, dataSources);
      
      // Calculate overall score
      const { scoreValue, confidenceLevel, riskLevel } = await this.calculateOverallScore(factorScores, scoringModel);
      
      // Calculate recommended credit limit
      const recommendedCreditLimit = await this.calculateRecommendedCreditLimit(scoreValue, assessment.buyerId, scoringModel);
      
      // Update the assessment with results
      await this.creditAssessmentRepository.update(assessmentId, {
        scoreValue,
        confidenceLevel,
        riskLevel,
        recommendedCreditLimit,
        factorScores,
        dataSources: dataSources.map(ds => ({ 
          sourceType: ds.sourceType, 
          sourceName: ds.sourceName,
          dataQuality: ds.dataQuality
        })),
        status: CreditAssessmentStatus.COMPLETED,
      });
      
      this.logger.log(`Completed credit assessment: ${assessmentId} with score: ${scoreValue}`);
    } catch (error) {
      this.logger.error(`Failed to process assessment ${assessmentId}: ${error.message}`, error.stack);
      await this.updateStatus(assessmentId, CreditAssessmentStatus.FAILED);
    }
  }

  /**
   * Get the appropriate scoring model for an assessment
   * @param assessment - The credit assessment
   * @returns The scoring model to use
   */
  private async getScoringModel(assessment: CreditAssessment): Promise<ScoringModel> {
    // If a specific model version is specified, use it
    if (assessment.modelVersionId) {
      const model = await this.scoringModelRepository.findOne({ 
        where: { id: assessment.modelVersionId, isActive: true } 
      });
      if (model) {
        return model;
      }
    }
    
    // Get buyer profile to determine industry
    const buyerProfile = await this.buyerProfileRepository.findOne({
      where: { buyerId: assessment.buyerId, tenantId: assessment.tenantId }
    });
    
    // Try to find an industry-specific model
    if (buyerProfile?.industryCode) {
      const industryModel = await this.scoringModelRepository.findOne({
        where: {
          tenantId: assessment.tenantId,
          industryCode: buyerProfile.industryCode,
          isActive: true,
          isDefault: true
        }
      });
      
      if (industryModel) {
        return industryModel;
      }
    }
    
    // Fall back to default model
    const defaultModel = await this.scoringModelRepository.findOne({
      where: {
        tenantId: assessment.tenantId,
        industryCode: null,
        isActive: true,
        isDefault: true
      }
    });
    
    if (!defaultModel) {
      throw new Error('No suitable scoring model found');
    }
    
    return defaultModel;
  }

  /**
   * Collect data from various sources for the assessment
   * @param assessment - The credit assessment
   * @returns Array of data sources with collected data
   */
  private async collectDataSources(assessment: CreditAssessment): Promise<AssessmentDataSource[]> {
    const dataSources: AssessmentDataSource[] = [];
    
    // Collect internal payment history
    const paymentHistory = await this.collectPaymentHistory(assessment);
    if (paymentHistory) {
      dataSources.push(paymentHistory);
    }
    
    // Collect buyer profile data
    const profileData = await this.collectBuyerProfileData(assessment);
    if (profileData) {
      dataSources.push(profileData);
    }
    
    // In a real implementation, we would collect data from external sources as well
    // For now, we'll just create placeholder data sources
    
    // Save all data sources to the database
    return await this.assessmentDataSourceRepository.save(dataSources);
  }

  /**
   * Collect payment history data for a buyer
   * @param assessment - The credit assessment
   * @returns Data source with payment history data
   */
  private async collectPaymentHistory(assessment: CreditAssessment): Promise<AssessmentDataSource> {
    // Get payment history for the buyer
    const paymentRecords = await this.paymentHistoryRepository.find({
      where: { buyerId: assessment.buyerId, tenantId: assessment.tenantId }
    });
    
    if (paymentRecords.length === 0) {
      return null;
    }
    
    // Calculate data quality metrics
    const totalRecords = paymentRecords.length;
    const recentRecords = paymentRecords.filter(
      record => record.createdAt > new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) // Last 180 days
    ).length;
    
    const dataQuality = Math.min(100, Math.round((recentRecords / Math.max(1, totalRecords)) * 100));
    const dataCompleteness = 100; // Internal data is considered complete
    const dataFreshness = Math.min(100, Math.round((recentRecords / Math.max(1, Math.min(10, totalRecords))) * 100));
    
    // Create data source
    return this.assessmentDataSourceRepository.create({
      assessmentId: assessment.id,
      tenantId: assessment.tenantId,
      sourceType: DataSourceType.INTERNAL_PAYMENT_HISTORY,
      sourceName: 'Internal Payment Records',
      dataQuality,
      dataCompleteness,
      dataFreshness,
      weight: 50, // Payment history is typically weighted heavily
      sourceMetadata: {
        recordCount: totalRecords,
        recentRecordCount: recentRecords,
        oldestRecord: paymentRecords.reduce((oldest, record) => 
          record.createdAt < oldest ? record.createdAt : oldest, 
          new Date()
        ),
        newestRecord: paymentRecords.reduce((newest, record) => 
          record.createdAt > newest ? record.createdAt : newest, 
          new Date(0)
        ),
      },
      collectedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expires in 30 days
    });
  }

  /**
   * Collect buyer profile data
   * @param assessment - The credit assessment
   * @returns Data source with buyer profile data
   */
  private async collectBuyerProfileData(assessment: CreditAssessment): Promise<AssessmentDataSource> {
    // Get buyer profile
    const buyerProfile = await this.buyerProfileRepository.findOne({
      where: { buyerId: assessment.buyerId, tenantId: assessment.tenantId }
    });
    
    if (!buyerProfile) {
      return null;
    }
    
    // Calculate data quality metrics
    let completenessScore = 0;
    let totalFields = 0;
    
    // Count non-null fields to calculate completeness
    Object.entries(buyerProfile).forEach(([key, value]) => {
      if (!['id', 'createdAt', 'updatedAt', 'tenantId', 'buyerId'].includes(key)) {
        totalFields++;
        if (value !== null && value !== undefined) {
          completenessScore++;
        }
      }
    });
    
    const dataCompleteness = Math.round((completenessScore / Math.max(1, totalFields)) * 100);
    
    // Calculate freshness based on last verified date
    const daysSinceVerification = buyerProfile.lastVerifiedAt 
      ? Math.floor((Date.now() - buyerProfile.lastVerifiedAt.getTime()) / (24 * 60 * 60 * 1000))
      : 365; // Default to a year if never verified
      
    const dataFreshness = Math.max(0, Math.min(100, 100 - Math.round(daysSinceVerification / 3.65))); // Scale to 0-100
    
    // Overall quality is average of completeness and freshness
    const dataQuality = Math.round((dataCompleteness + dataFreshness) / 2);
    
    // Create data source
    return this.assessmentDataSourceRepository.create({
      assessmentId: assessment.id,
      tenantId: assessment.tenantId,
      sourceType: DataSourceType.INTERNAL_PAYMENT_HISTORY,
      sourceName: 'Buyer Profile',
      dataQuality,
      dataCompleteness,
      dataFreshness,
      weight: 20, // Profile data typically weighted less than payment history
      sourceMetadata: {
        lastVerified: buyerProfile.lastVerifiedAt,
        daysSinceVerification,
        businessAge: buyerProfile.yearEstablished 
          ? new Date().getFullYear() - buyerProfile.yearEstablished 
          : null,
      },
      collectedAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Expires in 90 days
    });
  }

  /**
   * Calculate factor scores based on collected data
   * @param assessment - The credit assessment
   * @param scoringModel - The scoring model to use
   * @param dataSources - Collected data sources
   * @returns Object containing factor scores
   */
  private async calculateFactorScores(
    assessment: CreditAssessment,
    scoringModel: ScoringModel,
    dataSources: AssessmentDataSource[]
  ): Promise<Record<string, any>> {
    const factorScores: Record<string, any> = {};
    const factorEntities: CreditScoreFactor[] = [];
    
    // Get factor definitions from the model
    const { factorDefinitions } = scoringModel;
    
    // Process each factor defined in the model
    for (const [factorKey, factorDef] of Object.entries(factorDefinitions)) {
      try {
        // Calculate raw factor value based on data sources
        const rawValue = await this.calculateRawFactorValue(
          factorKey, 
          factorDef as any, 
          assessment, 
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
          assessmentId: assessment.id,
          tenantId: assessment.tenantId,
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
            calculationDetails: {}, // Would contain detailed calculation info in a real implementation
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
    
    // Save all factor entities
    await this.creditScoreFactorRepository.save(factorEntities);
    
    return factorScores;
  }

  /**
   * Calculate raw value for a specific factor
   * @param factorKey - Key identifying the factor
   * @param factorDef - Factor definition from the scoring model
   * @param assessment - The credit assessment
   * @param dataSources - Collected data sources
   * @returns Raw factor value
   */
  private async calculateRawFactorValue(
    factorKey: string,
    factorDef: any,
    assessment: CreditAssessment,
    dataSources: AssessmentDataSource[]
  ): Promise<number> {
    // In a real implementation, this would contain complex logic for each factor type
    // For this example, we'll implement simplified calculations for a few common factors
    
    switch (factorKey) {
      case 'payment_timeliness': {
        // Calculate based on payment history
        const paymentRecords = await this.paymentHistoryRepository.find({
          where: { buyerId: assessment.buyerId, tenantId: assessment.tenantId }
        });
        
        if (paymentRecords.length === 0) {
          return 0; // No payment history
        }
        
        // Calculate average days past due
        const totalDaysPastDue = paymentRecords.reduce(
          (sum, record) => sum + (record.daysPastDue || 0), 
          0
        );
        const avgDaysPastDue = totalDaysPastDue / paymentRecords.length;
        
        // Calculate on-time payment percentage
        const onTimePayments = paymentRecords.filter(
          record => !record.daysPastDue || record.daysPastDue <= 0
        ).length;
        const onTimePercentage = (onTimePayments / paymentRecords.length) * 100;
        
        // Combine metrics (higher is better)
        return Math.max(0, 100 - (avgDaysPastDue * 2) + (onTimePercentage * 0.5));
      }
      
      case 'payment_consistency': {
        // Calculate consistency in payment behavior
        const paymentRecords = await this.paymentHistoryRepository.find({
          where: { buyerId: assessment.buyerId, tenantId: assessment.tenantId }
        });
        
        if (paymentRecords.length < 3) {
          return 50; // Not enough history to determine consistency
        }
        
        // Calculate standard deviation of days past due
        const daysPastDueArray = paymentRecords.map(record => record.daysPastDue || 0);
        const mean = daysPastDueArray.reduce((sum, val) => sum + val, 0) / daysPastDueArray.length;
        const variance = daysPastDueArray.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / daysPastDueArray.length;
        const stdDev = Math.sqrt(variance);
        
        // Lower standard deviation means more consistent payments (higher score)
        return Math.max(0, 100 - (stdDev * 3));
      }
      
      case 'business_longevity': {
        // Calculate based on how long the business has existed
        const buyerProfile = await this.buyerProfileRepository.findOne({
          where: { buyerId: assessment.buyerId, tenantId: assessment.tenantId }
        });
        
        if (!buyerProfile?.yearEstablished) {
          return 50; // Default if unknown
        }
        
        const businessAge = new Date().getFullYear() - buyerProfile.yearEstablished;
        
        // Score increases with age but caps at 20 years
        return Math.min(100, businessAge * 5);
      }
      
      case 'transaction_volume': {
        // Calculate based on number of transactions
        const paymentRecords = await this.paymentHistoryRepository.find({
          where: { buyerId: assessment.buyerId, tenantId: assessment.tenantId }
        });
        
        // More transactions means more data, which is better
        return Math.min(100, paymentRecords.length * 5);
      }
      
      default:
        // For unknown factors, return a neutral value
        return 50;
    }
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
    // In a real implementation, this would generate detailed explanations
    // For this example, we'll use simple templates
    
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
   * Calculate overall score based on factor scores
   * @param factorScores - Object containing factor scores
   * @param scoringModel - The scoring model to use
   * @returns Object with overall score, confidence level, and risk level
   */
  private async calculateOverallScore(
    factorScores: Record<string, any>,
    scoringModel: ScoringModel
  ): Promise<{ scoreValue: number; confidenceLevel: ConfidenceLevel; riskLevel: RiskLevel }> {
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
   * @param buyerId - ID of the buyer
   * @param scoringModel - The scoring model used
   * @returns Recommended credit limit
   */
  private async calculateRecommendedCreditLimit(
    scoreValue: number,
    buyerId: string,
    scoringModel: ScoringModel
  ): Promise<number> {
    // In a real implementation, this would use complex logic based on
    // buyer profile, payment history, industry benchmarks, etc.
    
    // For this example, we'll use a simplified calculation
    
    // Get buyer profile for revenue information
    const buyerProfile = await this.buyerProfileRepository.findOne({
      where: { buyerId }
    });
    
    // Base limit on annual revenue if available
    let baseLimit = 10000; // Default base limit
    
    if (buyerProfile?.annualRevenue) {
      // Set base limit to 10% of annual revenue
      baseLimit = buyerProfile.annualRevenue * 0.1;
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

  /**
   * Update the status of a credit assessment
   * @param assessmentId - ID of the assessment
   * @param status - New status
   */
  private async updateStatus(assessmentId: string, status: CreditAssessmentStatus): Promise<void> {
    await this.creditAssessmentRepository.update(assessmentId, { status });
  }

  /**
   * Find all credit assessments with optional filtering
   * @param tenantId - Tenant ID for filtering
   * @param buyerId - Optional buyer ID for filtering
   * @returns Array of credit assessments
   */
  async findAll(tenantId: string, buyerId?: string): Promise<CreditAssessment[]> {
    const whereClause: any = { tenantId };
    
    if (buyerId) {
      whereClause.buyerId = buyerId;
    }
    
    return this.creditAssessmentRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Find a specific credit assessment by ID
   * @param id - Assessment ID
   * @param tenantId - Tenant ID for security
   * @returns The credit assessment or null if not found
   */
  async findOne(id: string, tenantId: string): Promise<CreditAssessment> {
    return this.creditAssessmentRepository.findOne({
      where: { id, tenantId }
    });
  }

  /**
   * Find the latest credit assessment for a buyer
   * @param buyerId - Buyer ID
   * @param tenantId - Tenant ID
   * @returns The latest credit assessment or null if none exists
   */
  async findLatestForBuyer(buyerId: string, tenantId: string): Promise<CreditAssessment> {
    return this.creditAssessmentRepository.findOne({
      where: { buyerId, tenantId },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Update a credit assessment
   * @param id - Assessment ID
   * @param updateCreditAssessmentDto - DTO with update data
   * @param tenantId - Tenant ID for security
   * @returns The updated credit assessment
   */
  async update(
    id: string,
    updateCreditAssessmentDto: UpdateCreditAssessmentDto,
    tenantId: string
  ): Promise<CreditAssessment> {
    // Verify assessment exists and belongs to tenant
    const assessment = await this.creditAssessmentRepository.findOne({
      where: { id, tenantId }
    });
    
    if (!assessment) {
      throw new Error(`Assessment not found: ${id}`);
    }
    
    // Update the assessment
    await this.creditAssessmentRepository.update(id, updateCreditAssessmentDto);
    
    // Return the updated assessment
    return this.creditAssessmentRepository.findOne({
      where: { id }
    });
  }

  /**
   * Manually override a credit assessment
   * @param id - Assessment ID
   * @param overrideData - Data for the override
   * @param tenantId - Tenant ID for security
   * @param userId - ID of the user performing the override
   * @returns The updated credit assessment
   */
  async manualOverride(
    id: string,
    overrideData: {
      scoreValue?: number;
      riskLevel?: RiskLevel;
      recommendedCreditLimit?: number;
      notes?: string;
    },
    tenantId: string,
    userId: string
  ): Promise<CreditAssessment> {
    // Verify assessment exists and belongs to tenant
    const assessment = await this.creditAssessmentRepository.findOne({
      where: { id, tenantId }
    });
    
    if (!assessment) {
      throw new Error(`Assessment not found: ${id}`);
    }
    
    // Update with override data
    await this.creditAssessmentRepository.update(id, {
      ...overrideData,
      status: CreditAssessmentStatus.OVERRIDDEN,
      updatedBy: userId,
      notes: overrideData.notes ? 
        `[OVERRIDE] ${overrideData.notes}${assessment.notes ? '\n\nPrevious notes: ' + assessment.notes : ''}` : 
        assessment.notes
    });
    
    // Return the updated assessment
    return this.creditAssessmentRepository.findOne({
      where: { id }
    });
  }

  /**
   * Delete a credit assessment
   * @param id - Assessment ID
   * @param tenantId - Tenant ID for security
   */
  async remove(id: string, tenantId: string): Promise<void> {
    // Verify assessment exists and belongs to tenant
    const assessment = await this.creditAssessmentRepository.findOne({
      where: { id, tenantId }
    });
    
    if (!assessment) {
      throw new Error(`Assessment not found: ${id}`);
    }
    
    // Delete the assessment
    await this.creditAssessmentRepository.delete(id);
  }
}
