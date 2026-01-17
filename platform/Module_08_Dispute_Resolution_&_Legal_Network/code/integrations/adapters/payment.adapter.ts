import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface Payment {
    id: string;
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    paymentDate: Date;
    status: string;
}

@Injectable()
export class PaymentAdapter {
    private readonly logger = new Logger(PaymentAdapter.name);
    private readonly baseUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.baseUrl = this.configService.get('MODULE_03_URL') || 'http://localhost:3003';
    }

    /**
     * Get payment history for invoice
     */
    async getPaymentHistory(invoiceId: string): Promise<Payment[]> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.baseUrl}/api/v1/payments`, {
                    params: { invoiceId },
                })
            );
            return response.data.data || response.data || [];
        } catch (error: any) {
            this.logger.error(`Failed to fetch payment history: ${error.message}`);
            return [];
        }
    }

    /**
     * Record settlement payment
     */
    async recordSettlementPayment(data: {
        invoiceId: string;
        amount: number;
        disputeId: string;
        paymentMethod: string;
        recordedBy: string;
    }): Promise<boolean> {
        try {
            await firstValueFrom(
                this.httpService.post(`${this.baseUrl}/api/v1/payments`, {
                    invoiceId: data.invoiceId,
                    amount: data.amount,
                    paymentMethod: data.paymentMethod,
                    type: 'settlement',
                    recordedBy: data.recordedBy,
                    metadata: {
                        disputeId: data.disputeId,
                        paymentType: 'dispute_settlement',
                    },
                })
            );
            this.logger.log(`Settlement payment recorded for dispute ${data.disputeId}`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to record settlement payment: ${error.message}`);
            return false;
        }
    }

    /**
     * Get outstanding amount for invoice
     */
    async getOutstandingAmount(invoiceId: string): Promise<number> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.baseUrl}/api/v1/payments/outstanding/${invoiceId}`)
            );
            return response.data.data?.outstandingAmount || response.data.outstandingAmount || 0;
        } catch (error: any) {
            this.logger.error(`Failed to get outstanding amount: ${error.message}`);
            return 0;
        }
    }

    /**
     * Check if invoice has any payments
     */
    async hasPayments(invoiceId: string): Promise<boolean> {
        try {
            const payments = await this.getPaymentHistory(invoiceId);
            return payments.length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get total paid amount for invoice
     */
    async getTotalPaidAmount(invoiceId: string): Promise<number> {
        try {
            const payments = await this.getPaymentHistory(invoiceId);
            return payments
                .filter(p => p.status === 'completed')
                .reduce((sum, p) => sum + p.amount, 0);
        } catch (error) {
            return 0;
        }
    }
}
