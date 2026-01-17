import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';

export enum NBFCPartnerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

export enum NBFCPartnerIntegrationType {
  API = 'api',
  MANUAL = 'manual',
  HYBRID = 'hybrid',
}

@Entity()
export class NBFCPartner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({
    type: 'enum',
    enum: NBFCPartnerStatus,
    default: NBFCPartnerStatus.PENDING,
  })
  status: NBFCPartnerStatus;

  @Column({
    type: 'enum',
    enum: NBFCPartnerIntegrationType,
    default: NBFCPartnerIntegrationType.MANUAL,
  })
  integrationType: NBFCPartnerIntegrationType;

  @Column({ nullable: true })
  apiBaseUrl: string;

  @Column({ nullable: true })
  apiKey: string;

  @Column({ nullable: true })
  apiSecret: string;

  @Column({ type: 'json', nullable: true })
  apiConfiguration: Record<string, any>;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  defaultInterestRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  defaultProcessingFeePercentage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  defaultProcessingFeeFixed: number;

  @Column({ nullable: true })
  defaultTenorDays: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minimumFinancingAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maximumFinancingAmount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  defaultAdvancePercentage: number;

  @Column({ type: 'json', nullable: true })
  eligibilityCriteria: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  supportedFinancingTypes: string[];

  @Column({ type: 'json', nullable: true })
  supportedCurrencies: string[];

  @Column({ nullable: true })
  contactPersonName: string;

  @Column({ nullable: true })
  contactEmail: string;

  @Column({ nullable: true })
  contactPhone: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
