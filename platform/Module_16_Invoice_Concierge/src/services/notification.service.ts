import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface WhatsAppMessage {
    to: string;
    template: string;
    variables: Record<string, string>;
}

interface SMSMessage {
    to: string;
    message: string;
}

interface EmailMessage {
    to: string;
    subject: string;
    template: string;
    variables: Record<string, any>;
    attachments?: Array<{
        filename: string;
        path: string;
    }>;
}

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    /**
     * Safe error message extraction
     * @private
     */
    private getErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        return 'Unknown error';
    }

    /**
     * Retry helper with exponential backoff
     * @private
     */
    private async withRetry<T>(
        fn: () => Promise<T>,
        attempts = 3,
        serviceName = 'operation'
    ): Promise<T> {
        for (let i = 0; i < attempts; i++) {
            try {
                return await fn();
            } catch (error) {
                const errorMsg = this.getErrorMessage(error);
                this.logger.warn(`${serviceName} attempt ${i + 1}/${attempts} failed: ${errorMsg}`);

                if (i === attempts - 1) {
                    throw error; // Last attempt - propagate error
                }

                // Exponential backoff: 1s, 2s, 4s
                const delay = 1000 * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw new Error('Should not reach here');
    }

    /**
     * Send WhatsApp message via Module 11
     * Uses Meta Cloud API templates
     */
    async sendWhatsApp(message: WhatsAppMessage): Promise<void> {
        this.logger.log(`Sending WhatsApp to ${message.to}: ${message.template}`);

        if (process.env.MOCK_NOTIFICATIONS === 'true') {
            this.logger.log(`[Mock] WhatsApp sent successfully: ${message.template}`);
            return;
        }

        await this.withRetry(async () => {
            await axios.post('/api/notifications/whatsapp', {
                to: message.to,
                template: message.template,
                variables: message.variables,
            });
            this.logger.log(`WhatsApp sent successfully: ${message.template}`);
        }, 3, 'WhatsApp');
    }

    /**
     * Send SMS via Module 11
     */
    async sendSMS(message: SMSMessage): Promise<void> {
        this.logger.log(`Sending SMS to ${message.to}`);
        this.logger.log(`DEBUG: MOCK_NOTIFICATIONS in Module 16 = ${process.env.MOCK_NOTIFICATIONS}`);

        if (process.env.MOCK_NOTIFICATIONS === 'true') {
            this.logger.log(`[Mock] SMS sent successfully`);
            return;
        }

        try {
            await axios.post('/api/notifications/sms', {
                to: message.to,
                message: message.message,
            });

            this.logger.log(`SMS sent successfully`);
        } catch (error) {
            this.logger.error(`Failed to send SMS: ${error.message}`);
            throw error;
        }
    }

    /**
     * Send email via Module 11
     */
    async sendEmail(message: EmailMessage): Promise<void> {
        this.logger.log(`Sending email to ${message.to}: ${message.subject}`);

        if (process.env.MOCK_NOTIFICATIONS === 'true') {
            this.logger.log(`[Mock] Email sent successfully: ${message.template}`);
            return;
        }

        try {
            await axios.post('/api/notifications/email', {
                to: message.to,
                subject: message.subject,
                template: message.template,
                variables: message.variables,
                attachments: message.attachments,
            });

            this.logger.log(`Email sent successfully: ${message.template}`);
        } catch (error) {
            this.logger.error(`Failed to send email: ${error.message}`);
            throw error;
        }
    }

    /**
     * Send magic link to customer via WhatsApp
     * Primary notification method for invoice access
     */
    async sendMagicLink(
        phone: string,
        email: string,
        magicLink: string,
        invoiceNumber: string,
        vendor: string,
        amount: number,
    ): Promise<void> {
        this.logger.log(`Sending magic link to ${phone}`);

        // WhatsApp (primary channel)
        await this.sendWhatsApp({
            to: phone,
            template: 'invoice_magic_link',
            variables: {
                vendor,
                invoiceNumber,
                amount: `₹${amount.toLocaleString('en-IN')}`,
                magicLink,
            },
        });

        // Email (backup channel)
        await this.sendEmail({
            to: email,
            subject: `Invoice ${invoiceNumber} from ${vendor}`,
            template: 'invoice_email_link',
            variables: {
                vendor,
                invoiceNumber,
                amount,
                magicLink,
            },
        });
    }

    /**
     * Send payment reminder (for collections)
     */
    async sendPaymentReminder(
        phone: string,
        email: string,
        invoiceNumber: string,
        amount: number,
        daysOverdue: number,
    ): Promise<void> {
        this.logger.log(`Sending payment reminder: ${invoiceNumber} (${daysOverdue} days overdue)`);

        const urgency = daysOverdue > 14 ? 'urgent' : daysOverdue > 7 ? 'reminder' : 'gentle';

        // WhatsApp
        await this.sendWhatsApp({
            to: phone,
            template: `payment_reminder_${urgency}`,
            variables: {
                invoiceNumber,
                amount: `₹${amount.toLocaleString('en-IN')}`,
                daysOverdue: daysOverdue.toString(),
            },
        });

        // Email
        await this.sendEmail({
            to: email,
            subject: daysOverdue > 14
                ? `URGENT: Invoice ${invoiceNumber} Overdue by ${daysOverdue} Days`
                : `Payment Reminder: Invoice ${invoiceNumber}`,
            template: `payment_reminder_${urgency}`,
            variables: {
                invoiceNumber,
                amount,
                daysOverdue,
            },
        });
    }

    /**
     * Send payment confirmation
     */
    async sendPaymentConfirmation(
        phone: string,
        email: string,
        paymentId: string,
        amount: number,
        method: string,
    ): Promise<void> {
        this.logger.log(`Sending payment confirmation: ${paymentId}`);

        // WhatsApp
        await this.sendWhatsApp({
            to: phone,
            template: 'payment_success',
            variables: {
                amount: `₹${amount.toLocaleString('en-IN')}`,
                paymentId,
                method: method.toUpperCase(),
            },
        });

        // Email with receipt
        await this.sendEmail({
            to: email,
            subject: 'Payment Successful - Receipt Attached',
            template: 'payment_receipt',
            variables: {
                amount,
                paymentId,
                method,
            },
            attachments: [
                {
                    filename: `receipt-${paymentId}.pdf`,
                    path: `/receipts/${paymentId}.pdf`, // Generated by Module 03
                },
            ],
        });
    }

    /**
     * Send dispute ticket confirmation
     */
    async sendDisputeConfirmation(
        phone: string,
        email: string,
        ticketId: string,
        disputeType: string,
    ): Promise<void> {
        this.logger.log(`Sending dispute confirmation: ${ticketId}`);

        // WhatsApp
        await this.sendWhatsApp({
            to: phone,
            template: 'dispute_ticket_created',
            variables: {
                ticketId,
                disputeType,
                expectedResolution: '24 hours',
            },
        });

        // Email
        await this.sendEmail({
            to: email,
            subject: `Dispute Ticket Created - ${ticketId}`,
            template: 'dispute_created',
            variables: {
                ticketId,
                disputeType,
                expectedResolution: '24 hours',
            },
        });
    }

    /**
     * Send referral reward notification
     */
    async sendReferralReward(
        phone: string,
        email: string,
        rewardAmount: number,
        refereeName: string,
    ): Promise<void> {
        this.logger.log(`Sending referral reward notification: ₹${rewardAmount}`);

        // WhatsApp with celebration
        await this.sendWhatsApp({
            to: phone,
            template: 'referral_reward',
            variables: {
                rewardAmount: `₹${rewardAmount}`,
                refereeName,
            },
        });

        // Email
        await this.sendEmail({
            to: email,
            subject: `🎉 You Earned ₹${rewardAmount} Referral Reward!`,
            template: 'referral_reward',
            variables: {
                rewardAmount,
                refereeName,
            },
        });
    }

    /**
     * Send collection success notification to tenant (CFO)
     */
    async sendCollectionSuccess(
        tenantEmail: string,
        customerName: string,
        amount: number,
        invoiceNumber: string,
    ): Promise<void> {
        this.logger.log(`Sending collection success to tenant: ${invoiceNumber}`);

        await this.sendEmail({
            to: tenantEmail,
            subject: `Payment Received: ${customerName} - ₹${amount.toLocaleString('en-IN')}`,
            template: 'collection_success',
            variables: {
                customerName,
                amount,
                invoiceNumber,
            },
        });
    }
}
