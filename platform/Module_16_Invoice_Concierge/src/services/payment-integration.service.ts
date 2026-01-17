import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';
import axios from 'axios';

interface RazorpayPaymentEvent {
    entity: string;
    account_id: string;
    event: string;
    contains: string[];
    payload: {
        payment: {
            entity: {
                id: string;
                order_id: string;
                amount: number;
                currency: string;
                status: string;
                method: string;
                captured: boolean;
                email: string;
                contact: string;
                created_at: number;
            };
        };
    };
}

type PaymentEntity = RazorpayPaymentEvent['payload']['payment']['entity'];

@Injectable()
export class PaymentIntegrationService {
    private readonly logger = new Logger(PaymentIntegrationService.name);

    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
    ) { }

    /**
     * Verify Razorpay webhook signature for security
     * CRITICAL: Prevents fraud from fake webhooks
     */
    private verifyWebhookSignature(rawBody: string, signature: string): boolean {
        const crypto = require('crypto');
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!webhookSecret) {
            this.logger.error('RAZORPAY_WEBHOOK_SECRET not configured!');
            throw new Error('Webhook secret missing');
        }

        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    /**
     * Handle Razorpay payment webhook
     * Integrates with Module 03 (Payment Processing)
     * @security Verifies webhook signature before processing
     */
    async handlePaymentWebhook(
        event: RazorpayPaymentEvent,
        rawBody: string,
        signature: string
    ): Promise<void> {
        // SECURITY: Verify webhook signature first
        if (!this.verifyWebhookSignature(rawBody, signature)) {
            this.logger.error('Invalid webhook signature - potential fraud attempt!');
            throw new Error('Invalid webhook signature');
        }

        this.logger.log(`Processing verified Razorpay webhook: ${event.event}`);

        try {
            const paymentEntity = event.payload.payment.entity;

            switch (event.event) {
                case 'payment.captured':
                    await this.handlePaymentSuccess(paymentEntity);
                    break;

                case 'payment.failed':
                    await this.handlePaymentFailure(paymentEntity);
                    break;

                case 'payment.refunded':
                    await this.handlePaymentRefund(paymentEntity);
                    break;

                default:
                    this.logger.warn(`Unhandled payment event: ${event.event}`);
            }
        } catch (error) {
            this.logger.error(`Payment webhook processing failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handle successful payment
     * Triggers: Module 10 (Orchestration), Module 11 (Notifications)
     */
    private async handlePaymentSuccess(payment: PaymentEntity): Promise<void> {
        this.logger.log(`Payment successful: ${payment.id}`);

        // 1. Find session
        const session = await this.findSessionByOrderId(payment.order_id);
        if (!session) {
            this.logger.warn(`Session not found for order: ${payment.order_id}`);
            return;
        }

        // IDEMPOTENCY: Check if payment already processed
        if (session.metadata?.paymentId === payment.id &&
            session.metadata?.paymentStatus === 'captured') {
            this.logger.log(`Payment ${payment.id} already processed - skipping duplicate`);
            return;
        }

        // 2. Update session with payment status
        session.metadata = {
            ...(session.metadata || {}), // Safe spread
            paymentId: payment.id,
            paymentStatus: 'captured',
            paidAmount: payment.amount / 100, // Convert paise to rupees
            paymentMethod: payment.method,
            paidAt: new Date(payment.created_at * 1000),
        };

        await this.sessionRepo.save(session);

        // 2. Trigger orchestration event (Module 10)
        await this.triggerOrchestrationEvent('payment_success', {
            sessionId: session?.id,
            paymentId: payment.id,
            amount: payment.amount / 100,
            method: payment.method,
            email: payment.email,
            contact: payment.contact,
        });

        // 3. Send payment confirmation notification (Module 11)
        await this.sendPaymentConfirmation(payment);

        // 4. Update payment record in Module 03
        await this.updatePaymentRecord(payment);
    }

    /**
     * Handle payment failure
     */
    private async handlePaymentFailure(payment: PaymentEntity & { error_description?: string }): Promise<void> {
        this.logger.warn(`Payment failed: ${payment.id}`);

        const session = await this.findSessionByOrderId(payment.order_id);
        if (session) {
            session.metadata = {
                ...session.metadata,
                paymentStatus: 'failed',
                failureReason: payment.error_description || 'Unknown error',
            };
            await this.sessionRepo.save(session);
        }

        // Trigger orchestration event
        await this.triggerOrchestrationEvent('payment_failed', {
            sessionId: session?.id,
            paymentId: payment.id,
            reason: payment.error_description,
        });

        // Send failure notification
        await this.sendPaymentFailureNotification(payment);
    }

    /**
     * Handle payment refund
     */
    private async handlePaymentRefund(payment: PaymentEntity): Promise<void> {
        this.logger.log(`Payment refunded: ${payment.id}`);

        const session = await this.findSessionByOrderId(payment.order_id);
        if (session) {
            session.metadata = {
                ...session.metadata,
                paymentStatus: 'refunded',
                refundedAt: new Date(),
            };
            await this.sessionRepo.save(session);
        }

        // Trigger orchestration event
        await this.triggerOrchestrationEvent('payment_refunded', {
            sessionId: session?.id,
            paymentId: payment.id,
            amount: payment.amount / 100,
        });
    }

    /**
     * Find session by Razorpay order ID
     * PERFORMANCE: Uses optimized database query instead of full table scan
     */
    private async findSessionByOrderId(orderId: string): Promise<ChatSession | null> {
        try {
            // Use database query with WHERE clause - 1000x faster than loading all sessions
            const session = await this.sessionRepo
                .createQueryBuilder('session')
                .where("session.metadata->>'razorpayOrderId' = :orderId", { orderId })
                .getOne();

            return session || null;
        } catch (error) {
            this.logger.error(`Error finding session by order ID: ${this.getErrorMessage(error)}`);
            return null;
        }
    }

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
     * Trigger Module 10 (Orchestration) event
     * Sends payment lifecycle events to the orchestration hub for cross-module coordination
     * 
     * @param eventType - Type of event (payment_success, payment_failed, payment_refunded)
     * @param data - Event payload containing payment details
     * @private
     */
    private async triggerOrchestrationEvent(eventType: string, data: Record<string, unknown>): Promise<void> {
        try {
            // Integrate with Module 10 orchestration service
            await axios.post('/api/orchestration/events', {
                type: eventType,
                source: 'module_16_concierge',
                data,
                timestamp: new Date().toISOString(),
            });

            this.logger.log(`Orchestration event triggered: ${eventType}`);
        } catch (error) {
            this.logger.error(`Failed to trigger orchestration event: ${this.getErrorMessage(error)}`);
        }
    }

    /**
     * Send payment confirmation via Module 11 (Notifications)
     */
    private async sendPaymentConfirmation(payment: PaymentEntity): Promise<void> {
        try {
            // WhatsApp notification
            await axios.post('/api/notifications/whatsapp', {
                to: payment.contact,
                template: 'payment_success',
                variables: {
                    amount: `₹${(payment.amount / 100).toLocaleString('en-IN')}`,
                    paymentId: payment.id,
                    method: payment.method.toUpperCase(),
                },
            });

            // Email confirmation
            await axios.post('/api/notifications/email', {
                to: payment.email,
                subject: 'Payment Successful - Receipt Attached',
                template: 'payment_receipt',
                variables: {
                    amount: payment.amount / 100,
                    paymentId: payment.id,
                    method: payment.method,
                },
            });

            this.logger.log(`Payment confirmations sent for: ${payment.id}`);
        } catch (error) {
            this.logger.error(`Failed to send payment confirmation: ${error.message}`);
        }
    }

    /**
     * Send payment failure notification
     */
    private async sendPaymentFailureNotification(payment: PaymentEntity): Promise<void> {
        try {
            await axios.post('/api/notifications/sms', {
                to: payment.contact,
                message: `Payment failed for order ${payment.order_id}. Please try again or contact support.`,
            });

            this.logger.log(`Payment failure notification sent for: ${payment.id}`);
        } catch (error) {
            this.logger.error(`Failed to send failure notification: ${error.message}`);
        }
    }

    /**
     * Update payment record in Module 03 (Payment Service)
     * Synchronizes payment status across modules for consistency
     * 
     * @param payment - Razorpay payment entity with status and metadata
     * @private
     */
    private async updatePaymentRecord(payment: PaymentEntity): Promise<void> {
        try {
            // Integrate with Module 03 payment service for record synchronization
            await axios.patch(`/api/payments/${payment.id}`, {
                status: 'captured',
                capturedAt: new Date(payment.created_at * 1000),
                method: payment.method,
            });

            this.logger.log(`Payment record updated in Module 03: ${payment.id}`);
        } catch (error) {
            this.logger.error(`Failed to update payment record: ${this.getErrorMessage(error)}`);
        }
    }
}
