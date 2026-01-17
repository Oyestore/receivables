import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Entity representing industry risk profiles used for sector-specific credit scoring.
 * This stores risk factors and parameters specific to different industry sectors.
 */
@Entity('industry_risk_profiles')
export class IndustryRiskProfile {
  /**
   * Unique identifier for the industry risk profile
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tenant ID for multi-tenancy support
   */
  @Column({ name: 'tenant_id' })
  tenantId: string;

  /**
   * Industry code (standard classification code)
   */
  @Column({ name: 'industry_code', length: 20 })
  industryCode: string;

  /**
   * Industry name/description
   */
  @Column({ name: 'industry_name', length: 100 })
  industryName: string;

  /**
   * Industry sector (broader category)
   */
  @Column({ name: 'industry_sector', length: 50 })
  industrySector: string;

  /**
   * Industry sub-sector (more specific category)
   */
  @Column({ name: 'industry_sub_sector', length: 50, nullable: true })
  industrySubSector: string;

  /**
   * Risk level for this industry (1-10, higher is riskier)
   */
  @Column({ name: 'base_risk_level', type: 'integer' })
  baseRiskLevel: number;

  /**
   * Risk volatility (1-10, higher means more volatile)
   */
  @Column({ name: 'risk_volatility', type: 'integer' })
  riskVolatility: number;

  /**
   * Average payment days for this industry
   */
  @Column({ name: 'avg_payment_days', type: 'integer' })
  avgPaymentDays: number;

  /**
   * Average default rate percentage for this industry
   */
  @Column({ name: 'default_rate_percentage', type: 'decimal', precision: 5, scale: 2 })
  defaultRatePercentage: number;

  /**
   * Growth trend indicator (-100 to 100, positive means growing)
   */
  @Column({ name: 'growth_trend', type: 'decimal', precision: 6, scale: 2 })
  growthTrend: number;

  /**
   * Seasonality impact (1-10, higher means stronger seasonal effects)
   */
  @Column({ name: 'seasonality_impact', type: 'integer' })
  seasonalityImpact: number;

  /**
   * Economic sensitivity (1-10, higher means more sensitive to economic changes)
   */
  @Column({ name: 'economic_sensitivity', type: 'integer' })
  economicSensitivity: number;

  /**
   * Regulatory risk (1-10, higher means more regulatory challenges)
   */
  @Column({ name: 'regulatory_risk', type: 'integer' })
  regulatoryRisk: number;

  /**
   * Working capital requirements (1-10, higher means more working capital needed)
   */
  @Column({ name: 'working_capital_requirements', type: 'integer' })
  workingCapitalRequirements: number;

  /**
   * Competitive intensity (1-10, higher means more competitive)
   */
  @Column({ name: 'competitive_intensity', type: 'integer' })
  competitiveIntensity: number;

  /**
   * Barrier to entry (1-10, higher means harder to enter)
   */
  @Column({ name: 'barrier_to_entry', type: 'integer' })
  barrierToEntry: number;

  /**
   * Technology disruption risk (1-10, higher means more disruption risk)
   */
  @Column({ name: 'technology_disruption_risk', type: 'integer' })
  technologyDisruptionRisk: number;

  /**
   * Supply chain complexity (1-10, higher means more complex)
   */
  @Column({ name: 'supply_chain_complexity', type: 'integer' })
  supplyChainComplexity: number;

  /**
   * Customer concentration risk (1-10, higher means more concentrated)
   */
  @Column({ name: 'customer_concentration_risk', type: 'integer' })
  customerConcentrationRisk: number;

  /**
   * JSON object containing industry-specific risk factors
   */
  @Column({ name: 'risk_factors', type: 'jsonb' })
  riskFactors: Record<string, any>;

  /**
   * JSON object containing scoring adjustments for this industry
   */
  @Column({ name: 'scoring_adjustments', type: 'jsonb' })
  scoringAdjustments: Record<string, any>;

  /**
   * JSON object containing industry benchmarks
   */
  @Column({ name: 'benchmarks', type: 'jsonb', nullable: true })
  benchmarks: Record<string, any>;

  /**
   * Whether this profile is active
   */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Version of the risk profile
   */
  @Column({ name: 'version', length: 20 })
  version: string;

  /**
   * Notes about this industry risk profile
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
   * User ID who created this profile
   */
  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  /**
   * User ID who last updated this profile
   */
  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;
}
