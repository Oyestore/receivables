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
import { Milestone } from './milestone.entity';
import { MilestoneEscalation } from './milestone-escalation.entity';

export enum WorkflowStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum WorkflowType {
  LINEAR = 'LINEAR',
  PARALLEL = 'PARALLEL',
  CONDITIONAL = 'CONDITIONAL',
  HYBRID = 'HYBRID',
}

@Entity('milestone_workflows')
@Index(['tenantId', 'status'])
@Index(['projectId'])
@Index(['workflowType'])
export class MilestoneWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255 })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  projectId: string;

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.DRAFT,
  })
  status: WorkflowStatus;

  @Column({
    type: 'enum',
    enum: WorkflowType,
    default: WorkflowType.LINEAR,
  })
  workflowType: WorkflowType;

  @Column({ type: 'jsonb', nullable: true })
  workflowDefinition: any;

  @Column({ type: 'jsonb', nullable: true })
  workflowRules: any;

  @Column({ type: 'jsonb', nullable: true })
  triggers: any;

  @Column({ type: 'jsonb', nullable: true })
  conditions: any;

  @Column({ type: 'jsonb', nullable: true })
  actions: any;

  @Column({ type: 'integer', default: 0 })
  totalMilestones: number;

  @Column({ type: 'integer', default: 0 })
  completedMilestones: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progressPercentage: number;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'date', nullable: true })
  actualStartDate: Date;

  @Column({ type: 'date', nullable: true })
  actualEndDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  templateId: string;

  @Column({ type: 'boolean', default: false })
  isTemplate: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedBy: string;

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
  @OneToMany(() => Milestone, (milestone) => milestone.workflow)
  milestones: Milestone[];

  @OneToMany(() => MilestoneEscalation, (escalation) => escalation.workflow)
  escalations: MilestoneEscalation[];
}
