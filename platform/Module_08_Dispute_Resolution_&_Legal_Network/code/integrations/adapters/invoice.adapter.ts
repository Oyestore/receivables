import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface InvoiceResponse {
    id: string;
    invoiceNumber: string;
    customerId: string;
    customerName: string;
    amount: number;
    dueDate: Date;
    status: 'pending' | 'paid' | 'overdue' | 'disputed';
}

@Injectable()
export class InvoiceAdapter {
    private readonly logger = new Logger(InvoiceAdapter.name);
    private readonly baseUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.baseUrl = this.configService.get('MODULE_01_URL') || 'http://localhost:3001';
    }

    /**
     * Fetch invoice details by ID
     */
    async getInvoice(invoiceId: string): Promise<InvoiceResponse | null> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.baseUrl}/api/v1/invoices/${invoiceId}`)
            );
            return response.data.data || response.data;
        } catch (error: any) {
            this.logger.error(`Failed to fetch invoice ${invoiceId}: ${error.message}`);
            return null;
        }
    }

    /**
     * Mark invoice as disputed
     */
    async markAsDisputed(
        invoiceId: string,
        disputeId: string,
        updatedBy: string
    ): Promise<boolean> {
        try {
            await firstValueFrom(
                this.httpService.patch(
                    `${this.baseUrl}/api/v1/invoices/${invoiceId}/status`,
                    {
                        status: 'disputed',
                        reason: `Dispute filed: ${disputeId}`,
                        updatedBy,
                        metadata: { disputeId },
                    }
                )
            );
            this.logger.log(`Invoice ${invoiceId} marked as disputed (${disputeId})`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to mark invoice as disputed: ${error.message}`);
            return false;
        }
    }

    /**
     * Update invoice status after resolution
     */
    async updateAfterResolution(
        invoiceId: string,
        resolution: 'paid' | 'written_off' | 'pending',
        updatedBy: string,
        disputeId?: string
    ): Promise<boolean> {
        try {
            await firstValueFrom(
                this.httpService.patch(
                    `${this.baseUrl}/api/v1/invoices/${invoiceId}/status`,
                    {
                        status: resolution,
                        updatedBy,
                        metadata: { disputeId, resolvedAt: new Date() },
                    }
                )
            );
            this.logger.log(`Invoice ${invoiceId} updated to ${resolution}`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to update invoice status: ${error.message}`);
            return false;
        }
    }

    /**
     * Get customer invoices for historical analysis
     */
    async getCustomerInvoices(customerId: string, limit: number = 10): Promise<InvoiceResponse[]> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(
                    `${this.baseUrl}/api/v1/invoices`,
                    { params: { customerId, limit } }
                )
            );
            return response.data.data || response.data || [];
        } catch (error: any) {
            this.logger.error(`Failed to fetch customer invoices: ${error.message}`);
            return [];
        }
    }

    /**
     * Get overdue invoices count for customer
     */
    async getOverdueCount(customerId: string): Promise<number> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(
                    `${this.baseUrl}/api/v1/invoices/stats/${customerId}`,
                    { params: { status: 'overdue' } }
                )
            );
            return response.data.data?.overdueCount || 0;
        } catch (error: any) {
            this.logger.warn(`Failed to get overdue count: ${error.message}`);
            return 0;
        }
    }
}
