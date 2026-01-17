import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { WorkflowInstance } from './workflow-instance.entity';

export enum WorkflowStateStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum WorkflowStateType {
  START = 'START',
  TASK = 'TASK',
  DECISION = 'DECISION',
  PARALLEL = 'PARALLEL',
  MERGE = 'MERGE',
  END = 'END',
  ERROR = 'ERROR',
  CUSTOM = 'CUSTOM',
}

@Entity('workflow_states')
@Index(['workflowInstanceId', 'status'])
@Index(['nodeId'])
@Index(['stateType'])
export class WorkflowState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  workflowInstanceId: string;

  @Column({ type: 'varchar', length: 255 })
  nodeId: string;

  @Column({ type: 'varchar', length: 255 })
  nodeName: string;

  @Column({
    type: 'enum',
    enum: WorkflowStateStatus,
    default: WorkflowStateStatus.ACTIVE,
  })
  status: WorkflowStateStatus;

  @Column({
    type: 'enum',
    enum: WorkflowStateType,
    default: WorkflowStateType.TASK,
  })
  stateType: WorkflowStateType;

  @Column({ type: 'jsonb', nullable: true })
  stateData: any;

  @Column({ type: 'jsonb', nullable: true })
  inputParameters: any;

  @Column({ type: 'jsonb', nullable: true })
  outputParameters: any;

  @Column({ type: 'jsonb', nullable: true })
  executionLog: any;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'integer', nullable: true })
  durationSeconds: number;

  @Column({ type: 'integer', default: 0 })
  attemptCount: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  errorDetails: any;

  @Column({ type: 'jsonb', nullable: true })
  conditions: any;

  @Column({ type: 'jsonb', nullable: true })
  transitions: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

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
  @ManyToOne(() => WorkflowInstance, (instance) => instance.states)
  workflowInstance: WorkflowInstance;
}
