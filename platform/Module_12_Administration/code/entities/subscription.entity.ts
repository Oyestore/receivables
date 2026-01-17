import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum PlanType {
  SUBSCRIPTION = 'subscription',
  USAGE = 'usage',
  HYBRID = 'hybrid',
  ENTERPRISE = 'enterprise',
  TRIAL = 'trial',
  FREEMIUM = 'freemium',
}

export enum PlanStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
  ARCHIVED = 'archived',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
  USAGE_BASED = 'usage_based',
  ONE_TIME = 'one_time',
}

export enum AccessLevel {
  NONE = 'none',
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
  OWNER = 'owner',
}

export enum RateType {
  PER_TRANSACTION = 'per_transaction',
  PER_USER = 'per_user',
  PER_GB = 'per_gb',
  PER_HOUR = 'per_hour',
  PER_API_CALL = 'per_api_call',
}

@Entity('subscription_plans')
@Index(['plan_name'], { unique: true })
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  planId: string;

  @Column({ length: 255 })
  planName: string;

  @Column({
    type: 'enum',
    enum: PlanType,
  })
  planType: PlanType;

  @Column({
    type: 'enum',
    enum: PlanStatus,
    default: PlanStatus.DRAFT,
  })
  status: PlanStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.00 })
  basePrice: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: BillingCycle,
    nullable: true,
  })
  billingCycle: BillingCycle;

  @Column({ type: 'timestamp with time zone', nullable: true })
  effectiveDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expirationDate: Date;

  @Column({ type: 'jsonb', default: '{}' })
  featureSet: Record<string, any>;

  @Column({ type: 'jsonb', default: '{}' })
  usageLimits: Record<string, any>;

  @Column({ type: 'jsonb', default: '{}' })
  pricingRules: Record<string, any>;

  @Column({ type: 'jsonb', default: '[]' })
  targetSegments: string[];

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  termsAndConditions: string;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @Column()
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;

  @Column({ default: 1 })
  version: number;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;
}

@Entity('plan_features')
@Index(['planId', 'moduleName', 'featureName'], { unique: true })
export class PlanFeature {
  @PrimaryGeneratedColumn('uuid')
  featureId: string;

  @Column()
  planId: string;

  @Column({ length: 100 })
  moduleName: string;

  @Column({ length: 255 })
  featureName: string;

  @Column({
    type: 'enum',
    enum: AccessLevel,
    default: AccessLevel.READ,
  })
  accessLevel: AccessLevel;

  @Column({ default: -1 })
  usageLimit: number;

  @Column({ type: 'jsonb', default: '{}' })
  featureConfig: Record<string, any>;

  @Column({ default: true })
  isEnabled: boolean;

  @CreateDateColumn()
  createdDate: Date;
}

@Entity('usage_rates')
export class UsageRate {
  @PrimaryGeneratedColumn('uuid')
  rateId: string;

  @Column()
  planId: string;

  @Column({ length: 100 })
  moduleName: string;

  @Column({
    type: 'enum',
    enum: RateType,
  })
  rateType: RateType;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0.0000 })
  rateAmount: number;

  @Column({ default: 0 })
  includedQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0.0000 })
  overageRate: number;

  @Column({ length: 50 })
  billingUnit: string;

  @Column({ type: 'jsonb', default: '[]' })
  tierPricing: Record<string, any>[];

  @CreateDateColumn()
  createdDate: Date;
}
