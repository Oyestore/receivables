import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { Refund } from '../entities/refund.entity';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

/**
 * Stripe Gateway Configuration
 */
interface StripeConfig {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
    apiVersion: string;
    environment: 'sandbox' | 'production';
}

/**
 * Stripe Payment Intent
 */
interface StripePaymentIntent {
    id: string;
    amount: number;
    currency: string;
    status: string;
    client_secret: string;
    customer: string;
    payment_method?: string;
}

/**
 * Stripe Gateway Service
 * 
 * Complete integration with Stripe for international payments
 * - Payment intents
 * - 3D Secure (SCA compliance)
 * - Multiple currencies
 * - Automatic payment methods
 * - Webhooks
 * - Refunds
 * - Customer management
 * 
 * @example
 * ```typescript
 * const payment = await stripeService.createPaymentIntent({
 *   amount: 10000,
 *   currency: 'USD',
 *   customerId: 'cus_123',
 *   description: 'Invoice payment',
 * });
 * ```
 */
@Injectable()
export class StripeGatewayService {
    private readonly logger = new Logger(StripeGatewayService.name);
    private stripeClient: AxiosInstance;
    private config: StripeConfig;

    constructor(
        @InjectRepository(PaymentTransaction)
        private readonly paymentRepo: Repository<PaymentTransaction>,
        @InjectRepository(Refund)
        private readonly refundRepo: Repository<Refund>,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.initializeClient();
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================

    private initializeClient(): void {
        this.config = {
            secretKey: process.env.STRIPE_SECRET_KEY,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            apiVersion: '2023-10-16',
            environment: (process.env.STRIPE_ENVIRONMENT as any) || 'sandbox',
        };

        const baseURL = this.config.environment === 'production'
            ? 'https://api.stripe.com'
            : 'https://api.stripe.com'; // Stripe uses same URL for test/live

        this.stripeClient = axios.create({
            baseURL,
            headers: {
                'Authorization': `Bearer ${this.config.secretKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Stripe-Version': this.config.apiVersion,
            },
            timeout: 30000,
        });

        this.logger.log('Stripe gateway initialized');
    }

    // ==========================================
    // PAYMENT INTENT OPERATIONS
    // ==========================================

    /**
     * Create payment intent
     * Supports 3D Secure and multiple payment methods
     */
    async createPaymentIntent(params: {
        amount: number;
        currency: string;
        customerId?: string;
        description?: string;
        metadata?: Record<string, string>;
        automatic_payment_methods?: boolean;
    }): Promise<StripePaymentIntent> {
        try {
            const payload = new URLSearchParams({
                amount: (params.amount * 100).toString(), // Convert to cents
                currency: params.currency.toLowerCase(),
                'automatic_payment_methods[enabled]': params.automatic_payment_methods !== false ? 'true' : 'false',
            });

            if (params.customerId) {
                payload.append('customer', params.customerId);
            }

            if (params.description) {
                payload.append('description', params.description);
            }

            if (params.metadata) {
                Object.entries(params.metadata).forEach(([key, value]) => {
                    payload.append(`metadata[${key}]`, value);
                });
            }

            const response = await this.stripeClient.post('/v1/payment_intents', payload);

            this.logger.log(`Payment intent created: ${response.data.id}`);

            return response.data;
        } catch (error) {
            this.logger.error(`Failed to create payment intent: ${error.message}`);
            throw error;
        }
    }

    /**
     * Retrieve payment intent
     */
    async getPaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent> {
        try {
            const response = await this.stripeClient.get(`/v1/payment_intents/${paymentIntentId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to retrieve payment intent: ${error.message}`);
            throw error;
        }
    }

    /**
     * Confirm payment intent (for manual confirmation flow)
     */
    async confirmPaymentIntent(params: {
        paymentIntentId: string;
        paymentMethod?: string;
        return_url?: string;
    }): Promise<StripePaymentIntent> {
        try {
            const payload = new URLSearchParams();

            if (params.paymentMethod) {
                payload.append('payment_method', params.paymentMethod);
            }

            if (params.return_url) {
                payload.append('return_url', params.return_url);
            }

            const response = await this.stripeClient.post(
                `/v1/payment_intents/${params.paymentIntentId}/confirm`,
                payload
            );

            return response.data;
        } catch (error) {
            this.logger.error(`Failed to confirm payment intent: ${error.message}`);
            throw error;
        }
    }

    /**
     * Cancel payment intent
     */
    async cancelPaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent> {
        try {
            const response = await this.stripeClient.post(
                `/v1/payment_intents/${paymentIntentId}/cancel`
            );

            this.logger.log(`Payment intent cancelled: ${paymentIntentId}`);

            return response.data;
        } catch (error) {
            this.logger.error(`Failed to cancel payment intent: ${error.message}`);
            throw error;
        }
    }

    // ==========================================
    // CUSTOMER OPERATIONS
    // ==========================================

    /**
     * Create Stripe customer
     */
    async createCustomer(params: {
        email: string;
        name?: string;
        phone?: string;
        metadata?: Record<string, string>;
    }): Promise<{ id: string; email: string }> {
        try {
            const payload = new URLSearchParams({
                email: params.email,
            });

            if (params.name) {
                payload.append('name', params.name);
            }

            if (params.phone) {
                payload.append('phone', params.phone);
            }

            if (params.metadata) {
                Object.entries(params.metadata).forEach(([key, value]) => {
                    payload.append(`metadata[${key}]`, value);
                });
            }

            const response = await this.stripeClient.post('/v1/customers', payload);

            this.logger.log(`Customer created: ${response.data.id}`);

            return response.data;
        } catch (error) {
            this.logger.error(`Failed to create customer: ${error.message}`);
            throw error;
        }
    }

    /**
     * Attach payment method to customer
     */
    async attachPaymentMethod(params: {
        paymentMethodId: string;
        customerId: string;
    }): Promise<void> {
        try {
            const payload = new URLSearchParams({
                customer: params.customerId,
            });

            await this.stripeClient.post(
                `/v1/payment_methods/${params.paymentMethodId}/attach`,
                payload
            );

            this.logger.log(`Payment method attached to customer: ${params.customerId}`);
        } catch (error) {
            this.logger.error(`Failed to attach payment method: ${error.message}`);
            throw error;
        }
    }

    // ==========================================
    // REFUND OPERATIONS
    // ==========================================

    /**
     * Create refund
     */
    async createRefund(params: {
        paymentIntentId: string;
        amount?: number;
        reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
        metadata?: Record<string, string>;
    }): Promise<{ id: string; status: string; amount: number }> {
        try {
            const payload = new URLSearchParams({
                payment_intent: params.paymentIntentId,
            });

            if (params.amount) {
                payload.append('amount', (params.amount * 100).toString()); // Convert to cents
            }

            if (params.reason) {
                payload.append('reason', params.reason);
            }

            if (params.metadata) {
                Object.entries(params.metadata).forEach(([key, value]) => {
                    payload.append(`metadata[${key}]`, value);
                });
            }

            const response = await this.stripeClient.post('/v1/refunds', payload);

            this.logger.log(`Refund created: ${response.data.id}`);

            return {
                id: response.data.id,
                status: response.data.status,
                amount: response.data.amount / 100, // Convert back to dollars
            };
        } catch (error) {
            this.logger.error(`Failed to create refund: ${error.message}`);
            throw error;
        }
    }

    /**
     * Retrieve refund
     */
    async getRefund(refundId: string): Promise<any> {
        try {
            const response = await this.stripeClient.get(`/v1/refunds/${refundId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to retrieve refund: ${error.message}`);
            throw error;
        }
    }

    // ==========================================
    // WEBHOOK HANDLING
    // ==========================================

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(params: {
        payload: string;
        signature: string;
    }): boolean {
        try {
            const timestamp = this.extractTimestamp(params.signature);
            const expectedSignature = this.computeSignature(timestamp, params.payload);

            return this.secureCompare(
                params.signature.split(',')[1].split('=')[1],
                expectedSignature
            );
        } catch (error) {
            this.logger.error(`Webhook signature verification failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Process Stripe webhook
     */
    async processWebhook(params: {
        event: any;
        signature: string;
        rawBody: string;
    }): Promise<void> {
        try {
            // Verify signature
            const isValid = this.verifyWebhookSignature({
                payload: params.rawBody,
                signature: params.signature,
            });

            if (!isValid) {
                throw new Error('Invalid webhook signature');
            }

            const { type, data } = params.event;

            // Handle different event types
            switch (type) {
                case 'payment_intent.succeeded':
                    await this.handlePaymentSuccess(data.object);
                    break;

                case 'payment_intent.payment_failed':
                    await this.handlePaymentFailed(data.object);
                    break;

                case 'payment_intent.canceled':
                    await this.handlePaymentCanceled(data.object);
                    break;

                case 'charge.refunded':
                    await this.handleRefundCompleted(data.object);
                    break;

                default:
                    this.logger.log(`Unhandled webhook event: ${type}`);
            }

            this.logger.log(`Webhook processed: ${type}`);
        } catch (error) {
            this.logger.error(`Webhook processing failed: ${error.message}`);
            throw error;
        }
    }

    // ==========================================
    // WEBHOOK EVENT HANDLERS
    // ==========================================

    private async handlePaymentSuccess(paymentIntent: any): Promise<void> {
        this.eventEmitter.emit('stripe.payment.success', {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            customer: paymentIntent.customer,
        });
    }

    private async handlePaymentFailed(paymentIntent: any): Promise<void> {
        this.eventEmitter.emit('stripe.payment.failed', {
            paymentIntent Id: paymentIntent.id,
            error: paymentIntent.last_payment_error,
        });
    }

    private async handlePaymentCanceled(paymentIntent: any): Promise<void> {
        this.eventEmitter.emit('stripe.payment.canceled', {
            paymentIntentId: paymentIntent.id,
        });
    }

    private async handleRefundCompleted(charge: any): Promise<void> {
        this.eventEmitter.emit('stripe.refund.completed', {
            chargeId: charge.id,
            refunds: charge.refunds.data,
        });
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    private extractTimestamp(signature: string): string {
        return signature.split(',')[0].split('=')[1];
    }

    private computeSignature(timestamp: string, payload: string): string {
        const signedPayload = `${timestamp}.${payload}`;
        return crypto
            .createHmac('sha256', this.config.webhookSecret)
            .update(signedPayload)
            .digest('hex');
    }

    private secureCompare(a: string, b: string): boolean {
        if (a.length !== b.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }

        return result === 0;
    }

    /**
     * Get supported currencies
     */
    getSupportedCurrencies(): string[] {
        return [
            'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED',
            'INR', 'JPY', 'CNY', // Asian currencies
            // Add more as needed
        ];
    }

  /**
   * Validate currency
   */
  isC urrencySupported(currency: string): boolean {
        return this.getSupportedCurrencies().includes(currency.toUpperCase());
    }
}
