import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BuyerProfile } from './buyer-profile.entity';

/**
 * Entity representing payment patterns identified for a buyer.
 * This tracks recurring payment behaviors and trends used for prediction.
 */
@Entity('payment_patterns')
export class PaymentPattern {
  /**
   * Unique identifier for the payment pattern
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tenant ID for multi-tenancy support
   */
  @Column({ name: 'tenant_id' })
  tenantId: string;

  /**
   * Buyer ID for whom the pattern is identified
   */
  @Column({ name: 'buyer_id' })
  buyerId: string;

  /**
   * Name of the identified pattern
   */
  @Column({ length: 100 })
  name: string;

  /**
   * Description of the pattern
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * Type of pattern (e.g., seasonal, cyclical, trend)
   */
  @Column({ name: 'pattern_type', length: 50 })
  patternType: string;

  /**
   * Confidence level in the pattern (0-100)
   */
  @Column({ name: 'confidence_level', type: 'integer' })
  confidenceLevel: number;

  /**
   * Frequency of the pattern in days (if applicable)
   */
  @Column({ name: 'frequency_days', type: 'integer', nullable: true })
  frequencyDays: number;

  /**
   * Average days past due in this pattern
   */
  @Column({ name: 'avg_days_past_due', type: 'decimal', precision: 10, scale: 2, nullable: true })
  avgDaysPastDue: number;

  /**
   * Standard deviation of days past due
   */
  @Column({ name: 'std_dev_days_past_due', type: 'decimal', precision: 10, scale: 2, nullable: true })
  stdDevDaysPastDue: number;

  /**
   * Average payment amount in this pattern
   */
  @Column({ name: 'avg_payment_amount', type: 'decimal', precision: 19, scale: 4, nullable: true })
  avgPaymentAmount: number;

  /**
   * JSON object containing pattern details
   */
  @Column({ name: 'pattern_data', type: 'jsonb' })
  patternData: Record<string, any>;

  /**
   * Date when the pattern was first identified
   */
  @Column({ name: 'identified_at', type: 'timestamp' })
  identifiedAt: Date;

  /**
   * Date when the pattern was last observed
   */
  @Column({ name: 'last_observed_at', type: 'timestamp' })
  lastObservedAt: Date;

  /**
   * Whether the pattern is currently active
   */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Risk implication of this pattern (positive, neutral, negative)
   */
  @Column({ name: 'risk_implication', length: 20, nullable: true })
  riskImplication: string;

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
   * Relation to the buyer profile
   */
  @ManyToOne(() => BuyerProfile)
  @JoinColumn({ name: 'buyer_id', referencedColumnName: 'buyerId' })
  buyerProfile: BuyerProfile;
}
