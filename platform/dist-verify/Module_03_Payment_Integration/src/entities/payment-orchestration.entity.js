"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMetrics = exports.RiskAssessment = exports.RoutingRule = exports.GatewayConfiguration = exports.PaymentTransaction = void 0;
const payment_orchestration_enum_1 = require("../../shared/enums/payment-orchestration.enum");
/**
 * Payment Transaction Entity
 * Core entity representing a payment transaction with comprehensive tracking
 */
class PaymentTransaction {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.tenantId = data.tenantId || '';
        this.customerId = data.customerId || '';
        this.invoiceId = data.invoiceId || '';
        this.amount = data.amount || 0;
        this.currency = data.currency || 'INR';
        this.paymentMethod = data.paymentMethod || payment_orchestration_enum_1.PaymentMethod.CREDIT_CARD;
        this.gateway = data.gateway || payment_orchestration_enum_1.PaymentGateway.RAZORPAY;
        this.status = data.status || payment_orchestration_enum_1.PaymentStatus.PENDING;
        this.transactionType = data.transactionType || payment_orchestration_enum_1.TransactionType.PAYMENT;
        this.gatewayTransactionId = data.gatewayTransactionId;
        this.gatewayResponse = data.gatewayResponse;
        this.failureReason = data.failureReason;
        this.retryCount = data.retryCount || 0;
        this.maxRetries = data.maxRetries || 3;
        this.metadata = data.metadata || {};
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.completedAt = data.completedAt;
        this.riskScore = data.riskScore || 0;
        this.complianceFlags = data.complianceFlags || [];
        this.auditTrail = data.auditTrail || [];
    }
    generateId() {
        return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    addAuditEntry(action, details, userId) {
        this.auditTrail.push({
            timestamp: new Date(),
            action,
            details,
            userId
        });
        this.updatedAt = new Date();
    }
    updateStatus(status, details) {
        this.status = status;
        this.updatedAt = new Date();
        if (status === payment_orchestration_enum_1.PaymentStatus.SUCCESS || status === payment_orchestration_enum_1.PaymentStatus.FAILED) {
            this.completedAt = new Date();
        }
        this.addAuditEntry('STATUS_UPDATE', { status, details });
    }
    incrementRetry() {
        this.retryCount++;
        this.updatedAt = new Date();
        this.addAuditEntry('RETRY_ATTEMPT', { retryCount: this.retryCount });
    }
    canRetry() {
        return this.retryCount < this.maxRetries && this.status === payment_orchestration_enum_1.PaymentStatus.FAILED;
    }
    isCompleted() {
        return this.status === payment_orchestration_enum_1.PaymentStatus.SUCCESS || this.status === payment_orchestration_enum_1.PaymentStatus.FAILED;
    }
    getDuration() {
        if (!this.completedAt)
            return null;
        return this.completedAt.getTime() - this.createdAt.getTime();
    }
    toJSON() {
        return {
            id: this.id,
            tenantId: this.tenantId,
            customerId: this.customerId,
            invoiceId: this.invoiceId,
            amount: this.amount,
            currency: this.currency,
            paymentMethod: this.paymentMethod,
            gateway: this.gateway,
            status: this.status,
            transactionType: this.transactionType,
            gatewayTransactionId: this.gatewayTransactionId,
            gatewayResponse: this.gatewayResponse,
            failureReason: this.failureReason,
            retryCount: this.retryCount,
            maxRetries: this.maxRetries,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            completedAt: this.completedAt,
            riskScore: this.riskScore,
            complianceFlags: this.complianceFlags,
            auditTrail: this.auditTrail
        };
    }
}
exports.PaymentTransaction = PaymentTransaction;
/**
 * Gateway Configuration Entity
 * Manages payment gateway configurations and settings
 */
class GatewayConfiguration {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.tenantId = data.tenantId || '';
        this.gateway = data.gateway || payment_orchestration_enum_1.PaymentGateway.RAZORPAY;
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.priority = data.priority || 1;
        this.configuration = data.configuration || {};
        this.supportedMethods = data.supportedMethods || [];
        this.supportedCurrencies = data.supportedCurrencies || ['INR'];
        this.minAmount = data.minAmount || 1;
        this.maxAmount = data.maxAmount || 1000000;
        this.processingFee = data.processingFee || 0;
        this.settlementTime = data.settlementTime || 24;
        this.successRate = data.successRate || 0;
        this.averageResponseTime = data.averageResponseTime || 0;
        this.lastHealthCheck = data.lastHealthCheck || new Date();
        this.healthStatus = data.healthStatus || 'healthy';
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.metadata = data.metadata || {};
    }
    generateId() {
        return `gw_${this.gateway}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
    updateHealthStatus(status, metrics) {
        this.healthStatus = status;
        this.lastHealthCheck = new Date();
        this.updatedAt = new Date();
        if (metrics) {
            this.metadata.lastHealthMetrics = metrics;
        }
    }
    updatePerformanceMetrics(successRate, responseTime) {
        this.successRate = successRate;
        this.averageResponseTime = responseTime;
        this.updatedAt = new Date();
    }
    isEligibleForTransaction(amount, currency, method) {
        return this.isActive &&
            this.healthStatus !== 'unhealthy' &&
            amount >= this.minAmount &&
            amount <= this.maxAmount &&
            this.supportedCurrencies.includes(currency) &&
            this.supportedMethods.includes(method);
    }
    getEffectiveCost(amount) {
        return amount * (this.processingFee / 100);
    }
    toJSON() {
        return {
            id: this.id,
            tenantId: this.tenantId,
            gateway: this.gateway,
            isActive: this.isActive,
            priority: this.priority,
            configuration: this.configuration,
            supportedMethods: this.supportedMethods,
            supportedCurrencies: this.supportedCurrencies,
            minAmount: this.minAmount,
            maxAmount: this.maxAmount,
            processingFee: this.processingFee,
            settlementTime: this.settlementTime,
            successRate: this.successRate,
            averageResponseTime: this.averageResponseTime,
            lastHealthCheck: this.lastHealthCheck,
            healthStatus: this.healthStatus,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            metadata: this.metadata
        };
    }
}
exports.GatewayConfiguration = GatewayConfiguration;
/**
 * Routing Rule Entity
 * Defines intelligent routing rules for payment processing
 */
class RoutingRule {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.tenantId = data.tenantId || '';
        this.name = data.name || '';
        this.description = data.description || '';
        this.strategy = data.strategy || payment_orchestration_enum_1.RoutingStrategy.COST_OPTIMIZATION;
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.priority = data.priority || 1;
        this.conditions = data.conditions || [];
        this.actions = data.actions || [];
        this.gatewayPreferences = data.gatewayPreferences || [];
        this.fallbackGateways = data.fallbackGateways || [];
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.metadata = data.metadata || {};
    }
    generateId() {
        return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }
    evaluateConditions(transaction) {
        return this.conditions.every(condition => {
            const fieldValue = this.getFieldValue(transaction, condition.field);
            return this.evaluateCondition(fieldValue, condition.operator, condition.value);
        });
    }
    getFieldValue(transaction, field) {
        const fieldPath = field.split('.');
        let value = transaction;
        for (const path of fieldPath) {
            value = value?.[path];
        }
        return value;
    }
    evaluateCondition(fieldValue, operator, conditionValue) {
        switch (operator) {
            case 'equals':
                return fieldValue === conditionValue;
            case 'not_equals':
                return fieldValue !== conditionValue;
            case 'greater_than':
                return fieldValue > conditionValue;
            case 'less_than':
                return fieldValue < conditionValue;
            case 'contains':
                return String(fieldValue).includes(String(conditionValue));
            case 'in':
                return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
            case 'not_in':
                return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
            default:
                return false;
        }
    }
    toJSON() {
        return {
            id: this.id,
            tenantId: this.tenantId,
            name: this.name,
            description: this.description,
            strategy: this.strategy,
            isActive: this.isActive,
            priority: this.priority,
            conditions: this.conditions,
            actions: this.actions,
            gatewayPreferences: this.gatewayPreferences,
            fallbackGateways: this.fallbackGateways,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            metadata: this.metadata
        };
    }
}
exports.RoutingRule = RoutingRule;
/**
 * Risk Assessment Entity
 * Manages risk assessment and fraud detection
 */
class RiskAssessment {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.transactionId = data.transactionId || '';
        this.tenantId = data.tenantId || '';
        this.customerId = data.customerId || '';
        this.riskLevel = data.riskLevel || payment_orchestration_enum_1.RiskLevel.LOW;
        this.riskScore = data.riskScore || 0;
        this.factors = data.factors || [];
        this.fraudIndicators = data.fraudIndicators || [];
        this.recommendations = data.recommendations || [];
        this.isBlocked = data.isBlocked || false;
        this.requiresManualReview = data.requiresManualReview || false;
        this.reviewedBy = data.reviewedBy;
        this.reviewedAt = data.reviewedAt;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.metadata = data.metadata || {};
    }
    generateId() {
        return `risk_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }
    calculateRiskScore() {
        if (this.factors.length === 0)
            return 0;
        const weightedSum = this.factors.reduce((sum, factor) => {
            return sum + (factor.score * factor.weight);
        }, 0);
        const totalWeight = this.factors.reduce((sum, factor) => sum + factor.weight, 0);
        this.riskScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
        this.updateRiskLevel();
        return this.riskScore;
    }
    updateRiskLevel() {
        if (this.riskScore >= 80) {
            this.riskLevel = payment_orchestration_enum_1.RiskLevel.CRITICAL;
            this.isBlocked = true;
            this.requiresManualReview = true;
        }
        else if (this.riskScore >= 60) {
            this.riskLevel = payment_orchestration_enum_1.RiskLevel.HIGH;
            this.requiresManualReview = true;
        }
        else if (this.riskScore >= 40) {
            this.riskLevel = payment_orchestration_enum_1.RiskLevel.MEDIUM;
        }
        else {
            this.riskLevel = payment_orchestration_enum_1.RiskLevel.LOW;
        }
    }
    addRiskFactor(factor, weight, score, description) {
        this.factors.push({ factor, weight, score, description });
        this.calculateRiskScore();
        this.updatedAt = new Date();
    }
    addFraudIndicator(indicator) {
        if (!this.fraudIndicators.includes(indicator)) {
            this.fraudIndicators.push(indicator);
            this.updatedAt = new Date();
        }
    }
    addRecommendation(recommendation) {
        if (!this.recommendations.includes(recommendation)) {
            this.recommendations.push(recommendation);
            this.updatedAt = new Date();
        }
    }
    markReviewed(reviewerId) {
        this.reviewedBy = reviewerId;
        this.reviewedAt = new Date();
        this.updatedAt = new Date();
    }
    toJSON() {
        return {
            id: this.id,
            transactionId: this.transactionId,
            tenantId: this.tenantId,
            customerId: this.customerId,
            riskLevel: this.riskLevel,
            riskScore: this.riskScore,
            factors: this.factors,
            fraudIndicators: this.fraudIndicators,
            recommendations: this.recommendations,
            isBlocked: this.isBlocked,
            requiresManualReview: this.requiresManualReview,
            reviewedBy: this.reviewedBy,
            reviewedAt: this.reviewedAt,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            metadata: this.metadata
        };
    }
}
exports.RiskAssessment = RiskAssessment;
/**
 * Performance Metrics Entity
 * Tracks and analyzes payment processing performance
 */
class PerformanceMetrics {
}
exports.PerformanceMetrics = PerformanceMetrics;
//# sourceMappingURL=payment-orchestration.entity.js.map