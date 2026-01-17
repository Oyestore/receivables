/**
 * MSME Portal Entities
 * Module 8 Enhancement - Legal Compliance Automation
 * 
 * This file contains all entity definitions for MSME Portal integration
 * including portal connections, complaints, documents, and status tracking.
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate
} from 'typeorm';
import { IsUUID, IsString, IsEnum, IsNumber, IsBoolean, IsDate, IsOptional, IsObject, ValidateNested, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { v4 as uuidv4 } from 'uuid';
import {
  MSMEPortalEnvironment,
  MSMEComplaintStatus,
  MSMEComplaintType,
  MSMEPortalDocumentType,
  MSMEPortalAuthStatus,
  CurrencyCode,
  IndianState,
  BusinessEntityType,
  PaymentTerms
} from '@shared/enums/legal-compliance.enum';
import {
  IBusinessEntity,
  IAddress,
  IContactDetails,
  IInvoiceDetails,
  IPaymentDelayDetails,
  IClaimAmount,
  IGSTDetails,
  IDocumentReference
} from '@shared/interfaces/legal-compliance.interface';

// ============================================================================
// MSME Portal Connection Entity
// ============================================================================

/**
 * MSME Portal Connection Entity
 * Manages connections to MSME Samadhaan portal for different tenants
 */
@Entity('msme_portal_connections')
@Index(['tenantId', 'environment'], { unique: true })
@Index(['tenantId', 'status'])
@Index(['createdAt'])
export class MSMEPortalConnection {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @IsUUID()
  @Index()
  tenantId: string;

  @Column({ name: 'client_id', type: 'varchar', length: 255 })
  @IsString()
  clientId: string;

  @Column({ name: 'client_secret', type: 'varchar', length: 500 })
  @IsString()
  clientSecret: string;

  @Column({ 
    name: 'environment', 
    type: 'enum', 
    enum: MSMEPortalEnvironment,
    default: MSMEPortalEnvironment.SANDBOX
  })
  @IsEnum(MSMEPortalEnvironment)
  environment: MSMEPortalEnvironment;

  @Column({ name: 'base_url', type: 'varchar', length: 500 })
  @IsString()
  baseUrl: string;

  @Column({ name: 'certificate_path', type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  @IsString()
  certificatePath?: string;

  @Column({ name: 'timeout', type: 'integer', default: 30000 })
  @IsNumber()
  @Min(1000)
  @Max(300000)
  timeout: number;

  @Column({ name: 'retry_attempts', type: 'integer', default: 3 })
  @IsNumber()
  @Min(1)
  @Max(10)
  retryAttempts: number;

  @Column({ name: 'retry_delay', type: 'integer', default: 1000 })
  @IsNumber()
  @Min(100)
  @Max(60000)
  retryDelay: number;

  @Column({ name: 'rate_limit_per_minute', type: 'integer', default: 60 })
  @IsNumber()
  @Min(1)
  @Max(1000)
  rateLimitPerMinute: number;

  @Column({ 
    name: 'status', 
    type: 'varchar', 
    length: 20, 
    default: 'active' 
  })
  @IsString()
  status: string;

  @Column({ name: 'last_auth_at', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  lastAuthAt?: Date;

  @Column({ name: 'auth_expires_at', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  authExpiresAt?: Date;

  @Column({ 
    name: 'auth_status', 
    type: 'enum', 
    enum: MSMEPortalAuthStatus,
    default: MSMEPortalAuthStatus.PENDING
  })
  @IsEnum(MSMEPortalAuthStatus)
  authStatus: MSMEPortalAuthStatus;

  @Column({ name: 'access_token', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @Column({ name: 'token_scope', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  tokenScope?: string[];

  @Column({ name: 'connection_metadata', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  connectionMetadata?: Record<string, any>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @IsBoolean()
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @IsDate()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  @IsDate()
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  updatedBy?: string;

  @Column({ name: 'version', type: 'integer', default: 1 })
  @IsNumber()
  version: number;

  // Relationships
  @OneToMany(() => MSMEComplaint, complaint => complaint.portalConnection)
  complaints: MSMEComplaint[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @BeforeUpdate()
  updateVersion() {
    this.version += 1;
  }

  // Helper methods
  isTokenValid(): boolean {
    return this.authExpiresAt ? new Date() < this.authExpiresAt : false;
  }

  needsTokenRefresh(): boolean {
    if (!this.authExpiresAt) return true;
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return fiveMinutesFromNow >= this.authExpiresAt;
  }

  getConnectionConfig() {
    return {
      environment: this.environment,
      baseUrl: this.baseUrl,
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      certificatePath: this.certificatePath,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay,
      rateLimitPerMinute: this.rateLimitPerMinute
    };
  }
}

// ============================================================================
// MSME Complaint Entity
// ============================================================================

/**
 * MSME Complaint Entity
 * Represents complaints filed with MSME Samadhaan portal
 */
@Entity('msme_complaints')
@Index(['tenantId', 'status'])
@Index(['referenceNumber'], { unique: true })
@Index(['udyamRegistrationNumber'])
@Index(['submissionDate'])
@Index(['buyerName'])
export class MSMEComplaint {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @IsUUID()
  @Index()
  tenantId: string;

  @Column({ name: 'reference_number', type: 'varchar', length: 100, unique: true })
  @IsString()
  referenceNumber: string;

  @Column({ name: 'udyam_registration_number', type: 'varchar', length: 50 })
  @IsString()
  udyamRegistrationNumber: string;

  @Column({ 
    name: 'complaint_type', 
    type: 'enum', 
    enum: MSMEComplaintType,
    default: MSMEComplaintType.DELAYED_PAYMENT
  })
  @IsEnum(MSMEComplaintType)
  complaintType: MSMEComplaintType;

  @Column({ name: 'buyer_name', type: 'varchar', length: 255 })
  @IsString()
  buyerName: string;

  @Column({ name: 'buyer_details', type: 'jsonb' })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  buyerDetails: IBusinessEntity;

  @Column({ name: 'invoice_details', type: 'jsonb' })
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => Array)
  invoiceDetails: IInvoiceDetails[];

  @Column({ name: 'delay_details', type: 'jsonb' })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  delayDetails: IPaymentDelayDetails;

  @Column({ name: 'claim_amount', type: 'decimal', precision: 15, scale: 2 })
  @IsNumber()
  @Min(0)
  claimAmount: number;

  @Column({ name: 'interest_amount', type: 'decimal', precision: 15, scale: 2 })
  @IsNumber()
  @Min(0)
  interestAmount: number;

  @Column({ name: 'penalty_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  penaltyAmount: number;

  @Column({ name: 'total_claim_amount', type: 'decimal', precision: 15, scale: 2 })
  @IsNumber()
  @Min(0)
  totalClaimAmount: number;

  @Column({ 
    name: 'currency', 
    type: 'enum', 
    enum: CurrencyCode,
    default: CurrencyCode.INR
  })
  @IsEnum(CurrencyCode)
  currency: CurrencyCode;

  @Column({ name: 'delay_days', type: 'integer' })
  @IsNumber()
  @Min(0)
  delayDays: number;

  @Column({ name: 'interest_rate', type: 'decimal', precision: 5, scale: 2 })
  @IsNumber()
  @Min(0)
  @Max(100)
  interestRate: number;

  @Column({ name: 'description', type: 'text' })
  @IsString()
  description: string;

  @Column({ name: 'expected_resolution', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  expectedResolution?: string;

  @Column({ 
    name: 'status', 
    type: 'enum', 
    enum: MSMEComplaintStatus,
    default: MSMEComplaintStatus.DRAFT
  })
  @IsEnum(MSMEComplaintStatus)
  status: MSMEComplaintStatus;

  @Column({ name: 'submission_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  submissionDate?: Date;

  @Column({ name: 'last_status_update', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  lastStatusUpdate?: Date;

  @Column({ name: 'expected_response_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  expectedResponseDate?: Date;

  @Column({ name: 'tracking_url', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  trackingUrl?: string;

  @Column({ name: 'portal_response', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  portalResponse?: any;

  @Column({ name: 'supporting_documents', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  supportingDocuments?: IDocumentReference[];

  @Column({ name: 'next_steps', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  nextSteps?: string[];

  @Column({ name: 'communication_history', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  communicationHistory?: any[];

  @Column({ name: 'resolution_details', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  resolutionDetails?: any;

  @Column({ name: 'resolution_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  resolutionDate?: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @IsBoolean()
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @IsDate()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  @IsDate()
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  updatedBy?: string;

  @Column({ name: 'version', type: 'integer', default: 1 })
  @IsNumber()
  version: number;

  // Foreign Keys
  @Column({ name: 'portal_connection_id', type: 'uuid' })
  @IsUUID()
  portalConnectionId: string;

  // Relationships
  @ManyToOne(() => MSMEPortalConnection, connection => connection.complaints)
  @JoinColumn({ name: 'portal_connection_id' })
  portalConnection: MSMEPortalConnection;

  @OneToMany(() => MSMEComplaintDocument, document => document.complaint)
  documents: MSMEComplaintDocument[];

  @OneToMany(() => MSMEComplaintStatusHistory, statusHistory => statusHistory.complaint)
  statusHistory: MSMEComplaintStatusHistory[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.referenceNumber) {
      this.referenceNumber = this.generateReferenceNumber();
    }
  }

  @BeforeUpdate()
  updateVersion() {
    this.version += 1;
    this.lastStatusUpdate = new Date();
  }

  // Helper methods
  private generateReferenceNumber(): string {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `MSME-${year}-${timestamp}`;
  }

  isSubmitted(): boolean {
    return this.status !== MSMEComplaintStatus.DRAFT;
  }

  isResolved(): boolean {
    return [
      MSMEComplaintStatus.RESOLVED,
      MSMEComplaintStatus.CLOSED
    ].includes(this.status);
  }

  canBeModified(): boolean {
    return [
      MSMEComplaintStatus.DRAFT,
      MSMEComplaintStatus.UNDER_REVIEW
    ].includes(this.status);
  }

  getDaysInCurrentStatus(): number {
    const statusDate = this.lastStatusUpdate || this.createdAt;
    return Math.floor((Date.now() - statusDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  getTotalClaimAmount(): number {
    return this.claimAmount + this.interestAmount + this.penaltyAmount;
  }

  getClaimSummary(): IClaimAmount {
    return {
      principalAmount: this.claimAmount,
      interestAmount: this.interestAmount,
      penaltyAmount: this.penaltyAmount,
      legalCosts: 0,
      totalClaimAmount: this.getTotalClaimAmount(),
      currency: this.currency,
      calculationMethod: 'MSMED Act 2006',
      calculationDate: new Date()
    };
  }
}

// ============================================================================
// MSME Complaint Document Entity
// ============================================================================

/**
 * MSME Complaint Document Entity
 * Manages documents associated with MSME complaints
 */
@Entity('msme_complaint_documents')
@Index(['complaintId', 'documentType'])
@Index(['uploadDate'])
@Index(['isRequired'])
export class MSMEComplaintDocument {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'complaint_id', type: 'uuid' })
  @IsUUID()
  complaintId: string;

  @Column({ name: 'document_id', type: 'varchar', length: 100, unique: true })
  @IsString()
  documentId: string;

  @Column({ 
    name: 'document_type', 
    type: 'enum', 
    enum: MSMEPortalDocumentType
  })
  @IsEnum(MSMEPortalDocumentType)
  documentType: MSMEPortalDocumentType;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  @IsString()
  fileName: string;

  @Column({ name: 'file_path', type: 'text' })
  @IsString()
  filePath: string;

  @Column({ name: 'file_size', type: 'bigint' })
  @IsNumber()
  @Min(0)
  fileSize: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  @IsString()
  mimeType: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Column({ name: 'is_required', type: 'boolean', default: false })
  @IsBoolean()
  isRequired: boolean;

  @Column({ name: 'is_submitted', type: 'boolean', default: false })
  @IsBoolean()
  isSubmitted: boolean;

  @Column({ name: 'submission_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  submissionDate?: Date;

  @Column({ name: 'portal_document_id', type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  portalDocumentId?: string;

  @Column({ name: 'upload_status', type: 'varchar', length: 50, default: 'pending' })
  @IsString()
  uploadStatus: string;

  @Column({ name: 'upload_error', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  uploadError?: string;

  @Column({ name: 'checksum', type: 'varchar', length: 64, nullable: true })
  @IsOptional()
  @IsString()
  checksum?: string;

  @Column({ name: 'document_metadata', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  documentMetadata?: Record<string, any>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @IsBoolean()
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @IsDate()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  @IsDate()
  updatedAt: Date;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  uploadedBy?: string;

  @Column({ name: 'version', type: 'integer', default: 1 })
  @IsNumber()
  version: number;

  // Relationships
  @ManyToOne(() => MSMEComplaint, complaint => complaint.documents)
  @JoinColumn({ name: 'complaint_id' })
  complaint: MSMEComplaint;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.documentId) {
      this.documentId = this.generateDocumentId();
    }
  }

  @BeforeUpdate()
  updateVersion() {
    this.version += 1;
  }

  // Helper methods
  private generateDocumentId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `DOC-${timestamp}-${random}`.toUpperCase();
  }

  isUploaded(): boolean {
    return this.uploadStatus === 'uploaded';
  }

  isSubmittedToPortal(): boolean {
    return this.isSubmitted && !!this.portalDocumentId;
  }

  getFileSizeInMB(): number {
    return Math.round((this.fileSize / (1024 * 1024)) * 100) / 100;
  }

  getDocumentReference(): IDocumentReference {
    return {
      documentId: this.documentId,
      documentType: this.documentType,
      fileName: this.fileName,
      filePath: this.filePath,
      fileSize: this.fileSize,
      mimeType: this.mimeType,
      uploadDate: this.createdAt,
      description: this.description,
      isRequired: this.isRequired
    };
  }
}

// ============================================================================
// MSME Complaint Status History Entity
// ============================================================================

/**
 * MSME Complaint Status History Entity
 * Tracks status changes and updates for MSME complaints
 */
@Entity('msme_complaint_status_history')
@Index(['complaintId', 'statusChangeDate'])
@Index(['previousStatus', 'currentStatus'])
export class MSMEComplaintStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'complaint_id', type: 'uuid' })
  @IsUUID()
  complaintId: string;

  @Column({ 
    name: 'previous_status', 
    type: 'enum', 
    enum: MSMEComplaintStatus,
    nullable: true
  })
  @IsOptional()
  @IsEnum(MSMEComplaintStatus)
  previousStatus?: MSMEComplaintStatus;

  @Column({ 
    name: 'current_status', 
    type: 'enum', 
    enum: MSMEComplaintStatus
  })
  @IsEnum(MSMEComplaintStatus)
  currentStatus: MSMEComplaintStatus;

  @Column({ name: 'status_change_date', type: 'timestamp with time zone' })
  @IsDate()
  statusChangeDate: Date;

  @Column({ name: 'change_reason', type: 'text' })
  @IsString()
  changeReason: string;

  @Column({ name: 'additional_info', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  additionalInfo?: any;

  @Column({ name: 'next_actions', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  nextActions?: string[];

  @Column({ name: 'portal_response', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  portalResponse?: any;

  @Column({ name: 'system_generated', type: 'boolean', default: false })
  @IsBoolean()
  systemGenerated: boolean;

  @Column({ name: 'notification_sent', type: 'boolean', default: false })
  @IsBoolean()
  notificationSent: boolean;

  @Column({ name: 'notification_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  notificationDate?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @IsDate()
  createdAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  // Relationships
  @ManyToOne(() => MSMEComplaint, complaint => complaint.statusHistory)
  @JoinColumn({ name: 'complaint_id' })
  complaint: MSMEComplaint;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.statusChangeDate) {
      this.statusChangeDate = new Date();
    }
  }

  // Helper methods
  getDurationInPreviousStatus(): number | null {
    if (!this.previousStatus) return null;
    
    // This would need to be calculated based on the previous status history entry
    // Implementation would require a query to find the previous status change
    return null;
  }

  isStatusProgression(): boolean {
    if (!this.previousStatus) return true;
    
    const statusOrder = [
      MSMEComplaintStatus.DRAFT,
      MSMEComplaintStatus.SUBMITTED,
      MSMEComplaintStatus.UNDER_REVIEW,
      MSMEComplaintStatus.BUYER_NOTIFIED,
      MSMEComplaintStatus.CONCILIATION_SCHEDULED,
      MSMEComplaintStatus.CONCILIATION_IN_PROGRESS,
      MSMEComplaintStatus.CONCILIATION_COMPLETED,
      MSMEComplaintStatus.RESOLVED,
      MSMEComplaintStatus.CLOSED
    ];

    const previousIndex = statusOrder.indexOf(this.previousStatus);
    const currentIndex = statusOrder.indexOf(this.currentStatus);
    
    return currentIndex > previousIndex;
  }

  getStatusChangeDescription(): string {
    const statusDescriptions = {
      [MSMEComplaintStatus.DRAFT]: 'Complaint created in draft status',
      [MSMEComplaintStatus.SUBMITTED]: 'Complaint submitted to MSME Portal',
      [MSMEComplaintStatus.UNDER_REVIEW]: 'Complaint is under review by MSME officials',
      [MSMEComplaintStatus.BUYER_NOTIFIED]: 'Buyer has been notified about the complaint',
      [MSMEComplaintStatus.CONCILIATION_SCHEDULED]: 'Conciliation meeting has been scheduled',
      [MSMEComplaintStatus.CONCILIATION_IN_PROGRESS]: 'Conciliation meeting is in progress',
      [MSMEComplaintStatus.CONCILIATION_COMPLETED]: 'Conciliation meeting has been completed',
      [MSMEComplaintStatus.RESOLVED]: 'Complaint has been resolved',
      [MSMEComplaintStatus.ESCALATED]: 'Complaint has been escalated for further action',
      [MSMEComplaintStatus.CLOSED]: 'Complaint has been closed',
      [MSMEComplaintStatus.REJECTED]: 'Complaint has been rejected',
      [MSMEComplaintStatus.WITHDRAWN]: 'Complaint has been withdrawn'
    };

    return statusDescriptions[this.currentStatus] || 'Status updated';
  }
}

// ============================================================================
// Export all entities
// ============================================================================

export const MSMEPortalEntities = [
  MSMEPortalConnection,
  MSMEComplaint,
  MSMEComplaintDocument,
  MSMEComplaintStatusHistory
] as const;

