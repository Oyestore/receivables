import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentDiscountRule } from './payment-discount-rule.entity';
import { Invoice } from '../../../invoices/entities/invoice.entity';
import { PaymentTransaction } from '../../entities/payment-transaction.entity';

export enum DiscountApplicationStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity()
export class DiscountApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PaymentDiscountRule)
  discountRule: PaymentDiscountRule;

  @Column()
  discountRuleId: string;

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
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  finalAmount: number;

  @Column({
    type: 'enum',
    enum: DiscountApplicationStatus,
    default: DiscountApplicationStatus.PENDING,
  })
  status: DiscountApplicationStatus;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ nullable: true })
  appliedAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
