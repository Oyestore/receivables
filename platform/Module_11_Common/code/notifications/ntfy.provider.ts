/**
 * ntfy.sh Provider (Self-Hosted Open-Source Option)
 * 
 * 100% Open-Source, Self-Hosted Push Notifications
 * 
 * Features:
 * - Simple HTTP API
 * - Topic-based subscriptions
 * - Supports priorities, attachments, actions
 * - Unified solution for web + mobile
 * - Very lightweight (minimal resources)
 * 
 * Source: https://github.com/binwiederhier/ntfy (Apache 2.0 / GPL 2.0)
 * Deployment: Docker one-liner
 * Cost: $5-10/month (self-hosted) or Free (public instance with limits)
 */

import { Logger } from '../logging/logger';
import { ExternalServiceError } from '../errors/app-error';
import { IPushNotificationData, IPushNotificationResult } from './push.provider';

const logger = new Logger('NtfyProvider');

export interface INtfyOptions {
    serverUrl: string; // e.g., 'https://your-ntfy.com' or 'https://ntfy.sh'
    defaultTopic?: string;
    authToken?: string; // For private instances
}

/**
 * ntfy.sh Provider
 * Open-source, self-hosted push notifications
 */
export class NtfyProvider {
    private serverUrl: string;
    private defaultTopic: string;
    private authToken?: string;

    constructor(options: INtfyOptions) {
        this.serverUrl = options.serverUrl.replace(/\/$/, ''); // Remove trailing slash
        this.defaultTopic = options.defaultTopic || 'notifications';
        this.authToken = options.authToken;

        logger.info('ntfy provider initialized', {
            serverUrl: this.serverUrl,
            defaultTopic: this.defaultTopic,
        });
    }

    /**
     * Send notification to topic
     */
    async sendToTopic(
        topic: string,
        notification: IPushNotificationData,
        options?: {
            priority?: 1 | 2 | 3 | 4 | 5; // 1=min, 3=default, 5=max
            tags?: string[];
            click?: string; // URL to open on click
            attach?: string; // Attachment URL
            delay?: string; // Delivery delay (e.g., '30min')
        }
    ): Promise<IPushNotificationResult> {
        try {
            const axios = require('axios');

            const headers: Record<string, string> = {
                'Title': notification.title,
                'Priority': (options?.priority || 3).toString(),
            };

            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }

            if (options?.tags && options.tags.length > 0) {
                headers['Tags'] = options.tags.join(',');
            }

            if (options?.click || notification.clickAction) {
                headers['Click'] = options?.click || notification.clickAction!;
            }

            if (options?.attach || notification.imageUrl) {
                headers['Attach'] = options?.attach || notification.imageUrl!;
            }

            if (options?.delay) {
                headers['Delay'] = options.delay;
            }

            // Add custom data as JSON in body
            const messageBody = notification.data
                ? `${notification.body}\n\n${JSON.stringify(notification.data, null, 2)}`
                : notification.body;

            const response = await axios.post(
                `${this.serverUrl}/${topic}`,
                messageBody,
                { headers }
            );

            logger.info('ntfy notification sent', {
                topic,
                messageId: response.data?.id,
            });

            return {
                success: response.status === 200,
                messageId: response.data?.id || `ntfy_${Date.now()}`,
            };
        } catch (error: any) {
            logger.error('ntfy notification failed', {
                topic,
                error: error.response?.data || error.message,
                statusCode: error.response?.status,
            });

            throw new ExternalServiceError('ntfy notification failed', {
                provider: 'ntfy',
                error: error.response?.data || error.message,
                statusCode: error.response?.status,
            });
        }
    }

    /**
     * Send to user (using user-specific topic)
     */
    async sendToUser(
        userId: string,
        notification: IPushNotificationData,
        options?: Parameters<typeof this.sendToTopic>[2]
    ): Promise<IPushNotificationResult> {
        const userTopic = `user-${userId}`;
        return this.sendToTopic(userTopic, notification, options);
    }

    /**
     * Send broadcast (to default topic)
     */
    async sendBroadcast(
        notification: IPushNotificationData,
        options?: Parameters<typeof this.sendToTopic>[2]
    ): Promise<IPushNotificationResult> {
        return this.sendToTopic(this.defaultTopic, notification, options);
    }

    /**
     * Schedule notification (delayed delivery)
     */
    async scheduleNotification(
        topic: string,
        notification: IPushNotificationData,
        delay: string, // e.g., '30min', '2h', '1d'
        options?: Omit<Parameters<typeof this.sendToTopic>[2], 'delay'>
    ): Promise<IPushNotificationResult> {
        return this.sendToTopic(topic, notification, { ...options, delay });
    }
}

/**
 * ntfy.sh Webhook Handler
 * For receiving delivery confirmations (if enabled on ntfy server)
 */
export class NtfyWebhookHandler {
    /**
     * Handle ntfy webhook event
     */
    async handleWebhook(body: any): Promise<void> {
        try {
            logger.info('ntfy webhook received', {
                topic: body.topic,
                message: body.message,
                time: body.time,
            });

            // Process webhook (e.g., update delivery status in database)
            // Implementation depends on your requirements

        } catch (error) {
            logger.error('ntfy webhook handling failed', {
                error: (error as Error).message,
            });
        }
    }
}

/**
 * Deployment Guide for ntfy.sh
 * 
 * Docker (Self-Hosted):
 * ```bash
 * docker run -d \
 *   --name ntfy \
 *   -p 80:80 \
 *   -v /var/cache/ntfy:/var/cache/ntfy \
 *   binwiederhier/ntfy serve \
 *   --cache-file /var/cache/ntfy/cache.db \
 *   --behind-proxy
 * ```
 * 
 * Docker Compose:
 * ```yaml
 * version: "3"
 * services:
 *   ntfy:
 *     image: binwiederhier/ntfy
 * container_name: ntfy
 *     ports:
 *       - 80:80
 *     volumes:
 *       - ./cache:/var/cache/ntfy
 *     command: serve --cache-file /var/cache/ntfy/cache.db --behind-proxy
 *     restart: unless-stopped
 * ```
 * 
 * Environment Variables:
 * ```
 * NTFY_SERVER_URL=https://your-ntfy.com
 * NTFY_DEFAULT_TOPIC=sme-notifications
 * NTFY_AUTH_TOKEN=your-optional-token
 * ```
 * 
 * Cost: ~$5-10/month for VPS
 * Requirements: 512MB RAM, 1 CPU core
 */
