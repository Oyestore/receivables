import { Request, Response, NextFunction } from 'express';
import { integrationMarketplaceService } from '../services/integration-marketplace.service';
import { auditService } from '../services/audit.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError } from '../../../Module_11_Common/code/errors/app-error';

const logger = new Logger('IntegrationsController');

export class IntegrationsController {
    /**
     * GET /api/v1/marketplace/integrations
     * Get marketplace integrations
     */
    async getMarketplaceIntegrations(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { category, activeOnly } = req.query;

            const integrations = await integrationMarketplaceService.getMarketplaceIntegrations(
                category as string,
                activeOnly !== 'false'
            );

            res.status(200).json({
                data: integrations,
                total: integrations.length,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/tenant/:tenantId/integrations
     * Connect tenant to integration
     */
    async connectIntegration(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { tenantId } = req.params;
            const { integrationId, credentials, config } = req.body;

            if (!integrationId) {
                throw new ValidationError('Integration ID is required');
            }

            const tenantIntegration = await integrationMarketplaceService.connectIntegration(
                {
                    tenantId,
                    integrationId,
                    credentials,
                    config,
                },
                req.user?.id
            );

            await auditService.log({
                tenantId,
                userId: req.user?.id,
                action: 'integration.connect',
                resourceType: 'integration',
                resourceId: tenantIntegration.id,
                changes: { integrationId },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(201).json({
                message: 'Integration connected',
                data: tenantIntegration,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/integrations/:id/oauth/initiate
     * Initiate OAuth flow
     */
    async initiateOAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: integrationId } = req.params;
            const { redirectUri, scope } = req.body;

            if (!req.user?.tenantId || !redirectUri) {
                throw new ValidationError('Tenant ID and redirect URI are required');
            }

            const oauthData = await integrationMarketplaceService.initiateOAuth({
                tenantId: req.user.tenantId,
                integrationId,
                redirectUri,
                scope,
            });

            res.status(200).json({
                message: 'OAuth flow initiated',
                data: oauthData,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/integrations/:id/oauth/callback
     * Complete OAuth flow
     */
    async completeOAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: integrationId } = req.params;
            const { code, state, redirectUri } = req.body;

            if (!req.user?.tenantId || !code || !state || !redirectUri) {
                throw new ValidationError('Missing required OAuth parameters');
            }

            const connection = await integrationMarketplaceService.completeOAuth({
                tenantId: req.user.tenantId,
                integrationId,
                code,
                state,
                redirectUri,
            });

            res.status(200).json({
                message: 'OAuth flow completed',
                data: { connectionId: connection.id, status: 'active' },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/integrations/:id/webhooks
     * Create webhook
     */
    async createWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: integrationId } = req.params;
            const { webhookUrl, events, secret, headers, tenantIntegrationId } = req.body;

            if (!webhookUrl || !events || !Array.isArray(events)) {
                throw new ValidationError('Webhook URL and events are required');
            }

            const webhook = await integrationMarketplaceService.createWebhook({
                integrationId,
                tenantIntegrationId,
                webhookUrl,
                events,
                secret,
                headers,
            });

            res.status(201).json({
                message: 'Webhook created',
                data: webhook,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/integration webhooks/:id/trigger
     * Trigger webhook (for testing)
     */
    async triggerWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: webhookId } = req.params;
            const { eventType, payload } = req.body;

            if (!eventType || !payload) {
                throw new ValidationError('Event type and payload are required');
            }

            const delivery = await integrationMarketplaceService.triggerWebhook({
                webhookId,
                eventType,
                payload,
            });

            res.status(202).json({
                message: 'Webhook triggered',
                data: delivery,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/connectors/:id/execute
     * Execute connector
     */
    async executeConnector(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: connectorId } = req.params;
            const { parameters } = req.body;

            const result = await integrationMarketplaceService.executeConnector({
                connectorId,
                parameters,
                tenantId: req.user?.tenantId,
            });

            res.status(200).json({
                message: 'Connector executed',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/tenant-integrations/:id/health
     * Get integration health
     */
    async getIntegrationHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: tenantIntegrationId } = req.params;

            const health = await integrationMarketplaceService.getIntegrationHealth(tenantIntegrationId);

            res.status(200).json({
                data: health,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const integrationsController = new IntegrationsController();
