import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { Customer } from '../../../customers/entities/customer.entity';

/**
 * Entity for storing customer payment behavior scores
 */
@Entity('payment_behavior_scores')
export class PaymentBehaviorScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 50.00 })
  overallScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 50.00 })
  paymentTimeliness: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 50.00 })
  paymentConsistency: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 50.00 })
  communicationScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 50.00 })
  disputeFrequency: number;

  @Column({ type: 'int', default: 0 })
  totalInvoicesAnalyzed: number;

  @Column({ type: 'int', default: 0 })
  totalPaymentsAnalyzed: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  totalAmountAnalyzed: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.00 })
  averagePaymentDelay: number;

  @Column({ type: 'jsonb', default: '{}' })
  scoreFactors: Record<string, any>;

  @Column({ type: 'jsonb', default: '{}' })
  scoreHistory: Record<string, any>;

  @Column({ type: 'varchar', length: 50, default: 'standard' })
  riskCategory: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastScoreUpdate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
