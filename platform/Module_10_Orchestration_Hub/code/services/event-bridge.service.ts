/**
 * Event Bridge Service
 * 
 * Real-time event routing and distribution across all 9 platform modules
 * Implements publish-subscribe pattern for loose coupling
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ModuleName, IModuleEvent } from '../types/orchestration.types';
import { IntegrationGatewayService } from './integration-gateway.service';

interface EventSubscription {
    module: ModuleName;
    eventTypes: string[];
    callback?: (event: IModuleEvent) => Promise<void>;
}

@Injectable()
export class EventBridgeService implements OnModuleInit {
    private readonly logger = new Logger(EventBridgeService.name);
    private readonly subscriptions: Map<string, EventSubscription[]> = new Map();
    private eventCount = 0;

    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly integrationGateway?: IntegrationGatewayService
    ) { }

    onModuleInit() {
        this.logger.log('Event Bridge Service initialized');
        this.setupDefaultSubscriptions();
    }

    // ============================================================================
    // Event Publishing
    // ============================================================================

    /**
     * Publish event to all subscribers
     */
    async publishEvent(event: IModuleEvent): Promise<void> {
        this.eventCount++;
        const eventId = event.event_id || `evt-${Date.now()}-${this.eventCount}`;

        this.logger.log(
            `Publishing event: ${event.event_type} from ${event.source_module} (ID: ${eventId})`
        );

        // Add event ID if not present
        const fullEvent: IModuleEvent = {
            ...event,
            event_id: eventId,
            timestamp: event.timestamp || new Date(),
        };

        // Emit event locally (for orchestration module handlers)
        this.eventEmitter.emit(event.event_type, fullEvent);

        // Distribute to subscribed modules via Integration Gateway
        await this.distributeToModules(fullEvent);
    }

    /**
     * Publish multiple events in batch
     */
    async publishBatch(events: IModuleEvent[]): Promise<void> {
        this.logger.log(`Publishing batch of ${events.length} events`);

        await Promise.all(events.map(event => this.publishEvent(event)));
    }

    // ============================================================================
    // Event Subscription Management
    // ============================================================================

    /**
     * Subscribe module to specific event types
     */
    subscribeModule(module: ModuleName, eventTypes: string[]): void {
        for (const eventType of eventTypes) {
            let subs = this.subscriptions.get(eventType);
            if (!subs) {
                subs = [];
                this.subscriptions.set(eventType, subs);
            }

            // Check if already subscribed
            const existing = subs.find(s => s.module === module);
            if (!existing) {
                subs.push({ module, eventTypes: [eventType] });
                this.logger.log(`Module ${module} subscribed to event: ${eventType}`);
            }
        }
    }

    /**
     * Unsubscribe module from event types
     */
    unsubscribeModule(module: ModuleName, eventTypes: string[]): void {
        for (const eventType of eventTypes) {
            const subs = this.subscriptions.get(eventType);
            if (subs) {
                const index = subs.findIndex(s => s.module === module);
                if (index !== -1) {
                    subs.splice(index, 1);
                    this.logger.log(`Module ${module} unsubscribed from event: ${eventType}`);
                }
            }
        }
    }

    // ============================================================================
    // Event Distribution
    // ============================================================================

    /**
     * Distribute event to subscribed modules
     */
    private async distributeToModules(event: IModuleEvent): Promise<void> {
        const subscribers = this.subscriptions.get(event.event_type) || [];

        if (subscribers.length === 0) {
            this.logger.debug(`No subscribers for event: ${event.event_type}`);
            return;
        }

        this.logger.log(
            `Distributing event ${event.event_type} to ${subscribers.length} subscribers`
        );

        // Distribute to all subscribers in parallel (best effort)
        await Promise.allSettled(
            subscribers.map(async (subscription) => {
                try {
                    // Skip source module
                    if (subscription.module === event.source_module) {
                        return;
                    }

                    // Use integration gateway if available
                    if (this.integrationGateway) {
                        await this.integrationGateway.executeModuleAction(
                            subscription.module,
                            'handleEvent',
                            { event },
                            event.tenant_id
                        );
                    }

                    // Or use custom callback if provided
                    else if (subscription.callback) {
                        await subscription.callback(event);
                    }
                } catch (error) {
                    this.logger.warn(
                        `Failed to deliver event to module ${subscription.module}`,
                        error
                    );
                }
            })
        );
    }

    // ============================================================================
    // Default Event Subscriptions
    // ============================================================================

    /**
     * Set up default subscriptions for common event patterns
     */
    private setupDefaultSubscriptions(): void {
        // Invoice events
        this.subscribeModule(ModuleName.PAYMENT_INTEGRATION, [
            'invoice.created',
            'invoice.sent',
            'invoice.overdue',
        ]);
        this.subscribeModule(ModuleName.CUSTOMER_COMMUNICATION, [
            'invoice.created',
            'invoice.sent',
            'invoice.overdue',
        ]);
        this.subscribeModule(ModuleName.ANALYTICS_REPORTING, [
            'invoice.created',
            'invoice.paid',
            'invoice.cancelled',
        ]);

        // Payment events
        this.subscribeModule(ModuleName.INVOICE_MANAGEMENT, [
            'payment.received',
            'payment.failed',
        ]);
        this.subscribeModule(ModuleName.ANALYTICS_REPORTING, [
            'payment.received',
            'payment.failed',
        ]);
        this.subscribeModule(ModuleName.MARKETING_CUSTOMER_SUCCESS, [
            'payment.received',
            'payment.failed',
        ]);

        // Customer events
        this.subscribeModule(ModuleName.CREDIT_SCORING, [
            'customer.created',
            'customer.updated',
        ]);
        this.subscribeModule(ModuleName.MARKETING_CUSTOMER_SUCCESS, [
            'customer.created',
            'customer.updated',
        ]);

        // Credit events
        this.subscribeModule(ModuleName.FINANCING_FACTORING, [
            'credit.score_updated',
            'credit.limit_changed',
        ]);
        this.subscribeModule(ModuleName.INVOICE_MANAGEMENT, [
            'credit.limit_exceeded',
        ]);

        this.logger.log('Default event subscriptions configured');
    }

    // ============================================================================
    // Event Handlers (Orchestration Module Internal)
    // ============================================================================

    /**
     * Handle invoice overdue events
     */
    @OnEvent('invoice.overdue')
    async handleInvoiceOverdue(event: IModuleEvent): Promise<void> {
        this.logger.log(`Processing invoice.overdue event: ${event.event_id}`);

        // Could trigger auto-orchestration workflow here
        // For example, start overdue invoice follow-up workflow
    }

    /**
     * Handle payment received events
     */
    @OnEvent('payment.received')
    async handlePaymentReceived(event: IModuleEvent): Promise<void> {
        this.logger.log(`Processing payment.received event: ${event.event_id}`);

        // Could signal running workflows about payment
    }

    /**
     * Handle critical credit events
     */
    @OnEvent('credit.limit_exceeded')
    async handleCreditLimitExceeded(event: IModuleEvent): Promise<void> {
        this.logger.log(`Processing credit.limit_exceeded event: ${event.event_id}`);

        // Could trigger alerts or workflow escalations
    }

    // ============================================================================
    // Statistics and Monitoring
    // ============================================================================

    /**
     * Get event bridge statistics
     */
    getStatistics(): {
        total_events_published: number;
        active_subscriptions: number;
        subscriptions_by_event: Record<string, number>;
    } {
        const subscriptionsByEvent: Record<string, number> = {};

        for (const [eventType, subs] of this.subscriptions.entries()) {
            subscriptionsByEvent[eventType] = subs.length;
        }

        return {
            total_events_published: this.eventCount,
            active_subscriptions: Array.from(this.subscriptions.values()).reduce(
                (sum, subs) => sum + subs.length,
                0
            ),
            subscriptions_by_event: subscriptionsByEvent,
        };
    }

    /**
     * Get all subscriptions for a module
     */
    getModuleSubscriptions(module: ModuleName): string[] {
        const eventTypes: string[] = [];

        for (const [eventType, subs] of this.subscriptions.entries()) {
            if (subs.some(s => s.module === module)) {
                eventTypes.push(eventType);
            }
        }

        return eventTypes;
    }

    /**
     * Clear all subscriptions (for testing)
     */
    clearSubscriptions(): void {
        this.subscriptions.clear();
        this.logger.log('All event subscriptions cleared');
    }
}
