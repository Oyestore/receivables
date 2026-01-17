import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'name', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'category', length: 100 })
  category: string;

  @Column({ name: 'channel', length: 20 })
  channel: 'email' | 'sms' | 'whatsapp';

  @Column({ name: 'subject', length: 500, nullable: true })
  subject: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  variables: string[];

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ name: 'language', length: 10, default: 'en' })
  language: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'version', default: 1 })
  version: number;

  @Column({ name: 'status', length: 20, default: 'draft' })
  status: 'draft' | 'pending_approval' | 'active' | 'inactive' | 'rejected';

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  @Column({ name: 'last_used_at', nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => TemplateVersion, 'template')
  versions: TemplateVersion[];

  @OneToMany(() => TemplateApproval, 'template')
  approvals: TemplateApproval[];
}
