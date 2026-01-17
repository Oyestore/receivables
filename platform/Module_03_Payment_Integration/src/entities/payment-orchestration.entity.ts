import { 
  PaymentGateway, 
  PaymentMethod, 
  PaymentStatus, 
  TransactionType, 
  RoutingStrategy, 
  RiskLevel,
  ComplianceStandard,
  MonitoringMetric 
} from '../../shared/enums/payment-orchestration.enum';
import { 
  PaymentOrchestrationInterface, 
  GatewayConfigurationInterface, 
  TransactionInterface,
  RoutingRuleInterface,
  RiskAssessmentInterface,
  ComplianceCheckInterface,
  PerformanceMetricsInterface 
} from '../../shared/interfaces/payment-orchestration.interface';

/**
 * Payment Transaction Entity
 * Core entity representing a payment transaction with comprehensive tracking
 */
export class PaymentTransaction implements TransactionInterface {
  public id: string;
  public tenantId: string;
  public customerId: string;
  public invoiceId: string;
  public amount: number;
  public currency: string;
  public paymentMethod: PaymentMethod;
  public gateway: PaymentGateway;
  public status: PaymentStatus;
  public transactionType: TransactionType;
  public gatewayTransactionId?: string;
  public gatewayResponse?: any;
  public failureReason?: string;
  public retryCount: number;
  public maxRetries: number;
  public metadata: Record<string, any>;
  public createdAt: Date;
  public updatedAt: Date;
  public completedAt?: Date;
  public riskScore: number;
  public complianceFlags: ComplianceStandard[];
  public auditTrail: Array<{
    timestamp: Date;
    action: string;
    details: any;
    userId?: string;
  }>;

  constructor(data: Partial<PaymentTransaction>) {
    this.id = data.id || this.generateId();
    this.tenantId = data.tenantId || '';
    this.customerId = data.customerId || '';
    this.invoiceId = data.invoiceId || '';
    this.amount = data.amount || 0;
    this.currency = data.currency || 'INR';
    this.paymentMethod = data.paymentMethod || PaymentMethod.CREDIT_CARD;
    this.gateway = data.gateway || PaymentGateway.RAZORPAY;
    this.status = data.status || PaymentStatus.PENDING;
    this.transactionType = data.transactionType || TransactionType.PAYMENT;
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

  private generateId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public addAuditEntry(action: string, details: any, userId?: string): void {
    this.auditTrail.push({
      timestamp: new Date(),
      action,
      details,
      userId
    });
    this.updatedAt = new Date();
  }

  public updateStatus(status: PaymentStatus, details?: any): void {
    this.status = status;
    this.updatedAt = new Date();
    if (status === PaymentStatus.SUCCESS || status === PaymentStatus.FAILED) {
      this.completedAt = new Date();
    }
    this.addAuditEntry('STATUS_UPDATE', { status, details });
  }

  public incrementRetry(): void {
    this.retryCount++;
    this.updatedAt = new Date();
    this.addAuditEntry('RETRY_ATTEMPT', { retryCount: this.retryCount });
  }

  public canRetry(): boolean {
    return this.retryCount < this.maxRetries && this.status === PaymentStatus.FAILED;
  }

  public isCompleted(): boolean {
    return this.status === PaymentStatus.SUCCESS || this.status === PaymentStatus.FAILED;
  }

  public getDuration(): number | null {
    if (!this.completedAt) return null;
    return this.completedAt.getTime() - this.createdAt.getTime();
  }

  public toJSON(): any {
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

/**
 * Gateway Configuration Entity
 * Manages payment gateway configurations and settings
 */
export class GatewayConfiguration implements GatewayConfigurationInterface {
  public id: string;
  public tenantId: string;
  public gateway: PaymentGateway;
  public isActive: boolean;
  public priority: number;
  public configuration: Record<string, any>;
  public supportedMethods: PaymentMethod[];
  public supportedCurrencies: string[];
  public minAmount: number;
  public maxAmount: number;
  public processingFee: number;
  public settlementTime: number; // in hours
  public successRate: number;
  public averageResponseTime: number; // in milliseconds
  public lastHealthCheck: Date;
  public healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  public createdAt: Date;
  public updatedAt: Date;
  public metadata: Record<string, any>;

  constructor(data: Partial<GatewayConfiguration>) {
    this.id = data.id || this.generateId();
    this.tenantId = data.tenantId || '';
    this.gateway = data.gateway || PaymentGateway.RAZORPAY;
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

  private generateId(): string {
    return `gw_${this.gateway}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  public updateHealthStatus(status: 'healthy' | 'degraded' | 'unhealthy', metrics?: any): void {
    this.healthStatus = status;
    this.lastHealthCheck = new Date();
    this.updatedAt = new Date();
    if (metrics) {
      this.metadata.lastHealthMetrics = metrics;
    }
  }

  public updatePerformanceMetrics(successRate: number, responseTime: number): void {
    this.successRate = successRate;
    this.averageResponseTime = responseTime;
    this.updatedAt = new Date();
  }

  public isEligibleForTransaction(amount: number, currency: string, method: PaymentMethod): boolean {
    return this.isActive &&
           this.healthStatus !== 'unhealthy' &&
           amount >= this.minAmount &&
           amount <= this.maxAmount &&
           this.supportedCurrencies.includes(currency) &&
           this.supportedMethods.includes(method);
  }

  public getEffectiveCost(amount: number): number {
    return amount * (this.processingFee / 100);
  }

  public toJSON(): any {
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

/**
 * Routing Rule Entity
 * Defines intelligent routing rules for payment processing
 */
export class RoutingRule implements RoutingRuleInterface {
  public id: string;
  public tenantId: string;
  public name: string;
  public description: string;
  public strategy: RoutingStrategy;
  public isActive: boolean;
  public priority: number;
  public conditions: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
    value: any;
  }>;
  public actions: Array<{
    type: 'route_to_gateway' | 'set_priority' | 'apply_fee' | 'set_retry_count';
    parameters: any;
  }>;
  public gatewayPreferences: PaymentGateway[];
  public fallbackGateways: PaymentGateway[];
  public createdAt: Date;
  public updatedAt: Date;
  public metadata: Record<string, any>;

  constructor(data: Partial<RoutingRule>) {
    this.id = data.id || this.generateId();
    this.tenantId = data.tenantId || '';
    this.name = data.name || '';
    this.description = data.description || '';
    this.strategy = data.strategy || RoutingStrategy.COST_OPTIMIZATION;
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

  private generateId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  public evaluateConditions(transaction: PaymentTransaction): boolean {
    return this.conditions.every(condition => {
      const fieldValue = this.getFieldValue(transaction, condition.field);
      return this.evaluateCondition(fieldValue, condition.operator, condition.value);
    });
  }

  private getFieldValue(transaction: PaymentTransaction, field: string): any {
    const fieldPath = field.split('.');
    let value: any = transaction;
    for (const path of fieldPath) {
      value = value?.[path];
    }
    return value;
  }

  private evaluateCondition(fieldValue: any, operator: string, conditionValue: any): boolean {
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

  public toJSON(): any {
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

/**
 * Risk Assessment Entity
 * Manages risk assessment and fraud detection
 */
export class RiskAssessment implements RiskAssessmentInterface {
  public id: string;
  public transactionId: string;
  public tenantId: string;
  public customerId: string;
  public riskLevel: RiskLevel;
  public riskScore: number;
  public factors: Array<{
    factor: string;
    weight: number;
    score: number;
    description: string;
  }>;
  public fraudIndicators: string[];
  public recommendations: string[];
  public isBlocked: boolean;
  public requiresManualReview: boolean;
  public reviewedBy?: string;
  public reviewedAt?: Date;
  public createdAt: Date;
  public updatedAt: Date;
  public metadata: Record<string, any>;

  constructor(data: Partial<RiskAssessment>) {
    this.id = data.id || this.generateId();
    this.transactionId = data.transactionId || '';
    this.tenantId = data.tenantId || '';
    this.customerId = data.customerId || '';
    this.riskLevel = data.riskLevel || RiskLevel.LOW;
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

  private generateId(): string {
    return `risk_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  public calculateRiskScore(): number {
    if (this.factors.length === 0) return 0;
    
    const weightedSum = this.factors.reduce((sum, factor) => {
      return sum + (factor.score * factor.weight);
    }, 0);
    
    const totalWeight = this.factors.reduce((sum, factor) => sum + factor.weight, 0);
    
    this.riskScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    this.updateRiskLevel();
    return this.riskScore;
  }

  private updateRiskLevel(): void {
    if (this.riskScore >= 80) {
      this.riskLevel = RiskLevel.CRITICAL;
      this.isBlocked = true;
      this.requiresManualReview = true;
    } else if (this.riskScore >= 60) {
      this.riskLevel = RiskLevel.HIGH;
      this.requiresManualReview = true;
    } else if (this.riskScore >= 40) {
      this.riskLevel = RiskLevel.MEDIUM;
    } else {
      this.riskLevel = RiskLevel.LOW;
    }
  }

  public addRiskFactor(factor: string, weight: number, score: number, description: string): void {
    this.factors.push({ factor, weight, score, description });
    this.calculateRiskScore();
    this.updatedAt = new Date();
  }

  public addFraudIndicator(indicator: string): void {
    if (!this.fraudIndicators.includes(indicator)) {
      this.fraudIndicators.push(indicator);
      this.updatedAt = new Date();
    }
  }

  public addRecommendation(recommendation: string): void {
    if (!this.recommendations.includes(recommendation)) {
      this.recommendations.push(recommendation);
      this.updatedAt = new Date();
    }
  }

  public markReviewed(reviewerId: string): void {
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
    this.updatedAt = new Date();
  }

  public toJSON(): any {
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

/**
 * Performance Metrics Entity
 * Tracks and analyzes payment processing performance
 */
export class PerformanceMetrics implements PerformanceMetricsInterface {
  public id: stri
(Content truncated due to size limit. Use line ranges to read in chunks)