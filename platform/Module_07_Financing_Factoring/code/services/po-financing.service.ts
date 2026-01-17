import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { POFinancingRequest } from '../entities/financing-risk-assessment.entity';
import { FinancingApplication, FinancingApplicationStatus } from '../entities/financing-application.entity';
import { PartnerIntegrationService } from './partner-integration.service';
import { FinancingRiskAssessmentService } from './financing-risk-assessment.service';

export interface CreatePOFinancingDto {
    tenantId: string;
    userId: string;
    poNumber: string;
    poDate: Date;
    buyerName: string;
    buyerGstin?: string;
    supplierName: string;
    supplierGstin?: string;
    poAmount: number;
    financingPercentage: number;
    purchaseOrderDetails: any;
    buyerDetails?: any;
    supplierDetails?: any;
    documents: any;
}

export interface POFinancingQueryDto {
    status?: string;
    buyerName?: string;
    supplierName?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
}

@Injectable()
export class POFinancingService {
    private readonly logger = new Logger(POFinancingService.name);

    constructor(
        @InjectRepository(POFinancingRequest)
        private readonly poFinancingRepository: Repository<POFinancingRequest>,
        @InjectRepository(FinancingApplication)
        private readonly applicationRepository: Repository<FinancingApplication>,
        private readonly partnerIntegrationService: PartnerIntegrationService,
        private readonly riskAssessmentService: FinancingRiskAssessmentService,
    ) {}

    /**
     * Create a new PO financing request
     */
    async createPOFinancingRequest(createDto: CreatePOFinancingDto): Promise<POFinancingRequest> {
        this.logger.log(`Creating PO financing request for PO: ${createDto.poNumber}`);

        // Generate request number
        const requestNumber = await this.generateRequestNumber();

        // Calculate financing amount
        const financingAmount = (createDto.poAmount * createDto.financingPercentage) / 100;

        // Create PO financing request
        const poRequest = this.poFinancingRepository.create({
            requestNumber,
            tenantId: createDto.tenantId,
            userId: createDto.userId,
            poNumber: createDto.poNumber,
            poDate: createDto.poDate,
            buyerName: createDto.buyerName,
            buyerGstin: createDto.buyerGstin,
            supplierName: createDto.supplierName,
            supplierGstin: createDto.supplierGstin,
            poAmount: createDto.poAmount,
            financingAmount,
            financingPercentage: createDto.financingPercentage,
            purchaseOrderDetails: createDto.purchaseOrderDetails,
            buyerDetails: createDto.buyerDetails,
            supplierDetails: createDto.supplierDetails,
            documents: createDto.documents,
            status: 'pending',
            createdBy: createDto.userId,
        });

        return await this.poFinancingRepository.save(poRequest);
    }

    /**
     * Submit PO financing request for approval
     */
    async submitPOFinancingRequest(requestId: string, userId: string): Promise<POFinancingRequest> {
        this.logger.log(`Submitting PO financing request: ${requestId}`);

        const poRequest = await this.poFinancingRepository.findOne({
            where: { id: requestId },
        });

        if (!poRequest) {
            throw new Error('PO financing request not found');
        }

        if (poRequest.status !== 'pending') {
            throw new Error('Request can only be submitted from pending status');
        }

        // Perform risk assessment
        const riskAssessment = await this.performRiskAssessment(poRequest);

        // Submit to financing partners
        const partnerResponses = await this.submitToPartners(poRequest, riskAssessment);

        // Update request status
        poRequest.status = 'submitted';
        poRequest.submittedAt = new Date();
        poRequest.updatedBy = userId;

        // Store partner responses in metadata
        poRequest.metadata = {
            ...poRequest.metadata,
            partnerResponses,
            riskAssessmentId: riskAssessment.id,
        };

        return await this.poFinancingRepository.save(poRequest);
    }

    /**
     * Get PO financing request by ID
     */
    async getPOFinancingRequest(requestId: string): Promise<POFinancingRequest> {
        return await this.poFinancingRepository.findOne({
            where: { id: requestId },
        });
    }

    /**
     * Get PO financing requests with filters
     */
    async getPOFinancingRequests(query: POFinancingQueryDto): Promise<{ requests: POFinancingRequest[]; total: number }> {
        const { status, buyerName, supplierName, dateFrom, dateTo, page = 1, limit = 10 } = query;

        const queryBuilder = this.poFinancingRepository.createQueryBuilder('poRequest');

        if (status) {
            queryBuilder.andWhere('poRequest.status = :status', { status });
        }

        if (buyerName) {
            queryBuilder.andWhere('poRequest.buyerName ILIKE :buyerName', { buyerName: `%${buyerName}%` });
        }

        if (supplierName) {
            queryBuilder.andWhere('poRequest.supplierName ILIKE :supplierName', { supplierName: `%${supplierName}%` });
        }

        if (dateFrom) {
            queryBuilder.andWhere('poRequest.createdAt >= :dateFrom', { dateFrom });
        }

        if (dateTo) {
            queryBuilder.andWhere('poRequest.createdAt <= :dateTo', { dateTo });
        }

        const total = await queryBuilder.getCount();

        queryBuilder
            .orderBy('poRequest.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        const requests = await queryBuilder.getMany();

        return { requests, total };
    }

    /**
     * Update PO financing request status
     */
    async updatePOFinancingRequestStatus(
        requestId: string,
        status: string,
        userId: string,
        reason?: string
    ): Promise<POFinancingRequest> {
        const poRequest = await this.poFinancingRepository.findOne({
            where: { id: requestId },
        });

        if (!poRequest) {
            throw new Error('PO financing request not found');
        }

        poRequest.status = status;
        poRequest.updatedBy = userId;

        if (reason) {
            poRequest.rejectionReason = reason;
        }

        // Update timestamps based on status
        switch (status) {
            case 'approved':
                poRequest.approvedAt = new Date();
                break;
            case 'disbursed':
                poRequest.disbursedAt = new Date();
                break;
            case 'completed':
                poRequest.completedAt = new Date();
                break;
        }

        return await this.poFinancingRepository.save(poRequest);
    }

    /**
     * Perform risk assessment for PO financing
     */
    private async performRiskAssessment(poRequest: POFinancingRequest): Promise<any> {
        // Combine buyer and supplier details for comprehensive assessment
        const combinedBusinessDetails = {
            businessName: poRequest.supplierName,
            gstin: poRequest.supplierGstin,
            industry: poRequest.supplierDetails?.industry || 'manufacturing',
            yearsInBusiness: poRequest.supplierDetails?.yearsInBusiness || 3,
            annualRevenue: poRequest.supplierDetails?.annualRevenue || 5000000,
        };

        const financialDetails = {
            creditScore: poRequest.supplierDetails?.creditScore || 650,
            debtToEquityRatio: poRequest.supplierDetails?.debtToEquityRatio || 1.5,
            currentRatio: poRequest.supplierDetails?.currentRatio || 1.2,
            netMargin: poRequest.supplierDetails?.netMargin || 0.08,
        };

        const invoiceDetails = {
            paymentHistory: poRequest.buyerDetails?.paymentHistory || 'good',
            customerConcentration: 0.7, // Buyer concentration
        };

        // Create a temporary financing application for risk assessment
        const tempApplication = await this.applicationRepository.create({
            applicationNumber: `TEMP_${poRequest.requestNumber}`,
            tenantId: poRequest.tenantId,
            userId: poRequest.userId,
            partnerId: 'system', // System-generated assessment
            financingType: 'supply_chain',
            requestedAmount: poRequest.financingAmount,
            businessDetails: combinedBusinessDetails,
            financialDetails,
            invoiceDetails,
            status: FinancingApplicationStatus.DRAFT,
        });

        const savedApplication = await this.applicationRepository.save(tempApplication);

        // Perform risk assessment
        const riskAssessment = await this.riskAssessmentService.performRiskAssessment(
            savedApplication.id,
            {
                businessDetails: combinedBusinessDetails,
                financialDetails,
                invoiceDetails,
            },
            'system'
        );

        // Clean up temporary application
        await this.applicationRepository.remove(savedApplication);

        return riskAssessment;
    }

    /**
     * Submit PO financing request to multiple partners
     */
    private async submitToPartners(poRequest: POFinancingRequest, riskAssessment: any): Promise<any[]> {
        const partners = await this.partnerIntegrationService.getActivePartners();
        const partnerResponses = [];

        for (const partner of partners) {
            try {
                const response = await this.partnerIntegrationService.submitPOFinancingRequest(
                    partner.id,
                    {
                        requestId: poRequest.id,
                        requestNumber: poRequest.requestNumber,
                        poDetails: poRequest.purchaseOrderDetails,
                        buyerDetails: poRequest.buyerDetails,
                        supplierDetails: poRequest.supplierDetails,
                        financingAmount: poRequest.financingAmount,
                        riskAssessment: {
                            creditScore: riskAssessment.creditScore,
                            riskLevel: riskAssessment.riskLevel,
                            probabilityOfDefault: riskAssessment.probabilityOfDefault,
                        },
                    }
                );

                partnerResponses.push({
                    partnerId: partner.id,
                    partnerName: partner.name,
                    status: 'success',
                    response,
                });
            } catch (error) {
                this.logger.error(`Failed to submit to partner ${partner.name}:`, error);
                partnerResponses.push({
                    partnerId: partner.id,
                    partnerName: partner.name,
                    status: 'error',
                    error: error.message,
                });
            }
        }

        return partnerResponses;
    }

    /**
     * Generate unique request number
     */
    private async generateRequestNumber(): Promise<string> {
        const prefix = 'POF';
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        
        // Get count for this month
        const count = await this.poFinancingRepository
            .createQueryBuilder('request')
            .where('request.requestNumber LIKE :pattern', { pattern: `${prefix}${year}${month}%` })
            .getCount();

        const sequence = String(count + 1).padStart(4, '0');
        return `${prefix}${year}${month}${sequence}`;
    }

    /**
     * Get PO financing statistics
     */
    async getPOFinancingStatistics(tenantId?: string): Promise<any> {
        const queryBuilder = this.poFinancingRepository.createQueryBuilder('poRequest');

        if (tenantId) {
            queryBuilder.andWhere('poRequest.tenantId = :tenantId', { tenantId });
        }

        const total = await queryBuilder.getCount();
        
        const statusStats = await queryBuilder
            .select('poRequest.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('poRequest.status')
            .getRawMany();

        const totalPOAmount = await queryBuilder
            .select('SUM(poRequest.poAmount)', 'total')
            .getRawOne();

        const totalFinancingAmount = await queryBuilder
            .select('SUM(poRequest.financingAmount)', 'total')
            .getRawOne();

        const averageFinancingPercentage = await queryBuilder
            .select('AVG(poRequest.financingPercentage)', 'average')
            .getRawOne();

        return {
            totalRequests: total,
            statusBreakdown: statusStats,
            totalPOAmount: totalPOAmount?.total || 0,
            totalFinancingAmount: totalFinancingAmount?.total || 0,
            averageFinancingPercentage: averageFinancingPercentage?.average || 0,
        };
    }

    /**
     * Get buyer-wise PO financing summary
     */
    async getBuyerWiseSummary(tenantId?: string): Promise<any[]> {
        const queryBuilder = this.poFinancingRepository.createQueryBuilder('poRequest');

        if (tenantId) {
            queryBuilder.andWhere('poRequest.tenantId = :tenantId', { tenantId });
        }

        return await queryBuilder
            .select('poRequest.buyerName', 'buyerName')
            .addSelect('COUNT(*)', 'requestCount')
            .addSelect('SUM(poRequest.poAmount)', 'totalPOAmount')
            .addSelect('SUM(poRequest.financingAmount)', 'totalFinancingAmount')
            .addSelect('AVG(poRequest.financingPercentage)', 'averageFinancingPercentage')
            .groupBy('poRequest.buyerName')
            .orderBy('totalPOAmount', 'DESC')
            .getRawMany();
    }

    /**
     * Get supplier-wise PO financing summary
     */
    async getSupplierWiseSummary(tenantId?: string): Promise<any[]> {
        const queryBuilder = this.poFinancingRepository.createQueryBuilder('poRequest');

        if (tenantId) {
            queryBuilder.andWhere('poRequest.tenantId = :tenantId', { tenantId });
        }

        return await queryBuilder
            .select('poRequest.supplierName', 'supplierName')
            .addSelect('COUNT(*)', 'requestCount')
            .addSelect('SUM(poRequest.poAmount)', 'totalPOAmount')
            .addSelect('SUM(poRequest.financingAmount)', 'totalFinancingAmount')
            .addSelect('AVG(poRequest.financingPercentage)', 'averageFinancingPercentage')
            .groupBy('poRequest.supplierName')
            .orderBy('totalPOAmount', 'DESC')
            .getRawMany();
    }

    /**
     * Validate PO financing request
     */
    async validatePOFinancingRequest(createDto: CreatePOFinancingDto): Promise<{ isValid: boolean; errors: string[] }> {
        const errors: string[] = [];

        // Basic validations
        if (!createDto.poNumber || createDto.poNumber.trim() === '') {
            errors.push('PO number is required');
        }

        if (!createDto.buyerName || createDto.buyerName.trim() === '') {
            errors.push('Buyer name is required');
        }

        if (!createDto.supplierName || createDto.supplierName.trim() === '') {
            errors.push('Supplier name is required');
        }

        if (createDto.poAmount <= 0) {
            errors.push('PO amount must be greater than 0');
        }

        if (createDto.financingPercentage <= 0 || createDto.financingPercentage > 100) {
            errors.push('Financing percentage must be between 1 and 100');
        }

        // Business logic validations
        if (createDto.financingAmount < 100000) { // Less than 1 lakh
            errors.push('Financing amount must be at least ₹1,00,000');
        }

        if (createDto.poDate > new Date()) {
            errors.push('PO date cannot be in the future');
        }

        // Check for duplicate PO
        const existingPO = await this.poFinancingRepository.findOne({
            where: { 
                poNumber: createDto.poNumber,
                buyerName: createDto.buyerName,
                supplierName: createDto.supplierName,
            },
        });

        if (existingPO) {
            errors.push('A financing request for this PO already exists');
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }
}
