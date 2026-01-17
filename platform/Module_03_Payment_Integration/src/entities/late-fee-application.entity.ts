import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentLateFeeRule } from './payment-late-fee-rule.entity';
import { Invoice } from '../../../invoices/entities/invoice.entity';
import { PaymentTransaction } from '../../entities/payment-transaction.entity';

export enum LateFeeApplicationStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  WAIVED = 'waived',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity()
export class LateFeeApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PaymentLateFeeRule)
  lateFeeRule: PaymentLateFeeRule;

  @Column()
  lateFeeRuleId: string;

  @ManyToOne(() => Invoice)
  invoice: Invoice;

  @Column()
  invoiceId: string;

  @ManyToOne(() => PaymentTransaction, { nullable: true })
  transaction: PaymentTransaction;

  @Column({ nullable: true })
  transactionId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  originalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  feeAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: LateFeeApplicationStatus,
    default: LateFeeApplicationStatus.PENDING,
  })
  status: LateFeeApplicationStatus;

  @Column()
  daysOverdue: number;

  @Column({ nullable: true })
  appliedAt: Date;

  @Column({ nullable: true })
  paidAt: Date;

  @Column({ nullable: true })
  waivedAt: Date;

  @Column({ nullable: true })
  waivedReason: string;

  @Column({ nullable: true })
  waivedBy: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
