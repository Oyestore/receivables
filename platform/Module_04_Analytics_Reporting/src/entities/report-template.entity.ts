import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ReportExecution } from './report-execution.entity';
import { ScheduledReport } from './scheduled-report.entity';

export enum ReportFormat {
  PDF = 'pdf',
  XLSX = 'xlsx',
  CSV = 'csv',
  JSON = 'json',
  HTML = 'html'
}

@Entity('report_templates')
export class ReportTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  templateConfig: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ReportFormat,
    default: ReportFormat.PDF
  })
  format: ReportFormat;

  @Column({ type: 'jsonb', default: {} })
  parameters: Record<string, any>;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ length: 100, nullable: true })
  category: string;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ name: 'created_by' })
  createdBy: string;

  @OneToMany(() => ReportExecution, execution => execution.template)
  executions: ReportExecution[];

  @OneToMany(() => ScheduledReport, scheduledReport => scheduledReport.template)
  scheduledReports: ScheduledReport[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
