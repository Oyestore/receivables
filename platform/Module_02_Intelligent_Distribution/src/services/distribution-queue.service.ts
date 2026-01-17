import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import { Inject } from '@nestjs/common';
import { DistributionAssignment, DistributionStatus, DistributionChannel } from '../entities/distribution-entities';
import { EmailService, EmailMessage } from './email.service';
import { SMSService, SMSMessage } from './sms.service';
import { WhatsAppService, WhatsAppMessage } from './whatsapp.service';

export interface DistributionJob {
  assignmentId: string;
  tenantId: string;
  channel: DistributionChannel;
  recipient: string;
  subject?: string;
  body: string;
  htmlBody?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  metadata?: Record<string, any>;
  retryCount?: number;
  maxRetries?: number;
}

export interface DistributionResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryTime?: number;
  provider?: string;
}

@Injectable()
export class DistributionQueueService {
  private readonly logger = new Logger(DistributionQueueService.name);

  constructor(
    @Inject(getQueueToken('distribution')) private readonly distributionQueue: Queue,
    private readonly emailService: EmailService,
    private readonly smsService: SMSService,
    private readonly whatsappService: WhatsAppService,
  ) {
    this.setupProcessors();
  }

  private setupProcessors() {
    this.distributionQueue.process('send-email', async (job) => {
      return await this.processEmailJob(job.data);
    });

    this.distributionQueue.process('send-sms', async (job) => {
      return await this.processSMSJob(job.data);
    });

    this.distributionQueue.process('send-whatsapp', async (job) => {
      return await this.processWhatsAppJob(job.data);
    });

    this.distributionQueue.process('send-postal', async (job) => {
      return await this.processPostalJob(job.data);
    });

    this.distributionQueue.process('send-edi', async (job) => {
      return await this.processEDIJob(job.data);
    });

    // Setup error handling
    this.distributionQueue.on('failed', (job, err) => {
      this.logger.error(`Job ${job.id} failed:`, err);
      this.handleFailedJob(job, err);
    });

    this.distributionQueue.on('completed', (job, result) => {
      this.logger.log(`Job ${job.id} completed successfully`);
      this.handleCompletedJob(job, result);
    });
  }

  async addDistributionJob(jobData: DistributionJob, options?: any): Promise<any> {
    const jobType = this.getJobType(jobData.channel);
    
    this.logger.log(`Adding ${jobType} job for assignment ${jobData.assignmentId}`);

    return await this.distributionQueue.add(
      jobType,
      jobData,
      {
        attempts: jobData.maxRetries || 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
        ...options,
      }
    );
  }

  async addBatchDistributionJobs(jobs: DistributionJob[]): Promise<any[]> {
    this.logger.log(`Adding batch of ${jobs.length} distribution jobs`);

    const jobPromises = jobs.map(job => this.addDistributionJob(job));
    return await Promise.all(jobPromises);
  }

  private getJobType(channel: DistributionChannel): string {
    switch (channel) {
      case DistributionChannel.EMAIL:
        return 'send-email';
      case DistributionChannel.SMS:
        return 'send-sms';
      case DistributionChannel.WHATSAPP:
        return 'send-whatsapp';
      case DistributionChannel.POSTAL:
        return 'send-postal';
      case DistributionChannel.EDI:
        return 'send-edi';
      default:
        throw new Error(`Unsupported distribution channel: ${channel}`);
    }
  }

  private async processEmailJob(jobData: DistributionJob): Promise<DistributionResult> {
    const startTime = Date.now();
    
    try {
      const emailMessage: EmailMessage = {
        to: jobData.recipient,
        subject: jobData.subject || 'Invoice Notification',
        html: jobData.htmlBody || jobData.body,
        text: jobData.body,
        attachments: jobData.attachments,
      };

      const result = await this.emailService.sendEmailWithFallback(emailMessage);
      
      return {
        ...result,
        deliveryTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Email job failed for assignment ${jobData.assignmentId}:`, error);
      throw error;
    }
  }

  private async processSMSJob(jobData: DistributionJob): Promise<DistributionResult> {
    const startTime = Date.now();
    
    try {
      const smsMessage: SMSMessage = {
        to: jobData.recipient,
        from: process.env.TWILIO_PHONE_NUMBER || process.env.SMS_SENDER_NUMBER,
        body: jobData.body,
      };

      const result = await this.smsService.sendSMSWithFallback(smsMessage);
      
      return {
        ...result,
        deliveryTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`SMS job failed for assignment ${jobData.assignmentId}:`, error);
      throw error;
    }
  }

  private async processWhatsAppJob(jobData: DistributionJob): Promise<DistributionResult> {
    const startTime = Date.now();
    
    try {
      const whatsappMessage: WhatsAppMessage = {
        to: jobData.recipient,
        from: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        body: jobData.body,
        mediaUrl: jobData.attachments?.[0]?.content as string,
      };

      const result = await this.whatsappService.sendWhatsAppMessage('meta', whatsappMessage);
      
      return {
        ...result,
        deliveryTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`WhatsApp job failed for assignment ${jobData.assignmentId}:`, error);
      throw error;
    }
  }

  private async processPostalJob(jobData: DistributionJob): Promise<DistributionResult> {
    const startTime = Date.now();
    
    try {
      // Integration with postal service APIs (USPS, Canada Post, etc.)
      // This is a placeholder implementation
      this.logger.log(`Processing postal job for assignment ${jobData.assignmentId}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        messageId: `postal_${Date.now()}`,
        deliveryTime: Date.now() - startTime,
        provider: 'postal',
      };
    } catch (error) {
      this.logger.error(`Postal job failed for assignment ${jobData.assignmentId}:`, error);
      throw error;
    }
  }

  private async processEDIJob(jobData: DistributionJob): Promise<DistributionResult> {
    const startTime = Date.now();
    
    try {
      // EDI integration for B2B electronic data interchange
      this.logger.log(`Processing EDI job for assignment ${jobData.assignmentId}`);
      
      // Generate EDI message
      const ediMessage = this.generateEDIMessage(jobData);
      
      // Send to EDI partner
      const result = await this.sendEDIMessage(ediMessage);
      
      return {
        ...result,
        deliveryTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`EDI job failed for assignment ${jobData.assignmentId}:`, error);
      throw error;
    }
  }

  private generateEDIMessage(jobData: DistributionJob): string {
    // Simplified EDI message generation
    // In production, use proper EDI standards (ANSI X12, EDIFACT, etc.)
    const ediSegments = [
      'ST*850*0001',
      `BEG*00*IN*${jobData.assignmentId}**${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
      `N1*BT*${jobData.recipient}`,
      `ITD*01******${jobData.metadata?.amount || '0.00'}`,
      `DTM*011*${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
      'SE*8*0001',
    ];

    return ediSegments.join('\n');
  }

  private async sendEDIMessage(ediMessage: string): Promise<DistributionResult> {
    // Placeholder for EDI transmission
    // In production, integrate with EDI network providers
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      messageId: `edi_${Date.now()}`,
      provider: 'edi',
    };
  }

  private async handleFailedJob(job: any, error: Error): Promise<void> {
    // Update assignment status to failed
    try {
      // This would typically update the database
      this.logger.error(`Job ${job.id} failed permanently after retries`);
    } catch (updateError) {
      this.logger.error('Failed to update assignment status:', updateError);
    }
  }

  private async handleCompletedJob(job: any, result: DistributionResult): Promise<void> {
    // Update assignment status to sent/delivered
    try {
      // This would typically update the database
      this.logger.log(`Job ${job.id} completed with message ID: ${result.messageId}`);
    } catch (updateError) {
      this.logger.error('Failed to update assignment status:', updateError);
    }
  }

  async getQueueStats(): Promise<any> {
    const waiting = await this.distributionQueue.getWaiting();
    const active = await this.distributionQueue.getActive();
    const completed = await this.distributionQueue.getCompleted();
    const failed = await this.distributionQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  async pauseQueue(): Promise<void> {
    await this.distributionQueue.pause();
    this.logger.log('Distribution queue paused');
  }

  async resumeQueue(): Promise<void> {
    await this.distributionQueue.resume();
    this.logger.log('Distribution queue resumed');
  }

  async clearQueue(): Promise<void> {
    await this.distributionQueue.clean(0, 0, 'completed');
    await this.distributionQueue.clean(0, 0, 'failed');
    this.logger.log('Distribution queue cleared');
  }
}
