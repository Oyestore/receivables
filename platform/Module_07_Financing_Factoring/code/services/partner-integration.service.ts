import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancingPartner, FinancingApplication, PartnerWebhook, PartnerType, ApplicationStatus } from '../entities/partner.entity';
import axios from 'axios';
import * as crypto from 'crypto';

interface CreateApplicationDto {
    tenantId: string;
    userId: string;
    partnerId: string;
    financingType: string;
    invoiceIds: string[];
    totalInvoiceAmount: number;
    requestedAmount: number;
    businessName: string;
    businessPan: string;
    businessGstin?: string;
    annualRevenue?: number;
    yearsInBusiness?: number;
}

@Injectable()
export class PartnerIntegrationService {
    private readonly logger = new Logger(PartnerIntegrationService.name);

    constructor(
        @InjectRepository(FinancingPartner)
        private readonly partnerRepository: Repository<FinancingPartner>,
        @InjectRepository(FinancingApplication)
        private readonly applicationRepository: Repository<FinancingApplication>,
        @InjectRepository(PartnerWebhook)
        private readonly webhookRepository: Repository<PartnerWebhook>,
    ) { }

    /**
     * Get all active partners
     */
    async getActivePartners(): Promise<FinancingPartner[]> {
        return this.partnerRepository.find({
            where: { status: 'active' },
            order: { name: 'ASC' },
        });
    }

    /**
     * Get partner by ID
     */
    async getPartnerById(partnerId: string): Promise<FinancingPartner> {
        const partner = await this.partnerRepository.findOne({
            where: { id: partnerId },
        });

        if (!partner) {
            throw new HttpException('Partner not found', HttpStatus.NOT_FOUND);
        }

        return partner;
    }

    /**
     * Create financing application
     */
    async createApplication(dto: CreateApplicationDto): Promise<FinancingApplication> {
        const partner = await this.getPartnerById(dto.partnerId);

        // Validate amount
        if (dto.requestedAmount < partner.minInvoiceAmount || dto.requestedAmount > partner.maxInvoiceAmount) {
            throw new HttpException(
                `Amount must be between ₹${partner.minInvoiceAmount} and ₹${partner.maxInvoiceAmount}`,
                HttpStatus.BAD_REQUEST,
            );
        }

        // Generate application number
        const applicationNumber = this.generateApplicationNumber();

        const application = this.applicationRepository.create({
            ...dto,
            applicationNumber,
            status: ApplicationStatus.DRAFT,
            documents: [],
        });

        await this.applicationRepository.save(application);

        this.logger.log(`Created financing application ${applicationNumber}`);
        return application;
    }

    /**
     * Submit application to partner
     */
    async submitApplication(applicationId: string): Promise<FinancingApplication> {
        const application = await this.applicationRepository.findOne({
            where: { id: applicationId },
        });

        if (!application) {
            throw new HttpException('Application not found', HttpStatus.NOT_FOUND);
        }

        if (application.status !== ApplicationStatus.DRAFT) {
            throw new HttpException('Application already submitted', HttpStatus.BAD_REQUEST);
        }

        const partner = await this.getPartnerById(application.partnerId);

        try {
            // Submit to partner API
            const partnerResponse = await this.submitToPartner(partner, application);

            // Update application
            application.status = ApplicationStatus.SUBMITTED;
            application.submittedAt = new Date();
            application.partnerApplicationId = partnerResponse.applicationId;
            application.partnerResponse = partnerResponse;

            await this.applicationRepository.save(application);

            // Update partner stats
            partner.totalApplications++;
            await this.partnerRepository.save(partner);

            this.logger.log(`Submitted application ${application.applicationNumber} to ${partner.name}`);
            return application;
        } catch (error) {
            this.logger.error(`Failed to submit application: ${error.message}`);
            throw new HttpException(
                'Failed to submit application to partner',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get application status from partner
     */
    async checkApplicationStatus(applicationId: string): Promise<any> {
        const application = await this.applicationRepository.findOne({
            where: { id: applicationId },
        });

        if (!application) {
            throw new HttpException('Application not found', HttpStatus.NOT_FOUND);
        }

        const partner = await this.getPartnerById(application.partnerId);

        try {
            const status = await this.getStatusFromPartner(partner, application.partnerApplicationId);
            return status;
        } catch (error) {
            this.logger.error(`Failed to check status: ${error.message}`);
            throw new HttpException(
                'Failed to fetch application status',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get user's applications
     */
    async getUserApplications(userId: string): Promise<FinancingApplication[]> {
        return this.applicationRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Get application by ID
     */
    async getApplicationById(applicationId: string): Promise<FinancingApplication> {
        const application = await this.applicationRepository.findOne({
            where: { id: applicationId },
        });

        if (!application) {
            throw new HttpException('Application not found', HttpStatus.NOT_FOUND);
        }

        return application;
    }

    /**
     * Handle partner webhook
     */
    async handleWebhook(
        partnerId: string,
        payload: any,
        signature: string,
    ): Promise<void> {
        const partner = await this.getPartnerById(partnerId);

        // Verify webhook signature
        if (!this.verifyWebhookSignature(payload, signature, partner.webhookSecret)) {
            throw new HttpException('Invalid webhook signature', HttpStatus.UNAUTHORIZED);
        }

        // Store webhook
        const webhook = this.webhookRepository.create({
            partnerId,
            eventType: payload.event_type,
            payload,
            processed: false,
        });
        await this.webhookRepository.save(webhook);

        // Process webhook
        try {
            await this.processWebhook(webhook);
        } catch (error) {
            this.logger.error(`Failed to process webhook: ${error.message}`);
            webhook.errorMessage = error.message;
            await this.webhookRepository.save(webhook);
        }
    }

    /**
     * Get partner analytics
     */
    async getPartnerAnalytics(partnerId: string): Promise<any> {
        const partner = await this.getPartnerById(partnerId);

        const applications = await this.applicationRepository.find({
            where: { partnerId },
        });

        const approvalRate = partner.totalApplications > 0
            ? (partner.approvedApplications / partner.totalApplications) * 100
            : 0;

        const avgTicketSize = partner.approvedApplications > 0
            ? partner.totalFundedAmount / partner.approvedApplications
            : 0;

        const statusBreakdown = applications.reduce((acc, app) => {
            acc[app.status] = (acc[app.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            partnerId: partner.id,
            partnerName: partner.displayName,
            totalApplications: partner.totalApplications,
            approvedApplications: partner.approvedApplications,
            approvalRate: approvalRate.toFixed(2),
            totalFundedAmount: partner.totalFundedAmount,
            avgTicketSize: avgTicketSize.toFixed(2),
            avgApprovalTimeHours: partner.avgApprovalTimeHours || 0,
            statusBreakdown,
            terms: {
                minAmount: partner.minInvoiceAmount,
                maxAmount: partner.maxInvoiceAmount,
                discountRate: `${partner.minDiscountRate}-${partner.maxDiscountRate}%`,
                processingFee: `${partner.processingFeePercentage}%`,
                turnaroundDays: partner.typicalTurnaroundDays,
            },
        };
    }

    /**
     * Compare partners for a specific financing request
     */
    async comparePartners(requestedAmount: number): Promise<any[]> {
        const partners = await this.partnerRepository.find({
            where: { status: 'active' },
        });

        return partners
            .filter((p) => requestedAmount >= p.minInvoiceAmount && requestedAmount <= p.maxInvoiceAmount)
            .map((partner) => {
                const approvalRate = partner.totalApplications > 0
                    ? (partner.approvedApplications / partner.totalApplications) * 100
                    : 0;

                // Calculate estimated cost
                const estimatedRate = (partner.minDiscountRate + partner.maxDiscountRate) / 2;
                const estimatedProcessingFee = (requestedAmount * partner.processingFeePercentage) / 100;
                const estimatedInterest = (requestedAmount * estimatedRate) / 100;
                const estimatedNetAmount = requestedAmount - estimatedProcessingFee - estimatedInterest;

                return {
                    partnerId: partner.id,
                    partnerName: partner.displayName,
                    logoUrl: partner.logoUrl,
                    eligible: true,
                    approvalRate: approvalRate.toFixed(2),
                    estimatedRate: estimatedRate.toFixed(2),
                    processingFee: estimatedProcessingFee.toFixed(2),
                    estimatedNetAmount: estimatedNetAmount.toFixed(2),
                    turnaroundDays: partner.typicalTurnaroundDays,
                    totalFunded: partner.totalFundedAmount,
                };
            })
            .sort((a, b) => parseFloat(b.estimatedNetAmount) - parseFloat(a.estimatedNetAmount));
    }

    /**
     * Helper: Submit to partner API
     */
    private async submitToPartner(
        partner: FinancingPartner,
        application: FinancingApplication,
    ): Promise<any> {
        // This is a generic implementation
        // In production, implement specific adapters for each partner

        const payload = {
            application_number: application.applicationNumber,
            financing_type: application.financingType,
            requested_amount: application.requestedAmount,
            business_name: application.businessName,
            business_pan: application.businessPan,
            business_gstin: application.businessGstin,
            annual_revenue: application.annualRevenue,
            invoice_ids: application.invoiceIds,
            total_invoice_amount: application.totalInvoiceAmount,
        };

        const response = await axios.post(
            `${partner.apiBaseUrl}/applications`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${partner.apiKey}`,
                    'Content-Type': 'application/json',
                },
            },
        );

        return response.data;
    }

    /**
     * Helper: Get status from partner
     */
    private async getStatusFromPartner(
        partner: FinancingPartner,
        partnerApplicationId: string,
    ): Promise<any> {
        const response = await axios.get(
            `${partner.apiBaseUrl}/applications/${partnerApplicationId}`,
            {
                headers: {
                    'Authorization': `Bearer ${partner.apiKey}`,
                },
            },
        );

        return response.data;
    }

    /**
     * Helper: Process webhook
     */
    private async processWebhook(webhook: PartnerWebhook): Promise<void> {
        const { event_type, application_id, status, data } = webhook.payload;

        if (!application_id) {
            webhook.processed = true;
            webhook.processedAt = new Date();
            await this.webhookRepository.save(webhook);
            return;
        }

        // Find application by partner application ID
        const application = await this.applicationRepository.findOne({
            where: { partnerApplicationId: application_id },
        });

        if (!application) {
            throw new Error(`Application not found for partner ID: ${application_id}`);
        }

        // Update application based on event type
        switch (event_type) {
            case 'application.approved':
                application.status = ApplicationStatus.APPROVED;
                application.approvedAt = new Date();
                application.approvedAmount = data.approved_amount;
                application.discountRate = data.discount_rate;
                application.processingFee = data.processing_fee;
                application.netAmount = data.net_amount;

                // Update partner stats
                const partner = await this.getPartnerById(webhook.partnerId);
                partner.approvedApplications++;
                partner.totalFundedAmount += data.net_amount;
                await this.partnerRepository.save(partner);
                break;

            case 'application.rejected':
                application.status = ApplicationStatus.REJECTED;
                application.rejectedAt = new Date();
                application.rejectionReason = data.reason;
                break;

            case 'disbursement.completed':
                application.status = ApplicationStatus.DISBURSED;
                application.disbursedAt = new Date();
                break;

            default:
                this.logger.warn(`Unknown webhook event type: ${event_type}`);
        }

        await this.applicationRepository.save(application);

        webhook.applicationId = application.id;
        webhook.processed = true;
        webhook.processedAt = new Date();
        await this.webhookRepository.save(webhook);

        this.logger.log(`Processed webhook for application ${application.applicationNumber}`);
    }

    /**
     * Helper: Verify webhook signature
     */
    private verifyWebhookSignature(payload: any, signature: string, secret: string): boolean {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(JSON.stringify(payload));
        const expectedSignature = hmac.digest('hex');
        return signature === expectedSignature;
    }

    /**
     * Helper: Generate application number
     */
    private generateApplicationNumber(): string {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `FIN-${timestamp}-${random}`;
    }
}
