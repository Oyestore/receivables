import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IndustryRiskProfile } from '../entities/industry-risk-profile.entity';
import { RegionalRiskAdjustment } from '../entities/regional-risk-adjustment.entity';
import { IndustryRiskFactor } from '../entities/industry-risk-factor.entity';
import { IndustryClassificationMapping } from '../entities/industry-classification-mapping.entity';
import { CreditAssessment } from '../entities/credit-assessment.entity';
import { BuyerProfile } from '../entities/buyer-profile.entity';

/**
 * Service responsible for industry-specific credit scoring algorithms.
 * This service provides specialized scoring logic for different industry sectors.
 */
@Injectable()
export class IndustryScoringService {
  private readonly logger = new Logger(IndustryScoringService.name);

  constructor(
    @InjectRepository(IndustryRiskProfile)
    private industryRiskProfileRepository: Repository<IndustryRiskProfile>,
    @InjectRepository(RegionalRiskAdjustment)
    private regionalRiskAdjustmentRepository: Repository<RegionalRiskAdjustment>,
    @InjectRepository(IndustryRiskFactor)
    private industryRiskFactorRepository: Repository<IndustryRiskFactor>,
    @InjectRepository(IndustryClassificationMapping)
    private industryClassificationMappingRepository: Repository<IndustryClassificationMapping>,
    @InjectRepository(BuyerProfile)
    private buyerProfileRepository: Repository<BuyerProfile>,
  ) {}

  /**
   * Apply industry-specific scoring adjustments to a credit assessment
   * @param assessment - Credit assessment to adjust
   * @param buyerProfile - Buyer profile
   * @param tenantId - Tenant ID
   * @returns Adjusted credit assessment score components
   */
  async applyIndustrySpecificScoring(
    assessment: CreditAssessment,
    buyerProfile: BuyerProfile,
    tenantId: string,
  ): Promise<any> {
    this.logger.log(`Applying industry-specific scoring for buyer ${buyerProfile.buyerId}`);
    
    // Get industry information from buyer profile
    const industryCode = buyerProfile.industryCode;
    const regionCode = buyerProfile.regionCode;
    
    if (!industryCode) {
      this.logger.warn(`No industry code found for buyer ${buyerProfile.buyerId}`);
      return {
        originalScore: assessment.scoreValue,
        adjustedScore: assessment.scoreValue,
        adjustments: {},
        industryFactors: {},
        regionalFactors: {},
      };
    }
    
    // Get industry risk profile
    const industryProfile = await this.industryRiskProfileRepository.findOne({
      where: { industryCode, tenantId, isActive: true },
    });
    
    if (!industryProfile) {
      this.logger.warn(`No industry risk profile found for industry code ${industryCode}`);
      return {
        originalScore: assessment.scoreValue,
        adjustedScore: assessment.scoreValue,
        adjustments: {},
        industryFactors: {},
        regionalFactors: {},
      };
    }
    
    // Get regional adjustment if available
    let regionalAdjustment = null;
    if (regionCode) {
      regionalAdjustment = await this.regionalRiskAdjustmentRepository.findOne({
        where: { 
          industryRiskProfileId: industryProfile.id, 
          regionCode, 
          tenantId, 
          isActive: true 
        },
      });
    }
    
    // Get industry risk factors
    const riskFactors = await this.industryRiskFactorRepository.find({
      where: { industryRiskProfileId: industryProfile.id, tenantId, isActive: true },
    });
    
    // Apply industry-specific scoring algorithm based on sector
    const scoringResult = await this.applySectorSpecificAlgorithm(
      assessment,
      industryProfile,
      regionalAdjustment,
      riskFactors,
      buyerProfile,
    );
    
    return scoringResult;
  }

  /**
   * Apply sector-specific scoring algorithm
   * @param assessment - Credit assessment
   * @param industryProfile - Industry risk profile
   * @param regionalAdjustment - Regional risk adjustment
   * @param riskFactors - Industry risk factors
   * @param buyerProfile - Buyer profile
   * @returns Scoring result with adjustments
   */
  private async applySectorSpecificAlgorithm(
    assessment: CreditAssessment,
    industryProfile: IndustryRiskProfile,
    regionalAdjustment: RegionalRiskAdjustment,
    riskFactors: IndustryRiskFactor[],
    buyerProfile: BuyerProfile,
  ): Promise<any> {
    const originalScore = assessment.scoreValue;
    let adjustedScore = originalScore;
    const adjustments = {};
    const industryFactors = {};
    const regionalFactors = {};
    
    // Select algorithm based on industry sector
    switch (industryProfile.industrySector) {
      case 'Manufacturing':
        return this.applyManufacturingSectorAlgorithm(
          assessment, industryProfile, regionalAdjustment, riskFactors, buyerProfile
        );
      
      case 'Retail':
        return this.applyRetailSectorAlgorithm(
          assessment, industryProfile, regionalAdjustment, riskFactors, buyerProfile
        );
      
      case 'Construction':
        return this.applyConstructionSectorAlgorithm(
          assessment, industryProfile, regionalAdjustment, riskFactors, buyerProfile
        );
      
      case 'IT':
        return this.applyITSectorAlgorithm(
          assessment, industryProfile, regionalAdjustment, riskFactors, buyerProfile
        );
      
      case 'Healthcare':
        return this.applyHealthcareSectorAlgorithm(
          assessment, industryProfile, regionalAdjustment, riskFactors, buyerProfile
        );
      
      case 'Agriculture':
        return this.applyAgricultureSectorAlgorithm(
          assessment, industryProfile, regionalAdjustment, riskFactors, buyerProfile
        );
      
      case 'Financial':
        return this.applyFinancialSectorAlgorithm(
          assessment, industryProfile, regionalAdjustment, riskFactors, buyerProfile
        );
      
      default:
        return this.applyDefaultSectorAlgorithm(
          assessment, industryProfile, regionalAdjustment, riskFactors, buyerProfile
        );
    }
  }

  /**
   * Apply manufacturing sector-specific algorithm
   * @param assessment - Credit assessment
   * @param industryProfile - Industry risk profile
   * @param regionalAdjustment - Regional risk adjustment
   * @param riskFactors - Industry risk factors
   * @param buyerProfile - Buyer profile
   * @returns Scoring result with adjustments
   */
  private async applyManufacturingSectorAlgorithm(
    assessment: CreditAssessment,
    industryProfile: IndustryRiskProfile,
    regionalAdjustment: RegionalRiskAdjustment,
    riskFactors: IndustryRiskFactor[],
    buyerProfile: BuyerProfile,
  ): Promise<any> {
    const originalScore = assessment.scoreValue;
    let adjustedScore = originalScore;
    const adjustments = {};
    const industryFactors = {};
    const regionalFactors = {};
    
    // Manufacturing-specific adjustments
    
    // 1. Supply chain complexity adjustment
    const supplyChainComplexity = industryProfile.supplyChainComplexity || 5;
    const supplyChainAdjustment = this.calculateSupplyChainAdjustment(supplyChainComplexity);
    adjustedScore += supplyChainAdjustment;
    adjustments['supplyChainComplexity'] = supplyChainAdjustment;
    industryFactors['supplyChainComplexity'] = supplyChainComplexity;
    
    // 2. Working capital requirements adjustment
    const workingCapitalRequirements = industryProfile.workingCapitalRequirements || 5;
    const workingCapitalAdjustment = this.calculateWorkingCapitalAdjustment(workingCapitalRequirements);
    adjustedScore += workingCapitalAdjustment;
    adjustments['workingCapitalRequirements'] = workingCapitalAdjustment;
    industryFactors['workingCapitalRequirements'] = workingCapitalRequirements;
    
    // 3. Seasonality impact adjustment
    const seasonalityImpact = industryProfile.seasonalityImpact || 5;
    const seasonalityAdjustment = this.calculateSeasonalityAdjustment(seasonalityImpact);
    adjustedScore += seasonalityAdjustment;
    adjustments['seasonalityImpact'] = seasonalityAdjustment;
    industryFactors['seasonalityImpact'] = seasonalityImpact;
    
    // 4. Apply regional adjustments if available
    if (regionalAdjustment) {
      // Infrastructure quality is particularly important for manufacturing
      const infrastructureQuality = regionalAdjustment.infrastructureQuality || 5;
      const infrastructureAdjustment = this.calculateInfrastructureAdjustment(infrastructureQuality);
      adjustedScore += infrastructureAdjustment;
      adjustments['infrastructureQuality'] = infrastructureAdjustment;
      regionalFactors['infrastructureQuality'] = infrastructureQuality;
      
      // Labor market affects manufacturing operations
      const laborMarket = regionalAdjustment.laborMarket || 5;
      const laborMarketAdjustment = this.calculateLaborMarketAdjustment(laborMarket);
      adjustedScore += laborMarketAdjustment;
      adjustments['laborMarket'] = laborMarketAdjustment;
      regionalFactors['laborMarket'] = laborMarket;
    }
    
    // 5. Apply risk factor adjustments
    const factorAdjustments = this.calculateRiskFactorAdjustments(riskFactors);
    adjustedScore += factorAdjustments.totalAdjustment;
    adjustments['riskFactors'] = factorAdjustments.adjustments;
    
    // Ensure score is within valid range (0-100)
    adjustedScore = Math.max(0, Math.min(100, adjustedScore));
    
    return {
      originalScore,
      adjustedScore,
      adjustments,
      industryFactors,
      regionalFactors,
      sectorAlgorithm: 'Manufacturing',
    };
  }

  /**
   * Apply retail sector-specific algorithm
   * @param assessment - Credit assessment
   * @param industryProfile - Industry risk profile
   * @param regionalAdjustment - Regional risk adjustment
   * @param riskFactors - Industry risk factors
   * @param buyerProfile - Buyer profile
   * @returns Scoring result with adjustments
   */
  private async applyRetailSectorAlgorithm(
    assessment: CreditAssessment,
    industryProfile: IndustryRiskProfile,
    regionalAdjustment: RegionalRiskAdjustment,
    riskFactors: IndustryRiskFactor[],
    buyerProfile: BuyerProfile,
  ): Promise<any> {
    const originalScore = assessment.scoreValue;
    let adjustedScore = originalScore;
    const adjustments = {};
    const industryFactors = {};
    const regionalFactors = {};
    
    // Retail-specific adjustments
    
    // 1. Seasonality impact adjustment (higher weight for retail)
    const seasonalityImpact = industryProfile.seasonalityImpact || 5;
    const seasonalityAdjustment = this.calculateSeasonalityAdjustment(seasonalityImpact) * 1.5;
    adjustedScore += seasonalityAdjustment;
    adjustments['seasonalityImpact'] = seasonalityAdjustment;
    industryFactors['seasonalityImpact'] = seasonalityImpact;
    
    // 2. Competitive intensity adjustment
    const competitiveIntensity = industryProfile.competitiveIntensity || 5;
    const competitiveAdjustment = this.calculateCompetitiveIntensityAdjustment(competitiveIntensity);
    adjustedScore += competitiveAdjustment;
    adjustments['competitiveIntensity'] = competitiveAdjustment;
    industryFactors['competitiveIntensity'] = competitiveIntensity;
    
    // 3. Technology disruption risk adjustment
    const techDisruptionRisk = industryProfile.technologyDisruptionRisk || 5;
    const techDisruptionAdjustment = this.calculateTechDisruptionAdjustment(techDisruptionRisk);
    adjustedScore += techDisruptionAdjustment;
    adjustments['technologyDisruptionRisk'] = techDisruptionAdjustment;
    industryFactors['technologyDisruptionRisk'] = techDisruptionRisk;
    
    // 4. Apply regional adjustments if available
    if (regionalAdjustment) {
      // Economic condition is particularly important for retail
      const economicCondition = regionalAdjustment.economicCondition || 5;
      const economicAdjustment = this.calculateEconomicConditionAdjustment(economicCondition) * 1.5;
      adjustedScore += economicAdjustment;
      adjustments['economicCondition'] = economicAdjustment;
      regionalFactors['economicCondition'] = economicCondition;
    }
    
    // 5. Apply risk factor adjustments
    const factorAdjustments = this.calculateRiskFactorAdjustments(riskFactors);
    adjustedScore += factorAdjustments.totalAdjustment;
    adjustments['riskFactors'] = factorAdjustments.adjustments;
    
    // Ensure score is within valid range (0-100)
    adjustedScore = Math.max(0, Math.min(100, adjustedScore));
    
    return {
      originalScore,
      adjustedScore,
      adjustments,
      industryFactors,
      regionalFactors,
      sectorAlgorithm: 'Retail',
    };
  }

  /**
   * Apply construction sector-specific algorithm
   * @param assessment - Credit assessment
   * @param industryProfile - Industry risk profile
   * @param regionalAdjustment - Regional risk adjustment
   * @param riskFactors - Industry risk factors
   * @param buyerProfile - Buyer profile
   * @returns Scoring result with adjustments
   */
  private async applyConstructionSectorAlgorithm(
    assessment: CreditAssessment,
    industryProfile: IndustryRiskProfile,
    regionalAdjustment: RegionalRiskAdjustment,
    riskFactors: IndustryRiskFactor[],
    buyerProfile: BuyerProfile,
  ): Promise<any> {
    const originalScore = assessment.scoreValue;
    let adjustedScore = originalScore;
    const adjustments = {};
    const industryFactors = {};
    const regionalFactors = {};
    
    // Construction-specific adjustments
    
    // 1. Project-based business model adjustment
    const projectBasedRisk = industryProfile.riskFactors?.projectBasedBusiness || 7;
    const projectBasedAdjustment = -1 * (projectBasedRisk - 5);
    adjustedScore += projectBasedAdjustment;
    adjustments['projectBasedBusiness'] = projectBasedAdjustment;
    industryFactors['projectBasedBusiness'] = projectBasedRisk;
    
    // 2. Seasonality impact adjustment
    const seasonalityImpact = industryProfile.seasonalityImpact || 6;
    const seasonalityAdjustment = this.calculateSeasonalityAdjustment(seasonalityImpact) * 1.2;
    adjustedScore += seasonalityAdjustment;
    adjustments['seasonalityImpact'] = seasonalityAdjustment;
    industryFactors['seasonalityImpact'] = seasonalityImpact;
    
    // 3. Regulatory risk adjustment (higher weight for construction)
    const regulatoryRisk = industryProfile.regulatoryRisk || 7;
    const regulatoryAdjustment = this.calculateRegulatoryRiskAdjustment(regulatoryRisk) * 1.5;
    adjustedScore += regulatoryAdjustment;
    adjustments['regulatoryRisk'] = regulatoryAdjustment;
    industryFactors['regulatoryRisk'] = regulatoryRisk;
    
    // 4. Apply regional adjustments if available
    if (regionalAdjustment) {
      // Policy environment is particularly important for construction
      const policyEnvironment = regionalAdjustment.policyEnvironment || 5;
      const policyAdjustment = this.calculatePolicyEnvironmentAdjustment(policyEnvironment) * 1.5;
      adjustedScore += policyAdjustment;
      adjustments['policyEnvironment'] = policyAdjustment;
      regionalFactors['policyEnvironment'] = policyEnvironment;
      
      // Natural disaster risk affects construction projects
      const naturalDisasterRisk = regionalAdjustment.naturalDisasterRisk || 5;
      const disasterRiskAdjustment = this.calculateNaturalDisasterRiskAdjustment(naturalDisasterRisk);
      adjustedScore += disasterRiskAdjustment;
      adjustments['naturalDisasterRisk'] = disasterRiskAdjustment;
      regionalFactors['naturalDisasterRisk'] = naturalDisasterRisk;
    }
    
    // 5. Apply risk factor adjustments
    const factorAdjustments = this.calculateRiskFactorAdjustments(riskFactors);
    adjustedScore += factorAdjustments.totalAdjustment;
    adjustments['riskFactors'] = factorAdjustments.adjustments;
    
    // Ensure score is within valid range (0-100)
    adjustedScore = Math.max(0, Math.min(100, adjustedScore));
    
    return {
      originalScore,
      adjustedScore,
      adjustments,
      industryFactors,
      regionalFactors,
      sectorAlgorithm: 'Construction',
    };
  }

  /**
   * Apply IT sector-specific algorithm
   * @param assessment - Credit assessment
   * @param industryProfile - Industry risk profile
   * @param regionalAdjustment - Regional risk adjustment
   * @param riskFactors - Industry risk factors
   * @param buyerProfile - Buyer profile
   * @returns Scoring result with adjustments
   */
  private async applyITSectorAlgorithm(
    assessment: CreditAssessment,
    industryProfile: IndustryRiskProfile,
    regionalAdjustment: RegionalRiskAdjustment,
    riskFactors: IndustryRiskFactor[],
    buyerProfile: BuyerProfile,
  ): Promise<any> {
    const originalScore = assessment.scoreValue;
    let adjustedScore = originalScore;
    const adjustments = {};
    const industryFactors = {};
    const regionalFactors = {};
    
    // IT-specific adjustments
    
    // 1. Technology disruption risk adjustment (higher weight for IT)
    const techDisruptionRisk = industryProfile.technologyDisruptionRisk || 8;
    const techDisruptionAdjustment = this.calculateTechDisruptionAdjustment(techDisruptionRisk) * 2;
    adjustedScore += techDisruptionAdjustment;
    adjustments['technologyDisruptionRisk'] = techDisruptionAdjustment;
    industryFactors['technologyDisruptionRisk'] = techDisruptionRisk;
    
    // 2. Recurring revenue model adjustment (positive for IT)
    const recurringRevenueModel = industryProfile.riskFactors?.recurringRevenue || 7;
    const recurringRevenueAdjustment = (recurringRevenueModel - 5) * 1.5;
    adjustedScore += recurringRevenueAdjustment;
    adjustments['recurringRevenue'] = recurringRevenueAdjustment;
    industryFactors['recurringRevenue'] = recurringRevenueModel;
    
    // 3. Growth trend adjustment (positive for growing sectors)
    const growthTrend = industryProfile.growthTrend || 20;
    const growthTrendAdjustment = growthTrend / 20;
    adjustedScore += growthTrendAdjustment;
    adjustments['growthTrend'] = growthTrendAdjustment;
    industryFactors['growthTrend'] = growthTrend;
    
    // 4. Apply regional adjustments if available
    if (regionalAdjustment) {
      // Infrastructure quality (especially digital) is important for IT
      const infrastructureQuality = regionalAdjustment.infrastructureQuality || 6;
      const infrastructureAdjustment = this.calculateInfrastructureAdjustment(infrastructureQuality) * 1.5;
      adjustedScore += infrastructureAdjustment;
      adjustments['infrastructureQuality'] = infrastructureAdjustment;
      regionalFactors['infrastructureQuality'] = infrastructureQuality;
      
      // Labor market (talent availability) is critical for IT
      const laborMarket = regionalAdjustment.laborMarket || 6;
      const laborMarketAdjustment = this.calculateLaborMarketAdjustment(laborMarket) * 1.8;
      adjustedScore += laborMarketAdjustment;
      adjustments['laborMarket'] = laborMarketAdjustment;
      regionalFactors['laborMarket'] = laborMarket;
    }
    
    // 5. Apply risk factor adjustments
    const factorAdjustments = this.calculateRiskFactorAdjustments(riskFactors);
    adjustedScore += factorAdjustments.totalAdjustment;
    adjustments['riskFactors'] = factorAdjustments.adjustments;
    
    // Ensure score is within valid range (0-100)
    adjustedScore = Math.max(0, Math.min(100, adjustedScore));
    
    return {
      originalScore,
      adjustedScore,
      adjustments,
      industryFactors,
      regionalFactors,
      sectorAlgorithm: 'IT',
    };
  }

  /**
   * Apply healthcare sector-specific algorithm
   * @param assessment - Credit assessment
   * @param industryProfile - Industry risk profile
   * @param regionalAdjustment - Regional risk adjustment
   * @param riskFactors - Industry risk factors
   * @param buyerProfile - Buyer profile
   * @returns Scoring result with adjustments
   */
  private async applyHealthcareSectorAlgorithm(
    assessment: CreditAssessment,
    industryProfile: IndustryRiskProfile,
    regionalAdjustment: RegionalRiskAdjustment,
    riskFactors: IndustryRiskFactor[],
    buyerProfile: BuyerProfile,
  ): Promise<any> {
    // Implementation similar to other sector algorithms
    // Healthcare-specific adjustments would be applied here
    
    // For brevity, using default algorithm
    return this.applyDefaultSectorAlgorithm(
      assessment, industryProfile, regionalAdjustment, riskFactors, buyerProfile
    );
  }

  /**
   * Apply agriculture sector-specific algorithm
   * @param assessment - Credit assessment
   * @param industryProfile - Industry risk profile
   * @param regionalAdjustment - Regional risk adjustment
   * @param riskFactors - Industry risk factors
   * @param buyerProfile - Buyer profile
   * @returns Scoring result with adjustments
   */
  private async applyAgricultureSectorAlgorithm(
    assessment: CreditAssessment,
    industryProfile: IndustryRiskProfile,
    regionalAdjustment: RegionalRiskAdjustment,
    riskFactors: IndustryRiskFactor[],
    buyerProfile: BuyerProfile,
  ): Promise<any> {
    // Implementation similar to other sector algorithms
    // Agriculture-specific adjustments would be applied here
    
    // For brevity, using default algorithm
    return this.applyDefaultSectorAlgorithm(
      assessment, industryProfile, regionalAdjustment, riskFactors, buyerProfile
    );
  }

  /**
   * Apply financial sector-specific algorithm
   * @param assessment - Credit assessment
   * @param industryProfile - Industry risk profile
   * @param regionalAdjustment - Regional risk adjustment
   * @param riskFactors - Industry risk factors
   * @param buyerProfile - Buyer profile
   * @returns Scoring result with adjustments
   */
  private async applyFinancialSectorAlgorithm(
    assessment: CreditAssessment,
    industryProfile: IndustryRiskProfile,
    regionalAdjustment: RegionalRiskAdjustment,
    riskFactors: IndustryRiskFactor[],
    buyerProfile: BuyerProfile,
  ): Promise<any> {
    // Implementation similar to other sector algorithms
    // Financial-specific adjustments would be applied here
    
    // For brevity, using default algorithm
    return this.applyDefaultSectorAlgorithm(
      assessment, industryProfile, regionalAdjustment, riskFactors, buyerProfile
    );
  }

  /**
   * Apply default sector algorithm for industries without specific algorithms
   * @param assessment - Credit assessment
   * @param industryProfile - Industry risk profile
   * @param regionalAdjustment - Regional risk adjustment
   * @param riskFactors - Industry risk factors
   * @param buyerProfile - Buyer profile
   * @returns Scoring result with adjustments
   */
  private async applyDefaultSectorAlgorithm(
    assessment: CreditAssessment,
    industryProfile: IndustryRiskProfile,
    regionalAdjustment: RegionalRiskAdjustment,
    riskFactors: IndustryRiskFactor[],
    buyerProfile: BuyerProfile,
  ): Promise<any> {
    const originalScore = assessment.scoreValue;
    let adjustedScore = originalScore;
    const adjustments = {};
    const industryFactors = {};
    const regionalFactors = {};
    
    // 1. Base risk level adjustment
    const baseRiskLevel = industryProfile.baseRiskLevel || 5;
    const baseRiskAdjustment = -1 * (baseRiskLevel - 5);
    adjustedScore += baseRiskAdjustment;
    adjustments['baseRiskLevel'] = baseRiskAdjustment;
    industryFactors['baseRiskLevel'] = baseRiskLevel;
    
    // 2. Default rate percentage adjustment
    const defaultRatePercentage = industryProfile.defaultRatePercentage || 2;
    const defaultRateAdjustment = -1 * (defaultRatePercentage - 2);
    adjustedScore += defaultRateAdjustment;
    adjustments['defaultRatePercentage'] = defaultRateAdjustment;
    industryFactors['defaultRatePercentage'] = defaultRatePercentage;
    
    // 3. Growth trend adjustment
    const growthTrend = industryProfile.growthTrend || 0;
    const growthTrendAdjustment = growthTrend / 20;
    adjustedScore += growthTrendAdjustment;
    adjustments['growthTrend'] = growthTrendAdjustment;
    industryFactors['growthTrend'] = growthTrend;
    
    // 4. Apply regional adjustments if available
    if (regionalAdjustment) {
      // Risk level adjustment
      const riskLevelAdjustment = regionalAdjustment.riskLevelAdjustment || 0;
      adjustedScore -= riskLevelAdjustment;
      adjustments['regionalRiskLevel'] = -riskLevelAdjustment;
      regionalFactors['riskLevelAdjustment'] = riskLevelAdjustment;
      
      // Economic condition adjustment
      const economicCondition = regionalAdjustment.economicCondition || 5;
      const economicAdjustment = this.calculateEconomicConditionAdjustment(economicCondition);
      adjustedScore += economicAdjustment;
      adjustments['economicCondition'] = economicAdjustment;
      regionalFactors['economicCondition'] = economicCondition;
    }
    
    // 5. Apply risk factor adjustments
    const factorAdjustments = this.calculateRiskFactorAdjustments(riskFactors);
    adjustedScore += factorAdjustments.totalAdjustment;
    adjustments['riskFactors'] = factorAdjustments.adjustments;
    
    // Ensure score is within valid range (0-100)
    adjustedScore = Math.max(0, Math.min(100, adjustedScore));
    
    return {
      originalScore,
      adjustedScore,
      adjustments,
      industryFactors,
      regionalFactors,
      sectorAlgorithm: 'Default',
    };
  }

  /**
   * Calculate adjustments based on risk factors
   * @param riskFactors - Industry risk factors
   * @returns Total adjustment and individual factor adjustments
   */
  private calculateRiskFactorAdjustments(riskFactors: IndustryRiskFactor[]): any {
    let totalAdjustment = 0;
    const adjustments = {};
    
    riskFactors.forEach(factor => {
      // Calculate adjustment based on risk score and weight
      // Higher risk score means negative adjustment
      const riskScore = factor.riskScore || 5;
      const weight = factor.weight || 1;
      const normalizedWeight = weight / 100;
      
      // Risk score of 5 is neutral, deviation from 5 creates adjustment
      const adjustment = -1 * (riskScore - 5) * normalizedWeight;
      
      totalAdjustment += adjustment;
      adjustments[factor.factorName] = {
        adjustment,
        riskScore,
        weight: normalizedWeight,
      };
    });
    
    return {
      totalAdjustment,
      adjustments,
    };
  }

  // Helper methods for calculating specific adjustments

  private calculateSupplyChainAdjustment(complexity: number): number {
    // Higher complexity means higher risk, negative adjustment
    return -0.5 * (complexity - 5);
  }

  private calculateWorkingCapitalAdjustment(requirements: number): number {
    // Higher requirements means higher risk, negative adjustment
    return -0.4 * (requirements - 5);
  }

  private calculateSeasonalityAdjustment(impact: number): number {
    // Higher seasonality impact means higher risk, negative adjustment
    return -0.3 * (impact - 5);
  }

  private calculateInfrastructureAdjustment(quality: number): number {
    // Higher quality means lower risk, positive adjustment
    return 0.4 * (quality - 5);
  }

  private calculateLaborMarketAdjustment(rating: number): number {
    // Higher rating means lower risk, positive adjustment
    return 0.3 * (rating - 5);
  }

  private calculateCompetitiveIntensityAdjustment(intensity: number): number {
    // Higher intensity means higher risk, negative adjustment
    return -0.4 * (intensity - 5);
  }

  private calculateTechDisruptionAdjustment(risk: number): number {
    // Higher risk means higher risk, negative adjustment
    return -0.5 * (risk - 5);
  }

  private calculateRegulatoryRiskAdjustment(risk: number): number {
    // Higher risk means higher risk, negative adjustment
    return -0.4 * (risk - 5);
  }

  private calculateEconomicConditionAdjustment(condition: number): number {
    // Higher condition means lower risk, positive adjustment
    return 0.5 * (condition - 5);
  }

  private calculatePolicyEnvironmentAdjustment(environment: number): number {
    // Higher rating means lower risk, positive adjustment
    return 0.4 * (environment - 5);
  }

  private calculateNaturalDisasterRiskAdjustment(risk: number): number {
    // Higher risk means higher risk, negative adjustment
    return -0.3 * (risk - 5);
  }

  /**
   * Find industry classification mapping
   * @param code - Classification code
   * @param system - Classification system
   * @param tenantId - Tenant ID
   * @returns Industry classification mapping or null if not found
   */
  async findIndustryMapping(
    code: string,
    system: string,
    tenantId: string,
  ): Promise<IndustryClassificationMapping> {
    return await this.industryClassificationMappingRepository.findOne({
      where: {
        tenantId,
        isActive: true,
        primarySystem: system,
        primaryCode: code,
      },
    });
  }

  /**
   * Get industry risk profile by classification code
   * @param code - Classification code
   * @param system - Classification system
   * @param tenantId - Tenant ID
   * @returns Industry risk profile or null if not found
   */
  async getIndustryProfileByClassification(
    code: string,
    system: string,
    tenantId: string,
  ): Promise<IndustryRiskProfile> {
    // Find mapping first
    const mapping = await this.findIndustryMapping(code, system, tenantId);
    
    if (!mapping) {
      return null;
    }
    
    // Use internal sector to find risk profile
    const profiles = await this.industryRiskProfileRepository.find({
      where: {
        tenantId,
        isActive: true,
        industrySector: mapping.internalSector,
      },
    });
    
    if (profiles.length === 0) {
      return null;
    }
    
    // If multiple profiles found, use the one with matching sub-sector if available
    if (mapping.internalSubSector) {
      const matchingProfile = profiles.find(p => p.industrySubSector === mapping.internalSubSector);
      if (matchingProfile) {
        return matchingProfile;
      }
    }
    
    // Otherwise return the first profile
    return profiles[0];
  }
}
