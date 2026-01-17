/**
 * Document Generation Entities
 * Module 8 Enhancement - Legal Compliance Automation
 * 
 * This file contains all entity definitions for automated legal document generation
 * including templates, documents, signatures, and compliance validation.
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
  BeforeUpdate,
  ManyToMany,
  JoinTable
} from 'typeorm';
import { IsUUID, IsString, IsEnum, IsNumber, IsBoolean, IsDate, IsOptional, IsObject, ValidateNested, Min, Max, IsEmail, IsUrl, IsJSON } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { v4 as uuidv4 } from 'uuid';
import {
  DocumentType,
  DocumentStatus,
  DocumentLanguage,
  DocumentFormat,
  TemplateCategory,
  TemplateStatus,
  SignatureType,
  SignatureStatus,
  ComplianceStatus,
  LegalJurisdiction,
  NoticeType,
  DocumentPriority,
  DocumentSecurity,
  VersionControl,
  ApprovalStatus,
  DeliveryMethod,
  DeliveryStatus
} from '@shared/enums/legal-compliance.enum';
import {
  IDocumentTemplate,
  IDocumentMetadata,
  ISignatureConfiguration,
  IComplianceValidation,
  IDocumentVariable,
  ITemplateSection,
  IDocumentApproval,
  IDocumentDelivery,
  IDocumentAudit,
  IDocumentSecurity,
  IVersionHistory
} from '@shared/interfaces/legal-compliance.interface';

// ============================================================================
// Document Template Entity
// ============================================================================

/**
 * Document Template Entity
 * Represents legal document templates for automated generation
 */
@Entity('document_templates')
@Index(['tenantId', 'templateCategory'])
@Index(['templateCode'], { unique: true })
@Index(['status'])
@Index(['jurisdiction'])
@Index(['language'])
export class DocumentTemplate {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @IsUUID()
  @Index()
  tenantId: string;

  @Column({ name: 'template_code', type: 'varchar', length: 50, unique: true })
  @IsString()
  templateCode: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  @IsString()
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Column({ 
    name: 'template_category', 
    type: 'enum', 
    enum: TemplateCategory
  })
  @IsEnum(TemplateCategory)
  templateCategory: TemplateCategory;

  @Column({ 
    name: 'document_type', 
    type: 'enum', 
    enum: DocumentType
  })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @Column({ 
    name: 'language', 
    type: 'enum', 
    enum: DocumentLanguage,
    default: DocumentLanguage.ENGLISH
  })
  @IsEnum(DocumentLanguage)
  language: DocumentLanguage;

  @Column({ name: 'jurisdiction', type: 'jsonb' })
  @IsObject()
  jurisdiction: LegalJurisdiction[];

  @Column({ name: 'template_content', type: 'jsonb' })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  templateContent: ITemplateSection[];

  @Column({ name: 'variables', type: 'jsonb' })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  variables: IDocumentVariable[];

  @Column({ name: 'conditional_sections', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  conditionalSections?: any[];

  @Column({ name: 'formatting_rules', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  formattingRules?: any;

  @Column({ name: 'validation_rules', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  validationRules?: any[];

  @Column({ name: 'compliance_requirements', type: 'jsonb' })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  complianceRequirements: IComplianceValidation[];

  @Column({ name: 'signature_configuration', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  signatureConfiguration?: ISignatureConfiguration;

  @Column({ 
    name: 'status', 
    type: 'enum', 
    enum: TemplateStatus,
    default: TemplateStatus.DRAFT
  })
  @IsEnum(TemplateStatus)
  status: TemplateStatus;

  @Column({ name: 'version', type: 'varchar', length: 20, default: '1.0.0' })
  @IsString()
  version: string;

  @Column({ name: 'parent_template_id', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  parentTemplateId?: string;

  @Column({ name: 'tags', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  tags?: string[];

  @Column({ name: 'usage_count', type: 'integer', default: 0 })
  @IsNumber()
  @Min(0)
  usageCount: number;

  @Column({ name: 'success_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  successRate: number;

  @Column({ name: 'average_generation_time', type: 'integer', default: 0 })
  @IsNumber()
  @Min(0)
  averageGenerationTime: number; // in milliseconds

  @Column({ name: 'legal_review_required', type: 'boolean', default: true })
  @IsBoolean()
  legalReviewRequired: boolean;

  @Column({ name: 'auto_approval_enabled', type: 'boolean', default: false })
  @IsBoolean()
  autoApprovalEnabled: boolean;

  @Column({ name: 'expiry_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  expiryDate?: Date;

  @Column({ name: 'last_reviewed_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  lastReviewedDate?: Date;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  reviewedBy?: string;

  @Column({ name: 'template_metadata', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  templateMetadata?: Record<string, any>;

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

  // Relationships
  @ManyToOne(() => DocumentTemplate, template => template.childTemplates)
  @JoinColumn({ name: 'parent_template_id' })
  parentTemplate: DocumentTemplate;

  @OneToMany(() => DocumentTemplate, template => template.parentTemplate)
  childTemplates: DocumentTemplate[];

  @OneToMany(() => GeneratedDocument, document => document.template)
  generatedDocuments: GeneratedDocument[];

  @OneToMany(() => TemplateVersionHistory, version => version.template)
  versionHistory: TemplateVersionHistory[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.templateCode) {
      this.templateCode = this.generateTemplateCode();
    }
  }

  @BeforeUpdate()
  updateMetadata() {
    this.updatedAt = new Date();
  }

  // Helper methods
  private generateTemplateCode(): string {
    const category = this.templateCategory.substring(0, 3).toUpperCase();
    const type = this.documentType.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `TPL-${category}-${type}-${timestamp}`;
  }

  isActive(): boolean {
    return this.isActive && this.status === TemplateStatus.ACTIVE;
  }

  isExpired(): boolean {
    return this.expiryDate ? new Date() > this.expiryDate : false;
  }

  needsReview(): boolean {
    if (!this.lastReviewedDate) return true;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return this.lastReviewedDate < sixMonthsAgo;
  }

  supportsJurisdiction(jurisdiction: LegalJurisdiction): boolean {
    return this.jurisdiction.includes(jurisdiction) || 
           this.jurisdiction.includes(LegalJurisdiction.ALL_INDIA);
  }

  getVariableByName(name: string): IDocumentVariable | undefined {
    return this.variables.find(v => v.name === name);
  }

  validateVariables(data: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const variable of this.variables) {
      if (variable.required && !data[variable.name]) {
        errors.push(`Required variable '${variable.name}' is missing`);
      }
      
      if (data[variable.name] && variable.validation) {
        // Perform validation based on variable type and rules
        const value = data[variable.name];
        if (variable.type === 'email' && !/\S+@\S+\.\S+/.test(value)) {
          errors.push(`Invalid email format for '${variable.name}'`);
        }
        // Add more validation rules as needed
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  incrementUsage(): void {
    this.usageCount += 1;
  }

  updateSuccessRate(successful: boolean): void {
    const totalSuccessful = (this.successRate / 100) * this.usageCount;
    if (successful) {
      this.successRate = ((totalSuccessful + 1) / this.usageCount) * 100;
    } else {
      this.successRate = (totalSuccessful / this.usageCount) * 100;
    }
  }

  updateAverageGenerationTime(generationTime: number): void {
    const totalTime = this.averageGenerationTime * (this.usageCount - 1);
    this.averageGenerationTime = (totalTime + generationTime) / this.usageCount;
  }
}

// ============================================================================
// Generated Document Entity
// ============================================================================

/**
 * Generated Document Entity
 * Represents documents generated from templates
 */
@Entity('generated_documents')
@Index(['tenantId', 'documentType'])
@Index(['templateId', 'createdAt'])
@Index(['status'])
@Index(['documentNumber'], { unique: true })
@Index(['clientId'])
export class GeneratedDocument {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @IsUUID()
  @Index()
  tenantId: string;

  @Column({ name: 'document_number', type: 'varchar', length: 50, unique: true })
  @IsString()
  documentNumber: string;

  @Column({ name: 'template_id', type: 'uuid' })
  @IsUUID()
  templateId: string;

  @Column({ 
    name: 'document_type', 
    type: 'enum', 
    enum: DocumentType
  })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  @IsString()
  title: string;

  @Column({ name: 'client_id', type: 'uuid' })
  @IsUUID()
  clientId: string;

  @Column({ name: 'recipient_details', type: 'jsonb' })
  @IsObject()
  recipientDetails: any;

  @Column({ name: 'document_content', type: 'jsonb' })
  @IsObject()
  documentContent: any;

  @Column({ name: 'variable_data', type: 'jsonb' })
  @IsObject()
  variableData: Record<string, any>;

  @Column({ 
    name: 'language', 
    type: 'enum', 
    enum: DocumentLanguage,
    default: DocumentLanguage.ENGLISH
  })
  @IsEnum(DocumentLanguage)
  language: DocumentLanguage;

  @Column({ 
    name: 'format', 
    type: 'enum', 
    enum: DocumentFormat,
    default: DocumentFormat.PDF
  })
  @IsEnum(DocumentFormat)
  format: DocumentFormat;

  @Column({ 
    name: 'status', 
    type: 'enum', 
    enum: DocumentStatus,
    default: DocumentStatus.DRAFT
  })
  @IsEnum(DocumentStatus)
  status: DocumentStatus;

  @Column({ 
    name: 'priority', 
    type: 'enum', 
    enum: DocumentPriority,
    default: DocumentPriority.NORMAL
  })
  @IsEnum(DocumentPriority)
  priority: DocumentPriority;

  @Column({ name: 'file_path', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  filePath?: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @Column({ name: 'file_hash', type: 'varchar', length: 128, nullable: true })
  @IsOptional()
  @IsString()
  fileHash?: string;

  @Column({ name: 'generation_time', type: 'integer', default: 0 })
  @IsNumber()
  @Min(0)
  generationTime: number; // in milliseconds

  @Column({ name: 'validation_results', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  validationResults?: any;

  @Column({ name: 'compliance_status', type: 'jsonb' })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  complianceStatus: IComplianceValidation[];

  @Column({ name: 'security_settings', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  securitySettings?: IDocumentSecurity;

  @Column({ name: 'watermark_applied', type: 'boolean', default: false })
  @IsBoolean()
  watermarkApplied: boolean;

  @Column({ name: 'password_protected', type: 'boolean', default: false })
  @IsBoolean()
  passwordProtected: boolean;

  @Column({ name: 'digital_signature_required', type: 'boolean', default: false })
  @IsBoolean()
  digitalSignatureRequired: boolean;

  @Column({ name: 'expiry_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  expiryDate?: Date;

  @Column({ name: 'approval_required', type: 'boolean', default: false })
  @IsBoolean()
  approvalRequired: boolean;

  @Column({ name: 'auto_delivery_enabled', type: 'boolean', default: false })
  @IsBoolean()
  autoDeliveryEnabled: boolean;

  @Column({ name: 'delivery_scheduled_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  deliveryScheduledDate?: Date;

  @Column({ name: 'tags', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  tags?: string[];

  @Column({ name: 'custom_fields', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @Column({ name: 'document_metadata', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  documentMetadata?: IDocumentMetadata;

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
  @ManyToOne(() => DocumentTemplate, template => template.generatedDocuments)
  @JoinColumn({ name: 'template_id' })
  template: DocumentTemplate;

  @OneToMany(() => DocumentSignature, signature => signature.document)
  signatures: DocumentSignature[];

  @OneToMany(() => DocumentApproval, approval => approval.document)
  approvals: DocumentApproval[];

  @OneToMany(() => DocumentDelivery, delivery => delivery.document)
  deliveries: DocumentDelivery[];

  @OneToMany(() => DocumentAuditLog, audit => audit.document)
  auditLogs: DocumentAuditLog[];

  @OneToMany(() => DocumentVersionHistory, version => version.document)
  versionHistory: DocumentVersionHistory[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.documentNumber) {
      this.documentNumber = this.generateDocumentNumber();
    }
  }

  @BeforeUpdate()
  updateVersion() {
    this.version += 1;
    this.updatedAt = new Date();
  }

  // Helper methods
  private generateDocumentNumber(): string {
    const type = this.documentType.substring(0, 3).toUpperCase();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `DOC-${type}-${year}${month}-${timestamp}`;
  }

  isDraft(): boolean {
    return this.status === DocumentStatus.DRAFT;
  }

  isGenerated(): boolean {
    return this.status === DocumentStatus.GENERATED;
  }

  isApproved(): boolean {
    return this.status === DocumentStatus.APPROVED;
  }

  isDelivered(): boolean {
    return this.status === DocumentStatus.DELIVERED;
  }

  isExpired(): boolean {
    return this.expiryDate ? new Date() > this.expiryDate : false;
  }

  needsApproval(): boolean {
    return this.approvalRequired && !this.isApproved();
  }

  needsSignature(): boolean {
    return this.digitalSignatureRequired && 
           !this.signatures.some(s => s.status === SignatureStatus.COMPLETED);
  }

  canBeDelivered(): boolean {
    return this.isGenerated() && 
           (!this.needsApproval() || this.isApproved()) &&
           (!this.needsSignature() || this.signatures.some(s => s.status === SignatureStatus.COMPLETED));
  }

  getFileExtension(): string {
    switch (this.format) {
      case DocumentFormat.PDF:
        return '.pdf';
      case DocumentFormat.DOCX:
        return '.docx';
      case DocumentFormat.HTML:
        return '.html';
      case DocumentFormat.TXT:
        return '.txt';
      default:
        return '.pdf';
    }
  }

  calculateFileHash(content: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  isCompliant(): boolean {
    return this.complianceStatus.every(c => c.status === ComplianceStatus.COMPLIANT);
  }

  getComplianceIssues(): string[] {
    return this.complianceStatus
      .filter(c => c.status !== ComplianceStatus.COMPLIANT)
      .map(c => c.requirement);
  }

  addTag(tag: string): void {
    if (!this.tags) this.tags = [];
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    if (this.tags) {
      this.tags = this.tags.filter(t => t !== tag);
    }
  }

  hasTag(tag: string): boolean {
    return this.tags ? this.tags.includes(tag) : false;
  }
}

// ============================================================================
// Document Signature Entity
// ============================================================================

/**
 * Document Signature Entity
 * Represents digital signatures on documents
 */
@Entity('document_signatures')
@Index(['documentId', 'signatureType'])
@Index(['signerId'])
@Index(['status'])
@Index(['signatureDate'])
export class DocumentSignature {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  @IsUUID()
  documentId: string;

  @Column({ 
    name: 'signature_type', 
    type: 'enum', 
    enum: SignatureType
  })
  @IsEnum(SignatureType)
  signatureType: SignatureType;

  @Column({ name: 'signer_id', type: 'uuid' })
  @IsUUID()
  signerId: string;

  @Column({ name: 'signer_name', type: 'varchar', length: 255 })
  @IsString()
  signerName: string;

  @Column({ name: 'signer_email', type: 'varchar', length: 255 })
  @IsEmail()
  signerEmail: string;

  @Column({ name: 'signer_role', type: 'varchar', length: 100 })
  @IsString()
  signerRole: string;

  @Column({ 
    name: 'status', 
    type: 'enum', 
    enum: SignatureStatus,
    default: SignatureStatus.PENDING
  })
  @IsEnum(SignatureStatus)
  status: SignatureStatus;

  @Column({ name: 'signature_data', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  signatureData?: string;

  @Column({ name: 'signature_image_path', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  signatureImagePath?: string;

  @Column({ name: 'certificate_path', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  certificatePath?: string;

  @Column({ name: 'signature_hash', type: 'varchar', length: 128, nullable: true })
  @IsOptional()
  @IsString()
  signatureHash?: string;

  @Column({ name: 'signature_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  signatureDate?: Date;

  @Column({ name: 'signature_location', type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  signatureLocation?: string;

  @Column({ name: 'signature_reason', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  signatureReason?: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @Column({ name: 'signature_order', type: 'integer', default: 1 })
  @IsNumber()
  @Min(1)
  signatureOrder: number;

  @Column({ name: 'is_required', type: 'boolean', default: true })
  @IsBoolean()
  isRequired: boolean;

  @Column({ name: 'reminder_sent', type: 'boolean', default: false })
  @IsBoolean()
  reminderSent: boolean;

  @Column({ name: 'reminder_count', type: 'integer', default: 0 })
  @IsNumber()
  @Min(0)
  reminderCount: number;

  @Column({ name: 'last_reminder_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  lastReminderDate?: Date;

  @Column({ name: 'expiry_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  expiryDate?: Date;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @Column({ name: 'signature_metadata', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  signatureMetadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @IsDate()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  @IsDate()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => GeneratedDocument, document => document.signatures)
  @JoinColumn({ name: 'document_id' })
  document: GeneratedDocument;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  // Helper methods
  isPending(): boolean {
    return this.status === SignatureStatus.PENDING;
  }

  isCompleted(): boolean {
    return this.status === SignatureStatus.COMPLETED;
  }

  isRejected(): boolean {
    return this.status === SignatureStatus.REJECTED;
  }

  isExpired(): boolean {
    return this.expiryDate ? new Date() > this.expiryDate : false;
  }

  needsReminder(): boolean {
    if (!this.isPending() || this.reminderCount >= 3) return false;
    
    const now = new Date();
    const daysSinceCreated = Math.floor((now.getTime() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceLastReminder = this.lastReminderDate ? 
      Math.floor((now.getTime() - this.lastReminderDate.getTime()) / (1000 * 60 * 60 * 24)) : 
      daysSinceCreated;
    
    return daysSinceLastReminder >= 3; // Send reminder every 3 days
  }

  canSign(): boolean {
    return this.isPending() && !this.isExpired();
  }

  sign(signatureData: string, location?: string, reason?: string): void {
    this.signatureData = signatureData;
    this.signatureDate = new Date();
    this.signatureLocation = location;
    this.signatureReason = reason;
    this.status = SignatureStatus.COMPLETED;
    
    // Generate signature hash
    const crypto = require('crypto');
    this.signatureHash = crypto.createHash('sha256').update(signatureData).digest('hex');
  }

  reject(reason: string): void {
    this.rejectionReason = reason;
    this.status = SignatureStatus.REJECTED;
  }

  sendReminder(): void {
    this.reminderSent = true;
    this.reminderCount += 1;
    this.lastReminderDate = new Date();
  }
}

// ============================================================================
// Supporting Entities
// ============================================================================

/**
 * Document Approval Entity
 */
@Entity('document_approvals')
@Index(['documentId', 'approvalStatus'])
@Index(['approverId'])
@Index(['approvalDate'])
export class DocumentApproval {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  @IsUUID()
  documentId: string;

  @Column({ name: 'approver_id', type: 'uuid' })
  @IsUUID()
  approverId: string;

  @Column({ name: 'approver_name', type: 'varchar', length: 255 })
  @IsString()
  approverName: string;

  @Column({ name: 'approver_role', type: 'varchar', length: 100 })
  @IsString()
  approverRole: string;

  @Column({ 
    name: 'approval_status', 
    type: 'enum', 
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING
  })
  @IsEnum(ApprovalStatus)
  approvalStatus: ApprovalStatus;

  @Column({ name: 'approval_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  approvalDate?: Date;

  @Column({ name: 'comments', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  comments?: string;

  @Column({ name: 'approval_level', type: 'integer', default: 1 })
  @IsNumber()
  @Min(1)
  approvalLevel: number;

  @Column({ name: 'is_required', type: 'boolean', default: true })
  @IsBoolean()
  isRequired: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @IsDate()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  @IsDate()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => GeneratedDocument, document => document.approvals)
  @JoinColumn({ name: 'document_id' })
  document: GeneratedDocument;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}

/**
 * Document Delivery Entity
 */
@Entity('document_deliveries')
@Index(['documentId', 'deliveryMethod'])
@Index(['deliveryStatus'])
@Index(['deliveryDate'])
export class DocumentDelivery {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  @IsUUID()
  documentId: string;

  @Column({ 
    name: 'delivery_method', 
    type: 'enum', 
    enum: DeliveryMethod
  })
  @IsEnum(DeliveryMethod)
  deliveryMethod: DeliveryMethod;

  @Column({ name: 'recipient_email', type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsEmail()
  recipientEmail?: string;

  @Column({ name: 'recipient_phone', type: 'varchar', length: 20, nullable: true })
  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @Column({ name: 'recipient_address', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  recipientAddress?: any;

  @Column({ 
    name: 'delivery_status', 
    type: 'enum', 
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING
  })
  @IsEnum(DeliveryStatus)
  deliveryStatus: DeliveryStatus;

  @Column({ name: 'delivery_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  deliveryDate?: Date;

  @Column({ name: 'tracking_number', type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @Column({ name: 'delivery_proof', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  deliveryProof?: any;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  failureReason?: string;

  @Column({ name: 'retry_count', type: 'integer', default: 0 })
  @IsNumber()
  @Min(0)
  retryCount: number;

  @Column({ name: 'next_retry_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  nextRetryDate?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @IsDate()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  @IsDate()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => GeneratedDocument, document => document.deliveries)
  @JoinColumn({ name: 'document_id' })
  document: GeneratedDocument;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}

/**
 * Document Audit Log Entity
 */
@Entity('document_audit_logs')
@Index(['documentId', 'actionDate'])
@Index(['actionType'])
@Index(['userId'])
export class DocumentAuditLog {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  @IsUUID()
  documentId: string;

  @Column({ name: 'action_type', type: 'varchar', length: 50 })
  @IsString()
  actionType: string;

  @Column({ name: 'action_description', type: 'text' })
  @IsString()
  actionDescription: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @Column({ name: 'user_name', type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  userName?: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @Column({ name: 'action_data', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  actionData?: Record<string, any>;

  @Column({ name: 'action_date', type: 'timestamp with time zone' })
  @IsDate()
  actionDate: Date;

  // Relationships
  @ManyToOne(() => GeneratedDocument, document => document.auditLogs)
  @JoinColumn({ name: 'document_id' })
  document: GeneratedDocument;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.actionDate) {
      this.actionDate = new Date();
    }
  }
}

/**
 * Template Version History Entity
 */
@Entity('template_version_history')
@Index(['templateId', 'versionDate'])
@Index(['version'])
export class TemplateVersionHistory {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'template_id', type: 'uuid' })
  @IsUUID()
  templateId: string;

  @Column({ name: 'version', type: 'varchar', length: 20 })
  @IsString()
  version: string;

  @Column({ name: 'version_date', type: 'timestamp with time zone' })
  @IsDate()
  versionDate: Date;

  @Column({ name: 'changes_description', type: 'text' })
  @IsString()
  changesDescription: string;

  @Column({ name: 'template_content', type: 'jsonb' })
  @IsObject()
  templateContent: any;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  // Relationships
  @ManyToOne(() => DocumentTemplate, template => template.versionHistory)
  @JoinColumn({ name: 'template_id' })
  template: DocumentTemplate;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.versionDate) {
      this.versionDate = new Date();
    }
  }
}

/**
 * Document Version History Entity
 */
@Entity('document_version_history')
@Index(['documentId', 'versionDate'])
@Index(['version'])
export class DocumentVersionHistory {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  @IsUUID()
  documentId: string;

  @Column({ name: 'version', type: 'integer' })
  @IsNumber()
  version: number;

  @Column({ name: 'version_date', type: 'timestamp with time zone' })
  @IsDate()
  versionDate: Date;

  @Column({ name: 'changes_description', type: 'text' })
  @IsString()
  changesDescription: string;

  @Column({ name: 'document_content', type: 'jsonb' })
  @IsObject()
  documentContent: any;

  @Column({ name: 'file_path', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  filePath?: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  // Relationships
  @ManyToOne(() => GeneratedDocument, document => document.versionHistory)
  @JoinColumn({ name: 'document_id' })
  document: GeneratedDocument;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.versionDate) {
      this.versionDate = new Date();
    }
  }
}

// ============================================================================
// Export all entities
// ============================================================================

export const DocumentGenerationEntities = [
  DocumentTemplate,
  GeneratedDocument,
  DocumentSignature,
  DocumentApproval,
  DocumentDelivery,
  DocumentAuditLog,
  TemplateVersionHistory,
  DocumentVersionHistory
] as const;

