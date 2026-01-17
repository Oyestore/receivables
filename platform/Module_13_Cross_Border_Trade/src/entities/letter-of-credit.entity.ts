import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum LCStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  AMENDED = 'amended',
}

export enum LCType {
  IRREVOCABLE = 'irrevocable',
  REVOCABLE = 'revocable',
  CONFIRMED = 'confirmed',
  UNCONFIRMED = 'unconfirmed',
  STANDBY = 'standby',
  TRANSFERABLE = 'transferable',
}

@Entity('letters_of_credit')
export class LetterOfCredit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lc_number', unique: true, length: 100 })
  lcNumber: string;

  @Column({ name: 'trade_id' })
  tradeId: string;

  @Column({ name: 'applicant_id' })
  applicantId: string;

  @Column({ name: 'beneficiary_id' })
  beneficiaryId: string;

  @Column({ name: 'issuing_bank_id' })
  issuingBankId: string;

  @Column({ name: 'advising_bank_id', nullable: true })
  advisingBankId: string;

  @Column({ name: 'confirming_bank_id', nullable: true })
  confirmingBankId: string;

  @Column({
    type: 'enum',
    enum: LCType,
    default: LCType.IRREVOCABLE,
  })
  lcType: LCType;

  @Column({
    type: 'enum',
    enum: LCStatus,
    default: LCStatus.DRAFT,
  })
  status: LCStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ length: 3 })
  currency: string;

  @Column({ name: 'expiry_date', type: 'timestamp' })
  expiryDate: Date;

  @Column({ name: 'issue_date', type: 'timestamp', nullable: true })
  issueDate: Date;

  @Column({ name: 'latest_shipment_date', type: 'timestamp', nullable: true })
  latestShipmentDate: Date;

  @Column({ name: 'presentation_period', type: 'int', nullable: true })
  presentationPeriod: number;

  @Column({ name: 'shipment_terms', type: 'text', nullable: true })
  shipmentTerms: string;

  @Column({ name: 'documents_required', type: 'jsonb' })
  documentsRequired: string[];

  @Column({ name: 'description_of_goods', type: 'text' })
  descriptionOfGoods: string;

  @Column({ name: 'port_of_loading', length: 100, nullable: true })
  portOfLoading: string;

  @Column({ name: 'port_of_discharge', length: 100, nullable: true })
  portOfDischarge: string;

  @Column({ name: 'partial_shipments', default: false })
  partialShipments: boolean;

  @Column({ name: 'transshipment', default: false })
  transshipment: boolean;

  @Column({ name: 'confirmation_instructions', type: 'text', nullable: true })
  confirmationInstructions: string;

  @Column({ name: 'amendment_terms', type: 'jsonb', nullable: true })
  amendmentTerms: Record<string, any>;

  @Column({ name: 'charges_allocation', type: 'jsonb', nullable: true })
  chargesAllocation: {
    applicantCharges: string[];
    beneficiaryCharges: string[];
  };

  @Column({ name: 'compliance_notes', type: 'text', nullable: true })
  complianceNotes: string;

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
