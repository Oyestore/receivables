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
 * Capital Float Adapter
 * 
 * Implements universal partner interface for Capital Float
 * NBFC providing revolving credit lines and invoice discounting
 */
@Injectable()
export class CapitalFloatAdapter extends BasePartnerAdapter {
    // ========================================
    // Partner Metadata
    // ========================================
    readonly partnerId = 'capital_float';
    readonly partnerName = 'Capital Float';
    readonly partnerType = PartnerType.NBFC;
    readonly supportedProducts = [
        FinancingProduct.INVOICE_FINANCING,
        FinancingProduct.WORKING_CAPITAL,
        FinancingProduct.CREDIT_LINE,
    ];

    constructor(
        httpService: HttpService,
        configService: ConfigService,
    ) {
        super(httpService, configService);
        this.logger.log('Capital Float Adapter initialized');
    }

    // ========================================
    // Core Methods Implementation
    // ========================================

    /**
     * Check eligibility for Capital Float financing
     */
    async checkEligibility(profile: BusinessProfile): Promise<EligibilityResult> {
        const startTime = Date.now();

        try {
            // Capital Float minimum requirements
            const eligible =
                profile.yearsInBusiness >= 1 &&
                profile.annualRevenue >= 500000 && // Min 5L annual revenue
                profile.pan && profile.pan.length > 0;

            if (!eligible) {
                return {
                    eligible: false,
                    reason: 'Minimum requirements: 1+ years in business, 5L+ annual revenue, valid PAN',
                    minimumAmount: 50000,
                    maximumAmount: 100000000,
                };
            }

            // Calculate credit limit (30% of annual revenue)
            const maxAmount = Math.min(
                profile.annualRevenue * 0.30,
                100000000, // Max 10Cr
            );

            const minAmount = 50000; // Min 50k

            // Estimate rate
            let estimatedRate = 16; // Base rate
            if (profile.creditScore) {
                if (profile.creditScore >= 750) estimatedRate = 12;
                else if (profile.creditScore >= 700) estimatedRate = 14;
                else if (profile.creditScore >= 650) estimatedRate = 16;
                else estimatedRate = 20;
            }

            const duration = Date.now() - startTime;
            this.logMetrics('checkEligibility', duration, true);

            return {
                eligible: true,
                minimumAmount: minAmount,
                maximumAmount: maxAmount,
                estimatedRate,
                requiredDocuments: [
                    'Bank statements (3 months)',
                    'GST returns (optional)',
                    'PAN card',
                    'Cancelled cheque',
                ],
                conditions: [
                    'Business vintage: 1+ year',
                    'Minimum turnover: 5 lakhs/year',
                    'Processing fee: 1-2% of limit',
                    'Revolving credit line available',
                ],
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logMetrics('checkEligibility', duration, false);
            throw error;
        }
    }

    /**
     * Submit application to Capital Float
     */
    async submitApplication(application: StandardApplication): Promise<ApplicationResponse> {
        const startTime = Date.now();

        try {
            const cfPayload = this.mapToPartnerFormat(application);

            const response = await this.makeRequestWithRetry({
                url: '/credit-lines',
                method: 'POST',
                data: cfPayload,
            });

            const duration = Date.now() - startTime;
            this.logMetrics('submitApplication', duration, true);

            return {
                success: true,
                externalApplicationId: response.credit_line_id,
                status: 'submitted',
                message: 'Credit line application submitted to Capital Float',
                nextSteps: [
                    'Digital onboarding in progress',
                    'Instant approval for eligible businesses',
                    'Credit limit sanctioned within 24 hours',
                ],
                estimatedProcessingTime: '24 hours',
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
     * Get offers from Capital Float
     */
    async getOffers(request: FinancingRequest): Promise<PartnerOffer[]> {
        const startTime = Date.now();

        try {
            const payload = {
                business: {
                    monthly_revenue: request.businessProfile?.annualRevenue
                        ? request.businessProfile.annualRevenue / 12
                        : undefined,
                    years_in_business: request.businessProfile?.yearsInBusiness,
                    pan: request.businessProfile?.pan,
                },
                requested_limit: request.amount,
                purpose: this.mapPurposeToCF(request.purpose),
            };

            const response = await this.makeRequestWithRetry({
                url: '/offers/check',
                method: 'POST',
                data: payload,
            });

            // Capital Float typically offers revolving credit lines
            const offers: PartnerOffer[] = response.offers.map((cfOffer: any) => {
                const interestRate = cfOffer.interest_rate || 16;
                const tenure = cfOffer.tenure_months || 12;
                const processingFee = cfOffer.processing_fee || (cfOffer.credit_limit * 0.015); // 1.5%

                return {
                    offerId: cfOffer.offer_id,
                    amount: cfOffer.credit_limit,
                    interestRate,
                    processingFee,
                    tenure,
                    disbursalTime: '24 hours',
                    totalRepayment: undefined, // Revolving credit - no fixed repayment
                    conditions: [
                        `Available credit limit: ₹${cfOffer.credit_limit}`,
                        'Revolving credit line - pay only for what you use',
                        'Interest charged on daily outstanding balance',
                        `Rate: ${interestRate}% per annum`,
                        'Flexible repayment',
                    ],
                    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
                    rawData: cfOffer,
                };
            });

            const duration = Date.now() - startTime;
            this.logMetrics('getOffers', duration, true);

            return offers;

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logMetrics('getOffers', duration, false);
            this.logger.warn(`Failed to get offers from Capital Float: ${error.message}`);
            return [];
        }
    }

    /**
     * Track application status
     */
    async trackStatus(externalAppId: string): Promise<ApplicationStatus> {
        try {
            const response = await this.makeAuthenticatedRequest({
                url: `/credit-lines/${externalAppId}`,
                method: 'GET',
            });

            return {
                externalApplicationId: response.credit_line_id,
                status: this.mapCFStatusToStandard(response.status),
                statusMessage: this.getStatusMessage(response.status),
                updatedAt: new Date(response.updated_at || Date.now()),
                approvedAmount: response.sanctioned_limit,
                disbursedAmount: response.drawn_amount,
                disbursedAt: response.first_drawdown_at ? new Date(response.first_drawdown_at) : undefined,
                rejectionReason: response.rejection_reason,
            };

        } catch (error) {
            throw new Error(`Failed to track Capital Float application: ${error.message}`);
        }
    }

    /**
     * Handle webhook from Capital Float
     */
    async handleWebhook(payload: any, signature: string): Promise<WebhookResult> {
        if (!this.validateWebhookSignature(payload, signature, this.getWebhookSecret())) {
            this.logger.error('Invalid Capital Float webhook signature');
            return {
                processed: false,
                message: 'Invalid signature',
            };
        }

        const event = payload.event_type;
        const creditLineId = payload.credit_line_id;

        this.logger.log(`Capital Float webhook: ${event} for ${creditLineId}`);

        return {
            processed: true,
            applicationId: creditLineId,
            status: payload.status,
            message: `Webhook processed: ${event}`,
        };
    }

    // ========================================
    // Protected Methods (Required by Base)
    // ========================================

    protected async getAuthHeaders(): Promise<Record<string, string>> {
        return {
            'Authorization': `Bearer ${this.getConfig('CAPITAL_FLOAT_API_KEY', '')}`,
            'X-Client-ID': this.getConfig('CAPITAL_FLOAT_CLIENT_ID', ''),
        };
    }

    protected getBaseUrl(): string {
        return this.getConfig('CAPITAL_FLOAT_API_URL', 'https://api.capitalfloat.com/v2');
    }

    protected getWebhookSecret(): string {
        return this.getConfig('CAPITAL_FLOAT_WEBHOOK_SECRET', '');
    }

    protected mapToPartnerFormat(application: StandardApplication): any {
        const { businessProfile, financingRequest, documents } = application;

        return {
            partner_reference: `${application.tenantId}_${application.userId}`,
            business_details: {
                name: businessProfile.businessName,
                pan: businessProfile.pan,
                gstin: businessProfile.gstin,
                vintage_months: businessProfile.yearsInBusiness * 12,
                monthly_revenue: businessProfile.annualRevenue / 12,
                industry: businessProfile.industry,
            },
            credit_request: {
                limit_requested: financingRequest.amount,
                purpose: this.mapPurposeToCF(financingRequest.purpose),
                urgency: financingRequest.urgency,
            },
            documents: {
                bank_statements: documents.bankStatements?.[0],
                gst_returns: documents.gstReturns?.[0],
                pan_card: documents.identityProofs?.[0],
            },
            webhook_url: `${this.getConfig('APP_URL')}/webhooks/capital-float`,
        };
    }

    protected mapFromPartnerFormat(partnerResponse: any): PartnerOffer {
        return {
            offerId: partnerResponse.offer_id,
            amount: partnerResponse.credit_limit,
            interestRate: partnerResponse.interest_rate,
            processingFee: partnerResponse.processing_fee,
            tenure: partnerResponse.tenure_months || 12,
            disbursalTime: '24 hours',
            conditions: [],
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            rawData: partnerResponse,
        };
    }

    // ========================================
    // Private Helper Methods
    // ========================================

    private mapPurposeToCF(purpose: FinancingPurpose): string {
        const mapping: Record<FinancingPurpose, string> = {
            [FinancingPurpose.INVOICE_DISCOUNTING]: 'invoice_discounting',
            [FinancingPurpose.INVOICE_FACTORING]: 'invoice_financing',
            [FinancingPurpose.WORKING_CAPITAL]: 'working_capital',
            [FinancingPurpose.PURCHASE_ORDER]: 'purchase_order_finance',
            [FinancingPurpose.SUPPLY_CHAIN_FINANCE]: 'supply_chain',
            [FinancingPurpose.EQUIPMENT_FINANCING]: 'asset_purchase',
            [FinancingPurpose.REVENUE_BASED]: 'business_expansion',
        };

        return mapping[purpose] || 'working_capital';
    }

    private mapCFStatusToStandard(cfStatus: string): ApplicationStatus['status'] {
        const mapping: Record<string, ApplicationStatus['status']> = {
            pending: 'pending',
            under_review: 'under_review',
            approved: 'approved',
            sanctioned: 'approved',
            active: 'disbursed',
            rejected: 'rejected',
            closed: 'completed',
        };

        return mapping[cfStatus] || 'pending';
    }

    private getStatusMessage(status: string): string {
        const messages: Record<string, string> = {
            pending: 'Application pending review',
            under_review: 'Credit assessment in progress',
            approved: 'Credit line approved',
            sanctioned: 'Credit limit sanctioned, ready to draw',
            active: 'Credit line active',
            rejected: 'Application rejected',
            closed: 'Credit line closed',
        };

        return messages[status] || 'Unknown status';
    }
}
