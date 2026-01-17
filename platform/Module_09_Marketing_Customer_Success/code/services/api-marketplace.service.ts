import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * API Marketplace Service
 * 
 * PHASE 9.4: Third-party integrations, API key management, usage-based billing
 */

export interface APIIntegration {
    id: string;
    name: string;
    description: string;
    category: 'payment' | 'crm' | 'accounting' | 'communication' | 'analytics';

    // Provider
    providerId: string;
    providerName: string;

    // Capabilities
    endpoints: Array<{
        path: string;
        method: 'GET' | 'POST' | 'PUT' | 'DELETE';
        description: string;
    }>;

    // Pricing
    pricing: {
        type: 'free' | 'freemium' | 'paid';
        tiers: Array<{
            name: string;
            monthlyPrice: number;
            requestsIncluded: number;
            overagePrice: number;        // Per 1000 requests
        }>;
    };

    // Stats
    installCount: number;
    rating: number;
    reviewCount: number;

    // Status
    status: 'active' | 'beta' | 'deprecated';

    createdAt: Date;
}

export interface APIKey {
    id: string;
    tenantId: string;
    userId: string;

    // Key details
    key: string;
    name: string;
    description?: string;

    // Scopes & permissions
    scopes: string[];                  // e.g., ['read:customers', 'write:invoices']

    // Usage limits
    rateLimit: {
        requestsPerMinute: number;
        requestsPerDay: number;
    };

    // Tracking
    totalRequests: number;
    lastUsedAt?: Date;

    // Status
    status: 'active' | 'revoked';
    expiresAt?: Date;

    createdAt: Date;
}

export interface APIUsageStats {
    apiKeyId: string;
    period: {
        start: Date;
        end: Date;
    };

    // Usage
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;

    // Performance
    averageResponseTime: number;      // milliseconds
    p95ResponseTime: number;
    p99ResponseTime: number;

    // Endpoint breakdown
    topEndpoints: Array<{
        endpoint: string;
        requests: number;
        avgResponseTime: number;
    }>;

    // Billing
    freeRequestsUsed: number;
    billedRequests: number;
    estimatedCost: number;
}

@Injectable()
export class APIMarketplaceService {
    private readonly logger = new Logger(APIMarketplaceService.name);

    constructor(
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * List available integrations in marketplace
     */
    async listIntegrations(
        filters?: {
            category?: string;
            provider?: string;
            status?: 'active' | 'beta';
        },
    ): Promise<APIIntegration[]> {
        // Mock marketplace
        return [
            {
                id: 'int_stripe',
                name: 'Stripe Payment Gateway',
                description: 'Process payments via Stripe',
                category: 'payment',
                providerId: 'stripe',
                providerName: 'Stripe Inc.',
                endpoints: [
                    { path: '/api/v1/payments/process', method: 'POST', description: 'Process payment' },
                    { path: '/api/v1/payments/:id', method: 'GET', description: 'Get payment status' },
                ],
                pricing: {
                    type: 'freemium',
                    tiers: [
                        { name: 'Free', monthlyPrice: 0, requestsIncluded: 1000, overagePrice: 10 },
                        { name: 'Pro', monthlyPrice: 99, requestsIncluded: 10000, overagePrice: 5 },
                    ],
                },
                installCount: 1250,
                rating: 4.8,
                reviewCount: 342,
                status: 'active',
                createdAt: new Date(Date.now() - 365 * 24 * 3600000),
            },
            {
                id: 'int_quickbooks',
                name: 'QuickBooks Integration',
                description: 'Sync invoices with QuickBooks',
                category: 'accounting',
                providerId: 'quickbooks',
                providerName: 'Intuit',
                endpoints: [
                    { path: '/api/v1/accounting/sync', method: 'POST', description: 'Sync data' },
                ],
                pricing: {
                    type: 'paid',
                    tiers: [
                        { name: 'Standard', monthlyPrice: 49, requestsIncluded: 5000, overagePrice: 8 },
                    ],
                },
                installCount: 890,
                rating: 4.6,
                reviewCount: 215,
                status: 'active',
                createdAt: new Date(Date.now() - 180 * 24 * 3600000),
            },
        ];
    }

    /**
     * Generate API key for tenant
     */
    async generateAPIKey(
        tenantId: string,
        userId: string,
        config: {
            name: string;
            description?: string;
            scopes: string[];
            expiresInDays?: number;
        },
    ): Promise<APIKey> {
        const key = this.generateSecureKey();
        const expiresAt = config.expiresInDays
            ? new Date(Date.now() + config.expiresInDays * 24 * 3600000)
            : undefined;

        const apiKey: APIKey = {
            id: this.generateId(),
            tenantId,
            userId,
            key,
            name: config.name,
            description: config.description,
            scopes: config.scopes,
            rateLimit: {
                requestsPerMinute: 100,
                requestsPerDay: 10000,
            },
            totalRequests: 0,
            status: 'active',
            expiresAt,
            createdAt: new Date(),
        };

        this.logger.log(`API key generated: ${apiKey.name} for tenant ${tenantId}`);

        // Emit event
        this.eventEmitter.emit('api.key.generated', apiKey);

        return apiKey;
    }

    /**
     * Track API usage
     */
    async trackAPIRequest(
        apiKeyId: string,
        request: {
            endpoint: string;
            method: string;
            responseTime: number;
            statusCode: number;
        },
    ): Promise<void> {
        // In production: Store in time-series database
        this.logger.debug(`API request tracked: ${request.endpoint} (${request.responseTime}ms)`);

        // Update usage stats
        // Emit event for billing
        this.eventEmitter.emit('api.request.tracked', {
            apiKeyId,
            ...request,
            timestamp: new Date(),
        });
    }

    /**
     * Get API usage statistics
     */
    async getAPIUsageStats(
        apiKeyId: string,
        startDate: Date,
        endDate: Date,
    ): Promise<APIUsageStats> {
        // Mock usage stats
        const totalRequests = 5000 + Math.floor(Math.random() * 5000);
        const successfulRequests = Math.floor(totalRequests * 0.98);
        const failedRequests = totalRequests - successfulRequests;

        return {
            apiKeyId,
            period: { start: startDate, end: endDate },
            totalRequests,
            successfulRequests,
            failedRequests,
            averageResponseTime: 150 + Math.random() * 100,
            p95ResponseTime: 300 + Math.random() * 200,
            p99ResponseTime: 500 + Math.random() * 300,
            topEndpoints: [
                { endpoint: '/api/v1/invoices', requests: 2000, avgResponseTime: 120 },
                { endpoint: '/api/v1/customers', requests: 1500, avgResponseTime: 95 },
                { endpoint: '/api/v1/payments', requests: 1000, avgResponseTime: 180 },
            ],
            freeRequestsUsed: Math.min(1000, totalRequests),
            billedRequests: Math.max(0, totalRequests - 1000),
            estimatedCost: Math.max(0, (totalRequests - 1000) / 1000 * 10),
        };
    }

    /**
     * Revoke API key
     */
    async revokeAPIKey(
        apiKeyId: string,
        reason?: string,
    ): Promise<void> {
        this.logger.log(`API key revoked: ${apiKeyId}, reason: ${reason || 'not specified'}`);

        // Emit event
        this.eventEmitter.emit('api.key.revoked', { apiKeyId, reason });
    }

    /**
     * Get API marketplace analytics
     */
    async getMarketplaceAnalytics(): Promise<{
        totalIntegrations: number;
        activeIntegrations: number;
        totalAPIKeys: number;
        totalAPIRequests: number;
        topIntegrations: Array<{
            name: string;
            installCount: number;
            rating: number;
        }>;
    }> {
        return {
            totalIntegrations: 45,
            activeIntegrations: 38,
            totalAPIKeys: 892,
            totalAPIRequests: 12500000,
            topIntegrations: [
                { name: 'Stripe Payment Gateway', installCount: 1250, rating: 4.8 },
                { name: 'QuickBooks Integration', installCount: 890, rating: 4.6 },
                { name: 'Slack Notifications', installCount: 750, rating: 4.7 },
            ],
        };
    }

    // Private methods
    private generateSecureKey(): string {
        const prefix = 'sk';
        const random = Math.random().toString(36).substring(2) +
            Math.random().toString(36).substring(2);
        return `${prefix}_${random}`;
    }

    private generateId(): string {
        return `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
