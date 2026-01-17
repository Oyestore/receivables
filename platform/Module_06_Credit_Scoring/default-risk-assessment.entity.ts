import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BuyerProfile } from './buyer-profile.entity';
import { CreditAssessment } from './credit-assessment.entity';
import { RiskLevel } from './risk-level.enum';

export enum DefaultRiskCategory {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
  EXTREME = 'extreme'
}

export enum DefaultRiskFactor {
  PAYMENT_HISTORY = 'payment_history',
  CREDIT_UTILIZATION = 'credit_utilization',
  BUSINESS_AGE = 'business_age',
  INDUSTRY_RISK = 'industry_risk',
  REVENUE_STABILITY = 'revenue_stability',
  DEBT_TO_INCOME = 'debt_to_income',
  LIQUIDITY_RATIO = 'liquidity_ratio',
  MARKET_POSITION = 'market_position'
}

@Entity('default_risk_assessments')
export class DefaultRiskAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  @ManyToOne(() => BuyerProfile, buyer => buyer.riskAssessments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer: BuyerProfile;

  @Column({
    type: 'enum',
    enum: DefaultRiskCategory,
    default: DefaultRiskCategory.MEDIUM
  })
  riskCategory: DefaultRiskCategory;

  @Column({
    type: 'enum',
    enum: RiskLevel,
    default: RiskLevel.MEDIUM
  })
  riskLevel: RiskLevel;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.50 })
  riskScore: number;

  @Column({ type: 'jsonb', default: {} })
  riskFactors: Record<DefaultRiskFactor, number>;

  @Column({ type: 'jsonb', default: {} })
  factorWeights: Record<DefaultRiskFactor, number>;

  @Column({ type: 'text', nullable: true })
  assessmentNotes: string;

  @Column({ type: 'jsonb', default: {} })
  supportingData: Record<string, any>;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  recommendedCreditLimit: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  recommendedInterestRate: number;

  @Column({ type: 'int', default: 12 })
  validityPeriod: number; // in months

  @Column({ type: 'date', nullable: true })
  nextReviewDate: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: {} })
  historicalScores: Array<{
    date: Date;
    score: number;
    category: DefaultRiskCategory;
    level: RiskLevel;
  }>;

  @Column({ type: 'jsonb', default: {} })
  benchmarkComparisons: {
    industryAverage: number;
    regionalAverage: number;
    percentileRank: number;
  };

  @Column({ name: 'assessment_model_version', type: 'varchar', length: 20, default: '1.0' })
  assessmentModelVersion: string;

  @Column({ name: 'auto_calculated', type: 'boolean', default: true })
  autoCalculated: boolean;

  @Column({ name: 'manual_override', type: 'boolean', default: false })
  manualOverride: boolean;

  @Column({ name: 'override_reason', type: 'text', nullable: true })
  overrideReason: string;

  @Column({ name: 'override_by', type: 'varchar', length: 255, nullable: true })
  overrideBy: string;

  @Column({ name: 'override_date', type: 'timestamp', nullable: true })
  overrideDate: Date;

  @OneToMany(() => CreditAssessment, assessment => assessment.defaultRiskAssessment)
  creditAssessments: CreditAssessment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 255 })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 255, nullable: true })
  updatedBy: string;
}
