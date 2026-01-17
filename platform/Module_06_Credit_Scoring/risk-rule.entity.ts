import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BuyerProfile } from './buyer-profile.entity';
import { RiskLevel } from './risk-level.enum';

export enum RuleType {
  CONDITIONAL = 'conditional',
  THRESHOLD = 'threshold',
  SCORING = 'scoring',
  VALIDATION = 'validation',
  ALERT = 'alert',
  AUTOMATION = 'automation'
}

export enum RuleCategory {
  CREDIT_SCORING = 'credit_scoring',
  PAYMENT_BEHAVIOR = 'payment_behavior',
  FINANCIAL_HEALTH = 'financial_health',
  INDUSTRY_RISK = 'industry_risk',
  OPERATIONAL_RISK = 'operational_risk',
  COMPLIANCE = 'compliance',
  FRAUD_DETECTION = 'fraud_detection'
}

export enum RuleOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_EQUAL = 'greater_equal',
  LESS_EQUAL = 'less_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  IN = 'in',
  NOT_IN = 'not_in',
  BETWEEN = 'between',
  REGEX = 'regex'
}

export enum RuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  DEPRECATED = 'deprecated',
  TESTING = 'testing'
}

export enum RuleTrigger {
  ON_CREATE = 'on_create',
  ON_UPDATE = 'on_update',
  ON_SCHEDULE = 'on_schedule',
  ON_EVENT = 'on_event',
  MANUAL = 'manual'
}

@Entity('risk_rules')
export class RiskRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: RuleType,
    default: RuleType.CONDITIONAL
  })
  ruleType: RuleType;

  @Column({
    type: 'enum',
    enum: RuleCategory,
    default: RuleCategory.CREDIT_SCORING
  })
  category: RuleCategory;

  @Column({
    type: 'enum',
    enum: RuleStatus,
    default: RuleStatus.ACTIVE
  })
  status: RuleStatus;

  @Column({
    type: 'enum',
    enum: RuleTrigger,
    default: RuleTrigger.ON_CREATE
  })
  trigger: RuleTrigger;

  @Column({ type: 'jsonb', default: {} })
  conditions: Array<{
    field: string;
    operator: RuleOperator;
    value: any;
    logicalOperator?: 'AND' | 'OR';
    weight?: number;
  }>;

  @Column({ type: 'jsonb', default: {} })
  actions: Array<{
    type: 'alert' | 'score_adjustment' | 'status_change' | 'notification' | 'flag';
    parameters: Record<string, any>;
    priority: 'high' | 'medium' | 'low';
  }>;

  @Column({ type: 'jsonb', default: {} })
  configuration: {
    executionOrder: number;
    retryCount: number;
    timeout: number;
    parallelExecution: boolean;
    cacheResults: boolean;
    cacheDuration: number;
  };

  @Column({ type: 'jsonb', default: {} })
  parameters: {
    thresholds: Record<string, number>;
    weights: Record<string, number>;
    formulas: Record<string, string>;
    mappings: Record<string, any>;
  };

  @Column({ type: 'jsonb', default: {} })
  validationRules: {
    requiredFields: string[];
    dataTypes: Record<string, string>;
    valueRanges: Record<string, [number, number]>;
    customValidators: string[];
  };

  @Column({ type: 'jsonb', default: {} })
  testCases: Array<{
    name: string;
    description: string;
    inputData: Record<string, any>;
    expectedOutput: any;
    actualOutput?: any;
    passed?: boolean;
    errorMessage?: string;
  }>;

  @Column({ type: 'jsonb', default: {} })
  performanceMetrics: {
    averageExecutionTime: number;
    successRate: number;
    errorRate: number;
    lastExecuted: Date;
    totalExecutions: number;
  };

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.00 })
  priority: number;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'parent_rule_id', type: 'varchar', length: 255, nullable: true })
  parentRuleId: string;

  @ManyToOne(() => RiskRule, { nullable: true })
  @JoinColumn({ name: 'parent_rule_id' })
  parentRule: RiskRule;

  @OneToMany(() => RiskRule, rule => rule.parentRule)
  childRules: RiskRule[];

  @Column({ name: 'buyer_profile_id', type: 'varchar', length: 255, nullable: true })
  buyerProfileId: string;

  @ManyToOne(() => BuyerProfile, { nullable: true })
  @JoinColumn({ name: 'buyer_profile_id' })
  buyerProfile: BuyerProfile;

  @Column({ type: 'jsonb', default: {} })
  dependencies: Array<{
    ruleId: string;
    ruleName: string;
    dependencyType: 'sequential' | 'parallel' | 'conditional';
    required: boolean;
  }>;

  @Column({ type: 'jsonb', default: {} })
  executionHistory: Array<{
    executedAt: Date;
    triggeredBy: string;
    inputData: Record<string, any>;
    output: any;
    executionTime: number;
    success: boolean;
    errorMessage?: string;
  }>;

  @Column({ name: 'schedule_expression', type: 'varchar', length: 255, nullable: true })
  scheduleExpression: string; // Cron expression for scheduled rules

  @Column({ name: 'last_executed', type: 'timestamp', nullable: true })
  lastExecuted: Date;

  @Column({ name: 'next_execution', type: 'timestamp', nullable: true })
  nextExecution: Date;

  @Column({ type: 'jsonb', default: {} })
  notifications: {
    onSuccess: Array<{
      type: 'email' | 'sms' | 'webhook' | 'in_app';
      recipients: string[];
      template: string;
      enabled: boolean;
    }>;
    onFailure: Array<{
      type: 'email' | 'sms' | 'webhook' | 'in_app';
      recipients: string[];
      template: string;
      enabled: boolean;
    }>;
  };

  @Column({ type: 'jsonb', default: {} })
  auditTrail: Array<{
    action: string;
    performedBy: string;
    performedAt: Date;
    changes: Record<string, any>;
    reason?: string;
  }>;

  @Column({ name: 'is_global', type: 'boolean', default: false })
  isGlobal: boolean;

  @Column({ name: 'is_template', type: 'boolean', default: false })
  isTemplate: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    tags: string[];
    labels: Record<string, string>;
    documentation: string;
    examples: Array<{
      description: string;
      input: Record<string, any>;
      output: any;
    }>;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 255 })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 255, nullable: true })
  updatedBy: string;
}
