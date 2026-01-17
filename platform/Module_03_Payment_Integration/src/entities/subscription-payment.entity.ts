import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RecurringSubscription } from './recurring-subscription.entity';
import { PaymentTransaction } from '../../entities/payment-transaction.entity';
import { Invoice } from '../../../invoices/entities/invoice.entity';

export enum SubscriptionPaymentStatus {
  SCHEDULED = 'scheduled',
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

@Entity()
export class SubscriptionPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => RecurringSubscription, subscription => subscription.payments)
  subscription: RecurringSubscription;

  @Column()
  subscriptionId: string;

  @Column()
  billingCycle: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  lateFeeAmount: number;

  @Column()
  dueDate: Date;

  @Column({ nullable: true })
  paidDate: Date;

  @Column({
    type: 'enum',
    enum: SubscriptionPaymentStatus,
    default: SubscriptionPaymentStatus.SCHEDULED,
  })
  status: SubscriptionPaymentStatus;

  @ManyToOne(() => PaymentTransaction, { nullable: true })
  transaction: PaymentTransaction;

  @Column({ nullable: true })
  transactionId: string;

  @ManyToOne(() => Invoice, { nullable: true })
  invoice: Invoice;

  @Column({ nullable: true })
  invoiceId: string;

  @Column({ nullable: true })
  paymentMethodId: string;

  @Column({ default: 0 })
  retryAttempts: number;

  @Column({ nullable: true })
  lastRetryDate: Date;

  @Column({ nullable: true })
  nextRetryDate: Date;

  @Column({ nullable: true })
  reminderSentDate: Date;

  @Column({ default: 0 })
  remindersSent: number;

  @Column({ nullable: true })
  currencyCode: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
