import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { Invoice } from '../../../invoices/entities/invoice.entity';
import { InstallmentPayment } from './installment-payment.entity';

export enum InstallmentPlanStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DEFAULTED = 'defaulted',
  CANCELLED = 'cancelled',
}

export enum InstallmentFrequency {
  WEEKLY = 'weekly',
  BI_WEEKLY = 'bi_weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  CUSTOM = 'custom',
}

@Entity()
export class InstallmentPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: InstallmentPlanStatus,
    default: InstallmentPlanStatus.DRAFT,
  })
  status: InstallmentPlanStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  remainingAmount: number;

  @Column()
  numberOfInstallments: number;

  @Column({
    type: 'enum',
    enum: InstallmentFrequency,
    default: InstallmentFrequency.MONTHLY,
  })
  frequency: InstallmentFrequency;

  @Column({ nullable: true })
  customFrequencyDays: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  downPaymentAmount: number;

  @Column({ nullable: true })
  downPaymentDate: Date;

  @Column({ nullable: true })
  downPaymentTransactionId: string;

  @Column()
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  interestRate: number;

  @Column({ default: false })
  isInterestBearing: boolean;

  @Column({ default: false })
  isAutoPay: boolean;

  @Column({ nullable: true })
  defaultPaymentMethodId: string;

  @Column({ nullable: true })
  gracePeriodDays: number;

  @Column({ default: false })
  isEarlyPaymentAllowed: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  earlyPaymentDiscountPercentage: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  latePaymentFeePercentage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  latePaymentFeeFixed: number;

  @Column({ nullable: true })
  currencyCode: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Organization)
  organization: Organization;

  @Column()
  organizationId: string;

  @ManyToOne(() => Invoice, { nullable: true })
  invoice: Invoice;

  @Column({ nullable: true })
  invoiceId: string;

  @OneToMany(() => InstallmentPayment, payment => payment.installmentPlan)
  payments: InstallmentPayment[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
