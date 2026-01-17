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

export enum WorkflowDefinitionStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum WorkflowDefinitionType {
  LINEAR = 'LINEAR',
  PARALLEL = 'PARALLEL',
  CONDITIONAL = 'CONDITIONAL',
  HYBRID = 'HYBRID',
  CUSTOM = 'CUSTOM',
}

@Entity('workflow_definitions')
@Index(['tenantId', 'status'])
@Index(['workflowType'])
@Index(['isTemplate'])
export class WorkflowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: WorkflowDefinitionStatus,
    default: WorkflowDefinitionStatus.DRAFT,
  })
  status: WorkflowDefinitionStatus;

  @Column({
    type: 'enum',
    enum: WorkflowDefinitionType,
    default: WorkflowDefinitionType.LINEAR,
  })
  workflowType: WorkflowDefinitionType;

  @Column({ type: 'jsonb' })
  workflowStructure: any;

  @Column({ type: 'jsonb', nullable: true })
  nodeDefinitions: any;

  @Column({ type: 'jsonb', nullable: true })
  edgeDefinitions: any;

  @Column({ type: 'jsonb', nullable: true })
  conditions: any;

  @Column({ type: 'jsonb', nullable: true })
  actions: any;

  @Column({ type: 'jsonb', nullable: true })
  triggers: any;

  @Column({ type: 'jsonb', nullable: true })
  validators: any;

  @Column({ type: 'jsonb', nullable: true })
  notifications: any;

  @Column({ type: 'jsonb', nullable: true })
  escalations: any;

  @Column({ type: 'varchar', length: 255, nullable: true })
  category: string;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  industry: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedBy: string;

  @Column({ type: 'boolean', default: false })
  isTemplate: boolean;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'boolean', default: true })
  isReusable: boolean;

  @Column({ type: 'integer', default: 0 })
  usageCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  averageCompletionTime: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  successRate: number;

  @Column({ type: 'jsonb', nullable: true })
  versionHistory: any;

  @Column({ type: 'integer', default: 1 })
  version: number;

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
