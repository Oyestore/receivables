import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Organization } from '../../../Module_11_Common/organization.entity';
import { SubscriptionPayment } from './subscription-payment.entity';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIAL = 'trial',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PAUSED = 'paused',
}

export enum SubscriptionBillingFrequency {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUALLY = 'semi_annually',
  ANNUALLY = 'annually',
  CUSTOM = 'custom',
}

@Entity()
export class RecurringSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: SubscriptionBillingFrequency,
    default: SubscriptionBillingFrequency.MONTHLY,
  })
  billingFrequency: SubscriptionBillingFrequency;

  @Column({ nullable: true })
  customFrequencyDays: number;

  @Column()
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

  @Column({ nullable: true })
  trialEndDate: Date;

  @Column({ nullable: true })
  nextBillingDate: Date;

  @Column({ nullable: true })
  lastBillingDate: Date;

  @Column({ default: 0 })
  totalBillingCycles: number;

  @Column({ default: 0 })
  completedBillingCycles: number;

  @Column({ nullable: true })
  maxBillingCycles: number;

  @Column({ default: true })
  isAutoRenew: boolean;

  @Column({ default: false })
  isAutoPay: boolean;

  @Column({ nullable: true })
  defaultPaymentMethodId: string;

  @Column({ nullable: true })
  gracePeriodDays: number;

  @Column({ nullable: true })
  customerId: string;

  @Column({ nullable: true })
  customerEmail: string;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  currencyCode: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  lateFeePercentage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  lateFeeFixed: number;

  @Column({ default: 3 })
  maxRetryAttempts: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Organization)
  organization: Organization;

  @Column()
  organizationId: string;

  @OneToMany(() => SubscriptionPayment, payment => payment.subscription)
  payments: SubscriptionPayment[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
