import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CommunicationAdapter {
    private readonly logger = new Logger(CommunicationAdapter.name);
    private readonly baseUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.baseUrl = this.configService.get('MODULE_11_URL') || 'http://localhost:3011';
    }

    /**
     * Send dispute filed notification
     */
    async sendDisputeFiledNotification(data: {
        customerEmail: string;
        customerName: string;
        disputeNumber: string;
        amount: number;
        description: string;
    }): Promise<boolean> {
        try {
            await firstValueFrom(
                this.httpService.post(`${this.baseUrl}/api/v1/notifications/send`, {
                    channel: 'email',
                    to: data.customerEmail,
                    template: 'dispute_filed',
                    subject: `Dispute Filed: ${data.disputeNumber}`,
                    data: {
                        customerName: data.customerName,
                        disputeNumber: data.disputeNumber,
                        amount: data.amount,
                        description: data.description,
                    },
                    priority: 'high',
                })
            );
            this.logger.log(`Dispute filed notification sent to ${data.customerEmail}`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to send dispute notification: ${error.message}`);
            return false;
        }
    }

    /**
     * Send legal notice via email
     */
    async sendLegalNotice(data: {
        customerEmail: string;
        customerName: string;
        disputeNumber: string;
        noticeContent: string;
        attachmentUrl?: string;
    }): Promise<boolean> {
        try {
            await firstValueFrom(
                this.httpService.post(`${this.baseUrl}/api/v1/notifications/send`, {
                    channel: 'email',
                    to: data.customerEmail,
                    template: 'legal_notice',
                    subject: `Legal Notice - ${data.disputeNumber}`,
                    data: {
                        customerName: data.customerName,
                        disputeNumber: data.disputeNumber,
                        content: data.noticeContent,
                        attachmentUrl: data.attachmentUrl,
                    },
                    priority: 'critical',
                    attachments: data.attachmentUrl ? [data.attachmentUrl] : [],
                })
            );
            this.logger.log(`Legal notice sent to ${data.customerEmail}`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to send legal notice: ${error.message}`);
            throw new Error(`Critical: Legal notice delivery failed - ${error.message}`);
        }
    }

    /**
     * Send WhatsApp payment reminder
     */
    async sendWhatsAppReminder(data: {
        phoneNumber: string;
        customerName: string;
        amount: number;
        dueDate: Date;
        invoiceNumber?: string;
    }): Promise<boolean> {
        try {
            await firstValueFrom(
                this.httpService.post(`${this.baseUrl}/api/v1/notifications/send`, {
                    channel: 'whatsapp',
                    to: data.phoneNumber,
                    template: 'payment_reminder',
                    data: {
                        customerName: data.customerName,
                        amount: data.amount,
                        dueDate: data.dueDate.toISOString().split('T')[0],
                        invoiceNumber: data.invoiceNumber,
                    },
                })
            );
            this.logger.log(`WhatsApp reminder sent to ${data.phoneNumber}`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to send WhatsApp reminder: ${error.message}`);
            return false;
        }
    }

    /**
     * Send SMS notification
     */
    async sendSMSNotification(data: {
        phoneNumber: string;
        message: string;
        type: 'reminder' | 'alert' | 'notice';
    }): Promise<boolean> {
        try {
            await firstValueFrom(
                this.httpService.post(`${this.baseUrl}/api/v1/notifications/send`, {
                    channel: 'sms',
                    to: data.phoneNumber,
                    message: data.message,
                    type: data.type,
                })
            );
            this.logger.log(`SMS sent to ${data.phoneNumber}`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to send SMS: ${error.message}`);
            return false;
        }
    }

    /**
     * Send dispute resolution notification
     */
    async sendDisputeResolvedNotification(data: {
        customerEmail: string;
        customerName: string;
        disputeNumber: string;
        resolution: string;
        settledAmount?: number;
    }): Promise<boolean> {
        try {
            await firstValueFrom(
                this.httpService.post(`${this.baseUrl}/api/v1/notifications/send`, {
                    channel: 'email',
                    to: data.customerEmail,
                    template: 'dispute_resolved',
                    subject: `Dispute Resolved: ${data.disputeNumber}`,
                    data: {
                        customerName: data.customerName,
                        disputeNumber: data.disputeNumber,
                        resolution: data.resolution,
                        settledAmount: data.settledAmount,
                    },
                })
            );
            this.logger.log(`Dispute resolved notification sent`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to send resolution notification: ${error.message}`);
            return false;
        }
    }

    /**
     * Send collection sequence notification
     */
    async sendCollectionNotification(data: {
        customerEmail: string;
        phoneNumber?: string;
        customerName: string;
        caseNumber: string;
        amount: number;
        sequence: 'reminder' | 'formal_notice' | 'final_notice';
    }): Promise<boolean> {
        try {
            const channel = data.sequence === 'reminder' && data.phoneNumber ? 'whatsapp' : 'email';

            await firstValueFrom(
                this.httpService.post(`${this.baseUrl}/api/v1/notifications/send`, {
                    channel,
                    to: channel === 'email' ? data.customerEmail : data.phoneNumber,
                    template: `collection_${data.sequence}`,
                    data: {
                        customerName: data.customerName,
                        caseNumber: data.caseNumber,
                        amount: data.amount,
                    },
                    priority: data.sequence === 'final_notice' ? 'high' : 'normal',
                })
            );
            this.logger.log(`Collection ${data.sequence} sent`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to send collection notification: ${error.message}`);
            return false;
        }
    }

    /**
     * Send notification to legal provider
     */
    async sendProviderNotification(data: {
        to: string;
        providerName: string;
        type: 'case_assignment' | 'document_pending' | 'hearing_reminder';
        caseId: string;
        formattedSubject?: string;
        details?: Record<string, any>;
    }): Promise<boolean> {
        try {
            await firstValueFrom(
                this.httpService.post(`${this.baseUrl}/api/v1/notifications/send`, {
                    channel: 'email',
                    to: data.to,
                    template: `provider_${data.type}`,
                    subject: `Legal Provider Update: ${data.formattedSubject || data.type}`,
                    data: {
                        providerName: data.providerName,
                        caseId: data.caseId,
                        ...data.details,
                    },
                    priority: 'high',
                })
            );
            this.logger.log(`Provider notification (${data.type}) sent to ${data.to}`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to send provider notification: ${error.message}`);
            return false;
        }
    }
}
