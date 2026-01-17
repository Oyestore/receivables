import {
  SegmentationMethod,
  CustomerSegmentType,
  CustomerBehaviorCategory,
  PredictionConfidence,
  DataQualityLevel,
  PersonalizationLevel,
  AIProcessingStatus,
  LearningAlgorithmType
} from '../../shared/enums/ai-behavioral-analytics.enum';
import {
  CustomerSegmentationInterface,
  PersonalizationEngineInterface
} from '../../shared/interfaces/ai-behavioral-analytics.interface';

/**
 * Customer Segment Entity
 * Represents a customer segment with dynamic characteristics and strategies
 */
export class CustomerSegment {
  public id: string;
  public tenantId: string;
  public segmentName: string;
  public segmentType: CustomerSegmentType;
  public method: SegmentationMethod;
  public description: string;
  public isActive: boolean;
  public segmentCriteria: {
    behavioralCriteria: {
      paymentBehavior: {
        onTimePaymentRate: { min: number; max: number };
        averageDelayDays: { min: number; max: number };
        paymentMethodPreferences: string[];
      };
      transactionBehavior: {
        averageAmount: { min: number; max: number };
        frequency: string[];
        seasonality: Record<string, number>;
      };
      communicationBehavior: {
        responseRate: { min: number; max: number };
        preferredChannels: string[];
        engagementScore: { min: number; max: number };
      };
      riskProfile: {
        overallRiskScore: { min: number; max: number };
        riskCategories: string[];
      };
    };
    demographicCriteria: {
      businessType: string[];
      industry: string[];
      companySize: string[];
      geographicRegion: string[];
      registrationAge: { min: number; max: number }; // in months
    };
    transactionalCriteria: {
      totalTransactionValue: { min: number; max: number };
      transactionCount: { min: number; max: number };
      averageTransactionSize: { min: number; max: number };
      lifetimeValue: { min: number; max: number };
    };
    temporalCriteria: {
      customerAge: { min: number; max: number }; // in months
      lastActivityDays: { min: number; max: number };
      seasonalActivity: Record<string, number>;
    };
  };
  public segmentCharacteristics: {
    size: number;
    averageTransactionValue: number;
    paymentFrequency: string;
    preferredMethods: string[];
    riskLevel: string;
    lifetimeValue: number;
    churnProbability: number;
    growthPotential: number;
    profitability: number;
    engagementLevel: string;
    digitalAdoption: number;
    seasonalityIndex: number;
  };
  public segmentStrategies: {
    communicationStrategy: {
      preferredChannels: string[];
      messageFrequency: string;
      contentType: string;
      personalizationLevel: PersonalizationLevel;
      optimalTiming: Record<string, number>;
    };
    paymentStrategy: {
      recommendedMethods: string[];
      incentiveStructure: Record<string, number>;
      reminderSchedule: string[];
      flexibilityOptions: string[];
    };
    engagementStrategy: {
      touchpointFrequency: string;
      contentStrategy: string;
      rewardPrograms: string[];
      feedbackMechanisms: string[];
    };
    riskMitigationStrategy: {
      monitoringLevel: string;
      interventionTriggers: string[];
      escalationProcedures: string[];
      preventiveMeasures: string[];
    };
    retentionStrategy: {
      loyaltyPrograms: string[];
      valueAddedServices: string[];
      relationshipBuilding: string[];
      churnPrevention: string[];
    };
  };
  public segmentPerformance: {
    conversionRate: number;
    averageResponseTime: number;
    satisfactionScore: number;
    retentionRate: number;
    upsellSuccess: number;
    crossSellSuccess: number;
    costPerAcquisition: number;
    revenuePerCustomer: number;
    profitMargin: number;
    npsScore: number;
  };
  public clusteringMetrics: {
    silhouetteScore: number;
    inertia: number;
    cohesion: number;
    separation: number;
    stability: number;
    interpretability: number;
  };
  public membershipCriteria: {
    strictCriteria: Record<string, any>;
    softCriteria: Record<string, any>;
    weightedScoring: Record<string, number>;
    membershipThreshold: number;
    fuzzyMembership: boolean;
  };
  public dynamicUpdates: {
    lastUpdated: Date;
    updateFrequency: string;
    autoUpdate: boolean;
    triggerConditions: string[];
    membershipChanges: Array<{
      customerId: string;
      changeType: 'ADDED' | 'REMOVED' | 'MIGRATED';
      timestamp: Date;
      reason: string;
      confidence: number;
    }>;
  };
  public validation: {
    statisticalSignificance: number;
    businessRelevance: number;
    actionability: number;
    stability: number;
    interpretability: number;
    overallQuality: number;
  };
  public createdAt: Date;
  public updatedAt: Date;
  public createdBy: string;
  public metadata: Record<string, any>;

  constructor(data: Partial<CustomerSegment>) {
    this.id = data.id || this.generateId();
    this.tenantId = data.tenantId || '';
    this.segmentName = data.segmentName || '';
    this.segmentType = data.segmentType || CustomerSegmentType.MEDIUM_VALUE;
    this.method = data.method || SegmentationMethod.K_MEANS;
    this.description = data.description || '';
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.segmentCriteria = data.segmentCriteria || this.getDefaultCriteria();
    this.segmentCharacteristics = data.segmentCharacteristics || this.getDefaultCharacteristics();
    this.segmentStrategies = data.segmentStrategies || this.getDefaultStrategies();
    this.segmentPerformance = data.segmentPerformance || this.getDefaultPerformance();
    this.clusteringMetrics = data.clusteringMetrics || this.getDefaultClusteringMetrics();
    this.membershipCriteria = data.membershipCriteria || this.getDefaultMembershipCriteria();
    this.dynamicUpdates = data.dynamicUpdates || {
      lastUpdated: new Date(),
      updateFrequency: 'weekly',
      autoUpdate: true,
      triggerConditions: ['significant_behavior_change', 'performance_threshold'],
      membershipChanges: []
    };
    this.validation = data.validation || this.getDefaultValidation();
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.createdBy = data.createdBy || '';
    this.metadata = data.metadata || {};
  }

  private generateId(): string {
    return `seg_${this.segmentType}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  private getDefaultCriteria(): any {
    return {
      behavioralCriteria: {
        paymentBehavior: {
          onTimePaymentRate: { min: 0, max: 100 },
          averageDelayDays: { min: 0, max: 365 },
          paymentMethodPreferences: []
        },
        transactionBehavior: {
          averageAmount: { min: 0, max: 1000000 },
          frequency: [],
          seasonality: {}
        },
        communicationBehavior: {
          responseRate: { min: 0, max: 100 },
          preferredChannels: [],
          engagementScore: { min: 0, max: 100 }
        },
        riskProfile: {
          overallRiskScore: { min: 0, max: 100 },
          riskCategories: []
        }
      },
      demographicCriteria: {
        businessType: [],
        industry: [],
        companySize: [],
        geographicRegion: [],
        registrationAge: { min: 0, max: 120 }
      },
      transactionalCriteria: {
        totalTransactionValue: { min: 0, max: 10000000 },
        transactionCount: { min: 0, max: 1000 },
        averageTransactionSize: { min: 0, max: 1000000 },
        lifetimeValue: { min: 0, max: 10000000 }
      },
      temporalCriteria: {
        customerAge: { min: 0, max: 120 },
        lastActivityDays: { min: 0, max: 365 },
        seasonalActivity: {}
      }
    };
  }

  private getDefaultCharacteristics(): any {
    return {
      size: 0,
      averageTransactionValue: 0,
      paymentFrequency: 'unknown',
      preferredMethods: [],
      riskLevel: 'medium',
      lifetimeValue: 0,
      churnProbability: 0,
      growthPotential: 0,
      profitability: 0,
      engagementLevel: 'medium',
      digitalAdoption: 0,
      seasonalityIndex: 0
    };
  }

  private getDefaultStrategies(): any {
    return {
      communicationStrategy: {
        preferredChannels: [],
        messageFrequency: 'weekly',
        contentType: 'standard',
        personalizationLevel: PersonalizationLevel.BASIC,
        optimalTiming: {}
      },
      paymentStrategy: {
        recommendedMethods: [],
        incentiveStructure: {},
        reminderSchedule: [],
        flexibilityOptions: []
      },
      engagementStrategy: {
        touchpointFrequency: 'monthly',
        contentStrategy: 'standard',
        rewardPrograms: [],
        feedbackMechanisms: []
      },
      riskMitigationStrategy: {
        monitoringLevel: 'standard',
        interventionTriggers: [],
        escalationProcedures: [],
        preventiveMeasures: []
      },
      retentionStrategy: {
        loyaltyPrograms: [],
        valueAddedServices: [],
        relationshipBuilding: [],
        churnPrevention: []
      }
    };
  }

  private getDefaultPerformance(): any {
    return {
      conversionRate: 0,
      averageResponseTime: 0,
      satisfactionScore: 0,
      retentionRate: 0,
      upsellSuccess: 0,
      crossSellSuccess: 0,
      costPerAcquisition: 0,
      revenuePerCustomer: 0,
      profitMargin: 0,
      npsScore: 0
    };
  }

  private getDefaultClusteringMetrics(): any {
    return {
      silhouetteScore: 0,
      inertia: 0,
      cohesion: 0,
      separation: 0,
      stability: 0,
      interpretability: 0
    };
  }

  private getDefaultMembershipCriteria(): any {
    return {
      strictCriteria: {},
      softCriteria: {},
      weightedScoring: {},
      membershipThreshold: 0.7,
      fuzzyMembership: false
    };
  }

  private getDefaultValidation(): any {
    return {
      statisticalSignificance: 0,
      businessRelevance: 0,
      actionability: 0,
      stability: 0,
      interpretability: 0,
      overallQuality: 0
    };
  }

  public evaluateCustomerMembership(customerProfile: any): {
    isMember: boolean;
    membershipScore: number;
    confidence: PredictionConfidence;
    reasons: string[];
  } {
    let score = 0;
    let totalWeight = 0;
    const reasons: string[] = [];

    // Evaluate behavioral criteria
    const behavioralScore = this.evaluateBehavioralCriteria(customerProfile);
    score += behavioralScore.score * 0.4;
    totalWeight += 0.4;
    reasons.push(...behavioralScore.reasons);

    // Evaluate demographic criteria
    const demographicScore = this.evaluateDemographicCriteria(customerProfile);
    score += demographicScore.score * 0.2;
    totalWeight += 0.2;
    reasons.push(...demographicScore.reasons);

    // Evaluate transactional criteria
    const transactionalScore = this.evaluateTransactionalCriteria(customerProfile);
    score += transactionalScore.score * 0.3;
    totalWeight += 0.3;
    reasons.push(...transactionalScore.reasons);

    // Evaluate temporal criteria
    const temporalScore = this.evaluateTemporalCriteria(customerProfile);
    score += temporalScore.score * 0.1;
    totalWeight += 0.1;
    reasons.push(...temporalScore.reasons);

    const membershipScore = totalWeight > 0 ? score / totalWeight : 0;
    const isMember = membershipScore >= this.membershipCriteria.membershipThreshold;

    let confidence: PredictionConfidence;
    if (membershipScore >= 0.9) confidence = PredictionConfidence.VERY_HIGH;
    else if (membershipScore >= 0.8) confidence = PredictionConfidence.HIGH;
    else if (membershipScore >= 0.6) confidence = PredictionConfidence.MEDIUM;
    else if (membershipScore >= 0.4) confidence = PredictionConfidence.LOW;
    else confidence = PredictionConfidence.VERY_LOW;

    return {
      isMember,
      membershipScore,
      confidence,
      reasons
    };
  }

  private evaluateBehavioralCriteria(customerProfile: any): { score: number; reasons: string[] } {
    let score = 0;
    let factors = 0;
    const reasons: string[] = [];

    const criteria = this.segmentCriteria.behavioralCriteria;

    // Payment behavior
    if (customerProfile.paymentBehavior) {
      const paymentScore = this.evaluateRange(
        customerProfile.paymentBehavior.onTimePaymentRate,
        criteria.paymentBehavior.onTimePaymentRate
      );
      score += paymentScore;
      factors++;
      if (paymentScore > 0.7) reasons.push('Strong payment behavior match');
    }

    // Transaction behavior
    if (customerProfile.transactionBehavior) {
      const transactionScore = this.evaluateRange(
        customerProfile.transactionBehavior.averageAmount,
        criteria.transactionBehavior.averageAmount
      );
      score += transactionScore;
      factors++;
      if (transactionScore > 0.7) reasons.push('Transaction behavior aligns with segment');
    }

    // Communication behavior
    if (customerProfile.communicationBehavior) {
      const communicationScore = this.evaluateRange(
        customerProfile.communicationBehavior.responseRate,
        criteria.communicationBehavior.responseRate
      );
      score += communicationScore;
      factors++;
      if (communicationScore > 0.7) reasons.push('Communication patterns match segment');
    }

    return {
      score: factors > 0 ? score / factors : 0,
      reasons
    };
  }

  private evaluateDemographicCriteria(customerProfile: any): { score: number; reasons: string[] } {
    let score = 0;
    let factors = 0;
    const reasons: string[] = [];

    const criteria = this.segmentCriteria.demographicCriteria;

    // Business type
    if (customerProfile.businessType && criteria.businessType.length > 0) {
      if (criteria.businessType.includes(customerProfile.businessType)) {
        score += 1;
        reasons.push(`Business type ${customerProfile.businessType} matches segment`);
      }
      factors++;
    }

    // Industry
    if (customerProfile.industry && criteria.industry.length > 0) {
      if (criteria.industry.includes(customerProfile.industry)) {
        score += 1;
        reasons.push(`Industry ${customerProfile.industry} matches segment`);
      }
      factors++;
    }

    // Geographic region
    if (customerProfile.geographicRegion && criteria.geographicRegion.length > 0) {
      if (criteria.geographicRegion.includes(customerProfile.geographicRegion)) {
        score += 1;
        reasons.push(`Geographic region matches segment`);
      }
      factors++;
    }

    return {
      score: factors > 0 ? score / factors : 0,
      reasons
    };
  }

  private evaluateTransactionalCriteria(customerProfile: any): { score: number; reasons: string[] } {
    let score = 0;
    let factors = 0;
    const reasons: string[] = [];

    const criteria = this.segmentCriteria.transactionalCriteria;

    // Total transaction value
    if (customerProfile.totalTransactionValue !== undefined) {
      const valueScore = this.evaluateRange(
        customerProfile.totalTransactionValue,
        criteria.totalTransactionValue
      );
      score += valueScore;
      factors++;
      if (valueScore > 0.7) reasons.push('Transaction value aligns with segment');
    }

    // Transaction count
    if (customerProfile.transactionCount !== undefined) {
      const countScore = this.evaluateRange(
        customerProfile.transactionCount,
        criteria.transactionCount
      );
      score += countScore;
      factors++;
      if (countScore > 0.7) reasons.push('Transaction frequency matches segment');
    }

    // Lifetime value
    if (customerProfile.lifetimeValue !== undefined) {
      const ltvScore = this.evaluateRange(
        customerProfile.lifetimeValue,
        criteria.lifetimeValue
      );
      score += ltvScore;
      factors++;
      if (ltvScore > 0.7) reasons.push('Lifetime value fits segment profile');
    }

    return {
      score: factors > 0 ? score / factors : 0
(Content truncated due to size limit. Use line ranges to read in chunks)