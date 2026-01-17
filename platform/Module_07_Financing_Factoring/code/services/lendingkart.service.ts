import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface LendingkartApplication {
    applicationId: string;
    status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed';
    loanAmount: number;
    approvedAmount?: number;
    interestRate?: number;
    processingFee?: number;
    tenure?: number;
}

export interface LendingkartOffer {
    offerId: string;
    loanAmount: number;
    interestRate: number;
    processingFee: number;
    emi: number;
    tenure: number;
    totalRepayment: number;
}

/**
 * Lendingkart Financing Integration
 * Alternative financing partner for competitive rates
 */
@Injectable()
export class LendingkartService {
    private readonly logger = new Logger(LendingkartService.name);
    private readonly httpClient: AxiosInstance;

    private readonly apiUrl: string;
    private readonly apiKey: string;
    private readonly partnerId: string;
    private readonly webhookSecret: string;

    constructor(private readonly configService: ConfigService) {
        this.apiUrl = this.configService.get<string>('LENDINGKART_API_URL') || 'https://api.lendingkart.com/v1';
        this.apiKey = this.configService.get<string>('LENDINGKART_API_KEY');
        this.partnerId = this.configService.get<string>('LENDINGKART_PARTNER_ID');
        this.webhookSecret = this.configService.get<string>('LENDINGKART_WEBHOOK_SECRET');

        this.httpClient = axios.create({
            baseURL: this.apiUrl,
            timeout: 30000,
            headers: {
                'X-API-Key': this.apiKey,
                'X-Partner-ID': this.partnerId,
                'Content-Type': 'application/json',
            },
        });

        this.logger.log('Lendingkart Service initialized');
    }

    /**
     * Submit financing application
     */
    async submitApplication(
        tenantId: string,
        applicationData: {
            customerId: string;
            businessName: string;
            pan: string;
            gstin: string;

            // Loan details
            loanAmount: number;
            purpose: 'working_capital' | 'invoice_financing' | 'expansion';

            // Business details
            monthlyRevenue: number;
            yearsInBusiness: number;
            industryType: string;

            // Credit info
            creditScore?: number;

            // Contact
            contactPerson: string;
            email: string;
            phone: string;

            // Documents
            gstReturnsUrl?: string;
            bankStatementsUrl?: string;
            financialStatementsUrl?: string;
        },
    ): Promise<LendingkartApplication> {
        try {
            const payload = {
                partner_reference_id: `${tenantId}_${applicationData.customerId}`,
                business: {
                    name: applicationData.businessName,
                    pan: applicationData.pan,
                    gstin: applicationData.gstin,
                    monthly_revenue: applicationData.monthlyRevenue,
                    years_in_business: applicationData.yearsInBusiness,
                    industry_type: applicationData.industryType,
                },
                loan: {
                    amount: applicationData.loanAmount,
                    purpose: applicationData.purpose,
                },
                credit_score: applicationData.creditScore,
                contact: {
                    person: applicationData.contactPerson,
                    email: applicationData.email,
                    phone: applicationData.phone,
                },
                documents: {
                    gst_returns: applicationData.gstReturnsUrl,
                    bank_statements: applicationData.bankStatementsUrl,
                    financial_statements: applicationData.financialStatementsUrl,
                },
                callback_url: `${this.configService.get('APP_URL')}/webhooks/lendingkart`,
            };

            const response = await this.httpClient.post('/applications', payload);

            this.logger.log(`Lendingkart application submitted: ${response.data.application_id}`);

            return {
                applicationId: response.data.application_id,
                status: 'submitted',
                loanAmount: applicationData.loanAmount,
            };
        } catch (error) {
            this.logger.error(`Lendingkart application error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get application status
     */
    async getApplicationStatus(applicationId: string): Promise<LendingkartApplication> {
        const response = await this.httpClient.get(`/applications/${applicationId}`);
        const data = response.data;

        return {
            applicationId: data.application_id,
            status: data.status,
            loanAmount: data.loan_amount,
            approvedAmount: data.approved_amount,
            interestRate: data.interest_rate,
            processingFee: data.processing_fee,
            tenure: data.tenure_months,
        };
    }

    /**
     * Get loan offers (pre-qualification)
     */
    async getOffers(criteria: {
        loanAmount: number;
        monthlyRevenue: number;
        yearsInBusiness: number;
        creditScore?: number;
    }): Promise<LendingkartOffer[]> {
        try {
            const response = await this.httpClient.post('/offers/check', {
                loan_amount: criteria.loanAmount,
                monthly_revenue: criteria.monthlyRevenue,
                years_in_business: criteria.yearsInBusiness,
                credit_score: criteria.creditScore,
            });

            return response.data.offers.map((offer: any) => ({
                offerId: offer.offer_id,
                loanAmount: offer.loan_amount,
                interestRate: offer.interest_rate,
                processingFee: offer.processing_fee,
                emi: offer.emi,
                tenure: offer.tenure_months,
                totalRepayment: offer.total_repayment,
            }));
        } catch (error) {
            this.logger.error(`Lendingkart offers error: ${error.message}`);
            return [];
        }
    }

    /**
     * Compare Lendingkart vs Capital Float offers
     */
    compareOffers(
        lendingkartOffer: LendingkartOffer,
        capitalFloatOffer: {
            maxAmount: number;
            interestRate: number;
            processingFee: number;
            tenure: number;
        },
    ): {
        recommendation: 'lendingkart' | 'capital_float' | 'similar';
        reason: string;
        savings: number;
    } {
        // Calculate total cost for both
        const lkTotalCost = lendingkartOffer.totalRepayment - lendingkartOffer.loanAmount;

        const cfInterest = (capitalFloatOffer.maxAmount * capitalFloatOffer.interestRate * capitalFloatOffer.tenure) / (365 * 100);
        const cfTotalCost = cfInterest + capitalFloatOffer.processingFee;

        const difference = cfTotalCost - lkTotalCost;

        if (Math.abs(difference) < 1000) {
            return {
                recommendation: 'similar',
                reason: 'Both offers are similar in cost',
                savings: 0,
            };
        }

        if (lkTotalCost < cfTotalCost) {
            return {
                recommendation: 'lendingkart',
                reason: `Lendingkart is cheaper by ₹${difference.toFixed(0)}`,
                savings: difference,
            };
        }

        return {
            recommendation: 'capital_float',
            reason: `Capital Float is cheaper by ₹${Math.abs(difference).toFixed(0)}`,
            savings: Math.abs(difference),
        };
    }

    /**
     * Handle webhook
     */
    async handleWebhook(payload: any, signature: string): Promise<{
        event: string;
        applicationId: string;
        status: string;
    }> {
        // Verify signature
        if (!this.verifyWebhookSignature(payload, signature)) {
            throw new Error('Invalid webhook signature');
        }

        const event = payload.event;
        const applicationId = payload.application_id;

        this.logger.log(`Lendingkart webhook: ${event} for ${applicationId}`);

        return {
            event,
            applicationId,
            status: payload.status,
        };
    }

    /**
     * Calculate EMI
     */
    calculateEMI(
        principal: number,
        annualRate: number,
        tenureMonths: number,
    ): {
        emi: number;
        totalInterest: number;
        totalRepayment: number;
    } {
        const monthlyRate = annualRate / 12 / 100;
        const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
            (Math.pow(1 + monthlyRate, tenureMonths) - 1);

        const totalRepayment = emi * tenureMonths;
        const totalInterest = totalRepayment - principal;

        return {
            emi: Math.round(emi),
            totalInterest: Math.round(totalInterest),
            totalRepayment: Math.round(totalRepayment),
        };
    }

    // Helper methods

    private verifyWebhookSignature(payload: any, signature: string): boolean {
        const expectedSignature = crypto
            .createHmac('sha256', this.webhookSecret)
            .update(JSON.stringify(payload))
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature),
        );
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.httpClient.get('/health');
            return true;
        } catch (error) {
            this.logger.error(`Lendingkart connection test failed: ${error.message}`);
            return false;
        }
    }
}
