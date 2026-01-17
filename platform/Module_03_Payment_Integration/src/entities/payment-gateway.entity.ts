import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Organization } from '../../../Module_11_Common/organization.entity';
// import { PaymentMethod } from './payment-method.entity';

// ... (enums omitted, lines differ)
// @Entity()
// export class PaymentGateway {
// ...
//   @OneToMany(() => any, (method: any) => method.gateway) // using any to break chain
//   paymentMethods: any[];

export enum PaymentGatewayType {
  RAZORPAY = 'razorpay',
  CCAVENUE = 'ccavenue',
  PAYU = 'payu',
  BILLDESK = 'billdesk',
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  CUSTOM = 'custom',
}

export enum PaymentGatewayStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TESTING = 'testing',
  CONFIGURATION_REQUIRED = 'configuration_required',
  ERROR = 'error',
}

@Entity()
export class PaymentGateway {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: PaymentGatewayType,
  })
  type: PaymentGatewayType;

  @Column({
    type: 'enum',
    enum: PaymentGatewayStatus,
    default: PaymentGatewayStatus.CONFIGURATION_REQUIRED,
  })
  status: PaymentGatewayStatus;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ type: 'json' })
  configuration: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  credentials: Record<string, any>;

  @Column({ default: false })
  isSandboxMode: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  baseFeePercentage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  baseFeeFixed: number;

  @Column({ type: 'json', nullable: true })
  methodSpecificFees: Record<string, any>;

  @Column({ default: 0 })
  priority: number;

  @Column({ nullable: true })
  webhookUrl: string;

  @Column({ nullable: true })
  webhookSecret: string;

  @Column({ nullable: true })
  healthCheckUrl: string;

  @Column({ nullable: true })
  lastHealthCheckAt: Date;

  @Column({ default: true })
  isHealthy: boolean;

  @ManyToOne(() => Organization)
  organization: Organization;

  @Column()
  organizationId: string;

  // @OneToMany(() => PaymentMethod, method => method.gateway)
  // paymentMethods: PaymentMethod[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
