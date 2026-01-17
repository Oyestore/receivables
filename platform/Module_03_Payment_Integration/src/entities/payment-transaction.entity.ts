import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Organization } from '../../../Module_11_Common/organization.entity';
import { Invoice } from '../../../Module_01_Invoice_Management/src/invoice.entity';
import { PaymentMethod } from './payment-method.entity';
import { PaymentReconciliation } from './payment-reconciliation.entity';

export enum TransactionStatus {
  INITIATED = 'initiated',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  INSTALLMENT = 'installment',
  SUBSCRIPTION = 'subscription',
}

@Entity()
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  transactionReference: string;

  @Column({ nullable: true })
  gatewayTransactionId: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.INITIATED,
  })
  status: TransactionStatus;

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.PAYMENT,
  })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  transactionFee: number;

  @Column({ default: false })
  isCustomerPaidFee: boolean;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  customerEmail: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ type: 'json', nullable: true })
  paymentDetails: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  gatewayResponse: Record<string, any>;

  @Column({ nullable: true })
  failureReason: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  deviceInfo: string;

  @Column({ nullable: true })
  paymentLink: string;

  @Column({ nullable: true })
  paymentLinkExpiresAt: Date;

  @ManyToOne(() => Organization)
  organization: Organization;

  @Column()
  organizationId: string;

  @ManyToOne(() => Invoice, { nullable: true })
  invoice: Invoice;

  @Column({ nullable: true })
  invoiceId: string;

  @ManyToOne(() => PaymentMethod)
  paymentMethod: PaymentMethod;

  @Column()
  paymentMethodId: string;

  @ManyToOne(() => PaymentTransaction, { nullable: true })
  parentTransaction: PaymentTransaction;

  @Column({ nullable: true })
  parentTransactionId: string;

  @OneToMany(() => PaymentTransaction, transaction => transaction.parentTransaction)
  childTransactions: PaymentTransaction[];

  @OneToMany(() => PaymentReconciliation, reconciliation => reconciliation.transaction)
  reconciliations: PaymentReconciliation[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;
}
