/**
 * Email Provider Integration
 * 
 * Production-ready email service with support for multiple providers:
 * - SendGrid (primary)
 * - AWS SES (secondary)
 * - SMTP fallback
 * 
 * Features:
 * - Provider abstraction
 * - Retry logic with exponential backoff
 * - Delivery status tracking
 * - Template support
 */

import { Logger } from '../logging/logger';
import { ExternalServiceError } from '../errors/app-error';
import { IEmailData, INotificationResult } from './notification.service';

const logger = new Logger('EmailProvider');

export interface IEmailProvider {
    send(data: IEmailData): Promise<INotificationResult>;
    getName(): string;
}

/**
 * SendGrid Email Provider
 */
export class SendGridProvider implements IEmailProvider {
    private sgMail: any;

    constructor(private apiKey: string) {
        // Dynamic import to avoid requiring the package if not using SendGrid
        try {
            this.sgMail = require('@sendgrid/mail');
            this.sgMail.setApiKey(this.apiKey);
            logger.info('SendGrid provider initialized');
        } catch (error) {
            logger.warn('SendGrid package not available', { error });
            throw new Error('SendGrid package (@sendgrid/mail) not installed');
        }
    }

    async send(data: IEmailData): Promise<INotificationResult> {
        try {
            const msg = {
                to: data.to,
                from: data.from || process.env.EMAIL_FROM_ADDRESS || 'noreply@smeplatform.com',
                subject: data.subject,
                text: data.text,
                html: data.html,
                cc: data.cc,
                bcc: data.bcc,
                attachments: data.attachments?.map(att => ({
                    filename: att.filename,
                    content: att.content,
                    type: att.contentType,
                })),
            };

            const response = await this.sgMail.send(msg);

            // SendGrid returns an array of responses
            const messageId = response[0]?.headers?.['x-message-id'] || `sendgrid_${Date.now()}`;

            logger.info('Email sent via SendGrid', {
                to: data.to,
                subject: data.subject,
                messageId,
            });

            return {
                success: true,
                messageId,
            };
        } catch (error: any) {
            logger.error('SendGrid email failed', {
                to: data.to,
                subject: data.subject,
                error: error.message,
                code: error.code,
            });

            throw new ExternalServiceError('SendGrid email failed', {
                provider: 'sendgrid',
                error: error.message,
                code: error.code,
            });
        }
    }

    getName(): string {
        return 'SendGrid';
    }
}

/**
 * AWS SES Email Provider
 */
export class SESProvider implements IEmailProvider {
    private ses: any;

    constructor(private config: { region: string; accessKeyId?: string; secretAccessKey?: string }) {
        try {
            const AWS = require('aws-sdk');

            this.ses = new AWS.SES({
                region: config.region,
                ...(config.accessKeyId && config.secretAccessKey
                    ? {
                        accessKeyId: config.accessKeyId,
                        secretAccessKey: config.secretAccessKey,
                    }
                    : {}),
            });

            logger.info('AWS SES provider initialized', { region: config.region });
        } catch (error) {
            logger.warn('AWS SDK not available', { error });
            throw new Error('AWS SDK package (aws-sdk) not installed');
        }
    }

    async send(data: IEmailData): Promise<INotificationResult> {
        try {
            const params: any = {
                Source: data.from || process.env.EMAIL_FROM_ADDRESS || 'noreply@smeplatform.com',
                Destination: {
                    ToAddresses: Array.isArray(data.to) ? data.to : [data.to],
                },
                Message: {
                    Subject: {
                        Data: data.subject,
                        Charset: 'UTF-8',
                    },
                    Body: {},
                },
            };

            // Add CC and BCC if present
            if (data.cc) {
                params.Destination.CcAddresses = Array.isArray(data.cc) ? data.cc : [data.cc];
            }
            if (data.bcc) {
                params.Destination.BccAddresses = Array.isArray(data.bcc) ? data.bcc : [data.bcc];
            }

            // Add body content
            if (data.html) {
                params.Message.Body.Html = {
                    Data: data.html,
                    Charset: 'UTF-8',
                };
            }
            if (data.text) {
                params.Message.Body.Text = {
                    Data: data.text,
                    Charset: 'UTF-8',
                };
            }

            // Note: SES doesn't support attachments in simple send
            // For attachments, use sendRawEmail with MIME message
            if (data.attachments && data.attachments.length > 0) {
                return this.sendRawEmail(data);
            }

            const result = await this.ses.sendEmail(params).promise();

            logger.info('Email sent via AWS SES', {
                to: data.to,
                subject: data.subject,
                messageId: result.MessageId,
            });

            return {
                success: true,
                messageId: result.MessageId,
            };
        } catch (error: any) {
            logger.error('AWS SES email failed', {
                to: data.to,
                subject: data.subject,
                error: error.message,
                code: error.code,
            });

            throw new ExternalServiceError('AWS SES email failed', {
                provider: 'aws-ses',
                error: error.message,
                code: error.code,
            });
        }
    }

    private async sendRawEmail(data: IEmailData): Promise<INotificationResult> {
        // For attachments, construct raw MIME message
        // This is a simplified implementation
        const nodemailer = require('nodemailer');

        const transporter = nodemailer.createTransport({
            SES: { ses: this.ses, aws: require('aws-sdk') },
        });

        const mailOptions = {
            from: data.from || process.env.EMAIL_FROM_ADDRESS,
            to: data.to,
            cc: data.cc,
            bcc: data.bcc,
            subject: data.subject,
            text: data.text,
            html: data.html,
            attachments: data.attachments?.map(att => ({
                filename: att.filename,
                content: att.content,
                contentType: att.contentType,
            })),
        };

        const info = await transporter.sendMail(mailOptions);

        return {
            success: true,
            messageId: info.messageId,
        };
    }

    getName(): string {
        return 'AWS SES';
    }
}

/**
 * SMTP Email Provider (Fallback)
 */
export class SMTPProvider implements IEmailProvider {
    private transporter: any;

    constructor(private config: {
        host: string;
        port: number;
        secure: boolean;
        auth: { user: string; pass: string };
    }) {
        try {
            const nodemailer = require('nodemailer');

            this.transporter = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: config.secure,
                auth: config.auth,
            });

            logger.info('SMTP provider initialized', {
                host: config.host,
                port: config.port,
            });
        } catch (error) {
            logger.warn('Nodemailer not available', { error });
            throw new Error('Nodemailer package not installed');
        }
    }

    async send(data: IEmailData): Promise<INotificationResult> {
        try {
            const mailOptions = {
                from: data.from || process.env.EMAIL_FROM_ADDRESS,
                to: data.to,
                cc: data.cc,
                bcc: data.bcc,
                subject: data.subject,
                text: data.text,
                html: data.html,
                attachments: data.attachments?.map(att => ({
                    filename: att.filename,
                    content: att.content,
                    contentType: att.contentType,
                })),
            };

            const info = await this.transporter.sendMail(mailOptions);

            logger.info('Email sent via SMTP', {
                to: data.to,
                subject: data.subject,
                messageId: info.messageId,
            });

            return {
                success: true,
                messageId: info.messageId,
            };
        } catch (error: any) {
            logger.error('SMTP email failed', {
                to: data.to,
                subject: data.subject,
                error: error.message,
            });

            throw new ExternalServiceError('SMTP email failed', {
                provider: 'smtp',
                error: error.message,
            });
        }
    }

    getName(): string {
        return 'SMTP';
    }
}

/**
 * Email Provider Factory
 */
export class EmailProviderFactory {
    static create(providerName: string, config: any): IEmailProvider {
        switch (providerName.toLowerCase()) {
            case 'sendgrid':
                return new SendGridProvider(config.apiKey);

            case 'ses':
            case 'aws-ses':
                return new SESProvider({
                    region: config.region || 'us-east-1',
                    accessKeyId: config.accessKeyId,
                    secretAccessKey: config.secretAccessKey,
                });

            case 'smtp':
                return new SMTPProvider({
                    host: config.host,
                    port: config.port || 587,
                    secure: config.secure || false,
                    auth: {
                        user: config.username,
                        pass: config.password,
                    },
                });

            default:
                throw new Error(`Unknown email provider: ${providerName}`);
        }
    }
}

/**
 * Email Service with Retry Logic
 */
export class EmailDeliveryService {
    private provider: IEmailProvider;
    private maxRetries: number;
    private retryDelay: number;

    constructor(provider: IEmailProvider, options: { maxRetries?: number; retryDelay?: number } = {}) {
        this.provider = provider;
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000; // 1 second
    }

    async send(data: IEmailData): Promise<INotificationResult> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                logger.debug(`Email delivery attempt ${attempt}/${this.maxRetries}`, {
                    to: data.to,
                    provider: this.provider.getName(),
                });

                const result = await this.provider.send(data);

                if (attempt > 1) {
                    logger.info('Email delivered after retry', {
                        to: data.to,
                        attempt,
                        provider: this.provider.getName(),
                    });
                }

                return result;
            } catch (error) {
                lastError = error as Error;

                logger.warn(`Email delivery attempt ${attempt} failed`, {
                    to: data.to,
                    attempt,
                    error: (error as Error).message,
                });

                if (attempt < this.maxRetries) {
                    // Exponential backoff: 1s, 2s, 4s, 8s...
                    const delay = this.retryDelay * Math.pow(2, attempt - 1);
                    logger.debug(`Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                }
            }
        }

        // All retries failed
        logger.error('Email delivery failed after all retries', {
            to: data.to,
            attempts: this.maxRetries,
            error: lastError?.message,
        });

        throw lastError || new Error('Email delivery failed');
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
