import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ReportTemplate } from './report-template.entity';
import { User } from './user.entity';

export enum ReportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

@Entity('report_executions')
export class ReportExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', nullable: true })
  templateId: string;

  @ManyToOne(() => ReportTemplate, template => template.executions, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'template_id' })
  template: ReportTemplate;

  @Column({ length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: ReportFormat,
    default: ReportFormat.PDF
  })
  format: ReportFormat;

  @Column({ type: 'jsonb', default: {} })
  parameters: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING
  })
  status: ReportStatus;

  @Column({ default: 0 })
  progress: number;

  @Column({ name: 'file_path', length: 500, nullable: true })
  filePath: string;

  @Column({ name: 'file_size', nullable: true })
  fileSize: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User, user => user.reportExecutions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'started_at', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt: Date;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt: Date;

  @Column({ name: 'download_count', default: 0 })
  downloadCount: number;
}
