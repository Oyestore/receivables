import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ShippingStatus {
  PENDING = 'pending',
  BOOKED = 'booked',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  DELAYED = 'delayed',
}

export enum ShippingProvider {
  DHL = 'dhl',
  FEDEX = 'fedex',
  UPS = 'ups',
  ARAMEX = 'aramex',
  BLUEDART = 'bluedart',
  DTDC = 'dtdc',
  CUSTOM = 'custom',
}

@Entity('shipping_orders')
export class ShippingOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', unique: true, length: 100 })
  orderId: string;

  @Column({ name: 'trade_id' })
  tradeId: string;

  @Column({ name: 'sender_id' })
  senderId: string;

  @Column({ name: 'recipient_id' })
  recipientId: string;

  @Column({
    type: 'enum',
    enum: ShippingProvider,
    default: ShippingProvider.CUSTOM,
  })
  provider: ShippingProvider;

  @Column({ name: 'tracking_number', length: 100, nullable: true })
  trackingNumber: string;

  @Column({
    type: 'enum',
    enum: ShippingStatus,
    default: ShippingStatus.PENDING,
  })
  status: ShippingStatus;

  @Column({ name: 'origin_address', type: 'jsonb' })
  originAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };

  @Column({ name: 'destination_address', type: 'jsonb' })
  destinationAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };

  @Column({ name: 'package_details', type: 'jsonb' })
  packageDetails: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    description: string;
    value: number;
    currency: string;
  };

  @Column({ name: 'shipping_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  shippingCost: number;

  @Column({ name: 'estimated_delivery', type: 'timestamp', nullable: true })
  estimatedDelivery: Date;

  @Column({ name: 'actual_delivery', type: 'timestamp', nullable: true })
  actualDelivery: Date;

  @Column({ name: 'pickup_date', type: 'timestamp', nullable: true })
  pickupDate: Date;

  @Column({ name: 'insurance_required', default: false })
  insuranceRequired: boolean;

  @Column({ name: 'insurance_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  insuranceAmount: number;

  @Column({ name: 'customs_declaration', type: 'jsonb', nullable: true })
  customsDeclaration: Record<string, any>;

  @Column({ name: 'tracking_events', type: 'jsonb', default: '[]' })
  trackingEvents: Array<{
    timestamp: Date;
    status: string;
    location: string;
    description: string;
  }>;

  @Column({ name: 'provider_reference', length: 100, nullable: true })
  providerReference: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;
}
