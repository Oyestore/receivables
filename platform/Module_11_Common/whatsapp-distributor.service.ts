import { Injectable } from '@nestjs/common';
import { CommunicationChannel } from '../../distribution/entities/recipient-contact.entity';
import { 
  IChannelDistributor, 
  DistributionPayload, 
  DistributionResult, 
  WhatsAppChannelConfig 
} from '../interfaces/channel-distributor.interface';

@Injectable()
export class WhatsAppDistributor implements IChannelDistributor {
  private config: WhatsAppChannelConfig;

  constructor() {
    // Default configuration, should be overridden with actual values from configuration service
    this.config = {
      enabled: true,
      maxRetries: 3,
      retryDelaySeconds: 300,
      fromNumber: '+1234567890',
      apiKey: 'sample-api-key',
      templateNamespace: 'invoice_notifications',
    };
  }

  /**
   * Set the configuration for this distributor
   */
  setConfig(config: WhatsAppChannelConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get the channel type supported by this distributor
   */
  getChannelType(): CommunicationChannel {
    return CommunicationChannel.WHATSAPP;
  }

  /**
   * Check if the distributor is properly configured and available
   */
  async isAvailable(): Promise<boolean> {
    return this.config.enabled;
    // In a real implementation, we would also check connectivity to the WhatsApp Business API
  }

  /**
   * Distribute a message through this channel
   */
  async distribute(payload: DistributionPayload): Promise<DistributionResult> {
    try {
      // In a real implementation, this would use the WhatsApp Business API to send the message
      console.log(`[WhatsAppDistributor] Sending WhatsApp message to recipient ${payload.recipientId} for invoice ${payload.invoiceId}`);
      
      // Simulate successful WhatsApp message sending
      const messageId = `whatsapp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      return {
        success: true,
        messageId,
        timestamp: new Date(),
        metadata: {
          provider: 'WhatsApp Business API',
          fromNumber: this.config.fromNumber,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Unknown error occurred while sending WhatsApp message',
        timestamp: new Date(),
      };
    }
  }
}
