import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';

export enum LateFeeType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  COMPOUND_PERCENTAGE = 'compound_percentage',
}

export enum LateFeeFrequency {
  ONE_TIME = 'one_time',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export enum LateFeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SCHEDULED = 'scheduled',
  EXPIRED = 'expired',
}

@Entity()
export class PaymentLateFeeRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: LateFeeType,
    default: LateFeeType.PERCENTAGE,
  })
  feeType: LateFeeType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  feeValue: number;

  @Column({
    type: 'enum',
    enum: LateFeeFrequency,
    default: LateFeeFrequency.ONE_TIME,
  })
  frequency: LateFeeFrequency;

  @Column({ type: 'int', default: 0 })
  gracePeriodDays: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maximumFeeAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maximumFeePercentage: number;

  @Column({
    type: 'enum',
    enum: LateFeeStatus,
    default: LateFeeStatus.ACTIVE,
  })
  status: LateFeeStatus;

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ nullable: true })
  validFrom: Date;

  @Column({ nullable: true })
  validUntil: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minimumInvoiceAmount: number;

  @Column({ nullable: true })
  currencyCode: string;

  @Column({ default: true })
  isAutomaticallyApplied: boolean;

  @Column({ nullable: true })
  notificationMessage: string;

  @Column({ type: 'json', nullable: true })
  abTestingConfig: Record<string, any>;

  @Column({ default: 0 })
  priority: number;

  @ManyToOne(() => Organization)
  organization: Organization;

  @Column()
  organizationId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
