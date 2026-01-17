import { Injectable } from '@nestjs/common';
import { CommunicationChannel } from '../../distribution/entities/recipient-contact.entity';
import { 
  IChannelDistributor, 
  DistributionPayload, 
  DistributionResult, 
  EmailChannelConfig 
} from '../interfaces/channel-distributor.interface';

@Injectable()
export class EmailDistributor implements IChannelDistributor {
  private config: EmailChannelConfig;

  constructor() {
    // Default configuration, should be overridden with actual values from configuration service
    this.config = {
      enabled: true,
      maxRetries: 3,
      retryDelaySeconds: 300,
      fromEmail: 'invoices@example.com',
      replyToEmail: 'support@example.com',
      smtpConfig: {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'username',
          pass: 'password',
        },
      },
    };
  }

  /**
   * Set the configuration for this distributor
   */
  setConfig(config: EmailChannelConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get the channel type supported by this distributor
   */
  getChannelType(): CommunicationChannel {
    return CommunicationChannel.EMAIL;
  }

  /**
   * Check if the distributor is properly configured and available
   */
  async isAvailable(): Promise<boolean> {
    return this.config.enabled;
    // In a real implementation, we would also check connectivity to the SMTP server
  }

  /**
   * Distribute a message through this channel
   */
  async distribute(payload: DistributionPayload): Promise<DistributionResult> {
    try {
      // In a real implementation, this would use a library like nodemailer to send the email
      console.log(`[EmailDistributor] Sending email to recipient ${payload.recipientId} for invoice ${payload.invoiceId}`);
      
      // Simulate successful email sending
      const messageId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      return {
        success: true,
        messageId,
        timestamp: new Date(),
        metadata: {
          provider: 'SMTP',
          fromEmail: this.config.fromEmail,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Unknown error occurred while sending email',
        timestamp: new Date(),
      };
    }
  }
}
