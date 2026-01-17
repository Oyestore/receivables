import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailMessage {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryTime?: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporters: Map<string, any> = new Map();

  constructor() {
    this.initializeTransporters();
  }

  private initializeTransporters() {
    // SendGrid Transporter
    if (process.env.SENDGRID_API_KEY) {
      const sendgridTransporter = nodemailer.createTransporter({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });
      this.transporters.set('sendgrid', sendgridTransporter);
      this.logger.log('SendGrid transporter initialized');
    }

    // AWS SES Transporter
    if (process.env.AWS_SES_ACCESS_KEY && process.env.AWS_SES_SECRET_KEY) {
      const sesTransporter = nodemailer.createTransporter({
        host: process.env.AWS_SES_HOST || 'email-smtp.us-east-1.amazonaws.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.AWS_SES_ACCESS_KEY,
          pass: process.env.AWS_SES_SECRET_KEY,
        },
      });
      this.transporters.set('ses', sesTransporter);
      this.logger.log('AWS SES transporter initialized');
    }

    // Mailgun Transporter
    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      const mailgunTransporter = nodemailer.createTransporter({
        host: 'smtp.mailgun.org',
        port: 587,
        secure: false,
        auth: {
          user: `postmaster@${process.env.MAILGUN_DOMAIN}`,
          pass: process.env.MAILGUN_API_KEY,
        },
      });
      this.transporters.set('mailgun', mailgunTransporter);
      this.logger.log('Mailgun transporter initialized');
    }
  }

  async sendEmail(provider: string, message: EmailMessage): Promise<EmailResult> {
    const startTime = Date.now();
    
    try {
      const transporter = this.transporters.get(provider);
      if (!transporter) {
        throw new Error(`Email provider ${provider} not configured`);
      }

      this.logger.log(`Sending email via ${provider} to ${Array.isArray(message.to) ? message.to.join(', ') : message.to}`);

      const result = await transporter.sendMail({
        from: process.env.DEFAULT_FROM_EMAIL || 'noreply@smeplatform.com',
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments,
      });

      const deliveryTime = Date.now() - startTime;
      
      this.logger.log(`Email sent successfully via ${provider}. Message ID: ${result.messageId}, Delivery time: ${deliveryTime}ms`);
      
      return {
        success: true,
        messageId: result.messageId,
        deliveryTime,
      };
    } catch (error) {
      const deliveryTime = Date.now() - startTime;
      this.logger.error(`Failed to send email via ${provider}:`, error);
      
      return {
        success: false,
        error: error.message,
        deliveryTime,
      };
    }
  }

  async sendEmailWithFallback(
    message: EmailMessage,
    preferredProviders: string[] = ['sendgrid', 'ses', 'mailgun']
  ): Promise<EmailResult> {
    let lastError: Error;

    for (const provider of preferredProviders) {
      if (this.transporters.has(provider)) {
        const result = await this.sendEmail(provider, message);
        if (result.success) {
          return result;
        }
        lastError = new Error(result.error);
        this.logger.warn(`Email provider ${provider} failed, trying next provider`);
      }
    }

    throw lastError || new Error('No email providers available');
  }

  getAvailableProviders(): string[] {
    return Array.from(this.transporters.keys());
  }

  async testProvider(provider: string): Promise<boolean> {
    try {
      const transporter = this.transporters.get(provider);
      if (!transporter) {
        return false;
      }

      await transporter.verify();
      this.logger.log(`Email provider ${provider} connection test successful`);
      return true;
    } catch (error) {
      this.logger.error(`Email provider ${provider} connection test failed:`, error);
      return false;
    }
  }
}
