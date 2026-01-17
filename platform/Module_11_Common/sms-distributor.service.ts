import { Injectable } from '@nestjs/common';
import { CommunicationChannel } from '../../distribution/entities/recipient-contact.entity';
import { 
  IChannelDistributor, 
  DistributionPayload, 
  DistributionResult, 
  SMSChannelConfig 
} from '../interfaces/channel-distributor.interface';

@Injectable()
export class SMSDistributor implements IChannelDistributor {
  private config: SMSChannelConfig;

  constructor() {
    // Default configuration, should be overridden with actual values from configuration service
    this.config = {
      enabled: true,
      maxRetries: 3,
      retryDelaySeconds: 300,
      fromNumber: '+1234567890',
      apiKey: 'sample-api-key',
    };
  }

  /**
   * Set the configuration for this distributor
   */
  setConfig(config: SMSChannelConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get the channel type supported by this distributor
   */
  getChannelType(): CommunicationChannel {
    return CommunicationChannel.SMS;
  }

  /**
   * Check if the distributor is properly configured and available
   */
  async isAvailable(): Promise<boolean> {
    return this.config.enabled;
    // In a real implementation, we would also check connectivity to the SMS gateway
  }

  /**
   * Distribute a message through this channel
   */
  async distribute(payload: DistributionPayload): Promise<DistributionResult> {
    try {
      // In a real implementation, this would use an SMS gateway API to send the message
      console.log(`[SMSDistributor] Sending SMS to recipient ${payload.recipientId} for invoice ${payload.invoiceId}`);
      
      // Simulate successful SMS sending
      const messageId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      return {
        success: true,
        messageId,
        timestamp: new Date(),
        metadata: {
          provider: 'SMS Gateway',
          fromNumber: this.config.fromNumber,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Unknown error occurred while sending SMS',
        timestamp: new Date(),
      };
    }
  }
}
