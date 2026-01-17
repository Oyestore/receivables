import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEvent } from '../entities/analytics-event.entity';

/**
 * Platform Event Types - All events from across modules
 */
export interface PlatformEvent {
    type: string;
    tenantId: string;
    timestamp: Date;
    data: any;
    metadata?: Record<string, any>;
}

/**
 * Event Ingestion Service
 * 
 * Central hub for all platform events
 * Subscribes to events from M01, M02, M03, M11
 * Stores in analytics database for real-time processing
 * 
 * @example
 * ```typescript
 * // Events are automatically captured via @OnEvent decorators
 * // No manual calls needed
 * ```
 */
@Injectable()
export class EventIngestionService implements OnModuleInit {
    private readonly logger = new Logger(EventIngestionService.name);
    private eventCount = 0;

    constructor(
        @InjectRepository(AnalyticsEvent)
        private readonly eventRepo: Repository<AnalyticsEvent>,
    ) { }

    async onModuleInit() {
        this.logger.log('Event Ingestion Service initialized - Listening for platform events');
    }

    // ==========================================
    // MODULE 01: INVOICE EVENTS
    // ==========================================

    @OnEvent('invoice.created')
    async handleInvoiceCreated(event: any) {
        await this.ingestEvent({
            type: 'invoice.created',
            tenantId: event.tenantId,
            timestamp: new Date(),
            data: {
                invoiceId: event.invoiceId,
                customerId: event.customerId,
                amount: event.amount,
                dueDate: event.dueDate,
            },
        });
    }

    @OnEvent('invoice.sent')
    async handleInvoiceSent(event: any) {
        await this.ingestEvent({
            type: 'invoice.sent',
            tenantId: event.tenantId,
            timestamp: new Date(),
            data: {
                invoiceId: event.invoiceId,
                channel: event.channel, // email, whatsapp, sms
            },
        });
    }

    @OnEvent('invoice.viewed')
    async handleInvoiceViewed(event: any) {
        await this.ingestEvent({
            type: 'invoice.viewed',
            tenantId: event.tenantId,
            timestamp: new Date(),
            data: {
                invoiceId: event.invoiceId,
                customerId: event.customerId,
                viewCount: event.viewCount,
            },
        });
    }

    @OnEvent('invoice.overdue')
    async handleInvoiceOverdue(event: any) {
        await this.ingestEvent({
            type: 'invoice.overdue',
            tenantId: event.tenantId,
            timestamp: new Date(),
            data: {
                invoiceId: event.invoiceId,
                amount: event.amount,
                daysOverdue: event.daysOverdue,
            },
        });
    }

    // ==========================================
    // MODULE 03: PAYMENT EVENTS
    // ==========================================

    @OnEvent('payment.initiated')
    async handlePaymentInitiated(event: any) {
        await this.ingestEvent({
            type: 'payment.initiated',
            tenantId: event.tenantId,
            timestamp: new Date(),
            data: {
                paymentId: event.paymentId,
                invoiceId: event.invoiceId,
                amount: event.amount,
                method: event.method,
            },
        });
    }

    @OnEvent('payment.completed')
    async handlePaymentCompleted(event: any) {
        await this.ingestEvent({
            type: 'payment.completed',
            tenantId: event.tenantId,
            timestamp: new Date(),
            data: {
                paymentId: event.paymentId,
                invoiceId: event.invoiceId,
                amount: event.amount,
                method: event.method,
                gateway: event.gateway,
            },
        });
    }

    @OnEvent('payment.failed')
    async handlePaymentFailed(event: any) {
        await this.ingestEvent({
            type: 'payment.failed',
            tenantId: event.tenantId,
            timestamp: new Date(),
            data: {
                paymentId: event.paymentId,
                invoiceId: event.invoiceId,
                amount: event.amount,
                reason: event.reason,
                gateway: event.gateway,
            },
        });
    }

    @OnEvent('refund.processed')
    async handleRefundProcessed(event: any) {
        await this.ingestEvent({
            type: 'refund.processed',
            tenantId: event.tenantId,
            timestamp: new Date(),
            data: {
                refundId: event.refundId,
                paymentId: event.paymentId,
                amount: event.amount,
                reason: event.reason,
            },
        });
    }

    // ==========================================
    // MODULE 02: DISTRIBUTION EVENTS
    // ==========================================

    @OnEvent('distribution.email.sent')
    async handleEmailSent(event: any) {
        await this.ingestEvent({
            type: 'distribution.email.sent',
            tenantId: event.tenantId,
            timestamp: new Date(),
            data: {
                messageId: event.messageId,
                invoiceId: event.invoiceId,
                recipientEmail: event.recipientEmail,
            },
        });
    }

    @OnEvent('distribution.email.opened')
    async handleEmailOpened(event: any) {
        await this.ingestEvent({
            type: 'distribution.email.opened',
            tenantId: event.tenantId,
            timestamp: new Date(),
            data: {
                messageId: event.messageId,
                invoiceId: event.invoiceId,
                openedAt: event.openedAt,
            },
        });
    }

    @OnEvent('distribution.email.bounced')
    async handleEmailBounced(event: any) {
        await this.ingestEvent({
            type: 'distribution.email.bounced',
            tenantId: event.tenantId,
            timestamp: new Date(),
            data: {
                messageId: event.messageId,
                reason: event.reason,
            },
        });
    }

    // ==========================================
    // MODULE 11: ACCOUNTING EVENTS
    // ==========================================

    @OnEvent('accounting.sync.completed')
    async handleAccountingSyncCompleted(event: any) {
        await this.ingestEvent({
            type: 'accounting.sync.completed',
            tenantId: event.tenantId,
            timestamp: new Date(),
            data: {
                system: event.system, // tally, zoho, etc
                itemsSync: event.itemsSynced,
                duration: event.duration,
            },
        });
    }

    @OnEvent('accounting.sync.failed')
    async handleAccountingSyncFailed(event: any) {
        await this.ingestEvent({
            type: 'accounting.sync.failed',
            tenantId: event.tenantId,
            timestamp: new Date(),
            data: {
                system: event.system,
                error: event.error,
            },
        });
    }

    // ==========================================
    // CORE INGESTION LOGIC
    // ==========================================

    /**
     * Main event ingestion method
     * Stores event and triggers real-time processing
     */
    private async ingestEvent(event: PlatformEvent): Promise<void> {
        try {
            // Store in database
            const analyticsEvent = this.eventRepo.create({
                tenant_id: event.tenantId,
                event_type: event.type,
                event_data: event.data,
                event_timestamp: event.timestamp,
                metadata: event.metadata,
            });

            await this.eventRepo.save(analyticsEvent);

            this.eventCount++;

            // Log every 100 events
            if (this.eventCount % 100 === 0) {
                this.logger.log(`Processed ${this.eventCount} events`);
            }

            // Trigger pattern detection (async, don't wait)
            this.triggerPatternDetection(event).catch(err =>
                this.logger.error(`Pattern detection failed: ${err.message}`)
            );

        } catch (error) {
            this.logger.error(`Failed to ingest event: ${error.message}`, error.stack);
        }
    }

    /**
     * Trigger pattern detection for immediate insights
     */
    private async triggerPatternDetection(event: PlatformEvent): Promise<void> {
        // Pattern detection happens asynchronously
        // Quick patterns that can trigger immediate insights:

        // Example: Payment failure pattern
        if (event.type === 'payment.failed') {
            const recentFailures = await this.getRecentEventCount(
                event.tenantId,
                'payment.failed',
                60 // last 60 minutes
            );

            if (recentFailures >= 5) {
                // Trigger alert: High payment failure rate
                this.logger.warn(`High payment failure rate detected for tenant ${event.tenantId}: ${recentFailures} failures in last hour`);
            }
        }

        // Example: Invoice viewing pattern
        if (event.type === 'invoice.viewed' && event.data.viewCount >= 3) {
            // Customer viewed invoice 3+ times - might need help
            this.logger.log(`Customer highly engaged with invoice ${event.data.invoiceId} - potential follow-up opportunity`);
        }
    }

    /**
     * Get count of recent events of a specific type
     */
    private async getRecentEventCount(
        tenantId: string,
        eventType: string,
        minutes: number
    ): Promise<number> {
        const since = new Date(Date.now() - minutes * 60 * 1000);

        const count = await this.eventRepo.count({
            where: {
                tenant_id: tenantId,
                event_type: eventType,
                event_timestamp: since as any, // TypeORM MoreThanOrEqual
            },
        });

        return count;
    }

    /**
     * Get events for a tenant in a time range
     */
    async getEvents(
        tenantId: string,
        startDate: Date,
        endDate: Date,
        eventTypes?: string[]
    ): Promise<AnalyticsEvent[]> {
        const query = this.eventRepo.createQueryBuilder('event')
            .where('event.tenant_id = :tenantId', { tenantId })
            .andWhere('event.event_timestamp >= :startDate', { startDate })
            .andWhere('event.event_timestamp <= :endDate', { endDate });

        if (eventTypes && eventTypes.length > 0) {
            query.andWhere('event.event_type IN (:...eventTypes)', { eventTypes });
        }

        return query.orderBy('event.event_timestamp', 'DESC').getMany();
    }

    /**
     * Get event statistics
     */
    async getEventStats(tenantId: string): Promise<{
        totalEvents: number;
        eventsByType: Record<string, number>;
        recentEvents: number;
    }> {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [totalEvents, recentEvents] = await Promise.all([
            this.eventRepo.count({ where: { tenant_id: tenantId } }),
            this.eventRepo.count({
                where: {
                    tenant_id: tenantId,
                    event_timestamp: oneDayAgo as any,
                },
            }),
        ]);

        // Get event counts by type
        const eventsByType = await this.eventRepo
            .createQueryBuilder('event')
            .select('event.event_type', 'type')
            .addSelect('COUNT(*)', 'count')
            .where('event.tenant_id = :tenantId', { tenantId })
            .groupBy('event.event_type')
            .getRawMany();

        const eventCountsMap = eventsByType.reduce((acc, item) => {
            acc[item.type] = parseInt(item.count);
            return acc;
        }, {});

        return {
            totalEvents,
            eventsByType: eventCountsMap,
            recentEvents,
        };
    }
}
