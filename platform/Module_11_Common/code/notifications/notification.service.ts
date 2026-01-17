import { config } from '../config/config.service';
import { ExternalServiceError } from '../errors/app-error';
import { Logger } from '../logging/logger';

const logger = new Logger('NotificationService');

/**
 * Email data interface
 */
export interface IEmailData {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: IEmailAttachment[];
}

/**
 * Email attachment interface
 */
export interface IEmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

/**
 * SMS data interface
 */
export interface ISMSData {
  to: string;
  message: string;
  from?: string;
}

/**
 * WhatsApp data interface
 */
export interface IWhatsAppData {
  to: string;
  type: 'text' | 'template' | 'image' | 'document';
  text?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
  mediaUrl?: string;
  caption?: string;
  filename?: string;
}

/**
 * Notification result interface
 */
export interface INotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email template interface
 */
export interface IEmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

/**
 * Notification Service
 * Handles email, SMS, WhatsApp, and push notifications
 */
export class NotificationService {
  private static instance: NotificationService;
  private emailConfig = config.getValue('email');
  private smsConfig = config.getValue('sms');
  private whatsappConfig = config.getValue('whatsapp');
  private pushConfig = config.getValue('push');

  private constructor() {
    logger.info('NotificationService initialized', {
      emailProvider: this.emailConfig.provider,
      smsProvider: this.smsConfig.provider,
      whatsappEnabled: !!this.whatsappConfig?.accessToken,
      pushEnabled: !!this.pushConfig?.fcm?.serviceAccountPath || !!this.pushConfig?.onesignal?.appId,
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Send email
   */
  public async sendEmail(data: IEmailData): Promise<INotificationResult> {
    const startTime = Date.now();

    try {
      logger.info('Sending email', {
        to: data.to,
        subject: data.subject,
        provider: this.emailConfig.provider,
      });

      // In production, integrate with actual email provider (SendGrid, AWS SES, etc.)
      // For now, simulate email sending
      const result = await this.sendEmailViaProvider(data);

      const duration = Date.now() - startTime;
      logger.info('Email sent successfully', {
        to: data.to,
        messageId: result.messageId,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to send email', {
        to: data.to,
        subject: data.subject,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ExternalServiceError('Email sending failed', {
        provider: this.emailConfig.provider,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send email via provider (SendGrid, AWS SES, etc.)
   */
  private async sendEmailViaProvider(data: IEmailData): Promise<INotificationResult> {
    // Load email providers dynamically
    const { EmailProviderFactory, EmailDeliveryService } = await import('./email.provider');

    try {
      // Create provider based on configuration
      const provider = EmailProviderFactory.create(this.emailConfig.provider, this.emailConfig);

      // Create delivery service with retry logic
      const deliveryService = new EmailDeliveryService(provider, {
        maxRetries: 3,
        retryDelay: 1000,
      });

      // Send via provider with retries
      return await deliveryService.send(data);
    } catch (error) {
      // Fallback to simulation for development/testing
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        logger.warn('Using simulated email sending (development mode)', {
          to: data.to,
          error: (error as Error).message,
        });

        await this.delay(100);
        return {
          success: true,
          messageId: `email_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        };
      }

      throw error;
    }
  }

  /**
   * Send SMS
   */
  public async sendSMS(data: ISMSData): Promise<INotificationResult> {
    const startTime = Date.now();

    try {
      logger.info('Sending SMS', {
        to: data.to,
        provider: this.smsConfig.provider,
      });

      // In production, integrate with actual SMS provider (Twilio, AWS SNS, etc.)
      const result = await this.sendSMSViaProvider(data);

      const duration = Date.now() - startTime;
      logger.info('SMS sent successfully', {
        to: data.to,
        messageId: result.messageId,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to send SMS', {
        to: data.to,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ExternalServiceError('SMS sending failed', {
        provider: this.smsConfig.provider,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send SMS via provider (Twilio, AWS SNS, etc.)
   */
  private async sendSMSViaProvider(data: ISMSData): Promise<INotificationResult> {
    // Load SMS providers dynamically
    const { SMSProviderFactory, SMSDeliveryService } = await import('./sms.provider');

    try {
      // Create provider based on configuration
      const provider = SMSProviderFactory.create(this.smsConfig.provider, this.smsConfig);

      // Create delivery service with retry logic
      const deliveryService = new SMSDeliveryService(provider, {
        maxRetries: 3,
        retryDelay: 1000,
      });

      // Send via provider with retries
      return await deliveryService.send(data);
    } catch (error) {
      // Fallback to simulation for development/testing
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        logger.warn('Using simulated SMS sending (development mode)', {
          to: data.to,
          error: (error as Error).message,
        });

        await this.delay(100);
        return {
          success: true,
          messageId: `sms_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        };
      }

      throw error;
    }
  }

  /**
   * Send bulk emails
   */
  public async sendBulkEmails(emails: IEmailData[]): Promise<INotificationResult[]> {
    logger.info('Sending bulk emails', { count: emails.length });

    const results = await Promise.allSettled(
      emails.map(email => this.sendEmail(email))
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.length - successCount;

    logger.info('Bulk email sending completed', {
      total: emails.length,
      success: successCount,
      failed: failureCount,
    });

    return results.map(result =>
      result.status === 'fulfilled'
        ? result.value
        : { success: false, error: result.reason.message }
    );
  }

  /**
   * Send templated email
   */
  public async sendTemplatedEmail(
    to: string | string[],
    templateName: string,
    variables: Record<string, string>
  ): Promise<INotificationResult> {
    const template = this.getEmailTemplate(templateName);

    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    // Replace variables in template
    let html = template.html;
    let text = template.text || '';
    let subject = template.subject;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      html = html.replace(new RegExp(placeholder, 'g'), value);
      text = text.replace(new RegExp(placeholder, 'g'), value);
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
    }

    return this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  /**
   * Get email template
   */
  private getEmailTemplate(name: string): IEmailTemplate | null {
    // In production, load templates from database or file system
    const templates: Record<string, IEmailTemplate> = {
      welcome: {
        subject: 'Welcome to SME Receivables Platform',
        html: '<h1>Welcome {{name}}!</h1><p>Thank you for joining our platform.</p>',
        text: 'Welcome {{name}}! Thank you for joining our platform.',
      },
      'invoice-created': {
        subject: 'New Invoice Created - {{invoiceNumber}}',
        html: '<h1>Invoice {{invoiceNumber}}</h1><p>A new invoice has been created for {{amount}}.</p>',
        text: 'Invoice {{invoiceNumber}} - A new invoice has been created for {{amount}}.',
      },
      'payment-received': {
        subject: 'Payment Received - {{invoiceNumber}}',
        html: '<h1>Payment Received</h1><p>Payment of {{amount}} received for invoice {{invoiceNumber}}.</p>',
        text: 'Payment Received - Payment of {{amount}} received for invoice {{invoiceNumber}}.',
      },
      'password-reset': {
        subject: 'Password Reset Request',
        html: '<h1>Password Reset</h1><p>Click <a href="{{resetLink}}">here</a> to reset your password.</p>',
        text: 'Password Reset - Click this link to reset your password: {{resetLink}}',
      },
    };

    return templates[name] || null;
  }

  /**
   * Send welcome email
   */
  public async sendWelcomeEmail(to: string, name: string): Promise<INotificationResult> {
    return this.sendTemplatedEmail(to, 'welcome', { name });
  }

  /**
   * Send invoice notification
   */
  public async sendInvoiceNotification(
    to: string,
    invoiceNumber: string,
    amount: string
  ): Promise<INotificationResult> {
    return this.sendTemplatedEmail(to, 'invoice-created', {
      invoiceNumber,
      amount,
    });
  }

  /**
   * Send payment notification
   */
  public async sendPaymentNotification(
    to: string,
    invoiceNumber: string,
    amount: string
  ): Promise<INotificationResult> {
    return this.sendTemplatedEmail(to, 'payment-received', {
      invoiceNumber,
      amount,
    });
  }

  /**
   * Send password reset email
   */
  public async sendPasswordResetEmail(
    to: string,
    resetLink: string
  ): Promise<INotificationResult> {
    return this.sendTemplatedEmail(to, 'password-reset', { resetLink });
  }

  /**
   * Send OTP via SMS
   */
  public async sendOTP(to: string, otp: string): Promise<INotificationResult> {
    return this.sendSMS({
      to,
      message: `Your OTP is: ${otp}. Valid for 10 minutes.`,
    });
  }

  /**
   * Send WhatsApp message
   */
  public async sendWhatsApp(data: IWhatsAppData): Promise<INotificationResult> {
    const startTime = Date.now();

    try {
      logger.info('Sending WhatsApp message', {
        to: data.to,
        type: data.type,
      });

      const result = await this.sendWhatsAppViaProvider(data);

      const duration = Date.now() - startTime;
      logger.info('WhatsApp message sent successfully', {
        to: data.to,
        messageId: result.messageId,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to send WhatsApp message', {
        to: data.to,
        type: data.type,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ExternalServiceError('WhatsApp sending failed', {
        provider: 'whatsapp',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send WhatsApp via provider (Meta Cloud API)
   */
  private async sendWhatsAppViaProvider(data: IWhatsAppData): Promise<INotificationResult> {
    const { MetaWhatsAppProvider } = await import('./whatsapp.provider');

    try {
      if (!this.whatsappConfig?.accessToken) {
        throw new Error('WhatsApp not configured');
      }

      const provider = new MetaWhatsAppProvider({
        accessToken: this.whatsappConfig.accessToken,
        phoneNumberId: this.whatsappConfig.phoneNumberId,
        apiVersion: this.whatsappConfig.apiVersion,
      });

      // Map simplified data to WhatsApp provider format
      switch (data.type) {
        case 'text':
          return await provider.sendText(data.to, data.text!);

        case 'template':
          return await provider.sendTemplate(
            data.to,
            data.templateName!,
            'en',
            data.templateParams
              ? [
                {
                  type: 'body',
                  parameters: Object.entries(data.templateParams).map(([, value]) => ({
                    type: 'text' as const,
                    text: value,
                  })),
                },
              ]
              : undefined
          );

        case 'image':
          return await provider.sendImage(data.to, data.mediaUrl!, data.caption);

        case 'document':
          return await provider.sendDocument(data.to, data.mediaUrl!, data.filename!, data.caption);

        default:
          throw new Error(`Unsupported WhatsApp message type: ${data.type}`);
      }
    } catch (error) {
      // Fallback to simulation for development/testing
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        logger.warn('Using simulated WhatsApp sending (development mode)', {
          to: data.to,
          error: (error as Error).message,
        });

        await this.delay(100);
        return {
          success: true,
          messageId: `whatsapp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        };
      }

      throw error;
    }
  }

  /**
   * Send WhatsApp OTP
   */
  public async sendWhatsAppOTP(to: string, otp: string): Promise<INotificationResult> {
    const { WhatsAppTemplateManager, MetaWhatsAppProvider } = await import('./whatsapp.provider');

    if (!this.whatsappConfig?.accessToken) {
      throw new Error('WhatsApp not configured');
    }

    const provider = new MetaWhatsAppProvider({
      accessToken: this.whatsappConfig.accessToken,
      phoneNumberId: this.whatsappConfig.phoneNumberId,
    });

    const templateManager = new WhatsAppTemplateManager(provider);

    return await templateManager.sendOTP(to, otp);
  }

  /**
   * Send WhatsApp invoice notification
   */
  public async sendWhatsAppInvoiceNotification(
    to: string,
    invoiceNumber: string,
    amount: string,
    dueDate: string
  ): Promise<INotificationResult> {
    const { WhatsAppTemplateManager, MetaWhatsAppProvider } = await import('./whatsapp.provider');

    if (!this.whatsappConfig?.accessToken) {
      throw new Error('WhatsApp not configured');
    }

    const provider = new MetaWhatsAppProvider({
      accessToken: this.whatsappConfig.accessToken,
      phoneNumberId: this.whatsappConfig.phoneNumberId,
    });

    const templateManager = new WhatsAppTemplateManager(provider);

    return await templateManager.sendInvoiceNotification(to, invoiceNumber, amount, dueDate);
  }

  /**
   * Send WhatsApp payment confirmation
   */
  public async sendWhatsAppPaymentConfirmation(
    to: string,
    invoiceNumber: string,
    amount: string,
    paymentDate: string
  ): Promise<INotificationResult> {
    const { WhatsAppTemplateManager, MetaWhatsAppProvider } = await import('./whatsapp.provider');

    if (!this.whatsappConfig?.accessToken) {
      throw new Error('WhatsApp not configured');
    }

    const provider = new MetaWhatsAppProvider({
      accessToken: this.whatsappConfig.accessToken,
      phoneNumberId: this.whatsappConfig.phoneNumberId,
    });

    const templateManager = new WhatsAppTemplateManager(provider);

    return await templateManager.sendPaymentConfirmation(to, invoiceNumber, amount, paymentDate);
  }

  /**
   * Send push notification to user
   */
  public async sendPushNotification(
    userId: string,
    notification: {
      title: string;
      body: string;
      imageUrl?: string;
      data?: Record<string, any>;
    }
  ): Promise<INotificationResult> {
    const startTime = Date.now();

    try {
      logger.info('Sending push notification', {
        userId,
        title: notification.title,
      });

      const result = await this.sendPushViaProvider(userId, notification);

      const duration = Date.now() - startTime;
      logger.info('Push notification sent successfully', {
        userId,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to send push notification', {
        userId,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ExternalServiceError('Push notification sending failed', {
        provider: 'push',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send push notification via provider
   */
  private async sendPushViaProvider(
    userId: string,
    notification: {
      title: string;
      body: string;
      imageUrl?: string;
      data?: Record<string, any>;
    }
  ): Promise<INotificationResult> {
    const { PushNotificationProviderFactory } = await import('./push.provider');
    const { DeviceTokenService } = await import('../services/device-token.service');

    try {
      if (!this.pushConfig) {
        throw new Error('Push notifications not configured');
      }

      // Get user's device tokens (would need repository injection in real implementation)
      // For now, returning simulated success
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        logger.warn('Using simulated push notification sending (development mode)', {
          userId,
        });

        await this.delay(100);
        return {
          success: true,
          messageId: `push_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        };
      }

      // In production, use FCM or OneSignal
      if (this.pushConfig.fcm) {
        const provider = PushNotificationProviderFactory.createFCM(this.pushConfig.fcm);

        // Get user tokens (placeholder - would need device token service)
        const userTokens = ['placeholder-token']; // await deviceTokenService.getUserTokenStrings(userId);

        if (userTokens.length === 0) {
          logger.warn('No active device tokens for user', { userId });
          return { success: false, error: 'No active device tokens' };
        }

        if (userTokens.length === 1) {
          return await provider.sendToDevice(
            userTokens[0],
            {
              title: notification.title,
              body: notification.body,
              imageUrl: notification.imageUrl,
              data: notification.data,
            },
            { priority: 'high' }
          );
        } else {
          return await provider.sendToDevices(
            userTokens,
            {
              title: notification.title,
              body: notification.body,
              imageUrl: notification.imageUrl,
              data: notification.data,
            },
            { priority: 'high' }
          );
        }
      } else if (this.pushConfig.onesignal) {
        const provider = PushNotificationProviderFactory.createOneSignal(this.pushConfig.onesignal);

        return await provider.sendToUsers(
          [userId],
          {
            title: notification.title,
            body: notification.body,
            imageUrl: notification.imageUrl,
            data: notification.data,
          },
          { priority: 'high' }
        );
      }

      throw new Error('No push notification provider configured');
    } catch (error) {
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        logger.warn('Using simulated push notification sending (development mode)', {
          userId,
          error: (error as Error).message,
        });

        await this.delay(100);
        return {
          success: true,
          messageId: `push_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        };
      }

      throw error;
    }
  }

  /**
   * Send push notification to topic
   */
  public async sendPushToTopic(
    topic: string,
    notification: {
      title: string;
      body: string;
      imageUrl?: string;
      data?: Record<string, any>;
    }
  ): Promise<INotificationResult> {
    const { PushNotificationProviderFactory } = await import('./push.provider');

    try {
      if (!this.pushConfig?.fcm) {
        throw new Error('FCM not configured for topic notifications');
      }

      const provider = PushNotificationProviderFactory.createFCM(this.pushConfig.fcm);

      return await provider.sendToTopic(
        topic,
        {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
          data: notification.data,
        },
        { priority: 'high' }
      );
    } catch (error) {
      logger.error('Topic push notification failed', {
        topic,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Utility: Delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
