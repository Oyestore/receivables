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

export enum OwnerType {
  INDIVIDUAL = 'INDIVIDUAL',
  TEAM = 'TEAM',
  DEPARTMENT = 'DEPARTMENT',
  EXTERNAL = 'EXTERNAL',
  SYSTEM = 'SYSTEM',
}

export enum OwnerRole {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  REVIEWER = 'REVIEWER',
  APPROVER = 'APPROVER',
  OBSERVER = 'OBSERVER',
  CONTRIBUTOR = 'CONTRIBUTOR',
}

export enum OwnerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  DELEGATED = 'DELEGATED',
  UNAVAILABLE = 'UNAVAILABLE',
}

@Entity('milestone_owners')
@Index(['tenantId', 'status'])
@Index(['milestoneId', 'ownerRole'])
@Index(['ownerId', 'ownerType'])
@Index(['assignedDate'])
export class MilestoneOwner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  milestoneId: string;

  @Column({ type: 'varchar', length: 255 })
  ownerId: string;

  @Column({
    type: 'enum',
    enum: OwnerType,
    default: OwnerType.INDIVIDUAL,
  })
  ownerType: OwnerType;

  @Column({
    type: 'enum',
    enum: OwnerRole,
    default: OwnerRole.PRIMARY,
  })
  ownerRole: OwnerRole;

  @Column({
    type: 'enum',
    enum: OwnerStatus,
    default: OwnerStatus.ACTIVE,
  })
  status: OwnerStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  assignedBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  delegatedTo: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  delegatedBy: string;

  @Column({ type: 'text', nullable: true })
  responsibilities: string;

  @Column({ type: 'jsonb', nullable: true })
  permissions: any;

  @Column({ type: 'jsonb', nullable: true })
  workload: any;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  workloadPercentage: number;

  @Column({ type: 'integer', nullable: true })
  estimatedHours: number;

  @Column({ type: 'integer', nullable: true })
  actualHours: number;

  @Column({ type: 'date', nullable: true })
  assignedDate: Date;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  performanceMetrics: any;

  @Column({ type: 'jsonb', nullable: true })
  notifications: any;

  @Column({ type: 'jsonb', nullable: true })
  preferences: any;

  @Column({ type: 'jsonb', nullable: true })
  expertise: any;

  @Column({ type: 'integer', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: false })
  isBackup: boolean;

  @Column({ type: 'boolean', default: true })
  canDelegate: boolean;

  @Column({ type: 'boolean', default: true })
  receiveNotifications: boolean;

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
  @ManyToOne(() => Milestone, (milestone) => milestone.owners)
  milestone: Milestone;
}
