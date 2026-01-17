import { CommunicationChannel } from '../../distribution/entities/recipient-contact.entity';

/**
 * Interface for channel-specific distribution configuration
 */
export interface ChannelConfig {
  // Common configuration properties for all channels
  enabled: boolean;
  maxRetries: number;
  retryDelaySeconds: number;
  
  // Channel-specific configuration properties can be added by extending this interface
}

/**
 * Interface for email channel configuration
 */
export interface EmailChannelConfig extends ChannelConfig {
  fromEmail: string;
  replyToEmail?: string;
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
    auth?: {
      user: string;
      pass: string;
    };
  };
}

/**
 * Interface for WhatsApp channel configuration
 */
export interface WhatsAppChannelConfig extends ChannelConfig {
  fromNumber: string;
  apiKey?: string;
  templateNamespace?: string;
}

/**
 * Interface for SMS channel configuration
 */
export interface SMSChannelConfig extends ChannelConfig {
  fromNumber: string;
  apiKey?: string;
}

/**
 * Interface for distribution message payload
 */
export interface DistributionPayload {
  recipientId: string;
  invoiceId: string;
  channel: CommunicationChannel;
  templateId?: string;
  customContent?: string;
  attachments?: string[];
  metadata?: Record<string, any>;
}

/**
 * Interface for distribution result
 */
export interface DistributionResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Interface for channel distributor strategy
 */
export interface IChannelDistributor {
  /**
   * Get the channel type supported by this distributor
   */
  getChannelType(): CommunicationChannel;
  
  /**
   * Check if the distributor is properly configured and available
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Distribute a message through this channel
   */
  distribute(payload: DistributionPayload): Promise<DistributionResult>;
}
