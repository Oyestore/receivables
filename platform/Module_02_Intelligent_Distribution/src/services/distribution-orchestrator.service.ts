import { Injectable, Logger } from '@nestjs/common';
import { DistributionService, DistributionResult } from './distribution.service';
import { DistributionQueueService, DistributionJob } from './distribution-queue.service';
import { DistributionAssignment, DistributionStatus, DistributionChannel } from '../entities/distribution-entities';
import { EmailService } from './email.service';
import { SMSService } from './sms.service';
import { WhatsAppService } from './whatsapp.service';

export interface DistributionConfig {
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  enableFallback: boolean;
  fallbackProviders: Record<DistributionChannel, string[]>;
  enableTracking: boolean;
  enableAnalytics: boolean;
}

export interface TemplateContent {
  subject: string;
  htmlBody: string;
  textBody: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

@Injectable()
export class DistributionOrchestratorService {
  private readonly logger = new Logger(DistributionOrchestratorService.name);

  constructor(
    private readonly distributionService: DistributionService,
    private readonly distributionQueueService: DistributionQueueService,
    private readonly emailService: EmailService,
    private readonly smsService: SMSService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  async processAssignment(assignmentId: string, config?: Partial<DistributionConfig>): Promise<DistributionResult> {
    this.logger.log(`Processing distribution assignment: ${assignmentId}`);

    try {
      // Get assignment details
      const assignment = await this.distributionService.getAssignmentById(
        assignmentId,
        this.extractTenantId(assignmentId) // This would come from auth context
      );

      // Generate content
      const content = await this.generateContent(assignment);

      // Create distribution job
      const job: DistributionJob = {
        assignmentId: assignment.id,
        tenantId: assignment.tenantId,
        channel: assignment.assignedChannel,
        recipient: await this.getRecipient(assignment),
        subject: content.subject,
        body: content.textBody,
        htmlBody: content.htmlBody,
        attachments: content.attachments,
        metadata: assignment.metadata || {},
        maxRetries: config?.maxRetries || 3,
      };

      // Add to queue
      const queueJob = await this.distributionQueueService.addDistributionJob(job, config);

      // Update assignment status to processing
      await this.distributionService.updateAssignmentStatus(assignmentId, assignment.tenantId, {
        status: DistributionStatus.SENT,
      });

      this.logger.log(`Distribution job queued for assignment ${assignmentId}, job ID: ${queueJob.id}`);

      return {
        success: true,
        messageId: queueJob.id,
        provider: 'queue',
      };
    } catch (error) {
      this.logger.error(`Failed to process assignment ${assignmentId}:`, error);
      
      // Update assignment status to failed
      await this.distributionService.updateAssignmentStatus(assignmentId, this.extractTenantId(assignmentId), {
        status: DistributionStatus.FAILED,
        error: error.message,
      });

      throw error;
    }
  }

  async processBatchAssignments(
    assignmentIds: string[],
    config?: Partial<DistributionConfig>
  ): Promise<DistributionResult[]> {
    this.logger.log(`Processing batch of ${assignmentIds.length} distribution assignments`);

    const results: DistributionResult[] = [];

    for (const assignmentId of assignmentIds) {
      try {
        const result = await this.processAssignment(assignmentId, config);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  async sendImmediate(
    assignmentId: string,
    config?: Partial<DistributionConfig>
  ): Promise<DistributionResult> {
    this.logger.log(`Sending immediate distribution for assignment: ${assignmentId}`);

    try {
      const assignment = await this.distributionService.getAssignmentById(
        assignmentId,
        this.extractTenantId(assignmentId)
      );

      const content = await this.generateContent(assignment);
      const recipient = await this.getRecipient(assignment);

      // Send immediately without queue
      const result = await this.sendImmediateMessage(
        assignment.assignedChannel,
        recipient,
        content,
        assignment.metadata
      );

      // Update assignment status
      await this.distributionService.updateAssignmentStatus(assignmentId, assignment.tenantId, {
        status: result.success ? DistributionStatus.SENT : DistributionStatus.FAILED,
        error: result.error,
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to send immediate distribution for assignment ${assignmentId}:`, error);
      throw error;
    }
  }

  private async sendImmediateMessage(
    channel: DistributionChannel,
    recipient: string,
    content: TemplateContent,
    metadata?: Record<string, any>
  ): Promise<DistributionResult> {
    const startTime = Date.now();

    try {
      switch (channel) {
        case DistributionChannel.EMAIL:
          const emailResult = await this.emailService.sendEmailWithFallback({
            to: recipient,
            subject: content.subject,
            html: content.htmlBody,
            text: content.textBody,
            attachments: content.attachments,
          });
          return {
            ...emailResult,
            deliveryTime: Date.now() - startTime,
            provider: emailResult.success ? 'email' : undefined,
          };

        case DistributionChannel.SMS:
          const smsResult = await this.smsService.sendSMSWithFallback({
            to: recipient,
            from: process.env.TWILIO_PHONE_NUMBER || process.env.SMS_SENDER_NUMBER,
            body: content.textBody,
          });
          return {
            ...smsResult,
            deliveryTime: Date.now() - startTime,
            provider: smsResult.success ? 'sms' : undefined,
          };

        case DistributionChannel.WHATSAPP:
          const whatsappResult = await this.whatsappService.sendWhatsAppMessage('meta', {
            to: recipient,
            from: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
            body: content.textBody,
          });
          return {
            ...whatsappResult,
            deliveryTime: Date.now() - startTime,
            provider: whatsappResult.success ? 'whatsapp' : undefined,
          };

        default:
          throw new Error(`Immediate sending not supported for channel: ${channel}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        deliveryTime: Date.now() - startTime,
      };
    }
  }

  private async generateContent(assignment: DistributionAssignment): Promise<TemplateContent> {
    // This would integrate with a template engine
    // For now, return basic content
    const invoiceData = assignment.metadata?.invoiceData || {};
    
    const subject = `Invoice ${invoiceData.invoiceNumber || assignment.invoiceId}`;
    const textBody = `Dear Customer,\n\nPlease find your invoice details:\n\nInvoice: ${invoiceData.invoiceNumber || assignment.invoiceId}\nAmount: ${invoiceData.amount || 'N/A'}\nDue Date: ${invoiceData.dueDate || 'N/A'}\n\nThank you for your business.`;
    const htmlBody = `
      <html>
        <body>
          <h2>Invoice Notification</h2>
          <p>Dear Customer,</p>
          <p>Please find your invoice details:</p>
          <table>
            <tr><td>Invoice:</td><td>${invoiceData.invoiceNumber || assignment.invoiceId}</td></tr>
            <tr><td>Amount:</td><td>${invoiceData.amount || 'N/A'}</td></tr>
            <tr><td>Due Date:</td><td>${invoiceData.dueDate || 'N/A'}</td></tr>
          </table>
          <p>Thank you for your business.</p>
        </body>
      </html>
    `;

    return {
      subject,
      textBody,
      htmlBody,
    };
  }

  private async getRecipient(assignment: DistributionAssignment): Promise<string> {
    // This would fetch customer contact information
    // For now, return a placeholder
    const customerData = assignment.metadata?.customerData || {};
    return customerData.email || customerData.phone || 'recipient@example.com';
  }

  private extractTenantId(assignmentId: string): string {
    // This would extract tenant ID from assignment or auth context
    // For now, return a placeholder
    return '00000000-0000-0000-0000-000000000001';
  }

  async retryFailedAssignments(maxRetries: number = 3): Promise<DistributionResult[]> {
    this.logger.log(`Retrying failed assignments with max retries: ${maxRetries}`);

    const failedAssignments = await this.distributionService.getDistributionAssignments(
      this.extractTenantId(''),
      { status: 'failed' }
    );

    const results: DistributionResult[] = [];

    for (const assignment of failedAssignments.assignments) {
      if ((assignment.metadata?.retryCount || 0) < maxRetries) {
        try {
          const result = await this.processAssignment(assignment.id, { maxRetries });
          results.push(result);
        } catch (error) {
          results.push({
            success: false,
            error: error.message,
          });
        }
      }
    }

    return results;
  }

  async getDistributionStatus(assignmentId: string): Promise<any> {
    try {
      const assignment = await this.distributionService.getAssignmentById(
        assignmentId,
        this.extractTenantId(assignmentId)
      );

      return {
        assignmentId: assignment.id,
        status: assignment.distributionStatus,
        channel: assignment.assignedChannel,
        createdAt: assignment.createdAt,
        sentAt: assignment.sentAt,
        deliveredAt: assignment.deliveredAt,
        error: assignment.error,
        metadata: assignment.metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to get distribution status for assignment ${assignmentId}:`, error);
      throw error;
    }
  }

  async validateConfiguration(): Promise<any> {
    const emailProviders = this.emailService.getAvailableProviders();
    const smsProviders = this.smsService.getAvailableProviders();
    const whatsappProviders = this.whatsappService.getAvailableProviders();
    const queueStats = await this.distributionQueueService.getQueueStats();

    return {
      emailProviders,
      smsProviders,
      whatsappProviders,
      queueStats,
      configuration: {
        emailConfigured: emailProviders.length > 0,
        smsConfigured: smsProviders.length > 0,
        whatsappConfigured: whatsappProviders.length > 0,
        queueActive: queueStats.active > 0,
      },
    };
  }

  async getProviderHealth(): Promise<any> {
    const health = {
      email: await this.checkEmailProviders(),
      sms: await this.checkSMSProviders(),
      whatsapp: await this.checkWhatsAppProviders(),
      queue: await this.checkQueueHealth(),
    };

    return {
      overall: Object.values(health).every(provider => provider.healthy),
      providers: health,
    };
  }

  private async checkEmailProviders(): Promise<any> {
    const providers = this.emailService.getAvailableProviders();
    const results = {};

    for (const provider of providers) {
      try {
        const isHealthy = await this.emailService.testProvider(provider);
        results[provider] = { healthy: isHealthy, lastCheck: new Date() };
      } catch (error) {
        results[provider] = { healthy: false, error: error.message, lastCheck: new Date() };
      }
    }

    return {
      healthy: Object.values(results).some((r: any) => r.healthy),
      providers: results,
    };
  }

  private async checkSMSProviders(): Promise<any> {
    const providers = this.smsService.getAvailableProviders();
    const results = {};

    for (const provider of providers) {
      try {
        // Basic health check - in production, implement provider-specific health checks
        results[provider] = { healthy: true, lastCheck: new Date() };
      } catch (error) {
        results[provider] = { healthy: false, error: error.message, lastCheck: new Date() };
      }
    }

    return {
      healthy: Object.values(results).some((r: any) => r.healthy),
      providers: results,
    };
  }

  private async checkWhatsAppProviders(): Promise<any> {
    const providers = this.whatsappService.getAvailableProviders();
    const results = {};

    for (const provider of providers) {
      try {
        // Basic health check
        results[provider] = { healthy: true, lastCheck: new Date() };
      } catch (error) {
        results[provider] = { healthy: false, error: error.message, lastCheck: new Date() };
      }
    }

    return {
      healthy: Object.values(results).some((r: any) => r.healthy),
      providers: results,
    };
  }

  private async checkQueueHealth(): Promise<any> {
    try {
      const stats = await this.distributionQueueService.getQueueStats();
      return {
        healthy: true,
        stats,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        lastCheck: new Date(),
      };
    }
  }
}
