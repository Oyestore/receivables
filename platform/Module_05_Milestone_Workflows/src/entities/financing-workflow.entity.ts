import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum FinancingWorkflowStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DEFAULTED = 'DEFAULTED',
}

@Entity('financing_workflows')
@Index(['tenantId', 'status'])
@Index(['projectId'])
export class FinancingWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  projectId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: FinancingWorkflowStatus,
    default: FinancingWorkflowStatus.PENDING,
  })
  status: FinancingWorkflowStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  interestRate: number;

  @Column({ type: 'integer' })
  termMonths: number;

  @Column({ type: 'jsonb', nullable: true })
  terms: any;

  @Column({ type: 'jsonb', nullable: true })
  collateral: any;

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
