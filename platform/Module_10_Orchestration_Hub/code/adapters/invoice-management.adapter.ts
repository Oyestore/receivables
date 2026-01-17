/**
 * Invoice Management Adapter (Module 01)
 * 
 * Adapter for Invoice Management module integration
 */

import { Injectable } from '@nestjs/common';
import { ModuleName } from '../types/orchestration.types';
import { BaseModuleAdapter } from './base-module.adapter';

@Injectable()
export class InvoiceManagementAdapter extends BaseModuleAdapter {
    readonly moduleName = ModuleName.INVOICE_MANAGEMENT;
    readonly baseUrl: string;
    readonly version = '1.0.0';
    readonly capabilities = [
        'invoice_creation',
        'invoice_query',
        'invoice_update',
        'recurring_invoice_management',
        'invoice_status_tracking',
    ];

    constructor() {
        super('InvoiceManagement');
        this.baseUrl = process.env.MODULE_01_URL || 'http://localhost:3001';
        this.httpClient = this.initializeHttpClient(this.baseUrl);
    }

    async executeAction(action: string, params: Record<string, any>): Promise<any> {
        const headers = this.addTenantHeader(params);

        switch (action) {
            case 'getInvoice':
                return this.getInvoice(params.invoiceId, headers);

            case 'getOverdueInvoices':
                return this.getOverdueInvoices(headers);

            case 'updateInvoiceStatus':
                return this.updateInvoiceStatus(params.invoiceId, params.status, headers);

            case 'createInvoice':
                return this.createInvoice(params.invoiceData, headers);

            case 'getInvoicesByCustomer':
                return this.getInvoicesByCustomer(params.customerId, headers);

            case 'handleEvent':
                return this.handleEvent(params.event);

            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }

    private async getInvoice(invoiceId: string, headers: Record<string, string>): Promise<any> {
        const response = await this.httpClient.get(`/api/invoices/${invoiceId}`, { headers });
        return response.data;
    }

    private async getOverdueInvoices(headers: Record<string, string>): Promise<any[]> {
        const response = await this.httpClient.get('/api/invoices/overdue', { headers });
        return response.data;
    }

    private async updateInvoiceStatus(
        invoiceId: string,
        status: string,
        headers: Record<string, string>
    ): Promise<void> {
        await this.httpClient.patch(
            `/api/invoices/${invoiceId}/status`,
            { status },
            { headers }
        );
    }

    private async createInvoice(invoiceData: any, headers: Record<string, string>): Promise<any> {
        const response = await this.httpClient.post('/api/invoices', invoiceData, { headers });
        return response.data;
    }

    private async getInvoicesByCustomer(
        customerId: string,
        headers: Record<string, string>
    ): Promise<any[]> {
        const response = await this.httpClient.get(`/api/invoices/customer/${customerId}`, { headers });
        return response.data;
    }

    private async handleEvent(event: any): Promise<void> {
        // Invoice module can react to events like payment received, customer updated, etc.
        this.logger.log(`Received event: ${event.type}`);
        // Event handling logic would go here
    }
}
