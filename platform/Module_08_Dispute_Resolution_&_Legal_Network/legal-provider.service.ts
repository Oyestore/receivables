/**
 * Legal Service Provider Service
 * Module 8 Enhancement - Legal Compliance Automation
 * 
 * This service manages the legal service provider network including
 * provider registration, verification, search, booking, and quality management.
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, SelectQueryBuilder } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import {
  LegalServiceProvider,
  LegalServiceBooking,
  LegalNoticeDispatch,
  LegalServiceCategory,
  ProviderReview,
  ProviderAvailabilitySlot,
  BookingStatusHistory,
  NoticeDeliveryAttempt
} from '../entities/legal-provider.entity';

import {
  LegalSpecialization,
  LegalProviderStatus,
  LegalProviderAvailability,
  LegalNoticeType,
  LegalNoticeDeliveryMethod,
  LegalNoticeDeliveryStatus,
  LegalServiceType,
  LegalServicePriority,
  DocumentLanguage,
  LegalJurisdiction,
  CurrencyCode,
  NotificationType,
  NotificationPriority,
  AIModelType,
  AIProcessingStatus
} from '@shared/enums/legal-compliance.enum';

import {
  ILegalServiceProvider,
  ILegalNoticeRequest,
  ILegalNoticeDispatchResult,
  ILegalServiceBooking,
  IBaseResponse,
  IErrorResponse,
  IPaginationRequest,
  IPaginationResponse,
  INotificationRequest,
  IAIProcessingRequest,
  IAIProcessingResult
} from '@shared/interfaces/legal-compliance.interface';

// ============================================================================
// DTOs and Request/Response Interfaces
// ============================================================================

export interface ProviderRegistrationRequest {
  tenantId: string;
  providerData: Partial<ILegalServiceProvider>;
  verificationDocuments: Express.Multer.File[];
  registeredBy: string;
}

export interface ProviderSearchRequest {
  tenantId: string;
  specializations?: LegalSpecialization[];
  location?: {
    state?: string;
    city?: string;
    radius?: number; // in km
  };
  languages?: DocumentLanguage[];
  jurisdiction?: LegalJurisdiction[];
  availability?: {
    date?: Date;
    timeSlot?: string;
    duration?: number;
  };
  priceRange?: {
    min?: number;
    max?: number;
  };
  rating?: {
    min?: number;
  };
  serviceType?: LegalServiceType;
  urgency?: LegalServicePriority;
  pagination?: IPaginationRequest;
}

export interface ProviderSearchResponse {
  providers: LegalServiceProvider[];
  pagination: IPaginationResponse;
  filters: {
    availableSpecializations: LegalSpecialization[];
    availableLocations: string[];
    priceRange: { min: number; max: number };
    ratingRange: { min: number; max: number };
  };
  recommendations?: LegalServiceProvider[];
}

export interface BookingRequest {
  tenantId: string;
  providerId: string;
  clientId: string;
  serviceType: LegalServiceType;
  scheduledDate: Date;
  duration: number;
  priority: LegalServicePriority;
  description: string;
  requirements?: string[];
  meetingMode: 'in_person' | 'video_call' | 'phone_call';
  meetingDetails?: any;
  clientNotes?: string;
}

export interface BookingResponse {
  success: boolean;
  bookingId: string;
  bookingNumber: string;
  cost: number;
  currency: CurrencyCode;
  confirmationRequired: boolean;
  paymentRequired: boolean;
  meetingDetails?: any;
}

export interface NoticeDispatchRequest {
  tenantId: string;
  providerId: string;
  clientId: string;
  noticeRequest: ILegalNoticeRequest;
}

export interface ProviderVerificationRequest {
  providerId: string;
  verificationStatus: LegalProviderStatus;
  verificationNotes?: string;
  verifiedBy: string;
}

export interface ProviderPerformanceMetrics {
  providerId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    averageRating: number;
    totalReviews: number;
    responseTime: number; // in minutes
    successRate: number; // percentage
    revenue: number;
    clientSatisfaction: number;
    complianceScore: number;
  };
  trends: {
    bookingTrend: 'increasing' | 'stable' | 'decreasing';
    ratingTrend: 'improving' | 'stable' | 'declining';
    performanceTrend: 'improving' | 'stable' | 'declining';
  };
}

// ============================================================================
// Legal Service Provider Service Implementation
// ============================================================================

@Injectable()
export class LegalProviderService {
  private readonly logger = new Logger(LegalProviderService.name);
  private readonly aiCache = new Map<string, any>();

  constructor(
    @InjectRepository(LegalServiceProvider)
    private readonly providerRepository: Repository<LegalServiceProvider>,
    
    @InjectRepository(LegalServiceBooking)
    private readonly bookingRepository: Repository<LegalServiceBooking>,
    
    @InjectRepository(LegalNoticeDispatch)
    private readonly noticeRepository: Repository<LegalNoticeDispatch>,
    
    @InjectRepository(LegalServiceCategory)
    private readonly categoryRepository: Repository<LegalServiceCategory>,
    
    @InjectRepository(ProviderReview)
    private readonly reviewRepository: Repository<ProviderReview>,
    
    @InjectRepository(ProviderAvailabilitySlot)
    private readonly availabilityRepository: Repository<ProviderAvailabilitySlot>,
    
    @InjectRepository(BookingStatusHistory)
    private readonly bookingHistoryRepository: Repository<BookingStatusHistory>,
    
    @InjectRepository(NoticeDeliveryAttempt)
    private readonly deliveryAttemptRepository: Repository<NoticeDeliveryAttempt>,
    
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
      this.logger.log('Initializing Legal Provider Service...');
      
      // Initialize service categories
      await this.initializeServiceCategories();
      
      // Setup AI processing
      await this.initializeAIProcessing();
      
      // Setup periodic tasks
      this.setupPeriodicTasks();
      
      this.logger.log('Legal Provider Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Legal Provider Service', error);
      throw error;
    }
  }

  private async initializeServiceCategories(): Promise<void> {
    const defaultCategories = [
      { categoryCode: 'DEBT_COLLECTION', name: 'Debt Collection', description: 'Legal services for debt recovery and collection' },
      { categoryCode: 'MSME_LAW', name: 'MSME Law', description: 'Specialized legal services for MSME sector' },
      { categoryCode: 'CONTRACT_LAW', name: 'Contract Law', description: 'Contract drafting, review, and dispute resolution' },
      { categoryCode: 'COMMERCIAL_LAW', name: 'Commercial Law', description: 'Business and commercial legal services' },
      { categoryCode: 'ARBITRATION', name: 'Arbitration & Mediation', description: 'Alternative dispute resolution services' },
      { categoryCode: 'LITIGATION', name: 'Litigation', description: 'Court representation and litigation services' },
      { categoryCode: 'COMPLIANCE', name: 'Legal Compliance', description: 'Regulatory compliance and advisory services' }
    ];

    for (const category of defaultCategories) {
      const existing = await this.categoryRepository.findOne({
        where: { categoryCode: category.categoryCode }
      });

      if (!existing) {
        await this.categoryRepository.save(category);
      }
    }
  }

  private async initializeAIProcessing(): Promise<void> {
    // Initialize AI models for provider matching and recommendation
    const aiConfig = {
      primaryModel: AIModelType.DEEPSEEK_R1,
      fallbackModels: [AIModelType.TENSORFLOW, AIModelType.SCIKIT_LEARN],
      confidence: 0.8,
      timeout: 30000
    };

    this.aiCache.set('config', aiConfig);
  }

  private setupPeriodicTasks(): void {
    // Setup periodic tasks for provider management
    this.logger.log('Setting up periodic tasks for provider management');
  }

  // ============================================================================
  // Provider Registration and Management
  // ============================================================================

  async registerProvider(request: ProviderRegistrationRequest): Promise<IBaseResponse<LegalServiceProvider>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`Registering new legal provider for tenant: ${request.tenantId}`);

      // Validate provider data
      await this.validateProviderData(request.providerData);

      // Check for duplicate bar council number
      const existingProvider = await this.providerRepository.findOne({
        where: { barCouncilNumber: request.providerData.barCouncilNumber }
      });

      if (existingProvider) {
        throw new HttpException(
          'Provider with this Bar Council number already exists',
          HttpStatus.CONFLICT
        );
      }

      // Process verification documents
      const verificationDocuments = await this.processVerificationDocuments(
        request.verificationDocuments,
        request.tenantId
      );

      // Create provider entity
      const provider = queryRunner.manager.create(LegalServiceProvider, {
        tenantId: request.tenantId,
        name: request.providerData.name,
        firmName: request.providerData.firmName,
        specializations: request.providerData.specializations || [],
        experienceYears: request.providerData.experienceYears,
        barCouncilNumber: request.providerData.barCouncilNumber,
        location: request.providerData.location,
        contactDetails: request.providerData.contactDetails,
        pricingStructure: request.providerData.pricingStructure,
        credentials: request.providerData.credentials,
        languages: request.providerData.languages || [DocumentLanguage.ENGLISH],
        jurisdiction: request.providerData.jurisdiction || [LegalJurisdiction.ALL_INDIA],
        workingHours: request.providerData.workingHours,
        emergencyAvailable: request.providerData.emergencyAvailable || false,
        bio: request.providerData.bio,
        websiteUrl: request.providerData.websiteUrl,
        socialMediaLinks: request.providerData.socialMediaLinks,
        verificationDocuments,
        verificationStatus: LegalProviderStatus.PENDING_VERIFICATION,
        availabilityStatus: LegalProviderAvailability.UNAVAILABLE,
        createdBy: request.registeredBy
      });

      const savedProvider = await queryRunner.manager.save(provider);

      // Create initial availability slots
      await this.createInitialAvailabilitySlots(queryRunner, savedProvider.id);

      // Trigger verification process
      await this.triggerProviderVerification(savedProvider.id);

      await queryRunner.commitTransaction();

      // Emit provider registration event
      this.eventEmitter.emit('provider.registered', {
        providerId: savedProvider.id,
        tenantId: request.tenantId,
        providerName: savedProvider.name
      });

      this.logger.log(`Provider registered successfully: ${savedProvider.providerCode}`);

      return {
        success: true,
        data: savedProvider,
        message: 'Provider registered successfully. Verification process initiated.',
        timestamp: new Date()
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to register provider', error);
      throw this.handleError(error);
    } finally {
      await queryRunner.release();
    }
  }

  async searchProviders(request: ProviderSearchRequest): Promise<IBaseResponse<ProviderSearchResponse>> {
    try {
      this.logger.log(`Searching providers for tenant: ${request.tenantId}`);

      // Build search query
      const queryBuilder = this.buildProviderSearchQuery(request);

      // Apply pagination
      const page = request.pagination?.page || 1;
      const pageSize = request.pagination?.pageSize || 20;
      const skip = (page - 1) * pageSize;

      queryBuilder.skip(skip).take(pageSize);

      // Execute search
      const [providers, total] = await queryBuilder.getManyAndCount();

      // Get AI-powered recommendations if enabled
      const recommendations = await this.getProviderRecommendations(request, providers);

      // Generate filters
      const filters = await this.generateSearchFilters(request.tenantId);

      const response: ProviderSearchResponse = {
        providers,
        pagination: {
          page,
          pageSize,
          totalItems: total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: page * pageSize < total,
          hasPrevious: page > 1
        },
        filters,
        recommendations
      };

      return {
        success: true,
        data: response,
        message: 'Provider search completed successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to search providers', error);
      throw this.handleError(error);
    }
  }

  async verifyProvider(request: ProviderVerificationRequest): Promise<IBaseResponse<LegalServiceProvider>> {
    try {
      this.logger.log(`Verifying provider: ${request.providerId}`);

      const provider = await this.providerRepository.findOne({
        where: { id: request.providerId }
      });

      if (!provider) {
        throw new HttpException('Provider not found', HttpStatus.NOT_FOUND);
      }

      // Update verification status
      provider.verificationStatus = request.verificationStatus;
      provider.verificationDate = new Date();
      provider.verifiedBy = request.verifiedBy;

      // If verified, make provider available
      if (request.verificationStatus === LegalProviderStatus.VERIFIED) {
        provider.availabilityStatus = LegalProviderAvailability.AVAILABLE;
        provider.complianceScore = 100; // Initial compliance score
      }

      const updatedProvider = await this.providerRepository.save(provider);

      // Emit verification event
      this.eventEmitter.emit('provider.verified', {
        providerId: provider.id,
        verificationStatus: request.verificationStatus,
        verifiedBy: request.verifiedBy
      });

      // Send notification to provider
      await this.sendProviderNotification(provider.id, {
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipients: [provider.contactDetails.email],
        subject: 'Provider Verification Update',
        content: `Your provider verification status has been updated to: ${request.verificationStatus}`,
        templateData: {
          providerName: provider.name,
          verificationStatus: request.verificationStatus,
          verificationDate: new Date()
        }
      });

      return {
        success: true,
        data: updatedProvider,
        message: 'Provider verification updated successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to verify provider', error);
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Booking Management
  // ============================================================================

  async createBooking(request: BookingRequest): Promise<IBaseResponse<BookingResponse>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`Creating booking for provider: ${request.providerId}`);

      // Validate provider availability
      const provider = await this.validateProviderAvailability(
        request.providerId,
        request.scheduledDate,
        request.duration
      );

      // Calculate booking cost
      const cost = await this.calculateBookingCost(provider, request);

      // Create booking entity
      const booking = queryRunner.manager.create(LegalServiceBooking, {
        tenantId: request.tenantId,
        serviceType: request.serviceType,
        providerId: request.providerId,
        clientId: request.clientId,
        scheduledDate: request.scheduledDate,
        duration: request.duration,
        priority: request.priority,
        description: request.description,
        requirements: request.requirements,
        meetingMode: request.meetingMode,
        meetingDetails: request.meetingDetails,
        cost,
        currency: provider.pricingStructure.currency,
        status: 'scheduled',
        clientNotes: request.clientNotes,
        createdBy: request.clientId
      });

      const savedBooking = await queryRunner.manager.save(booking);

      // Block availability slot
      await this.blockAvailabilitySlot(
        queryRunner,
        request.providerId,
        request.scheduledDate,
        request.duration,
        savedBooking.id
      );

      // Create booking status history
      await this.createBookingStatusHistory(
        queryRunner,
        savedBooking.id,
        null,
        'scheduled',
        'Booking created',
        request.clientId
      );

      await queryRunner.commitTransaction();

      // Send notifications
      await this.sendBookingNotifications(savedBooking);

      // Emit booking event
      this.eventEmitter.emit('booking.created', {
        bookingId: savedBooking.id,
        providerId: request.providerId,
        clientId: request.clientId,
        scheduledDate: request.scheduledDate
      });

      const response: BookingResponse = {
        success: true,
        bookingId: savedBooking.id,
        bookingNumber: savedBooking.bookingNumber,
        cost: savedBooking.cost,
        currency: savedBooking.currency,
        confirmationRequired: request.priority === LegalServicePriority.URGENT,
        paymentRequired: true,
        meetingDetails: savedBooking.meetingDetails
      };

      return {
        success: true,
        data: response,
        message: 'Booking created successfully',
        timestamp: new Date()
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to create booking', error);
      throw this.handleError(error);
    } finally {
      await queryRunner.release();
    }
  }

  async updateBookingStatus(
    bookingId: string,
    newStatus: string,
    reason: string,
    updatedBy: string
  ): Promise<IBaseResponse<LegalServiceBooking>> {
    try {
      const booking = await this.bookingRepository.findOne({
        where: { id: bookingId },
        relations: ['provider']
      });

      if (!booking) {
        throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
      }

      const previousStatus = booking.status;
      booking.status = newStatus as any;
      booking.updatedBy = updatedBy;

      // Handle status-specific logic
      if (newStatus === 'completed') {
        booking.outcome = 'Service completed successfully';
        // Update provider metrics
        await this.updateProviderMetrics(booking.providerId, true);
      } else if (newStatus === 'cancelled') {
        booking.cancellationReason = reason;
        booking.cancelledBy = updatedBy;
        booking.cancellationDate = new Date();
        
        // Release availability slot
        await this.releaseAvailabilitySlot(booking.providerId, booking.scheduledDate);
      }

      const updatedBooking = await this.bookingRepository.save(booking);

      // Create status history
      await this.createBookingStatusHistory(
        null,
        bookingId,
        previousStatus,
        newStatus,
        reason,
        updatedBy
      );

      // Send notifications
      await this.sendBookingStatusNotification(updatedBooking, previousStatus, newStatus);

      // Emit status change event
      this.eventEmitter.emit('booking.status_changed', {
        bookingId,
        previousStatus,
        newStatus,
        updatedBy
      });

      return {
        success: true,
        data: updatedBooking,
        message: 'Booking status updated successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to update booking status', error);
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Legal Notice Management
  // ============================================================================

  async dispatchNotice(request: NoticeDispatchRequest): Promise<IBaseResponse<ILegalNoticeDispatchResult>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`Dispatching legal notice for client: ${request.clientId}`);

      // Validate provider
      const provider = await this.providerRepository.findOne({
        where: { id: request.providerId, verificationStatus: LegalProviderStatus.VERIFIED }
      });

      if (!provider) {
        throw new HttpException('Verified provider not found', HttpStatus.NOT_FOUND);
      }

      // Calculate dispatch cost
      const cost = await this.calculateNoticeDispatchCost(provider, request.noticeRequest);

      // Create notice dispatch entity
      const notice = queryRunner.manager.create(LegalNoticeDispatch, {
        tenantId: request.tenantId,
        noticeType: request.noticeRequest.noticeType,
        providerId: request.providerId,
        clientId: request.clientId,
        recipientName: request.noticeRequest.recipientDetails.name,
        recipientDetails: request.noticeRequest.recipientDetails,
        noticeContent: request.noticeRequest.noticeContent,
        deliveryMethod: request.noticeRequest.deliveryMethod,
        urgency: request.noticeRequest.urgency,
        templateId: request.noticeRequest.templateId,
        customizations: request.noticeRequest.customizations,
        deliveryInstructions: request.noticeRequest.deliveryInstructions,
        followUpRequired: request.noticeRequest.followUpRequired,
        dispatchDate: new Date(),
        expectedDeliveryDate: this.calculateExpectedDeliveryDate(
          request.noticeRequest.deliveryMethod,
          request.noticeRequest.urgency
        ),
        cost,
        currency: provider.pricingStructure.currency,
        estimatedResponseTime: this.calculateEstimatedResponseTime(request.noticeRequest.noticeType),
        createdBy: request.clientId
      });

      const savedNotice = await queryRunner.manager.save(notice);

      // Create initial delivery attempt
      await this.createDeliveryAttempt(
        queryRunner,
        savedNotice.id,
        1,
        request.noticeRequest.deliveryMethod,
        LegalNoticeDeliveryStatus.PENDING
      );

      await queryRunner.commitTransaction();

      // Initiate dispatch process
      await this.initiateNoticeDispatch(savedNotice);

      // Emit notice dispatch event
      this.eventEmitter.emit('notice.dispatched', {
        noticeId: savedNotice.id,
        providerId: request.providerId,
        clientId: request.clientId,
        noticeType: request.noticeRequest.noticeType
      });

      const result: ILegalNoticeDispatchResult = {
        noticeId: savedNotice.id,
        dispatchDate: savedNotice.dispatchDate,
        expectedDeliveryDate: savedNotice.expectedDeliveryDate,
        trackingNumber: savedNotice.trackingNumber,
        deliveryMethod: savedNotice.deliveryMethod,
        cost: savedNotice.cost,
        status: savedNotice.deliveryStatus,
        providerId: savedNotice.providerId,
        estimatedResponseTime: savedNotice.estimatedResponseTime
      };

      return {
        success: true,
        data: result,
        message: 'Legal notice dispatch initiated successfully',
        timestamp: new Date()
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to dispatch notice', error);
      throw this.handleError(error);
    } finally {
      await queryRunner.release();
    }
  }

  async trackNoticeDelivery(noticeId: string): Promise<IBaseResponse<LegalNoticeDispatch>> {
    try {
      const notice = await this.noticeRepository.findOne({
        where: { id: noticeId },
        relations: ['provider', 'deliveryAttempts_']
      });

      if (!notice) {
        throw new HttpException('Notice not found', HttpStatus.NOT_FOUND);
      }

      // Update delivery status from provider if needed
      await this.updateNoticeDeliveryStatus(notice);

      return {
        success: true,
        data: notice,
        message: 'Notice delivery status retrieved successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to track notice delivery', error);
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Provider Performance and Analytics
  // ============================================================================

  async getProviderPerformance(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IBaseResponse<ProviderPerformanceMetrics>> {
    try {
      this.logger.log(`Getting performance metrics for provider: ${providerId}`);

      const provider = await this.providerRepository.findOne({
        where: { id: providerId }
      });

      if (!provider) {
        throw new HttpException('Provider not found', HttpStatus.NOT_FOUND);
      }

      // Calculate performance metrics
      const metrics = await this.calculateProviderMetrics(providerId, startDate, endDate);

      const performanceMetrics: ProviderPerformanceMetrics = {
        providerId,
        period: { startDate, endDate },
        metrics,
        trends: await this.calculatePerformanceTrends(providerId, startDate, endDate)
      };

      return {
        success: true,
        data: performanceMetrics,
        message: 'Provider performance metrics retrieved successfully',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to get provider performance', error);
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // Periodic Tasks and Maintenance
  // ============================================================================

  @Cron(CronExpression.EVERY_HOUR)
  async updateProviderAvailability(): Promise<void> {
    try {
      this.logger.log('Updating provider availability status');

      // Update availability based on working hours and bookings
      const providers = await this.providerRepository.find({
        where: { isActive: true, verificationStatus: LegalProviderStatus.VERIFIED }
      });

      for (const provider of providers) {
        await this.updateProviderAvailabilityStatus(provider);
      }
    } catch (error) {
      this.logger.error('Error updating provider availability', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyReports(): Promise<void> {
    try {
      this.logger.log('Generating daily provider reports');

      // Generate performance reports for all providers
      const providers = await this.providerRepository.find({
        where: { isActive: true }
      });

      for (const provider of providers) {
        await this.generateProviderDailyReport(provider.id);
      }
    } catch (error) {
      this.logger.error('Error generating daily reports', error);
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkBookingReminders(): Promise<void> {
    try {
      this.logger.log('Checking booking reminders');

      const upcomingBookings = await this.bookingRepository.find({
        where: {
          status: 'confirmed',
          reminderSent: false
        },
        relations: ['provider']
      });

      for (const booking of upcomingBookings) {
        if (booking.needsReminder()) {
          await this.sendBookingReminder(booking);
        }
      }
    } catch (error) {
      this.logger.error('Error checking booking reminders', error);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private buildProviderSearchQuery(request: ProviderSearchRequest): SelectQueryBuilder<LegalServiceProvider> {
    const queryBuilder = this.providerRepository.createQueryBuilder('provider')
      .leftJoinAndSelect('provider.reviews', 'reviews')
      .leftJoinAndSelect('provider.serviceCategories', 'categories')
      .where('provider.tenantId = :tenantId', { tenantId: request.tenantId })
      .andWhere('provider.isActive = :isActive', { isActive: true })
      .andWhere('provider.verificationStatus = :verificationStatus', { 
        verificationStatus: LegalProviderStatus.VERIFIED 
      });

    // Apply filters
    if (request.specializations && request.specializations.length > 0) {
      queryBuilder.andWhere('provider.specializations && :specializations', {
        specializations: request.specializations
      });
    }

    if (request.languages && request.languages.length > 0) {
      queryBuilder.andWhere('provider.languages && :languages', {
        languages: request.languages
      });
    }

    if (request.jurisdiction && request.jurisdiction.length > 0) {
      queryBuilder.andWhere('provider.jurisdiction && :jurisdiction', {
        jurisdiction: request.jurisdiction
      });
    }

    if (request.location?.state) {
      queryBuilder.andWhere("provider.location->>'state' = :state", {
        state: request.location.state
      });
    }

    if (request.location?.city) {
      queryBuilder.andWhere("provider.location->>'city' = :city", {
        city: request.location.city
      });
    }

    if (request.priceRange) {
      if (request.priceRange.min) {
        queryBuilder.andWhere("(provider.pricingStructure->>'consultationFee')::numeric >= :minPrice", {
          minPrice: request.priceRange.min
        });
      }
      if (request.priceRange.max) {
        queryBuilder.andWhere("(provider.pricingStructure->>'consultationFee')::numeric <= :maxPrice", {
          maxPrice: request.priceRange.max
        });
      }
    }

    if (request.rating?.min) {
      queryBuilder.andWhere('provider.rating >= :minRating', {
        minRating: request.rating.min
      });
    }

    if (request.availability?.date) {
      // Check availability for specific date
      queryBuilder.leftJoin('provider.availabilitySlots', 'slots')
        .andWhere('slots.slotDate = :availabilityDate', {
          availabilityDate: request.availability.date
        })
        .andWhere('slots.isAvailable = :isAvailable', { isAvailable: true });
    }

    // Apply sorting
    const sortBy = request.pagination?.sortBy || 'rating';
    const sortOrder = request.pagination?.sortOrder || 'DESC';
    
    if (sortBy === 'rating') {
      queryBuilder.orderBy('provider.rating', sortOrder);
    } else if (sortBy === 'experience') {
      queryBuilder.orderBy('provider.experienceYears', sortOrder);
    } else if (sortBy === 'price') {
      queryBuilder.orderBy("(provider.pricingStructure->>'consultationFee')::numeric", sortOrder);
    } else {
      queryBuilder.orderBy(`provider.${sortBy}`, sortOrder);
    }

    return queryBuilder;
  }

  private async getProviderRecommendations(
    request: ProviderSearchRequest,
    searchResults: LegalServiceProvider[]
  ): Promise<LegalServiceProvider[]> {
    try {
      // Use AI to generate personalized recommendations
      const aiRequest: IAIProcessingRequest = {
        taskType: 'recommendation' as any,
        inputData: {
          searchCriteria: request,
          searchResults: searchResults.map(p => ({
            id: p.id,
            specializations: p.specializations,
            rating: p.rating,
            experienceYears: p.experienceYears,
            location: p.location,
            pricingStructure: p.pricingStructure
          }))
        },
        configuration: this.aiCache.get('config')
      };

      const aiResult = await this.processAIRequest(aiRequest);
      
      if (aiResult.status === AIProcessingStatus.COMPLETED && aiResult.result?.recommendations) {
        const recommendedIds = aiResult.result.recommendations;
        return searchResults.filter(p => recommendedIds.includes(p.id));
      }
    } catch (error) {
      this.logger.warn('Failed to generate AI recommendations', error);
    }

    // Fallback to simple recommendation logic
    return searchResults
      .filter(p => p.rating >= 4.0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
  }

  private async generateSearchFilters(tenantId: string): Promise<any> {
    const [specializations, locations, priceStats, ratingStats] = await Promise.all([
      this.getAvailableSpecializations(tenantId),
      this.getAvailableLocations(tenantId),
      this.getPriceStatistics(tenantId),
      this.getRatingStatistics(tenantId)
    ]);

    return {
      availableSpecializations: specializations,
      availableLocations: locations,
      priceRange: priceStats,
      ratingRange: ratingStats
    };
  }

  private async validateProviderData(providerData: Partial<ILegalServiceProvider>): Promise<void> {
    if (!providerData.name) {
      throw new HttpException('Provider name is required', HttpStatus.BAD_REQUEST);
    }

    if (!providerData.barCouncilNumber) {
      throw new HttpException('Bar Council number is required', HttpStatus.BAD_REQUEST);
    }

    if (!providerData.contactDetails?.email) {
      throw new HttpException('Email address is required', HttpStatus.BAD_REQUEST);
    }

    if (!providerData.specializations || providerData.specializations.length === 0) {
      throw new HttpException('At least one specialization is required', HttpStatus.BAD_REQUEST);
    }

    // Additional validation logic...
  }

  private async processVerificationDocuments(
    files: Express.Multer.File[],
    tenantId: string
  ): Promise<any[]> {
    const documents = [];
    
    for (const file of files) {
      // Process and store verification document
      const documentData = {
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadDate: new Date(),
        // Additional document processing...
      };
      
      documents.push(documentData);
    }
    
    return documents;
  }

  private async createInitialAvailabilitySlots(
    queryRunner: QueryRunner,
    providerId: string
  ): Promise<void> {
    // Create availability slots for the next 30 days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 30);

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      // Create standard working hour slots (9 AM to 6 PM)
      for (let hour = 9; hour < 18; hour++) {
        const slot = queryRunner.manager.create(ProviderAvailabilitySlot, {
          providerId,
          slotDate: new Date(date),
          startTime: `${hour.toString().padStart(2, '0')}:00`,
          endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
          isAvailable: true,
          slotType: 'regular'
        });

        await queryRunner.manager.save(slot);
      }
    }
  }

  private async triggerProviderVerification(providerId: string): Promise<void> {
    // Emit verification event for background processing
    this.eventEmitter.emit('provider.verification_required', { providerId });
  }

  private async validateProviderAvailability(
    providerId: string,
    scheduledDate: Date,
    duration: number
  ): Promise<LegalServiceProvider> {
    const provider = await this.providerRepository.findOne({
      where: { 
        id: providerId, 
        verificationStatus: LegalProviderStatus.VERIFIED,
        availabilityStatus: LegalProviderAvailability.AVAILABLE
      }
    });

    if (!provider) {
      throw new HttpException('Provider not available', HttpStatus.BAD_REQUEST);
    }

    // Check specific time slot availability
    const isAvailable = await this.checkTimeSlotAvailability(providerId, scheduledDate, duration);
    
    if (!isAvailable) {
      throw new HttpException('Requested time slot not available', HttpStatus.CONFLICT);
    }

    return provider;
  }

  private async calculateBookingCost(
    provider: LegalServiceProvider,
    request: BookingRequest
  ): Promise<number> {
    let baseCost = 0;

    switch (request.serviceType) {
      case LegalServiceType.CONSULTATION:
        baseCost = provider.pricingStructure.consultationFee;
        break;
      case LegalServiceType.NOTICE_DRAFTING:
        baseCost = provider.pricingStructure.noticeFee;
        break;
      default:
        baseCost = provider.pricingStructure.hourlyRate * (request.duration / 60);
    }

    // Apply priority multiplier
    const priorityMultiplier = this.getPriorityMultiplier(request.priority);
    
    return baseCost * priorityMultiplier;
  }

  private getPriorityMultiplier(priority: LegalServicePriority): number {
    switch (priority) {
      case LegalServicePriority.EMERGENCY:
        return 2.0;
      case LegalServicePriority.URGENT:
        return 1.5;
      case LegalServicePriority.HIGH:
        return 1.2;
      default:
        return 1.0;
    }
  }

  private async blockAvailabilitySlot(
    queryRunner: QueryRunner,
    providerId: string,
    scheduledDate: Date,
    duration: number,
    bookingId: string
  ): Promise<void> {
    // Implementation to block availability slots for the booking duration
    const startHour = scheduledDate.getHours();
    const endHour = startHour + Math.ceil(duration / 60);

    for (let hour = startHour; hour < endHour; hour++) {
      await queryRunner.manager.update(
        ProviderAvailabilitySlot,
        {
          providerId,
          slotDate: scheduledDate,
          startTime: `${hour.toString().padStart(2, '0')}:00`
        },
        {
          isAvailable: false,
          bookingId
        }
      );
    }
  }

  private async createBookingStatusHistory(
    queryRunner: QueryRunner | null,
    bookingId: string,
    previousStatus: string | null,
    currentStatus: string,
    reason: string,
    changedBy: string
  ): Promise<void> {
    const statusHistory = {
      bookingId,
      previousStatus,
      currentStatus,
      changeReason: reason,
      changedBy
    };

    if (queryRunner) {
      await queryRunner.manager.save(BookingStatusHistory, statusHistory);
    } else {
      await this.bookingHistoryRepository.save(statusHistory);
    }
  }

  private async sendBookingNotifications(booking: LegalServiceBooking): Promise<void> {
    // Send notifications to both provider and client
    // Implementation would depend on notification service
  }

  private async calculateNoticeDispatchCost(
    provider: LegalServiceProvider,
    noticeRequest: ILegalNoticeRequest
  ): Promise<number> {
    let baseCost = provider.pricingStructure.noticeFee;

    // Apply delivery method cost
    const deliveryMultiplier = this.getDeliveryMethodMultiplier(noticeRequest.deliveryMethod);
    
    // Apply urgency multiplier
    const urgencyMultiplier = this.getPriorityMultiplier(noticeRequest.urgency);

    return baseCost * deliveryMultiplier * urgencyMultiplier;
  }

  private getDeliveryMethodMultiplier(method: LegalNoticeDeliveryMethod): number {
    switch (method) {
      case LegalNoticeDeliveryMethod.HAND_DELIVERY:
        return 2.0;
      case LegalNoticeDeliveryMethod.COURIER:
        return 1.5;
      case LegalNoticeDeliveryMethod.REGISTERED_POST:
        return 1.2;
      default:
        return 1.0;
    }
  }

  private calculateExpectedDeliveryDate(
    method: LegalNoticeDeliveryMethod,
    urgency: LegalServicePriority
  ): Date {
    const now = new Date();
    let days = 7; // Default delivery time

    switch (method) {
      case LegalNoticeDeliveryMethod.EMAIL:
        days = 1;
        break;
      case LegalNoticeDeliveryMethod.HAND_DELIVERY:
        days = 2;
        break;
      case LegalNoticeDeliveryMethod.COURIER:
        days = 3;
        break;
      case LegalNoticeDeliveryMethod.REGISTERED_POST:
        days = 7;
        break;
    }

    // Adjust for urgency
    if (urgency === LegalServicePriority.EMERGENCY) {
      days = Math.max(1, Math.floor(days / 2));
    } else if (urgency === LegalServicePriority.URGENT) {
      days = Math.max(1, Math.floor(days * 0.7));
    }

    const deliveryDate = new Date(now);
    deliveryDate.setDate(now.getDate() + days);
    return deliveryDate;
  }

  private calculateEstimatedResponseTime(noticeType: LegalNoticeType): number {
    switch (noticeType) {
      case LegalNoticeType.DEMAND_NOTICE:
        return 15; // 15 days
      case LegalNoticeType.LEGAL_NOTICE:
        return 30; // 30 days
      case LegalNoticeType.FINAL_NOTICE:
        return 7; // 7 days
      default:
        return 21; // 21 days
    }
  }

  private async createDeliveryAttempt(
    queryRunner: QueryRunner,
    noticeId: string,
    attemptNumber: number,
    deliveryMethod: LegalNoticeDeliveryMethod,
    status: LegalNoticeDeliveryStatus
  ): Promise<void> {
    const attempt = queryRunner.manager.create(NoticeDeliveryAttempt, {
      noticeId,
      attemptNumber,
      deliveryMethod,
      attemptStatus: status
    });

    await queryRunner.manager.save(attempt);
  }

  private async initiateNoticeDispatch(notice: LegalNoticeDispatch): Promise<void> {
    // Emit event for background processing
    this.eventEmitter.emit('notice.dispatch_initiated', {
      noticeId: notice.id,
      deliveryMethod: notice.deliveryMethod,
      urgency: notice.urgency
    });
  }

  private async updateNoticeDeliveryStatus(notice: LegalNoticeDispatch): Promise<void> {
    // Implementation to check and update delivery status
    // This would integrate with delivery service providers
  }

  private async calculateProviderMetrics(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // Calculate comprehensive provider metrics
    const bookings = await this.bookingRepository.find({
      where: {
        providerId,
        createdAt: {
          gte: startDate,
          lte: endDate
        } as any
      }
    });

    const reviews = await this.reviewRepository.find({
      where: {
        providerId,
        reviewDate: {
          gte: startDate,
          lte: endDate
        } as any
      }
    });

    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length || 0;
    const totalReviews = reviews.length;
    const revenue = bookings.reduce((sum, b) => sum + b.cost, 0);

    return {
      totalBookings,
      completedBookings,
      cancelledBookings,
      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews,
      responseTime: 0, // Would be calculated from actual response times
      successRate: totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0,
      revenue,
      clientSatisfaction: averageRating * 20, // Convert to percentage
      complianceScore: 100 // Would be calculated from compliance metrics
    };
  }

  private async calculatePerformanceTrends(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // Calculate performance trends
    return {
      bookingTrend: 'stable' as const,
      ratingTrend: 'stable' as const,
      performanceTrend: 'stable' as const
    };
  }

  private async updateProviderAvailabilityStatus(provider: LegalServiceProvider): Promise<void> {
    // Update provider availability based on working hours and current bookings
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.toLocaleLowerCase().substring(0, 3) + 'day'; // e.g., 'monday'

    // Check if provider is within working hours
    const workingHours = provider.workingHours[currentDay as keyof typeof provider.workingHours];
    const isWithinWorkingHours = workingHours?.some(slot => {
      const startHour = parseInt(slot.startTime.split(':')[0]);
      const endHour = parseInt(slot.endTime.split(':')[0]);
      return currentHour >= startHour && currentHour < endHour && slot.available;
    });

    if (isWithinWorkingHours) {
      provider.availabilityStatus = LegalProviderAvailability.AVAILABLE;
    } else {
      provider.availabilityStatus = LegalProviderAvailability.UNAVAILABLE;
    }

    await this.providerRepository.save(provider);
  }

  private async generateProviderDailyReport(providerId: string): Promise<void> {
    // Generate daily performance report for provider
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const today = new Date();
    
    const metrics = await this.calculateProviderMetrics(providerId, yesterday, today);
    
    // Store or send report
    this.logger.log(`Daily report generated for provider: ${providerId}`);
  }

  private async sendBookingReminder(booking: LegalServiceBooking): Promise<void> {
    // Send booking reminder notification
    booking.reminderSent = true;
    booking.reminderDate = new Date();
    await this.bookingRepository.save(booking);
  }

  private async checkTimeSlotAvailability(
    providerId: string,
    scheduledDate: Date,
    duration: number
  ): Promise<boolean> {
    // Check if the requested time slot is available
    const startHour = scheduledDate.getHours();
    const endHour = startHour + Math.ceil(duration / 60);

    const conflictingSlots = await this.availabilityRepository.count({
      where: {
        providerId,
        slotDate: scheduledDate,
        isAvailable: false,
        startTime: {
          gte: `${startHour.toString().padStart(2, '0')}:00`,
          lt: `${endHour.toString().padStart(2, '0')}:00`
        } as any
      }
    });

    return conflictingSlots === 0;
  }

  private async releaseAvailabilitySlot(providerId: string, scheduledDate: Date): Promise<void> {
    // Release availability slots when booking is cancelled
    await this.availabilityRepository.update(
      {
        providerId,
        slotDate: scheduledDate,
        isAvailable: false
      },
      {
        isAvailable: true,
        bookingId: null
      }
    );
  }

  private async updateProviderMetrics(providerId: string, successful: boolean): Promise<void> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId }
    });

    if (provider) {
      provider.updateSuccessRate(successful);
      provider.totalCasesHandled += 1;
      await this.providerRepository.save(provider);
    }
  }

  private async sendProviderNotification(
    providerId: string,
    notification: INotificationRequest
  ): Promise<void> {
    // Send notification to provider
    this.eventEmitter.emit('notification.send', {
      providerId,
      notification
    });
  }

  private async sendBookingStatusNotification(
    booking: LegalServiceBooking,
    previousStatus: string,
    newStatus: string
  ): Promise<void> {
    // Send status change notification
    this.eventEmitter.emit('booking.notification', {
      bookingId: booking.id,
      previousStatus,
      newStatus
    });
  }

  private async processAIRequest(request: IAIProcessingRequest): Promise<IAIProcessingResult> {
    // Process AI request for recommendations
    // This would integrate with actual AI service
    return {
      taskId: uuidv4(),
      taskType: request.taskType,
      status: AIProcessingStatus.COMPLETED,
      result: { recommendations: [] },
      confidence: 0.8,
      processingTime: 1000,
      model: AIModelType.DEEPSEEK_R1
    };
  }

  private async getAvailableSpecializations(tenantId: string): Promise<LegalSpecialization[]> {
    const result = await this.providerRepository
      .createQueryBuilder('provider')
      .select('DISTINCT unnest(provider.specializations)', 'specialization')
      .where('provider.tenantId = :tenantId', { tenantId })
      .andWhere('provider.isActive = true')
      .getRawMany();

    return result.map(r => r.specialization);
  }

  private async getAvailableLocations(tenantId: string): Promise<string[]> {
    const result = await this.providerRepository
      .createQueryBuilder('provider')
      .select("DISTINCT provider.location->>'city'", 'city')
      .where('provider.tenantId = :tenantId', { tenantId })
      .andWhere('provider.isActive = true')
      .getRawMany();

    return result.map(r => r.city).filter(Boolean);
  }

  private async getPriceStatistics(tenantId: string): Promise<{ min: number; max: number }> {
    const result = await this.providerRepository
      .createQueryBuilder('provider')
      .select('MIN((provider.pricingStructure->>\'consultationFee\')::numeric)', 'min')
      .addSelect('MAX((provider.pricingStructure->>\'consultationFee\')::numeric)', 'max')
      .where('provider.tenantId = :tenantId', { tenantId })
      .andWhere('provider.isActive = true')
      .getRawOne();

    return {
      min: parseFloat(result.min) || 0,
      max: parseFloat(result.max) || 0
    };
  }

  private async getRatingStatistics(tenantId: string): Promise<{ min: number; max: number }> {
    const result = await this.providerRepository
      .createQueryBuilder('provider')
      .select('MIN(provider.rating)', 'min')
      .addSelect('MAX(provider.rating)', 'max')
      .where('provider.tenantId = :tenantId', { tenantId })
      .andWhere('provider.isActive = true')
      .getRawOne();

    return {
      min: parseFloat(result.min) || 0,
      max: parseFloat(result.max) || 5
    };
  }

  private handleError(error: any): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    this.logger.error('Unhandled error in Legal Provider Service', error);
    
    return new HttpException(
      'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

