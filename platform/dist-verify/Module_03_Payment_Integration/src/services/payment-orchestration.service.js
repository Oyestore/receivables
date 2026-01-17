"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentOrchestrationService = void 0;
const payment_orchestration_enum_1 = require("../../shared/enums/payment-orchestration.enum");
const payment_orchestration_entity_1 = require("../entities/payment-orchestration.entity");
const logger_util_1 = require("../../shared/utils/logger.util");
/**
 * Payment Orchestration Service
 * Core service for intelligent payment processing and routing
 */
class PaymentOrchestrationService {
    constructor() {
        this.gatewayConfigurations = new Map();
        this.routingRules = new Map();
        this.activeTransactions = new Map();
        this.performanceMetrics = new Map();
        this.logger = new logger_util_1.Logger('PaymentOrchestrationService');
        this.initializeDefaultConfigurations();
    }
    /**
     * Initialize default gateway configurations
     */
    initializeDefaultConfigurations() {
        const defaultGateways = [
            {
                gateway: payment_orchestration_enum_1.PaymentGateway.RAZORPAY,
                supportedMethods: [payment_orchestration_enum_1.PaymentMethod.CREDIT_CARD, payment_orchestration_enum_1.PaymentMethod.DEBIT_CARD, payment_orchestration_enum_1.PaymentMethod.UPI, payment_orchestration_enum_1.PaymentMethod.NET_BANKING],
                processingFee: 2.0,
                priority: 1
            },
            {
                gateway: payment_orchestration_enum_1.PaymentGateway.PAYU,
                supportedMethods: [payment_orchestration_enum_1.PaymentMethod.CREDIT_CARD, payment_orchestration_enum_1.PaymentMethod.DEBIT_CARD, payment_orchestration_enum_1.PaymentMethod.NET_BANKING, payment_orchestration_enum_1.PaymentMethod.WALLET],
                processingFee: 2.5,
                priority: 2
            },
            {
                gateway: payment_orchestration_enum_1.PaymentGateway.PHONEPE,
                supportedMethods: [payment_orchestration_enum_1.PaymentMethod.UPI, payment_orchestration_enum_1.PaymentMethod.WALLET],
                processingFee: 1.5,
                priority: 3
            }
        ];
        defaultGateways.forEach(config => {
            const gatewayConfig = new payment_orchestration_entity_1.GatewayConfiguration({
                gateway: config.gateway,
                supportedMethods: config.supportedMethods,
                processingFee: config.processingFee,
                priority: config.priority,
                isActive: true,
                healthStatus: 'healthy'
            });
            this.gatewayConfigurations.set(gatewayConfig.id, gatewayConfig);
        });
        this.logger.info('Default gateway configurations initialized', {
            gatewayCount: this.gatewayConfigurations.size
        });
    }
    /**
     * Process payment transaction with intelligent routing
     */
    async processPayment(tenantId, customerId, invoiceId, amount, currency, paymentMethod, metadata) {
        const startTime = Date.now();
        try {
            // Create transaction
            const transaction = new payment_orchestration_entity_1.PaymentTransaction({
                tenantId,
                customerId,
                invoiceId,
                amount,
                currency,
                paymentMethod,
                transactionType: payment_orchestration_enum_1.TransactionType.PAYMENT,
                metadata: metadata || {}
            });
            this.logger.info('Processing payment transaction', {
                transactionId: transaction.id,
                tenantId,
                amount,
                currency,
                paymentMethod
            });
            // Perform risk assessment
            const riskAssessment = await this.performRiskAssessment(transaction);
            transaction.riskScore = riskAssessment.riskScore;
            // Check if transaction is blocked
            if (riskAssessment.isBlocked) {
                transaction.updateStatus(payment_orchestration_enum_1.PaymentStatus.BLOCKED);
                transaction.failureReason = 'Transaction blocked due to high risk';
                this.logger.warn('Transaction blocked due to risk assessment', {
                    transactionId: transaction.id,
                    riskScore: riskAssessment.riskScore,
                    riskLevel: riskAssessment.riskLevel
                });
                return transaction;
            }
            // Select optimal gateway
            const selectedGateway = await this.selectOptimalGateway(transaction);
            if (!selectedGateway) {
                transaction.updateStatus(payment_orchestration_enum_1.PaymentStatus.FAILED);
                transaction.failureReason = 'No suitable gateway available';
                this.logger.error('No suitable gateway found for transaction', {
                    transactionId: transaction.id,
                    amount,
                    paymentMethod
                });
                return transaction;
            }
            transaction.gateway = selectedGateway.gateway;
            this.activeTransactions.set(transaction.id, transaction);
            // Process payment through selected gateway
            const result = await this.processPaymentThroughGateway(transaction, selectedGateway);
            // Update performance metrics
            const responseTime = Date.now() - startTime;
            await this.updatePerformanceMetrics(selectedGateway.gateway, transaction, responseTime);
            this.logger.info('Payment processing completed', {
                transactionId: transaction.id,
                status: transaction.status,
                gateway: transaction.gateway,
                responseTime
            });
            return result;
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            this.logger.error('Payment processing failed', {
                error: error.message,
                tenantId,
                amount,
                paymentMethod,
                responseTime
            });
            throw error;
        }
    }
    /**
     * Perform comprehensive risk assessment
     */
    async performRiskAssessment(transaction) {
        const riskAssessment = new payment_orchestration_entity_1.RiskAssessment({
            transactionId: transaction.id,
            tenantId: transaction.tenantId,
            customerId: transaction.customerId
        });
        // Amount-based risk factor
        if (transaction.amount > 100000) {
            riskAssessment.addRiskFactor('high_amount', 0.3, 70, 'Transaction amount exceeds threshold');
        }
        else if (transaction.amount > 50000) {
            riskAssessment.addRiskFactor('medium_amount', 0.2, 40, 'Transaction amount is moderate');
        }
        else {
            riskAssessment.addRiskFactor('low_amount', 0.2, 10, 'Transaction amount is low');
        }
        // Payment method risk factor
        const methodRiskScores = {
            [payment_orchestration_enum_1.PaymentMethod.CREDIT_CARD]: 30,
            [payment_orchestration_enum_1.PaymentMethod.DEBIT_CARD]: 25,
            [payment_orchestration_enum_1.PaymentMethod.UPI]: 15,
            [payment_orchestration_enum_1.PaymentMethod.NET_BANKING]: 20,
            [payment_orchestration_enum_1.PaymentMethod.WALLET]: 10,
            [payment_orchestration_enum_1.PaymentMethod.EMI]: 40,
            [payment_orchestration_enum_1.PaymentMethod.BNPL]: 50
        };
        const methodRisk = methodRiskScores[transaction.paymentMethod] || 30;
        riskAssessment.addRiskFactor('payment_method', 0.25, methodRisk, `Risk associated with ${transaction.paymentMethod}`);
        // Time-based risk factor (transactions outside business hours)
        const hour = new Date().getHours();
        if (hour < 6 || hour > 22) {
            riskAssessment.addRiskFactor('off_hours', 0.15, 60, 'Transaction outside business hours');
        }
        else {
            riskAssessment.addRiskFactor('business_hours', 0.15, 10, 'Transaction during business hours');
        }
        // Customer history risk factor (simplified - would integrate with customer data)
        const customerRisk = Math.random() * 50; // Placeholder for actual customer risk calculation
        riskAssessment.addRiskFactor('customer_history', 0.3, customerRisk, 'Customer transaction history analysis');
        // Calculate final risk score
        riskAssessment.calculateRiskScore();
        // Add recommendations based on risk level
        if (riskAssessment.riskLevel === payment_orchestration_enum_1.RiskLevel.HIGH || riskAssessment.riskLevel === payment_orchestration_enum_1.RiskLevel.CRITICAL) {
            riskAssessment.addRecommendation('Require additional authentication');
            riskAssessment.addRecommendation('Monitor transaction closely');
        }
        if (riskAssessment.riskLevel === payment_orchestration_enum_1.RiskLevel.CRITICAL) {
            riskAssessment.addRecommendation('Manual review required');
            riskAssessment.addFraudIndicator('High risk score');
        }
        this.logger.info('Risk assessment completed', {
            transactionId: transaction.id,
            riskScore: riskAssessment.riskScore,
            riskLevel: riskAssessment.riskLevel,
            isBlocked: riskAssessment.isBlocked
        });
        return riskAssessment;
    }
    /**
     * Select optimal gateway using intelligent routing
     */
    async selectOptimalGateway(transaction) {
        // Get eligible gateways
        const eligibleGateways = Array.from(this.gatewayConfigurations.values())
            .filter(gateway => gateway.isEligibleForTransaction(transaction.amount, transaction.currency, transaction.paymentMethod))
            .sort((a, b) => {
            // Sort by success rate (descending) and processing fee (ascending)
            if (a.successRate !== b.successRate) {
                return b.successRate - a.successRate;
            }
            return a.processingFee - b.processingFee;
        });
        if (eligibleGateways.length === 0) {
            this.logger.warn('No eligible gateways found', {
                transactionId: transaction.id,
                amount: transaction.amount,
                currency: transaction.currency,
                paymentMethod: transaction.paymentMethod
            });
            return null;
        }
        // Apply routing rules
        const applicableRules = Array.from(this.routingRules.values())
            .filter(rule => rule.isActive && rule.evaluateConditions(transaction))
            .sort((a, b) => b.priority - a.priority);
        let selectedGateway = eligibleGateways[0]; // Default to best performing gateway
        // Apply routing rules if any
        if (applicableRules.length > 0) {
            const rule = applicableRules[0];
            const preferredGateways = eligibleGateways.filter(gw => rule.gatewayPreferences.includes(gw.gateway));
            if (preferredGateways.length > 0) {
                selectedGateway = preferredGateways[0];
            }
            this.logger.info('Routing rule applied', {
                transactionId: transaction.id,
                ruleName: rule.name,
                selectedGateway: selectedGateway.gateway
            });
        }
        this.logger.info('Gateway selected', {
            transactionId: transaction.id,
            selectedGateway: selectedGateway.gateway,
            successRate: selectedGateway.successRate,
            processingFee: selectedGateway.processingFee
        });
        return selectedGateway;
    }
    /**
     * Process payment through selected gateway
     */
    async processPaymentThroughGateway(transaction, gateway) {
        try {
            transaction.updateStatus(payment_orchestration_enum_1.PaymentStatus.PROCESSING);
            // Simulate gateway processing (in real implementation, this would call actual gateway APIs)
            const processingResult = await this.simulateGatewayProcessing(transaction, gateway);
            if (processingResult.success) {
                transaction.updateStatus(payment_orchestration_enum_1.PaymentStatus.SUCCESS);
                transaction.gatewayTransactionId = processingResult.gatewayTransactionId;
                transaction.gatewayResponse = processingResult.response;
            }
            else {
                transaction.updateStatus(payment_orchestration_enum_1.PaymentStatus.FAILED);
                transaction.failureReason = processingResult.errorMessage;
                transaction.gatewayResponse = processingResult.response;
            }
            return transaction;
        }
        catch (error) {
            transaction.updateStatus(payment_orchestration_enum_1.PaymentStatus.FAILED);
            transaction.failureReason = error.message;
            this.logger.error('Gateway processing failed', {
                transactionId: transaction.id,
                gateway: gateway.gateway,
                error: error.message
            });
            return transaction;
        }
    }
    /**
     * Simulate gateway processing (placeholder for actual gateway integration)
     */
    async simulateGatewayProcessing(transaction, gateway) {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
        // Simulate success/failure based on gateway success rate
        const isSuccess = Math.random() * 100 < gateway.successRate;
        if (isSuccess) {
            return {
                success: true,
                gatewayTransactionId: `${gateway.gateway}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
                response: {
                    status: 'success',
                    message: 'Payment processed successfully',
                    timestamp: new Date().toISOString()
                }
            };
        }
        else {
            const errorMessages = [
                'Insufficient funds',
                'Card expired',
                'Invalid card details',
                'Transaction declined by bank',
                'Network timeout'
            ];
            return {
                success: false,
                errorMessage: errorMessages[Math.floor(Math.random() * errorMessages.length)],
                response: {
                    status: 'failed',
                    timestamp: new Date().toISOString()
                }
            };
        }
    }
    /**
     * Update performance metrics
     */
    async updatePerformanceMetrics(gateway, transaction, responseTime) {
        const metricsKey = `${gateway}_${transaction.tenantId}_hourly`;
        let metrics = this.performanceMetrics.get(metricsKey);
        if (!metrics) {
            const now = new Date();
            metrics = new payment_orchestration_entity_1.PerformanceMetrics({
                tenantId: transaction.tenantId,
                gateway,
                timeframe: 'hourly',
                startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()),
                endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1)
            });
            this.performanceMetrics.set(metricsKey, metrics);
        }
        metrics.addTransaction(transaction, responseTime);
        // Update gateway configuration with latest metrics
        const gatewayConfig = Array.from(this.gatewayConfigurations.values())
            .find(gw => gw.gateway === gateway && gw.tenantId === transaction.tenantId);
        if (gatewayConfig) {
            gatewayConfig.updatePerformanceMetrics(metrics.successRate, metrics.averageResponseTime);
        }
        this.logger.info('Performance metrics updated', {
            gateway,
            tenantId: transaction.tenantId,
            successRate: metrics.successRate,
            averageResponseTime: metrics.averageResponseTime,
            totalTransactions: metrics.totalTransactions
        });
    }
    /**
     * Retry failed transaction
     */
    async retryTransaction(transactionId) {
        const transaction = this.activeTransactions.get(transactionId);
        if (!transaction) {
            throw new Error(`Transaction ${transactionId} not found`);
        }
        if (!transaction.canRetry()) {
            throw new Error(`Transaction ${transactionId} cannot be retried`);
        }
        this.logger.info('Retrying transaction', {
            transactionId,
            retryCount: transaction.retryCount + 1
        });
        transaction.incrementRetry();
        // Select different gateway for retry
        const selectedGateway = await this.selectOptimalGateway(transaction);
        if (!selectedGateway) {
            transaction.updateStatus(payment_orchestration_enum_1.PaymentStatus.FAILED);
            transaction.failureReason = 'No suitable gateway available for retry';
            return transaction;
        }
        transaction.gateway = selectedGateway.gateway;
        return await this.processPaymentThroughGateway(transaction, selectedGateway);
    }
    /**
     * Get transaction status
     */
    getTransactionStatus(transactionId) {
        return this.activeTransactions.get(transactionId) || null;
    }
    /**
     * Add gateway configuration
     */
    addGatewayConfiguration(config) {
        const gatewayConfig = new payment_orchestration_entity_1.GatewayConfiguration(config);
        this.gatewayConfigurations.set(gatewayConfig.id, gatewayConfig);
        this(Content, truncated, due, to, size, limit.Use, line, ranges, to, read in chunks);
    }
}
exports.PaymentOrchestrationService = PaymentOrchestrationService;
//# sourceMappingURL=payment-orchestration.service.js.map