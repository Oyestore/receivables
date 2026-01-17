import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BuyerProfile } from './buyer-profile.entity';
import { RiskLevel } from '../enums/risk-level.enum';

/**
 * Entity representing risk indicators for early warning system.
 * This stores detected risk indicators and related information.
 */
@Entity('risk_indicators')
export class RiskIndicator {
  /**
   * Unique identifier for the risk indicator
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tenant ID for multi-tenancy support
   */
  @Column({ name: 'tenant_id' })
  tenantId: string;

  /**
   * Buyer ID this risk indicator applies to
   */
  @Column({ name: 'buyer_id' })
  buyerId: string;

  /**
   * Indicator type (e.g., payment_delay, credit_utilization, financial_statement)
   */
  @Column({ name: 'indicator_type', length: 50 })
  indicatorType: string;

  /**
   * Indicator name (e.g., high_utilization, late_payment_trend, credit_score_drop)
   */
  @Column({ name: 'indicator_name', length: 100 })
  indicatorName: string;

  /**
   * Indicator description
   */
  @Column({ name: 'description', type: 'text' })
  description: string;

  /**
   * Risk level of this indicator
   */
  @Column({ name: 'risk_level', type: 'enum', enum: RiskLevel })
  riskLevel: RiskLevel;

  /**
   * Indicator value (e.g., utilization percentage, days past due)
   */
  @Column({ name: 'indicator_value', type: 'decimal', precision: 19, scale: 4, nullable: true })
  indicatorValue: number;

  /**
   * Threshold value that triggered this indicator
   */
  @Column({ name: 'threshold_value', type: 'decimal', precision: 19, scale: 4, nullable: true })
  thresholdValue: number;

  /**
   * Trend direction (e.g., increasing, decreasing, stable)
   */
  @Column({ name: 'trend', length: 20, nullable: true })
  trend: string;

  /**
   * Confidence level in this indicator (0-100)
   */
  @Column({ name: 'confidence_level', type: 'integer' })
  confidenceLevel: number;

  /**
   * Source of this indicator (e.g., payment_history, credit_assessment, financial_statement)
   */
  @Column({ name: 'source', length: 50 })
  source: string;

  /**
   * Source reference ID (e.g., payment history ID, credit assessment ID)
   */
  @Column({ name: 'source_reference_id', nullable: true })
  sourceReferenceId: string;

  /**
   * Detection date when this indicator was detected
   */
  @Column({ name: 'detection_date', type: 'timestamp' })
  detectionDate: Date;

  /**
   * Status of this indicator (e.g., active, resolved, false_positive)
   */
  @Column({ name: 'status', length: 20, default: 'active' })
  status: string;

  /**
   * Resolution date when this indicator was resolved
   */
  @Column({ name: 'resolution_date', type: 'timestamp', nullable: true })
  resolutionDate: Date;

  /**
   * Resolution notes
   */
  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string;

  /**
   * JSON object containing additional data
   */
  @Column({ name: 'additional_data', type: 'jsonb', nullable: true })
  additionalData: Record<string, any>;

  /**
   * Whether this indicator has been acknowledged
   */
  @Column({ name: 'is_acknowledged', type: 'boolean', default: false })
  isAcknowledged: boolean;

  /**
   * User ID who acknowledged this indicator
   */
  @Column({ name: 'acknowledged_by', nullable: true })
  acknowledgedBy: string;

  /**
   * Timestamp when this indicator was acknowledged
   */
  @Column({ name: 'acknowledged_at', type: 'timestamp', nullable: true })
  acknowledgedAt: Date;

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
