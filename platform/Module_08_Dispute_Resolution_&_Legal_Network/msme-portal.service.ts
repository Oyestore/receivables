/**
 * MSME Portal Service
 * Module 8 Enhancement - Legal Compliance Automation
 * 
 * This service handles all interactions with the MSME Samadhaan portal
 * including authentication, complaint filing, status tracking, and document management.
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, retry, catchError, timeout } from 'rxjs';
import { AxiosResponse, AxiosRequestConfig } from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

import {
  MSMEPortalConnection,
  MSMEComplaint,
  MSMEComplaintDocument,
  MSMEComplaintStatusHistory
} from '../entities/msme-portal.entity';

import {
  MSMEPortalEnvironment,
  MSMEComplaintStatus,
  MSMEComplaintType,
  MSMEPortalDocumentType,
  MSMEPortalAuthStatus,
  CurrencyCode,
  APIResponseStatus,
  NotificationType,
  NotificationPriority
} from '@shared/enums/legal-compliance.enum';

import {
  IMSMEPortalConfig,
  IMSMEPortalAuth,
  IMSMEComplaintData,
  IMSMEComplaintReference,
  IMSMEComplaintStatusUpdate,
  IDocumentReference,
  IBaseResponse,
  IErrorResponse,
  IPaginationRequest,
  IPaginationResponse,
  INotificationRequest,
  IAuditRecord
} from '@shared/interfaces/legal-compliance.interface';

// ============================================================================
// DTOs and Request/Response Interfaces
// ============================================================================

export interface MSMEPortalAuthRequest {
  clientId: string;
  clientSecret: string;
  grantType: 'client_credentials';
  scope?: string[];
}

export interface MSMEPortalAuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
  issued_at: number;
}

export interface ComplaintSubmissionRequest {
  tenantId: string;
  complaintData: IMSMEComplaintData;
  documents?: Express.Multer.File[];
  submittedBy: string;
}

export interface ComplaintSubmissionResponse {
  success: boolean;
  referenceNumber: string;
  submissionDate: Date;
  trackingUrl: string;
  expectedResponseDate?: Date;
  nextSteps: string[];
  portalResponse?: any;
}

export interface DocumentUploadRequest {
  complaintId: string;
  documentType: MSMEPortalDocumentType;
  file: Express.Multer.File;
  description?: string;
  isRequired: boolean;
}

export interface DocumentUploadResponse {
  success: boolean;
  documentId: string;
  portalDocumentId?: string;
  uploadStatus: string;
  message: string;
}

export interface StatusTrackingRequest {
  tenantId: string;
  referenceNumbers?: string[];
  status?: MSMEComplaintStatus;
  fromDate?: Date;
  toDate?: Date;
  pagination?: IPaginationRequest;
}

export interface StatusTrackingResponse {
  complaints: MSMEComplaint[];
  pagination: IPaginationResponse;
  summary: {
    total: number;
    byStatus: Record<MSMEComplaintStatus, number>;
    pendingActions: number;
    overdueComplaints: number;
  };
}

// ============================================================================
// MSME Portal Service Implementation
// ============================================================================

@Injectable()
export class MSMEPortalService {
  private readonly logger = new Logger(MSMEPortalService.name);
  private readonly authCache = new Map<string, IMSMEPortalAuth>();
  private readonly rateLimitCache = new Map<string, { count: number; resetTime: number }>();

  constructor(
    @InjectRepository(MSMEPortalConnection)
    private readonly connectionRepository: Repository<MSMEPortalConnection>,
    
    @InjectRepository(MSMEComplaint)
    private readonly complaintRepository: Repository<MSMEComplaint>,
    
    @InjectRepository(MSMEComplaintDocument)
    private readonly documentRepository: Repository<MSMEComplaintDocument>,
    
    @InjectRepository(MSMEComplaintStatusHistory)
    private readonly statusHistoryRepository: Repository<MSMEComplaintStatusHistory>,
    
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    this.initializeService();
  }

  // ============================================================================
  // Service Initialization
  // ============================================================================

  private async initializeService(): Promise<void> {
    try {
      this.logger.log('Initializing MSME Portal Service...');
      
      // Validate configuration
      await this.validateConfiguration();
      
      // Initialize rate limiting
      this.initializeRateLimiting();
      
      // Setup periodic tasks
      this.setupPeriodicTasks();
      
      this.logger.log('MSME Portal Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize MSME Portal Service', error);
      throw error;
    }
  }

  private async validateConfiguration(): Promise<void> {
    const requiredConfigs = [
      'MSME_PORTAL_BASE_URL',
      'MSME_PORTAL_CLIENT_ID',
      'MSME_PORTAL_CLIENT_SECRET'
    ];

    for (const config of requiredConfigs) {
      if (!this.configService.get(config)) {
        throw new Error(`Missing required configuration: ${config}`);
      }
    }
  }

  private initializeRateLimiting(): void {
    // Clear rate limit cache every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.rateLimitCache.entries()) {
        if (now > value.resetTime) {
          this.rateLimitCache.delete(key);
        }
      }
    }, 60000);
  }

  private setupPeriodicTasks(): void {
    // Check for status updates every 30 minutes
    setInterval(async () => {
      try {
        await this.checkPendingComplaintUpdates();
      } catch (error) {
        this.logger.error('Error in periodic status check', error);
      }
    }, 30 * 60 * 1000);

    // Clean up expired auth tokens every hour
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, 60 * 60 * 1000);
  }

  // ============================================================================
  // Portal Connection Management
  // ============================================================================

  async createPortalConnection(
    tenantId: string,
    config: IMSMEPortalConfig,
    createdBy: string
  ): Promise<MSMEPortalConnection> {
    try {
      this.logger.log(`Creating MSME portal connection for tenant: ${tenantId}`);

      // Check if connection already exists
      const existingConnection = await this.connectionRepository.findOne({
        where: { tenantId, environment: config.environment }
      });

      if (existingConnection) {
        throw new HttpException(
          'Portal connection already exists for this tenant and environment',
          HttpStatus.CONFLICT
        );
      }

      // Create new connection
      const connection = this.connectionRepository.create({
        tenantId,
        clientId: config.clientId,
        clientSecret: await this.encryptSecret(config.clientSecret),
        environment: config.environment,
        baseUrl: config.baseUrl,
        certificatePath: config.certificatePath,
        timeout: config.timeout,
        retryAttempts: config.retryAttempts,
        retryDelay: config.retryDelay,
        rateLimitPerMinute: config.rateLimitPerMinute,
        createdBy
      });

      const savedConnection = await this.connectionRepository.save(connection);

      // Test the connection
      try {
        await this.authenticatePortal(savedConnection);
        this.logger.log(`Portal connection created and tested successfully: ${savedConnection.id}`);
      } catch (authError) {
        this.logger.warn(`Portal connection created but authentication failed: ${authError.message}`);
        savedConnection.authStatus = MSMEPortalAuthStatus.FAILED;
        await this.connectionRepository.save(savedConnection);
      }

      return savedConnection;
    } catch (error) {
      this.logger.error('Failed to create portal connection', error);
      throw this.handleError(error);
    }
  }

  async getPortalConnection(tenantId: string, environment?: MSMEPortalEnvironment): Promise<MSMEPortalConnection> {
    try {
      const whereClause: any = { tenantId, isActive: true };
      if (environment) {
        whereClause.environment = environment;
      }

      const connection = await this.connectionRepository.findOne({
        where: whereClause,
        order: { createdAt: 'DESC' }
      });

      if (!connection) {
        throw new HttpException(
          'No active portal connection found for tenant',
          HttpStatus.NOT_FOUND
        );
      }

      return connection;
    } catch (error) {
      this.logger.error('Failed to get portal connection', error);
      throw this.handleError(error);
    }
  }

  async updatePortalConnection(
    connectionId: string,
    updates: Partial<IMSMEPortalConfig>,
    updatedBy: string
  ): Promise<MSMEPortalConnection> {
    try {
      const connection = await this.connectionRepository.findOne({
        where: { id: connectionId }
      });

      if (!connection) {
        throw new HttpException('Portal connection not found', HttpStatus.NOT_FOUND);
      }

      // Update connection properties
      if (updates.clientId) connection.clientId = updates.clientId;
      if (updates.clientSecret) connection.clientSecret = await this.encryptSecret(updates.clientSecret);
      if (updates.baseUrl) connection.baseUrl = updates.baseUrl;
      if (updates.certificatePath) connection.certificatePath = updates.certificatePath;
      if (updates.timeout) connection.timeout = updates.timeout;
      if (updates.retryAttempts) connection.retryAttempts = updates.retryAttempts;
      if (updates.retryDelay) connection.retryDelay = updates.retryDelay;
      if (updates.rateLimitPerMinute) connection.rateLimitPerMinute = updates.rateLimitPerMinute;

      connection.updatedBy = updatedBy;

      const updatedConnection = await this.connectionRepository.save(connection);

      // Clear cached auth token
      this.authCache.delete(connection.id);

      this.logger.log(`Portal connection updated: ${connectionId}`);
      return updatedConnection;
    } catch (error) {
      this.logger.error('Failed to update portal connection', error);
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Authentication Management
  // ============================================================================

  async authenticatePortal(connection: MSMEPortalConnection): Promise<IMSMEPortalAuth> {
    try {
      // Check if we have a valid cached token
      const cachedAuth = this.authCache.get(connection.id);
      if (cachedAuth && this.isTokenValid(cachedAuth)) {
        return cachedAuth;
      }

      this.logger.log(`Authenticating with MSME portal: ${connection.environment}`);

      // Check rate limiting
      await this.checkRateLimit(connection.tenantId);

      // Prepare authentication request
      const authRequest: MSMEPortalAuthRequest = {
        clientId: connection.clientId,
        clientSecret: await this.decryptSecret(connection.clientSecret),
        grantType: 'client_credentials',
        scope: connection.tokenScope
      };

      // Make authentication request
      const response = await this.makePortalRequest<MSMEPortalAuthResponse>(
        connection,
        'POST',
        '/oauth/token',
        authRequest
      );

      // Create auth object
      const auth: IMSMEPortalAuth = {
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        expiresIn: response.expires_in,
        tokenType: 'Bearer',
        scope: response.scope.split(' '),
        issuedAt: new Date(response.issued_at * 1000),
        status: MSMEPortalAuthStatus.AUTHENTICATED
      };

      // Update connection with auth details
      connection.accessToken = auth.accessToken;
      connection.refreshToken = auth.refreshToken;
      connection.lastAuthAt = auth.issuedAt;
      connection.authExpiresAt = new Date(auth.issuedAt.getTime() + (auth.expiresIn * 1000));
      connection.authStatus = MSMEPortalAuthStatus.AUTHENTICATED;
      connection.tokenScope = auth.scope;

      await this.connectionRepository.save(connection);

      // Cache the auth token
      this.authCache.set(connection.id, auth);

      this.logger.log(`Portal authentication successful: ${connection.id}`);
      return auth;
    } catch (error) {
      this.logger.error('Portal authentication failed', error);
      
      // Update connection status
      connection.authStatus = MSMEPortalAuthStatus.FAILED;
      await this.connectionRepository.save(connection);
      
      throw this.handleError(error);
    }
  }

  async refreshPortalToken(connection: MSMEPortalConnection): Promise<IMSMEPortalAuth> {
    try {
      if (!connection.refreshToken) {
        throw new Error('No refresh token available');
      }

      this.logger.log(`Refreshing portal token: ${connection.id}`);

      const refreshRequest = {
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken,
        client_id: connection.clientId,
        client_secret: await this.decryptSecret(connection.clientSecret)
      };

      const response = await this.makePortalRequest<MSMEPortalAuthResponse>(
        connection,
        'POST',
        '/oauth/token',
        refreshRequest
      );

      const auth: IMSMEPortalAuth = {
        accessToken: response.access_token,
        refreshToken: response.refresh_token || connection.refreshToken,
        expiresIn: response.expires_in,
        tokenType: 'Bearer',
        scope: response.scope.split(' '),
        issuedAt: new Date(response.issued_at * 1000),
        status: MSMEPortalAuthStatus.AUTHENTICATED
      };

      // Update connection
      connection.accessToken = auth.accessToken;
      connection.refreshToken = auth.refreshToken;
      connection.lastAuthAt = auth.issuedAt;
      connection.authExpiresAt = new Date(auth.issuedAt.getTime() + (auth.expiresIn * 1000));
      connection.authStatus = MSMEPortalAuthStatus.AUTHENTICATED;

      await this.connectionRepository.save(connection);

      // Update cache
      this.authCache.set(connection.id, auth);

      this.logger.log(`Portal token refreshed successfully: ${connection.id}`);
      return auth;
    } catch (error) {
      this.logger.error('Failed to refresh portal token', error);
      
      // Clear cached token and re-authenticate
      this.authCache.delete(connection.id);
      return this.authenticatePortal(connection);
    }
  }

  // ============================================================================
  // Complaint Management
  // ============================================================================

  async submitComplaint(request: ComplaintSubmissionRequest): Promise<IBaseResponse<ComplaintSubmissionResponse>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`Submitting complaint for tenant: ${request.tenantId}`);

      // Get portal connection
      const connection = await this.getPortalConnection(request.tenantId);
      
      // Ensure authentication
      await this.authenticatePortal(connection);

      // Create complaint entity
      const complaint = queryRunner.manager.create(MSMEComplaint, {
        tenantId: request.tenantId,
        portalConnectionId: connection.id,
        udyamRegistrationNumber: request.complaintData.udyamRegistrationNumber,
        complaintType: request.complaintData.complaintType,
        buyerName: request.complaintData.buyerDetails.name,
        buyerDetails: request.complaintData.buyerDetails,
        invoiceDetails: request.complaintData.invoiceDetails,
        delayDetails: request.complaintData.delayDetails,
        claimAmount: request.complaintData.claimAmount.principalAmount,
        interestAmount: request.complaintData.claimAmount.interestAmount,
        penaltyAmount: request.complaintData.claimAmount.penaltyAmount,
        totalClaimAmount: request.complaintData.claimAmount.totalClaimAmount,
        currency: request.complaintData.claimAmount.currency,
        delayDays: request.complaintData.delayDetails.delayDays,
        interestRate: request.complaintData.delayDetails.interestRate,
        description: request.complaintData.description,
        expectedResolution: request.complaintData.expectedResolution,
        status: MSMEComplaintStatus.DRAFT,
        createdBy: request.submittedBy
      });

      const savedComplaint = await queryRunner.manager.save(complaint);

      // Upload documents if provided
      if (request.documents && request.documents.length > 0) {
        await this.uploadComplaintDocuments(
          queryRunner,
          savedComplaint.id,
          request.documents,
          request.submittedBy
        );
      }

      // Submit to MSME portal
      const portalSubmission = await this.submitToPortal(connection, savedComplaint);

      // Update complaint with portal response
      savedComplaint.referenceNumber = portalSubmission.referenceNumber;
      savedComplaint.submissionDate = portalSubmission.submissionDate;
      savedComplaint.trackingUrl = portalSubmission.trackingUrl;
      savedComplaint.expectedResponseDate = portalSubmission.expectedResponseDate;
      savedComplaint.nextSteps = portalSubmission.nextSteps;
      savedComplaint.portalResponse = portalSubmission.portalResponse;
      savedComplaint.status = MSMEComplaintStatus.SUBMITTED;

      await queryRunner.manager.save(savedComplaint);

      // Create status history
      await this.createStatusHistory(
        queryRunner,
        savedComplaint.id,
        MSMEComplaintStatus.DRAFT,
        MSMEComplaintStatus.SUBMITTED,
        'Complaint submitted to MSME portal',
        request.submittedBy,
        portalSubmission.portalResponse
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Complaint submitted successfully: ${savedComplaint.referenceNumber}`);

      return {
        success: true,
        data: {
          success: true,
          referenceNumber: savedComplaint.referenceNumber,
          submissionDate: savedComplaint.submissionDate,
          trackingUrl: savedComplaint.trackingUrl,
          expectedResponseDate: savedComplaint.expectedResponseDate,
          nextSteps: savedComplaint.nextSteps,
          portalResponse: savedComplaint.portalResponse
        },
        message: 'Complaint submitted successfully',
        timestamp: new Date()
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to submit complaint', error);
      throw this.handleError(error);
    } finally {
      await queryRunner.release();
    }
  }

  async getComplaintStatus(
    tenantId: string,
    referenceNumber: string
  ): Promise<IBaseResponse<MSMEComplaint>> {
    try {
      const complaint = await this.complaintRepository.findOne({
        where: { tenantId, referenceNumber },
        relations: ['documents', 'statusHistory', 'portalConnection']
      });

      if (!complaint) {
        throw new HttpException('Complaint not found', HttpStatus.NOT_FOUND);
      }

      // Check for updates from portal
      await this.updateComplaintStatusFromPortal(complaint);

      return {
        success: true,
        data: complaint,
        message: 'Complaint status retrieved successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to get complaint status', error);
      throw this.handleError(error);
    }
  }

  async trackComplaints(request: StatusTrackingRequest): Promise<IBaseResponse<StatusTrackingResponse>> {
    try {
      const queryBuilder = this.complaintRepository.createQueryBuilder('complaint')
        .leftJoinAndSelect('complaint.documents', 'documents')
        .leftJoinAndSelect('complaint.statusHistory', 'statusHistory')
        .where('complaint.tenantId = :tenantId', { tenantId: request.tenantId });

      // Apply filters
      if (request.referenceNumbers && request.referenceNumbers.length > 0) {
        queryBuilder.andWhere('complaint.referenceNumber IN (:...referenceNumbers)', {
          referenceNumbers: request.referenceNumbers
        });
      }

      if (request.status) {
        queryBuilder.andWhere('complaint.status = :status', { status: request.status });
      }

      if (request.fromDate) {
        queryBuilder.andWhere('complaint.submissionDate >= :fromDate', { fromDate: request.fromDate });
      }

      if (request.toDate) {
        queryBuilder.andWhere('complaint.submissionDate <= :toDate', { toDate: request.toDate });
      }

      // Apply pagination
      const page = request.pagination?.page || 1;
      const pageSize = request.pagination?.pageSize || 20;
      const skip = (page - 1) * pageSize;

      queryBuilder.skip(skip).take(pageSize);

      // Apply sorting
      const sortBy = request.pagination?.sortBy || 'submissionDate';
      const sortOrder = request.pagination?.sortOrder || 'DESC';
      queryBuilder.orderBy(`complaint.${sortBy}`, sortOrder);

      const [complaints, total] = await queryBuilder.getManyAndCount();

      // Generate summary
      const summary = await this.generateComplaintSummary(request.tenantId);

      const response: StatusTrackingResponse = {
        complaints,
        pagination: {
          page,
          pageSize,
          totalItems: total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: page * pageSize < total,
          hasPrevious: page > 1
        },
        summary
      };

      return {
        success: true,
        data: response,
        message: 'Complaints tracked successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to track complaints', error);
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Document Management
  // ============================================================================

  async uploadDocument(request: DocumentUploadRequest): Promise<IBaseResponse<DocumentUploadResponse>> {
    try {
      this.logger.log(`Uploading document for complaint: ${request.complaintId}`);

      // Validate complaint exists
      const complaint = await this.complaintRepository.findOne({
        where: { id: request.complaintId },
        relations: ['portalConnection']
      });

      if (!complaint) {
        throw new HttpException('Complaint not found', HttpStatus.NOT_FOUND);
      }

      // Validate file
      this.validateDocumentFile(request.file);

      // Save file to storage
      const filePath = await this.saveDocumentFile(request.file, complaint.tenantId);

      // Calculate checksum
      const checksum = await this.calculateFileChecksum(filePath);

      // Create document entity
      const document = this.documentRepository.create({
        complaintId: request.complaintId,
        documentType: request.documentType,
        fileName: request.file.originalname,
        filePath,
        fileSize: request.file.size,
        mimeType: request.file.mimetype,
        description: request.description,
        isRequired: request.isRequired,
        checksum,
        uploadStatus: 'uploaded'
      });

      const savedDocument = await this.documentRepository.save(document);

      // Upload to MSME portal if complaint is submitted
      let portalDocumentId: string | undefined;
      if (complaint.status !== MSMEComplaintStatus.DRAFT) {
        try {
          portalDocumentId = await this.uploadDocumentToPortal(
            complaint.portalConnection,
            complaint.referenceNumber,
            savedDocument
          );
          
          savedDocument.portalDocumentId = portalDocumentId;
          savedDocument.isSubmitted = true;
          savedDocument.submissionDate = new Date();
          await this.documentRepository.save(savedDocument);
        } catch (portalError) {
          this.logger.warn(`Failed to upload document to portal: ${portalError.message}`);
        }
      }

      const response: DocumentUploadResponse = {
        success: true,
        documentId: savedDocument.documentId,
        portalDocumentId,
        uploadStatus: savedDocument.uploadStatus,
        message: 'Document uploaded successfully'
      };

      return {
        success: true,
        data: response,
        message: 'Document uploaded successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to upload document', error);
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async makePortalRequest<T>(
    connection: MSMEPortalConnection,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      method,
      url: `${connection.baseUrl}${endpoint}`,
      timeout: connection.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SME-Receivables-Platform/1.0',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    // Add authentication if available
    if (connection.accessToken && endpoint !== '/oauth/token') {
      config.headers['Authorization'] = `Bearer ${connection.accessToken}`;
    }

    try {
      const response: AxiosResponse<T> = await firstValueFrom(
        this.httpService.request(config).pipe(
          timeout(connection.timeout),
          retry({
            count: connection.retryAttempts,
            delay: connection.retryDelay
          }),
          catchError((error) => {
            throw error;
          })
        )
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Portal request failed: ${method} ${endpoint}`, error);
      throw error;
    }
  }

  private async submitToPortal(
    connection: MSMEPortalConnection,
    complaint: MSMEComplaint
  ): Promise<ComplaintSubmissionResponse> {
    try {
      const submissionData = {
        udyam_registration_number: complaint.udyamRegistrationNumber,
        complaint_type: complaint.complaintType,
        buyer_details: complaint.buyerDetails,
        invoice_details: complaint.invoiceDetails,
        delay_details: complaint.delayDetails,
        claim_amount: complaint.getTotalClaimAmount(),
        description: complaint.description,
        expected_resolution: complaint.expectedResolution
      };

      const response = await this.makePortalRequest<any>(
        connection,
        'POST',
        '/api/v1/complaints',
        submissionData
      );

      return {
        success: true,
        referenceNumber: response.reference_number,
        submissionDate: new Date(response.submission_date),
        trackingUrl: response.tracking_url,
        expectedResponseDate: response.expected_response_date ? new Date(response.expected_response_date) : undefined,
        nextSteps: response.next_steps || [],
        portalResponse: response
      };
    } catch (error) {
      this.logger.error('Failed to submit complaint to portal', error);
      throw error;
    }
  }

  private async updateComplaintStatusFromPortal(complaint: MSMEComplaint): Promise<void> {
    try {
      if (!complaint.referenceNumber || !complaint.portalConnection) {
        return;
      }

      const statusResponse = await this.makePortalRequest<any>(
        complaint.portalConnection,
        'GET',
        `/api/v1/complaints/${complaint.referenceNumber}/status`
      );

      const newStatus = this.mapPortalStatusToEnum(statusResponse.status);
      
      if (newStatus !== complaint.status) {
        // Update complaint status
        const previousStatus = complaint.status;
        complaint.status = newStatus;
        complaint.lastStatusUpdate = new Date();
        complaint.portalResponse = statusResponse;

        await this.complaintRepository.save(complaint);

        // Create status history
        await this.createStatusHistory(
          null,
          complaint.id,
          previousStatus,
          newStatus,
          statusResponse.status_reason || 'Status updated from portal',
          'system',
          statusResponse
        );

        this.logger.log(`Complaint status updated: ${complaint.referenceNumber} -> ${newStatus}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to update complaint status from portal: ${error.message}`);
    }
  }

  private async createStatusHistory(
    queryRunner: QueryRunner | null,
    complaintId: string,
    previousStatus: MSMEComplaintStatus | null,
    currentStatus: MSMEComplaintStatus,
    reason: string,
    createdBy: string,
    portalResponse?: any
  ): Promise<void> {
    const statusHistory = {
      complaintId,
      previousStatus,
      currentStatus,
      changeReason: reason,
      portalResponse,
      systemGenerated: createdBy === 'system',
      createdBy: createdBy !== 'system' ? createdBy : undefined
    };

    if (queryRunner) {
      await queryRunner.manager.save(MSMEComplaintStatusHistory, statusHistory);
    } else {
      await this.statusHistoryRepository.save(statusHistory);
    }
  }

  private async uploadComplaintDocuments(
    queryRunner: QueryRunner,
    complaintId: string,
    files: Express.Multer.File[],
    uploadedBy: string
  ): Promise<void> {
    for (const file of files) {
      // This would be implemented based on the file upload requirements
      // For now, we'll create placeholder document records
      const document = queryRunner.manager.create(MSMEComplaintDocument, {
        complaintId,
        documentType: MSMEPortalDocumentType.OTHER, // Would be determined from file or metadata
        fileName: file.originalname,
        filePath: `/uploads/${complaintId}/${file.originalname}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadStatus: 'uploaded',
        uploadedBy
      });

      await queryRunner.manager.save(document);
    }
  }

  private async uploadDocumentToPortal(
    connection: MSMEPortalConnection,
    referenceNumber: string,
    document: MSMEComplaintDocument
  ): Promise<string> {
    // Implementation would depend on MSME portal's document upload API
    // This is a placeholder implementation
    const uploadData = {
      reference_number: referenceNumber,
      document_type: document.documentType,
      file_name: document.fileName,
      file_size: document.fileSize,
      mime_type: document.mimeType
    };

    const response = await this.makePortalRequest<any>(
      connection,
      'POST',
      '/api/v1/documents/upload',
      uploadData
    );

    return response.document_id;
  }

  private async checkPendingComplaintUpdates(): Promise<void> {
    try {
      const pendingComplaints = await this.complaintRepository.find({
        where: {
          status: MSMEComplaintStatus.SUBMITTED,
          isActive: true
        },
        relations: ['portalConnection'],
        take: 50 // Process in batches
      });

      for (const complaint of pendingComplaints) {
        try {
          await this.updateComplaintStatusFromPortal(complaint);
        } catch (error) {
          this.logger.warn(`Failed to update complaint ${complaint.referenceNumber}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error('Error checking pending complaint updates', error);
    }
  }

  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [key, auth] of this.authCache.entries()) {
      if (!this.isTokenValid(auth)) {
        this.authCache.delete(key);
      }
    }
  }

  private isTokenValid(auth: IMSMEPortalAuth): boolean {
    const expiryTime = auth.issuedAt.getTime() + (auth.expiresIn * 1000);
    return Date.now() < expiryTime - (5 * 60 * 1000); // 5 minutes buffer
  }

  private async checkRateLimit(tenantId: string): Promise<void> {
    const key = `rate_limit_${tenantId}`;
    const now = Date.now();
    const windowSize = 60 * 1000; // 1 minute
    
    const current = this.rateLimitCache.get(key);
    if (!current || now > current.resetTime) {
      this.rateLimitCache.set(key, { count: 1, resetTime: now + windowSize });
      return;
    }

    if (current.count >= 60) { // Default rate limit
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    current.count++;
  }

  private async encryptSecret(secret: string): Promise<string> {
    // Implementation would use proper encryption
    return Buffer.from(secret).toString('base64');
  }

  private async decryptSecret(encryptedSecret: string): Promise<string> {
    // Implementation would use proper decryption
    return Buffer.from(encryptedSecret, 'base64').toString();
  }

  private validateDocumentFile(file: Express.Multer.File): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword'];

    if (file.size > maxSize) {
      throw new HttpException('File size exceeds maximum limit', HttpStatus.BAD_REQUEST);
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new HttpException('File type not allowed', HttpStatus.BAD_REQUEST);
    }
  }

  private async saveDocumentFile(file: Express.Multer.File, tenantId: string): Promise<string> {
    const uploadDir = path.join(process.cwd(), 'uploads', tenantId);
    await fs.mkdir(uploadDir, { recursive: true });
    
    const fileName = `${uuidv4()}_${file.originalname}`;
    const filePath = path.join(uploadDir, fileName);
    
    await fs.writeFile(filePath, file.buffer);
    return filePath;
  }

  private async calculateFileChecksum(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  private mapPortalStatusToEnum(portalStatus: string): MSMEComplaintStatus {
    const statusMap: Record<string, MSMEComplaintStatus> = {
      'draft': MSMEComplaintStatus.DRAFT,
      'submitted': MSMEComplaintStatus.SUBMITTED,
      'under_review': MSMEComplaintStatus.UNDER_REVIEW,
      'buyer_notified': MSMEComplaintStatus.BUYER_NOTIFIED,
      'conciliation_scheduled': MSMEComplaintStatus.CONCILIATION_SCHEDULED,
      'conciliation_in_progress': MSMEComplaintStatus.CONCILIATION_IN_PROGRESS,
      'conciliation_completed': MSMEComplaintStatus.CONCILIATION_COMPLETED,
      'resolved': MSMEComplaintStatus.RESOLVED,
      'escalated': MSMEComplaintStatus.ESCALATED,
      'closed': MSMEComplaintStatus.CLOSED,
      'rejected': MSMEComplaintStatus.REJECTED,
      'withdrawn': MSMEComplaintStatus.WITHDRAWN
    };

    return statusMap[portalStatus.toLowerCase()] || MSMEComplaintStatus.UNDER_REVIEW;
  }

  private async generateComplaintSummary(tenantId: string): Promise<any> {
    const summary = await this.complaintRepository
      .createQueryBuilder('complaint')
      .select('complaint.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('complaint.tenantId = :tenantId', { tenantId })
      .groupBy('complaint.status')
      .getRawMany();

    const byStatus: Record<MSMEComplaintStatus, number> = {} as any;
    let total = 0;

    for (const item of summary) {
      byStatus[item.status] = parseInt(item.count);
      total += parseInt(item.count);
    }

    // Calculate pending actions and overdue complaints
    const pendingActions = (byStatus[MSMEComplaintStatus.SUBMITTED] || 0) +
                          (byStatus[MSMEComplaintStatus.UNDER_REVIEW] || 0);
    
    const overdueComplaints = 0; // Would be calculated based on expected response dates

    return {
      total,
      byStatus,
      pendingActions,
      overdueComplaints
    };
  }

  private handleError(error: any): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    this.logger.error('Unhandled error in MSME Portal Service', error);
    
    return new HttpException(
      'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

