import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BuyerProfile } from './buyer-profile.entity';
import { CreditAssessment } from './credit-assessment.entity';

/**
 * Entity representing credit limits for buyers.
 * This stores approved credit limits and related information.
 */
@Entity('credit_limits')
export class CreditLimit {
  /**
   * Unique identifier for the credit limit
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tenant ID for multi-tenancy support
   */
  @Column({ name: 'tenant_id' })
  tenantId: string;

  /**
   * Buyer ID this credit limit applies to
   */
  @Column({ name: 'buyer_id' })
  buyerId: string;

  /**
   * Credit assessment ID that was used to calculate this limit
   */
  @Column({ name: 'credit_assessment_id', nullable: true })
  creditAssessmentId: string;

  /**
   * Recommended credit limit amount
   */
  @Column({ name: 'recommended_limit', type: 'decimal', precision: 19, scale: 4 })
  recommendedLimit: number;

  /**
   * Approved credit limit amount
   */
  @Column({ name: 'approved_limit', type: 'decimal', precision: 19, scale: 4 })
  approvedLimit: number;

  /**
   * Minimum credit limit amount
   */
  @Column({ name: 'minimum_limit', type: 'decimal', precision: 19, scale: 4, nullable: true })
  minimumLimit: number;

  /**
   * Maximum credit limit amount
   */
  @Column({ name: 'maximum_limit', type: 'decimal', precision: 19, scale: 4, nullable: true })
  maximumLimit: number;

  /**
   * Currency code for the credit limit
   */
  @Column({ name: 'currency_code', length: 3 })
  currencyCode: string;

  /**
   * Status of the credit limit (e.g., pending, approved, rejected)
   */
  @Column({ name: 'status', length: 20 })
  status: string;

  /**
   * Confidence level in the credit limit (0-100)
   */
  @Column({ name: 'confidence_level', type: 'integer' })
  confidenceLevel: number;

  /**
   * Risk level associated with this credit limit (1-10)
   */
  @Column({ name: 'risk_level', type: 'integer' })
  riskLevel: number;

  /**
   * Utilization percentage threshold for alerts (0-100)
   */
  @Column({ name: 'utilization_alert_threshold', type: 'integer', default: 80 })
  utilizationAlertThreshold: number;

  /**
   * Current utilization amount
   */
  @Column({ name: 'current_utilization', type: 'decimal', precision: 19, scale: 4, default: 0 })
  currentUtilization: number;

  /**
   * Current utilization percentage (0-100)
   */
  @Column({ name: 'utilization_percentage', type: 'integer', default: 0 })
  utilizationPercentage: number;

  /**
   * Available credit amount (approved_limit - current_utilization)
   */
  @Column({ name: 'available_credit', type: 'decimal', precision: 19, scale: 4 })
  availableCredit: number;

  /**
   * Temporary limit increase amount
   */
  @Column({ name: 'temporary_increase', type: 'decimal', precision: 19, scale: 4, default: 0 })
  temporaryIncrease: number;

  /**
   * Expiry date for temporary increase
   */
  @Column({ name: 'temporary_increase_expiry', type: 'timestamp', nullable: true })
  temporaryIncreaseExpiry: Date;

  /**
   * Effective date when this credit limit becomes active
   */
  @Column({ name: 'effective_date', type: 'timestamp' })
  effectiveDate: Date;

  /**
   * Expiry date when this credit limit expires
   */
  @Column({ name: 'expiry_date', type: 'timestamp', nullable: true })
  expiryDate: Date;

  /**
   * Review date when this credit limit should be reviewed
   */
  @Column({ name: 'review_date', type: 'timestamp' })
  reviewDate: Date;

  /**
   * Last review date when this credit limit was last reviewed
   */
  @Column({ name: 'last_review_date', type: 'timestamp', nullable: true })
  lastReviewDate: Date;

  /**
   * Calculation method used to determine this credit limit
   */
  @Column({ name: 'calculation_method', length: 50 })
  calculationMethod: string;

  /**
   * JSON object containing calculation parameters
   */
  @Column({ name: 'calculation_parameters', type: 'jsonb', nullable: true })
  calculationParameters: Record<string, any>;

  /**
   * JSON object containing approval details
   */
  @Column({ name: 'approval_details', type: 'jsonb', nullable: true })
  approvalDetails: Record<string, any>;

  /**
   * JSON object containing override details if limit was manually overridden
   */
  @Column({ name: 'override_details', type: 'jsonb', nullable: true })
  overrideDetails: Record<string, any>;

  /**
   * Notes about this credit limit
   */
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;

  /**
   * Whether this credit limit is active
   */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

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
   * User ID who created this credit limit
   */
  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  /**
   * User ID who last updated this credit limit
   */
  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  /**
   * Relation to the buyer profile
   */
  @ManyToOne(() => BuyerProfile)
  @JoinColumn({ name: 'buyer_id', referencedColumnName: 'buyerId' })
  buyerProfile: BuyerProfile;

  /**
   * Relation to the credit assessment
   */
  @ManyToOne(() => CreditAssessment)
  @JoinColumn({ name: 'credit_assessment_id' })
  creditAssessment: CreditAssessment;
}
