/**
 * Subscription Plan Entity for Platform-Level Billing Management
 * SME Receivables Management Platform - Administrative Module
 * 
 * @fileoverview Comprehensive subscription plan entity for billing and access control
 * @version 1.0.0
 * @since 2025-01-21
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  Check
} from 'typeorm';
import {
  SubscriptionPlanType,
  BillingCycle,
  Currency,
  PlatformModule
} from '@shared/enums/administrative.enum';
import {
  ISubscriptionPlan,
  IFeatureSet,
  IUsageLimits,
  IPricingRules
} from '@shared/interfaces/administrative.interface';
import { Tenant } from './tenant.entity';
import { TenantSubscription } from './tenant-subscription.entity';
import { PlanFeature } from './plan-feature.entity';
import { UsageRate } from './usage-rate.entity';

/**
 * Subscription Plan entity for defining billing plans and feature access
 * Supports multiple pricing models including subscription, usage-based, and hybrid
 */
@Entity('subscription_plans', { schema: 'admin_platform' })
@Index(['status'])
@Index(['planType'])
@Index(['effectiveDate'])
@Index(['planName'], { unique: true })
@Check(`plan_type IN ('subscription', 'usage', 'hybrid', 'enterprise', 'trial', 'freemium')`)
@Check(`status IN ('draft', 'active', 'deprecated', 'archived')`)
@Check(`billing_cycle IN ('monthly', 'quarterly', 'annual', 'usage_based', 'one_time')`)
@Check(`currency IN ('USD', 'INR', 'EUR', 'GBP', 'SGD', 'AED', 'CAD', 'AUD')`)
export class SubscriptionPlan implements ISubscriptionPlan {
  /**
   * Unique identifier for the subscription plan
   */
  @PrimaryGeneratedColumn('uuid', { name: 'plan_id' })
  id: string;

  /**
   * Plan ID for external references (same as id for consistency)
   */
  @Column({ name: 'plan_id', type: 'uuid', insert: false, update: false })
  planId: string;

  /**
   * Human-readable plan name (must be unique)
   */
  @Column({ 
    name: 'plan_name', 
    type: 'varchar', 
    length: 255,
    unique: true
  })
  planName: string;

  /**
   * Type of subscription plan
   */
  @Column({ 
    name: 'plan_type', 
    type: 'enum',
    enum: SubscriptionPlanType
  })
  planType: SubscriptionPlanType;

  /**
   * Current status of the plan
   */
  @Column({ 
    name: 'status', 
    type: 'varchar',
    length: 50,
    default: 'draft'
  })
  status: string;

  /**
   * Base price for subscription plans
   */
  @Column({ 
    name: 'base_price', 
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.00
  })
  basePrice: number;

  /**
   * Currency for pricing
   */
  @Column({ 
    name: 'currency', 
    type: 'enum',
    enum: Currency,
    default: Currency.USD
  })
  currency: Currency;

  /**
   * Billing cycle for recurring charges
   */
  @Column({ 
    name: 'billing_cycle', 
    type: 'enum',
    enum: BillingCycle,
    nullable: true
  })
  billingCycle: BillingCycle;

  /**
   * Date when plan becomes effective
   */
  @Column({ 
    name: 'effective_date', 
    type: 'timestamp with time zone',
    nullable: true
  })
  effectiveDate?: Date;

  /**
   * Date when plan expires or is deprecated
   */
  @Column({ 
    name: 'expiration_date', 
    type: 'timestamp with time zone',
    nullable: true
  })
  expirationDate?: Date;

  /**
   * Feature set included in the plan
   */
  @Column({ 
    name: 'feature_set', 
    type: 'jsonb',
    default: {}
  })
  featureSet: IFeatureSet;

  /**
   * Usage limits for the plan
   */
  @Column({ 
    name: 'usage_limits', 
    type: 'jsonb',
    default: {}
  })
  usageLimits: IUsageLimits;

  /**
   * Pricing rules for dynamic pricing
   */
  @Column({ 
    name: 'pricing_rules', 
    type: 'jsonb',
    default: {}
  })
  pricingRules: IPricingRules;

  /**
   * Target customer segments for this plan
   */
  @Column({ 
    name: 'target_segments', 
    type: 'jsonb',
    default: []
  })
  targetSegments: string[];

  /**
   * Plan description for marketing and documentation
   */
  @Column({ 
    name: 'description', 
    type: 'text',
    nullable: true
  })
  description?: string;

  /**
   * Terms and conditions for the plan
   */
  @Column({ 
    name: 'terms_and_conditions', 
    type: 'text',
    nullable: true
  })
  termsAndConditions?: string;

  /**
   * Record creation timestamp
   */
  @CreateDateColumn({ 
    name: 'created_date',
    type: 'timestamp with time zone'
  })
  createdDate: Date;

  /**
   * Record last update timestamp
   */
  @UpdateDateColumn({ 
    name: 'updated_date',
    type: 'timestamp with time zone'
  })
  updatedDate: Date;

  /**
   * ID of user who created this record
   */
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  /**
   * ID of user who last updated this record
   */
  @Column({ 
    name: 'updated_by', 
    type: 'uuid',
    nullable: true
  })
  updatedBy?: string;

  /**
   * Version number for optimistic locking
   */
  @Column({ 
    name: 'version', 
    type: 'integer',
    default: 1
  })
  version: number;

  /**
   * Additional metadata for extensibility
   */
  @Column({ 
    name: 'metadata', 
    type: 'jsonb',
    default: {}
  })
  metadata?: Record<string, any>;

  // =====================================================================================
  // RELATIONSHIPS
  // =====================================================================================

  /**
   * Tenants using this subscription plan
   */
  @OneToMany(() => Tenant, tenant => tenant.subscriptionPlan)
  tenants: Tenant[];

  /**
   * Active subscriptions for this plan
   */
  @OneToMany(() => TenantSubscription, subscription => subscription.plan)
  subscriptions: TenantSubscription[];

  /**
   * Plan features and access levels
   */
  @OneToMany(() => PlanFeature, feature => feature.plan, { 
    cascade: true,
    eager: false
  })
  planFeatures: PlanFeature[];

  /**
   * Usage rates for billing calculations
   */
  @OneToMany(() => UsageRate, rate => rate.plan, { 
    cascade: true,
    eager: false
  })
  usageRates: UsageRate[];

  // =====================================================================================
  // COMPUTED PROPERTIES
  // =====================================================================================

  /**
   * Check if plan is currently active
   */
  get isActive(): boolean {
    return this.status === 'active';
  }

  /**
   * Check if plan is deprecated
   */
  get isDeprecated(): boolean {
    return this.status === 'deprecated';
  }

  /**
   * Check if plan is archived
   */
  get isArchived(): boolean {
    return this.status === 'archived';
  }

  /**
   * Check if plan is in draft status
   */
  get isDraft(): boolean {
    return this.status === 'draft';
  }

  /**
   * Check if plan is currently effective
   */
  get isEffective(): boolean {
    const now = new Date();
    const effective = !this.effectiveDate || this.effectiveDate <= now;
    const notExpired = !this.expirationDate || this.expirationDate > now;
    return this.isActive && effective && notExpired;
  }

  /**
   * Check if plan has expired
   */
  get isExpired(): boolean {
    return this.expirationDate ? this.expirationDate <= new Date() : false;
  }

  /**
   * Get monthly equivalent price for comparison
   */
  get monthlyEquivalentPrice(): number {
    if (this.planType === SubscriptionPlanType.USAGE) {
      return 0; // Usage-based plans don't have a fixed monthly price
    }

    switch (this.billingCycle) {
      case BillingCycle.MONTHLY:
        return this.basePrice;
      case BillingCycle.QUARTERLY:
        return this.basePrice / 3;
      case BillingCycle.ANNUAL:
        return this.basePrice / 12;
      default:
        return this.basePrice;
    }
  }

  /**
   * Get enabled modules for this plan
   */
  get enabledModules(): PlatformModule[] {
    return this.featureSet?.modules || [];
  }

  /**
   * Get total feature count
   */
  get totalFeatureCount(): number {
    const features = this.featureSet?.features || {};
    return Object.values(features).reduce((total, moduleFeatures) => {
      return total + (Array.isArray(moduleFeatures) ? moduleFeatures.length : 0);
    }, 0);
  }

  /**
   * Check if plan supports unlimited usage
   */
  get hasUnlimitedUsage(): boolean {
    const limits = this.usageLimits;
    return Object.values(limits).some(limit => limit === -1);
  }

  /**
   * Get plan tier based on pricing
   */
  get planTier(): 'free' | 'basic' | 'professional' | 'enterprise' {
    if (this.basePrice === 0) return 'free';
    if (this.basePrice < 100) return 'basic';
    if (this.basePrice < 500) return 'professional';
    return 'enterprise';
  }

  // =====================================================================================
  // BUSINESS METHODS
  // =====================================================================================

  /**
   * Activate the plan
   */
  activate(): void {
    if (this.status === 'archived') {
      throw new Error('Cannot activate an archived plan');
    }
    this.status = 'active';
    if (!this.effectiveDate) {
      this.effectiveDate = new Date();
    }
  }

  /**
   * Deprecate the plan (no new subscriptions allowed)
   */
  deprecate(): void {
    if (this.status === 'archived') {
      throw new Error('Cannot deprecate an archived plan');
    }
    this.status = 'deprecated';
  }

  /**
   * Archive the plan (completely disable)
   */
  archive(): void {
    this.status = 'archived';
    this.expirationDate = new Date();
  }

  /**
   * Check if a module is included in this plan
   */
  includesModule(module: PlatformModule): boolean {
    return this.enabledModules.includes(module);
  }

  /**
   * Check if a specific feature is enabled for a module
   */
  hasFeature(module: PlatformModule, feature: string): boolean {
    const moduleFeatures = this.featureSet?.features?.[module];
    return Array.isArray(moduleFeatures) && moduleFeatures.includes(feature);
  }

  /**
   * Get usage limit for a specific resource
   */
  getUsageLimit(resource: keyof IUsageLimits): number {
    return this.usageLimits?.[resource] || 0;
  }

  /**
   * Check if usage limit is unlimited for a resource
   */
  isUnlimited(resource: keyof IUsageLimits): boolean {
    return this.getUsageLimit(resource) === -1;
  }

  /**
   * Add a module to the plan
   */
  addModule(module: PlatformModule, features: string[] = []): void {
    if (!this.featureSet.modules) {
      this.featureSet.modules = [];
    }
    if (!this.featureSet.modules.includes(module)) {
      this.featureSet.modules.push(module);
    }
    
    if (features.length > 0) {
      if (!this.featureSet.features) {
        this.featureSet.features = {};
      }
      this.featureSet.features[module] = features;
    }
  }

  /**
   * Remove a module from the plan
   */
  removeModule(module: PlatformModule): void {
    if (this.featureSet.modules) {
      this.featureSet.modules = this.featureSet.modules.filter(m => m !== module);
    }
    if (this.featureSet.features) {
      delete this.featureSet.features[module];
    }
  }

  /**
   * Update usage limits
   */
  updateUsageLimits(limits: Partial<IUsageLimits>): void {
    this.usageLimits = { ...this.usageLimits, ...limits };
  }

  /**
   * Update pricing rules
   */
  updatePricingRules(rules: Partial<IPricingRules>): void {
    this.pricingRules = { ...this.pricingRules, ...rules };
  }

  /**
   * Calculate price for a billing period
   */
  calculatePrice(usageData?: Record<string, number>): number {
    let totalPrice = this.basePrice;

    if (this.planType === SubscriptionPlanType.USAGE && usageData) {
      // Calculate usage-based pricing
      totalPrice = this.calculateUsagePrice(usageData);
    } else if (this.planType === SubscriptionPlanType.HYBRID && usageData) {
      // Calculate hybrid pricing (base + usage)
      totalPrice = this.basePrice + this.calculateUsagePrice(usageData);
    }

    // Apply pricing rules if any
    if (this.pricingRules?.baseRules) {
      totalPrice = this.applyPricingRules(totalPrice, usageData);
    }

    return Math.max(0, totalPrice);
  }

  /**
   * Calculate usage-based pricing
   */
  private calculateUsagePrice(usageData: Record<string, number>): number {
    let usagePrice = 0;

    // This would typically use the usage rates from the related UsageRate entities
    // For now, we'll use a simplified calculation
    Object.entries(usageData).forEach(([metric, value]) => {
      const rate = this.getUsageRate(metric);
      if (rate > 0) {
        usagePrice += value * rate;
      }
    });

    return usagePrice;
  }

  /**
   * Get usage rate for a specific metric
   */
  private getUsageRate(metric: string): number {
    // This would typically query the UsageRate entities
    // For now, return a default rate
    return 0.01; // $0.01 per unit
  }

  /**
   * Apply pricing rules to calculate final price
   */
  private applyPricingRules(basePrice: number, usageData?: Record<string, number>): number {
    let finalPrice = basePrice;

    // Apply discount rules
    if (this.pricingRules?.discountRules) {
      this.pricingRules.discountRules.forEach(rule => {
        if (this.isDiscountRuleApplicable(rule, usageData)) {
          if (rule.type === 'percentage') {
            finalPrice *= (1 - rule.value / 100);
          } else if (rule.type === 'fixed') {
            finalPrice -= rule.value;
          }
        }
      });
    }

    return finalPrice;
  }

  /**
   * Check if discount rule is applicable
   */
  private isDiscountRuleApplicable(rule: any, usageData?: Record<string, number>): boolean {
    const now = new Date();
    
    // Check validity period
    if (rule.validFrom && new Date(rule.validFrom) > now) return false;
    if (rule.validTo && new Date(rule.validTo) < now) return false;
    
    // Check usage limits if applicable
    if (rule.maxUsage && rule.currentUsage >= rule.maxUsage) return false;
    
    // Additional condition checks would go here
    return true;
  }

  /**
   * Get plan comparison data
   */
  getComparisonData(): {
    name: string;
    type: SubscriptionPlanType;
    price: number;
    currency: Currency;
    billingCycle: BillingCycle;
    moduleCount: number;
    featureCount: number;
    userLimit: number;
    storageLimit: number;
    isUnlimited: boolean;
  } {
    return {
      name: this.planName,
      type: this.planType,
      price: this.basePrice,
      currency: this.currency,
      billingCycle: this.billingCycle,
      moduleCount: this.enabledModules.length,
      featureCount: this.totalFeatureCount,
      userLimit: this.usageLimits?.users || 0,
      storageLimit: this.usageLimits?.storage || 0,
      isUnlimited: this.hasUnlimitedUsage
    };
  }

  /**
   * Validate plan configuration
   */
  validateConfiguration(): string[] {
    const errors: string[] = [];

    if (!this.planName?.trim()) {
      errors.push('Plan name is required');
    }

    if (!this.planType) {
      errors.push('Plan type is required');
    }

    if (this.basePrice < 0) {
      errors.push('Base price cannot be negative');
    }

    if (this.planType !== SubscriptionPlanType.USAGE && !this.billingCycle) {
      errors.push('Billing cycle is required for non-usage plans');
    }

    if (this.effectiveDate && this.expirationDate && this.effectiveDate >= this.expirationDate) {
      errors.push('Effective date must be before expiration date');
    }

    if (!this.createdBy) {
      errors.push('Created by user ID is required');
    }

    return errors;
  }

  /**
   * Prepare entity for database insertion
   */
  beforeInsert(): void {
    this.planId = this.id;
    this.version = 1;
    this.createdDate = new Date();
    this.updatedDate = new Date();
    
    // Set default feature set if not provided
    if (!this.featureSet) {
      this.featureSet = {
        modules: [],
        features: {},
        limits: {},
        restrictions: {}
      };
    }

    // Set default usage limits if not provided
    if (!this.usageLimits) {
      this.usageLimits = {
        users: 10,
        storage: 10,
        apiCalls: 10000,
        computeHours: 100,
        integrations: 5,
        customFields: 50,
        workflows: 10,
        reports: 20
      };
    }

    // Set default pricing rules if not provided
    if (!this.pricingRules) {
      this.pricingRules = {
        baseRules: [],
        usageRules: [],
        discountRules: [],
        overageRules: []
      };
    }
  }

  /**
   * Prepare entity for database update
   */
  beforeUpdate(): void {
    this.updatedDate = new Date();
    this.version += 1;
  }
}

