/**
 * SMS Provider Integration
 * 
 * Production-ready SMS service with support for multiple providers:
 * - Twilio (primary)
 * - AWS SNS (secondary)
 * - Generic webhook (fallback)
 * 
 * Features:
 * - Provider abstraction
 * - Retry logic
 * - Delivery status tracking
 * - Unicode support
 */

import { Logger } from '../logging/logger';
import { ExternalServiceError } from '../errors/app-error';
import { ISMSData, INotificationResult } from './notification.service';

const logger = new Logger('SMSProvider');

export interface ISMSProvider {
    send(data: ISMSData): Promise<INotificationResult>;
    getName(): string;
}

/**
 * Twilio SMS Provider
 */
export class TwilioProvider implements ISMSProvider {
    private client: any;

    constructor(private config: { accountSid: string; authToken: string; fromNumber: string }) {
        try {
            const twilio = require('twilio');
            this.client = twilio(config.accountSid, config.authToken);

            logger.info('Twilio provider initialized', {
                fromNumber: config.fromNumber,
            });
        } catch (error) {
            logger.warn('Twilio package not available', { error });
            throw new Error('Twilio package not installed');
        }
    }

    async send(data: ISMSData): Promise<INotificationResult> {
        try {
            const message = await this.client.messages.create({
                body: data.message,
                from: data.from || this.config.fromNumber,
                to: data.to,
            });

            logger.info('SMS sent via Twilio', {
                to: data.to,
                messageId: message.sid,
                status: message.status,
            });

            return {
                success: true,
                messageId: message.sid,
            };
        } catch (error: any) {
            logger.error('Twilio SMS failed', {
                to: data.to,
                error: error.message,
                code: error.code,
            });

            throw new ExternalServiceError('Twilio SMS failed', {
                provider: 'twilio',
                error: error.message,
                code: error.code,
            });
        }
    }

    getName(): string {
        return 'Twilio';
    }
}

/**
 * AWS SNS SMS Provider
 */
export class SNSProvider implements ISMSProvider {
    private sns: any;

    constructor(private config: { region: string; accessKeyId?: string; secretAccessKey?: string }) {
        try {
            const AWS = require('aws-sdk');

            this.sns = new AWS.SNS({
                region: config.region,
                ...(config.accessKeyId && config.secretAccessKey
                    ? {
                        accessKeyId: config.accessKeyId,
                        secretAccessKey: config.secretAccessKey,
                    }
                    : {}),
            });

            logger.info('AWS SNS provider initialized', { region: config.region });
        } catch (error) {
            logger.warn('AWS SDK not available', { error });
            throw new Error('AWS SDK package not installed');
        }
    }

    async send(data: ISMSData): Promise<INotificationResult> {
        try {
            const params = {
                Message: data.message,
                PhoneNumber: data.to,
                MessageAttributes: {
                    'AWS.SNS.SMS.SMSType': {
                        DataType: 'String',
                        StringValue: 'Transactional', // or 'Promotional'
                    },
                },
            };

            const result = await this.sns.publish(params).promise();

            logger.info('SMS sent via AWS SNS', {
                to: data.to,
                messageId: result.MessageId,
            });

            return {
                success: true,
                messageId: result.MessageId,
            };
        } catch (error: any) {
            logger.error('AWS SNS SMS failed', {
                to: data.to,
                error: error.message,
                code: error.code,
            });

            throw new ExternalServiceError('AWS SNS SMS failed', {
                provider: 'aws-sns',
                error: error.message,
                code: error.code,
            });
        }
    }

    getName(): string {
        return 'AWS SNS';
    }
}

/**
 * Generic Webhook SMS Provider
 * For integration with custom SMS gateways
 */
export class WebhookSMSProvider implements ISMSProvider {
    constructor(
        private config: {
            url: string;
            method: 'POST' | 'GET';
            headers?: Record<string, string>;
            bodyTemplate?: string;
        }
    ) {
        logger.info('Webhook SMS provider initialized', { url: config.url });
    }

    async send(data: ISMSData): Promise<INotificationResult> {
        try {
            const axios = require('axios');

            // Replace placeholders in body template
            let body = this.config.bodyTemplate || JSON.stringify({ to: data.to, message: data.message });
            body = body.replace('{{to}}', data.to);
            body = body.replace('{{message}}', data.message);
            body = body.replace('{{from}}', data.from || '');

            const response = await axios({
                method: this.config.method,
                url: this.config.url,
                headers: this.config.headers || { 'Content-Type': 'application/json' },
                data: this.config.method === 'POST' ? body : undefined,
                params: this.config.method === 'GET' ? { to: data.to, message: data.message } : undefined,
            });

            const messageId = response.data?.messageId || response.data?.id || `webhook_${Date.now()}`;

            logger.info('SMS sent via Webhook', {
                to: data.to,
                messageId,
                statusCode: response.status,
            });

            return {
                success: true,
                messageId,
            };
        } catch (error: any) {
            logger.error('Webhook SMS failed', {
                to: data.to,
                error: error.message,
                statusCode: error.response?.status,
            });

            throw new ExternalServiceError('Webhook SMS failed', {
                provider: 'webhook',
                error: error.message,
                statusCode: error.response?.status,
            });
        }
    }

    getName(): string {
        return 'Webhook';
    }
}

/**
 * SMS Provider Factory
 */
export class SMSProviderFactory {
    static create(providerName: string, config: any): ISMSProvider {
        switch (providerName.toLowerCase()) {
            case 'twilio':
                return new TwilioProvider({
                    accountSid: config.accountSid,
                    authToken: config.authToken,
                    fromNumber: config.fromNumber,
                });

            case 'sns':
            case 'aws-sns':
                return new SNSProvider({
                    region: config.region || 'us-east-1',
                    accessKeyId: config.accessKeyId,
                    secretAccessKey: config.secretAccessKey,
                });

            case 'webhook':
                return new WebhookSMSProvider({
                    url: config.url,
                    method: config.method || 'POST',
                    headers: config.headers,
                    bodyTemplate: config.bodyTemplate,
                });

            default:
                throw new Error(`Unknown SMS provider: ${providerName}`);
        }
    }
}

/**
 * SMS Delivery Service with Retry Logic
 */
export class SMSDeliveryService {
    private provider: ISMSProvider;
    private maxRetries: number;
    private retryDelay: number;

    constructor(provider: ISMSProvider, options: { maxRetries?: number; retryDelay?: number } = {}) {
        this.provider = provider;
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000;
    }

    async send(data: ISMSData): Promise<INotificationResult> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                logger.debug(`SMS delivery attempt ${attempt}/${this.maxRetries}`, {
                    to: data.to,
                    provider: this.provider.getName(),
                });

                const result = await this.provider.send(data);

                if (attempt > 1) {
                    logger.info('SMS delivered after retry', {
                        to: data.to,
                        attempt,
                        provider: this.provider.getName(),
                    });
                }

                return result;
            } catch (error) {
                lastError = error as Error;

                logger.warn(`SMS delivery attempt ${attempt} failed`, {
                    to: data.to,
                    attempt,
                    error: (error as Error).message,
                });

                if (attempt < this.maxRetries) {
                    // Exponential backoff
                    const delay = this.retryDelay * Math.pow(2, attempt - 1);
                    logger.debug(`Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                }
            }
        }

        // All retries failed
        logger.error('SMS delivery failed after all retries', {
            to: data.to,
            attempts: this.maxRetries,
            error: lastError?.message,
        });

        throw lastError || new Error('SMS delivery failed');
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
