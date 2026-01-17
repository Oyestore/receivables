import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface FinancingApplication {
    applicationId: string;
    status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'disbursed';
    invoiceId: string;
    invoiceAmount: number;
    requestedAmount: number;
    approvedAmount?: number;
    interestRate?: number;
    tenure?: number; // days
    disbursementDate?: Date;
    repaymentDate?: Date;
}

export interface FinancingOffer {
    offerId: string;
    lender: string;
    maxAmount: number;
    interestRate: number;
    processingFee: number;
    tenure: number;
    eligibilityCriteria: {
        minCreditScore: number;
        minRevenue: number;
        maxAge: number;
    };
}

/**
 * Capital Float Financing Integration
 * Handles invoice financing applications and partner integration
 */
@Injectable()
export class CapitalFloatService {
    private readonly logger = new Logger(CapitalFloatService.name);
    private readonly httpClient: AxiosInstance;

    private readonly apiUrl: string;
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly webhookSecret: string;

    private accessToken: string;
    private tokenExpiry: Date;

    constructor(private readonly configService: ConfigService) {
        this.apiUrl = this.configService.get<string>('CAPITAL_FLOAT_API_URL') || 'https://api.capitalfloat.com/v1';
        this.clientId = this.configService.get<string>('CAPITAL_FLOAT_CLIENT_ID');
        this.clientSecret = this.configService.get<string>('CAPITAL_FLOAT_CLIENT_SECRET');
        this.webhookSecret = this.configService.get<string>('CAPITAL_FLOAT_WEBHOOK_SECRET');

        this.httpClient = axios.create({
            baseURL: this.apiUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.logger.log('Capital Float Service initialized');
    }

    /**
     * Authenticate with Capital Float (OAuth2)
     */
    private async authenticate(): Promise<void> {
        // Check if token is still valid
        if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return;
        }

        try {
            const response = await axios.post(`${this.apiUrl}/oauth/token`, {
                grant_type: 'client_credentials',
                client_id: this.clientId,
                client_secret: this.clientSecret,
            });

            this.accessToken = response.data.access_token;
            this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

            this.logger.log('Capital Float authentication successful');
        } catch (error) {
            this.logger.error(`Capital Float auth error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Submit financing application
     */
    async submitApplication(
        tenantId: string,
        applicationData: {
            customerId: string;
            invoiceId: string;
            invoiceAmount: number;
            requestedAmount: number;
            invoiceDueDate: Date;

            // Customer details
            customerName: string;
            customerPAN: string;
            customerGSTIN: string;
            annualRevenue: number;
            yearsInBusiness: number;

            // Credit score (from our platform)
            creditScore: number;
            cibilScore?: number;

            // Supporting documents
            invoiceUrl: string;
            gstReturnsUrl?: string;
            bankStatementsUrl?: string;
        },
    ): Promise<FinancingApplication> {
        await this.authenticate();

        try {
            const payload = {
                application: {
                    type: 'invoice_financing',
                    requested_amount: applicationData.requestedAmount,
                    invoice: {
                        id: applicationData.invoiceId,
                        amount: applicationData.invoiceAmount,
                        due_date: applicationData.invoiceDueDate.toISOString(),
                        url: applicationData.invoiceUrl,
                    },
                    borrower: {
                        name: applicationData.customerName,
                        pan: applicationData.customerPAN,
                        gstin: applicationData.customerGSTIN,
                        annual_revenue: applicationData.annualRevenue,
                        years_in_business: applicationData.yearsInBusiness,
                        credit_score: applicationData.creditScore,
                        cibil_score: applicationData.cibilScore,
                    },
                    documents: {
                        gst_returns: applicationData.gstReturnsUrl,
                        bank_statements: applicationData.bankStatementsUrl,
                    },
                },
                callback_url: `https://platform.example.com/webhooks/capital-float`,
            };

            const response = await this.httpClient.post('/applications', payload, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                },
            });

            this.logger.log(
                `Capital Float application submitted: ${response.data.application_id}`,
            );

            return {
                applicationId: response.data.application_id,
                status: 'pending',
                invoiceId: applicationData.invoiceId,
                invoiceAmount: applicationData.invoiceAmount,
                requestedAmount: applicationData.requestedAmount,
            };
        } catch (error) {
            this.logger.error(`Capital Float application error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get application status
     */
    async getApplicationStatus(applicationId: string): Promise<FinancingApplication> {
        await this.authenticate();

        const response = await this.httpClient.get(`/applications/${applicationId}`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
            },
        });

        const app = response.data;

        return {
            applicationId: app.application_id,
            status: app.status,
            invoiceId: app.invoice.id,
            invoiceAmount: app.invoice.amount,
            requestedAmount: app.requested_amount,
            approvedAmount: app.approved_amount,
            interestRate: app.interest_rate,
            tenure: app.tenure_days,
            disbursementDate: app.disbursement_date ? new Date(app.disbursement_date) : undefined,
            repaymentDate: app.repayment_date ? new Date(app.repayment_date) : undefined,
        };
    }

    /**
     * Get available financing offers
     */
    async getOffers(customerProfile: {
        creditScore: number;
        annualRevenue: number;
        yearsInBusiness: number;
    }): Promise<FinancingOffer[]> {
        await this.authenticate();

        const response = await this.httpClient.post(
            '/offers',
            {
                credit_score: customerProfile.creditScore,
                annual_revenue: customerProfile.annualRevenue,
                years_in_business: customerProfile.yearsInBusiness,
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                },
            },
        );

        return response.data.offers.map((offer: any) => ({
            offerId: offer.offer_id,
            lender: 'Capital Float',
            maxAmount: offer.max_amount,
            interestRate: offer.interest_rate,
            processingFee: offer.processing_fee,
            tenure: offer.tenure_days,
            eligibilityCriteria: {
                minCreditScore: offer.min_credit_score,
                minRevenue: offer.min_revenue,
                maxAge: offer.max_age_days,
            },
        }));
    }

    /**
     * Accept financing offer
     */
    async acceptOffer(
        applicationId: string,
        offerId: string,
    ): Promise<{
        accepted: boolean;
        disbursementDate: Date;
    }> {
        await this.authenticate();

        const response = await this.httpClient.post(
            `/applications/${applicationId}/accept`,
            { offer_id: offerId },
            {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                },
            },
        );

        this.logger.log(`Offer accepted: ${offerId} for application ${applicationId}`);

        return {
            accepted: true,
            disbursementDate: new Date(response.data.disbursement_date),
        };
    }

    /**
     * Handle Capital Float webhook
     */
    async handleWebhook(
        payload: any,
        signature: string,
    ): Promise<{
        event: string;
        applicationId: string;
        status: string;
        data: any;
    }> {
        // Verify webhook signature
        if (!this.verifyWebhookSignature(payload, signature)) {
            throw new Error('Invalid webhook signature');
        }

        const event = payload.event;
        const applicationId = payload.application_id;

        this.logger.log(`Capital Float webhook: ${event} for ${applicationId}`);

        // Process different events
        switch (event) {
            case 'application.approved':
                // Application approved - notify customer
                break;
            case 'application.rejected':
                // Application rejected - notify customer
                break;
            case 'disbursement.completed':
                // Funds disbursed - update invoice status
                break;
            case 'repayment.due':
                // Repayment due - send reminder
                break;
            case 'repayment.completed':
                // Repayment completed - close application
                break;
        }

        return {
            event,
            applicationId,
            status: payload.status,
            data: payload.data,
        };
    }

    /**
     * Calculate financing cost
     */
    calculateFinancingCost(
        amount: number,
        interestRate: number,
        tenure: number,
        processingFee: number,
    ): {
        totalInterest: number;
        processingFee: number;
        totalCost: number;
        effectiveRate: number;
    } {
        // Simple interest calculation
        const interest = (amount * interestRate * tenure) / (365 * 100);
        const totalCost = interest + processingFee;
        const effectiveRate = (totalCost / amount) * (365 / tenure) * 100;

        return {
            totalInterest: Math.round(interest),
            processingFee,
            totalCost: Math.round(totalCost),
            effectiveRate: Math.round(effectiveRate * 100) / 100,
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

    /**
     * Test connection
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.authenticate();
            return true;
        } catch (error) {
            this.logger.error(`Capital Float connection test failed: ${error.message}`);
            return false;
        }
    }
}
