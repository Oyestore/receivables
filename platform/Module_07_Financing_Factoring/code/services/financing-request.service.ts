import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancingApplication, FinancingApplicationStatus, FinancingPriority } from '../entities/financing-application.entity';
import { FinancingOffer, OfferStatus, OfferType } from '../entities/financing-offer.entity';
import { FinancingProvider } from '../entities/financing-offer.entity';
import { FinancingProduct } from '../entities/financing-offer.entity';
import { FinancingRiskAssessment, RiskLevel, RiskCategory } from '../entities/financing-risk-assessment.entity';
import { PartnerIntegrationService } from './partner-integration.service';

export interface CreateApplicationDto {
    tenantId: string;
    userId: string;
    partnerId: string;
    financingType: string;
    requestedAmount: number;
    businessDetails: any;
    invoiceDetails?: any;
    financialDetails?: any;
}

export interface ApplicationQueryDto {
    status?: FinancingApplicationStatus;
    priority?: FinancingPriority;
    partnerId?: string;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
}

@Injectable()
export class FinancingRequestService {
    private readonly logger = new Logger(FinancingRequestService.name);

    constructor(
        @InjectRepository(FinancingApplication)
        private readonly applicationRepository: Repository<FinancingApplication>,
        @InjectRepository(FinancingOffer)
        private readonly offerRepository: Repository<FinancingOffer>,
        @InjectRepository(FinancingProvider)
        private readonly providerRepository: Repository<FinancingProvider>,
        @InjectRepository(FinancingProduct)
        private readonly productRepository: Repository<FinancingProduct>,
        @InjectRepository(FinancingRiskAssessment)
        private readonly riskAssessmentRepository: Repository<FinancingRiskAssessment>,
        private readonly partnerIntegrationService: PartnerIntegrationService,
    ) {}

    /**
     * Create a new financing application
     */
    async createApplication(createDto: CreateApplicationDto): Promise<FinancingApplication> {
        this.logger.log(`Creating financing application for tenant: ${createDto.tenantId}`);

        // Generate application number
        const applicationNumber = await this.generateApplicationNumber();

        // Create application
        const application = this.applicationRepository.create({
            applicationNumber,
            tenantId: createDto.tenantId,
            userId: createDto.userId,
            partnerId: createDto.partnerId,
            financingType: createDto.financingType,
            requestedAmount: createDto.requestedAmount,
            businessDetails: createDto.businessDetails,
            invoiceDetails: createDto.invoiceDetails,
            financialDetails: createDto.financialDetails,
            status: FinancingApplicationStatus.DRAFT,
            priority: this.calculatePriority(createDto.requestedAmount, createDto.businessDetails),
            nextAction: 'complete_documentation',
            nextActionDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            createdBy: createDto.userId,
        });

        return await this.applicationRepository.save(application);
    }

    /**
     * Submit application to partner
     */
    async submitApplication(applicationId: string, userId: string): Promise<FinancingApplication> {
        this.logger.log(`Submitting application ${applicationId}`);

        const application = await this.applicationRepository.findOne({
            where: { id: applicationId },
            relations: ['partner'],
        });

        if (!application) {
            throw new Error('Application not found');
        }

        if (application.status !== FinancingApplicationStatus.DRAFT) {
            throw new Error('Application can only be submitted from draft status');
        }

        // Submit to partner
        const partnerResponse = await this.partnerIntegrationService.submitApplication(
            application.partnerId,
            {
                applicationId: application.id,
                applicationNumber: application.applicationNumber,
                businessDetails: application.businessDetails,
                invoiceDetails: application.invoiceDetails,
                financialDetails: application.financialDetails,
                requestedAmount: application.requestedAmount,
            }
        );

        // Update application
        application.status = FinancingApplicationStatus.SUBMITTED;
        application.externalApplicationId = partnerResponse.externalApplicationId;
        application.externalStatus = partnerResponse.status;
        application.submittedAt = new Date();
        application.nextAction = 'awaiting_partner_response';
        application.updatedBy = userId;

        return await this.applicationRepository.save(application);
    }

    /**
     * Get application by ID
     */
    async getApplicationById(applicationId: string): Promise<FinancingApplication> {
        return await this.applicationRepository.findOne({
            where: { id: applicationId },
            relations: ['partner', 'offers', 'transactions', 'documents'],
        });
    }

    /**
     * Get applications with filters
     */
    async getApplications(query: ApplicationQueryDto): Promise<{ applications: FinancingApplication[]; total: number }> {
        const { status, priority, partnerId, userId, dateFrom, dateTo, page = 1, limit = 10 } = query;

        const queryBuilder = this.applicationRepository
            .createQueryBuilder('application')
            .leftJoinAndSelect('application.partner', 'partner')
            .leftJoinAndSelect('application.offers', 'offers')
            .leftJoinAndSelect('application.transactions', 'transactions')
            .leftJoinAndSelect('application.documents', 'documents');

        if (status) {
            queryBuilder.andWhere('application.status = :status', { status });
        }

        if (priority) {
            queryBuilder.andWhere('application.priority = :priority', { priority });
        }

        if (partnerId) {
            queryBuilder.andWhere('application.partnerId = :partnerId', { partnerId });
        }

        if (userId) {
            queryBuilder.andWhere('application.userId = :userId', { userId });
        }

        if (dateFrom) {
            queryBuilder.andWhere('application.createdAt >= :dateFrom', { dateFrom });
        }

        if (dateTo) {
            queryBuilder.andWhere('application.createdAt <= :dateTo', { dateTo });
        }

        const total = await queryBuilder.getCount();

        queryBuilder
            .orderBy('application.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        const applications = await queryBuilder.getMany();

        return { applications, total };
    }

    /**
     * Update application status
     */
    async updateApplicationStatus(
        applicationId: string,
        status: FinancingApplicationStatus,
        userId: string,
        reason?: string
    ): Promise<FinancingApplication> {
        const application = await this.applicationRepository.findOne({
            where: { id: applicationId },
        });

        if (!application) {
            throw new Error('Application not found');
        }

        application.status = status;
        application.updatedBy = userId;

        if (reason) {
            application.rejectionReason = reason;
        }

        // Update timestamps based on status
        switch (status) {
            case FinancingApplicationStatus.APPROVED:
                application.approvedAt = new Date();
                application.nextAction = 'accept_offer';
                break;
            case FinancingApplicationStatus.REJECTED:
                application.nextAction = 'reconsider_or_resubmit';
                break;
            case FinancingApplicationStatus.DISBURSED:
                application.disbursedAt = new Date();
                application.nextAction = 'repayment_schedule';
                break;
            case FinancingApplicationStatus.COMPLETED:
                application.completedAt = new Date();
                application.nextAction = null;
                break;
        }

        return await this.applicationRepository.save(application);
    }

    /**
     * Get applications by user
     */
    async getUserApplications(userId: string, tenantId: string): Promise<FinancingApplication[]> {
        return await this.applicationRepository.find({
            where: { userId, tenantId },
            relations: ['partner', 'offers'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Get application statistics
     */
    async getApplicationStatistics(tenantId?: string): Promise<any> {
        const queryBuilder = this.applicationRepository.createQueryBuilder('application');

        if (tenantId) {
            queryBuilder.where('application.tenantId = :tenantId', { tenantId });
        }

        const total = await queryBuilder.getCount();
        
        const statusStats = await queryBuilder
            .select('application.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('application.status')
            .getRawMany();

        const priorityStats = await queryBuilder
            .select('application.priority', 'priority')
            .addSelect('COUNT(*)', 'count')
            .groupBy('application.priority')
            .getRawMany();

        const totalRequestedAmount = await queryBuilder
            .select('SUM(application.requestedAmount)', 'total')
            .getRawOne();

        const totalApprovedAmount = await queryBuilder
            .select('SUM(application.approvedAmount)', 'total')
            .where('application.status = :status', { status: FinancingApplicationStatus.APPROVED })
            .getRawOne();

        return {
            totalApplications: total,
            statusBreakdown: statusStats,
            priorityBreakdown: priorityStats,
            totalRequestedAmount: totalRequestedAmount?.total || 0,
            totalApprovedAmount: totalApprovedAmount?.total || 0,
        };
    }

    /**
     * Generate unique application number
     */
    private async generateApplicationNumber(): Promise<string> {
        const prefix = 'FA';
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        
        // Get count for this month
        const count = await this.applicationRepository
            .createQueryBuilder('app')
            .where('app.applicationNumber LIKE :pattern', { pattern: `${prefix}${year}${month}%` })
            .getCount();

        const sequence = String(count + 1).padStart(4, '0');
        return `${prefix}${year}${month}${sequence}`;
    }

    /**
     * Calculate application priority based on amount and business details
     */
    private calculatePriority(requestedAmount: number, businessDetails: any): FinancingPriority {
        // High amount applications get higher priority
        if (requestedAmount > 10000000) { // > 1 crore
            return FinancingPriority.HIGH;
        }

        // Established businesses get higher priority
        if (businessDetails.yearsInBusiness > 5 && businessDetails.annualRevenue > 50000000) {
            return FinancingPriority.MEDIUM;
        }

        return FinancingPriority.LOW;
    }

    /**
     * Get pending actions for applications
     */
    async getPendingActions(tenantId?: string): Promise<any[]> {
        const queryBuilder = this.applicationRepository
            .createQueryBuilder('application')
            .where('application.nextAction IS NOT NULL')
            .andWhere('application.nextActionDue <= :now', { now: new Date() });

        if (tenantId) {
            queryBuilder.andWhere('application.tenantId = :tenantId', { tenantId });
        }

        return await queryBuilder
            .leftJoinAndSelect('application.partner', 'partner')
            .select([
                'application.id',
                'application.applicationNumber',
                'application.nextAction',
                'application.nextActionDue',
                'application.status',
                'partner.name',
            ])
            .orderBy('application.nextActionDue', 'ASC')
            .getMany();
    }

    /**
     * Bulk update application statuses
     */
    async bulkUpdateStatus(applicationIds: string[], status: FinancingApplicationStatus, userId: string): Promise<void> {
        await this.applicationRepository
            .createQueryBuilder()
            .update(FinancingApplication)
            .set({ 
                status, 
                updatedBy: userId,
                updatedAt: new Date(),
            })
            .where('id IN (:...ids)', { ids: applicationIds })
            .execute();
    }
}
