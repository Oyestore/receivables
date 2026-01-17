import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { MilestoneWorkflow } from './milestone-workflow.entity';
import { MilestoneOwner } from './milestone-owner.entity';
import { MilestoneEvidence } from './milestone-evidence.entity';
import { MilestoneVerification } from './milestone-verification.entity';
import { MilestoneEscalation } from './milestone-escalation.entity';
import { MilestoneStatusProbe } from './milestone-status-probe.entity';

export enum MilestoneStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  VERIFIED = 'VERIFIED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
  CANCELLED = 'CANCELLED',
}

export enum MilestoneType {
  DELIVERABLE = 'DELIVERABLE',
  PAYMENT = 'PAYMENT',
  APPROVAL = 'APPROVAL',
  REVIEW = 'REVIEW',
  DOCUMENTATION = 'DOCUMENTATION',
  TESTING = 'TESTING',
  DEPLOYMENT = 'DEPLOYMENT',
  TRAINING = 'TRAINING',
  SIGNOFF = 'SIGNOFF',
  CUSTOM = 'CUSTOM',
}

export enum MilestonePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('milestones')
@Index(['tenantId', 'status'])
@Index(['projectId', 'status'])
@Index(['dueDate'])
@Index(['milestoneType'])
export class Milestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255 })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  projectId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  clientId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contractId: string;

  @Column({
    type: 'enum',
    enum: MilestoneType,
    default: MilestoneType.DELIVERABLE,
  })
  milestoneType: MilestoneType;

  @Column({
    type: 'enum',
    enum: MilestoneStatus,
    default: MilestoneStatus.DRAFT,
  })
  status: MilestoneStatus;

  @Column({
    type: 'enum',
    enum: MilestonePriority,
    default: MilestonePriority.MEDIUM,
  })
  priority: MilestonePriority;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  value: number;

  @Column({ type: 'varchar', length: 3, nullable: true })
  currency: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  progressPercentage: number;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @Column({ type: 'date', nullable: true })
  completedDate: Date;

  @Column({ type: 'date', nullable: true })
  verifiedDate: Date;

  @Column({ type: 'date', nullable: true })
  approvedDate: Date;

  @Column({ type: 'integer', nullable: true })
  estimatedHours: number;

  @Column({ type: 'integer', nullable: true })
  actualHours: number;

  @Column({ type: 'jsonb', nullable: true })
  dependencies: string[];

  @Column({ type: 'jsonb', nullable: true })
  completionCriteria: any;

  @Column({ type: 'jsonb', nullable: true })
  verificationRequirements: any;

  @Column({ type: 'jsonb', nullable: true })
  paymentTerms: any;

  // Phase 1 Integration Fields
  @Column({ type: 'uuid', nullable: true })
  invoiceId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  invoiceNumber: string;

  @Column({ type: 'timestamp', nullable: true })
  invoiceGeneratedAt: Date;

  @Column({ type: 'text', nullable: true })
  invoiceGenerationError: string;

  @Column({ type: 'uuid', nullable: true })
  paymentId: string;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  paymentStatus: string; // PENDING, RELEASED, PROCESSING, COMPLETED, FAILED

  @Column({ type: 'timestamp', nullable: true })
  paymentReleasedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  paidAmount: number;

  @Column({ type: 'text', nullable: true })
  paymentFailureReason: string;

  @Column({ type: 'boolean', default: true })
  autoGenerateInvoice: boolean;

  @Column({ type: 'boolean', default: true })
  autoReleasePayment: boolean;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'integer', nullable: true })
  estimatedDurationDays: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  paymentAmount: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  workflowInstanceId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ownerId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionPercentage: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  type: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  blockedReason: string;

  @Column({ type: 'timestamp', nullable: true })
  unblockedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ type: 'jsonb', nullable: true })
  customFields: any;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  internalNotes: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedBy: string;

  @Column({ type: 'boolean', default: false })
  isTemplate: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  templateName: string;

  @Column({ type: 'integer', default: 0 })
  version: number;

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
  @ManyToOne(() => MilestoneWorkflow, (workflow) => workflow.milestones)
  workflow: MilestoneWorkflow;

  @OneToMany(() => MilestoneOwner, (owner) => owner.milestone)
  owners: MilestoneOwner[];

  @OneToMany(() => MilestoneEvidence, (evidence) => evidence.milestone)
  evidence: MilestoneEvidence[];

  @OneToMany(() => MilestoneVerification, (verification) => verification.milestone)
  verifications: MilestoneVerification[];

  @OneToMany(() => MilestoneEscalation, (escalation) => escalation.milestone)
  escalations: MilestoneEscalation[];

  @OneToMany(() => MilestoneStatusProbe, (probe) => probe.milestone)
  statusProbes: MilestoneStatusProbe[];

  @ManyToMany(() => Milestone, (milestone) => milestone.dependencies)
  @JoinTable({
    name: 'milestone_dependencies',
    joinColumn: { name: 'milestone_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'dependency_id', referencedColumnName: 'id' },
  })
  dependentMilestones: Milestone[];
}
