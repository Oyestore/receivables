import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BuyerProfile } from './buyer-profile.entity';

/**
 * Entity representing payment metrics for a buyer.
 * This stores calculated metrics about payment behavior used for credit assessment.
 */
@Entity('payment_metrics')
export class PaymentMetrics {
  /**
   * Unique identifier for the payment metrics
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tenant ID for multi-tenancy support
   */
  @Column({ name: 'tenant_id' })
  tenantId: string;

  /**
   * Buyer ID for whom the metrics are calculated
   */
  @Column({ name: 'buyer_id' })
  buyerId: string;

  /**
   * Period start date for these metrics
   */
  @Column({ name: 'period_start', type: 'timestamp' })
  periodStart: Date;

  /**
   * Period end date for these metrics
   */
  @Column({ name: 'period_end', type: 'timestamp' })
  periodEnd: Date;

  /**
   * Total number of payments in the period
   */
  @Column({ name: 'payment_count', type: 'integer' })
  paymentCount: number;

  /**
   * Total value of payments in the period
   */
  @Column({ name: 'total_payment_value', type: 'decimal', precision: 19, scale: 4 })
  totalPaymentValue: number;

  /**
   * Currency code for payment values (ISO 4217)
   */
  @Column({ name: 'currency_code', length: 3, default: 'INR' })
  currencyCode: string;

  /**
   * Average days past due (negative if paid early)
   */
  @Column({ name: 'avg_days_past_due', type: 'decimal', precision: 10, scale: 2 })
  avgDaysPastDue: number;

  /**
   * Maximum days past due in the period
   */
  @Column({ name: 'max_days_past_due', type: 'integer' })
  maxDaysPastDue: number;

  /**
   * Standard deviation of days past due
   */
  @Column({ name: 'std_dev_days_past_due', type: 'decimal', precision: 10, scale: 2 })
  stdDevDaysPastDue: number;

  /**
   * Percentage of on-time payments (0-100)
   */
  @Column({ name: 'on_time_payment_percentage', type: 'decimal', precision: 5, scale: 2 })
  onTimePaymentPercentage: number;

  /**
   * Percentage of late payments (0-100)
   */
  @Column({ name: 'late_payment_percentage', type: 'decimal', precision: 5, scale: 2 })
  latePaymentPercentage: number;

  /**
   * Percentage of very late payments (>30 days, 0-100)
   */
  @Column({ name: 'very_late_payment_percentage', type: 'decimal', precision: 5, scale: 2 })
  veryLatePaymentPercentage: number;

  /**
   * Percentage of defaulted payments (0-100)
   */
  @Column({ name: 'default_percentage', type: 'decimal', precision: 5, scale: 2 })
  defaultPercentage: number;

  /**
   * Average payment amount
   */
  @Column({ name: 'avg_payment_amount', type: 'decimal', precision: 19, scale: 4 })
  avgPaymentAmount: number;

  /**
   * Payment consistency score (0-100, higher is more consistent)
   */
  @Column({ name: 'payment_consistency_score', type: 'decimal', precision: 5, scale: 2 })
  paymentConsistencyScore: number;

  /**
   * Payment trend indicator (-100 to 100, positive means improving)
   */
  @Column({ name: 'payment_trend', type: 'decimal', precision: 6, scale: 2 })
  paymentTrend: number;

  /**
   * Seasonal pattern strength (0-100)
   */
  @Column({ name: 'seasonal_pattern_strength', type: 'decimal', precision: 5, scale: 2, nullable: true })
  seasonalPatternStrength: number;

  /**
   * Dispute frequency percentage (0-100)
   */
  @Column({ name: 'dispute_frequency', type: 'decimal', precision: 5, scale: 2, default: 0 })
  disputeFrequency: number;

  /**
   * Overall payment behavior score (0-100)
   */
  @Column({ name: 'overall_score', type: 'decimal', precision: 5, scale: 2 })
  overallScore: number;

  /**
   * JSON object containing additional metrics
   */
  @Column({ name: 'additional_metrics', type: 'jsonb', nullable: true })
  additionalMetrics: Record<string, any>;

  /**
   * Timestamp when the metrics were calculated
   */
  @Column({ name: 'calculated_at', type: 'timestamp' })
  calculatedAt: Date;

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
