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
  PerformanceMetricsInterface
} from '../../shared/interfaces/payment-orchestration.interface';
import { 
  PaymentTransaction, 
  GatewayConfiguration, 
  RoutingRule, 
  RiskAssessment, 
  PerformanceMetrics 
} from '../entities/payment-orchestration.entity';
import { BaseDto } from '../../shared/dto/base.dto';
import { Logger } from '../../shared/utils/logger.util';

/**
 * Payment Orchestration Service
 * Core service for intelligent payment processing and routing
 */
export class PaymentOrchestrationService {
  private logger: Logger;
  private gatewayConfigurations: Map<string, GatewayConfiguration> = new Map();
  private routingRules: Map<string, RoutingRule> = new Map();
  private activeTransactions: Map<string, PaymentTransaction> = new Map();
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();

  constructor() {
    this.logger = new Logger('PaymentOrchestrationService');
    this.initializeDefaultConfigurations();
  }

  /**
   * Initialize default gateway configurations
   */
  private initializeDefaultConfigurations(): void {
    const defaultGateways = [
      {
        gateway: PaymentGateway.RAZORPAY,
        supportedMethods: [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD, PaymentMethod.UPI, PaymentMethod.NET_BANKING],
        processingFee: 2.0,
        priority: 1
      },
      {
        gateway: PaymentGateway.PAYU,
        supportedMethods: [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD, PaymentMethod.NET_BANKING, PaymentMethod.WALLET],
        processingFee: 2.5,
        priority: 2
      },
      {
        gateway: PaymentGateway.PHONEPE,
        supportedMethods: [PaymentMethod.UPI, PaymentMethod.WALLET],
        processingFee: 1.5,
        priority: 3
      }
    ];

    defaultGateways.forEach(config => {
      const gatewayConfig = new GatewayConfiguration({
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
  public async processPayment(
    tenantId: string,
    customerId: string,
    invoiceId: string,
    amount: number,
    currency: string,
    paymentMethod: PaymentMethod,
    metadata?: Record<string, any>
  ): Promise<PaymentTransaction> {
    const startTime = Date.now();
    
    try {
      // Create transaction
      const transaction = new PaymentTransaction({
        tenantId,
        customerId,
        invoiceId,
        amount,
        currency,
        paymentMethod,
        transactionType: TransactionType.PAYMENT,
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
        transaction.updateStatus(PaymentStatus.BLOCKED);
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
        transaction.updateStatus(PaymentStatus.FAILED);
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

    } catch (error) {
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
  private async performRiskAssessment(transaction: PaymentTransaction): Promise<RiskAssessment> {
    const riskAssessment = new RiskAssessment({
      transactionId: transaction.id,
      tenantId: transaction.tenantId,
      customerId: transaction.customerId
    });

    // Amount-based risk factor
    if (transaction.amount > 100000) {
      riskAssessment.addRiskFactor('high_amount', 0.3, 70, 'Transaction amount exceeds threshold');
    } else if (transaction.amount > 50000) {
      riskAssessment.addRiskFactor('medium_amount', 0.2, 40, 'Transaction amount is moderate');
    } else {
      riskAssessment.addRiskFactor('low_amount', 0.2, 10, 'Transaction amount is low');
    }

    // Payment method risk factor
    const methodRiskScores = {
      [PaymentMethod.CREDIT_CARD]: 30,
      [PaymentMethod.DEBIT_CARD]: 25,
      [PaymentMethod.UPI]: 15,
      [PaymentMethod.NET_BANKING]: 20,
      [PaymentMethod.WALLET]: 10,
      [PaymentMethod.EMI]: 40,
      [PaymentMethod.BNPL]: 50
    };

    const methodRisk = methodRiskScores[transaction.paymentMethod] || 30;
    riskAssessment.addRiskFactor('payment_method', 0.25, methodRisk, `Risk associated with ${transaction.paymentMethod}`);

    // Time-based risk factor (transactions outside business hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      riskAssessment.addRiskFactor('off_hours', 0.15, 60, 'Transaction outside business hours');
    } else {
      riskAssessment.addRiskFactor('business_hours', 0.15, 10, 'Transaction during business hours');
    }

    // Customer history risk factor (simplified - would integrate with customer data)
    const customerRisk = Math.random() * 50; // Placeholder for actual customer risk calculation
    riskAssessment.addRiskFactor('customer_history', 0.3, customerRisk, 'Customer transaction history analysis');

    // Calculate final risk score
    riskAssessment.calculateRiskScore();

    // Add recommendations based on risk level
    if (riskAssessment.riskLevel === RiskLevel.HIGH || riskAssessment.riskLevel === RiskLevel.CRITICAL) {
      riskAssessment.addRecommendation('Require additional authentication');
      riskAssessment.addRecommendation('Monitor transaction closely');
    }

    if (riskAssessment.riskLevel === RiskLevel.CRITICAL) {
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
  private async selectOptimalGateway(transaction: PaymentTransaction): Promise<GatewayConfiguration | null> {
    // Get eligible gateways
    const eligibleGateways = Array.from(this.gatewayConfigurations.values())
      .filter(gateway => gateway.isEligibleForTransaction(
        transaction.amount,
        transaction.currency,
        transaction.paymentMethod
      ))
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
      const preferredGateways = eligibleGateways.filter(gw => 
        rule.gatewayPreferences.includes(gw.gateway)
      );
      
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
  private async processPaymentThroughGateway(
    transaction: PaymentTransaction,
    gateway: GatewayConfiguration
  ): Promise<PaymentTransaction> {
    try {
      transaction.updateStatus(PaymentStatus.PROCESSING);
      
      // Simulate gateway processing (in real implementation, this would call actual gateway APIs)
      const processingResult = await this.simulateGatewayProcessing(transaction, gateway);
      
      if (processingResult.success) {
        transaction.updateStatus(PaymentStatus.SUCCESS);
        transaction.gatewayTransactionId = processingResult.gatewayTransactionId;
        transaction.gatewayResponse = processingResult.response;
      } else {
        transaction.updateStatus(PaymentStatus.FAILED);
        transaction.failureReason = processingResult.errorMessage;
        transaction.gatewayResponse = processingResult.response;
      }

      return transaction;

    } catch (error) {
      transaction.updateStatus(PaymentStatus.FAILED);
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
  private async simulateGatewayProcessing(
    transaction: PaymentTransaction,
    gateway: GatewayConfiguration
  ): Promise<{
    success: boolean;
    gatewayTransactionId?: string;
    response: any;
    errorMessage?: string;
  }> {
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
    } else {
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
  private async updatePerformanceMetrics(
    gateway: PaymentGateway,
    transaction: PaymentTransaction,
    responseTime: number
  ): Promise<void> {
    const metricsKey = `${gateway}_${transaction.tenantId}_hourly`;
    let metrics = this.performanceMetrics.get(metricsKey);

    if (!metrics) {
      const now = new Date();
      metrics = new PerformanceMetrics({
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
  public async retryTransaction(transactionId: string): Promise<PaymentTransaction> {
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
      transaction.updateStatus(PaymentStatus.FAILED);
      transaction.failureReason = 'No suitable gateway available for retry';
      return transaction;
    }

    transaction.gateway = selectedGateway.gateway;
    return await this.processPaymentThroughGateway(transaction, selectedGateway);
  }

  /**
   * Get transaction status
   */
  public getTransactionStatus(transactionId: string): PaymentTransaction | null {
    return this.activeTransactions.get(transactionId) || null;
  }

  /**
   * Add gateway configuration
   */
  public addGatewayConfiguration(config: Partial<GatewayConfiguration>): GatewayConfiguration {
    const gatewayConfig = new GatewayConfiguration(config);
    this.gatewayConfigurations.set(gatewayConfig.id, gatewayConfig);
    
    this
(Content truncated due to size limit. Use line ranges to read in chunks)