import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';

export enum SuccessMilestoneType {
  PROJECT_COMPLETION = 'PROJECT_COMPLETION',
  PHASE_COMPLETION = 'PHASE_COMPLETION',
  DELIVERY = 'DELIVERY',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  CLIENT_APPROVAL = 'CLIENT_APPROVAL',
  QUALITY_MILESTONE = 'QUALITY_MILESTONE',
  EFFICIENCY_MILESTONE = 'EFFICIENCY_MILESTONE',
  INNOVATION_MILESTONE = 'INNOVATION_MILESTONE',
  CUSTOM = 'CUSTOM',
}

@Entity('success_milestones')
@Index(['tenantId', 'milestoneType'])
@Index(['achievedDate'])
@Index(['projectId'])
export class SuccessMilestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  projectId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: SuccessMilestoneType,
    default: SuccessMilestoneType.PROJECT_COMPLETION,
  })
  milestoneType: SuccessMilestoneType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  achievedBy: string;

  @Column({ type: 'date', nullable: true })
  achievedDate: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  value: number;

  @Column({ type: 'varchar', length: 3, nullable: true })
  currency: string;

  @Column({ type: 'jsonb', nullable: true })
  metrics: any;

  @Column({ type: 'jsonb', nullable: true })
  achievements: any;

  @Column({ type: 'jsonb', nullable: true })
  recognition: any;

  @Column({ type: 'jsonb', nullable: true })
  rewards: any;

  @Column({ type: 'jsonb', nullable: true })
  impact: any;

  @Column({ type: 'jsonb', nullable: true })
  lessons: any;

  @Column({ type: 'jsonb', nullable: true })
  bestPractices: any;

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
}
