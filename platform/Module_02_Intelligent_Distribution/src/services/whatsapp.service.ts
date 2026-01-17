import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface WhatsAppMessage {
  to: string;
  from: string;
  body: string;
  mediaUrl?: string;
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: Array<{
    type: string;
    parameters: Array<{
      type: string;
      text?: string;
      currency?: {
        fallback_value: string;
        code: string;
        amount_1000: number;
      };
    }>;
  }>;
}

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryTime?: number;
  provider: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor() {
    this.validateConfiguration();
  }

  private validateConfiguration() {
    if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      this.logger.warn('WhatsApp Business API credentials not configured');
    }
  }

  async sendWhatsAppMessage(provider: string, message: WhatsAppMessage): Promise<WhatsAppResult> {
    const startTime = Date.now();

    try {
      switch (provider.toLowerCase()) {
        case 'meta':
          return await this.sendViaMetaWhatsApp(message, startTime);
        case 'twilio':
          return await this.sendViaTwilioWhatsApp(message, startTime);
        default:
          throw new Error(`WhatsApp provider ${provider} not supported`);
      }
    } catch (error) {
      const deliveryTime = Date.now() - startTime;
      this.logger.error(`Failed to send WhatsApp message via ${provider}:`, error);
      
      return {
        success: false,
        error: error.message,
        deliveryTime,
        provider,
      };
    }
  }

  private async sendViaMetaWhatsApp(message: WhatsAppMessage, startTime: number): Promise<WhatsAppResult> {
    if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('Meta WhatsApp credentials not configured');
    }

    this.logger.log(`Sending WhatsApp message via Meta to ${message.to}`);

    const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    let payload: any;

    if (message.templateName) {
      // Template message
      payload = {
        messaging_product: 'whatsapp',
        to: message.to,
        type: 'template',
        template: {
          name: message.templateName,
          language: {
            code: message.templateLanguage || 'en_US',
          },
          components: message.templateComponents || [],
        },
      };
    } else {
      // Regular text message
      payload = {
        messaging_product: 'whatsapp',
        to: message.to,
        type: message.mediaUrl ? 'media' : 'text',
        [message.mediaUrl ? 'media' : 'text']: {
          [message.mediaUrl ? 'link' : 'body']: message.mediaUrl || message.body,
        },
      };
    }

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const deliveryTime = Date.now() - startTime;
    
    this.logger.log(`WhatsApp message sent successfully via Meta. Message ID: ${response.data.messages[0].id}, Delivery time: ${deliveryTime}ms`);
    
    return {
      success: true,
      messageId: response.data.messages[0].id,
      deliveryTime,
      provider: 'meta',
    };
  }

  private async sendViaTwilioWhatsApp(message: WhatsAppMessage, startTime: number): Promise<WhatsAppResult> {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }

    this.logger.log(`Sending WhatsApp message via Twilio to ${message.to}`);

    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const twilioMessage = await client.messages.create({
      from: `whatsapp:${message.from}`,
      to: `whatsapp:${message.to}`,
      body: message.body,
      mediaUrl: message.mediaUrl,
    });

    const deliveryTime = Date.now() - startTime;
    
    this.logger.log(`WhatsApp message sent successfully via Twilio. SID: ${twilioMessage.sid}, Delivery time: ${deliveryTime}ms`);
    
    return {
      success: true,
      messageId: twilioMessage.sid,
      deliveryTime,
      provider: 'twilio',
    };
  }

  async sendWhatsAppTemplate(
    provider: string,
    to: string,
    templateName: string,
    language: string = 'en_US',
    components?: any[]
  ): Promise<WhatsAppResult> {
    const message: WhatsAppMessage = {
      to,
      from: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      body: '',
      templateName,
      templateLanguage: language,
      templateComponents: components,
    };

    return await this.sendWhatsAppMessage(provider, message);
  }

  async getWhatsAppMessageStatus(provider: string, messageId: string): Promise<any> {
    try {
      switch (provider.toLowerCase()) {
        case 'meta':
          return await this.getMetaMessageStatus(messageId);
        case 'twilio':
          return await this.getTwilioMessageStatus(messageId);
        default:
          throw new Error(`WhatsApp provider ${provider} not supported`);
      }
    } catch (error) {
      this.logger.error(`Failed to get WhatsApp message status:`, error);
      throw error;
    }
  }

  private async getMetaMessageStatus(messageId: string): Promise<any> {
    const url = `https://graph.facebook.com/v18.0/${messageId}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      },
    });

    return response.data;
  }

  private async getTwilioMessageStatus(messageId: string): Promise<any> {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    return await client.messages(messageId).fetch();
  }

  getAvailableProviders(): string[] {
    const providers = [];
    if (process.env.WHATSAPP_ACCESS_TOKEN) providers.push('meta');
    if (process.env.TWILIO_ACCOUNT_SID) providers.push('twilio');
    return providers;
  }

  async validateWhatsAppNumber(phoneNumber: string): Promise<boolean> {
    try {
      // Basic WhatsApp number validation
      const whatsappRegex = /^\+?[1-9]\d{1,14}$/;
      return whatsappRegex.test(phoneNumber);
    } catch (error) {
      this.logger.error(`WhatsApp number validation failed for ${phoneNumber}:`, error);
      return false;
    }
  }
}
