import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { CreditScoreType } from '../enums/credit-score-type.enum';
import { CreditAssessmentStatus } from '../enums/credit-assessment-status.enum';
import { ConfidenceLevel } from '../enums/confidence-level.enum';
import { RiskLevel } from '../enums/risk-level.enum';
import { ScoringModel } from './scoring-model.entity';

/**
 * Entity representing a credit assessment for a buyer.
 * This is the core entity for the Buyer Credit Scoring Module.
 */
@Entity('credit_assessments')
export class CreditAssessment {
  /**
   * Unique identifier for the credit assessment
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tenant ID for multi-tenancy support
   */
  @Column({ name: 'tenant_id' })
  tenantId: string;

  /**
   * Buyer ID for whom the assessment is performed
   */
  @Column({ name: 'buyer_id' })
  buyerId: string;

  /**
   * Type of credit score being generated
   */
  @Column({
    type: 'enum',
    enum: CreditScoreType,
    default: CreditScoreType.COMPREHENSIVE
  })
  scoreType: CreditScoreType;

  /**
   * The calculated credit score value
   * Typically on a scale of 1-100 or 1-1000 depending on configuration
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  scoreValue: number;

  /**
   * Minimum score in the scale
   */
  @Column({ name: 'min_score', type: 'decimal', precision: 10, scale: 2, default: 1 })
  minScore: number;

  /**
   * Maximum score in the scale
   */
  @Column({ name: 'max_score', type: 'decimal', precision: 10, scale: 2, default: 100 })
  maxScore: number;

  /**
   * Status of the assessment
   */
  @Column({
    type: 'enum',
    enum: CreditAssessmentStatus,
    default: CreditAssessmentStatus.PENDING
  })
  status: CreditAssessmentStatus;

  /**
   * Confidence level in the assessment
   */
  @Column({
    name: 'confidence_level',
    type: 'enum',
    enum: ConfidenceLevel,
    nullable: true
  })
  confidenceLevel: ConfidenceLevel;

  /**
   * Risk level determined by the assessment
   */
  @Column({
    name: 'risk_level',
    type: 'enum',
    enum: RiskLevel,
    nullable: true
  })
  riskLevel: RiskLevel;

  /**
   * Recommended credit limit based on the assessment
   */
  @Column({ name: 'recommended_credit_limit', type: 'decimal', precision: 19, scale: 4, nullable: true })
  recommendedCreditLimit: number;

  /**
   * Currency code for the credit limit (ISO 4217)
   */
  @Column({ name: 'currency_code', length: 3, default: 'INR' })
  currencyCode: string;

  /**
   * Assessment expiration date
   */
  @Column({ name: 'expiration_date', type: 'timestamp', nullable: true })
  expirationDate: Date;

  /**
   * JSON object containing detailed factor scores
   */
  @Column({ name: 'factor_scores', type: 'jsonb', nullable: true })
  factorScores: Record<string, any>;

  /**
   * JSON object containing data sources used in the assessment
   */
  @Column({ name: 'data_sources', type: 'jsonb', nullable: true })
  dataSources: Record<string, any>;

  /**
   * Notes or comments about the assessment
   */
  @Column({ type: 'text', nullable: true })
  notes: string;

  /**
   * ID of the model version used for scoring
   */
  @Column({ name: 'model_version_id', nullable: true })
  modelVersionId: string;

  /**
   * Relationship to the scoring model used
   */
  @ManyToOne(() => ScoringModel, { nullable: true })
  @JoinColumn({ name: 'model_version_id' })
  model: ScoringModel;

  /**
   * ID of the user who performed or requested the assessment
   */
  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  /**
   * ID of the user who last updated the assessment
   */
  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  /**
   * Timestamp when the assessment was created
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Timestamp when the assessment was last updated
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
