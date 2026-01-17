import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_ENDPOINTS, CONSTANTS } from '../config/constants';


// ============ PROPER TYPE DEFINITIONS ============

/**
 * Standard event data structure for Module 16 events
 */
export interface ModuleEventData {
    sessionId?: string;
    invoiceId?: string;
    paymentId?: string;
    ticketId?: string;
    referralCode?: string;
    customerId?: string;
    amount?: number;
    [key: string]: unknown; // Allow additional properties
}

/**
 * Metadata attached to events for tracking and debugging
 */
export interface EventMetadata {
    userId?: string;
    tenantId?: string;
    ipAddress?: string;
    userAgent?: string;
    correlationId?: string;
    [key: string]: unknown;
}

/**
 * Complete orchestration event structure
 */
export interface OrchestrationEvent {
    type: string;
    source: string;
    data: ModuleEventData;
    timestamp: string;
    metadata?: EventMetadata;
}

/**
 * Listener registration payload
 */
interface ListenerRegistration {
    module: string;
    events: string[];
    webhookUrl: string;
}

// ============ CONSTANTS ============

const ORCHESTRATION_BASE_URL = '/api/orchestration';
const MODULE_NAME = 'module_16_concierge';
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Module 16 event types exposed to other modules
 */
const MODULE_16_EVENT_TYPES = [
    // Session events
    'concierge.session_started',
    'concierge.session_ended',

    // Invoice events
    'concierge.invoice_viewed',
    'concierge.draft_approved',

    // Payment events
    'concierge.payment_initiated',
    'concierge.payment_completed',

    // Fraud events
    'concierge.fraud_detected',
    'concierge.fraud_verified_safe',

    // Negotiation events
    'concierge.negotiation_requested',
    'concierge.negotiation_accepted',

    // Dispute events
    'concierge.dispute_raised',

    // Referral events
    'concierge.referral_generated',
    'concierge.referral_shared',

    // Collection events (CFO side)
    'concierge.reminder_sent',
    'concierge.collection_successful',
    'concierge.invoice_overdue',
] as const;

/**
 * Production-ready Orchestration Service with full type safety
 * and resilient error handling
 *
 * @class OrchestrationService
 * @implements {OnModuleInit} - Registers listeners on startup
 */
@Injectable()
export class OrchestrationService implements OnModuleInit {
    private readonly logger = new Logger(OrchestrationService.name);
    private readonly axiosInstance: AxiosInstance;
    private readonly backendUrl: string;

    constructor(private readonly configService: ConfigService) {
        // Validate configuration at construction time
        this.backendUrl = this.getOptionalConfig('BACKEND_URL', 'http://localhost:3000');

        // Create configured axios instance
        this.axiosInstance = axios.create({
            timeout: REQUEST_TIMEOUT_MS,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Lifecycle hook - register event listeners on module initialization
     */
    async onModuleInit(): Promise<void> {
        await this.registerEventListeners();
    }

    /**
     * Get required configuration value or throw
     * @private
     */
    private getRequiredConfig(key: string): string {
        const value = this.configService.get<string>(key) || process.env[key];
        if (!value) {
            throw new Error(`Required configuration missing: ${key}`);
        }
        return value.replace(/\/$/, ''); // Remove trailing slash
    }

    /**
     * Get optional configuration value with default
     * @private
     */
    private getOptionalConfig(key: string, defaultValue: string): string {
        const value = this.configService.get<string>(key) || process.env[key];
        return (value || defaultValue).replace(/\/$/, ''); // Remove trailing slash
    }

    /**
     * Extract error message safely from unknown error type
     * @private
     */
    private getErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }
        if (error instanceof AxiosError) {
            return error.response?.data?.message || error.message || 'Network error';
        }
        if (typeof error === 'string') {
            return error;
        }
        return 'Unknown error occurred';
    }

    /**
     * Trigger event in Module 10 (Orchestration)
     * Central event hub for cross-module communication
     *
     * @param event - The orchestration event to trigger
     * @throws {Error} If event delivery fails after retries
     */
    async triggerEvent(event: OrchestrationEvent): Promise<void> {
        try {
            await this.axiosInstance.post(API_ENDPOINTS.ORCHESTRATION.EVENTS, event);
            this.logger.log(`Event triggered successfully: ${event.type}`);
        } catch (error) {
            const errorMessage = this.getErrorMessage(error);
            this.logger.error(`Failed to trigger event ${event.type}: ${errorMessage}`);
            throw new Error(`Event delivery failed: ${errorMessage}`);
        }
    }

    /**
     * Register Module 16 event listeners with Module 10
     * Called automatically on application startup (OnModuleInit)
     * Implements retry logic for resilience
     */
    async registerEventListeners(): Promise<void> {
        this.logger.log('Registering Module 16 event listeners with orchestration...');

        const registration: ListenerRegistration = {
            module: MODULE_NAME,
            events: [
                // Payment events (from Module 03)
                'payment.success',
                'payment.failed',
                'payment.refunded',

                // Dispute events (from Module 08)
                'dispute.created',
                'dispute.updated',
                'dispute.resolved',

                // Referral events (from Module 09)
                'referral.conversion',
                'referral.reward_credited',

                // Notification events (from Module 11)
                'notification.delivered',
                'notification.failed',
            ],
            webhookUrl: `${this.backendUrl}/api/concierge/webhooks/orchestration`,
        };

        // Retry logic for registration
        for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
            try {
                await this.axiosInstance.post(`${ORCHESTRATION_BASE_URL}/listeners`, registration);
                this.logger.log('Event listeners registered successfully');
                return; // Success - exit retry loop
            } catch (error) {
                const errorMessage = this.getErrorMessage(error);
                this.logger.warn(
                    `Registration attempt ${attempt}/${RETRY_ATTEMPTS} failed: ${errorMessage}`
                );

                if (attempt < RETRY_ATTEMPTS) {
                    // Exponential backoff
                    const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                    this.logger.log(`Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                } else {
                    // Final attempt failed
                    this.logger.error(
                        `Failed to register event listeners after ${RETRY_ATTEMPTS} attempts: ${errorMessage}`
                    );
                    // Don't throw - allow app to start, but log critical error
                }
            }
        }
    }

    /**
     * Get list of event types that Module 16 emits
     * Other modules can subscribe to these events
     *
     * @returns Readonly array of event type strings
     */
    getModuleEventTypes(): readonly string[] {
        // Return copy to prevent mutation
        return [...MODULE_16_EVENT_TYPES];
    }

    /**
     * Emit event with standard format and type safety
     *
     * @param eventType - Type of event to emit
     * @param data - Event payload with proper typing
     * @param metadata - Optional metadata for tracking
     */
    async emit(
        eventType: string,
        data: ModuleEventData,
        metadata?: EventMetadata
    ): Promise<void> {
        const event: OrchestrationEvent = {
            type: eventType,
            source: MODULE_NAME,
            data,
            timestamp: new Date().toISOString(),
            metadata,
        };

        await this.triggerEvent(event);
    }

    /**
     * Handle incoming orchestration webhook
     * Called when other modules trigger events we're listening to
     *
     * @param event - The incoming orchestration event
     */
    async handleWebhook(event: OrchestrationEvent): Promise<void> {
        this.logger.log(`Handling orchestration event: ${event.type}`);

        try {
            switch (event.type) {
                case 'payment.success':
                    await this.handlePaymentSuccess(event.data);
                    break;

                case 'payment.failed':
                    await this.handlePaymentFailed(event.data);
                    break;

                case 'dispute.resolved':
                    await this.handleDisputeResolved(event.data);
                    break;

                case 'referral.conversion':
                    await this.handleReferralConversion(event.data);
                    break;

                case 'referral.reward_credited':
                    await this.handleRewardCredited(event.data);
                    break;

                default:
                    this.logger.warn(`Unhandled event type: ${event.type}`);
            }
        } catch (error) {
            const errorMessage = this.getErrorMessage(error);
            this.logger.error(`Error handling webhook for ${event.type}: ${errorMessage}`);
            // Don't rethrow - log error but don't fail webhook processing
        }
    }

    /**
     * Event handlers for incoming webhooks
     * Note: These currently delegate to other integration services
     * Consider removing if truly no logic needed here
     * @private
     */
    private async handlePaymentSuccess(data: ModuleEventData): Promise<void> {
        this.logger.log(`Payment success event received: ${data.paymentId}`);
        // Delegated to PaymentIntegrationService
        // Consider injecting PaymentIntegrationService if logic needed here
    }

    private async handlePaymentFailed(data: ModuleEventData): Promise<void> {
        this.logger.log(`Payment failed event received: ${data.paymentId}`);
        // Delegated to PaymentIntegrationService
    }

    private async handleDisputeResolved(data: ModuleEventData): Promise<void> {
        this.logger.log(`Dispute resolved event received: ${data.ticketId}`);
        // Delegated to DisputeIntegrationService
    }

    private async handleReferralConversion(data: ModuleEventData): Promise<void> {
        this.logger.log(`Referral conversion event received: ${data.referralCode}`);
        // Delegated to ReferralIntegrationService
    }

    private async handleRewardCredited(data: ModuleEventData): Promise<void> {
        this.logger.log(`Reward credited event received: ${data.rewardAmount}`);
        // Delegated to ReferralIntegrationService
    }

    /**
     * Sleep utility for retry delays
     * @private
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
