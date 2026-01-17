import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PersonalizedWorkflowStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

@Entity('personalized_workflows')
@Index(['tenantId', 'status'])
@Index(['userId'])
export class PersonalizedWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: PersonalizedWorkflowStatus,
    default: PersonalizedWorkflowStatus.ACTIVE,
  })
  status: PersonalizedWorkflowStatus;

  @Column({ type: 'jsonb', nullable: true })
  preferences: any;

  @Column({ type: 'jsonb', nullable: true })
  customizations: any;

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
