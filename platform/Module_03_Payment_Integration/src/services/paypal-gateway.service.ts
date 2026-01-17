import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { Refund } from '../entities/refund.entity';
import axios, { AxiosInstance } from 'axios';

/**
 * PayPal Gateway Configuration
 */
interface PayPalConfig {
    clientId: string;
    clientSecret: string;
    webhookId: string;
    environment: 'sandbox' | 'production';
}

/**
 * PayPal Order
 */
interface PayPalOrder {
    id: string;
    status: string;
    intent: string;
    purchase_units: Array<{
        amount: {
            currency_code: string;
            value: string;
        };
    }>;
    links: Array<{
        href: string;
        rel: string;
        method: string;
    }>;
}

/**
 * PayPal Gateway Service
 * 
 * Complete integration with PayPal for international payments
 * - Orders API v2
 * - OAuth 2.0 authentication
 * - Multi-currency support
 * - Webhooks
 * - Refunds
 * - Buyer protection
 * 
 * @example
 * ```typescript
 * const order = await paypalService.createOrder({
 *   amount: 100.00,
 *   currency: 'USD',
 *   description: 'Invoice payment',
 *   return_url: 'https://yoursite.com/success',
 *   cancel_url: 'https://yoursite.com/cancel',
 * });
 * ```
 */
@Injectable()
export class PayPalGatewayService {
    private readonly logger = new Logger(PayPalGatewayService.name);
    private paypalClient: AxiosInstance;
    private config: PayPalConfig;
    private accessToken: string;
    private tokenExpiresAt: number;

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
            clientId: process.env.PAYPAL_CLIENT_ID,
            clientSecret: process.env.PAYPAL_CLIENT_SECRET,
            webhookId: process.env.PAYPAL_WEBHOOK_ID,
            environment: (process.env.PAYPAL_ENVIRONMENT as any) || 'sandbox',
        };

        const baseURL = this.config.environment === 'production'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        this.paypalClient = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });

        this.logger.log('PayPal gateway initialized');
    }

    // ==========================================
    // AUTHENTICATION
    // ==========================================

    /**
     * Get OAuth 2.0 access token
     */
    private async getAccessToken(): Promise<string> {
        // Return cached token if still valid
        if (this.accessToken && Date.now() < this.tokenExpiresAt) {
            return this.accessToken;
        }

        try {
            const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

            const response = await axios.post(
                `${this.paypalClient.defaults.baseURL}/v1/oauth2/token`,
                'grant_type=client_credentials',
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            this.accessToken = response.data.access_token;
            this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min early

            this.logger.log('Access token obtained');

            return this.accessToken;
        } catch (error) {
            this.logger.error(`Failed to get access token: ${error.message}`);
            throw error;
        }
    }

    /**
     * Make authenticated API request
     */
    private async makeAuthenticatedRequest(
        method: string,
        path: string,
        data?: any
    ): Promise<any> {
        const token = await this.getAccessToken();

        const response = await this.paypalClient.request({
            method,
            url: path,
            data,
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        return response.data;
    }

    // ==========================================
    // ORDER OPERATIONS
    // ==========================================

    /**
     * Create PayPal order
     */
    async createOrder(params: {
        amount: number;
        currency: string;
        description?: string;
        return_url?: string;
        cancel_url?: string;
        metadata?: Record<string, string>;
    }): Promise<PayPalOrder> {
        try {
            const orderData = {
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        amount: {
                            currency_code: params.currency.toUpperCase(),
                            value: params.amount.toFixed(2),
                        },
                        description: params.description || 'Payment',
                        custom_id: params.metadata?.invoice_id,
                    },
                ],
                application_context: {
                    return_url: params.return_url || `${process.env.APP_BASE_URL}/payment/success`,
                    cancel_url: params.cancel_url || `${process.env.APP_BASE_URL}/payment/cancel`,
                    brand_name: 'SME Platform',
                    landing_page: 'BILLING',
                    user_action: 'PAY_NOW',
                },
            };

            const order = await this.makeAuthenticatedRequest('POST', '/v2/checkout/orders', orderData);

            this.logger.log(`Order created: ${order.id}`);

            return order;
        } catch (error) {
            this.logger.error(`Failed to create order: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get order details
     */
    async getOrder(orderId: string): Promise<PayPalOrder> {
        try {
            const order = await this.makeAuthenticatedRequest('GET', `/v2/checkout/orders/${orderId}`);
            return order;
        } catch (error) {
            this.logger.error(`Failed to get order: ${error.message}`);
            throw error;
        }
    }

    /**
     * Capture order payment
     */
    async captureOrder(orderId: string): Promise<{
        id: string;
        status: string;
        purchase_units: any[];
    }> {
        try {
            const result = await this.makeAuthenticatedRequest(
                'POST',
                `/v2/checkout/orders/${orderId}/capture`
            );

            this.logger.log(`Order captured: ${orderId}`);

            return result;
        } catch (error) {
            this.logger.error(`Failed to capture order: ${error.message}`);
            throw error;
        }
    }

    /**
     * Authorize order (for later capture)
     */
    async authorizeOrder(orderId: string): Promise<any> {
        try {
            const result = await this.makeAuthenticatedRequest(
                'POST',
                `/v2/checkout/orders/${orderId}/authorize`
            );

            this.logger.log(`Order authorized: ${orderId}`);

            return result;
        } catch (error) {
            this.logger.error(`Failed to authorize order: ${error.message}`);
            throw error;
        }
    }

    // ==========================================
    // PAYMENT CAPTURE
    // ==========================================

    /**
     * Capture authorized payment
     */
    async captureAuthorization(authorizationId: string, params?: {
        amount?: {
            value: string;
            currency_code: string;
        };
        invoice_id?: string;
        note_to_payer?: string;
    }): Promise<any> {
        try {
            const captureData = params || {};

            const result = await this.makeAuthenticatedRequest(
                'POST',
                `/v2/payments/authorizations/${authorizationId}/capture`,
                captureData
            );

            this.logger.log(`Authorization captured: ${authorizationId}`);

            return result;
        } catch (error) {
            this.logger.error(`Failed to capture authorization: ${error.message}`);
            throw error;
        }
    }

    /**
     * Void authorization
     */
    async voidAuthorization(authorizationId: string): Promise<void> {
        try {
            await this.makeAuthenticatedRequest(
                'POST',
                `/v2/payments/authorizations/${authorizationId}/void`
            );

            this.logger.log(`Authorization voided: ${authorizationId}`);
        } catch (error) {
            this.logger.error(`Failed to void authorization: ${error.message}`);
            throw error;
        }
    }

    // ==========================================
    // REFUND OPERATIONS
    // ==========================================

    /**
     * Refund captured payment
     */
    async refundCapture(captureId: string, params?: {
        amount?: {
            value: string;
            currency_code: string;
        };
        invoice_id?: string;
        note_to_payer?: string;
    }): Promise<{
        id: string;
        status: string;
        amount: any;
    }> {
        try {
            const refundData = params || {};

            const result = await this.makeAuthenticatedRequest(
                'POST',
                `/v2/payments/captures/${captureId}/refund`,
                refundData
            );

            this.logger.log(`Refund created: ${result.id}`);

            return result;
        } catch (error) {
            this.logger.error(`Failed to create refund: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get refund details
     */
    async getRefund(refundId: string): Promise<any> {
        try {
            const refund = await this.makeAuthenticatedRequest('GET', `/v2/payments/refunds/${refundId}`);
            return refund;
        } catch (error) {
            this.logger.error(`Failed to get refund: ${error.message}`);
            throw error;
        }
    }

    // ==========================================
    // WEBHOOK OPERATIONS
    // ==========================================

    /**
     * Verify webhook signature
     */
    async verifyWebhookSignature(params: {
        headers: Record<string, string>;
        body: any;
    }): Promise<boolean> {
        try {
            const verificationData = {
                auth_algo: params.headers['paypal-auth-algo'],
                cert_url: params.headers['paypal-cert-url'],
                transmission_id: params.headers['paypal-transmission-id'],
                transmission_sig: params.headers['paypal-transmission-sig'],
                transmission_time: params.headers['paypal-transmission-time'],
                webhook_id: this.config.webhookId,
                webhook_event: params.body,
            };

            const result = await this.makeAuthenticatedRequest(
                'POST',
                '/v1/notifications/verify-webhook-signature',
                verificationData
            );

            return result.verification_status === 'SUCCESS';
        } catch (error) {
            this.logger.error(`Webhook verification failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Process PayPal webhook
     */
    async processWebhook(params: {
        headers: Record<string, string>;
        body: any;
    }): Promise<void> {
        try {
            // Verify signature
            const isValid = await this.verifyWebhookSignature(params);

            if (!isValid) {
                throw new Error('Invalid webhook signature');
            }

            const { event_type, resource } = params.body;

            // Handle different event types
            switch (event_type) {
                case 'CHECKOUT.ORDER.APPROVED':
                    await this.handleOrderApproved(resource);
                    break;

                case 'PAYMENT.CAPTURE.COMPLETED':
                    await this.handleCaptureCompleted(resource);
                    break;

                case 'PAYMENT.CAPTURE.DENIED':
                    await this.handleCaptureDenied(resource);
                    break;

                case 'PAYMENT.CAPTURE.REFUNDED':
                    await this.handleCaptureRefunded(resource);
                    break;

                default:
                    this.logger.log(`Unhandled webhook event: ${event_type}`);
            }

            this.logger.log(`Webhook processed: ${event_type}`);
        } catch (error) {
            this.logger.error(`Webhook processing failed: ${error.message}`);
            throw error;
        }
    }

    // ==========================================
    // WEBHOOK EVENT HANDLERS
    // ==========================================

    private async handleOrderApproved(order: any): Promise<void> {
        this.eventEmitter.emit('paypal.order.approved', {
            orderId: order.id,
            payer: order.payer,
        });
    }

    private async handleCaptureCompleted(capture: any): Promise<void> {
        this.eventEmitter.emit('paypal.capture.completed', {
            captureId: capture.id,
            amount: capture.amount,
            status: capture.status,
        });
    }

    private async handleCaptureDenied(capture: any): Promise<void> {
        this.eventEmitter.emit('paypal.capture.denied', {
            captureId: capture.id,
            status: capture.status,
        });
    }

    private async handleCaptureRefunded(refund: any): Promise<void> {
        this.eventEmitter.emit('paypal.refund.completed', {
            refundId: refund.id,
            amount: refund.amount,
        });
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    /**
     * Get supported currencies
     */
    getSupportedCurrencies(): string[] {
        return [
            'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'INR',
            'SGD', 'HKD', 'NZD', 'CHF', 'SEK', 'DKK', 'NOK',
            'MXN', 'BRL', 'ARS', 'CLP', 'COP', 'PEN',
            // Add more as needed
        ];
    }

    /**
     * Validate currency
     */
    isCurrencySupported(currency: string): boolean {
        return this.getSupportedCurrencies().includes(currency.toUpperCase());
    }

    /**
     * Get approval URL from order
     */
    getApprovalUrl(order: PayPalOrder): string | null {
        const approveLink = order.links?.find(link => link.rel === 'approve');
        return approveLink?.href || null;
    }

    /**
     * Format amount for PayPal (2 decimal places)
     */
    formatAmount(amount: number): string {
        return amount.toFixed(2);
    }
}
