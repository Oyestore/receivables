import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Invoice } from '../entities/invoice.entity';

// PHASE 2: Cross-Module Integration Services

// ============================================================================
// MODULE 02: Distribution Integration
// ============================================================================

export interface DistributionRequest {
    invoiceId: string;
    channels: ('email' | 'sms' | 'whatsapp')[];
    priority: 'high' | 'normal' | 'low';
    scheduledAt?: Date;
    metadata?: {
        customerId: string;
        amount: number;
        invoiceNumber: string;
        dueDate: Date;
    };
}

export interface DistributionResponse {
    jobId: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    channelResults?: {
        channel: string;
        status: string;
        sentAt?: Date;
        deliveredAt?: Date;
    }[];
}

@Injectable()
export class DistributionIntegrationService {
    private readonly logger = new Logger(DistributionIntegrationService.name);
    private readonly distributionServiceUrl: string;

    constructor(private httpService: HttpService) {
        this.distributionServiceUrl =
            process.env.DISTRIBUTION_SERVICE_URL || 'http://module-02:3000';
    }

    async distributeInvoice(
        invoice: Invoice,
        channels?: ('email' | 'sms' | 'whatsapp')[],
    ): Promise<DistributionResponse> {
        const request: DistributionRequest = {
            invoiceId: invoice.id,
            channels: channels || this.determineOptimalChannels(invoice),
            priority: this.calculatePriority(invoice),
            metadata: {
                customerId: invoice.client_id,
                amount: invoice.grand_total,
                invoiceNumber: invoice.number,
                dueDate: invoice.due_date,
            },
        };

        try {
            this.logger.log(
                `Distributing invoice ${invoice.number} via ${request.channels.join(', ')}`,
            );

            const response = await firstValueFrom(
                this.httpService.post<DistributionResponse>(
                    `${this.distributionServiceUrl}/api/v1/distribution`,
                    request,
                ),
            );

            this.logger.log(`Distribution queued: ${response.data.jobId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Distribution failed for invoice ${invoice.id}:`, error);

            // Non-blocking: Log error but don't fail invoice creation
            return {
                jobId: `failed-${Date.now()}`,
                status: 'failed',
            };
        }
    }

    async getDistributionStatus(jobId: string): Promise<DistributionResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.get<DistributionResponse>(
                    `${this.distributionServiceUrl}/api/v1/distribution/${jobId}/status`,
                ),
            );
            return response.data;
        } catch (error) {
            throw new HttpException(
                'Failed to get distribution status',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
    }

    async retryDistribution(jobId: string): Promise<DistributionResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.post<DistributionResponse>(
                    `${this.distributionServiceUrl}/api/v1/distribution/${jobId}/retry`,
                    {},
                ),
            );
            return response.data;
        } catch (error) {
            throw new HttpException(
                'Failed to retry distribution',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
    }

    private determineOptimalChannels(invoice: Invoice): ('email' | 'sms' | 'whatsapp')[] {
        // Default channels based on amount and urgency
        const channels: ('email' | 'sms' | 'whatsapp')[] = ['email'];

        if (invoice.grand_total > 100000) {
            channels.push('whatsapp'); // High value: WhatsApp
        }

        const daysUntilDue = Math.floor(
            (invoice.due_date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysUntilDue < 7) {
            channels.push('sms'); // Urgent: SMS
        }

        return channels;
    }

    private calculatePriority(invoice: Invoice): 'high' | 'normal' | 'low' {
        if (invoice.grand_total > 500000) return 'high';
        if (invoice.grand_total < 10000) return 'low';
        return 'normal';
    }
}

// ============================================================================
// MODULE 03: Payment Integration
// ============================================================================

export interface PaymentLinkRequest {
    invoiceId: string;
    amount: number;
    currency: string;
    customerId: string;
    callbackUrl: string;
    expiresAt?: Date;
    methods?: ('upi' | 'card' | 'netbanking')[];
}

export interface PaymentLinkResponse {
    paymentLinkId: string;
    url: string;
    qrCode?: string;
    expiresAt: Date;
    supportedMethods: string[];
}

export interface PaymentCallback {
    paymentId: string;
    invoiceId: string;
    amount: number;
    status: 'success' | 'failed' | 'pending';
    transactionRef: string;
    paidAt?: Date;
}

@Injectable()
export class PaymentIntegrationService {
    private readonly logger = new Logger(PaymentIntegrationService.name);
    private readonly paymentServiceUrl: string;

    constructor(private httpService: HttpService) {
        this.paymentServiceUrl =
            process.env.PAYMENT_SERVICE_URL || 'http://module-03:3000';
    }

    async createPaymentLink(invoice: Invoice): Promise<PaymentLinkResponse> {
        const request: PaymentLinkRequest = {
            invoiceId: invoice.id,
            amount: invoice.balance_due,
            currency: invoice.currency || 'INR',
            customerId: invoice.client_id,
            callbackUrl: `${process.env.BASE_URL}/api/v1/invoices/${invoice.id}/payment-callback`,
            expiresAt: invoice.due_date,
            methods: ['upi', 'card', 'netbanking'],
        };

        try {
            this.logger.log(`Creating payment link for invoice ${invoice.number}`);

            const response = await firstValueFrom(
                this.httpService.post<PaymentLinkResponse>(
                    `${this.paymentServiceUrl}/api/v1/payment-links`,
                    request,
                ),
            );

            this.logger.log(
                `Payment link created: ${response.data.paymentLinkId}`,
            );
            return response.data;
        } catch (error) {
            this.logger.error(`Payment link creation failed:`, error);
            throw new HttpException(
                'Failed to create payment link',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
    }

    async handlePaymentCallback(invoiceId: string, paymentData: PaymentCallback): Promise<void> {
        this.logger.log(`Payment callback received for invoice ${invoiceId}: ${paymentData.status}`);

        if (paymentData.status === 'success') {
            // Update logic will be in invoice service
            this.logger.log(
                `Payment successful: ${paymentData.amount} paid for invoice ${invoiceId}`,
            );
        } else {
            this.logger.warn(
                `Payment ${paymentData.status} for invoice ${invoiceId}`,
            );
        }
    }

    async getPaymentLinkStatus(paymentLinkId: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(
                    `${this.paymentServiceUrl}/api/v1/payment-links/${paymentLinkId}/status`,
                ),
            );
            return response.data;
        } catch (error) {
            throw new HttpException(
                'Failed to get payment link status',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
    }
}

// ============================================================================
// MODULE 11: Notification Integration
// ============================================================================

export interface NotificationRequest {
    channel: 'email' | 'sms' | 'whatsapp';
    recipient: string;
    template: string;
    data: Record<string, any>;
    priority?: 'high' | 'normal' | 'low';
    scheduledAt?: Date;
}

export interface NotificationResponse {
    notificationId: string;
    status: 'sent' | 'scheduled' | 'failed';
    sentAt?: Date;
}

@Injectable()
export class NotificationIntegrationService {
    private readonly logger = new Logger(NotificationIntegrationService.name);
    private readonly notificationServiceUrl: string;

    constructor(private httpService: HttpService) {
        this.notificationServiceUrl =
            process.env.NOTIFICATION_SERVICE_URL || 'http://module-11:3000';
    }

    async sendInvoiceNotification(
        invoice: Invoice,
        event: 'created' | 'sent' | 'paid' | 'overdue' | 'reminder',
        recipientEmail?: string,
        recipientPhone?: string,
    ): Promise<NotificationResponse> {
        const notification: NotificationRequest = {
            channel: 'email', // Primary channel
            recipient: recipientEmail || 'customer@example.com', // Would come from customer data
            template: `invoice_${event}`,
            data: {
                invoice_number: invoice.number,
                amount: invoice.grand_total,
                balance_due: invoice.balance_due,
                due_date: invoice.due_date.toISOString().split('T')[0],
                currency: invoice.currency || 'INR',
                status: invoice.status,
            },
            priority: event === 'overdue' ? 'high' : 'normal',
        };

        try {
            this.logger.log(
                `Sending ${event} notification for invoice ${invoice.number}`,
            );

            const response = await firstValueFrom(
                this.httpService.post<NotificationResponse>(
                    `${this.notificationServiceUrl}/api/v1/notifications/send`,
                    notification,
                ),
            );

            this.logger.log(`Notification sent: ${response.data.notificationId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Notification sending failed:`, error);

            // Non-blocking: Log error but don't fail primary operation
            return {
                notificationId: `failed-${Date.now()}`,
                status: 'failed',
            };
        }
    }

    async sendBulkReminders(invoices: Invoice[]): Promise<NotificationResponse[]> {
        const results: NotificationResponse[] = [];

        for (const invoice of invoices) {
            try {
                const result = await this.sendInvoiceNotification(invoice, 'reminder');
                results.push(result);
            } catch (error) {
                this.logger.error(
                    `Bulk reminder failed for invoice ${invoice.id}:`,
                    error,
                );
            }
        }

        return results;
    }
}

// ============================================================================
// MODULE 17: GL Posting Integration
// ============================================================================

export interface GLEntry {
    account: string;
    debit: number;
    credit: number;
    description: string;
}

export interface GLPostingRequest {
    invoiceId: string;
    entries: GLEntry[];
    postingDate: Date;
    reference: string;
    tenantId: string;
}

export interface GLPostingResponse {
    postingId: string;
    status: 'posted' | 'pending' | 'failed';
    postedAt?: Date;
    glEntries: {
        account: string;
        entryId: string;
    }[];
}

@Injectable()
export class GLPostingIntegrationService {
    private readonly logger = new Logger(GLPostingIntegrationService.name);
    private readonly glServiceUrl: string;

    constructor(private httpService: HttpService) {
        this.glServiceUrl =
            process.env.GL_SERVICE_URL || 'http://module-17:3000';
    }

    async postInvoiceToGL(invoice: Invoice): Promise<GLPostingResponse> {
        const entries: GLEntry[] = [
            {
                account: 'Accounts_Receivable',
                debit: invoice.grand_total,
                credit: 0,
                description: `Invoice ${invoice.number} - Accounts Receivable`,
            },
            {
                account: 'Revenue',
                debit: 0,
                credit: invoice.sub_total,
                description: `Invoice ${invoice.number} - Revenue`,
            },
        ];

        // Add tax entry if applicable
        if (invoice.total_tax_amount > 0) {
            entries.push({
                account: 'Tax_Payable',
                debit: 0,
                credit: invoice.total_tax_amount,
                description: `Invoice ${invoice.number} - Tax`,
            });
        }

        const request: GLPostingRequest = {
            invoiceId: invoice.id,
            entries,
            postingDate: invoice.issue_date || new Date(),
            reference: invoice.number,
            tenantId: invoice.tenant_id,
        };

        try {
            this.logger.log(`Posting invoice ${invoice.number} to GL`);

            const response = await firstValueFrom(
                this.httpService.post<GLPostingResponse>(
                    `${this.glServiceUrl}/api/v1/gl/post`,
                    request,
                ),
            );

            this.logger.log(`GL posting successful: ${response.data.postingId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`GL posting failed for invoice ${invoice.id}:`, error);
            throw new HttpException(
                'Failed to post to GL',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
    }

    async postPaymentToGL(
        invoice: Invoice,
        paymentAmount: number,
    ): Promise<GLPostingResponse> {
        const entries: GLEntry[] = [
            {
                account: 'Cash',
                debit: paymentAmount,
                credit: 0,
                description: `Payment for Invoice ${invoice.number}`,
            },
            {
                account: 'Accounts_Receivable',
                debit: 0,
                credit: paymentAmount,
                description: `Payment for Invoice ${invoice.number}`,
            },
        ];

        const request: GLPostingRequest = {
            invoiceId: invoice.id,
            entries,
            postingDate: new Date(),
            reference: `PAY-${invoice.number}`,
            tenantId: invoice.tenant_id,
        };

        try {
            const response = await firstValueFrom(
                this.httpService.post<GLPostingResponse>(
                    `${this.glServiceUrl}/api/v1/gl/post`,
                    request,
                ),
            );

            return response.data;
        } catch (error) {
            this.logger.error(`GL payment posting failed:`, error);
            throw new HttpException(
                'Failed to post payment to GL',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
    }

    async reverseGLPosting(postingId: string): Promise<GLPostingResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.post<GLPostingResponse>(
                    `${this.glServiceUrl}/api/v1/gl/${postingId}/reverse`,
                    {},
                ),
            );
            return response.data;
        } catch (error) {
            throw new HttpException(
                'Failed to reverse GL posting',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
    }
}
