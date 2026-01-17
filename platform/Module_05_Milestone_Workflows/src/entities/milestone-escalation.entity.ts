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
import { MilestoneWorkflow } from './milestone-workflow.entity';

export enum EscalationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REJECTED = 'REJECTED',
}

export enum EscalationSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum EscalationType {
  DELAY = 'DELAY',
  QUALITY = 'QUALITY',
  RESOURCE = 'RESOURCE',
  BUDGET = 'BUDGET',
  STAKEHOLDER = 'STAKEHOLDER',
  TECHNICAL = 'TECHNICAL',
  EXTERNAL = 'EXTERNAL',
  CUSTOM = 'CUSTOM',
}

@Entity('milestone_escalations')
@Index(['tenantId', 'status'])
@Index(['milestoneId', 'status'])
@Index(['severity'])
@Index(['escalationType'])
@Index(['escalatedDate'])
export class MilestoneEscalation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  milestoneId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  workflowId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: EscalationStatus,
    default: EscalationStatus.PENDING,
  })
  status: EscalationStatus;

  @Column({
    type: 'enum',
    enum: EscalationSeverity,
    default: EscalationSeverity.MEDIUM,
  })
  severity: EscalationSeverity;

  @Column({
    type: 'enum',
    enum: EscalationType,
    default: EscalationType.DELAY,
  })
  escalationType: EscalationType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  escalatedBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  assignedTo: string;

  @Column({ type: 'jsonb', nullable: true })
  escalationReason: any;

  @Column({ type: 'jsonb', nullable: true })
  impactAssessment: any;

  @Column({ type: 'jsonb', nullable: true })
  resolutionPlan: any;

  @Column({ type: 'jsonb', nullable: true })
  actions: any;

  @Column({ type: 'integer', nullable: true })
  delayDays: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  financialImpact: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  priority: string;

  @Column({ type: 'date', nullable: true })
  escalatedDate: Date;

  @Column({ type: 'date', nullable: true })
  targetResolutionDate: Date;

  @Column({ type: 'date', nullable: true })
  actualResolutionDate: Date;

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string;

  @Column({ type: 'jsonb', nullable: true })
  notifications: any;

  @Column({ type: 'jsonb', nullable: true })
  stakeholders: any;

  @Column({ type: 'jsonb', nullable: true })
  attachments: any;

  @Column({ type: 'text', nullable: true })
  internalNotes: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resolvedBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  approvedBy: string;

  @Column({ type: 'boolean', default: false })
  isRecurring: boolean;

  @Column({ type: 'jsonb', nullable: true })
  recurrencePattern: any;

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
  @ManyToOne(() => Milestone, (milestone) => milestone.escalations)
  milestone: Milestone;

  @ManyToOne(() => MilestoneWorkflow, (workflow) => workflow.escalations)
  workflow: MilestoneWorkflow;
}
