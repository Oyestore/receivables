import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { WorkflowDefinition } from './workflow-definition.entity';

export enum WorkflowInstanceStatus {
  INITIATED = 'INITIATED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  TERMINATED = 'TERMINATED',
}

export enum WorkflowInstancePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

@Entity('workflow_instances')
@Index(['tenantId', 'status'])
@Index(['workflowDefinitionId', 'status'])
@Index(['initiatedBy'])
@Index(['startDate'])
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  workflowDefinitionId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: WorkflowInstanceStatus,
    default: WorkflowInstanceStatus.INITIATED,
  })
  status: WorkflowInstanceStatus;

  @Column({
    type: 'enum',
    enum: WorkflowInstancePriority,
    default: WorkflowInstancePriority.MEDIUM,
  })
  priority: WorkflowInstancePriority;

  @Column({ type: 'varchar', length: 255 })
  initiatedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  context: any;

  @Column({ type: 'jsonb', nullable: true })
  variables: any;

  @Column({ type: 'jsonb', nullable: true })
  inputParameters: any;

  @Column({ type: 'jsonb', nullable: true })
  outputParameters: any;

  @Column({ type: 'jsonb', nullable: true })
  executionHistory: any;

  @Column({ type: 'jsonb', nullable: true })
  currentNodeStates: any;

  @Column({ type: 'jsonb', nullable: true })
  completedNodes: any;

  @Column({ type: 'jsonb', nullable: true })
  failedNodes: any;

  @Column({ type: 'jsonb', nullable: true })
  errorLog: any;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'date', nullable: true })
  lastActivityDate: Date;

  @Column({ type: 'integer', nullable: true })
  durationMinutes: number;

  @Column({ type: 'integer', default: 0 })
  progressPercentage: number;

  @Column({ type: 'integer', default: 0 })
  totalNodes: number;

  @Column({ type: 'integer', default: 0 })
  completedNodesCount: number;

  @Column({ type: 'integer', default: 0 })
  failedNodesCount: number;

  @Column({ type: 'integer', default: 0 })
  retryCount: number;

  @Column({ type: 'integer', default: 0 })
  maxRetries: number;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'jsonb', nullable: true })
  notifications: any;

  @Column({ type: 'jsonb', nullable: true })
  escalations: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ type: 'varchar', length: 255, nullable: true })
  parentInstanceId: string;

  @Column({ type: 'jsonb', nullable: true })
  childInstanceIds: string[];

  @Column({ type: 'boolean', default: false })
  isTemplate: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => WorkflowDefinition, (definition) => definition.instances)
  workflowDefinition: WorkflowDefinition;
}
