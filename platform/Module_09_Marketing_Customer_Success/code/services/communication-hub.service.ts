import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Customer Communication Hub Service
 * 
 * Gap Resolution: Phase 9.2 - Missing unified communication management
 * 
 * Orchestrates all customer communications across channels (email, SMS, WhatsApp, in-app)
 * Acts as the "brain" - decides WHO, WHAT, WHEN to communicate
 * Module 11 acts as the "hands" - actually delivers messages
 */

export enum CommunicationType {
    TRANSACTIONAL = 'transactional',       // Invoice sent, payment received, etc.
    MARKETING = 'marketing',               // Campaigns, newsletters
    CUSTOMER_SUCCESS = 'customer_success', // Check-ins, health alerts
    SUPPORT = 'support',                   // Support responses
    FEEDBACK = 'feedback',                 // Surveys, NPS
    EXPANSION = 'expansion',               // Upsell/cross-sell
    RETENTION = 'retention',               // Churn prevention
}

export enum CommunicationChannel {
    EMAIL = 'email',
    SMS = 'sms',
    WHATSAPP = 'whatsapp',
    IN_APP = 'in_app',
    PUSH_NOTIFICATION = 'push_notification',
}

export enum MessagePriority {
    CRITICAL = 'critical',                 // Send immediately
    HIGH = 'high',                         // Send within 1 hour
    MEDIUM = 'medium',                     // Send within 24 hours
    LOW = 'low',                           // Can be batched/scheduled
}

export interface CommunicationPreferences {
    customerId: string;

    // Channel preferences
    preferredChannels: CommunicationChannel[];
    blockedChannels: CommunicationChannel[];

    // Type preferences
    allowedTypes: CommunicationType[];

    // Timing preferences
    doNotDisturbHours?: {
        start: string;                     // HH:MM format
        end: string;
        timezone: string;
    };

    // Frequency caps
    maxMessagesPerDay?: number;
    maxMessagesPerWeek?: number;

    // Other preferences
    language: string;
    unsubscribedFromMarketing: boolean;
}

export interface CommunicationMessage {
    id: string;
    customerId: string;
    tenantId: string;

    // Message details
    type: CommunicationType;
    priority: MessagePriority;
    subject: string;
    content: string;

    // Delivery
    channels: CommunicationChannel[];      // Preferred channels in order
    scheduledFor?: Date;                   // If scheduled
    expiresAt?: Date;                      // If time-sensitive

    // Personalization
    personalizations?: Record<string, string>;
    templateId?: string;

    // Tracking
    sentAt?: Date;
    deliveredAt?: Date;
    openedAt?: Date;
    clickedAt?: Date;

    // Status
    status: 'pending' | 'sent' | 'delivered' | 'failed' | 'expired';

    // Context
    campaignId?: string;
    workflowId?: string;
    metadata?: Record<string, any>;
}

export interface ConversationThread {
    id: string;
    customerId: string;
    subject: string;

    messages: ConversationMessage[];

    // Status
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    assignedTo?: string;

    // Metrics
    responseTime?: number;                 // Average response time in minutes
    sentimentTrend: 'improving' | 'stable' | 'declining';

    createdAt: Date;
    lastMessageAt: Date;
}

export interface ConversationMessage {
    id: string;
    sender: 'customer' | 'system' | 'agent';
    channel: CommunicationChannel;
    content: string;
    timestamp: Date;
    sentiment?: 'positive' | 'neutral' | 'negative';
}

@Injectable()
export class CommunicationHubService {
    private readonly logger = new Logger(CommunicationHubService.name);

    // In-memory storage for demo (use database in production)
    private preferences: Map<string, CommunicationPreferences> = new Map();
    private messageQueue: CommunicationMessage[] = [];

    constructor(
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Send message to customer (with intelligent routing)
     */
    async sendMessage(
        customerId: string,
        message: {
            type: CommunicationType;
            priority: MessagePriority;
            subject: string;
            content: string;
            templateId?: string;
            personalizations?: Record<string, string>;
            metadata?: Record<string, any>;
        },
    ): Promise<CommunicationMessage> {
        // Get customer preferences
        const prefs = await this.getCustomerPreferences(customerId);

        // Check if communication is allowed
        if (!this.isAllowedToSend(message.type, prefs)) {
            this.logger.warn(
                `Communication blocked for ${customerId}: ${message.type} not allowed`,
            );
            throw new Error('Customer has opted out of this communication type');
        }

        // Check frequency caps
        if (!(await this.checkFrequencyCap(customerId, prefs))) {
            this.logger.warn(`Frequency cap reached for ${customerId}`);
            throw new Error('Frequency cap exceeded');
        }

        // Determine best channel
        const channels = this.selectOptimalChannels(message.priority, prefs);

        // Create message
        const commMessage: CommunicationMessage = {
            id: this.generateId(),
            customerId,
            tenantId: 'tenant_001',
            type: message.type,
            priority: message.priority,
            subject: message.subject,
            content: message.content,
            channels,
            templateId: message.templateId,
            personalizations: message.personalizations,
            status: 'pending',
            metadata: message.metadata,
        };

        // Schedule or send immediately based on priority and DND
        if (this.shouldSchedule(message.priority, prefs)) {
            commMessage.scheduledFor = this.calculateNextAvailableTime(prefs);
            this.messageQueue.push(commMessage);
            this.logger.log(`Message scheduled for ${commMessage.scheduledFor}`);
        } else {
            await this.deliverMessage(commMessage);
        }

        return commMessage;
    }

    /**
     * Get customer communication preferences
     */
    async getCustomerPreferences(
        customerId: string,
    ): Promise<CommunicationPreferences> {
        // Check cache/database
        if (this.preferences.has(customerId)) {
            return this.preferences.get(customerId);
        }

        // Default preferences if not set
        const defaultPrefs: CommunicationPreferences = {
            customerId,
            preferredChannels: [
                CommunicationChannel.EMAIL,
                CommunicationChannel.IN_APP,
            ],
            blockedChannels: [],
            allowedTypes: Object.values(CommunicationType),
            language: 'en',
            unsubscribedFromMarketing: false,
            maxMessagesPerDay: 5,
            maxMessagesPerWeek: 15,
        };

        this.preferences.set(customerId, defaultPrefs);
        return defaultPrefs;
    }

    /**
     * Update customer communication preferences
     */
    async updateCustomerPreferences(
        customerId: string,
        updates: Partial<CommunicationPreferences>,
    ): Promise<CommunicationPreferences> {
        const current = await this.getCustomerPreferences(customerId);
        const updated = { ...current, ...updates };

        this.preferences.set(customerId, updated);

        this.logger.log(`Updated preferences for ${customerId}`);

        return updated;
    }

    /**
     * Get conversation history for customer
     */
    async getConversationHistory(
        customerId: string,
        limit: number = 50,
    ): Promise<ConversationThread[]> {
        // Mock implementation - in production, query database
        const thread: ConversationThread = {
            id: this.generateId(),
            customerId,
            subject: 'Payment Inquiry',
            messages: [
                {
                    id: this.generateId(),
                    sender: 'customer',
                    channel: CommunicationChannel.EMAIL,
                    content: 'When will my invoice be processed?',
                    timestamp: new Date(Date.now() - 3600000),
                    sentiment: 'neutral',
                },
                {
                    id: this.generateId(),
                    sender: 'agent',
                    channel: CommunicationChannel.EMAIL,
                    content: 'Your invoice is being processed and should be completed within 24 hours.',
                    timestamp: new Date(Date.now() - 1800000),
                    sentiment: 'positive',
                },
            ],
            status: 'resolved',
            responseTime: 30,
            sentimentTrend: 'stable',
            createdAt: new Date(Date.now() - 3600000),
            lastMessageAt: new Date(Date.now() - 1800000),
        };

        return [thread];
    }

    /**
     * Get communication analytics
     */
    async getCommunicationAnalytics(
        tenantId: string,
        timeframe: number = 30, // days
    ): Promise<{
        totalMessages: number;
        byChannel: Record<CommunicationChannel, number>;
        byType: Record<CommunicationType, number>;
        deliveryRate: number;
        openRate: number;
        clickRate: number;
        responseRate: number;
        avgResponseTime: number;                // minutes
    }> {
        // Mock analytics
        return {
            totalMessages: 1247,
            byChannel: {
                [CommunicationChannel.EMAIL]: 856,
                [CommunicationChannel.SMS]: 234,
                [CommunicationChannel.WHATSAPP]: 102,
                [CommunicationChannel.IN_APP]: 45,
                [CommunicationChannel.PUSH_NOTIFICATION]: 10,
            },
            byType: {
                [CommunicationType.TRANSACTIONAL]: 645,
                [CommunicationType.MARKETING]: 312,
                [CommunicationType.CUSTOMER_SUCCESS]: 156,
                [CommunicationType.SUPPORT]: 89,
                [CommunicationType.FEEDBACK]: 34,
                [CommunicationType.EXPANSION]: 11,
                [CommunicationType.RETENTION]: 0,
            },
            deliveryRate: 0.98,
            openRate: 0.42,
            clickRate: 0.18,
            responseRate: 0.34,
            avgResponseTime: 127,
        };
    }

    /**
     * Orchestrate multi-touch campaign
     */
    async orchestrateCampaign(
        campaign: {
            name: string;
            type: CommunicationType;
            audience: string[];              // Customer IDs
            steps: Array<{
                delay: number;               // milliseconds
                channel: CommunicationChannel;
                templateId: string;
                personalizations?: Record<string, string>;
            }>;
        },
    ): Promise<{
        campaignId: string;
        scheduledMessages: number;
    }> {
        const campaignId = this.generateId();

        let scheduledCount = 0;

        for (const customerId of campaign.audience) {
            let cumulativeDelay = 0;

            for (const step of campaign.steps) {
                cumulativeDelay += step.delay;

                // Schedule message
                const message: CommunicationMessage = {
                    id: this.generateId(),
                    customerId,
                    tenantId: 'tenant_001',
                    type: campaign.type,
                    priority: MessagePriority.LOW,
                    subject: `${campaign.name} - Step ${campaign.steps.indexOf(step) + 1}`,
                    content: `Content from template ${step.templateId}`,
                    channels: [step.channel],
                    scheduledFor: new Date(Date.now() + cumulativeDelay),
                    status: 'pending',
                    campaignId,
                    templateId: step.templateId,
                    personalizations: step.personalizations,
                };

                this.messageQueue.push(message);
                scheduledCount++;
            }
        }

        this.logger.log(
            `Campaign ${campaignId} orchestrated: ${scheduledCount} messages scheduled`,
        );

        return {
            campaignId,
            scheduledMessages: scheduledCount,
        };
    }

    // Private helper methods

    private async deliverMessage(message: CommunicationMessage): Promise<void> {
        // Emit event for Module 11 (Communication Service) to actually send
        this.eventEmitter.emit('communication.send', {
            messageId: message.id,
            customerId: message.customerId,
            channel: message.channels[0],    // Try primary channel first
            subject: message.subject,
            content: message.content,
            templateId: message.templateId,
            personalizations: message.personalizations,
        });

        message.status = 'sent';
        message.sentAt = new Date();

        this.logger.log(
            `Message sent via ${message.channels[0]}: ${message.id} to ${message.customerId}`,
        );
    }

    private isAllowedToSend(
        type: CommunicationType,
        prefs: CommunicationPreferences,
    ): boolean {
        // Marketing opt-out
        if (type === CommunicationType.MARKETING && prefs.unsubscribedFromMarketing) {
            return false;
        }

        // Type allowed
        if (!prefs.allowedTypes.includes(type)) {
            return false;
        }

        return true;
    }

    private async checkFrequencyCap(
        customerId: string,
        prefs: CommunicationPreferences,
    ): Promise<boolean> {
        // Mock implementation - in production, query recent messages
        return Math.random() > 0.05; // 95% pass
    }

    private selectOptimalChannels(
        priority: MessagePriority,
        prefs: CommunicationPreferences,
    ): CommunicationChannel[] {
        // For critical messages, use multiple channels
        if (priority === MessagePriority.CRITICAL) {
            return [
                CommunicationChannel.SMS,
                CommunicationChannel.EMAIL,
                CommunicationChannel.IN_APP,
            ].filter(c => !prefs.blockedChannels.includes(c));
        }

        // Otherwise use preferred channels
        return prefs.preferredChannels.filter(
            c => !prefs.blockedChannels.includes(c),
        );
    }

    private shouldSchedule(
        priority: MessagePriority,
        prefs: CommunicationPreferences,
    ): boolean {
        // Critical messages always send immediately
        if (priority === MessagePriority.CRITICAL) {
            return false;
        }

        // Check DND hours
        if (prefs.doNotDisturbHours) {
            const now = new Date();
            const hour = now.getHours();
            const dndStart = parseInt(prefs.doNotDisturbHours.start.split(':')[0]);
            const dndEnd = parseInt(prefs.doNotDisturbHours.end.split(':')[0]);

            if (hour >= dndStart || hour < dndEnd) {
                return true; // Schedule for later
            }
        }

        return false;
    }

    private calculateNextAvailableTime(
        prefs: CommunicationPreferences,
    ): Date {
        const now = new Date();

        if (prefs.doNotDisturbHours) {
            const dndEnd = parseInt(prefs.doNotDisturbHours.end.split(':')[0]);
            const nextAvailable = new Date(now);
            nextAvailable.setHours(dndEnd, 0, 0, 0);

            // If DND end is earlier than now, add a day
            if (nextAvailable <= now) {
                nextAvailable.setDate(nextAvailable.getDate() + 1);
            }

            return nextAvailable;
        }

        // Default: send in 1 hour
        return new Date(now.getTime() + 3600000);
    }

    private generateId(): string {
        return `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
