import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum RuleType {
  CONDITIONAL = 'conditional',
  THRESHOLD = 'threshold',
  SCORING = 'scoring',
  VALIDATION = 'validation',
  APPROVAL = 'approval',
  RISK_ASSESSMENT = 'risk_assessment',
}

export enum RuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
}

export enum Operator {
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
  REGEX = 'regex',
}

export enum ActionType {
  APPROVE = 'approve',
  REJECT = 'reject',
  ESCALATE = 'escalate',
  REQUEST_INFO = 'request_info',
  ASSIGN_REVIEWER = 'assign_reviewer',
  APPLY_CONDITIONS = 'apply_conditions',
  CALCULATE_SCORE = 'calculate_score',
  NOTIFY = 'notify',
}

@Entity('decision_rules')
@Index(['name'])
@Index(['ruleType'])
@Index(['status'])
@Index(['priority'])
@Index(['createdAt'])
export class DecisionRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: RuleType,
  })
  ruleType: RuleType;

  @Column({
    type: 'enum',
    enum: RuleStatus,
    default: RuleStatus.ACTIVE,
  })
  status: RuleStatus;

  @Column({ name: 'priority', type: 'int', default: 0 })
  priority: number;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @Column({ name: 'category', length: 100, nullable: true })
  category: string;

  @Column({ name: 'entity_types', type: 'jsonb', default: '[]' })
  entityTypes: string[]; // ['customer', 'invoice', 'loan_application']

  @Column({ name: 'decision_types', type: 'jsonb', default: '[]' })
  decisionTypes: string[]; // ['credit_limit', 'financing_approval']

  @Column({ name: 'conditions', type: 'jsonb' })
  conditions: Array<{
    field: string;
    operator: Operator;
    value: any;
    weight?: number;
    description?: string;
  }>;

  @Column({ name: 'actions', type: 'jsonb' })
  actions: Array<{
    type: ActionType;
    parameters: Record<string, any>;
    conditions?: Record<string, any>;
  }>;

  @Column({ name: 'scoring_algorithm', type: 'jsonb', nullable: true })
  scoringAlgorithm: {
    type: 'weighted_average' | 'min_max' | 'custom';
    weights: Record<string, number>;
    thresholds: Record<string, number>;
  };

  @Column({ name: 'risk_parameters', type: 'jsonb', nullable: true })
  riskParameters: {
    riskFactors: Array<{
      factor: string;
      weight: number;
      impact: 'positive' | 'negative';
    }>;
    riskThresholds: Record<string, number>;
  };

  @Column({ name: 'approval_matrix', type: 'jsonb', nullable: true })
  approvalMatrix: {
    amountRanges: Array<{
      min: number;
      max: number;
      requiredApprovals: number;
      approverRoles: string[];
    }>;
    escalationRules: Array<{
      condition: string;
      escalateTo: string;
    }>;
  };

  @Column({ name: 'execution_order', type: 'int', default: 0 })
  executionOrder: number;

  @Column({ name: 'is_mandatory', default: false })
  isMandatory: boolean;

  @Column({ name: 'can_be_overridden', default: true })
  canBeOverridden: boolean;

  @Column({ name: 'override_reasons', type: 'jsonb', default: '[]' })
  overrideReasons: string[];

  @Column({ name: 'test_cases', type: 'jsonb', default: '[]' })
  testCases: Array<{
    name: string;
    input: Record<string, any>;
    expectedOutput: Record<string, any>;
  }>;

  @Column({ name: 'performance_metrics', type: 'jsonb', nullable: true })
  performanceMetrics: {
    executionCount: number;
    averageExecutionTime: number;
    successRate: number;
    lastExecuted: Date;
  };

  @Column({ name: 'tags', type: 'jsonb', default: '[]' })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  @Column({ name: 'effective_from', type: 'timestamp', nullable: true })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'timestamp', nullable: true })
  effectiveTo: Date;
}
