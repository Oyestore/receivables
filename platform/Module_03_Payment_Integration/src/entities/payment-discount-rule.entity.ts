import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
}

export enum DiscountTrigger {
  EARLY_PAYMENT = 'early_payment',
  VOLUME_BASED = 'volume_based',
  LOYALTY_BASED = 'loyalty_based',
  CUSTOM = 'custom',
}

export enum DiscountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SCHEDULED = 'scheduled',
  EXPIRED = 'expired',
}

@Entity()
export class PaymentDiscountRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: DiscountType,
    default: DiscountType.PERCENTAGE,
  })
  discountType: DiscountType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discountValue: number;

  @Column({
    type: 'enum',
    enum: DiscountTrigger,
    default: DiscountTrigger.EARLY_PAYMENT,
  })
  triggerType: DiscountTrigger;

  @Column({ type: 'json' })
  triggerConditions: Record<string, any>;

  @Column({
    type: 'enum',
    enum: DiscountStatus,
    default: DiscountStatus.ACTIVE,
  })
  status: DiscountStatus;

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ nullable: true })
  validFrom: Date;

  @Column({ nullable: true })
  validUntil: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minimumAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maximumAmount: number;

  @Column({ nullable: true })
  currencyCode: string;

  @Column({ default: false })
  isAutomaticallyApplied: boolean;

  @Column({ nullable: true })
  displayMessage: string;

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
