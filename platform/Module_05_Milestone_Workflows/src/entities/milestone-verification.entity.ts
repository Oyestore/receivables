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

export enum VerificationStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RESUBMITTED = 'RESUBMITTED',
  CANCELLED = 'CANCELLED',
}

export enum VerificationType {
  MANUAL = 'MANUAL',
  AUTOMATED = 'AUTOMATED',
  HYBRID = 'HYBRID',
  PEER_REVIEW = 'PEER_REVIEW',
  CLIENT_REVIEW = 'CLIENT_REVIEW',
  INTERNAL_REVIEW = 'INTERNAL_REVIEW',
  EXTERNAL_AUDIT = 'EXTERNAL_AUDIT',
}

@Entity('milestone_verifications')
@Index(['tenantId', 'status'])
@Index(['milestoneId', 'status'])
@Index(['verificationType'])
@Index(['verifiedDate'])
export class MilestoneVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  milestoneId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  @Column({
    type: 'enum',
    enum: VerificationType,
    default: VerificationType.MANUAL,
  })
  verificationType: VerificationType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  verifiedBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  assignedTo: string;

  @Column({ type: 'jsonb', nullable: true })
  verificationCriteria: any;

  @Column({ type: 'jsonb', nullable: true })
  checklist: any;

  @Column({ type: 'jsonb', nullable: true })
  evidence: any;

  @Column({ type: 'jsonb', nullable: true })
  testResults: any;

  @Column({ type: 'jsonb', nullable: true })
  approvals: any;

  @Column({ type: 'jsonb', nullable: true })
  rejections: any;

  @Column({ type: 'text', nullable: true })
  verificationNotes: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'jsonb', nullable: true })
  feedback: any;

  @Column({ type: 'date', nullable: true })
  submittedDate: Date;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @Column({ type: 'date', nullable: true })
  verifiedDate: Date;

  @Column({ type: 'integer', nullable: true })
  verificationDuration: number;

  @Column({ type: 'integer', default: 0 })
  attemptCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  priority: string;

  @Column({ type: 'jsonb', nullable: true })
  notifications: any;

  @Column({ type: 'jsonb', nullable: true })
  attachments: any;

  @Column({ type: 'jsonb', nullable: true })
  auditTrail: any;

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
  @ManyToOne(() => Milestone, (milestone) => milestone.verifications)
  milestone: Milestone;
}
