import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ReportTemplate } from './report-template.entity';
import { User } from './user.entity';

@Entity('scheduled_reports')
export class ScheduledReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id' })
  templateId: string;

  @ManyToOne(() => ReportTemplate, template => template.scheduledReports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: ReportTemplate;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50 })
  scheduleType: string; // daily, weekly, monthly, custom

  @Column({ type: 'jsonb', default: {} })
  scheduleConfig: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  parameters: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  recipients: string[]; // array of email addresses

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User, user => user.scheduledReports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'last_run_at', nullable: true })
  lastRunAt: Date;

  @Column({ name: 'next_run_at', nullable: true })
  nextRunAt: Date;
}
