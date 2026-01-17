import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ComplianceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REQUIRES_REVIEW = 'requires_review',
  EXEMPT = 'exempt',
}

export enum ComplianceType {
  SANCTION_CHECK = 'sanction_check',
  ANTI_MONEY_LAUNDERING = 'anti_money_laundering',
  KNOW_YOUR_CUSTOMER = 'know_your_customer',
  EXPORT_CONTROL = 'export_control',
  IMPORT_LICENSE = 'import_license',
  TAX_COMPLIANCE = 'tax_compliance',
  CUSTOMS_COMPLIANCE = 'customs_compliance',
  UAE_VAT = 'uae_vat',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('trade_compliance')
export class TradeCompliance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trade_id' })
  tradeId: string;

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ name: 'entity_type' })
  entityType: string; // 'buyer', 'seller', 'bank', 'shipping_provider'

  @Column({
    type: 'enum',
    enum: ComplianceType,
  })
  complianceType: ComplianceType;

  @Column({
    type: 'enum',
    enum: ComplianceStatus,
    default: ComplianceStatus.PENDING,
  })
  status: ComplianceStatus;

  @Column({
    type: 'enum',
    enum: RiskLevel,
    default: RiskLevel.MEDIUM,
  })
  riskLevel: RiskLevel;

  @Column({ name: 'country_code', length: 3 })
  countryCode: string;

  @Column({ name: 'sanction_list_hits', type: 'jsonb', default: '[]' })
  sanctionListHits: Array<{
    listName: string;
    matchedName: string;
    matchScore: number;
    date: Date;
  }>;

  @Column({ name: 'aml_flags', type: 'jsonb', default: '[]' })
  amlFlags: Array<{
    flagType: string;
    description: string;
    severity: string;
    date: Date;
  }>;

  @Column({ name: 'kyc_status', length: 50, nullable: true })
  kycStatus: string;

  @Column({ name: 'kyc_documents', type: 'jsonb', nullable: true })
  kycDocuments: Array<{
    documentType: string;
    documentNumber: string;
    issuedDate: Date;
    expiryDate: Date;
    status: string;
  }>;

  @Column({ name: 'export_license_required', default: false })
  exportLicenseRequired: boolean;

  @Column({ name: 'export_license_number', length: 100, nullable: true })
  exportLicenseNumber: string;

  @Column({ name: 'import_license_required', default: false })
  importLicenseRequired: boolean;

  @Column({ name: 'import_license_number', length: 100, nullable: true })
  importLicenseNumber: string;

  @Column({ name: 'tax_id', length: 50, nullable: true })
  taxId: string;

  @Column({ name: 'vat_registration', length: 50, nullable: true })
  vatRegistration: string;

  @Column({ name: 'uae_vat_registered', default: false })
  uaeVatRegistered: boolean;

  @Column({ name: 'uae_vat_number', length: 20, nullable: true })
  uaeVatNumber: string;

  @Column({ name: 'customs_declaration_required', default: false })
  customsDeclarationRequired: boolean;

  @Column({ name: 'customs_declaration_status', length: 50, nullable: true })
  customsDeclarationStatus: string;

  @Column({ name: 'compliance_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  complianceScore: number;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string;

  @Column({ name: 'reviewer_id', nullable: true })
  reviewerId: string;

  @Column({ name: 'review_date', type: 'timestamp', nullable: true })
  reviewDate: Date;

  @Column({ name: 'next_review_date', type: 'timestamp', nullable: true })
  nextReviewDate: Date;

  @Column({ name: 'exemption_reason', type: 'text', nullable: true })
  exemptionReason: string;

  @Column({ name: 'additional_checks', type: 'jsonb', nullable: true })
  additionalChecks: Record<string, any>;

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
