export interface IMarketplaceIntegration {
    id: string;
    integrationName: string;
    integrationSlug: string;
    category: 'payment' | 'crm' | 'accounting' | 'communication' | 'storage' | 'analytics' | 'other';
    provider: string;
    description?: string;
    logoUrl?: string;
    configSchema: any;
    authType: 'oauth2' | 'api_key' | 'basic' | 'custom';
    isOfficial: boolean;
    isActive: boolean;
    version?: string;
    documentationUrl?: string;
    supportContact?: string;
}

export interface ITenantIntegration {
    id: string;
    tenantId: string;
    integrationId: string;
    credentials?: any;
    config?: any;
    status: 'pending' | 'active' | 'paused' | 'error' | 'disconnected';
    lastSyncAt?: Date;
    errorMessage?: string;
    metadata?: any;
    createdBy?: string;
}

export interface IIntegrationConnector {
    id: string;
    integrationId: string;
    connectorName: string;
    connectorType: 'api' | 'webhook' | 'oauth_callback' | 'sync' | 'export' | 'import';
    endpointUrl?: string;
    httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    authConfig?: any;
    headers?: any;
    requestTemplate?: any;
    responseMapping?: any;
    retryConfig?: any;
    timeoutMs: number;
    isActive: boolean;
}

export interface IIntegrationWebhook {
    id: string;
    integrationId: string;
    tenantIntegrationId?: string;
    webhookUrl: string;
    events: string[];
    secret?: string;
    headers?: any;
    isActive: boolean;
    failedCount: number;
    lastTriggeredAt?: Date;
}

export interface IWebhookDelivery {
    id: string;
    webhookId: string;
    eventType: string;
    payload: any;
    deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed' | 'retrying';
    httpStatusCode?: number;
    responseBody?: string;
    attempts: number;
    maxAttempts: number;
    nextRetryAt?: Date;
    deliveredAt?: Date;
    errorMessage?: string;
}

export interface IOAuthConnection {
    id: string;
    tenantId: string;
    integrationId: string;
    tenantIntegrationId?: string;
    accessToken: string;
    refreshToken?: string;
    tokenType: string;
    expiresAt?: Date;
    scope?: string;
    state?: string;
    additionalData?: any;
}
