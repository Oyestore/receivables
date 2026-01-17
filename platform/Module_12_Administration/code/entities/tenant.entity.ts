import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum BusinessType {
  SOLE_PROPRIETORSHIP = 'sole_proprietorship',
  PARTNERSHIP = 'partnership',
  PRIVATE_LIMITED = 'private_limited',
  PUBLIC_LIMITED = 'public_limited',
  LLP = 'llp',
  TRUST = 'trust',
  SOCIETY = 'society',
  COOPERATIVE = 'cooperative',
  GOVERNMENT = 'government',
  NGO = 'ngo',
}

export enum TenantStatus {
  PROVISIONING = 'provisioning',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
  PENDING_ACTIVATION = 'pending_activation',
  UNDER_REVIEW = 'under_review',
  MIGRATION_IN_PROGRESS = 'migration_in_progress',
}

export enum ComplianceStatus {
  PENDING = 'pending',
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  UNDER_REVIEW = 'under_review',
  REMEDIATION_REQUIRED = 'remediation_required',
  EXEMPTED = 'exempted',
}

export enum DataResidency {
  DEFAULT = 'default',
  INDIA = 'india',
  SINGAPORE = 'singapore',
  UAE = 'uae',
  US_EAST = 'us_east',
  EU_WEST = 'eu_west',
  CUSTOM = 'custom',
}

export enum ContactType {
  PRIMARY = 'primary',
  BILLING = 'billing',
  TECHNICAL = 'technical',
  LEGAL = 'legal',
  COMPLIANCE = 'compliance',
  EMERGENCY = 'emergency',
}

@Entity('tenants')
@Index(['organizationName'], { unique: true })
@Index(['customDomain'], { unique: true })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  tenantId: string;

  @Column({ length: 255 })
  organizationName: string;

  @Column({
    type: 'enum',
    enum: BusinessType,
  })
  businessType: BusinessType;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.PROVISIONING,
  })
  status: TenantStatus;

  @Column()
  subscriptionPlanId: string;

  @CreateDateColumn()
  createdDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  activatedDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastActivity: Date;

  @Column({
    type: 'enum',
    enum: ComplianceStatus,
    default: ComplianceStatus.PENDING,
  })
  complianceStatus: ComplianceStatus;

  @Column({
    type: 'enum',
    enum: DataResidency,
    default: DataResidency.DEFAULT,
  })
  dataResidency: DataResidency;

  @Column({ length: 255, nullable: true })
  customDomain: string;

  @Column({ type: 'jsonb', default: '{}' })
  resourceLimits: Record<string, any>;

  @Column({ type: 'jsonb', default: '{}' })
  configuration: Record<string, any>;

  @UpdateDateColumn()
  updatedDate: Date;

  @Column()
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;

  @Column({ default: 1 })
  version: number;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;
}

@Entity('tenant_contacts')
export class TenantContact {
  @PrimaryGeneratedColumn('uuid')
  contactId: string;

  @Column()
  tenantId: string;

  @Column({
    type: 'enum',
    enum: ContactType,
  })
  contactType: ContactType;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  department: string;

  @Column({ length: 100, nullable: true })
  jobTitle: string;

  @Column({ default: false })
  isPrimary: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdDate: Date;
}
