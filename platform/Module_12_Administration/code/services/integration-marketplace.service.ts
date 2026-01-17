import { Pool } from 'pg';
import axios, { AxiosRequestConfig } from 'axios';
import * as crypto from 'crypto';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError, NotFoundError } from '../../../Module_11_Common/code/errors/app-error';
import {
    IMarketplaceIntegration,
    ITenantIntegration,
    IIntegrationConnector,
    IIntegrationWebhook,
    IWebhookDelivery,
    IOAuthConnection,
} from '../interfaces/integration.interface';

const logger = new Logger('IntegrationMarketplaceService');

/**
 * Integration Marketplace Service
 * Third-party integration platform with OAuth2, webhooks, and connectors
 */
export class IntegrationMarketplaceService {
    private pool: Pool;

    constructor() {
        this.pool = databaseService.getPool();
    }

    /**
     * Get all marketplace integrations
     */
    async getMarketplaceIntegrations(category?: string, activeOnly: boolean = true): Promise<IMarketplaceIntegration[]> {
        try {
            let query = 'SELECT * FROM marketplace_integrations WHERE 1=1';
            const params: any[] = [];

            if (activeOnly) {
                query += ' AND is_active = true';
            }

            if (category) {
                params.push(category);
                query += ` AND category = $${params.length}`;
            }

            query += ' ORDER BY is_official DESC, integration_name ASC';

            const result = await this.pool.query(query, params);

            return result.rows.map(row => this.mapIntegrationFromDb(row));
        } catch (error) {
            logger.error('Failed to get marketplace integrations', { error });
            throw error;
        }
    }

    /**
     * Connect tenant to integration
     */
    async connectIntegration(data: {
        tenantId: string;
        integrationId: string;
        credentials?: any;
        config?: any;
    }, createdBy: string): Promise<ITenantIntegration> {
        try {
            // Verify integration exists
            const integration = await this.getIntegrationById(data.integrationId);
            if (!integration) {
                throw new NotFoundError('Integration not found');
            }

            // Encrypt sensitive credentials
            const encryptedCredentials = data.credentials
                ? this.encryptCredentials(data.credentials)
                : null;

            const result = await this.pool.query(
                `INSERT INTO tenant_integrations (
          tenant_id, integration_id, credentials, config, status, created_by
        ) VALUES ($1, $2, $3, $4, 'pending', $5)
        ON CONFLICT (tenant_id, integration_id)
        DO UPDATE SET
          credentials = EXCLUDED.credentials,
          config = EXCLUDED.config,
          status = 'pending',
          updated_at = CURRENT_TIMESTAMP
        RETURNING *`,
                [
                    data.tenantId,
                    data.integrationId,
                    encryptedCredentials,
                    data.config ? JSON.stringify(data.config) : null,
                    createdBy,
                ]
            );

            logger.info('Tenant integration connected', {
                tenantId: data.tenantId,
                integrationId: data.integrationId,
            });

            return this.mapTenantIntegrationFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to connect integration', { error, data });
            throw error;
        }
    }

    /**
     * Initiate OAuth2 authorization flow
     */
    async initiateOAuth(data: {
        tenantId: string;
        integrationId: string;
        redirectUri: string;
        scope?: string;
    }): Promise<{ authorizationUrl: string; state: string }> {
        try {
            const integration = await this.getIntegrationById(data.integrationId);
            if (!integration || integration.authType !== 'oauth2') {
                throw new ValidationError('Integration does not support OAuth2');
            }

            // Generate secure state
            const state = crypto.randomBytes(32).toString('hex');

            // Build authorization URL based on provider
            const authUrl = this.buildOAuthUrl(integration, data.redirectUri, state, data.scope);

            // Store state temporarily (in production, use Redis with TTL)
            await this.pool.query(
                `INSERT INTO oauth_connections (tenant_id, integration_id, state, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')
         ON CONFLICT (tenant_id, integration_id)
         DO UPDATE SET state = EXCLUDED.state, expires_at = EXCLUDED.expires_at`,
                [data.tenantId, data.integrationId, state]
            );

            logger.info('OAuth flow initiated', {
                tenantId: data.tenantId,
                integrationId: data.integrationId,
            });

            return { authorizationUrl: authUrl, state };
        } catch (error) {
            logger.error('Failed to initiate OAuth', { error, data });
            throw error;
        }
    }

    /**
     * Complete OAuth2 authorization with callback
     */
    async completeOAuth(data: {
        tenantId: string;
        integrationId: string;
        code: string;
        state: string;
        redirectUri: string;
    }): Promise<IOAuthConnection> {
        try {
            // Verify state
            const stateCheck = await this.pool.query(
                'SELECT * FROM oauth_connections WHERE tenant_id = $1 AND integration_id = $2 AND state = $3',
                [data.tenantId, data.integrationId, data.state]
            );

            if (stateCheck.rows.length === 0) {
                throw new ValidationError('Invalid OAuth state');
            }

            const integration = await this.getIntegrationById(data.integrationId);

            // Exchange code for token
            const tokenData = await this.exchangeOAuthCode(integration, data.code, data.redirectUri);

            // Calculate expiration
            const expiresAt = tokenData.expires_in
                ? new Date(Date.now() + tokenData.expires_in * 1000)
                : null;

            // Update OAuth connection
            const result = await this.pool.query(
                `UPDATE oauth_connections
         SET access_token = $1,
             refresh_token = $2,
             token_type = $3,
             expires_at = $4,
             scope = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE tenant_id = $6 AND integration_id = $7
         RETURNING *`,
                [
                    tokenData.access_token,
                    tokenData.refresh_token || null,
                    tokenData.token_type || 'Bearer',
                    expiresAt,
                    tokenData.scope || data.scope || null,
                    data.tenantId,
                    data.integrationId,
                ]
            );

            // Update tenant integration status
            await this.pool.query(
                `UPDATE tenant_integrations
         SET status = 'active', updated_at = CURRENT_TIMESTAMP
         WHERE tenant_id = $1 AND integration_id = $2`,
                [data.tenantId, data.integrationId]
            );

            logger.info('OAuth flow completed', {
                tenantId: data.tenantId,
                integrationId: data.integrationId,
            });

            return this.mapOAuthConnectionFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to complete OAuth', { error, data });
            throw error;
        }
    }

    /**
     * Refresh OAuth2 token
     */
    async refreshOAuthToken(oauthConnectionId: string): Promise<IOAuthConnection> {
        try {
            const connectionResult = await this.pool.query(
                'SELECT * FROM oauth_connections WHERE id = $1',
                [oauthConnectionId]
            );

            if (connectionResult.rows.length === 0) {
                throw new NotFoundError('OAuth connection not found');
            }

            const connection = connectionResult.rows[0];

            if (!connection.refresh_token) {
                throw new ValidationError('No refresh token available');
            }

            const integration = await this.getIntegrationById(connection.integration_id);

            // Refresh token
            const tokenData = await this.refreshOAuthTokenExternal(integration, connection.refresh_token);

            const expiresAt = tokenData.expires_in
                ? new Date(Date.now() + tokenData.expires_in * 1000)
                : null;

            const result = await this.pool.query(
                `UPDATE oauth_connections
         SET access_token = $1,
             refresh_token = COALESCE($2, refresh_token),
             expires_at = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
                [tokenData.access_token, tokenData.refresh_token, expiresAt, oauthConnectionId]
            );

            logger.info('OAuth token refreshed', { oauthConnectionId });

            return this.mapOAuthConnectionFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to refresh OAuth token', { error, oauthConnectionId });
            throw error;
        }
    }

    /**
     * Create webhook
     */
    async createWebhook(webhookData: {
        integrationId: string;
        tenantIntegrationId?: string;
        webhookUrl: string;
        events: string[];
        secret?: string;
        headers?: any;
    }): Promise<IIntegrationWebhook> {
        try {
            // Generate secret if not provided
            const secret = webhookData.secret || crypto.randomBytes(32).toString('hex');

            const result = await this.pool.query(
                `INSERT INTO integration_webhooks (
          integration_id, tenant_integration_id, webhook_url, events,
          secret, headers, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING *`,
                [
                    webhookData.integrationId,
                    webhookData.tenantIntegrationId || null,
                    webhookData.webhookUrl,
                    webhookData.events,
                    secret,
                    webhookData.headers ? JSON.stringify(webhookData.headers) : null,
                ]
            );

            logger.info('Webhook created', {
                webhookId: result.rows[0].id,
                integrationId: webhookData.integrationId,
            });

            return this.mapWebhookFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to create webhook', { error, webhookData });
            throw error;
        }
    }

    /**
     * Trigger webhook delivery
     */
    async triggerWebhook(data: {
        webhookId: string;
        eventType: string;
        payload: any;
    }): Promise<IWebhookDelivery> {
        try {
            // Create delivery record
            const result = await this.pool.query(
                `INSERT INTO webhook_deliveries (
          webhook_id, event_type, payload, delivery_status, attempts
        ) VALUES ($1, $2, $3, 'pending', 0)
        RETURNING *`,
                [data.webhookId, data.eventType, JSON.stringify(data.payload)]
            );

            const delivery = this.mapWebhookDeliveryFromDb(result.rows[0]);

            // Asynchronously deliver webhook
            setImmediate(() => this.deliverWebhook(delivery.id));

            return delivery;
        } catch (error) {
            logger.error('Failed to trigger webhook', { error, data });
            throw error;
        }
    }

    /**
     * Deliver webhook (async)
     */
    private async deliverWebhook(deliveryId: string): Promise<void> {
        try {
            // Get delivery and webhook details
            const deliveryResult = await this.pool.query(
                `SELECT wd.*, iw.webhook_url, iw.secret, iw.headers
         FROM webhook_deliveries wd
         JOIN integration_webhooks iw ON wd.webhook_id = iw.id
         WHERE wd.id = $1`,
                [deliveryId]
            );

            if (deliveryResult.rows.length === 0) {
                return;
            }

            const delivery = deliveryResult.rows[0];

            // Generate signature
            const signature = crypto
                .createHmac('sha256', delivery.secret)
                .update(JSON.stringify(delivery.payload))
                .digest('hex');

            // Prepare headers
            const headers = {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature,
                'X-Webhook-Event': delivery.event_type,
                ...(delivery.headers || {}),
            };

            // Deliver webhook
            const response = await axios.post(delivery.webhook_url, delivery.payload, {
                headers,
                timeout: 30000,
            });

            // Update delivery status
            await this.pool.query(
                `UPDATE webhook_deliveries
         SET delivery_status = 'delivered',
             http_status_code = $1,
             response_body = $2,
             delivered_at = CURRENT_TIMESTAMP,
             attempts = attempts + 1
         WHERE id = $3`,
                [response.status, response.data ? JSON.stringify(response.data).substring(0, 1000) : null, deliveryId]
            );

            // Update webhook last triggered
            await this.pool.query(
                'UPDATE integration_webhooks SET last_triggered_at = CURRENT_TIMESTAMP WHERE id = $1',
                [delivery.webhook_id]
            );

            logger.info('Webhook delivered', { deliveryId, httpStatus: response.status });
        } catch (error) {
            const attempts = await this.incrementWebhookAttempts(deliveryId);

            if (attempts >= 3) {
                // Mark as failed
                await this.pool.query(
                    `UPDATE webhook_deliveries
           SET delivery_status = 'failed',
               error_message = $1
           WHERE id = $2`,
                    [error.message, deliveryId]
                );

                // Increment webhook failed count
                await this.pool.query(
                    `UPDATE integration_webhooks
           SET failed_count = failed_count + 1
           WHERE id = (SELECT webhook_id FROM webhook_deliveries WHERE id = $1)`,
                    [deliveryId]
                );
            } else {
                // Schedule retry
                const nextRetry = new Date(Date.now() + Math.pow(2, attempts) * 60000); // Exponential backoff

                await this.pool.query(
                    `UPDATE webhook_deliveries
           SET delivery_status = 'retrying',
               next_retry_at = $1,
               error_message = $2
           WHERE id = $3`,
                    [nextRetry, error.message, deliveryId]
                );
            }

            logger.error('Webhook delivery failed', { error, deliveryId, attempts });
        }
    }

    /**
     * Execute connector
     */
    async executeConnector(data: {
        connectorId: string;
        parameters?: any;
        tenantId?: string;
    }): Promise<any> {
        try {
            const connectorResult = await this.pool.query(
                'SELECT * FROM integration_connectors WHERE id = $1',
                [data.connectorId]
            );

            if (connectorResult.rows.length === 0) {
                throw new NotFoundError('Connector not found');
            }

            const connector = connectorResult.rows[0];

            // Build request
            const requestConfig: AxiosRequestConfig = {
                method: connector.http_method || 'GET',
                url: this.interpolateTemplate(connector.endpoint_url, data.parameters),
                headers: connector.headers || {},
                timeout: connector.timeout_ms,
            };

            // Add authentication
            if (data.tenantId) {
                const auth = await this.getIntegrationAuth(data.tenantId, connector.integration_id);
                if (auth) {
                    requestConfig.headers['Authorization'] = `Bearer ${auth.access_token}`;
                }
            }

            // Add request body
            if (connector.request_template && (connector.http_method === 'POST' || connector.http_method === 'PUT')) {
                requestConfig.data = this.interpolateTemplate(connector.request_template, data.parameters);
            }

            // Execute request
            const response = await axios(requestConfig);

            // Map response
            const mappedResponse = connector.response_mapping
                ? this.mapResponse(response.data, connector.response_mapping)
                : response.data;

            logger.info('Connector executed', {
                connectorId: data.connectorId,
                statusCode: response.status,
            });

            return mappedResponse;
        } catch (error) {
            logger.error('Connector execution failed', { error, data });
            throw error;
        }
    }

    /**
     * Get integration health
     */
    async getIntegrationHealth(tenantIntegrationId: string): Promise<any> {
        try {
            const result = await this.pool.query(
                `SELECT ti.*, mi.integration_name, mi.provider
         FROM tenant_integrations ti
         JOIN marketplace_integrations mi ON ti.integration_id = mi.id
         WHERE ti.id = $1`,
                [tenantIntegrationId]
            );

            if (result.rows.length === 0) {
                throw new NotFoundError('Tenant integration not found');
            }

            const integration = result.rows[0];

            // Get webhook delivery stats
            const webhookStats = await this.pool.query(
                `SELECT
           COUNT(*) FILTER (WHERE delivery_status = 'delivered') as delivered,
           COUNT(*) FILTER (WHERE delivery_status = 'failed') as failed,
           COUNT(*) FILTER (WHERE delivery_status = 'retrying') as retrying
         FROM webhook_deliveries wd
         JOIN integration_webhooks iw ON wd.webhook_id = iw.id
         WHERE iw.tenant_integration_id = $1
           AND wd.created_at >= NOW() - INTERVAL '24 hours'`,
                [tenantIntegrationId]
            );

            return {
                integrationId: integration.id,
                integrationName: integration.integration_name,
                provider: integration.provider,
                status: integration.status,
                lastSync: integration.last_sync_at,
                errorMessage: integration.error_message,
                webhookStats: {
                    delivered: parseInt(webhookStats.rows[0].delivered, 10) || 0,
                    failed: parseInt(webhookStats.rows[0].failed, 10) || 0,
                    retrying: parseInt(webhookStats.rows[0].retrying, 10) || 0,
                    successRate: this.calculateSuccessRate(webhookStats.rows[0]),
                },
            };
        } catch (error) {
            logger.error('Failed to get integration health', { error, tenantIntegrationId });
            throw error;
        }
    }

    /**
     * Helper methods
     */

    private async getIntegrationById(integrationId: string): Promise<IMarketplaceIntegration | null> {
        const result = await this.pool.query(
            'SELECT * FROM marketplace_integrations WHERE id = $1',
            [integrationId]
        );

        return result.rows.length > 0 ? this.mapIntegrationFromDb(result.rows[0]) : null;
    }

    private async getIntegrationAuth(tenantId: string, integrationId: string): Promise<IOAuthConnection | null> {
        const result = await this.pool.query(
            'SELECT * FROM oauth_connections WHERE tenant_id = $1 AND integration_id = $2',
            [tenantId, integrationId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const connection = result.rows[0];

        // Check if token needs refresh
        if (connection.expires_at && new Date(connection.expires_at) < new Date()) {
            return await this.refreshOAuthToken(connection.id);
        }

        return this.mapOAuthConnectionFromDb(connection);
    }

    private buildOAuthUrl(integration: IMarketplaceIntegration, redirectUri: string, state: string, scope?: string): string {
        // Simplified - in production, would have provider-specific implementations
        const baseUrls = {
            'stripe': 'https://connect.stripe.com/oauth/authorize',
            'paypal': 'https://www.paypal.com/connect',
            'salesforce': 'https://login.salesforce.com/services/oauth2/authorize',
            'quickbooks': 'https://appcenter.intuit.com/connect/oauth2',
            'slack': 'https://slack.com/oauth/v2/authorize',
        };

        const baseUrl = baseUrls[integration.integrationSlug] || 'https://oauth.example.com/authorize';
        const params = new URLSearchParams({
            client_id: integration.config Schema?.client_id || 'client_id_here',
            redirect_uri: redirectUri,
            state,
            scope: scope || 'read write',
            response_type: 'code',
    });

    return `${baseUrl}?${params.toString()}`;
  }

  private async exchangeOAuthCode(integration: IMarketplaceIntegration, code: string, redirectUri: string): Promise < any > {
    // Simplified - in production, would have provider-specific implementations
    return {
        access_token: 'mock_access_token_' + crypto.randomBytes(16).toString('hex'),
        refresh_token: 'mock_refresh_token_' + crypto.randomBytes(16).toString('hex'),
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
    };
}

  private async refreshOAuthTokenExternal(integration: IMarketplaceIntegration, refreshToken: string): Promise < any > {
    // Simplified - in production, would call actual provider APIs
    return {
        access_token: 'refreshed_access_token_' + crypto.randomBytes(16).toString('hex'),
        token_type: 'Bearer',
        expires_in: 3600,
    };
}

  private encryptCredentials(credentials: any): string {
    // Simplified encryption - in production, use proper encryption (AES-256)
    return Buffer.from(JSON.stringify(credentials)).toString('base64');
}

  private interpolateTemplate(template: any, parameters: any): any {
    if (typeof template === 'string') {
        return template.replace(/\{\{(\w+)\}\}/g, (_, key) => parameters?.[key] || '');
    }
    return template;
}

  private mapResponse(data: any, mapping: any): any {
    // Simplified response mapping
    return data;
}

  private async incrementWebhookAttempts(deliveryId: string): Promise < number > {
    const result = await this.pool.query(
        'UPDATE webhook_deliveries SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts',
        [deliveryId]
    );

    return result.rows[0].attempts;
}

  private calculateSuccessRate(stats: any): number {
    const total = (parseInt(stats.delivered, 10) || 0) + (parseInt(stats.failed, 10) || 0);
    if (total === 0) return 100;

    return Math.round(((parseInt(stats.delivered, 10) || 0) / total) * 100);
}

  /**
   * Mapping functions
   */

  private mapIntegrationFromDb(row: any): IMarketplaceIntegration {
    return {
        id: row.id,
        integrationName: row.integration_name,
        integrationSlug: row.integration_slug,
        category: row.category,
        provider: row.provider,
        description: row.description,
        logoUrl: row.logo_url,
        configSchema: row.config_schema,
        authType: row.auth_type,
        isOfficial: row.is_official,
        isActive: row.is_active,
        version: row.version,
        documentationUrl: row.documentation_url,
        supportContact: row.support_contact,
    };
}

  private mapTenantIntegrationFromDb(row: any): ITenantIntegration {
    return {
        id: row.id,
        tenantId: row.tenant_id,
        integrationId: row.integration_id,
        credentials: row.credentials,
        config: row.config,
        status: row.status,
        lastSyncAt: row.last_sync_at,
        errorMessage: row.error_message,
        metadata: row.metadata,
        createdBy: row.created_by,
    };
}

  private mapWebhookFromDb(row: any): IIntegrationWebhook {
    return {
        id: row.id,
        integrationId: row.integration_id,
        tenantIntegrationId: row.tenant_integration_id,
        webhookUrl: row.webhook_url,
        events: row.events,
        secret: row.secret,
        headers: row.headers,
        isActive: row.is_active,
        failedCount: row.failed_count,
        lastTriggeredAt: row.last_triggered_at,
    };
}

  private mapWebhookDeliveryFromDb(row: any): IWebhookDelivery {
    return {
        id: row.id,
        webhookId: row.webhook_id,
        eventType: row.event_type,
        payload: row.payload,
        deliveryStatus: row.delivery_status,
        httpStatusCode: row.http_status_code,
        responseBody: row.response_body,
        attempts: row.attempts,
        maxAttempts: row.max_attempts,
        nextRetryAt: row.next_retry_at,
        deliveredAt: row.delivered_at,
        errorMessage: row.error_message,
    };
}

  private mapOAuthConnectionFromDb(row: any): IOAuthConnection {
    return {
        id: row.id,
        tenantId: row.tenant_id,
        integrationId: row.integration_id,
        tenantIntegrationId: row.tenant_integration_id,
        accessToken: row.access_token,
        refreshToken: row.refresh_token,
        tokenType: row.token_type,
        expiresAt: row.expires_at,
        scope: row.scope,
        state: row.state,
        additionalData: row.additional_data,
    };
}
}

export const integrationMarketplaceService = new IntegrationMarketplaceService();
