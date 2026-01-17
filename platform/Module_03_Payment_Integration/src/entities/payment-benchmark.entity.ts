import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BuyerProfile } from './buyer-profile.entity';

/**
 * Entity representing cross-business payment benchmarks.
 * This stores anonymized payment behavior benchmarks across businesses for comparison.
 */
@Entity('payment_benchmarks')
export class PaymentBenchmark {
  /**
   * Unique identifier for the benchmark
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tenant ID for multi-tenancy support
   */
  @Column({ name: 'tenant_id' })
  tenantId: string;

  /**
   * Industry code this benchmark applies to
   */
  @Column({ name: 'industry_code', length: 20 })
  industryCode: string;

  /**
   * Industry sector description
   */
  @Column({ name: 'industry_sector', length: 100 })
  industrySector: string;

  /**
   * Region code this benchmark applies to (optional)
   */
  @Column({ name: 'region_code', length: 20, nullable: true })
  regionCode: string;

  /**
   * Business size category (e.g., micro, small, medium, large)
   */
  @Column({ name: 'business_size', length: 20, nullable: true })
  businessSize: string;

  /**
   * Period start date for this benchmark
   */
  @Column({ name: 'period_start', type: 'timestamp' })
  periodStart: Date;

  /**
   * Period end date for this benchmark
   */
  @Column({ name: 'period_end', type: 'timestamp' })
  periodEnd: Date;

  /**
   * Number of businesses included in this benchmark
   */
  @Column({ name: 'sample_size', type: 'integer' })
  sampleSize: number;

  /**
   * Average days past due across the sample
   */
  @Column({ name: 'avg_days_past_due', type: 'decimal', precision: 10, scale: 2 })
  avgDaysPastDue: number;

  /**
   * Median days past due across the sample
   */
  @Column({ name: 'median_days_past_due', type: 'decimal', precision: 10, scale: 2 })
  medianDaysPastDue: number;

  /**
   * Standard deviation of days past due
   */
  @Column({ name: 'std_dev_days_past_due', type: 'decimal', precision: 10, scale: 2 })
  stdDevDaysPastDue: number;

  /**
   * 10th percentile of days past due
   */
  @Column({ name: 'p10_days_past_due', type: 'decimal', precision: 10, scale: 2 })
  p10DaysPastDue: number;

  /**
   * 25th percentile of days past due
   */
  @Column({ name: 'p25_days_past_due', type: 'decimal', precision: 10, scale: 2 })
  p25DaysPastDue: number;

  /**
   * 75th percentile of days past due
   */
  @Column({ name: 'p75_days_past_due', type: 'decimal', precision: 10, scale: 2 })
  p75DaysPastDue: number;

  /**
   * 90th percentile of days past due
   */
  @Column({ name: 'p90_days_past_due', type: 'decimal', precision: 10, scale: 2 })
  p90DaysPastDue: number;

  /**
   * Average on-time payment percentage across the sample
   */
  @Column({ name: 'avg_on_time_percentage', type: 'decimal', precision: 5, scale: 2 })
  avgOnTimePercentage: number;

  /**
   * Average default percentage across the sample
   */
  @Column({ name: 'avg_default_percentage', type: 'decimal', precision: 5, scale: 2 })
  avgDefaultPercentage: number;

  /**
   * Average payment consistency score across the sample
   */
  @Column({ name: 'avg_consistency_score', type: 'decimal', precision: 5, scale: 2 })
  avgConsistencyScore: number;

  /**
   * JSON object containing additional benchmark metrics
   */
  @Column({ name: 'additional_metrics', type: 'jsonb', nullable: true })
  additionalMetrics: Record<string, any>;

  /**
   * Timestamp when the benchmark was calculated
   */
  @Column({ name: 'calculated_at', type: 'timestamp' })
  calculatedAt: Date;

  /**
   * Timestamp when the benchmark expires
   */
  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

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
}
