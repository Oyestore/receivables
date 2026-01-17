import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { InstallmentPlan } from './installment-plan.entity';
import { PaymentTransaction } from '../../entities/payment-transaction.entity';

export enum InstallmentPaymentStatus {
  SCHEDULED = 'scheduled',
  PENDING = 'pending',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  OVERDUE = 'overdue',
  DEFAULTED = 'defaulted',
  CANCELLED = 'cancelled',
}

@Entity()
export class InstallmentPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InstallmentPlan, plan => plan.payments)
  installmentPlan: InstallmentPlan;

  @Column()
  installmentPlanId: string;

  @Column()
  installmentNumber: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  interestAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  principalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  remainingAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  lateFeeAmount: number;

  @Column()
  dueDate: Date;

  @Column({ nullable: true })
  paidDate: Date;

  @Column({
    type: 'enum',
    enum: InstallmentPaymentStatus,
    default: InstallmentPaymentStatus.SCHEDULED,
  })
  status: InstallmentPaymentStatus;

  @ManyToOne(() => PaymentTransaction, { nullable: true })
  transaction: PaymentTransaction;

  @Column({ nullable: true })
  transactionId: string;

  @Column({ nullable: true })
  paymentMethodId: string;

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
