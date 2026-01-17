/**
 * Dynamic Pricing Entity for Advanced Billing Engine
 * SME Receivables Management Platform - Module 11 Phase 2
 * 
 * Comprehensive entity for AI-powered dynamic pricing with revenue optimization,
 * machine learning algorithms, and real-time pricing adjustments
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  PricingStrategy,
  PricingTier,
  RevenueOptimizationStrategy,
  CurrencyCode,
  BillingCycle,
  PredictionModel,
  ProcessingStatus
} from '@shared/enums/advanced-features.enum';
import {
  PricingConfiguration,
  RevenueOptimizationModel,
  RevenuePrediction,
  OptimizationRecommendation,
  TrainingDataset,
  PredictionFactor
} from '@shared/interfaces/advanced-features.interface';

@Entity('dynamic_pricing_configurations')
@Index(['tenantId', 'isActive'])
@Index(['strategy', 'tier'])
@Index(['validFrom', 'validTo'])
@Index(['createdAt'])
export class DynamicPricingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PricingStrategy,
    default: PricingStrategy.DYNAMIC
  })
  strategy: PricingStrategy;

  @Column({
    type: 'enum',
    enum: PricingTier,
    default: PricingTier.PROFESSIONAL
  })
  tier: PricingTier;

  @Column({
    type: 'enum',
    enum: RevenueOptimizationStrategy,
    default: RevenueOptimizationStrategy.BALANCED
  })
  optimizationStrategy: RevenueOptimizationStrategy;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'base_price' })
  basePrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'min_price' })
  minPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'max_price' })
  maxPrice: number;

  @Column({
    type: 'enum',
    enum: CurrencyCode,
    default: CurrencyCode.USD
  })
  currency: CurrencyCode;

  @Column({
    type: 'enum',
    enum: BillingCycle,
    default: BillingCycle.MONTHLY
  })
  billingCycle: BillingCycle;

  // AI/ML Configuration
  @Column({
    type: 'enum',
    enum: PredictionModel,
    default: PredictionModel.DEEPSEEK_R1,
    name: 'ml_model_type'
  })
  mlModelType: PredictionModel;

  @Column({ type: 'jsonb', name: 'ml_parameters', default: {} })
  mlParameters: Record<string, any>;

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'model_accuracy', default: 0.0 })
  modelAccuracy: number;

  @Column({ type: 'timestamp', name: 'last_trained_at', nullable: true })
  lastTrainedAt: Date;

  @Column({ type: 'timestamp', name: 'next_training_at', nullable: true })
  nextTrainingAt: Date;

  // Pricing Rules and Factors
  @Column({ type: 'jsonb', name: 'pricing_rules', default: [] })
  pricingRules: PricingRule[];

  @Column({ type: 'jsonb', name: 'demand_factors', default: [] })
  demandFactors: DemandFactor[];

  @Column({ type: 'jsonb', name: 'competitive_factors', default: [] })
  competitiveFactors: CompetitiveFactor[];

  @Column({ type: 'jsonb', name: 'seasonal_factors', default: [] })
  seasonalFactors: SeasonalFactor[];

  @Column({ type: 'jsonb', name: 'customer_segments', default: [] })
  customerSegments: CustomerSegment[];

  // Real-time Adjustment Settings
  @Column({ type: 'boolean', name: 'real_time_adjustment', default: true })
  realTimeAdjustment: boolean;

  @Column({ type: 'integer', name: 'adjustment_frequency_minutes', default: 60 })
  adjustmentFrequencyMinutes: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'max_adjustment_percentage', default: 0.20 })
  maxAdjustmentPercentage: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'price_sensitivity', default: 0.15 })
  priceSensitivity: number;

  // Performance Metrics
  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'current_price', default: 0.0 })
  currentPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'average_price', default: 0.0 })
  averagePrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'revenue_impact', default: 0.0 })
  revenueImpact: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'conversion_rate', default: 0.0 })
  conversionRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'churn_rate', default: 0.0 })
  churnRate: number;

  @Column({ type: 'integer', name: 'total_customers', default: 0 })
  totalCustomers: number;

  // A/B Testing Configuration
  @Column({ type: 'boolean', name: 'ab_testing_enabled', default: false })
  abTestingEnabled: boolean;

  @Column({ type: 'jsonb', name: 'ab_test_variants', default: [] })
  abTestVariants: ABTestVariant[];

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'test_traffic_percentage', default: 0.10 })
  testTrafficPercentage: number;

  // Validity and Status
  @Column({ type: 'timestamp', name: 'valid_from' })
  @Index()
  validFrom: Date;

  @Column({ type: 'timestamp', name: 'valid_to', nullable: true })
  @Index()
  validTo: Date;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  @Index()
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: ProcessingStatus,
    default: ProcessingStatus.COMPLETED,
    name: 'processing_status'
  })
  processingStatus: ProcessingStatus;

  @Column({ type: 'text', name: 'processing_errors', nullable: true })
  processingErrors: string;

  // Audit and Metadata
  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @Column({ type: 'uuid', name: 'updated_by' })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Relationships
  @OneToMany(() => PricingHistoryEntity, history => history.pricingConfiguration)
  pricingHistory: PricingHistoryEntity[];

  @OneToMany(() => RevenueOptimizationEntity, optimization => optimization.pricingConfiguration)
  optimizations: RevenueOptimizationEntity[];

  @OneToMany(() => PricingRecommendationEntity, recommendation => recommendation.pricingConfiguration)
  recommendations: PricingRecommendationEntity[];

  // Lifecycle Hooks
  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    this.version = 1;
  }

  @BeforeUpdate()
  updateVersion() {
    this.version += 1;
  }

  // Business Methods
  calculateOptimalPrice(
    demandLevel: number,
    competitorPrices: number[],
    customerSegment: string,
    seasonalMultiplier: number = 1.0
  ): number {
    let optimalPrice = this.basePrice;

    // Apply demand-based adjustment
    const demandAdjustment = this.calculateDemandAdjustment(demandLevel);
    optimalPrice *= (1 + demandAdjustment);

    // Apply competitive adjustment
    const competitiveAdjustment = this.calculateCompetitiveAdjustment(competitorPrices);
    optimalPrice *= (1 + competitiveAdjustment);

    // Apply customer segment adjustment
    const segmentAdjustment = this.calculateSegmentAdjustment(customerSegment);
    optimalPrice *= (1 + segmentAdjustment);

    // Apply seasonal adjustment
    optimalPrice *= seasonalMultiplier;

    // Ensure price stays within bounds
    optimalPrice = Math.max(this.minPrice, Math.min(this.maxPrice, optimalPrice));

    return Math.round(optimalPrice * 100) / 100; // Round to 2 decimal places
  }

  private calculateDemandAdjustment(demandLevel: number): number {
    const demandFactor = this.demandFactors.find(f => 
      demandLevel >= f.minLevel && demandLevel <= f.maxLevel
    );
    
    if (!demandFactor) return 0;

    // Apply price elasticity
    const elasticity = demandFactor.elasticity || -0.5;
    const adjustment = (demandLevel - 1.0) * Math.abs(elasticity) * this.priceSensitivity;
    
    return Math.max(-this.maxAdjustmentPercentage, 
           Math.min(this.maxAdjustmentPercentage, adjustment));
  }

  private calculateCompetitiveAdjustment(competitorPrices: number[]): number {
    if (!competitorPrices || competitorPrices.length === 0) return 0;

    const averageCompetitorPrice = competitorPrices.reduce((sum, price) => sum + price, 0) / competitorPrices.length;
    const currentPriceRatio = this.currentPrice / averageCompetitorPrice;

    const competitiveFactor = this.competitiveFactors.find(f => 
      currentPriceRatio >= f.minRatio && currentPriceRatio <= f.maxRatio
    );

    if (!competitiveFactor) return 0;

    return competitiveFactor.adjustment * this.priceSensitivity;
  }

  private calculateSegmentAdjustment(customerSegment: string): number {
    const segment = this.customerSegments.find(s => s.name === customerSegment);
    return segment ? segment.priceMultiplier - 1.0 : 0;
  }

  updatePerformanceMetrics(
    newRevenue: number,
    newConversionRate: number,
    newChurnRate: number,
    newCustomerCount: number
  ): void {
    this.revenueImpact = newRevenue;
    this.conversionRate = newConversionRate;
    this.churnRate = newChurnRate;
    this.totalCustomers = newCustomerCount;
    
    // Update average price (weighted by customer count)
    if (this.totalCustomers > 0) {
      this.averagePrice = (this.averagePrice * (this.totalCustomers - newCustomerCount) + 
                          this.currentPrice * newCustomerCount) / this.totalCustomers;
    }
  }

  isValidForDate(date: Date): boolean {
    return date >= this.validFrom && (!this.validTo || date <= this.validTo);
  }

  canAdjustPrice(): boolean {
    return this.isActive && 
           this.realTimeAdjustment && 
           this.processingStatus === ProcessingStatus.COMPLETED;
  }

  getOptimizationScore(): number {
    // Calculate optimization score based on multiple factors
    const revenueScore = Math.min(this.revenueImpact / this.basePrice, 2.0) * 0.4;
    const conversionScore = this.conversionRate * 0.3;
    const churnScore = (1 - this.churnRate) * 0.2;
    const accuracyScore = this.modelAccuracy * 0.1;

    return Math.round((revenueScore + conversionScore + churnScore + accuracyScore) * 100);
  }

  toJSON(): PricingConfiguration {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      strategy: this.strategy,
      tier: this.tier,
      basePrice: this.basePrice,
      currency: this.currency,
      billingCycle: this.billingCycle,
      usageMetrics: [], // Will be populated from related entities
      discounts: [], // Will be populated from related entities
      taxes: [], // Will be populated from related entities
      isActive: this.isActive,
      validFrom: this.validFrom,
      validTo: this.validTo,
      metadata: {
        ...this.metadata,
        mlModelType: this.mlModelType,
        modelAccuracy: this.modelAccuracy,
        currentPrice: this.currentPrice,
        optimizationScore: this.getOptimizationScore(),
        lastTrainedAt: this.lastTrainedAt,
        performanceMetrics: {
          revenueImpact: this.revenueImpact,
          conversionRate: this.conversionRate,
          churnRate: this.churnRate,
          totalCustomers: this.totalCustomers
        }
      }
    };
  }
}

// Supporting Entities
@Entity('pricing_history')
@Index(['pricingConfigurationId', 'timestamp'])
export class PricingHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'pricing_configuration_id' })
  pricingConfigurationId: string;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'old_price' })
  oldPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'new_price' })
  newPrice: number;

  @Column({ type: 'varchar', length: 255, name: 'adjustment_reason' })
  adjustmentReason: string;

  @Column({ type: 'jsonb', name: 'adjustment_factors', default: {} })
  adjustmentFactors: Record<string, any>;

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'confidence_score' })
  confidenceScore: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => DynamicPricingEntity, pricing => pricing.pricingHistory)
  @JoinColumn({ name: 'pricing_configuration_id' })
  pricingConfiguration: DynamicPricingEntity;
}

@Entity('revenue_optimizations')
@Index(['pricingConfigurationId', 'createdAt'])
export class RevenueOptimizationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'pricing_configuration_id' })
  pricingConfigurationId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: RevenueOptimizationStrategy
  })
  strategy: RevenueOptimizationStrategy;

  @Column({
    type: 'enum',
    enum: PredictionModel,
    name: 'model_type'
  })
  modelType: PredictionModel;

  @Column({ type: 'jsonb', default: {} })
  parameters: Record<string, any>;

  @Column({ type: 'jsonb', name: 'training_data', default: {} })
  trainingData: TrainingDataset;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0.0 })
  accuracy: number;

  @Column({ type: 'timestamp', name: 'last_trained_at', nullable: true })
  lastTrainedAt: Date;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: [] })
  predictions: RevenuePrediction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => DynamicPricingEntity, pricing => pricing.optimizations)
  @JoinColumn({ name: 'pricing_configuration_id' })
  pricingConfiguration: DynamicPricingEntity;

  toJSON(): RevenueOptimizationModel {
    return {
      id: this.id,
      name: this.name,
      strategy: this.strategy,
      modelType: this.modelType,
      parameters: this.parameters,
      trainingData: this.trainingData,
      accuracy: this.accuracy,
      lastTrainedAt: this.lastTrainedAt,
      isActive: this.isActive,
      predictions: this.predictions
    };
  }
}

@Entity('pricing_recommendations')
@Index(['pricingConfigurationId', 'createdAt'])
export class PricingRecommendationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'pricing_configuration_id' })
  pricingConfigurationId: string;

  @Column({ type: 'varchar', length: 100 })
  type: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 4, name: 'expected_impact' })
  expectedImpact: number;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  confidence: number;

  @Column({
    type: 'enum',
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    name: 'implementation_effort'
  })
  implementationEffort: 'LOW' | 'MEDIUM' | 'HIGH';

  @Column({ type: 'integer' })
  priority: number;

  @Column({ type: 'boolean', name: 'is_implemented', default: false })
  isImplemented: boolean;

  @Column({ type: 'timestamp', name: 'implemented_at', nullable: true })
  implementedAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => DynamicPricingEntity, pricing => pricing.recommendations)
  @JoinColumn({ name: 'pricing_configuration_id' })
  pricingConfiguration: DynamicPricingEntity;

  toJSON(): OptimizationRecommendation {
    return {
      id: this.id,
      type: this.type,
      description: this.description,
      expectedImpact: this.expectedImpact,
      confidence: this.confidence,
      implementationEffort: this.implementationEffort,
      priority: this.priority
    };
  }
}

// Supporting Interfaces
interface PricingRule {
  id: string;
  name: string;
  condition: string;
  adjustment: number;
  isPercentage: boolean;
  priority: number;
  isActive: boolean;
}

interface DemandFactor {
  name: string;
  minLevel: number;
  maxLevel: number;
  elasticity: number;
  weight: number;
}

interface CompetitiveFactor {
  name: string;
  minRatio: number;
  maxRatio: number;
  adjustment: number;
  weight: number;
}

interface SeasonalFactor {
  name: string;
  startMonth: number;
  endMonth: number;
  multiplier: number;
  isActive: boolean;
}

interface CustomerSegment {
  name: string;
  description: string;
  priceMultiplier: number;
  volumeDiscount: number;
  isActive: boolean;
}

interface ABTestVariant {
  id: string;
  name: string;
  priceAdjustment: number;
  trafficPercentage: number;
  conversionRate: number;
  revenue: number;
  isActive: boolean;
}

