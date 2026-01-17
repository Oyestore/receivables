import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BasePartnerAdapter } from './base-partner.adapter';
import {
    PartnerType,
    FinancingProduct,
    BusinessProfile,
    EligibilityResult,
    StandardApplication,
    ApplicationResponse,
    FinancingRequest,
    PartnerOffer,
    ApplicationStatus,
    WebhookResult,
    FinancingPurpose,
} from '../interfaces/financing-partner-plugin.interface';

/**
 * LendingKart Adapter
 * 
 * Implements universal partner interface for LendingKart
 * NBFC providing invoice financing and working capital loans
 */
@Injectable()
export class LendingKartAdapter extends BasePartnerAdapter {
    // ========================================
    // Partner Metadata
    // ========================================
    readonly partnerId = 'lendingkart';
    readonly partnerName = 'LendingKart';
    readonly partnerType = PartnerType.NBFC;
    readonly supportedProducts = [
        FinancingProduct.INVOICE_FINANCING,
        FinancingProduct.WORKING_CAPITAL,
    ];

    constructor(
        httpService: HttpService,
        configService: ConfigService,
    ) {
        super(httpService, configService);
        this.logger.log('LendingKart Adapter initialized');
    }

    // ========================================
    // Core Methods Implementation
    // ========================================

    /**
     * Check eligibility for LendingKart financing
     */
    async checkEligibility(profile: BusinessProfile): Promise<EligibilityResult> {
        const startTime = Date.now();

        try {
            // LendingKart minimum requirements
            const eligible =
                profile.yearsInBusiness >= 2 &&
                profile.annualRevenue >= 1000000 && // Min 10L annual revenue
                profile.pan && profile.pan.length > 0;

            if (!eligible) {
                return {
                    eligible: false,
                    reason: 'Minimum requirements: 2+ years in business, 10L+ annual revenue, valid PAN',
                    minimumAmount: 100000,
                    maximumAmount: 50000000,
                };
            }

            // Calculate eligible amount based on revenue
            const maxAmount = Math.min(
                profile.annualRevenue * 0.25, // 25% of annual revenue
                50000000, // Max 5Cr
            );

            const minAmount = 100000; // Min 1L

            // Estimate rate based on credit score
            let estimatedRate = 18; // Default 18%
            if (profile.creditScore) {
                if (profile.creditScore >= 750) estimatedRate = 14;
                else if (profile.creditScore >= 700) estimatedRate = 16;
                else if (profile.creditScore >= 650) estimatedRate = 18;
                else estimatedRate = 22;
            }

            const duration = Date.now() - startTime;
            this.logMetrics('checkEligibility', duration, true);

            return {
                eligible: true,
                minimumAmount: minAmount,
                maximumAmount: maxAmount,
                estimatedRate,
                requiredDocuments: [
                    'Bank statements (6 months)',
                    'GST returns (6 months)',
                    'PAN card',
                    'Address proof',
                ],
                conditions: [
                    'Business vintage: 2+ years',
                    'Minimum turnover: 10 lakhs/year',
                    'Processing fee: 2-3% of loan amount',
                ],
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logMetrics('checkEligibility', duration, false);
            throw error;
        }
    }

    /**
     * Submit application to LendingKart
     */
    async submitApplication(application: StandardApplication): Promise<ApplicationResponse> {
        const startTime = Date.now();

        try {
            // Map to LendingKart format
            const lkPayload = this.mapToPartnerFormat(application);

            // Submit to LendingKart API
            const response = await this.makeRequestWithRetry({
                url: '/applications',
                method: 'POST',
                data: lkPayload,
            });

            const duration = Date.now() - startTime;
            this.logMetrics('submitApplication', duration, true);

            return {
                success: true,
                externalApplicationId: response.application_id,
                status: 'submitted',
                message: 'Application submitted successfully to LendingKart',
                nextSteps: [
                    'Document verification in progress',
                    'Credit assessment underway',
                    'Decision expected within 24-48 hours',
                ],
                estimatedProcessingTime: '24-48 hours',
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logMetrics('submitApplication', duration, false);

            return {
                success: false,
                externalApplicationId: '',
                status: 'failed',
                message: error.message || 'Failed to submit application',
            };
        }
    }

    /**
     * Get offers from LendingKart
     */
    async getOffers(request: FinancingRequest): Promise<PartnerOffer[]> {
        const startTime = Date.now();

        try {
            // Map request to LendingKart format
            const payload = {
                loan_amount: request.amount,
                tenure_months: request.tenure || 12,
                purpose: this.mapPurposeToLK(request.purpose),
                monthly_revenue: request.businessProfile?.annualRevenue
                    ? request.businessProfile.annualRevenue / 12
                    : undefined,
                years_in_business: request.businessProfile?.yearsInBusiness,
                credit_score: request.businessProfile?.creditScore,
            };

            // Call LendingKart offers API
            const response = await this.makeRequestWithRetry({
                url: '/offers/check',
                method: 'POST',
                data: payload,
            });

            const offers: PartnerOffer[] = response.offers.map((lkOffer: any) => ({
                offerId: lkOffer.offer_id,
                amount: lkOffer.loan_amount,
                interestRate: lkOffer.interest_rate,
                processingFee: lkOffer.processing_fee || (lkOffer.loan_amount * 0.02), // 2%  default
                tenure: lkOffer.tenure_months,
                disbursalTime: '48 hours',
                emi: lkOffer.emi,
                totalRepayment: lkOffer.total_repayment,
                conditions: [
                    'Subject to credit approval',
                    'Processing fee applicable',
                    `EMI: ₹${lkOffer.emi}/month`,
                ],
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                rawData: lkOffer,
            }));

            const duration = Date.now() - startTime;
            this.logMetrics('getOffers', duration, true);

            return offers;

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logMetrics('getOffers', duration, false);
            this.logger.warn(`Failed to get offers from LendingKart: ${error.message}`);
            return [];
        }
    }

    /**
     * Track application status
     */
    async trackStatus(externalAppId: string): Promise<ApplicationStatus> {
        try {
            const response = await this.makeAuthenticatedRequest({
                url: `/applications/${externalAppId}`,
                method: 'GET',
            });

            return {
                externalApplicationId: response.application_id,
                status: this.mapLKStatusToStandard(response.status),
                statusMessage: this.getStatusMessage(response.status),
                updatedAt: new Date(response.updated_at || Date.now()),
                approvedAmount: response.approved_amount,
                disbursedAmount: response.disbursed_amount,
                disbursedAt: response.disbursed_at ? new Date(response.disbursed_at) : undefined,
                rejectionReason: response.rejection_reason,
            };

        } catch (error) {
            throw new Error(`Failed to track LendingKart application: ${error.message}`);
        }
    }

    /**
     * Handle webhook from LendingKart
     */
    async handleWebhook(payload: any, signature: string): Promise<WebhookResult> {
        // Verify signature
        if (!this.validateWebhookSignature(payload, signature, this.getWebhookSecret())) {
            this.logger.error('Invalid LendingKart webhook signature');
            return {
                processed: false,
                message: 'Invalid signature',
            };
        }

        const event = payload.event;
        const applicationId = payload.application_id;

        this.logger.log(`LendingKart webhook: ${event} for ${applicationId}`);

        return {
            processed: true,
            applicationId,
            status: payload.status,
            message: `Webhook processed: ${event}`,
        };
    }

    // ========================================
    // Protected Methods (Required by Base)
    // ========================================

    protected async getAuthHeaders(): Promise<Record<string, string>> {
        return {
            'X-API-Key': this.getConfig('LENDINGKART_API_KEY', ''),
            'X-Partner-ID': this.getConfig('LENDINGKART_PARTNER_ID', ''),
        };
    }

    protected getBaseUrl(): string {
        return this.getConfig('LENDINGKART_API_URL', 'https://api.lendingkart.com/v1');
    }

    protected getWebhookSecret(): string {
        return this.getConfig('LENDINGKART_WEBHOOK_SECRET', '');
    }

    protected mapToPartnerFormat(application: StandardApplication): any {
        const { businessProfile, financingRequest, invoiceDetails, documents } = application;

        return {
            partner_reference_id: `${application.tenantId}_${application.userId}`,
            business: {
                name: businessProfile.businessName,
                pan: businessProfile.pan,
                gstin: businessProfile.gstin || '',
                monthly_revenue: businessProfile.annualRevenue / 12,
                years_in_business: businessProfile.yearsInBusiness,
                industry_type: businessProfile.industry,
            },
            loan: {
                amount: financingRequest.amount,
                purpose: this.mapPurposeToLK(financingRequest.purpose),
                tenure_months: financingRequest.tenure || 12,
            },
            credit_score: businessProfile.creditScore,
            contact: {
                person: 'Business Owner', // TODO: Get from user profile
                email: 'contact@business.com', // TODO: Get from user profile
                phone: '9999999999', // TODO: Get from user profile
            },
            documents: {
                gst_returns: documents.gstReturns?.[0],
                bank_statements: documents.bankStatements?.[0],
                financial_statements: documents.financialStatements?.[0],
            },
            callback_url: `${this.getConfig('APP_URL')}/webhooks/lendingkart`,
        };
    }

    protected mapFromPartnerFormat(partnerResponse: any): PartnerOffer {
        return {
            offerId: partnerResponse.offer_id,
            amount: partnerResponse.loan_amount,
            interestRate: partnerResponse.interest_rate,
            processingFee: partnerResponse.processing_fee,
            tenure: partnerResponse.tenure_months,
            disbursalTime: '48 hours',
            emi: partnerResponse.emi,
            totalRepayment: partnerResponse.total_repayment,
            conditions: [],
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            rawData: partnerResponse,
        };
    }

    // ========================================
    // Private Helper Methods
    // ========================================

    private mapPurposeToLK(purpose: FinancingPurpose): string {
        const mapping: Record<FinancingPurpose, string> = {
            [FinancingPurpose.INVOICE_DISCOUNTING]: 'invoice_financing',
            [FinancingPurpose.INVOICE_FACTORING]: 'invoice_financing',
            [FinancingPurpose.WORKING_CAPITAL]: 'working_capital',
            [FinancingPurpose.PURCHASE_ORDER]: 'working_capital',
            [FinancingPurpose.SUPPLY_CHAIN_FINANCE]: 'working_capital',
            [FinancingPurpose.EQUIPMENT_FINANCING]: 'expansion',
            [FinancingPurpose.REVENUE_BASED]: 'working_capital',
        };

        return mapping[purpose] || 'working_capital';
    }

    private mapLKStatusToStandard(lkStatus: string): ApplicationStatus['status'] {
        const mapping: Record<string, ApplicationStatus['status']> = {
            submitted: 'pending',
            under_review: 'under_review',
            approved: 'approved',
            rejected: 'rejected',
            disbursed: 'disbursed',
            completed: 'completed',
        };

        return mapping[lkStatus] || 'pending';
    }

    private getStatusMessage(status: string): string {
        const messages: Record<string, string> = {
            submitted: 'Application submitted, awaiting review',
            under_review: 'Application under credit assessment',
            approved: 'Application approved, preparing for disbursal',
            rejected: 'Application rejected',
            disbursed: 'Loan amount disbursed successfully',
            completed: 'Loan fully repaid',
        };

        return messages[status] || 'Unknown status';
    }
}
