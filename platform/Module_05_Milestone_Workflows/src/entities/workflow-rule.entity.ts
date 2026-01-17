import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { WorkflowInstance } from './workflow-instance.entity';
import { WorkflowExecution } from './workflow-execution.entity';

export enum RuleType {
  AMOUNT_BASED = 'amount_based',
  CUSTOMER_BASED = 'customer_based',
  INDUSTRY_BASED = 'industry_based',
  GEOGRAPHIC = 'geographic',
  CUSTOM = 'custom',
  TIME_BASED = 'time_based',
  BEHAVIORAL = 'behavioral',
  RISK_BASED = 'risk_based'
}

export enum RuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
  TESTING = 'testing'
}

export enum RulePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface RuleConditions {
  amountRange?: { min: number; max: number };
  customerSegments?: string[];
  industries?: string[];
  geographies?: string[];
  customConditions?: Record<string, any>;
  timeConditions?: {
    startTime?: string;
    endTime?: string;
    daysOfWeek?: number[];
    holidays?: string[];
  };
  behavioralConditions?: {
    actions?: string[];
    frequency?: number;
    recency?: number;
  };
  riskConditions?: {
    riskScore?: { min: number; max: number };
    riskFactors?: string[];
  };
}

export interface RuleActions {
  assignTo?: string;
  setPriority?: RulePriority;
  sendNotification?: boolean;
  escalate?: boolean;
  requireApproval?: boolean;
  customActions?: Record<string, any>;
}

export interface RuleMetrics {
  executionsCount: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime: number;
  lastExecuted?: Date;
  successRate: number;
  errorRate: number;
}

@Entity('workflow_rules')
export class WorkflowRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'workflow_instance_id' })
  workflowInstanceId: string;

  @ManyToOne(() => WorkflowInstance, { eager: true })
  @JoinColumn({ name: 'workflow_instance_id' })
  workflowInstance: WorkflowInstance;

  @Column({
    type: 'enum',
    enum: RuleType
  })
  ruleType: RuleType;

  @Column({
    type: 'enum',
    enum: RuleStatus,
    default: RuleStatus.DRAFT
  })
  status: RuleStatus;

  @Column({
    type: 'enum',
    enum: RulePriority,
    default: RulePriority.MEDIUM
  })
  priority: RulePriority;

  @Column({ type: 'jsonb' })
  conditions: RuleConditions;

  @Column({ type: 'jsonb' })
  actions: RuleActions;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidenceScore?: number;

  @Column({ name: 'success_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  successRate: number;

  @Column({ name: 'execution_count', type: 'int', default: 0 })
  executionCount: number;

  @Column({ name: 'last_executed', type: 'timestamp', nullable: true })
  lastExecuted?: Date;

  @Column({ name: 'last_optimized', type: 'timestamp', nullable: true })
  lastOptimized?: Date;

  @Column({ name: 'optimization_count', type: 'int', default: 0 })
  optimizationCount: number;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @Column({ name: 'is_system_rule', type: 'boolean', default: false })
  isSystemRule: boolean;

  @Column({ name: 'is_ml_optimized', type: 'boolean', default: false })
  isMLOptimized: boolean;

  @Column({ name: 'ml_model_version', type: 'varchar', length: 50, nullable: true })
  mlModelVersion?: string;

  @Column({ name: 'performance_metrics', type: 'jsonb', nullable: true })
  performanceMetrics?: RuleMetrics;

  @Column({ name: 'tags', type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ name: 'created_by', type: 'varchar', length: 255 })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 255, nullable: true })
  updatedBy?: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  isActive(): boolean {
    return this.status === RuleStatus.ACTIVE;
  }

  canExecute(): boolean {
    return this.isActive() && this.conditions && this.actions;
  }

  updateMetrics(execution: WorkflowExecution): void {
    this.executionCount++;
    this.lastExecuted = new Date();
    
    if (execution.isCompleted()) {
      this.successRate = ((this.successRate * (this.executionCount - 1)) + 100) / this.executionCount;
    } else {
      this.successRate = (this.successRate * (this.executionCount - 1)) / this.executionCount;
    }
  }

  getRiskLevel(): 'low' | 'medium' | 'high' {
    if (this.successRate >= 90) return 'low';
    if (this.successRate >= 70) return 'medium';
    return 'high';
  }

  needsOptimization(): boolean {
    return this.successRate < 80 && this.executionCount > 10;
  }

  addTag(tag: string): void {
    if (!this.tags) this.tags = [];
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    if (this.tags) {
      this.tags = this.tags.filter(t => t !== tag);
    }
  }

  hasTag(tag: string): boolean {
    return this.tags ? this.tags.includes(tag) : false;
  }
}
