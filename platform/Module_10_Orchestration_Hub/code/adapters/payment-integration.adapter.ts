/**
 * Payment Integration Adapter (Module 03)
 * 
 * Adapter for Payment Integration module
 */

import { Injectable } from '@nestjs/common';
import { ModuleName } from '../types/orchestration.types';
import { BaseModuleAdapter } from './base-module.adapter';

@Injectable()
export class PaymentIntegrationAdapter extends BaseModuleAdapter {
    readonly moduleName = ModuleName.PAYMENT_INTEGRATION;
    readonly baseUrl: string;
    readonly version = '1.0.0';
    readonly capabilities = [
        'payment_processing',
        'upi_integration',
        'virtual_accounts',
        'payment_reminders',
        'payment_tracking',
        'refund_processing',
    ];

    constructor() {
        super('PaymentIntegration');
        this.baseUrl = process.env.MODULE_03_URL || 'http://localhost:3003';
        this.httpClient = this.initializeHttpClient(this.baseUrl);
    }

    async executeAction(action: string, params: Record<string, any>): Promise<any> {
        const headers = this.addTenantHeader(params);

        switch (action) {
            case 'processPayment':
                return this.processPayment(params.paymentData, headers);

            case 'getPaymentStatus':
                return this.getPaymentStatus(params.paymentId, headers);

            case 'sendPaymentReminder':
                return this.sendPaymentReminder(params.reminderData, headers);

            case 'getPaymentsByInvoice':
                return this.getPaymentsByInvoice(params.invoiceId, headers);

            case 'initiateRefund':
                return this.initiateRefund(params.refundData, headers);

            case 'handleEvent':
                return this.handleEvent(params.event);

            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }

    private async processPayment(paymentData: any, headers: Record<string, string>): Promise<any> {
        const response = await this.httpClient.post('/api/payments/process', paymentData, { headers });
        return response.data;
    }

    private async getPaymentStatus(paymentId: string, headers: Record<string, string>): Promise<any> {
        const response = await this.httpClient.get(`/api/payments/${paymentId}`, { headers });
        return response.data;
    }

    private async sendPaymentReminder(
        reminderData: any,
        headers: Record<string, string>
    ): Promise<void> {
        await this.httpClient.post('/api/payments/reminders', reminderData, { headers });
    }

    private async getPaymentsByInvoice(
        invoiceId: string,
        headers: Record<string, string>
    ): Promise<any[]> {
        const response = await this.httpClient.get(`/api/payments/invoice/${invoiceId}`, { headers });
        return response.data;
    }

    private async initiateRefund(refundData: any, headers: Record<string, string>): Promise<any> {
        const response = await this.httpClient.post('/api/payments/refund', refundData, { headers });
        return response.data;
    }

    private async handleEvent(event: any): Promise<void> {
        this.logger.log(`Received event: ${event.type}`);
        // Payment module can react to events like invoice created, payment link requested, etc.
    }
}
