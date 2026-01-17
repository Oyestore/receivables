import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { IndustryRiskProfile } from './industry-risk-profile.entity';

/**
 * Entity representing industry-specific risk factors.
 * This stores detailed risk factors and their weights for different industries.
 */
@Entity('industry_risk_factors')
export class IndustryRiskFactor {
  /**
   * Unique identifier for the industry risk factor
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tenant ID for multi-tenancy support
   */
  @Column({ name: 'tenant_id' })
  tenantId: string;

  /**
   * Industry risk profile ID this factor belongs to
   */
  @Column({ name: 'industry_risk_profile_id' })
  industryRiskProfileId: string;

  /**
   * Factor name
   */
  @Column({ name: 'factor_name', length: 100 })
  factorName: string;

  /**
   * Factor description
   */
  @Column({ name: 'factor_description', type: 'text' })
  factorDescription: string;

  /**
   * Factor category (e.g., financial, operational, market)
   */
  @Column({ name: 'factor_category', length: 50 })
  factorCategory: string;

  /**
   * Factor weight in scoring (0-100)
   */
  @Column({ name: 'weight', type: 'decimal', precision: 5, scale: 2 })
  weight: number;

  /**
   * Impact level (1-10, higher means more impact)
   */
  @Column({ name: 'impact_level', type: 'integer' })
  impactLevel: number;

  /**
   * Likelihood level (1-10, higher means more likely)
   */
  @Column({ name: 'likelihood_level', type: 'integer' })
  likelihoodLevel: number;

  /**
   * Risk score for this factor (calculated from impact and likelihood)
   */
  @Column({ name: 'risk_score', type: 'integer' })
  riskScore: number;

  /**
   * Threshold value for triggering risk alerts
   */
  @Column({ name: 'threshold_value', type: 'decimal', precision: 10, scale: 2, nullable: true })
  thresholdValue: number;

  /**
   * Data source for this factor
   */
  @Column({ name: 'data_source', length: 100, nullable: true })
  dataSource: string;

  /**
   * Calculation method for this factor
   */
  @Column({ name: 'calculation_method', length: 100, nullable: true })
  calculationMethod: string;

  /**
   * JSON object containing factor parameters
   */
  @Column({ name: 'parameters', type: 'jsonb', nullable: true })
  parameters: Record<string, any>;

  /**
   * JSON object containing historical data
   */
  @Column({ name: 'historical_data', type: 'jsonb', nullable: true })
  historicalData: Record<string, any>;

  /**
   * Whether this factor is active
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
   * User ID who created this factor
   */
  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  /**
   * User ID who last updated this factor
   */
  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  /**
   * Relation to the industry risk profile
   */
  @ManyToOne(() => IndustryRiskProfile)
  @JoinColumn({ name: 'industry_risk_profile_id' })
  industryRiskProfile: IndustryRiskProfile;
}
