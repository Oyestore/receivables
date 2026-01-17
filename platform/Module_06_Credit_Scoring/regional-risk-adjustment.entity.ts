import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { IndustryRiskProfile } from './industry-risk-profile.entity';

/**
 * Entity representing regional adjustments for industry risk profiles.
 * This stores region-specific modifications to industry risk factors.
 */
@Entity('regional_risk_adjustments')
export class RegionalRiskAdjustment {
  /**
   * Unique identifier for the regional risk adjustment
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tenant ID for multi-tenancy support
   */
  @Column({ name: 'tenant_id' })
  tenantId: string;

  /**
   * Industry risk profile ID this adjustment applies to
   */
  @Column({ name: 'industry_risk_profile_id' })
  industryRiskProfileId: string;

  /**
   * Region code (state or territory code for India)
   */
  @Column({ name: 'region_code', length: 20 })
  regionCode: string;

  /**
   * Region name (state or territory name)
   */
  @Column({ name: 'region_name', length: 100 })
  regionName: string;

  /**
   * Risk level adjustment for this region (-5 to +5)
   */
  @Column({ name: 'risk_level_adjustment', type: 'integer' })
  riskLevelAdjustment: number;

  /**
   * Default rate adjustment percentage (-10 to +10)
   */
  @Column({ name: 'default_rate_adjustment', type: 'decimal', precision: 5, scale: 2 })
  defaultRateAdjustment: number;

  /**
   * Payment days adjustment (-30 to +30)
   */
  @Column({ name: 'payment_days_adjustment', type: 'integer' })
  paymentDaysAdjustment: number;

  /**
   * Economic condition rating for this region (1-10)
   */
  @Column({ name: 'economic_condition', type: 'integer' })
  economicCondition: number;

  /**
   * Infrastructure quality rating for this region (1-10)
   */
  @Column({ name: 'infrastructure_quality', type: 'integer' })
  infrastructureQuality: number;

  /**
   * Policy environment rating for this region (1-10)
   */
  @Column({ name: 'policy_environment', type: 'integer' })
  policyEnvironment: number;

  /**
   * Labor market rating for this region (1-10)
   */
  @Column({ name: 'labor_market', type: 'integer' })
  laborMarket: number;

  /**
   * Natural disaster risk for this region (1-10)
   */
  @Column({ name: 'natural_disaster_risk', type: 'integer' })
  naturalDisasterRisk: number;

  /**
   * JSON object containing region-specific risk factors
   */
  @Column({ name: 'risk_factors', type: 'jsonb' })
  riskFactors: Record<string, any>;

  /**
   * JSON object containing scoring adjustments for this region
   */
  @Column({ name: 'scoring_adjustments', type: 'jsonb' })
  scoringAdjustments: Record<string, any>;

  /**
   * Whether this adjustment is active
   */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Notes about this regional adjustment
   */
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;

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
   * User ID who created this adjustment
   */
  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  /**
   * User ID who last updated this adjustment
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
