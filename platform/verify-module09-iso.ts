
import 'reflect-metadata';
import { AnalyticsIntegrationService } from './Module_09_Marketing_Customer_Success/code/services/analytics-integration.service';
import { NotificationIntegrationService } from './Module_09_Marketing_Customer_Success/code/services/notification-integration.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';

// Mock Config Service or whatever dependencies NotificationService need if we mock it
const mockNotificationService = {
    sendEmail: async (data: any) => { console.log('[MockNotificationService] sendEmail', data); return { success: true }; },
    sendSMS: async (data: any) => { console.log('[MockNotificationService] sendSMS', data); return { success: true }; },
    sendWhatsApp: async (data: any) => { console.log('[MockNotificationService] sendWhatsApp', data); return { success: true }; },
};

const mockEnhancedEmailService = {
    // mock methods if needed
};

async function run() {
    console.log('Running Isolated Verification...');

    // 1. Analytics
    const eventEmitter = new EventEmitter2();
    const analyticsService = new AnalyticsIntegrationService(eventEmitter);

    eventEmitter.on('marketing.campaign.metrics', (p) => console.log('✅ Analytics Event:', p));

    await analyticsService.trackCampaignMetrics('camp-1', { sent: 10, opened: 5, clicked: 1, converted: 0 });
    console.log('✅ Analytics Service Invoked');

    // 2. Notification
    // We are MANUALLY injecting mocks to verify the SERVICE logic (mapping etc)
    const notificationService = new NotificationIntegrationService(
        mockNotificationService as any,
        mockEnhancedEmailService as any
    );

    await notificationService.sendCampaignNotification(
        { id: 'c1', type: 'email', name: 'Intro', content: { message: 'hi' } },
        'user@example.com'
    );
    console.log('✅ Notification Service Invoked');
}

run();
