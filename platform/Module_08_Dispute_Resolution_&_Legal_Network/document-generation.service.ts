/**
 * Document Generation Service
 * Module 8 Enhancement - Legal Compliance Automation
 * 
 * This service manages automated legal document generation including
 * template management, document creation, digital signatures, and compliance validation.
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, SelectQueryBuilder } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as PDFDocument from 'pdfkit';
import * as Handlebars from 'handlebars';
import { v4 as uuidv4 } from 'uuid';

import {
  DocumentTemplate,
  GeneratedDocument,
  DocumentSignature,
  DocumentApproval,
  DocumentDelivery,
  DocumentAuditLog,
  TemplateVersionHistory,
  DocumentVersionHistory
} from '../entities/document-generation.entity';

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
  DocumentPriority,
  ApprovalStatus,
  DeliveryMethod,
  DeliveryStatus,
  NotificationType,
  NotificationPriority,
  AIModelType,
  AIProcessingStatus
} from '@shared/enums/legal-compliance.enum';

import {
  IDocumentTemplate,
  IDocumentGenerationRequest,
  IDocumentGenerationResult,
  ITemplateValidationResult,
  ISignatureRequest,
  IApprovalRequest,
  IDeliveryRequest,
  IBaseResponse,
  IPaginationRequest,
  IPaginationResponse,
  INotificationRequest,
  IAIProcessingRequest,
  IAIProcessingResult,
  IDocumentVariable,
  IComplianceValidation
} from '@shared/interfaces/legal-compliance.interface';

// ============================================================================
// DTOs and Request/Response Interfaces
// ============================================================================

export interface TemplateCreationRequest {
  tenantId: string;
  templateData: Partial<IDocumentTemplate>;
  createdBy: string;
}

export interface TemplateUpdateRequest {
  templateId: string;
  templateData: Partial<IDocumentTemplate>;
  updatedBy: string;
  versionNotes?: string;
}

export interface DocumentGenerationRequest {
  tenantId: string;
  templateId: string;
  clientId: string;
  variableData: Record<string, any>;
  recipientDetails: any;
  options?: {
    format?: DocumentFormat;
    language?: DocumentLanguage;
    priority?: DocumentPriority;
    autoApproval?: boolean;
    autoDelivery?: boolean;
    deliverySchedule?: Date;
    digitalSignature?: boolean;
    watermark?: boolean;
    passwordProtection?: boolean;
    expiryDate?: Date;
    customFields?: Record<string, any>;
  };
}

export interface BulkDocumentGenerationRequest {
  tenantId: string;
  templateId: string;
  clientId: string;
  documents: Array<{
    variableData: Record<string, any>;
    recipientDetails: any;
    customOptions?: any;
  }>;
  globalOptions?: any;
}

export interface TemplateSearchRequest {
  tenantId: string;
  category?: TemplateCategory;
  documentType?: DocumentType;
  language?: DocumentLanguage;
  jurisdiction?: LegalJurisdiction[];
  status?: TemplateStatus;
  searchTerm?: string;
  tags?: string[];
  pagination?: IPaginationRequest;
}

export interface DocumentSearchRequest {
  tenantId: string;
  clientId?: string;
  documentType?: DocumentType;
  status?: DocumentStatus;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  searchTerm?: string;
  tags?: string[];
  pagination?: IPaginationRequest;
}

export interface DocumentAnalyticsRequest {
  tenantId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  groupBy?: 'day' | 'week' | 'month';
  filters?: {
    documentType?: DocumentType[];
    templateId?: string[];
    clientId?: string[];
    status?: DocumentStatus[];
  };
}

export interface DocumentAnalyticsResponse {
  summary: {
    totalDocuments: number;
    generatedDocuments: number;
    approvedDocuments: number;
    deliveredDocuments: number;
    averageGenerationTime: number;
    successRate: number;
    complianceRate: number;
  };
  trends: {
    documentGeneration: Array<{ date: string; count: number }>;
    approvalRate: Array<{ date: string; rate: number }>;
    deliverySuccess: Array<{ date: string; rate: number }>;
  };
  topTemplates: Array<{
    templateId: string;
    templateName: string;
    usageCount: number;
    successRate: number;
  }>;
  complianceMetrics: {
    compliantDocuments: number;
    nonCompliantDocuments: number;
    commonIssues: Array<{ issue: string; count: number }>;
  };
}

// ============================================================================
// Document Generation Service Implementation
// ============================================================================

@Injectable()
export class DocumentGenerationService {
  private readonly logger = new Logger(DocumentGenerationService.name);
  private readonly templateCache = new Map<string, DocumentTemplate>();
  private readonly aiCache = new Map<string, any>();

  constructor(
    @InjectRepository(DocumentTemplate)
    private readonly templateRepository: Repository<DocumentTemplate>,
    
    @InjectRepository(GeneratedDocument)
    private readonly documentRepository: Repository<GeneratedDocument>,
    
    @InjectRepository(DocumentSignature)
    private readonly signatureRepository: Repository<DocumentSignature>,
    
    @InjectRepository(DocumentApproval)
    private readonly approvalRepository: Repository<DocumentApproval>,
    
    @InjectRepository(DocumentDelivery)
    private readonly deliveryRepository: Repository<DocumentDelivery>,
    
    @InjectRepository(DocumentAuditLog)
    private readonly auditRepository: Repository<DocumentAuditLog>,
    
    @InjectRepository(TemplateVersionHistory)
    private readonly templateVersionRepository: Repository<TemplateVersionHistory>,
    
    @InjectRepository(DocumentVersionHistory)
    private readonly documentVersionRepository: Repository<DocumentVersionHistory>,
    
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.initializeService();
  }

  // ============================================================================
  // Service Initialization
  // ============================================================================

  private async initializeService(): Promise<void> {
    try {
      this.logger.log('Initializing Document Generation Service...');
      
      // Initialize default templates
      await this.initializeDefaultTemplates();
      
      // Setup AI processing
      await this.initializeAIProcessing();
      
      // Setup Handlebars helpers
      this.setupHandlebarsHelpers();
      
      // Setup periodic tasks
      this.setupPeriodicTasks();
      
      this.logger.log('Document Generation Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Document Generation Service', error);
      throw error;
    }
  }

  private async initializeDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        templateCode: 'DEMAND_NOTICE_EN',
        name: 'Demand Notice (English)',
        templateCategory: TemplateCategory.LEGAL_NOTICES,
        documentType: DocumentType.DEMAND_NOTICE,
        language: DocumentLanguage.ENGLISH,
        jurisdiction: [LegalJurisdiction.ALL_INDIA]
      },
      {
        templateCode: 'LEGAL_NOTICE_EN',
        name: 'Legal Notice (English)',
        templateCategory: TemplateCategory.LEGAL_NOTICES,
        documentType: DocumentType.LEGAL_NOTICE,
        language: DocumentLanguage.ENGLISH,
        jurisdiction: [LegalJurisdiction.ALL_INDIA]
      },
      {
        templateCode: 'PAYMENT_AGREEMENT_EN',
        name: 'Payment Agreement (English)',
        templateCategory: TemplateCategory.CONTRACTS,
        documentType: DocumentType.PAYMENT_AGREEMENT,
        language: DocumentLanguage.ENGLISH,
        jurisdiction: [LegalJurisdiction.ALL_INDIA]
      }
    ];

    for (const template of defaultTemplates) {
      const existing = await this.templateRepository.findOne({
        where: { templateCode: template.templateCode }
      });

      if (!existing) {
        const templateContent = await this.loadDefaultTemplateContent(template.templateCode);
        await this.templateRepository.save({
          ...template,
          templateContent,
          variables: this.extractVariablesFromTemplate(templateContent),
          complianceRequirements: this.getDefaultComplianceRequirements(template.documentType),
          status: TemplateStatus.ACTIVE,
          isActive: true
        });
      }
    }
  }

  private async initializeAIProcessing(): Promise<void> {
    const aiConfig = {
      primaryModel: AIModelType.DEEPSEEK_R1,
      fallbackModels: [AIModelType.TENSORFLOW, AIModelType.SCIKIT_LEARN],
      confidence: 0.85,
      timeout: 30000
    };

    this.aiCache.set('config', aiConfig);
  }

  private setupHandlebarsHelpers(): void {
    // Register custom Handlebars helpers for document generation
    Handlebars.registerHelper('formatDate', (date: Date, format: string) => {
      if (!date) return '';
      // Implement date formatting logic
      return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(new Date(date));
    });

    Handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'INR') => {
      if (!amount) return '';
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency
      }).format(amount);
    });

    Handlebars.registerHelper('upperCase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    Handlebars.registerHelper('lowerCase', (str: string) => {
      return str ? str.toLowerCase() : '';
    });

    Handlebars.registerHelper('ifEquals', function(arg1: any, arg2: any, options: any) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('ifNotEquals', function(arg1: any, arg2: any, options: any) {
      return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
    });
  }

  private setupPeriodicTasks(): void {
    this.logger.log('Setting up periodic tasks for document management');
  }

  // ============================================================================
  // Template Management
  // ============================================================================

  async createTemplate(request: TemplateCreationRequest): Promise<IBaseResponse<DocumentTemplate>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`Creating new template for tenant: ${request.tenantId}`);

      // Validate template data
      await this.validateTemplateData(request.templateData);

      // Check for duplicate template code
      const existingTemplate = await this.templateRepository.findOne({
        where: { 
          tenantId: request.tenantId,
          templateCode: request.templateData.templateCode 
        }
      });

      if (existingTemplate) {
        throw new HttpException(
          'Template with this code already exists',
          HttpStatus.CONFLICT
        );
      }

      // Extract variables from template content
      const variables = this.extractVariablesFromTemplate(request.templateData.templateContent);

      // Create template entity
      const template = queryRunner.manager.create(DocumentTemplate, {
        tenantId: request.tenantId,
        templateCode: request.templateData.templateCode,
        name: request.templateData.name,
        description: request.templateData.description,
        templateCategory: request.templateData.templateCategory,
        documentType: request.templateData.documentType,
        language: request.templateData.language || DocumentLanguage.ENGLISH,
        jurisdiction: request.templateData.jurisdiction || [LegalJurisdiction.ALL_INDIA],
        templateContent: request.templateData.templateContent,
        variables,
        conditionalSections: request.templateData.conditionalSections,
        formattingRules: request.templateData.formattingRules,
        validationRules: request.templateData.validationRules,
        complianceRequirements: request.templateData.complianceRequirements || 
          this.getDefaultComplianceRequirements(request.templateData.documentType),
        signatureConfiguration: request.templateData.signatureConfiguration,
        status: TemplateStatus.DRAFT,
        tags: request.templateData.tags,
        legalReviewRequired: request.templateData.legalReviewRequired !== false,
        autoApprovalEnabled: request.templateData.autoApprovalEnabled || false,
        expiryDate: request.templateData.expiryDate,
        templateMetadata: request.templateData.templateMetadata,
        createdBy: request.createdBy
      });

      const savedTemplate = await queryRunner.manager.save(template);

      // Create initial version history
      await this.createTemplateVersionHistory(
        queryRunner,
        savedTemplate.id,
        '1.0.0',
        'Initial template creation',
        savedTemplate.templateContent,
        request.createdBy
      );

      await queryRunner.commitTransaction();

      // Clear template cache
      this.templateCache.delete(savedTemplate.id);

      // Emit template creation event
      this.eventEmitter.emit('template.created', {
        templateId: savedTemplate.id,
        tenantId: request.tenantId,
        templateCode: savedTemplate.templateCode
      });

      this.logger.log(`Template created successfully: ${savedTemplate.templateCode}`);

      return {
        success: true,
        data: savedTemplate,
        message: 'Template created successfully',
        timestamp: new Date()
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to create template', error);
      throw this.handleError(error);
    } finally {
      await queryRunner.release();
    }
  }

  async updateTemplate(request: TemplateUpdateRequest): Promise<IBaseResponse<DocumentTemplate>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`Updating template: ${request.templateId}`);

      const template = await this.templateRepository.findOne({
        where: { id: request.templateId }
      });

      if (!template) {
        throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
      }

      // Create version history before updating
      await this.createTemplateVersionHistory(
        queryRunner,
        template.id,
        template.version,
        request.versionNotes || 'Template update',
        template.templateContent,
        request.updatedBy
      );

      // Update template
      Object.assign(template, request.templateData);
      template.updatedBy = request.updatedBy;
      
      // Increment version
      const versionParts = template.version.split('.').map(Number);
      versionParts[2] += 1; // Increment patch version
      template.version = versionParts.join('.');

      // Re-extract variables if template content changed
      if (request.templateData.templateContent) {
        template.variables = this.extractVariablesFromTemplate(request.templateData.templateContent);
      }

      const updatedTemplate = await queryRunner.manager.save(template);

      await queryRunner.commitTransaction();

      // Clear template cache
      this.templateCache.delete(template.id);

      // Emit template update event
      this.eventEmitter.emit('template.updated', {
        templateId: template.id,
        version: template.version,
        updatedBy: request.updatedBy
      });

      return {
        success: true,
        data: updatedTemplate,
        message: 'Template updated successfully',
        timestamp: new Date()
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to update template', error);
      throw this.handleError(error);
    } finally {
      await queryRunner.release();
    }
  }

  async searchTemplates(request: TemplateSearchRequest): Promise<IBaseResponse<{
    templates: DocumentTemplate[];
    pagination: IPaginationResponse;
  }>> {
    try {
      this.logger.log(`Searching templates for tenant: ${request.tenantId}`);

      const queryBuilder = this.buildTemplateSearchQuery(request);

      // Apply pagination
      const page = request.pagination?.page || 1;
      const pageSize = request.pagination?.pageSize || 20;
      const skip = (page - 1) * pageSize;

      queryBuilder.skip(skip).take(pageSize);

      // Execute search
      const [templates, total] = await queryBuilder.getManyAndCount();

      return {
        success: true,
        data: {
          templates,
          pagination: {
            page,
            pageSize,
            totalItems: total,
            totalPages: Math.ceil(total / pageSize),
            hasNext: page * pageSize < total,
            hasPrevious: page > 1
          }
        },
        message: 'Template search completed successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to search templates', error);
      throw this.handleError(error);
    }
  }

  async validateTemplate(templateId: string): Promise<IBaseResponse<ITemplateValidationResult>> {
    try {
      const template = await this.templateRepository.findOne({
        where: { id: templateId }
      });

      if (!template) {
        throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
      }

      const validationResult = await this.performTemplateValidation(template);

      return {
        success: true,
        data: validationResult,
        message: 'Template validation completed',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to validate template', error);
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Document Generation
  // ============================================================================

  async generateDocument(request: DocumentGenerationRequest): Promise<IBaseResponse<IDocumentGenerationResult>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`Generating document from template: ${request.templateId}`);

      // Get template
      const template = await this.getTemplate(request.templateId);
      
      if (!template.isActive()) {
        throw new HttpException('Template is not active', HttpStatus.BAD_REQUEST);
      }

      // Validate variable data
      const validation = template.validateVariables(request.variableData);
      if (!validation.valid) {
        throw new HttpException(
          `Variable validation failed: ${validation.errors.join(', ')}`,
          HttpStatus.BAD_REQUEST
        );
      }

      const startTime = Date.now();

      // Create document entity
      const document = queryRunner.manager.create(GeneratedDocument, {
        tenantId: request.tenantId,
        templateId: request.templateId,
        documentType: template.documentType,
        title: this.generateDocumentTitle(template, request.variableData),
        clientId: request.clientId,
        recipientDetails: request.recipientDetails,
        variableData: request.variableData,
        language: request.options?.language || template.language,
        format: request.options?.format || DocumentFormat.PDF,
        priority: request.options?.priority || DocumentPriority.NORMAL,
        approvalRequired: !request.options?.autoApproval && template.legalReviewRequired,
        autoDeliveryEnabled: request.options?.autoDelivery || false,
        deliveryScheduledDate: request.options?.deliverySchedule,
        digitalSignatureRequired: request.options?.digitalSignature || false,
        watermarkApplied: request.options?.watermark || false,
        passwordProtected: request.options?.passwordProtection || false,
        expiryDate: request.options?.expiryDate,
        customFields: request.options?.customFields,
        status: DocumentStatus.DRAFT,
        createdBy: request.clientId
      });

      const savedDocument = await queryRunner.manager.save(document);

      // Generate document content
      const documentContent = await this.generateDocumentContent(template, request.variableData);
      
      // Validate compliance
      const complianceStatus = await this.validateDocumentCompliance(template, documentContent);
      
      // Generate file
      const filePath = await this.generateDocumentFile(
        savedDocument,
        documentContent,
        request.options?.format || DocumentFormat.PDF
      );

      // Update document with generated content
      savedDocument.documentContent = documentContent;
      savedDocument.complianceStatus = complianceStatus;
      savedDocument.filePath = filePath;
      savedDocument.fileSize = await this.getFileSize(filePath);
      savedDocument.fileHash = await this.calculateFileHash(filePath);
      savedDocument.generationTime = Date.now() - startTime;
      savedDocument.status = DocumentStatus.GENERATED;

      const finalDocument = await queryRunner.manager.save(savedDocument);

      // Create audit log
      await this.createAuditLog(
        queryRunner,
        finalDocument.id,
        'DOCUMENT_GENERATED',
        'Document generated successfully',
        request.clientId,
        { templateId: request.templateId, generationTime: finalDocument.generationTime }
      );

      // Setup approvals if required
      if (finalDocument.approvalRequired) {
        await this.setupDocumentApprovals(queryRunner, finalDocument);
      }

      // Setup signatures if required
      if (finalDocument.digitalSignatureRequired) {
        await this.setupDocumentSignatures(queryRunner, finalDocument, template.signatureConfiguration);
      }

      // Schedule delivery if enabled
      if (finalDocument.autoDeliveryEnabled) {
        await this.scheduleDocumentDelivery(queryRunner, finalDocument);
      }

      await queryRunner.commitTransaction();

      // Update template metrics
      await this.updateTemplateMetrics(template, true, finalDocument.generationTime);

      // Emit document generation event
      this.eventEmitter.emit('document.generated', {
        documentId: finalDocument.id,
        templateId: request.templateId,
        clientId: request.clientId,
        documentType: finalDocument.documentType
      });

      const result: IDocumentGenerationResult = {
        documentId: finalDocument.id,
        documentNumber: finalDocument.documentNumber,
        status: finalDocument.status,
        filePath: finalDocument.filePath,
        fileSize: finalDocument.fileSize,
        generationTime: finalDocument.generationTime,
        complianceStatus: finalDocument.complianceStatus,
        approvalRequired: finalDocument.approvalRequired,
        signatureRequired: finalDocument.digitalSignatureRequired,
        deliveryScheduled: finalDocument.autoDeliveryEnabled
      };

      return {
        success: true,
        data: result,
        message: 'Document generated successfully',
        timestamp: new Date()
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to generate document', error);
      
      // Update template metrics for failure
      if (request.templateId) {
        const template = await this.templateRepository.findOne({
          where: { id: request.templateId }
        });
        if (template) {
          await this.updateTemplateMetrics(template, false, 0);
        }
      }
      
      throw this.handleError(error);
    } finally {
      await queryRunner.release();
    }
  }

  async generateBulkDocuments(request: BulkDocumentGenerationRequest): Promise<IBaseResponse<{
    successful: IDocumentGenerationResult[];
    failed: Array<{ index: number; error: string }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }>> {
    try {
      this.logger.log(`Generating ${request.documents.length} documents in bulk`);

      const successful: IDocumentGenerationResult[] = [];
      const failed: Array<{ index: number; error: string }> = [];

      // Process documents in parallel with concurrency limit
      const concurrencyLimit = 5;
      const chunks = this.chunkArray(request.documents, concurrencyLimit);

      for (const chunk of chunks) {
        const promises = chunk.map(async (docData, chunkIndex) => {
          const globalIndex = chunks.indexOf(chunk) * concurrencyLimit + chunkIndex;
          
          try {
            const docRequest: DocumentGenerationRequest = {
              tenantId: request.tenantId,
              templateId: request.templateId,
              clientId: request.clientId,
              variableData: docData.variableData,
              recipientDetails: docData.recipientDetails,
              options: { ...request.globalOptions, ...docData.customOptions }
            };

            const result = await this.generateDocument(docRequest);
            successful.push(result.data);
          } catch (error) {
            failed.push({
              index: globalIndex,
              error: error.message || 'Unknown error'
            });
          }
        });

        await Promise.all(promises);
      }

      return {
        success: true,
        data: {
          successful,
          failed,
          summary: {
            total: request.documents.length,
            successful: successful.length,
            failed: failed.length
          }
        },
        message: `Bulk document generation completed. ${successful.length} successful, ${failed.length} failed.`,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to generate bulk documents', error);
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Document Management
  // ============================================================================

  async searchDocuments(request: DocumentSearchRequest): Promise<IBaseResponse<{
    documents: GeneratedDocument[];
    pagination: IPaginationResponse;
  }>> {
    try {
      this.logger.log(`Searching documents for tenant: ${request.tenantId}`);

      const queryBuilder = this.buildDocumentSearchQuery(request);

      // Apply pagination
      const page = request.pagination?.page || 1;
      const pageSize = request.pagination?.pageSize || 20;
      const skip = (page - 1) * pageSize;

      queryBuilder.skip(skip).take(pageSize);

      // Execute search
      const [documents, total] = await queryBuilder.getManyAndCount();

      return {
        success: true,
        data: {
          documents,
          pagination: {
            page,
            pageSize,
            totalItems: total,
            totalPages: Math.ceil(total / pageSize),
            hasNext: page * pageSize < total,
            hasPrevious: page > 1
          }
        },
        message: 'Document search completed successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to search documents', error);
      throw this.handleError(error);
    }
  }

  async getDocumentById(documentId: string): Promise<IBaseResponse<GeneratedDocument>> {
    try {
      const document = await this.documentRepository.findOne({
        where: { id: documentId },
        relations: ['template', 'signatures', 'approvals', 'deliveries', 'auditLogs']
      });

      if (!document) {
        throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: document,
        message: 'Document retrieved successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to get document', error);
      throw this.handleError(error);
    }
  }

  async updateDocumentStatus(
    documentId: string,
    newStatus: DocumentStatus,
    updatedBy: string,
    notes?: string
  ): Promise<IBaseResponse<GeneratedDocument>> {
    try {
      const document = await this.documentRepository.findOne({
        where: { id: documentId }
      });

      if (!document) {
        throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
      }

      const previousStatus = document.status;
      document.status = newStatus;
      document.updatedBy = updatedBy;

      const updatedDocument = await this.documentRepository.save(document);

      // Create audit log
      await this.createAuditLog(
        null,
        documentId,
        'STATUS_CHANGED',
        `Status changed from ${previousStatus} to ${newStatus}${notes ? ': ' + notes : ''}`,
        updatedBy,
        { previousStatus, newStatus }
      );

      // Emit status change event
      this.eventEmitter.emit('document.status_changed', {
        documentId,
        previousStatus,
        newStatus,
        updatedBy
      });

      return {
        success: true,
        data: updatedDocument,
        message: 'Document status updated successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to update document status', error);
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Signature Management
  // ============================================================================

  async requestSignature(request: ISignatureRequest): Promise<IBaseResponse<DocumentSignature>> {
    try {
      this.logger.log(`Requesting signature for document: ${request.documentId}`);

      const document = await this.documentRepository.findOne({
        where: { id: request.documentId }
      });

      if (!document) {
        throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
      }

      const signature = this.signatureRepository.create({
        documentId: request.documentId,
        signatureType: request.signatureType,
        signerId: request.signerId,
        signerName: request.signerName,
        signerEmail: request.signerEmail,
        signerRole: request.signerRole,
        signatureOrder: request.signatureOrder || 1,
        isRequired: request.isRequired !== false,
        expiryDate: request.expiryDate
      });

      const savedSignature = await this.signatureRepository.save(signature);

      // Send signature request notification
      await this.sendSignatureRequestNotification(savedSignature);

      // Create audit log
      await this.createAuditLog(
        null,
        request.documentId,
        'SIGNATURE_REQUESTED',
        `Signature requested from ${request.signerName}`,
        request.requestedBy,
        { signatureId: savedSignature.id, signerEmail: request.signerEmail }
      );

      return {
        success: true,
        data: savedSignature,
        message: 'Signature request sent successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to request signature', error);
      throw this.handleError(error);
    }
  }

  async signDocument(
    signatureId: string,
    signatureData: string,
    signerInfo: {
      ipAddress?: string;
      userAgent?: string;
      location?: string;
      reason?: string;
    }
  ): Promise<IBaseResponse<DocumentSignature>> {
    try {
      const signature = await this.signatureRepository.findOne({
        where: { id: signatureId },
        relations: ['document']
      });

      if (!signature) {
        throw new HttpException('Signature request not found', HttpStatus.NOT_FOUND);
      }

      if (!signature.canSign()) {
        throw new HttpException('Signature request is not valid for signing', HttpStatus.BAD_REQUEST);
      }

      // Apply signature
      signature.sign(signatureData, signerInfo.location, signerInfo.reason);
      signature.ipAddress = signerInfo.ipAddress;
      signature.userAgent = signerInfo.userAgent;

      const signedSignature = await this.signatureRepository.save(signature);

      // Check if all required signatures are completed
      const allSignatures = await this.signatureRepository.find({
        where: { documentId: signature.documentId }
      });

      const allRequiredSigned = allSignatures
        .filter(s => s.isRequired)
        .every(s => s.isCompleted());

      if (allRequiredSigned) {
        // Update document status
        await this.updateDocumentStatus(
          signature.documentId,
          DocumentStatus.SIGNED,
          signature.signerId,
          'All required signatures completed'
        );
      }

      // Create audit log
      await this.createAuditLog(
        null,
        signature.documentId,
        'DOCUMENT_SIGNED',
        `Document signed by ${signature.signerName}`,
        signature.signerId,
        { signatureId: signature.id, signatureDate: signature.signatureDate }
      );

      return {
        success: true,
        data: signedSignature,
        message: 'Document signed successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to sign document', error);
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Approval Management
  // ============================================================================

  async requestApproval(request: IApprovalRequest): Promise<IBaseResponse<DocumentApproval>> {
    try {
      const approval = this.approvalRepository.create({
        documentId: request.documentId,
        approverId: request.approverId,
        approverName: request.approverName,
        approverRole: request.approverRole,
        approvalLevel: request.approvalLevel || 1,
        isRequired: request.isRequired !== false
      });

      const savedApproval = await this.approvalRepository.save(approval);

      // Send approval request notification
      await this.sendApprovalRequestNotification(savedApproval);

      return {
        success: true,
        data: savedApproval,
        message: 'Approval request sent successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to request approval', error);
      throw this.handleError(error);
    }
  }

  async approveDocument(
    approvalId: string,
    approverId: string,
    comments?: string
  ): Promise<IBaseResponse<DocumentApproval>> {
    try {
      const approval = await this.approvalRepository.findOne({
        where: { id: approvalId }
      });

      if (!approval) {
        throw new HttpException('Approval request not found', HttpStatus.NOT_FOUND);
      }

      approval.approvalStatus = ApprovalStatus.APPROVED;
      approval.approvalDate = new Date();
      approval.comments = comments;

      const approvedApproval = await this.approvalRepository.save(approval);

      // Check if all required approvals are completed
      const allApprovals = await this.approvalRepository.find({
        where: { documentId: approval.documentId }
      });

      const allRequiredApproved = allApprovals
        .filter(a => a.isRequired)
        .every(a => a.approvalStatus === ApprovalStatus.APPROVED);

      if (allRequiredApproved) {
        // Update document status
        await this.updateDocumentStatus(
          approval.documentId,
          DocumentStatus.APPROVED,
          approverId,
          'All required approvals completed'
        );
      }

      return {
        success: true,
        data: approvedApproval,
        message: 'Document approved successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to approve document', error);
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Delivery Management
  // ============================================================================

  async deliverDocument(request: IDeliveryRequest): Promise<IBaseResponse<DocumentDelivery>> {
    try {
      const document = await this.documentRepository.findOne({
        where: { id: request.documentId }
      });

      if (!document) {
        throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
      }

      if (!document.canBeDelivered()) {
        throw new HttpException('Document is not ready for delivery', HttpStatus.BAD_REQUEST);
      }

      const delivery = this.deliveryRepository.create({
        documentId: request.documentId,
        deliveryMethod: request.deliveryMethod,
        recipientEmail: request.recipientEmail,
        recipientPhone: request.recipientPhone,
        recipientAddress: request.recipientAddress,
        deliveryStatus: DeliveryStatus.PENDING
      });

      const savedDelivery = await this.deliveryRepository.save(delivery);

      // Initiate delivery process
      await this.initiateDocumentDelivery(savedDelivery);

      return {
        success: true,
        data: savedDelivery,
        message: 'Document delivery initiated successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to deliver document', error);
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Analytics and Reporting
  // ============================================================================

  async getDocumentAnalytics(request: DocumentAnalyticsRequest): Promise<IBaseResponse<DocumentAnalyticsResponse>> {
    try {
      this.logger.log(`Generating document analytics for tenant: ${request.tenantId}`);

      const [summary, trends, topTemplates, complianceMetrics] = await Promise.all([
        this.calculateDocumentSummary(request),
        this.calculateDocumentTrends(request),
        this.getTopTemplates(request),
        this.calculateComplianceMetrics(request)
      ]);

      const analytics: DocumentAnalyticsResponse = {
        summary,
        trends,
        topTemplates,
        complianceMetrics
      };

      return {
        success: true,
        data: analytics,
        message: 'Document analytics generated successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to generate document analytics', error);
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Periodic Tasks and Maintenance
  // ============================================================================

  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledDeliveries(): Promise<void> {
    try {
      this.logger.log('Processing scheduled document deliveries');

      const scheduledDocuments = await this.documentRepository.find({
        where: {
          autoDeliveryEnabled: true,
          status: DocumentStatus.APPROVED,
          deliveryScheduledDate: {
            lte: new Date()
          } as any
        }
      });

      for (const document of scheduledDocuments) {
        try {
          await this.deliverDocument({
            documentId: document.id,
            deliveryMethod: DeliveryMethod.EMAIL,
            recipientEmail: document.recipientDetails.email
          });
        } catch (error) {
          this.logger.error(`Failed to deliver scheduled document ${document.id}`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error processing scheduled deliveries', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredDocuments(): Promise<void> {
    try {
      this.logger.log('Cleaning up expired documents');

      const expiredDocuments = await this.documentRepository.find({
        where: {
          expiryDate: {
            lt: new Date()
          } as any,
          isActive: true
        }
      });

      for (const document of expiredDocuments) {
        document.isActive = false;
        await this.documentRepository.save(document);
        
        // Create audit log
        await this.createAuditLog(
          null,
          document.id,
          'DOCUMENT_EXPIRED',
          'Document expired and deactivated',
          'system'
        );
      }

      this.logger.log(`Deactivated ${expiredDocuments.length} expired documents`);
    } catch (error) {
      this.logger.error('Error cleaning up expired documents', error);
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async sendSignatureReminders(): Promise<void> {
    try {
      this.logger.log('Sending signature reminders');

      const pendingSignatures = await this.signatureRepository.find({
        where: {
          status: SignatureStatus.PENDING
        }
      });

      for (const signature of pendingSignatures) {
        if (signature.needsReminder()) {
          await this.sendSignatureReminderNotification(signature);
          signature.sendReminder();
          await this.signatureRepository.save(signature);
        }
      }
    } catch (error) {
      this.logger.error('Error sending signature reminders', error);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async getTemplate(templateId: string): Promise<DocumentTemplate> {
    // Check cache first
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }

    const template = await this.templateRepository.findOne({
      where: { id: templateId }
    });

    if (!template) {
      throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
    }

    // Cache template
    this.templateCache.set(templateId, template);
    
    return template;
  }

  private async validateTemplateData(templateData: Partial<IDocumentTemplate>): Promise<void> {
    if (!templateData.name) {
      throw new HttpException('Template name is required', HttpStatus.BAD_REQUEST);
    }

    if (!templateData.templateCategory) {
      throw new HttpException('Template category is required', HttpStatus.BAD_REQUEST);
    }

    if (!templateData.documentType) {
      throw new HttpException('Document type is required', HttpStatus.BAD_REQUEST);
    }

    if (!templateData.templateContent) {
      throw new HttpException('Template content is required', HttpStatus.BAD_REQUEST);
    }
  }

  private extractVariablesFromTemplate(templateContent: any): IDocumentVariable[] {
    const variables: IDocumentVariable[] = [];
    
    // Extract Handlebars variables from template content
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const templateString = JSON.stringify(templateContent);
    let match;

    const foundVariables = new Set<string>();

    while ((match = variableRegex.exec(templateString)) !== null) {
      const variableName = match[1].trim();
      
      // Skip Handlebars helpers
      if (variableName.includes(' ') || variableName.startsWith('#') || variableName.startsWith('/')) {
        continue;
      }

      if (!foundVariables.has(variableName)) {
        foundVariables.add(variableName);
        
        variables.push({
          name: variableName,
          type: this.inferVariableType(variableName),
          required: true,
          description: `Variable: ${variableName}`,
          defaultValue: null,
          validation: null
        });
      }
    }

    return variables;
  }

  private inferVariableType(variableName: string): string {
    const name = variableName.toLowerCase();
    
    if (name.includes('email')) return 'email';
    if (name.includes('phone')) return 'phone';
    if (name.includes('date')) return 'date';
    if (name.includes('amount') || name.includes('price') || name.includes('cost')) return 'number';
    if (name.includes('url') || name.includes('link')) return 'url';
    
    return 'text';
  }

  private getDefaultComplianceRequirements(documentType: DocumentType): IComplianceValidation[] {
    const requirements: IComplianceValidation[] = [
      {
        requirement: 'Legal Format Compliance',
        status: ComplianceStatus.PENDING,
        description: 'Document must follow legal formatting requirements',
        validationRules: []
      },
      {
        requirement: 'Content Validation',
        status: ComplianceStatus.PENDING,
        description: 'Document content must be legally valid',
        validationRules: []
      }
    ];

    // Add document-type specific requirements
    switch (documentType) {
      case DocumentType.DEMAND_NOTICE:
        requirements.push({
          requirement: 'MSMED Act Compliance',
          status: ComplianceStatus.PENDING,
          description: 'Must comply with MSMED Act 2006 requirements',
          validationRules: []
        });
        break;
      case DocumentType.LEGAL_NOTICE:
        requirements.push({
          requirement: 'Legal Notice Format',
          status: ComplianceStatus.PENDING,
          description: 'Must follow standard legal notice format',
          validationRules: []
        });
        break;
    }

    return requirements;
  }

  private async loadDefaultTemplateContent(templateCode: string): Promise<any> {
    // Load default template content from files or database
    // This is a simplified implementation
    return {
      header: {
        title: `{{documentTitle}}`,
        date: `{{currentDate}}`,
        reference: `{{referenceNumber}}`
      },
      body: {
        content: `This is a default template for ${templateCode}`
      },
      footer: {
        signature: `{{signerName}}`,
        designation: `{{signerDesignation}}`
      }
    };
  }

  private buildTemplateSearchQuery(request: TemplateSearchRequest): SelectQueryBuilder<DocumentTemplate> {
    const queryBuilder = this.templateRepository.createQueryBuilder('template')
      .where('template.tenantId = :tenantId', { tenantId: request.tenantId })
      .andWhere('template.isActive = :isActive', { isActive: true });

    if (request.category) {
      queryBuilder.andWhere('template.templateCategory = :category', { category: request.category });
    }

    if (request.documentType) {
      queryBuilder.andWhere('template.documentType = :documentType', { documentType: request.documentType });
    }

    if (request.language) {
      queryBuilder.andWhere('template.language = :language', { language: request.language });
    }

    if (request.jurisdiction && request.jurisdiction.length > 0) {
      queryBuilder.andWhere('template.jurisdiction && :jurisdiction', { jurisdiction: request.jurisdiction });
    }

    if (request.status) {
      queryBuilder.andWhere('template.status = :status', { status: request.status });
    }

    if (request.searchTerm) {
      queryBuilder.andWhere(
        '(template.name ILIKE :searchTerm OR template.description ILIKE :searchTerm)',
        { searchTerm: `%${request.searchTerm}%` }
      );
    }

    if (request.tags && request.tags.length > 0) {
      queryBuilder.andWhere('template.tags && :tags', { tags: request.tags });
    }

    // Default sorting
    queryBuilder.orderBy('template.usageCount', 'DESC')
      .addOrderBy('template.successRate', 'DESC')
      .addOrderBy('template.createdAt', 'DESC');

    return queryBuilder;
  }

  private buildDocumentSearchQuery(request: DocumentSearchRequest): SelectQueryBuilder<GeneratedDocument> {
    const queryBuilder = this.documentRepository.createQueryBuilder('document')
      .leftJoinAndSelect('document.template', 'template')
      .where('document.tenantId = :tenantId', { tenantId: request.tenantId })
      .andWhere('document.isActive = :isActive', { isActive: true });

    if (request.clientId) {
      queryBuilder.andWhere('document.clientId = :clientId', { clientId: request.clientId });
    }

    if (request.documentType) {
      queryBuilder.andWhere('document.documentType = :documentType', { documentType: request.documentType });
    }

    if (request.status) {
      queryBuilder.andWhere('document.status = :status', { status: request.status });
    }

    if (request.dateRange) {
      queryBuilder.andWhere('document.createdAt BETWEEN :startDate AND :endDate', {
        startDate: request.dateRange.startDate,
        endDate: request.dateRange.endDate
      });
    }

    if (request.searchTerm) {
      queryBuilder.andWhere(
        '(document.title ILIKE :searchTerm OR document.documentNumber ILIKE :searchTerm)',
        { searchTerm: `%${request.searchTerm}%` }
      );
    }

    if (request.tags && request.tags.length > 0) {
      queryBuilder.andWhere('document.tags && :tags', { tags: request.tags });
    }

    queryBuilder.orderBy('document.createdAt', 'DESC');

    return queryBuilder;
  }

  private async performTemplateValidation(template: DocumentTemplate): Promise<ITemplateValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate template structure
    if (!template.templateContent) {
      errors.push('Template content is missing');
    }

    // Validate variables
    if (!template.variables || template.variables.length === 0) {
      warnings.push('No variables defined in template');
    }

    // Validate compliance requirements
    if (!template.complianceRequirements || template.complianceRequirements.length === 0) {
      warnings.push('No compliance requirements defined');
    }

    // Check if template is expired
    if (template.isExpired()) {
      errors.push('Template has expired');
    }

    // Check if template needs review
    if (template.needsReview()) {
      warnings.push('Template needs legal review');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5)),
      recommendations: this.generateTemplateRecommendations(template, errors, warnings)
    };
  }

  private generateTemplateRecommendations(
    template: DocumentTemplate,
    errors: string[],
    warnings: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (template.usageCount === 0) {
      recommendations.push('Consider testing this template with sample data');
    }

    if (template.successRate < 90) {
      recommendations.push('Review template for common generation failures');
    }

    if (template.averageGenerationTime > 5000) {
      recommendations.push('Optimize template for faster generation');
    }

    if (warnings.includes('Template needs legal review')) {
      recommendations.push('Schedule legal review to ensure compliance');
    }

    return recommendations;
  }

  private generateDocumentTitle(template: DocumentTemplate, variableData: Record<string, any>): string {
    const baseTitle = template.name;
    
    // Try to create a more specific title using variable data
    if (variableData.recipientName) {
      return `${baseTitle} - ${variableData.recipientName}`;
    }
    
    if (variableData.companyName) {
      return `${baseTitle} - ${variableData.companyName}`;
    }
    
    return baseTitle;
  }

  private async generateDocumentContent(
    template: DocumentTemplate,
    variableData: Record<string, any>
  ): Promise<any> {
    try {
      // Compile template with Handlebars
      const templateString = JSON.stringify(template.templateContent);
      const compiledTemplate = Handlebars.compile(templateString);
      
      // Add system variables
      const contextData = {
        ...variableData,
        currentDate: new Date(),
        currentYear: new Date().getFullYear(),
        documentNumber: `DOC-${Date.now()}`,
        generationDate: new Date().toISOString()
      };
      
      const renderedContent = compiledTemplate(contextData);
      return JSON.parse(renderedContent);
    } catch (error) {
      this.logger.error('Failed to generate document content', error);
      throw new HttpException('Template compilation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async validateDocumentCompliance(
    template: DocumentTemplate,
    documentContent: any
  ): Promise<IComplianceValidation[]> {
    const complianceStatus: IComplianceValidation[] = [];

    for (const requirement of template.complianceRequirements) {
      const validation: IComplianceValidation = {
        requirement: requirement.requirement,
        status: ComplianceStatus.PENDING,
        description: requirement.description,
        validationRules: requirement.validationRules || []
      };

      // Perform compliance validation
      try {
        const isCompliant = await this.checkComplianceRequirement(requirement, documentContent);
        validation.status = isCompliant ? ComplianceStatus.COMPLIANT : ComplianceStatus.NON_COMPLIANT;
        
        if (!isCompliant) {
          validation.issues = [`Failed compliance check: ${requirement.requirement}`];
        }
      } catch (error) {
        validation.status = ComplianceStatus.ERROR;
        validation.issues = [`Compliance check error: ${error.message}`];
      }

      complianceStatus.push(validation);
    }

    return complianceStatus;
  }

  private async checkComplianceRequirement(
    requirement: IComplianceValidation,
    documentContent: any
  ): Promise<boolean> {
    // Implement specific compliance checks based on requirement type
    // This is a simplified implementation
    
    switch (requirement.requirement) {
      case 'Legal Format Compliance':
        return this.validateLegalFormat(documentContent);
      case 'Content Validation':
        return this.validateContent(documentContent);
      case 'MSMED Act Compliance':
        return this.validateMSMEDCompliance(documentContent);
      default:
        return true; // Default to compliant for unknown requirements
    }
  }

  private validateLegalFormat(documentContent: any): boolean {
    // Check if document has required sections
    return !!(documentContent.header && documentContent.body && documentContent.footer);
  }

  private validateContent(documentContent: any): boolean {
    // Check if content is not empty
    return !!(documentContent.body && documentContent.body.content);
  }

  private validateMSMEDCompliance(documentContent: any): boolean {
    // Check MSMED Act specific requirements
    // This would include checking for required clauses, payment terms, etc.
    return true; // Simplified implementation
  }

  private async generateDocumentFile(
    document: GeneratedDocument,
    content: any,
    format: DocumentFormat
  ): Promise<string> {
    const fileName = `${document.documentNumber}${document.getFileExtension()}`;
    const filePath = path.join(
      this.configService.get('DOCUMENT_STORAGE_PATH', '/tmp/documents'),
      document.tenantId,
      fileName
    );

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    switch (format) {
      case DocumentFormat.PDF:
        await this.generatePDFFile(content, filePath);
        break;
      case DocumentFormat.DOCX:
        await this.generateDOCXFile(content, filePath);
        break;
      case DocumentFormat.HTML:
        await this.generateHTMLFile(content, filePath);
        break;
      case DocumentFormat.TXT:
        await this.generateTXTFile(content, filePath);
        break;
      default:
        throw new HttpException(`Unsupported format: ${format}`, HttpStatus.BAD_REQUEST);
    }

    return filePath;
  }

  private async generatePDFFile(content: any, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const stream = require('fs').createWriteStream(filePath);
        
        doc.pipe(stream);
        
        // Add content to PDF
        if (content.header) {
          doc.fontSize(16).text(content.header.title || '', { align: 'center' });
          doc.moveDown();
        }
        
        if (content.body) {
          doc.fontSize(12).text(content.body.content || '', { align: 'left' });
          doc.moveDown();
        }
        
        if (content.footer) {
          doc.text(content.footer.signature || '', { align: 'right' });
        }
        
        doc.end();
        
        stream.on('finish', resolve);
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  private async generateDOCXFile(content: any, filePath: string): Promise<void> {
    // Implement DOCX generation
    // This would use a library like docx or officegen
    throw new HttpException('DOCX generation not implemented', HttpStatus.NOT_IMPLEMENTED);
  }

  private async generateHTMLFile(content: any, filePath: string): Promise<void> {
    const htmlContent = this.convertContentToHTML(content);
    await fs.writeFile(filePath, htmlContent, 'utf8');
  }

  private async generateTXTFile(content: any, filePath: string): Promise<void> {
    const textContent = this.convertContentToText(content);
    await fs.writeFile(filePath, textContent, 'utf8');
  }

  private convertContentToHTML(content: any): string {
    let html = '<!DOCTYPE html><html><head><title>Document</title></head><body>';
    
    if (content.header) {
      html += `<h1>${content.header.title || ''}</h1>`;
      html += `<p>Date: ${content.header.date || ''}</p>`;
    }
    
    if (content.body) {
      html += `<div>${content.body.content || ''}</div>`;
    }
    
    if (content.footer) {
      html += `<p><strong>${content.footer.signature || ''}</strong></p>`;
    }
    
    html += '</body></html>';
    return html;
  }

  private convertContentToText(content: any): string {
    let text = '';
    
    if (content.header) {
      text += `${content.header.title || ''}\n`;
      text += `Date: ${content.header.date || ''}\n\n`;
    }
    
    if (content.body) {
      text += `${content.body.content || ''}\n\n`;
    }
    
    if (content.footer) {
      text += `${content.footer.signature || ''}\n`;
    }
    
    return text;
  }

  private async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      return '';
    }
  }

  private async updateTemplateMetrics(
    template: DocumentTemplate,
    successful: boolean,
    generationTime: number
  ): Promise<void> {
    template.incrementUsage();
    template.updateSuccessRate(successful);
    
    if (successful && generationTime > 0) {
      template.updateAverageGenerationTime(generationTime);
    }
    
    await this.templateRepository.save(template);
  }

  private async createTemplateVersionHistory(
    queryRunner: QueryRunner | null,
    templateId: string,
    version: string,
    changesDescription: string,
    templateContent: any,
    createdBy: string
  ): Promise<void> {
    const versionHistory = {
      templateId,
      version,
      changesDescription,
      templateContent,
      createdBy
    };

    if (queryRunner) {
      await queryRunner.manager.save(TemplateVersionHistory, versionHistory);
    } else {
      await this.templateVersionRepository.save(versionHistory);
    }
  }

  private async createAuditLog(
    queryRunner: QueryRunner | null,
    documentId: string,
    actionType: string,
    actionDescription: string,
    userId?: string,
    actionData?: Record<string, any>
  ): Promise<void> {
    const auditLog = {
      documentId,
      actionType,
      actionDescription,
      userId,
      actionData
    };

    if (queryRunner) {
      await queryRunner.manager.save(DocumentAuditLog, auditLog);
    } else {
      await this.auditRepository.save(auditLog);
    }
  }

  private async setupDocumentApprovals(
    queryRunner: QueryRunner,
    document: GeneratedDocument
  ): Promise<void> {
    // Setup default approval workflow
    const approval = queryRunner.manager.create(DocumentApproval, {
      documentId: document.id,
      approverId: document.createdBy, // Default to document creator
      approverName: 'Legal Team',
      approverRole: 'Legal Reviewer',
      approvalLevel: 1,
      isRequired: true
    });

    await queryRunner.manager.save(approval);
  }

  private async setupDocumentSignatures(
    queryRunner: QueryRunner,
    document: GeneratedDocument,
    signatureConfig?: any
  ): Promise<void> {
    if (!signatureConfig) return;

    // Setup signatures based on configuration
    for (const signerConfig of signatureConfig.signers || []) {
      const signature = queryRunner.manager.create(DocumentSignature, {
        documentId: document.id,
        signatureType: signerConfig.signatureType || SignatureType.DIGITAL,
        signerId: signerConfig.signerId,
        signerName: signerConfig.signerName,
        signerEmail: signerConfig.signerEmail,
        signerRole: signerConfig.signerRole,
        signatureOrder: signerConfig.order || 1,
        isRequired: signerConfig.required !== false
      });

      await queryRunner.manager.save(signature);
    }
  }

  private async scheduleDocumentDelivery(
    queryRunner: QueryRunner,
    document: GeneratedDocument
  ): Promise<void> {
    const delivery = queryRunner.manager.create(DocumentDelivery, {
      documentId: document.id,
      deliveryMethod: DeliveryMethod.EMAIL,
      recipientEmail: document.recipientDetails.email,
      deliveryStatus: DeliveryStatus.SCHEDULED
    });

    await queryRunner.manager.save(delivery);
  }

  private async sendSignatureRequestNotification(signature: DocumentSignature): Promise<void> {
    const notification: INotificationRequest = {
      type: NotificationType.EMAIL,
      priority: NotificationPriority.HIGH,
      recipients: [signature.signerEmail],
      subject: 'Document Signature Required',
      content: `Please sign the document: ${signature.document?.title}`,
      templateData: {
        signerName: signature.signerName,
        documentTitle: signature.document?.title,
        signatureUrl: `${this.configService.get('APP_URL')}/sign/${signature.id}`
      }
    };

    this.eventEmitter.emit('notification.send', { notification });
  }

  private async sendSignatureReminderNotification(signature: DocumentSignature): Promise<void> {
    const notification: INotificationRequest = {
      type: NotificationType.EMAIL,
      priority: NotificationPriority.MEDIUM,
      recipients: [signature.signerEmail],
      subject: 'Reminder: Document Signature Required',
      content: `This is a reminder to sign the document: ${signature.document?.title}`,
      templateData: {
        signerName: signature.signerName,
        documentTitle: signature.document?.title,
        signatureUrl: `${this.configService.get('APP_URL')}/sign/${signature.id}`
      }
    };

    this.eventEmitter.emit('notification.send', { notification });
  }

  private async sendApprovalRequestNotification(approval: DocumentApproval): Promise<void> {
    const notification: INotificationRequest = {
      type: NotificationType.EMAIL,
      priority: NotificationPriority.HIGH,
      recipients: [approval.approverId], // This should be an email address
      subject: 'Document Approval Required',
      content: `Please review and approve the document: ${approval.document?.title}`,
      templateData: {
        approverName: approval.approverName,
        documentTitle: approval.document?.title,
        approvalUrl: `${this.configService.get('APP_URL')}/approve/${approval.id}`
      }
    };

    this.eventEmitter.emit('notification.send', { notification });
  }

  private async initiateDocumentDelivery(delivery: DocumentDelivery): Promise<void> {
    // Emit delivery event for background processing
    this.eventEmitter.emit('document.delivery_initiated', {
      deliveryId: delivery.id,
      deliveryMethod: delivery.deliveryMethod,
      documentId: delivery.documentId
    });
  }

  private async calculateDocumentSummary(request: DocumentAnalyticsRequest): Promise<any> {
    const queryBuilder = this.documentRepository.createQueryBuilder('document')
      .where('document.tenantId = :tenantId', { tenantId: request.tenantId })
      .andWhere('document.createdAt BETWEEN :startDate AND :endDate', {
        startDate: request.period.startDate,
        endDate: request.period.endDate
      });

    // Apply filters
    if (request.filters?.documentType) {
      queryBuilder.andWhere('document.documentType IN (:...documentTypes)', {
        documentTypes: request.filters.documentType
      });
    }

    if (request.filters?.clientId) {
      queryBuilder.andWhere('document.clientId IN (:...clientIds)', {
        clientIds: request.filters.clientId
      });
    }

    if (request.filters?.status) {
      queryBuilder.andWhere('document.status IN (:...statuses)', {
        statuses: request.filters.status
      });
    }

    const documents = await queryBuilder.getMany();

    const totalDocuments = documents.length;
    const generatedDocuments = documents.filter(d => d.status !== DocumentStatus.DRAFT).length;
    const approvedDocuments = documents.filter(d => d.isApproved()).length;
    const deliveredDocuments = documents.filter(d => d.isDelivered()).length;
    
    const averageGenerationTime = documents.length > 0 ?
      documents.reduce((sum, d) => sum + d.generationTime, 0) / documents.length : 0;
    
    const successRate = totalDocuments > 0 ? (generatedDocuments / totalDocuments) * 100 : 0;
    
    const compliantDocuments = documents.filter(d => d.isCompliant()).length;
    const complianceRate = totalDocuments > 0 ? (compliantDocuments / totalDocuments) * 100 : 0;

    return {
      totalDocuments,
      generatedDocuments,
      approvedDocuments,
      deliveredDocuments,
      averageGenerationTime: Math.round(averageGenerationTime),
      successRate: Math.round(successRate * 100) / 100,
      complianceRate: Math.round(complianceRate * 100) / 100
    };
  }

  private async calculateDocumentTrends(request: DocumentAnalyticsRequest): Promise<any> {
    // Calculate trends based on groupBy parameter
    // This is a simplified implementation
    return {
      documentGeneration: [],
      approvalRate: [],
      deliverySuccess: []
    };
  }

  private async getTopTemplates(request: DocumentAnalyticsRequest): Promise<any> {
    const templates = await this.templateRepository.find({
      where: { tenantId: request.tenantId },
      order: { usageCount: 'DESC' },
      take: 10
    });

    return templates.map(template => ({
      templateId: template.id,
      templateName: template.name,
      usageCount: template.usageCount,
      successRate: template.successRate
    }));
  }

  private async calculateComplianceMetrics(request: DocumentAnalyticsRequest): Promise<any> {
    const documents = await this.documentRepository.find({
      where: {
        tenantId: request.tenantId,
        createdAt: {
          gte: request.period.startDate,
          lte: request.period.endDate
        } as any
      }
    });

    const compliantDocuments = documents.filter(d => d.isCompliant()).length;
    const nonCompliantDocuments = documents.length - compliantDocuments;

    // Analyze common compliance issues
    const issueMap = new Map<string, number>();
    
    for (const document of documents) {
      const issues = document.getComplianceIssues();
      for (const issue of issues) {
        issueMap.set(issue, (issueMap.get(issue) || 0) + 1);
      }
    }

    const commonIssues = Array.from(issueMap.entries())
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      compliantDocuments,
      nonCompliantDocuments,
      commonIssues
    };
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private handleError(error: any): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    this.logger.error('Unhandled error in Document Generation Service', error);
    
    return new HttpException(
      'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

