import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import {
    IFinancingPartnerPlugin,
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
    CostCalculation,
    CostBreakdown,
    RepaymentParams,
    Schedule,
    AcceptanceResult,
} from '../interfaces/financing-partner-plugin.interface';

/**
 * Request Configuration
 */
export interface RequestConfig {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    data?: any;
    headers?: Record<string, string>;
    timeout?: number;
}

/**
 * Base Partner Adapter
 * 
 * Abstract class that provides common functionality for all partner adapters
 * All partner-specific adapters extend this class
 * 
 * Provides:
 * - HTTP request handling with retries
 * - Webhook signature verification
 * - Error handling and logging
 * - Common utilities
 */
export abstract class BasePartnerAdapter implements IFinancingPartnerPlugin {
    protected readonly logger: Logger;

    constructor(
        protected readonly httpService: HttpService,
        protected readonly configService: ConfigService,
    ) {
        this.logger = new Logger(this.constructor.name);
    }

    // ========================================
    // Abstract Properties (Each adapter must define)
    // ========================================
    abstract readonly partnerId: string;
    abstract readonly partnerName: string;
    abstract readonly partnerType: PartnerType;
    abstract readonly supportedProducts: FinancingProduct[];

    // ========================================
    // Abstract Methods (Each adapter must implement)
    // ========================================
    abstract checkEligibility(profile: BusinessProfile): Promise<EligibilityResult>;
    abstract submitApplication(application: StandardApplication): Promise<ApplicationResponse>;
    abstract getOffers(request: FinancingRequest): Promise<PartnerOffer[]>;
    abstract trackStatus(externalAppId: string): Promise<ApplicationStatus>;
    abstract handleWebhook(payload: any, signature: string): Promise<WebhookResult>;

    // ========================================
    // Common Utility Methods (Provided to all adapters)
    // ========================================

    /**
     * Make authenticated HTTP request to partner API
     * Includes retry logic and error handling
     */
    protected async makeAuthenticatedRequest(config: RequestConfig): Promise<any> {
        const {
            url,
            method,
            data,
            headers = {},
            timeout = 30000,
        } = config;

        // Get partner-specific auth headers
        const authHeaders = await this.getAuthHeaders();

        const fullUrl = this.getFullUrl(url);

        this.logger.debug(`Making ${method} request to ${fullUrl}`);

        try {
            const response = await firstValueFrom(
                this.httpService.request({
                    url: fullUrl,
                    method,
                    data,
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeaders,
                        ...headers,
                    },
                    timeout,
                }),
            );

            this.logger.debug(`Request successful: ${method} ${fullUrl}`);
            return response.data;

        } catch (error) {
            this.logger.error(
                `Request failed: ${method} ${fullUrl}`,
                error.response?.data || error.message,
            );

            // Transform to standard error format
            throw this.transformError(error);
        }
    }

    /**
     * Make request with retry logic
     * Automatically retries on network errors
     */
    protected async makeRequestWithRetry(
        config: RequestConfig,
        maxRetries: number = 3,
    ): Promise<any> {
        let lastError: any;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.makeAuthenticatedRequest(config);
            } catch (error) {
                lastError = error;

                // Don't retry on 4xx errors (client errors)
                if (error.status && error.status >= 400 && error.status < 500) {
                    throw error;
                }

                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                    this.logger.warn(
                        `Request failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`,
                    );
                    await this.sleep(delay);
                }
            }
        }

        throw lastError;
    }

    /**
     * Verify webhook signature
     * Standard HMAC verification
     */
    protected validateWebhookSignature(
        payload: any,
        signature: string,
        secret: string,
    ): boolean {
        try {
            const payloadString = typeof payload === 'string'
                ? payload
                : JSON.stringify(payload);

            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(payloadString)
                .digest('hex');

            // Constant-time comparison to prevent timing attacks
            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature),
            );
        } catch (error) {
            this.logger.error('Webhook signature verification failed', error);
            return false;
        }
    }

    /**
     * Calculate effective APR including all fees
     */
    protected calculateEffectiveAPR(
        principal: number,
        nominalRate: number,
        tenure: number,
        processingFee: number,
        otherFees: number = 0,
    ): number {
        const totalFees = processingFee + otherFees;
        const effectivePrincipal = principal - totalFees;

        // APR formula considering fees
        const monthlyRate = nominalRate / 12 / 100;
        const emi = this.calculateEMI(principal, nominalRate, tenure);
        const totalRepayment = emi * tenure;
        const totalInterestPlusFees = totalRepayment - effectivePrincipal;

        const effectiveAPR = (totalInterestPlusFees / effectivePrincipal / tenure * 12) * 100;

        return parseFloat(effectiveAPR.toFixed(2));
    }

    /**
     * Calculate EMI (Equated Monthly Installment)
     */
    protected calculateEMI(
        principal: number,
        annualRate: number,
        tenureMonths: number,
    ): number {
        const monthlyRate = annualRate / 12 / 100;

        if (monthlyRate === 0) {
            return principal / tenureMonths;
        }

        const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
            (Math.pow(1 + monthlyRate, tenureMonths) - 1);

        return parseFloat(emi.toFixed(2));
    }

    /**
     * Generate repayment schedule
     */
    protected generateRepaymentSchedule(
        principal: number,
        annualRate: number,
        tenure: number,
        startDate: Date = new Date(),
    ): Schedule {
        const emi = this.calculateEMI(principal, annualRate, tenure);
        const monthlyRate = annualRate / 12 / 100;

        let outstandingBalance = principal;
        let totalInterest = 0;

        const installments = [];

        for (let i = 1; i <= tenure; i++) {
            const interest = outstandingBalance * monthlyRate;
            const principalAmount = emi - interest;
            outstandingBalance -= principalAmount;
            totalInterest += interest;

            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i);

            installments.push({
                installmentNumber: i,
                dueDate,
                principal: parseFloat(principalAmount.toFixed(2)),
                interest: parseFloat(interest.toFixed(2)),
                totalAmount: emi,
                outstandingBalance: parseFloat(Math.max(0, outstandingBalance).toFixed(2)),
            });
        }

        return {
            installments,
            totalInterest: parseFloat(totalInterest.toFixed(2)),
            totalRepayment: parseFloat((emi * tenure).toFixed(2)),
        };
    }

    // ========================================
    // Abstract Protected Methods (Each adapter implements)
    // ========================================

    /**
     * Get authentication headers for partner API
     * Each partner has different auth mechanism
     */
    protected abstract getAuthHeaders(): Promise<Record<string, string>>;

    /**
     * Get base URL for partner API
     */
    protected abstract getBaseUrl(): string;

    /**
     * Get webhook secret for signature verification
     */
    protected abstract getWebhookSecret(): string;

    /**
     * Map standard application to partner-specific format
     * Each partner has different API schemas
     */
    protected abstract mapToPartnerFormat(application: StandardApplication): any;

    /**
     * Map partner response to standard offer format
     */
    protected abstract mapFromPartnerFormat(partnerResponse: any): PartnerOffer;

    // ========================================
    // Private Helper Methods
    // ========================================

    /**
     * Get full URL by combining base URL + path
     */
    private getFullUrl(path: string): string {
        const baseUrl = this.getBaseUrl();
        return path.startsWith('http') ? path : `${baseUrl}${path}`;
    }

    /**
     * Transform HTTP error to standard format
     */
    private transformError(error: any): any {
        return {
            partner: this.partnerId,
            status: error.response?.status || 500,
            code: error.response?.data?.code || 'PARTNER_ERROR',
            message: error.response?.data?.message || error.message || 'Partner API error',
            details: error.response?.data || {},
        };
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get configuration value
     */
    protected getConfig(key: string, defaultValue?: any): any {
        return this.configService.get(key, defaultValue);
    }

    /**
     * Log performance metrics
     */
    protected logMetrics(operation: string, durationMs: number, success: boolean) {
        this.logger.log(
            `[METRICS] ${this.partnerId} - ${operation}: ${durationMs}ms (${success ? 'SUCCESS' : 'FAILED'})`,
        );
    }
}
