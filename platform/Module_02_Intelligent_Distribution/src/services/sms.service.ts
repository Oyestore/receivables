import { Injectable, Logger } from '@nestjs/common';
import * as twilio from 'twilio';
import axios from 'axios';

export interface SMSMessage {
  to: string;
  from: string;
  body: string;
  mediaUrls?: string[];
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryTime?: number;
  provider: string;
}

@Injectable()
export class SMSService {
  private readonly logger = new Logger(SMSService.name);
  private twilioClient: twilio.Twilio | null = null;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      this.logger.log('Twilio client initialized');
    }
  }

  async sendSMS(provider: string, message: SMSMessage): Promise<SMSResult> {
    const startTime = Date.now();

    try {
      switch (provider.toLowerCase()) {
        case 'twilio':
          return await this.sendViaTwilio(message, startTime);
        case 'sns':
          return await this.sendViaSNS(message, startTime);
        case 'plivo':
          return await this.sendViaPlivo(message, startTime);
        default:
          throw new Error(`SMS provider ${provider} not supported`);
      }
    } catch (error) {
      const deliveryTime = Date.now() - startTime;
      this.logger.error(`Failed to send SMS via ${provider}:`, error);
      
      return {
        success: false,
        error: error.message,
        deliveryTime,
        provider,
      };
    }
  }

  private async sendViaTwilio(message: SMSMessage, startTime: number): Promise<SMSResult> {
    if (!this.twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    this.logger.log(`Sending SMS via Twilio to ${message.to}`);

    const result = await this.twilioClient.messages.create({
      to: message.to,
      from: message.from,
      body: message.body,
      mediaUrl: message.mediaUrls,
    });

    const deliveryTime = Date.now() - startTime;
    
    this.logger.log(`SMS sent successfully via Twilio. SID: ${result.sid}, Delivery time: ${deliveryTime}ms`);
    
    return {
      success: true,
      messageId: result.sid,
      deliveryTime,
      provider: 'twilio',
    };
  }

  private async sendViaSNS(message: SMSMessage, startTime: number): Promise<SMSResult> {
    if (!process.env.AWS_SNS_ACCESS_KEY || !process.env.AWS_SNS_SECRET_KEY) {
      throw new Error('AWS SNS credentials not configured');
    }

    this.logger.log(`Sending SMS via AWS SNS to ${message.to}`);

    const snsParams = {
      Message: message.body,
      PhoneNumber: message.to,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    };

    const response = await axios.post(
      `https://sns.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/`,
      {
        Action: 'Publish',
        Version: '2010-03-31',
        ...snsParams,
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        auth: {
          username: process.env.AWS_SNS_ACCESS_KEY,
          password: process.env.AWS_SNS_SECRET_KEY,
        },
      }
    );

    const deliveryTime = Date.now() - startTime;
    
    this.logger.log(`SMS sent successfully via AWS SNS. Message ID: ${response.data.MessageId}, Delivery time: ${deliveryTime}ms`);
    
    return {
      success: true,
      messageId: response.data.MessageId,
      deliveryTime,
      provider: 'sns',
    };
  }

  private async sendViaPlivo(message: SMSMessage, startTime: number): Promise<SMSResult> {
    if (!process.env.PLIVO_AUTH_ID || !process.env.PLIVO_AUTH_TOKEN) {
      throw new Error('Plivo credentials not configured');
    }

    this.logger.log(`Sending SMS via Plivo to ${message.to}`);

    const plivoClient = require('plivo');
    const client = new plivo.Client(process.env.PLIVO_AUTH_ID, process.env.PLIVO_AUTH_TOKEN);

    const response = await client.messages.create({
      src: message.from,
      dst: message.to,
      text: message.body,
      media_urls: message.mediaUrls,
    });

    const deliveryTime = Date.now() - startTime;
    
    this.logger.log(`SMS sent successfully via Plivo. Message UUID: ${response.messageUuid}, Delivery time: ${deliveryTime}ms`);
    
    return {
      success: true,
      messageId: response.messageUuid,
      deliveryTime,
      provider: 'plivo',
    };
  }

  async sendSMSWithFallback(
    message: SMSMessage,
    preferredProviders: string[] = ['twilio', 'sns', 'plivo']
  ): Promise<SMSResult> {
    let lastError: Error;

    for (const provider of preferredProviders) {
      try {
        const result = await this.sendSMS(provider, message);
        if (result.success) {
          return result;
        }
        lastError = new Error(result.error);
        this.logger.warn(`SMS provider ${provider} failed, trying next provider`);
      } catch (error) {
        lastError = error;
        this.logger.warn(`SMS provider ${provider} failed, trying next provider`);
      }
    }

    throw lastError || new Error('No SMS providers available');
  }

  getAvailableProviders(): string[] {
    const providers = [];
    if (this.twilioClient) providers.push('twilio');
    if (process.env.AWS_SNS_ACCESS_KEY) providers.push('sns');
    if (process.env.PLIVO_AUTH_ID) providers.push('plivo');
    return providers;
  }

  async validatePhoneNumber(phoneNumber: string, provider: string = 'twilio'): Promise<boolean> {
    try {
      switch (provider.toLowerCase()) {
        case 'twilio':
          if (!this.twilioClient) return false;
          await this.twilioClient.lookups.v1.phoneNumbers(phoneNumber).fetch();
          return true;
        default:
          // Basic regex validation for other providers
          const phoneRegex = /^\+?[1-9]\d{1,14}$/;
          return phoneRegex.test(phoneNumber);
      }
    } catch (error) {
      this.logger.error(`Phone number validation failed for ${phoneNumber}:`, error);
      return false;
    }
  }
}
