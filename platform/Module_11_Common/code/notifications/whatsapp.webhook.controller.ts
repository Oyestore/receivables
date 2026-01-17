/**
 * WhatsApp Webhook Controller
 * 
 * Handles WhatsApp Business API webhooks for:
 * - Message delivery status updates
 * - Incoming messages
 * - User interactions
 * 
 * Setup Instructions:
 * 1. Register webhook URL in Meta Business Manager
 * 2. Set WHATSAPP_WEBHOOK_VERIFY_TOKEN in environment
 * 3. Configure this controller in your Express/NestJS app
 */

import { Logger } from '../logging/logger';
import { WhatsAppWebhookHandler } from './whatsapp.provider';

const logger = new Logger('WhatsAppWebhookController');

export class WhatsAppWebhookController {
    private webhookHandler: WhatsAppWebhookHandler;
    private verifyToken: string;

    constructor(verifyToken: string) {
        this.webhookHandler = new WhatsAppWebhookHandler();
        this.verifyToken = verifyToken;

        logger.info('WhatsApp Webhook Controller initialized');
    }

    /**
     * GET /webhooks/whatsapp - Webhook verification
     * Called by Meta to verify webhook ownership
     */
    async verify(query: {
        'hub.mode'?: string;
        'hub.verify_token'?: string;
        'hub.challenge'?: string;
    }): Promise<{ status: number; body?: string; error?: string }> {
        const mode = query['hub.mode'];
        const token = query['hub.verify_token'];
        const challenge = query['hub.challenge'];

        if (!mode || !token) {
            logger.warn('Webhook verification failed: missing parameters');
            return { status: 400, error: 'Missing parameters' };
        }

        const result = this.webhookHandler.verifyWebhook(mode, token, challenge!, this.verifyToken);

        if (result) {
            return { status: 200, body: result };
        }

        logger.warn('Webhook verification failed: invalid token');
        return { status: 403, error: 'Invalid verify token' };
    }

    /**
     * POST /webhooks/whatsapp - Webhook event handler
     * Receives message status updates and incoming messages
     */
    async handleEvent(body: any): Promise<{ status: number; message?: string }> {
        try {
            await this.webhookHandler.handleWebhook(body);

            return { status: 200, message: 'EVENT_RECEIVED' };
        } catch (error) {
            logger.error('Webhook event handling failed', {
                error: (error as Error).message,
            });

            return { status: 500, message: 'Internal server error' };
        }
    }

    /**
     * Register callback for delivery status updates
     */
    onDeliveryStatus(messageId: string, callback: (status: any) => void): void {
        this.webhookHandler.onDeliveryStatus(messageId, callback);
    }

    /**
     * Get webhook handler instance (for advanced usage)
     */
    getHandler(): WhatsAppWebhookHandler {
        return this.webhookHandler;
    }
}

/**
 * Express.js integration example
 */
export function createWhatsAppWebhookRoutes(
    app: any,
    verifyToken: string = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || ''
) {
    const controller = new WhatsAppWebhookController(verifyToken);

    // Webhook verification endpoint (GET)
    app.get('/webhooks/whatsapp', async (req: any, res: any) => {
        const result = await controller.verify(req.query);

        res.status(result.status);

        if (result.body) {
            res.send(result.body);
        } else if (result.error) {
            res.json({ error: result.error });
        }
    });

    // Webhook event endpoint (POST)
    app.post('/webhooks/whatsapp', async (req: any, res: any) => {
        const result = await controller.handleEvent(req.body);

        res.status(result.status).json({ message: result.message });
    });

    logger.info('WhatsApp webhook routes registered', {
        verifyEndpoint: 'GET /webhooks/whatsapp',
        eventEndpoint: 'POST /webhooks/whatsapp',
    });

    return controller;
}
