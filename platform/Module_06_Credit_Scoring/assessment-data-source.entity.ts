import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DataSourceType } from '../enums/data-source-type.enum';
import { CreditAssessment } from './credit-assessment.entity';

/**
 * Entity representing data collected from various sources for credit assessment.
 * This tracks what data was used in a credit assessment and its quality.
 */
@Entity('assessment_data_sources')
export class AssessmentDataSource {
  /**
   * Unique identifier for the data source record
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Reference to the credit assessment this data source was used for
   */
  @Column({ name: 'assessment_id' })
  assessmentId: string;

  /**
   * Tenant ID for multi-tenancy support
   */
  @Column({ name: 'tenant_id' })
  tenantId: string;

  /**
   * Type of data source
   */
  @Column({
    name: 'source_type',
    type: 'enum',
    enum: DataSourceType
  })
  sourceType: DataSourceType;

  /**
   * Name or identifier of the specific data source
   */
  @Column({ name: 'source_name', length: 255 })
  sourceName: string;

  /**
   * Data quality score (0-100)
   */
  @Column({ name: 'data_quality', type: 'integer', default: 0 })
  dataQuality: number;

  /**
   * Data completeness percentage (0-100)
   */
  @Column({ name: 'data_completeness', type: 'integer', default: 0 })
  dataCompleteness: number;

  /**
   * Data freshness/recency score (0-100)
   */
  @Column({ name: 'data_freshness', type: 'integer', default: 0 })
  dataFreshness: number;

  /**
   * Weight given to this data source in the assessment (0-100)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  weight: number;

  /**
   * JSON object containing source-specific metadata
   */
  @Column({ name: 'source_metadata', type: 'jsonb', nullable: true })
  sourceMetadata: Record<string, any>;

  /**
   * Timestamp when the data was collected
   */
  @Column({ name: 'collected_at', type: 'timestamp' })
  collectedAt: Date;

  /**
   * Timestamp when the data expires
   */
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  /**
   * Any errors encountered while collecting data
   */
  @Column({ name: 'error_details', type: 'text', nullable: true })
  errorDetails: string;

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
