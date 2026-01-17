import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Template } from './template.entity';

@Entity('template_approvals')
export class TemplateApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id' })
  templateId: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'status', length: 20, default: 'pending' })
  status: 'pending' | 'approved' | 'rejected';

  @Column({ name: 'submitted_by', nullable: true })
  submittedBy: string;

  @Column({ name: 'submitted_at' })
  submittedAt: Date;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string;

  @Column({ name: 'approved_at', nullable: true })
  approvedAt: Date;

  @Column({ name: 'rejected_by', nullable: true })
  rejectedBy: string;

  @Column({ name: 'rejected_at', nullable: true })
  rejectedAt: Date;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Template, template => template.approvals)
  @JoinColumn({ name: 'template_id' })
  template: Template;
}
