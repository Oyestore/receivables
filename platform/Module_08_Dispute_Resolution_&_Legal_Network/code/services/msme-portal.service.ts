import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MSMECase, MSMECaseStatus } from '../entities/msme-case.entity';
import axios, { AxiosInstance } from 'axios';
import * as qs from 'qs';

interface MSMEPortalConfig {
    apiUrl: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

interface MSMEFilingRequest {
    disputeCaseId: string;
    supplierName: string;
    supplierUdyamNumber: string;
    supplierEmail: string;
    supplierPhone: string;
    supplierAddress: string;
    buyerName: string;
    buyerPAN: string;
    buyerEmail?: string;
    buyerPhone?: string;
    buyerAddress: string;
    amountClaimed: number;
    disputeDescription: string;
    invoiceNumbers: string[];
    documents?: Array<{ name: string; url: string; type: string }>;
}

@Injectable()
export class MSMEPortalService {
    private readonly logger = new Logger(MSMEPortalService.name);
    private axiosInstance: AxiosInstance;
    private accessToken: string | null = null;
    private tokenExpiry: Date | null = null;

    constructor(
        @InjectRepository(MSMECase)
        private readonly msmeCaseRepository: Repository<MSMECase>,
    ) {
        // Initialize MSME Portal config
        const config: MSMEPortalConfig = {
            apiUrl: process.env.MSME_PORTAL_API_URL || 'https://samadhaan.msme.gov.in/api',
            clientId: process.env.MSME_CLIENT_ID || '',
            clientSecret: process.env.MSME_CLIENT_SECRET || '',
            redirectUri: process.env.MSME_REDIRECT_URI || '',
        };

        this.axiosInstance = axios.create({
            baseURL: config.apiUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Request interceptor to add auth token
        this.axiosInstance.interceptors.request.use(
            async (config) => {
                await this.ensureValidToken();
                if (this.accessToken) {
                    config.headers.Authorization = `Bearer ${this.accessToken}`;
                }
                return config;
            },
            (error) => Promise.reject(error),
        );
    }

    /**
     * Ensure we have a valid OAuth2 access token
     */
    private async ensureValidToken(): Promise<void> {
        const now = new Date();

        // Check if token is valid
        if (this.accessToken && this.tokenExpiry && now < this.tokenExpiry) {
            return;
        }

        // Token expired or doesn't exist, get new one
        await this.refreshAccessToken();
    }

    /**
     * Get OAuth2 access token from MSME portal
     */
    private async refreshAccessToken(): Promise<void> {
        try {
            const response = await axios.post(
                `${process.env.MSME_PORTAL_API_URL}/oauth/token`,
                qs.stringify({
                    grant_type: 'client_credentials',
                    client_id: process.env.MSME_CLIENT_ID,
                    client_secret: process.env.MSME_CLIENT_SECRET,
                    scope: 'filing:write filing:read status:read',
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                },
            );

            this.accessToken = response.data.access_token;
            const expiresIn = response.data.expires_in || 3600; // Default 1 hour
            this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

            this.logger.log('Successfully refreshed MSME Portal access token');
        } catch (error) {
            this.logger.error('Failed to refresh MSME Portal access token', error);
            throw new HttpException(
                'Failed to authenticate with MSME Portal',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
    }

    /**
     * File a new case with MSME Samadhaan portal
     */
    async fileCase(request: MSMEFilingRequest): Promise<MSMECase> {
        this.logger.log(`Filing new case with MSME Portal for dispute: ${request.disputeCaseId}`);

        try {
            // Create draft case record
            const msmeCase = this.msmeCaseRepository.create({
                disputeCaseId: request.disputeCaseId,
                msmeApplicationId: `MSME-${Date.now()}`,
                status: MSMECaseStatus.DRAFT,
                supplierName: request.supplierName,
                supplierUdyamNumber: request.supplierUdyamNumber,
                supplierEmail: request.supplierEmail,
                supplierPhone: request.supplierPhone,
                supplierAddress: request.supplierAddress,
                buyerName: request.buyerName,
                buyerPAN: request.buyerPAN,
                buyerEmail: request.buyerEmail,
                buyerPhone: request.buyerPhone,
                buyerAddress: request.buyerAddress,
                amountClaimed: request.amountClaimed,
                disputeDescription: request.disputeDescription,
                invoiceNumbers: request.invoiceNumbers,
                documentsUploaded: request.documents || [],
                timeline: [{
                    date: new Date(),
                    status: MSMECaseStatus.DRAFT,
                    description: 'Case created and draft prepared',
                    updatedBy: 'system',
                }],
            });

            await this.msmeCaseRepository.save(msmeCase);

            // Submit to MSME Portal
            const portalResponse = await this.axiosInstance.post('/cases/file', {
                application_id: msmeCase.msmeApplicationId,
                supplier: {
                    name: request.supplierName,
                    udyam_number: request.supplierUdyamNumber,
                    email: request.supplierEmail,
                    phone: request.supplierPhone,
                    address: request.supplierAddress,
                },
                buyer: {
                    name: request.buyerName,
                    pan: request.buyerPAN,
                    email: request.buyerEmail,
                    phone: request.buyerPhone,
                    address: request.buyerAddress,
                },
                dispute: {
                    amount_claimed: request.amountClaimed,
                    description: request.disputeDescription,
                    invoice_numbers: request.invoiceNumbers,
                },
                documents: request.documents || [],
            });

            // Update with portal response
            msmeCase.status = MSMECaseStatus.SUBMITTED;
            msmeCase.msmeCaseNumber = portalResponse.data.case_number;
            msmeCase.portalReferenceId = portalResponse.data.reference_id;
            msmeCase.lastSyncAt = new Date();
            msmeCase.timeline.push({
                date: new Date(),
                status: MSMECaseStatus.SUBMITTED,
                description: `Case submitted to MSME Portal. Case Number: ${portalResponse.data.case_number}`,
                updatedBy: 'system',
            });

            await this.msmeCaseRepository.save(msmeCase);

            this.logger.log(`Successfully filed MSME case: ${msmeCase.msmeCaseNumber}`);
            return msmeCase;
        } catch (error) {
            this.logger.error('Failed to file MSME case', error);

            // Save error to case record
            if (error.response) {
                const msmeCase = await this.msmeCaseRepository.findOne({
                    where: { disputeCaseId: request.disputeCaseId },
                });
                if (msmeCase) {
                    msmeCase.syncErrors = JSON.stringify(error.response.data);
                    await this.msmeCaseRepository.save(msmeCase);
                }
            }

            throw new HttpException(
                'Failed to file case with MSME Portal',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }

    /**
     * Get case status from MSME portal
     */
    async getCaseStatus(msmeCaseId: string): Promise<MSMECase> {
        const msmeCase = await this.msmeCaseRepository.findOne({
            where: { id: msmeCaseId },
            relations: ['disputeCase'],
        });

        if (!msmeCase) {
            throw new HttpException('MSME case not found', HttpStatus.NOT_FOUND);
        }

        try {
            const response = await this.axiosInstance.get(
                `/cases/${msmeCase.msmeCaseNumber}/status`,
            );

            const statusData = response.data;

            // Update local record with portal data
            msmeCase.status = this.mapPortalStatus(statusData.status);
            msmeCase.conciliatorAssigned = statusData.conciliator?.name;
            msmeCase.hearingDate = statusData.hearing_date ? new Date(statusData.hearing_date) : null;
            msmeCase.lastSyncAt = new Date();

            // Add to timeline if status changed
            const lastStatus = msmeCase.timeline[msmeCase.timeline.length - 1]?.status;
            if (lastStatus !== msmeCase.status) {
                msmeCase.timeline.push({
                    date: new Date(),
                    status: msmeCase.status,
                    description: statusData.status_description || 'Status updated from portal',
                    updatedBy: 'portal_sync',
                });
            }

            await this.msmeCaseRepository.save(msmeCase);

            return msmeCase;
        } catch (error) {
            this.logger.error(`Failed to get case status from portal: ${error.message}`);
            throw new HttpException(
                'Failed to sync case status',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }

    /**
     * Upload additional documents to MSME portal
     */
    async uploadDocument(
        msmeCaseId: string,
        document: { name: string; url: string; type: string },
    ): Promise<MSMECase> {
        const msmeCase = await this.msmeCaseRepository.findOne({
            where: { id: msmeCaseId },
        });

        if (!msmeCase) {
            throw new HttpException('MSME case not found', HttpStatus.NOT_FOUND);
        }

        try {
            await this.axiosInstance.post(
                `/cases/${msmeCase.msmeCaseNumber}/documents`,
                {
                    document_name: document.name,
                    document_url: document.url,
                    document_type: document.type,
                },
            );

            msmeCase.documentsUploaded.push({
                ...document,
                uploadedAt: new Date(),
            });

            msmeCase.timeline.push({
                date: new Date(),
                status: msmeCase.status,
                description: `Document uploaded: ${document.name}`,
                updatedBy: 'system',
            });

            await this.msmeCaseRepository.save(msmeCase);

            return msmeCase;
        } catch (error) {
            this.logger.error('Failed to upload document to portal', error);
            throw new HttpException(
                'Failed to upload document',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }

    /**
     * Handle webhook from MSME portal (status updates)
     */
    async handleWebhook(payload: any): Promise<void> {
        this.logger.log('Received webhook from MSME Portal');

        const { case_number, status, description, event_type } = payload;

        const msmeCase = await this.msmeCaseRepository.findOne({
            where: { msmeCaseNumber: case_number },
        });

        if (!msmeCase) {
            this.logger.warn(`Webhook for unknown case: ${case_number}`);
            return;
        }

        // Update case based on event type
        switch (event_type) {
            case 'status_change':
                msmeCase.status = this.mapPortalStatus(status);
                msmeCase.timeline.push({
                    date: new Date(),
                    status: msmeCase.status,
                    description: description || 'Status updated via webhook',
                    updatedBy: 'portal_webhook',
                });
                break;

            case 'hearing_scheduled':
                msmeCase.hearingDate = new Date(payload.hearing_date);
                msmeCase.timeline.push({
                    date: new Date(),
                    status: msmeCase.status,
                    description: `Hearing scheduled for ${payload.hearing_date}`,
                    updatedBy: 'portal_webhook',
                });
                break;

            case 'award_passed':
                msmeCase.status = MSMECaseStatus.AWARD_PASSED;
                msmeCase.awardDetails = {
                    awardNumber: payload.award_number,
                    awardDate: new Date(payload.award_date),
                    awardedAmount: payload.awarded_amount,
                    paymentDueDate: new Date(payload.payment_due_date),
                    remarks: payload.remarks,
                };
                msmeCase.timeline.push({
                    date: new Date(),
                    status: MSMECaseStatus.AWARD_PASSED,
                    description: `Award passed. Amount: ₹${payload.awarded_amount}`,
                    updatedBy: 'portal_webhook',
                });
                break;
        }

        msmeCase.lastSyncAt = new Date();
        await this.msmeCaseRepository.save(msmeCase);

        this.logger.log(`Successfully processed webhook for case: ${case_number}`);
    }

    /**
     * Map MSME portal status to our internal status
     */
    private mapPortalStatus(portalStatus: string): MSMECaseStatus {
        const statusMap: Record<string, MSMECaseStatus> = {
            'submitted': MSMECaseStatus.SUBMITTED,
            'under_review': MSMECaseStatus.UNDER_REVIEW,
            'hearing_scheduled': MSMECaseStatus.HEARING_SCHEDULED,
            'conciliation_in_progress': MSMECaseStatus.CONCILIATION_IN_PROGRESS,
            'award_passed': MSMECaseStatus.AWARD_PASSED,
            'closed': MSMECaseStatus.CLOSED,
            'rejected': MSMECaseStatus.REJECTED,
        };

        return statusMap[portalStatus] || MSMECaseStatus.UNDER_REVIEW;
    }

    /**
     * Get all MSME cases
     */
    async getAllCases(): Promise<MSMECase[]> {
        return this.msmeCaseRepository.find({
            relations: ['disputeCase'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Get cases by status
     */
    async getCasesByStatus(status: MSMECaseStatus): Promise<MSMECase[]> {
        return this.msmeCaseRepository.find({
            where: { status },
            relations: ['disputeCase'],
            order: { createdAt: 'DESC' },
        });
    }
}
