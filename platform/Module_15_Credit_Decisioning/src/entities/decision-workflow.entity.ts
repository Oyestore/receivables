import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export enum StepType {
  START = 'start',
  EVALUATION = 'evaluation',
  APPROVAL = 'approval',
  REVIEW = 'review',
  ESCALATION = 'escalation',
  END = 'end',
}

export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  FAILED = 'failed',
}

@Entity('decision_workflows')
@Index(['name'])
@Index(['status'])
@Index(['decisionType'])
@Index(['createdAt'])
export class DecisionWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.DRAFT,
  })
  status: WorkflowStatus;

  @Column({ name: 'decision_type', length: 100 })
  decisionType: string;

  @Column({ name: 'entity_types', type: 'jsonb', default: '[]' })
  entityTypes: string[];

  @Column({ name: 'version', type: 'int', default: 1 })
  version: string;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'auto_execute', default: true })
  autoExecute: boolean;

  @Column({ name: 'timeout_minutes', type: 'int', nullable: true })
  timeoutMinutes: number;

  @Column({ name: 'escalation_rules', type: 'jsonb', nullable: true })
  escalationRules: Array<{
    condition: string;
    escalateTo: string;
    timeoutMinutes: number;
  }>;

  @Column({ name: 'approval_matrix', type: 'jsonb', nullable: true })
  approvalMatrix: {
    amountRanges: Array<{
      min: number;
      max: number;
      requiredApprovals: number;
      approverRoles: string[];
      parallelApproval: boolean;
    }>;
    roleHierarchy: string[];
  };

  @Column({ name: 'conditions', type: 'jsonb', nullable: true })
  conditions: {
    requiredFields: string[];
    validationRules: Array<{
      field: string;
      rule: string;
      errorMessage: string;
    }>;
  };

  @Column({ name: 'steps', type: 'jsonb' })
  steps: Array<{
    id: string;
    name: string;
    type: StepType;
    order: number;
    assigneeType: 'role' | 'user' | 'system';
    assigneeValue: string;
    conditions: Record<string, any>;
    actions: Array<{
      type: string;
      parameters: Record<string, any>;
    }>;
    timeoutMinutes: number;
    isRequired: boolean;
    parallelAllowed: boolean;
  }>;

  @Column({ name: 'transitions', type: 'jsonb', default: '[]' })
  transitions: Array<{
    fromStep: string;
    toStep: string;
    condition: string;
    action: string;
  }>;

  @Column({ name: 'notifications', type: 'jsonb', nullable: true })
  notifications: {
    onStepStart: Array<{
      step: string;
      recipients: string[];
      template: string;
    }>;
    onStepComplete: Array<{
      step: string;
      recipients: string[];
      template: string;
    }>;
    onEscalation: Array<{
      recipients: string[];
      template: string;
    }>;
  };

  @Column({ name: 'sla_settings', type: 'jsonb', nullable: true })
  slaSettings: {
    maxProcessingTime: number;
    warningThreshold: number;
    breachActions: Array<{
      action: string;
      parameters: Record<string, any>;
    }>;
  };

  @Column({ name: 'performance_metrics', type: 'jsonb', nullable: true })
  performanceMetrics: {
    totalExecutions: number;
    averageProcessingTime: number;
    successRate: number;
    stepCompletionRates: Record<string, number>;
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
