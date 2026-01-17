import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BuyerProfile } from './buyer-profile.entity';
import { CreditAssessment } from './credit-assessment.entity';
import { RiskLevel } from './risk-level.enum';

export enum RiskAssessmentType {
  CREDIT_RISK = 'credit_risk',
  PAYMENT_RISK = 'payment_risk',
  OPERATIONAL_RISK = 'operational_risk',
  MARKET_RISK = 'market_risk',
  COMPLIANCE_RISK = 'compliance_risk',
  LIQUIDITY_RISK = 'liquidity_risk'
}

export enum RiskAssessmentMethod {
  AUTOMATED = 'automated',
  MANUAL = 'manual',
  HYBRID = 'hybrid',
  EXTERNAL = 'external'
}

export enum RiskAssessmentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REVIEW_REQUIRED = 'review_required',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

@Entity('risk_assessments')
export class RiskAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  @ManyToOne(() => BuyerProfile, buyer => buyer.riskAssessments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer: BuyerProfile;

  @Column({
    type: 'enum',
    enum: RiskAssessmentType,
    default: RiskAssessmentType.CREDIT_RISK
  })
  assessmentType: RiskAssessmentType;

  @Column({
    type: 'enum',
    enum: RiskAssessmentMethod,
    default: RiskAssessmentMethod.AUTOMATED
  })
  assessmentMethod: RiskAssessmentMethod;

  @Column({
    type: 'enum',
    enum: RiskAssessmentStatus,
    default: RiskAssessmentStatus.PENDING
  })
  status: RiskAssessmentStatus;

  @Column({
    type: 'enum',
    enum: RiskLevel,
    nullable: true
  })
  overallRiskLevel: RiskLevel;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  overallRiskScore: number;

  @Column({ type: 'jsonb', default: {} })
  riskFactors: Array<{
    factor: string;
    weight: number;
    score: number;
    impact: 'high' | 'medium' | 'low';
    description: string;
  }>;

  @Column({ type: 'jsonb', default: {} })
  riskMitigations: Array<{
    risk: string;
    mitigation: string;
    effectiveness: 'high' | 'medium' | 'low';
    implementationStatus: 'pending' | 'in_progress' | 'completed';
  }>;

  @Column({ type: 'text', nullable: true })
  assessmentSummary: string;

  @Column({ type: 'text', nullable: true })
  detailedAnalysis: string;

  @Column({ type: 'jsonb', default: {} })
  supportingDocuments: Array<{
    documentId: string;
    documentType: string;
    documentName: string;
    uploadDate: Date;
    relevance: 'high' | 'medium' | 'low';
  }>;

  @Column({ type: 'jsonb', default: {} })
  quantitativeMetrics: {
    debtToEquityRatio: number;
    currentRatio: number;
    quickRatio: number;
    grossProfitMargin: number;
    netProfitMargin: number;
    returnOnAssets: number;
    inventoryTurnover: number;
    receivablesTurnover: number;
  };

  @Column({ type: 'jsonb', default: {} })
  qualitativeFactors: {
    managementQuality: number;
    industryPosition: number;
    competitiveAdvantage: number;
    marketReputation: number;
    operationalEfficiency: number;
    financialStability: number;
  };

  @Column({ type: 'jsonb', default: {} })
  riskTolerance: {
    acceptableRiskLevel: RiskLevel;
    maximumExposure: number;
    riskAppetite: 'conservative' | 'moderate' | 'aggressive';
  };

  @Column({ type: 'jsonb', default: {} })
  recommendations: Array<{
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    category: 'immediate' | 'short_term' | 'long_term';
    estimatedImpact: string;
    implementationCost: 'low' | 'medium' | 'high';
  }>;

  @Column({ type: 'jsonb', default: {} })
  monitoringPlan: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    keyIndicators: string[];
    alertThresholds: Record<string, number>;
    escalationProcedures: string[];
  };

  @Column({ type: 'date', nullable: true })
  assessmentDate: Date;

  @Column({ type: 'date', nullable: true })
  nextReviewDate: Date;

  @Column({ type: 'int', default: 12 })
  reviewFrequency: number; // in months

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: {} })
  historicalTrends: Array<{
    date: Date;
    riskScore: number;
    riskLevel: RiskLevel;
    significantEvents: string[];
  }>;

  @Column({ name: 'assessor_id', type: 'varchar', length: 255, nullable: true })
  assessorId: string;

  @Column({ name: 'reviewer_id', type: 'varchar', length: 255, nullable: true })
  reviewerId: string;

  @Column({ name: 'approver_id', type: 'varchar', length: 255, nullable: true })
  approverId: string;

  @Column({ name: 'assessment_model_version', type: 'varchar', length: 20, default: '1.0' })
  assessmentModelVersion: string;

  @Column({ name: 'external_data_sources', type: 'jsonb', default: [] })
  externalDataSources: Array<{
    source: string;
    dataPoints: string[];
    reliability: number;
    lastUpdated: Date;
  }>;

  @OneToMany(() => CreditAssessment, assessment => assessment.riskAssessment)
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
