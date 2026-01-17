import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { WorkflowInstance } from './workflow-instance.entity';
import { WorkflowRule } from './workflow-rule.entity';

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

export enum ExecutionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

@Entity('workflow_executions')
export class WorkflowExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workflow_instance_id' })
  workflowInstanceId: string;

  @ManyToOne(() => WorkflowInstance, { eager: true })
  @JoinColumn({ name: 'workflow_instance_id' })
  workflowInstance: WorkflowInstance;

  @Column({ name: 'rule_id', nullable: true })
  ruleId?: string;

  @ManyToOne(() => WorkflowRule, { eager: false, nullable: true })
  @JoinColumn({ name: 'rule_id' })
  rule?: WorkflowRule;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.PENDING
  })
  status: ExecutionStatus;

  @Column({
    type: 'enum',
    enum: ExecutionPriority,
    default: ExecutionPriority.MEDIUM
  })
  priority: ExecutionPriority;

  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  input: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'execution_path', type: 'jsonb', nullable: true })
  executionPath: Array<{
    stepId: string;
    stepName: string;
    status: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    result?: any;
  }>;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'error_details', type: 'jsonb', nullable: true })
  errorDetails?: Record<string, any>;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', type: 'int', default: 3 })
  maxRetries: number;

  @Column({ name: 'execution_time', type: 'int', nullable: true })
  executionTime?: number; // in milliseconds

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ name: 'timeout_at', type: 'timestamp', nullable: true })
  timeoutAt?: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 255 })
  createdBy: string;

  @Column({ name: 'assigned_to', type: 'varchar', length: 255, nullable: true })
  assignedTo?: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  isRunning(): boolean {
    return this.status === ExecutionStatus.RUNNING;
  }

  isCompleted(): boolean {
    return this.status === ExecutionStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === ExecutionStatus.FAILED;
  }

  canRetry(): boolean {
    return this.retryCount < this.maxRetries && this.isFailed();
  }

  getDuration(): number | null {
    if (this.startedAt && this.completedAt) {
      return this.completedAt.getTime() - this.startedAt.getTime();
    }
    return null;
  }

  isTimedOut(): boolean {
    return this.timeoutAt ? new Date() > this.timeoutAt : false;
  }
}
