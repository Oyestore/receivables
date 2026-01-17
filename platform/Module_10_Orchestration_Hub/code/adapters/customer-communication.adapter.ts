/**
 * Customer Communication Adapter (Module 02)
 * 
 * Adapter for Customer Communication module integration
 */

import { Injectable } from '@nestjs/common';
import { ModuleName } from '../types/orchestration.types';
import { BaseModuleAdapter } from './base-module.adapter';

@Injectable()
export class CustomerCommunicationAdapter extends BaseModuleAdapter {
    readonly moduleName = ModuleName.CUSTOMER_COMMUNICATION;
    readonly baseUrl: string;
    readonly version = '1.0.0';
    readonly capabilities = [
        'email_delivery',
        'sms_delivery',
        'whatsapp_delivery',
        'communication_tracking',
        'template_management',
        'multi_channel_optimization',
    ];

    constructor() {
        super('CustomerCommunication');
        this.baseUrl = process.env.MODULE_02_URL || 'http://localhost:3002';
        this.httpClient = this.initializeHttpClient(this.baseUrl);
    }

    async executeAction(action: string, params: Record<string, any>): Promise<any> {
        const headers = this.addTenantHeader(params);

        switch (action) {
            case 'sendEmail':
                return this.sendEmail(params.emailData, headers);

            case 'sendSMS':
                return this.sendSMS(params.smsData, headers);

            case 'sendWhatsApp':
                return this.sendWhatsApp(params.whatsappData, headers);

            case 'getCommunicationHistory':
                return this.getCommunicationHistory(params.customerId, headers);

            case 'getOptimalChannel':
                return this.getOptimalChannel(params.customerId, headers);

            case 'handleEvent':
                return this.handleEvent(params.event);

            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }

    private async sendEmail(emailData: any, headers: Record<string, string>): Promise<any> {
        const response = await this.httpClient.post('/api/communications/email', emailData, { headers });
        return response.data;
    }

    private async sendSMS(smsData: any, headers: Record<string, string>): Promise<any> {
        const response = await this.httpClient.post('/api/communications/sms', smsData, { headers });
        return response.data;
    }

    private async sendWhatsApp(whatsappData: any, headers: Record<string, string>): Promise<any> {
        const response = await this.httpClient.post('/api/communications/whatsapp', whatsappData, {
            headers,
        });
        return response.data;
    }

    private async getCommunicationHistory(
        customerId: string,
        headers: Record<string, string>
    ): Promise<any[]> {
        const response = await this.httpClient.get(`/api/communications/history/${customerId}`, {
            headers,
        });
        return response.data;
    }

    private async getOptimalChannel(
        customerId: string,
        headers: Record<string, string>
    ): Promise<string> {
        const response = await this.httpClient.get(`/api/communications/optimal-channel/${customerId}`, {
            headers,
        });
        return response.data.channel;
    }

    private async handleEvent(event: any): Promise<void> {
        this.logger.log(`Received event: ${event.type}`);
        // Communication module can react to events like invoice sent, payment reminder needed, etc.
    }
}
