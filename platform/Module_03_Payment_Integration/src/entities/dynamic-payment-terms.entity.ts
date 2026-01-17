import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { Customer } from '../../../customers/entities/customer.entity';
import { PaymentBehaviorScore } from './payment-behavior-score.entity';

/**
 * Entity for storing dynamic payment terms based on customer reputation
 */
@Entity('dynamic_payment_terms')
export class DynamicPaymentTerms {
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

  @Column({ type: 'uuid' })
  behaviorScoreId: string;

  @ManyToOne(() => PaymentBehaviorScore)
  @JoinColumn({ name: 'behaviorScoreId' })
  behaviorScore: PaymentBehaviorScore;

  @Column({ type: 'int', default: 30 })
  paymentTermDays: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  earlyPaymentDiscountPercentage: number;

  @Column({ type: 'int', nullable: true })
  earlyPaymentDiscountDays: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  latePaymentFeePercentage: number;

  @Column({ type: 'int', nullable: true })
  gracePeriodDays: number;

  @Column({ type: 'boolean', default: false })
  requiresDeposit: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  depositPercentage: number;

  @Column({ type: 'boolean', default: false })
  allowsInstallments: boolean;

  @Column({ type: 'int', nullable: true })
  maxInstallments: number;

  @Column({ type: 'jsonb', default: '{}' })
  additionalTerms: Record<string, any>;

  @Column({ type: 'varchar', length: 50, default: 'auto' })
  termsSource: string;

  @Column({ type: 'timestamp', nullable: true })
  lastReviewDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextReviewDate: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
