import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../../../Module_11_Common/src/services/notification.service';
import { EnhancedEmailService } from '../../../Module_02_Intelligent_Distribution/code/services/enhanced-email.service';

interface NotificationPayload {
    to: string;
    subject?: string;
    body: string;
    channel: 'email' | 'sms' | 'whatsapp';
    templateId?: string;
    variables?: Record<string, any>;
}

@Injectable()
export class NotificationIntegrationService {
    private readonly logger = new Logger(NotificationIntegrationService.name);

    constructor(
        private readonly notificationService: NotificationService,
        private readonly enhancedEmailService: EnhancedEmailService
    ) { }

    async sendCampaignNotification(campaign: any, recipient: string): Promise<void> {
        const payload: NotificationPayload = {
            to: recipient,
            subject: `New Campaign: ${campaign.name}`,
            body: campaign.content?.message || 'You have a new campaign message',
            channel: this.mapCampaignTypeToChannel(campaign.type),
        };

        this.logger.log(`Sending ${payload.channel} notification for campaign ${campaign.id} to ${recipient}`);

        if (payload.channel === 'email') {
            // Optimize send time if meaningful data is available
            // For now, simpler integration: just send
            await this.notificationService.sendEmail({
                to: payload.to,
                subject: payload.subject!,
                text: payload.body,
                html: `<html><body><p>${payload.body}</p></body></html>`
            });
        } else if (payload.channel === 'sms') {
            await this.notificationService.sendSMS({
                to: payload.to,
                message: `${payload.subject}: ${payload.body}`
            });
        } else if (payload.channel === 'whatsapp') {
            await this.notificationService.sendWhatsApp({
                to: payload.to,
                message: `*${payload.subject}*\n\n${payload.body}`
            });
        }
    }

    async sendOnboardingNotification(step: any, customerEmail: string): Promise<void> {
        this.logger.log(`Sending onboarding notification for step ${step.id} to ${customerEmail}`);

        await this.notificationService.sendEmail({
            to: customerEmail,
            subject: `Next Step: ${step.name}`,
            text: step.description || `Please complete: ${step.name}`,
            html: `<html><body><h1>Next Step: ${step.name}</h1><p>${step.description || 'Please proceed.'}</p></body></html>`
        });
    }

    async sendHealthAlertNotification(customerId: string, healthScore: number, riskFactors: string[]): Promise<void> {
        // In production, you'd resolve customerId to email using a UserService
        // For verify script/MVP, we might assume customerId is an email or we skip if not
        if (!customerId.includes('@')) {
            this.logger.warn(`Skipping health alert for ${customerId} - No email resolution logic yet.`);
            return;
        }

        this.logger.log(`Sending health alert for customer ${customerId}`);

        await this.notificationService.sendEmail({
            to: customerId,
            subject: 'Customer Health Alert',
            text: `Health score: ${healthScore}. Risk factors: ${riskFactors.join(', ')}`,
            html: `<html><body><h1>Health Alert</h1><p>Score: <strong>${healthScore}</strong></p><p>Risk Factors: ${riskFactors.join(', ')}</p></body></html>`
        });
    }

    private mapCampaignTypeToChannel(type: string): 'email' | 'sms' | 'whatsapp' {
        const mapping = {
            'email': 'email' as const,
            'sms': 'sms' as const,
            'whatsapp': 'whatsapp' as const,
            'multi_channel': 'email' as const, // Default to email
        };
        return mapping[type] || 'email';
    }
}
