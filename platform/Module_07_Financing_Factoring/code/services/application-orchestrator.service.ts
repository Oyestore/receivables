import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
    FinancingApplication,
    FinancingApplicationStatus,
    FinancingPriority,
} from '../entities/financing-application.entity';
import {
    CreateApplicationDto,
    SubmitApplicationDto,
    FinancingPurpose,
} from '../dto/application.dto';

/**
 * Application Orchestrator Service
 * 
 * Coordinates multi-partner financing workflows:
 * - Creates unified applications
 * - Enriches with platform data from other modules
 * - Routes to appropriate partner(s)
 * - Manages auction workflows
 * - Tracks application lifecycle
 */
@Injectable()
export class ApplicationOrchestratorService {
    private readonly logger = new Logger(ApplicationOrchestratorService.name);

    constructor(
        @InjectRepository(FinancingApplication)
        private readonly applicationRepository: Repository<FinancingApplication>,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    /**
     * Create a new financing application
     * Enriches with data from other modules (invoices, credit scores, etc.)
     */
    async createApplication(
        tenantId: string,
        userId: string,
        dto: CreateApplicationDto,
    ): Promise<FinancingApplication> {
        this.logger.log(`Creating application for tenant ${tenantId}, user ${userId}`);

        try {
            // 1. Generate unique application number
            const applicationNumber = await this.generateApplicationNumber();

            // 2. Enrich business profile with platform data
            const enrichedProfile = await this.enrichBusinessProfile(
                tenantId,
                userId,
                dto.businessDetails,
            );

            // 3. Validate invoice IDs if provided
            if (dto.invoiceIds && dto.invoiceIds.length > 0) {
                await this.validateInvoices(tenantId, dto.invoiceIds);
            }

            // 4. Calculate priority
            const priority = this.calculatePriority(dto.requestedAmount, dto.urgency);

            // 5. Create application record
            const application = this.applicationRepository.create({
                applicationNumber,
                tenantId,
                userId,
                financingType: dto.financingType,
                requestedAmount: dto.requestedAmount,
                status: FinancingApplicationStatus.DRAFT,
                priority,

                businessDetails: {
                    ...dto.businessDetails,
                    ...enrichedProfile,
                },

                invoiceDetails: dto.invoiceIds ? {
                    invoiceIds: dto.invoiceIds,
                    totalInvoiceAmount: 0, // Will be calculated
                    averageInvoiceAge: 0,
                } : undefined,

                metadata: {
                    urgency: dto.urgency,
                    preferences: dto.preferences || {},
                    source: 'web_app',
                    createdFrom: 'unified_application_controller',
                    ...dto.metadata,
                },

                createdBy: userId,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const saved = await this.applicationRepository.save(application);

            // 6. Emit application created event
            this.eventEmitter.emit('financing.application.created', {
                applicationId: saved.id,
                tenantId,
                userId,
                amount: saved.requestedAmount,
                type: saved.financingType,
            });

            this.logger.log(`Application created: ${saved.id} (${applicationNumber})`);

            return saved;

        } catch (error) {
            this.logger.error(`Failed to create application: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Submit application to selected partner(s)
     * Handles both single-partner and multi-partner auction modes
     */
    async submitToPartners(
        applicationId: string,
        userId: string,
        dto: SubmitApplicationDto,
    ): Promise<any> {
        this.logger.log(`Submitting application ${applicationId} to partners: ${dto.partnerIds.join(', ')}`);

        // 1. Get application
        const application = await this.getApplicationById(applicationId);

        // 2. Verify ownership
        if (application.userId !== userId) {
            throw new BadRequestException('Not authorized to submit this application');
        }

        // 3. Verify status
        if (application.status !== FinancingApplicationStatus.DRAFT) {
            throw new BadRequestException(`Application already submitted (status: ${application.status})`);
        }

        // 4. Update status
        application.status = FinancingApplicationStatus.SUBMITTED;
        application.submittedAt = new Date();
        application.updatedBy = userId;
        application.updatedAt = new Date();

        await this.applicationRepository.save(application);

        // 5. Route based on mode
        let result;
        if (dto.mode === 'auction' || dto.partnerIds.length > 1) {
            // Multi-partner auction (will be implemented in Phase 4)
            result = await this.submitToMultiplePartners(application, dto.partnerIds);
        } else {
            // Single partner submission
            result = await this.submitToSinglePartner(application, dto.partnerIds[0]);
        }

        // 6. Emit submission event
        this.eventEmitter.emit('financing.application.submitted', {
            applicationId: application.id,
            partnerIds: dto.partnerIds,
            mode: dto.mode || 'single',
        });

        return result;
    }

    /**
     * Run multi-partner auction
     * (Phase 4 implementation - stub for now)
     */
    async runAuction(applicationId: string, preferences?: any): Promise<any> {
        this.logger.log(`Running auction for application ${applicationId}`);

        const application = await this.getApplicationById(applicationId);

        // TODO: Implement in Phase 4 (Auction Engine)
        // For now, return placeholder
        return {
            auctionId: `auction_${Date.now()}`,
            applicationId: application.id,
            status: 'pending_implementation',
            message: 'Auction engine will be implemented in Phase 4',
            rankedOffers: [],
        };
    }

    /**
     * Get application by ID
     */
    async getApplicationById(applicationId: string): Promise<FinancingApplication> {
        const application = await this.applicationRepository.findOne({
            where: { id: applicationId },
        });

        if (!application) {
            throw new NotFoundException(`Application ${applicationId} not found`);
        }

        return application;
    }

    /**
     * List applications with filters
     */
    async listApplications(
        tenantId: string,
        userId: string,
        filters: any = {},
    ): Promise<{ applications: FinancingApplication[]; total: number }> {
        const query = this.applicationRepository
            .createQueryBuilder('app')
            .where('app.tenantId = :tenantId', { tenantId })
            .andWhere('app.userId = :userId', { userId });

        // Apply filters
        if (filters.status) {
            query.andWhere('app.status = :status', { status: filters.status });
        }

        if (filters.financingType) {
            query.andWhere('app.financingType = :financingType', { financingType: filters.financingType });
        }

        if (filters.dateFrom) {
            query.andWhere('app.createdAt >= :dateFrom', { dateFrom: new Date(filters.dateFrom) });
        }

        if (filters.dateTo) {
            query.andWhere('app.createdAt <= :dateTo', { dateTo: new Date(filters.dateTo) });
        }

        // Count total
        const total = await query.getCount();

        // Apply pagination
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;

        query.skip(skip).take(limit);
        query.orderBy('app.createdAt', 'DESC');

        const applications = await query.getMany();

        return { applications, total };
    }

    // ============================================
    // Private Helper Methods
    // ============================================

    /**
     * Generate unique application number
     */
    private async generateApplicationNumber(): Promise<string> {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `FIN${timestamp}${random}`;
    }

    /**
     * Enrich business profile with platform data
     * Fetches credit score from Module 06, invoice history from Module 01, etc.
     */
    private async enrichBusinessProfile(
        tenantId: string,
        userId: string,
        businessDetails: any,
    ): Promise<any> {
        const enriched: any = {};

        try {
            // TODO: Integrate with Module 06 (Credit Scoring) - Phase 3
            // const creditScore = await this.creditScoringService.getScore(tenantId);
            // enriched.creditScore = creditScore;

            // TODO: Integrate with Module 01 (Invoice Management) - Phase 3
            // const invoiceMetrics = await this.invoiceService.getMetrics(tenantId);
            // enriched.invoiceHistory = invoiceMetrics;

            // TODO: Integrate with Module 03 (Payments) - Phase 3
            // const paymentMetrics = await this.paymentService.getMetrics(tenantId);
            // enriched.paymentBehavior = paymentMetrics;

            // For now, return empty enrichment (will be filled in Phase 3)
            this.logger.debug('Business profile enrichment will be implemented in Phase 3');

        } catch (error) {
            this.logger.warn(`Failed to enrich business profile: ${error.message}`);
            // Continue even if enrichment fails
        }

        return enriched;
    }

    /**
     * Validate invoice IDs exist and belong to tenant
     */
    private async validateInvoices(tenantId: string, invoiceIds: string[]): Promise<void> {
        // TODO: Integrate with Module 01 - Phase 3
        // For now, accept any invoice IDs
        this.logger.debug(`Invoice validation will be implemented in Phase 3 for ${invoiceIds.length} invoices`);
    }

    /**
     * Calculate application priority based on amount and urgency
     */
    private calculatePriority(amount: number, urgency: string): FinancingPriority {
        // High amount + urgent = URGENT
        if (amount > 10000000 && urgency === 'same_day') {
            return FinancingPriority.URGENT;
        }

        // High amount = HIGH
        if (amount > 5000000) {
            return FinancingPriority.HIGH;
        }

        // Urgent but lower amount = HIGH
        if (urgency === 'same_day') {
            return FinancingPriority.HIGH;
        }

        // Medium amount = MEDIUM
        if (amount > 1000000) {
            return FinancingPriority.MEDIUM;
        }

        return FinancingPriority.LOW;
    }

    /**
     * Submit to single partner
     * (Uses existing partner services)
     */
    private async submitToSinglePartner(
        application: FinancingApplication,
        partnerId: string,
    ): Promise<any> {
        this.logger.log(`Submitting to single partner: ${partnerId}`);

        // TODO: Use PartnerIntegrationService - will be refactored in Phase 2
        // For now, return placeholder
        return {
            partnerId,
            status: 'submitted',
            externalApplicationId: `ext_${Date.now()}`,
            message: 'Submitted to partner (integration in Phase 2)',
        };
    }

    /**
     * Submit to multiple partners
     * (Phase 4 - Auction Engine)
     */
    private async submitToMultiplePartners(
        application: FinancingApplication,
        partnerIds: string[],
    ): Promise<any> {
        this.logger.log(`Submitting to ${partnerIds.length} partners for auction`);

        // TODO: Implement auction logic in Phase 4
        return {
            mode: 'auction',
            partnerIds,
            status: 'pending_auction',
            message: 'Multi-partner auction will be implemented in Phase 4',
        };
    }
}
