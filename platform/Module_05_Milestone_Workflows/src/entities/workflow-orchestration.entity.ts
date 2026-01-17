import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WorkflowOrchestrationStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('workflow_orchestrations')
@Index(['tenantId', 'status'])
@Index(['orchestrationType'])
export class WorkflowOrchestration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: WorkflowOrchestrationStatus,
    default: WorkflowOrchestrationStatus.PENDING,
  })
  status: WorkflowOrchestrationStatus;

  @Column({ type: 'varchar', length: 255 })
  orchestrationType: string;

  @Column({ type: 'jsonb', nullable: true })
  configuration: any;

  @Column({ type: 'jsonb', nullable: true })
  schedule: any;

  @Column({ type: 'jsonb', nullable: true })
  triggers: any;

  @Column({ type: 'jsonb', nullable: true })
  executionLog: any;

  @Column({ type: 'date', nullable: true })
  lastRun: Date;

  @Column({ type: 'date', nullable: true })
  nextRun: Date;

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
}
