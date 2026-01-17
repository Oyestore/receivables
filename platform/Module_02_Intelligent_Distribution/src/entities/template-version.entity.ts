import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Template } from './template.entity';

@Entity('template_versions')
export class TemplateVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id' })
  templateId: string;

  @Column({ name: 'version' })
  version: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'subject', length: 500, nullable: true })
  subject: string;

  @Column({ type: 'jsonb', nullable: true })
  variables: string[];

  @Column({ name: 'change_summary', type: 'text', nullable: true })
  changeSummary: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Template, template => template.versions)
  @JoinColumn({ name: 'template_id' })
  template: Template;
}
