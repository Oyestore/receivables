import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CreditAssessment } from './credit-assessment.entity';

/**
 * Entity representing a factor used in credit scoring.
 * Each factor contributes to the overall credit score with its own weight and value.
 */
@Entity('credit_score_factors')
export class CreditScoreFactor {
  /**
   * Unique identifier for the credit score factor
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Reference to the credit assessment this factor belongs to
   */
  @Column({ name: 'assessment_id' })
  assessmentId: string;

  /**
   * Tenant ID for multi-tenancy support
   */
  @Column({ name: 'tenant_id' })
  tenantId: string;

  /**
   * Name of the factor
   */
  @Column({ length: 100 })
  name: string;

  /**
   * Description of the factor
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * Category of the factor (e.g., payment_history, financial_stability)
   */
  @Column({ length: 50 })
  category: string;

  /**
   * Raw value of the factor before normalization
   */
  @Column({ name: 'raw_value', type: 'decimal', precision: 19, scale: 4, nullable: true })
  rawValue: number;

  /**
   * Normalized value of the factor (typically 0-100)
   */
  @Column({ name: 'normalized_value', type: 'decimal', precision: 5, scale: 2, nullable: true })
  normalizedValue: number;

  /**
   * Weight of this factor in the overall score (0-100)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  weight: number;

  /**
   * Contribution of this factor to the overall score
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  contribution: number;

  /**
   * Direction of impact (positive or negative)
   */
  @Column({ name: 'impact_direction', length: 10, nullable: true })
  impactDirection: string;

  /**
   * Explanation of this factor's impact on the score
   */
  @Column({ type: 'text', nullable: true })
  explanation: string;

  /**
   * JSON object containing factor-specific data
   */
  @Column({ name: 'factor_data', type: 'jsonb', nullable: true })
  factorData: Record<string, any>;

  /**
   * Timestamp when the record was created
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Timestamp when the record was last updated
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Relation to the credit assessment
   */
  @ManyToOne(() => CreditAssessment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessment_id' })
  assessment: CreditAssessment;
}
