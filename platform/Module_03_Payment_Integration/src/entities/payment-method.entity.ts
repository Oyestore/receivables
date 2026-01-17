import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Organization } from '../../../Module_11_Common/organization.entity';
import { PaymentTransaction } from './payment-transaction.entity';

export enum PaymentMethodType {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  UPI = 'upi',
  NETBANKING = 'netbanking',
  WALLET = 'wallet',
  BANK_TRANSFER = 'bank_transfer',
  EMI = 'emi',
  COD = 'cod',
}

export enum PaymentMethodStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

@Entity()
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: PaymentMethodType,
  })
  type: PaymentMethodType;

  @Column({
    type: 'enum',
    enum: PaymentMethodStatus,
    default: PaymentMethodStatus.ACTIVE,
  })
  status: PaymentMethodStatus;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ type: 'json', nullable: true })
  configuration: Record<string, any>;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  transactionFeePercentage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  transactionFeeFixed: number;

  @Column({ default: false })
  isCustomerBearsFee: boolean;

  @Column({ default: 0 })
  displayOrder: number;

  @Column({ default: true })
  isAvailableForMobile: boolean;

  @ManyToOne(() => Organization)
  organization: Organization;

  @Column()
  organizationId: string;

  @OneToMany(() => PaymentTransaction, transaction => transaction.paymentMethod)
  transactions: PaymentTransaction[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
