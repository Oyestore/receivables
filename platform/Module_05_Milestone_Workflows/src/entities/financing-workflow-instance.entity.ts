import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { FinancingWorkflow } from './financing-workflow.entity';

export enum FinancingInstanceStatus {
  ACTIVE = 'ACTIVE',
  PAID = 'PAID',
  DEFAULTED = 'DEFAULTED',
  CANCELLED = 'CANCELLED',
}

@Entity('financing_workflow_instances')
@Index(['financingWorkflowId', 'status'])
export class FinancingWorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  financingWorkflowId: string;

  @Column({
    type: 'enum',
    enum: FinancingInstanceStatus,
    default: FinancingInstanceStatus.ACTIVE,
  })
  status: FinancingInstanceStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  disbursedAmount: number;

  @Column({ type: 'date' })
  disbursementDate: Date;

  @Column({ type: 'date', nullable: true })
  repaymentDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  repaymentSchedule: any;

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
  @ManyToOne(() => FinancingWorkflow, (workflow) => workflow.instances)
  financingWorkflow: FinancingWorkflow;
}
