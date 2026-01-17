import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Milestone } from './milestone.entity';

export enum ProbeType {
  AUTOMATED = 'AUTOMATED',
  MANUAL = 'MANUAL',
  HYBRID = 'HYBRID',
  API = 'API',
  WEBHOOK = 'WEBHOOK',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  DATABASE = 'DATABASE',
  FILE_SYSTEM = 'FILE_SYSTEM',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
}

export enum ProbeStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  SCHEDULED = 'SCHEDULED',
}

export enum ProbeFrequency {
  ONCE = 'ONCE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  CUSTOM = 'CUSTOM',
}

@Entity('milestone_status_probes')
@Index(['tenantId', 'status'])
@Index(['milestoneId', 'probeType'])
@Index(['nextProbeDate'])
@Index(['frequency'])
export class MilestoneStatusProbe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  milestoneId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ProbeType,
    default: ProbeType.AUTOMATED,
  })
  probeType: ProbeType;

  @Column({
    type: 'enum',
    enum: ProbeStatus,
    default: ProbeStatus.PENDING,
  })
  status: ProbeStatus;

  @Column({
    type: 'enum',
    enum: ProbeFrequency,
    default: ProbeFrequency.ONCE,
  })
  frequency: ProbeFrequency;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string;

  @Column({ type: 'jsonb', nullable: true })
  probeConfig: any;

  @Column({ type: 'jsonb', nullable: true })
  targetSystem: any;

  @Column({ type: 'jsonb', nullable: true })
  credentials: any;

  @Column({ type: 'jsonb', nullable: true })
  queryParameters: any;

  @Column({ type: 'jsonb', nullable: true })
  expectedResults: any;

  @Column({ type: 'jsonb', nullable: true })
  actualResults: any;

  @Column({ type: 'jsonb', nullable: true })
  comparisonRules: any;

  @Column({ type: 'text', nullable: true })
  probeQuery: string;

  @Column({ type: 'text', nullable: true })
  apiUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  headers: any;

  @Column({ type: 'text', nullable: true })
  emailTemplate: string;

  @Column({ type: 'text', nullable: true })
  smsTemplate: string;

  @Column({ type: 'date', nullable: true })
  lastProbeDate: Date;

  @Column({ type: 'date', nullable: true })
  nextProbeDate: Date;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'integer', nullable: true })
  intervalMinutes: number;

  @Column({ type: 'integer', default: 0 })
  attemptCount: number;

  @Column({ type: 'integer', default: 0 })
  successCount: number;

  @Column({ type: 'integer', default: 0 })
  failureCount: number;

  @Column({ type: 'text', nullable: true })
  lastError: string;

  @Column({ type: 'jsonb', nullable: true })
  errorHistory: any;

  @Column({ type: 'integer', default: 5 })
  maxRetries: number;

  @Column({ type: 'integer', default: 300 })
  timeoutSeconds: number;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  sendNotifications: boolean;

  @Column({ type: 'jsonb', nullable: true })
  notificationChannels: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Milestone, (milestone) => milestone.statusProbes)
  milestone: Milestone;
}
