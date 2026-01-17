"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationHubService = void 0;
const payment_orchestration_enum_1 = require("../../shared/enums/payment-orchestration.enum");
const integration_hub_entity_1 = require("../entities/integration-hub.entity");
const logger_util_1 = require("../../shared/utils/logger.util");
/**
 * Integration Hub Service
 * Comprehensive service for managing gateway integrations, webhooks, and data synchronization
 */
class IntegrationHubService {
    constructor() {
        this.gatewayConnectors = new Map();
        this.webhookEvents = new Map();
        this.dataSynchronizations = new Map();
        this.webhookProcessingQueue = [];
        this.syncProcessingQueue = [];
        this.logger = new logger_util_1.Logger('IntegrationHubService');
        this.initializeDefaultConnectors();
        this.startWebhookProcessor();
        this.startSyncProcessor();
        this.startHealthCheckScheduler();
    }
    /**
     * Initialize default gateway connectors
     */
    initializeDefaultConnectors() {
        const defaultConnectors = [
            {
                gateway: payment_orchestration_enum_1.PaymentGateway.RAZORPAY,
                name: 'Razorpay Connector',
                description: 'Official Razorpay payment gateway connector',
                configuration: {
                    apiKey: 'rzp_test_key',
                    secretKey: 'rzp_test_secret',
                    webhookSecret: 'rzp_webhook_secret',
                    baseUrl: 'https://api.razorpay.com/v1',
                    version: '1.0',
                    environment: 'sandbox',
                    timeout: 30000,
                    retryAttempts: 3
                },
                supportedMethods: [
                    payment_orchestration_enum_1.PaymentMethod.CREDIT_CARD,
                    payment_orchestration_enum_1.PaymentMethod.DEBIT_CARD,
                    payment_orchestration_enum_1.PaymentMethod.UPI,
                    payment_orchestration_enum_1.PaymentMethod.NET_BANKING,
                    payment_orchestration_enum_1.PaymentMethod.WALLET
                ],
                supportedCurrencies: ['INR'],
                supportedCountries: ['IN'],
                features: {
                    refunds: true,
                    partialRefunds: true,
                    webhooks: true,
                    recurringPayments: true,
                    tokenization: true,
                    3: dsAuthentication, true: ,
                    fraudDetection: true
                },
                limits: {
                    minAmount: 100,
                    maxAmount: 1000000,
                    dailyLimit: 10000000,
                    monthlyLimit: 100000000
                },
                fees: {
                    processingFee: 2.0,
                    fixedFee: 0,
                    internationalFee: 3.0,
                    refundFee: 0
                }
            },
            {
                gateway: payment_orchestration_enum_1.PaymentGateway.PAYU,
                name: 'PayU Connector',
                description: 'Official PayU payment gateway connector',
                configuration: {
                    apiKey: 'payu_test_key',
                    secretKey: 'payu_test_secret',
                    webhookSecret: 'payu_webhook_secret',
                    baseUrl: 'https://test.payu.in/merchant/postservice',
                    version: '7.0',
                    environment: 'sandbox',
                    timeout: 30000,
                    retryAttempts: 3
                },
                supportedMethods: [
                    payment_orchestration_enum_1.PaymentMethod.CREDIT_CARD,
                    payment_orchestration_enum_1.PaymentMethod.DEBIT_CARD,
                    payment_orchestration_enum_1.PaymentMethod.NET_BANKING,
                    payment_orchestration_enum_1.PaymentMethod.WALLET,
                    payment_orchestration_enum_1.PaymentMethod.EMI
                ],
                supportedCurrencies: ['INR'],
                supportedCountries: ['IN'],
                features: {
                    refunds: true,
                    partialRefunds: false,
                    webhooks: true,
                    recurringPayments: false,
                    tokenization: true,
                    3: dsAuthentication, true: ,
                    fraudDetection: false
                },
                limits: {
                    minAmount: 100,
                    maxAmount: 500000,
                    dailyLimit: 5000000,
                    monthlyLimit: 50000000
                },
                fees: {
                    processingFee: 2.5,
                    fixedFee: 0,
                    internationalFee: 3.5,
                    refundFee: 0
                }
            },
            {
                gateway: payment_orchestration_enum_1.PaymentGateway.PHONEPE,
                name: 'PhonePe Connector',
                description: 'Official PhonePe payment gateway connector',
                configuration: {
                    apiKey: 'phonepe_test_key',
                    secretKey: 'phonepe_test_secret',
                    webhookSecret: 'phonepe_webhook_secret',
                    baseUrl: 'https://api-preprod.phonepe.com/apis/merchant-simulator',
                    version: '1.0',
                    environment: 'sandbox',
                    timeout: 30000,
                    retryAttempts: 3
                },
                supportedMethods: [
                    payment_orchestration_enum_1.PaymentMethod.UPI,
                    payment_orchestration_enum_1.PaymentMethod.WALLET
                ],
                supportedCurrencies: ['INR'],
                supportedCountries: ['IN'],
                features: {
                    refunds: true,
                    partialRefunds: true,
                    webhooks: true,
                    recurringPayments: false,
                    tokenization: false,
                    3: dsAuthentication, false: ,
                    fraudDetection: false
                },
                limits: {
                    minAmount: 100,
                    maxAmount: 100000,
                    dailyLimit: 1000000,
                    monthlyLimit: 10000000
                },
                fees: {
                    processingFee: 1.5,
                    fixedFee: 0,
                    internationalFee: 0,
                    refundFee: 0
                }
            }
        ];
        defaultConnectors.forEach(connectorData => {
            const connector = new integration_hub_entity_1.GatewayConnector(connectorData);
            this.gatewayConnectors.set(connector.id, connector);
        });
        this.logger.info('Default gateway connectors initialized', {
            connectorCount: this.gatewayConnectors.size
        });
    }
    /**
     * Create payment transaction through gateway connector
     */
    async createPayment(connectorId, transaction) {
        const connector = this.gatewayConnectors.get(connectorId);
        if (!connector) {
            throw new Error(`Gateway connector ${connectorId} not found`);
        }
        if (!connector.isActive) {
            throw new Error(`Gateway connector ${connectorId} is not active`);
        }
        if (!connector.isEligibleForTransaction(transaction.amount, transaction.currency, transaction.paymentMethod)) {
            throw new Error(`Transaction not eligible for gateway ${connector.gateway}`);
        }
        try {
            this.logger.info('Creating payment through gateway connector', {
                connectorId,
                gateway: connector.gateway,
                transactionId: transaction.id,
                amount: transaction.amount,
                currency: transaction.currency,
                paymentMethod: transaction.paymentMethod
            });
            // Make API call to gateway (simplified implementation)
            const gatewayResponse = await this.makeGatewayApiCall(connector, 'POST', '/payments', {
                amount: transaction.amount,
                currency: transaction.currency,
                payment_method: transaction.paymentMethod,
                customer_id: transaction.customerId,
                order_id: transaction.invoiceId,
                callback_url: `${process.env.WEBHOOK_BASE_URL}/webhooks/${connector.gateway}`,
                metadata: transaction.metadata
            });
            if (gatewayResponse.success) {
                // Update connector statistics
                connector.updateStatistics(connector.statistics.totalTransactions + 1, connector.statistics.successfulTransactions + 1, connector.statistics.failedTransactions, connector.statistics.totalVolume + transaction.amount);
                this.logger.info('Payment created successfully', {
                    connectorId,
                    transactionId: transaction.id,
                    gatewayTransactionId: gatewayResponse.data.id
                });
                return {
                    success: true,
                    gatewayTransactionId: gatewayResponse.data.id,
                    response: gatewayResponse.data
                };
            }
            else {
                // Update connector statistics
                connector.updateStatistics(connector.statistics.totalTransactions + 1, connector.statistics.successfulTransactions, connector.statistics.failedTransactions + 1, connector.statistics.totalVolume);
                this.logger.error('Payment creation failed', {
                    connectorId,
                    transactionId: transaction.id,
                    error: gatewayResponse.error
                });
                return {
                    success: false,
                    error: gatewayResponse.error,
                    response: gatewayResponse.data
                };
            }
        }
        catch (error) {
            // Update connector statistics
            connector.updateStatistics(connector.statistics.totalTransactions + 1, connector.statistics.successfulTransactions, connector.statistics.failedTransactions + 1, connector.statistics.totalVolume);
            this.logger.error('Payment creation error', {
                connectorId,
                transactionId: transaction.id,
                error: error.message
            });
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Process webhook event
     */
    async processWebhook(gateway, headers, payload, signature) {
        try {
            // Find connector for the gateway
            const connector = Array.from(this.gatewayConnectors.values())
                .find(c => c.gateway === gateway && c.isActive);
            if (!connector) {
                throw new Error(`No active connector found for gateway ${gateway}`);
            }
            // Create webhook event
            const webhookEvent = new integration_hub_entity_1.WebhookEvent({
                tenantId: connector.tenantId,
                gateway,
                connectorId: connector.id,
                eventType: payload.event || payload.type || 'unknown',
                eventId: payload.event_id || payload.id || `evt_${Date.now()}`,
                transactionId: payload.transaction_id || payload.order_id,
                payload,
                headers,
                signature
            });
            this.webhookEvents.set(webhookEvent.id, webhookEvent);
            this.logger.info('Webhook event received', {
                eventId: webhookEvent.id,
                gateway,
                eventType: webhookEvent.eventType,
                transactionId: webhookEvent.transactionId
            });
            // Verify webhook signature
            const isVerified = await this.verifyWebhookSignature(connector, webhookEvent);
            if (isVerified) {
                webhookEvent.markAsVerified();
            }
            else {
                this.logger.warn('Webhook signature verification failed', {
                    eventId: webhookEvent.id,
                    gateway
                });
                return {
                    success: false,
                    error: 'Webhook signature verification failed'
                };
            }
            // Add to processing queue
            this.webhookProcessingQueue.push(webhookEvent);
            return {
                success: true,
                eventId: webhookEvent.id
            };
        }
        catch (error) {
            this.logger.error('Webhook processing error', {
                gateway,
                error: error.message,
                payload
            });
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Verify webhook signature
     */
    async verifyWebhookSignature(connector, webhookEvent) {
        if (!connector.configuration.webhookSecret || !webhookEvent.signature) {
            return true; // Skip verification if no secret or signature
        }
        try {
            // Gateway-specific signature verification logic
            switch (connector.gateway) {
                case payment_orchestration_enum_1.PaymentGateway.RAZORPAY:
                    return this.verifyRazorpaySignature(connector, webhookEvent);
                case payment_orchestration_enum_1.PaymentGateway.PAYU:
                    return this.verifyPayUSignature(connector, webhookEvent);
                case payment_orchestration_enum_1.PaymentGateway.PHONEPE:
                    return this.verifyPhonePeSignature(connector, webhookEvent);
                default:
                    return true; // Default to verified for unknown gateways
            }
        }
        catch (error) {
            this.logger.error('Signature verification error', {
                gateway: connector.gateway,
                eventId: webhookEvent.id,
                error: error.message
            });
            return false;
        }
    }
    /**
     * Verify Razorpay webhook signature
     */
    verifyRazorpaySignature(connector, webhookEvent) {
        // Simplified signature verification (in real implementation, use crypto)
        const expectedSignature = `sha256=${Buffer.from(JSON.stringify(webhookEvent.payload) + connector.configuration.webhookSecret).toString('base64')}`;
        return webhookEvent.signature === expectedSignature;
    }
    /**
     * Verify PayU webhook signature
     */
    verifyPayUSignature(connector, webhookEvent) {
        // Simplified signature verification
        const expectedSignature = Buffer.from(JSON.stringify(webhookEvent.payload) + connector.configuration.webhookSecret).toString('base64');
        return webhookEvent.signature === expectedSignature;
    }
    /**
     * Verify PhonePe webhook signature
     */
    verifyPhonePeSignature(connector, webhookEvent) {
        // Simplified signature verification
        const expectedSignature = Buffer.from(JSON.stringify(webhookEvent.payload) + connector.configuration.webhookSecret).toString('base64');
        return webhookEvent.signature === expectedSignature;
    }
    /**
     * Start webhook processor
     */
    startWebhookProcessor() {
        setInterval(async () => {
            if (this.webhookProcessingQueue.length === 0)
                return;
            const event = this.webhookProcessingQueue.shift();
            if (!event)
                return;
            try {
                await this.processWebhookEvent(event);
            }
            catch (error) {
                this.logger.error('Webhook event processing failed', {
                    eventId: event.id,
                    error: error.message
                });
                if (event.canRetry()) {
                    event.scheduleRetry();
                    // Add back to queue for retry (simplified)
                    setTimeout(() => {
                        this.webhookProcessingQueue.push(event);
                    }, 60000); // Retry after 1 minute
                }
            }
        }, 1000); // Process every second
    }
    /**
     * Process individual webhook event
     */
    async processWebhookEvent(event) {
        event.startProcessing();
        try {
            const transactionInfo = event.extractTransactionInfo();
            if (transactionInfo.transactionId) {
                // Update transaction status based on webhook
                await this.updateTransactionFromWebhook(transactionInfo, event);
            }
            // Process event-specific logic
            await this.handleEventType(event);
            event.markAsCompleted();
            this.logger.info('Webhook event processed successfully', {
                eventId: event.id,
                eventType: event.eventType,
                transactionId: event.transactionId
            });
        }
        catch (error) {
            event.markAsFailed(error.message);
            throw error;
        }
    }
    /**
     * Update transaction from webhook
     */
    async updateTransactionFromWebhook(transactionInfo, event) {
        // This would integrate with the payment orchestration service
        // to update transaction status based on webhook information
        this.logger.info('Updating transaction from webhook', {
            transactionId: transactionInfo.transactionId,
            status: transactionInfo.status,
            gatewayTransactionId: transactionInfo.gatewayTransactionId,
            eventId: event.id
        });
        // Simulate transaction update
        // In real implementation, this would call the payment orchestration service
    }
    /**
     * Handle specific event types
     */
    async handleEventType(event) {
        switch (event.eventType) {
            case 'payment.success':
            case 'payment.completed':
                await thi(Content, truncated, due, to, size, limit.Use, line, ranges, to, read in chunks);
        }
    }
}
exports.IntegrationHubService = IntegrationHubService;
//# sourceMappingURL=integration-hub.service.js.map