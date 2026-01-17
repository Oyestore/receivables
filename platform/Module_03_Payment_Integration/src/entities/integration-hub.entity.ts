import { 
  PaymentGateway, 
  PaymentMethod, 
  PaymentStatus, 
  TransactionType, 
  RiskLevel,
  ComplianceStandard,
  MonitoringMetric 
} from '../../shared/enums/payment-orchestration.enum';

/**
 * Gateway Connector Entity
 * Manages connections and configurations for payment gateways
 */
export class GatewayConnector {
  public id: string;
  public tenantId: string;
  public gateway: PaymentGateway;
  public name: string;
  public description: string;
  public isActive: boolean;
  public configuration: {
    apiKey: string;
    secretKey: string;
    webhookSecret?: string;
    baseUrl: string;
    version: string;
    environment: 'sandbox' | 'production';
    timeout: number;
    retryAttempts: number;
    customHeaders?: Record<string, string>;
    customParameters?: Record<string, any>;
  };
  public supportedMethods: PaymentMethod[];
  public supportedCurrencies: string[];
  public supportedCountries: string[];
  public features: {
    refunds: boolean;
    partialRefunds: boolean;
    webhooks: boolean;
    recurringPayments: boolean;
    tokenization: boolean;
    3dsAuthentication: boolean;
    fraudDetection: boolean;
  };
  public limits: {
    minAmount: number;
    maxAmount: number;
    dailyLimit?: number;
    monthlyLimit?: number;
  };
  public fees: {
    processingFee: number; // percentage
    fixedFee?: number; // fixed amount
    internationalFee?: number; // additional percentage for international cards
    refundFee?: number; // fee for refunds
  };
  public healthStatus: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: Date;
    responseTime: number;
    successRate: number;
    errorRate: number;
    uptime: number; // percentage
  };
  public statistics: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    totalVolume: number;
    averageAmount: number;
    lastTransactionTime?: Date;
  };
  public createdAt: Date;
  public updatedAt: Date;
  public metadata: Record<string, any>;

  constructor(data: Partial<GatewayConnector>) {
    this.id = data.id || this.generateId();
    this.tenantId = data.tenantId || '';
    this.gateway = data.gateway || PaymentGateway.RAZORPAY;
    this.name = data.name || '';
    this.description = data.description || '';
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.configuration = data.configuration || {
      apiKey: '',
      secretKey: '',
      baseUrl: '',
      version: '1.0',
      environment: 'sandbox',
      timeout: 30000,
      retryAttempts: 3
    };
    this.supportedMethods = data.supportedMethods || [];
    this.supportedCurrencies = data.supportedCurrencies || ['INR'];
    this.supportedCountries = data.supportedCountries || ['IN'];
    this.features = data.features || {
      refunds: true,
      partialRefunds: true,
      webhooks: true,
      recurringPayments: false,
      tokenization: false,
      3dsAuthentication: true,
      fraudDetection: false
    };
    this.limits = data.limits || {
      minAmount: 1,
      maxAmount: 1000000
    };
    this.fees = data.fees || {
      processingFee: 2.0
    };
    this.healthStatus = data.healthStatus || {
      status: 'healthy',
      lastCheck: new Date(),
      responseTime: 0,
      successRate: 100,
      errorRate: 0,
      uptime: 100
    };
    this.statistics = data.statistics || {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      totalVolume: 0,
      averageAmount: 0
    };
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.metadata = data.metadata || {};
  }

  private generateId(): string {
    return `gc_${this.gateway}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  public updateHealthStatus(
    status: 'healthy' | 'degraded' | 'unhealthy',
    responseTime: number,
    successRate: number,
    errorRate: number
  ): void {
    this.healthStatus = {
      status,
      lastCheck: new Date(),
      responseTime,
      successRate,
      errorRate,
      uptime: this.calculateUptime()
    };
    this.updatedAt = new Date();
  }

  private calculateUptime(): number {
    // Simplified uptime calculation based on health status
    const hoursActive = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
    const healthyHours = hoursActive * (this.healthStatus.successRate / 100);
    return Math.min(100, (healthyHours / hoursActive) * 100);
  }

  public updateStatistics(
    totalTransactions: number,
    successfulTransactions: number,
    failedTransactions: number,
    totalVolume: number
  ): void {
    this.statistics = {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      totalVolume,
      averageAmount: totalTransactions > 0 ? totalVolume / totalTransactions : 0,
      lastTransactionTime: new Date()
    };
    this.updatedAt = new Date();
  }

  public isEligibleForTransaction(
    amount: number,
    currency: string,
    method: PaymentMethod,
    country?: string
  ): boolean {
    return this.isActive &&
           this.healthStatus.status !== 'unhealthy' &&
           amount >= this.limits.minAmount &&
           amount <= this.limits.maxAmount &&
           this.supportedCurrencies.includes(currency) &&
           this.supportedMethods.includes(method) &&
           (!country || this.supportedCountries.includes(country));
  }

  public calculateTotalFee(amount: number, isInternational: boolean = false): number {
    let fee = amount * (this.fees.processingFee / 100);
    
    if (this.fees.fixedFee) {
      fee += this.fees.fixedFee;
    }
    
    if (isInternational && this.fees.internationalFee) {
      fee += amount * (this.fees.internationalFee / 100);
    }
    
    return fee;
  }

  public toJSON(): any {
    return {
      id: this.id,
      tenantId: this.tenantId,
      gateway: this.gateway,
      name: this.name,
      description: this.description,
      isActive: this.isActive,
      configuration: {
        ...this.configuration,
        apiKey: '***masked***',
        secretKey: '***masked***',
        webhookSecret: this.configuration.webhookSecret ? '***masked***' : undefined
      },
      supportedMethods: this.supportedMethods,
      supportedCurrencies: this.supportedCurrencies,
      supportedCountries: this.supportedCountries,
      features: this.features,
      limits: this.limits,
      fees: this.fees,
      healthStatus: this.healthStatus,
      statistics: this.statistics,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata
    };
  }
}

/**
 * Webhook Event Entity
 * Manages webhook events from payment gateways
 */
export class WebhookEvent {
  public id: string;
  public tenantId: string;
  public gateway: PaymentGateway;
  public connectorId: string;
  public eventType: string;
  public eventId: string;
  public transactionId?: string;
  public payload: any;
  public headers: Record<string, string>;
  public signature?: string;
  public isVerified: boolean;
  public isProcessed: boolean;
  public processingStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  public processingAttempts: number;
  public maxRetries: number;
  public lastProcessingAttempt?: Date;
  public processingError?: string;
  public receivedAt: Date;
  public processedAt?: Date;
  public metadata: Record<string, any>;

  constructor(data: Partial<WebhookEvent>) {
    this.id = data.id || this.generateId();
    this.tenantId = data.tenantId || '';
    this.gateway = data.gateway || PaymentGateway.RAZORPAY;
    this.connectorId = data.connectorId || '';
    this.eventType = data.eventType || '';
    this.eventId = data.eventId || '';
    this.transactionId = data.transactionId;
    this.payload = data.payload || {};
    this.headers = data.headers || {};
    this.signature = data.signature;
    this.isVerified = data.isVerified || false;
    this.isProcessed = data.isProcessed || false;
    this.processingStatus = data.processingStatus || 'pending';
    this.processingAttempts = data.processingAttempts || 0;
    this.maxRetries = data.maxRetries || 3;
    this.lastProcessingAttempt = data.lastProcessingAttempt;
    this.processingError = data.processingError;
    this.receivedAt = data.receivedAt || new Date();
    this.processedAt = data.processedAt;
    this.metadata = data.metadata || {};
  }

  private generateId(): string {
    return `wh_${this.gateway}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  public markAsVerified(): void {
    this.isVerified = true;
    this.metadata.verifiedAt = new Date();
  }

  public startProcessing(): void {
    this.processingStatus = 'processing';
    this.processingAttempts++;
    this.lastProcessingAttempt = new Date();
  }

  public markAsCompleted(): void {
    this.processingStatus = 'completed';
    this.isProcessed = true;
    this.processedAt = new Date();
  }

  public markAsFailed(error: string): void {
    this.processingStatus = 'failed';
    this.processingError = error;
    this.lastProcessingAttempt = new Date();
  }

  public canRetry(): boolean {
    return this.processingAttempts < this.maxRetries && 
           this.processingStatus === 'failed';
  }

  public scheduleRetry(): void {
    if (this.canRetry()) {
      this.processingStatus = 'retrying';
      // Exponential backoff: 2^attempt minutes
      const delayMinutes = Math.pow(2, this.processingAttempts);
      this.metadata.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
    }
  }

  public extractTransactionInfo(): {
    transactionId?: string;
    status?: PaymentStatus;
    amount?: number;
    currency?: string;
    gatewayTransactionId?: string;
  } {
    // This would be gateway-specific logic
    const info: any = {};
    
    if (this.payload.transaction_id || this.payload.id) {
      info.transactionId = this.payload.transaction_id || this.payload.id;
    }
    
    if (this.payload.status) {
      info.status = this.mapGatewayStatus(this.payload.status);
    }
    
    if (this.payload.amount) {
      info.amount = this.payload.amount;
    }
    
    if (this.payload.currency) {
      info.currency = this.payload.currency;
    }
    
    if (this.payload.gateway_transaction_id || this.payload.reference_id) {
      info.gatewayTransactionId = this.payload.gateway_transaction_id || this.payload.reference_id;
    }
    
    return info;
  }

  private mapGatewayStatus(gatewayStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'success': PaymentStatus.SUCCESS,
      'completed': PaymentStatus.SUCCESS,
      'paid': PaymentStatus.SUCCESS,
      'failed': PaymentStatus.FAILED,
      'error': PaymentStatus.FAILED,
      'cancelled': PaymentStatus.CANCELLED,
      'pending': PaymentStatus.PENDING,
      'processing': PaymentStatus.PROCESSING,
      'refunded': PaymentStatus.REFUNDED
    };
    
    return statusMap[gatewayStatus.toLowerCase()] || PaymentStatus.PENDING;
  }

  public toJSON(): any {
    return {
      id: this.id,
      tenantId: this.tenantId,
      gateway: this.gateway,
      connectorId: this.connectorId,
      eventType: this.eventType,
      eventId: this.eventId,
      transactionId: this.transactionId,
      payload: this.payload,
      headers: this.headers,
      signature: this.signature ? '***masked***' : undefined,
      isVerified: this.isVerified,
      isProcessed: this.isProcessed,
      processingStatus: this.processingStatus,
      processingAttempts: this.processingAttempts,
      maxRetries: this.maxRetries,
      lastProcessingAttempt: this.lastProcessingAttempt,
      processingError: this.processingError,
      receivedAt: this.receivedAt,
      processedAt: this.processedAt,
      metadata: this.metadata
    };
  }
}

/**
 * Data Synchronization Entity
 * Manages data synchronization between systems
 */
export class DataSynchronization {
  public id: string;
  public tenantId: string;
  public sourceSystem: string;
  public targetSystem: string;
  public syncType: 'full' | 'incremental' | 'real_time' | 'scheduled';
  public dataType: 'transactions' | 'customers' | 'gateways' | 'configurations' | 'analytics';
  public status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  public progress: {
    totalRecords: number;
    processedRecords: number;
    successfulRecords: number;
    failedRecords: number;
    percentage: number;
  };
  public configuration: {
    batchSize: number;
    parallelProcessing: boolean;
    maxConcurrency: number;
    retryAttempts: number;
    retryDelay: number;
    filters?: Record<string, any>;
    mapping?: Record<string, string>;
  };
  public schedule?: {
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    time?: string; // HH:MM format
    dayOfWeek?: number; // 0-6, 0 = Sunday
    dayOfMonth?: number; // 1-31
    timezone: string;
    nextRun?: Date;
  };
  public startedAt?: Date;
  public completedAt?: Date;
  public lastRunAt?: Date;
  public nextRunAt?: Date;
  public errors: Array<{
    timestamp: Date;
    recordId?: string;
    error: string;
    details?: any;
  }>;
  public createdAt: Date;
  public updatedAt: Date;
  public metadata: Record<string, any>;

  constructor(data: Partial<DataSynchronization>) {
    this.id = data.id || this.generateId();
    this.tenantId = data.tenantId || '';
    this.sourceSystem = data.sourceSystem || '';
    this.targetSystem = data.targetSystem || '';
    this.syncType = data.syncType || 'incremental';
    this.dataType = data.dataType || 'transactions';
    this.status = data.status || 'pending';
    this.progress = data.progress || {
      totalRecords: 0,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      percentage: 0
    };
    this.configuration = data.configuration || {
      batchSize: 100,
      parallelProcessing: false,
      maxConcurrency: 5,
      retryAttempts: 3,
      retryDelay: 5000
    };
    this.schedule = data.schedule;
    this.startedAt = data.startedAt;
    this.completedAt = data.completedAt;
    this.lastRunAt = data.lastRunAt;
    this.nextRunAt = data.nextRunAt;
    this.errors = data.errors || [];
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.metadata = data.metadata || {};
  }

  private generateId(): string {
    return `sync_${this.dataType}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  public start(): void {
    this.status = 'running';
    this.startedAt = new Date();
    this.updatedAt = new Date();
    this.resetProgress();
  }

  public complete(): void {
    this.status = 'completed';
    this.completedAt = new Date();
    this.lastRunAt = new Date();
    this.updatedAt = new Date();
    this.calculateNextRun();
  }

  public fail(error: string): void {
    this.status = 'failed';
    this.completedAt = new Date();
    this.lastRunAt = new Date();
    this.updatedAt = new Date();
    this.addError(error);
  }

  public pause(): void {
    this.status = 'paused';
    this.updatedAt = new Date();
  }

  public resume(): void {
    this.status = 'running';
    this.updatedAt = new Date();
  }

  public updateProgress(
    totalRecords: number,
    processedRecords: number,
    successfulRecords: number,
    failedRecords: number
  ): void {
    this.progress = {
      totalRecords,
      processedRecords,
      successfulRecords,
      failedRecords,
      percentage: totalRecords > 0 ? (processedRecords / totalRecords) * 100 : 0
    };
    this.updatedAt = new Date();
  }

  private resetProgress(): void {
    this.progress = {
      totalRecords: 0,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      percentage: 0
    };
  }

  public addError(error: string, recordId?: string, details?: any): void {
    this.errors.push({
      timestamp: new Date(),
      recordId,
      error,
      
(Content truncated due to size limit. Use line ranges to read in chunks)