/**
 * Module 3 Phase 3.1: Advanced Automation Foundation
 * Integration Layer Entities
 * 
 * Comprehensive entities for API gateway, service mesh, external integrations,
 * webhook management, and microservice orchestration
 */

import {
  IntegrationStatus,
  IntegrationType,
  ProtocolType,
  AuthenticationType,
  DataFormat,
  SyncMode,
  ErrorHandlingStrategy,
  RetryStrategy,
  LoadBalancingStrategy,
  HealthCheckType,
  CircuitBreakerState,
  RateLimitStrategy,
  CachingStrategy,
  CompressionType,
  SecurityLevel,
  MonitoringLevel,
  AlertSeverity,
  WebhookEventType,
  WebhookStatus,
  APIGatewayFeature,
  ServiceMeshFeature,
  IntegrationPattern,
  MessageQueueType,
  EventType,
  TransformationType
} from '../../shared/enums/workflow-orchestration.enum';

import {
  IIntegrationConfiguration,
  IAPIGatewayConfiguration,
  IServiceMeshConfiguration,
  IWebhookConfiguration,
  IExternalSystemConfiguration,
  IDataTransformation,
  IIntegrationMetrics,
  IIntegrationHealth,
  IIntegrationEvent,
  IIntegrationLog,
  ICircuitBreakerConfiguration,
  IRateLimitConfiguration,
  ILoadBalancerConfiguration,
  ICacheConfiguration,
  ISecurityConfiguration,
  IMonitoringConfiguration
} from '../../shared/interfaces/workflow-orchestration.interface';

/**
 * API Gateway Configuration Entity
 * Manages API gateway settings, routing, security, and policies
 */
export class APIGatewayConfigurationEntity implements IAPIGatewayConfiguration {
  public id: string;
  public name: string;
  public description: string;
  public tenantId: string;
  
  // Gateway Configuration
  public listenPort: number;
  public listenAddress: string;
  public enableHttps: boolean;
  public enableHttp2: boolean;
  public enableWebSocket: boolean;
  
  // Routing Configuration
  public routes: IRoute[];
  public defaultRoute?: IRoute;
  public routingStrategy: string;
  public pathRewriting: IPathRewriting[];
  
  // Security Configuration
  public authenticationMethods: AuthenticationType[];
  public authorizationPolicies: IAuthorizationPolicy[];
  public corsConfiguration: ICorsConfiguration;
  public securityHeaders: Record<string, string>;
  public ipWhitelist: string[];
  public ipBlacklist: string[];
  
  // Rate Limiting
  public rateLimitConfiguration: IRateLimitConfiguration;
  public throttlingPolicies: IThrottlingPolicy[];
  
  // Load Balancing
  public loadBalancerConfiguration: ILoadBalancerConfiguration;
  public healthCheckConfiguration: IHealthCheckConfiguration;
  
  // Caching
  public cacheConfiguration: ICacheConfiguration;
  public cachingPolicies: ICachingPolicy[];
  
  // Monitoring & Logging
  public monitoringConfiguration: IMonitoringConfiguration;
  public loggingConfiguration: ILoggingConfiguration;
  public metricsConfiguration: IMetricsConfiguration;
  
  // Features
  public enabledFeatures: APIGatewayFeature[];
  public circuitBreakerConfiguration: ICircuitBreakerConfiguration;
  public retryConfiguration: IRetryConfiguration;
  public timeoutConfiguration: ITimeoutConfiguration;
  
  // Metadata
  public isActive: boolean;
  public version: string;
  public createdAt: Date;
  public updatedAt: Date;
  public createdBy: string;

  // Runtime Statistics
  private requestCount: number = 0;
  private errorCount: number = 0;
  private averageResponseTime: number = 0;
  private uptime: number = 0;
  private lastHealthCheck?: Date;

  constructor(configuration: Partial<IAPIGatewayConfiguration>) {
    this.id = configuration.id || this.generateId();
    this.name = configuration.name || '';
    this.description = configuration.description || '';
    this.tenantId = configuration.tenantId || '';
    
    this.listenPort = configuration.listenPort || 8080;
    this.listenAddress = configuration.listenAddress || '0.0.0.0';
    this.enableHttps = configuration.enableHttps || true;
    this.enableHttp2 = configuration.enableHttp2 || true;
    this.enableWebSocket = configuration.enableWebSocket || true;
    
    this.routes = configuration.routes || [];
    this.defaultRoute = configuration.defaultRoute;
    this.routingStrategy = configuration.routingStrategy || 'path-based';
    this.pathRewriting = configuration.pathRewriting || [];
    
    this.authenticationMethods = configuration.authenticationMethods || [AuthenticationType.JWT];
    this.authorizationPolicies = configuration.authorizationPolicies || [];
    this.corsConfiguration = configuration.corsConfiguration || this.createDefaultCorsConfiguration();
    this.securityHeaders = configuration.securityHeaders || this.createDefaultSecurityHeaders();
    this.ipWhitelist = configuration.ipWhitelist || [];
    this.ipBlacklist = configuration.ipBlacklist || [];
    
    this.rateLimitConfiguration = configuration.rateLimitConfiguration || this.createDefaultRateLimitConfiguration();
    this.throttlingPolicies = configuration.throttlingPolicies || [];
    
    this.loadBalancerConfiguration = configuration.loadBalancerConfiguration || this.createDefaultLoadBalancerConfiguration();
    this.healthCheckConfiguration = configuration.healthCheckConfiguration || this.createDefaultHealthCheckConfiguration();
    
    this.cacheConfiguration = configuration.cacheConfiguration || this.createDefaultCacheConfiguration();
    this.cachingPolicies = configuration.cachingPolicies || [];
    
    this.monitoringConfiguration = configuration.monitoringConfiguration || this.createDefaultMonitoringConfiguration();
    this.loggingConfiguration = configuration.loggingConfiguration || this.createDefaultLoggingConfiguration();
    this.metricsConfiguration = configuration.metricsConfiguration || this.createDefaultMetricsConfiguration();
    
    this.enabledFeatures = configuration.enabledFeatures || [
      APIGatewayFeature.AUTHENTICATION,
      APIGatewayFeature.AUTHORIZATION,
      APIGatewayFeature.RATE_LIMITING,
      APIGatewayFeature.LOAD_BALANCING,
      APIGatewayFeature.CACHING,
      APIGatewayFeature.MONITORING
    ];
    
    this.circuitBreakerConfiguration = configuration.circuitBreakerConfiguration || this.createDefaultCircuitBreakerConfiguration();
    this.retryConfiguration = configuration.retryConfiguration || this.createDefaultRetryConfiguration();
    this.timeoutConfiguration = configuration.timeoutConfiguration || this.createDefaultTimeoutConfiguration();
    
    this.isActive = configuration.isActive !== false;
    this.version = configuration.version || '1.0.0';
    this.createdAt = configuration.createdAt || new Date();
    this.updatedAt = configuration.updatedAt || new Date();
    this.createdBy = configuration.createdBy || '';
  }

  /**
   * Validate API gateway configuration
   */
  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Gateway name is required');
    }

    if (!this.tenantId || this.tenantId.trim().length === 0) {
      errors.push('Tenant ID is required');
    }

    if (this.listenPort < 1 || this.listenPort > 65535) {
      errors.push('Listen port must be between 1 and 65535');
    }

    if (this.routes.length === 0) {
      errors.push('At least one route must be configured');
    }

    // Validate routes
    this.routes.forEach((route, index) => {
      if (!route.path || route.path.trim().length === 0) {
        errors.push(`Route ${index + 1}: Path is required`);
      }
      if (!route.target || route.target.trim().length === 0) {
        errors.push(`Route ${index + 1}: Target is required`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Add route
   */
  public addRoute(route: IRoute): void {
    this.routes.push(route);
    this.updatedAt = new Date();
  }

  /**
   * Remove route
   */
  public removeRoute(routeId: string): void {
    this.routes = this.routes.filter(route => route.id !== routeId);
    this.updatedAt = new Date();
  }

  /**
   * Update request statistics
   */
  public updateRequestStatistics(responseTime: number, isError: boolean = false): void {
    this.requestCount++;
    
    if (isError) {
      this.errorCount++;
    }
    
    // Update average response time
    this.averageResponseTime = (this.averageResponseTime * (this.requestCount - 1) + responseTime) / this.requestCount;
  }

  /**
   * Get error rate
   */
  public getErrorRate(): number {
    if (this.requestCount === 0) return 0;
    return (this.errorCount / this.requestCount) * 100;
  }

  /**
   * Get gateway statistics
   */
  public getStatistics(): any {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.getErrorRate(),
      averageResponseTime: this.averageResponseTime,
      uptime: this.uptime,
      lastHealthCheck: this.lastHealthCheck,
      routeCount: this.routes.length,
      enabledFeaturesCount: this.enabledFeatures.length
    };
  }

  /**
   * Update health check
   */
  public updateHealthCheck(isHealthy: boolean): void {
    this.lastHealthCheck = new Date();
    if (isHealthy) {
      this.uptime = Date.now() - this.createdAt.getTime();
    }
  }

  /**
   * Create default configurations
   */
  private createDefaultCorsConfiguration(): ICorsConfiguration {
    return {
      enabled: true,
      allowedOrigins: ['*'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
      allowCredentials: true,
      maxAge: 86400
    };
  }

  private createDefaultSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'",
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
  }

  private createDefaultRateLimitConfiguration(): IRateLimitConfiguration {
    return {
      enabled: true,
      strategy: RateLimitStrategy.TOKEN_BUCKET,
      requestsPerMinute: 1000,
      requestsPerHour: 10000,
      requestsPerDay: 100000,
      burstSize: 100,
      keyGenerator: 'ip-based',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      enableDistributedLimiting: true
    };
  }

  private createDefaultLoadBalancerConfiguration(): ILoadBalancerConfiguration {
    return {
      enabled: true,
      strategy: LoadBalancingStrategy.ROUND_ROBIN,
      healthCheckEnabled: true,
      healthCheckInterval: 30000,
      healthCheckTimeout: 5000,
      healthCheckPath: '/health',
      maxRetries: 3,
      retryInterval: 1000,
      enableStickySessions: false,
      sessionAffinityTimeout: 3600000
    };
  }

  private createDefaultHealthCheckConfiguration(): IHealthCheckConfiguration {
    return {
      enabled: true,
      interval: 30000,
      timeout: 5000,
      path: '/health',
      method: 'GET',
      expectedStatusCodes: [200, 204],
      expectedResponseTime: 1000,
      consecutiveFailures: 3,
      consecutiveSuccesses: 2
    };
  }

  private createDefaultCacheConfiguration(): ICacheConfiguration {
    return {
      enabled: true,
      strategy: CachingStrategy.LRU,
      maxSize: 1000,
      ttl: 300000, // 5 minutes
      enableDistributedCache: true,
      cacheKeyGenerator: 'url-based',
      cacheHeaders: ['Cache-Control', 'ETag', 'Last-Modified'],
      varyHeaders: ['Accept', 'Accept-Encoding']
    };
  }

  private createDefaultMonitoringConfiguration(): IMonitoringConfiguration {
    return {
      enabled: true,
      level: MonitoringLevel.DETAILED,
      metricsEnabled: true,
      tracingEnabled: true,
      loggingEnabled: true,
      alertingEnabled: true,
      dashboardEnabled: true,
      exportInterval: 60000,
      retentionPeriod: 2592000000 // 30 days
    };
  }

  private createDefaultLoggingConfiguration(): ILoggingConfiguration {
    return {
      enabled: true,
      level: 'info',
      format: 'json',
      includeRequestBody: false,
      includeResponseBody: false,
      includeHeaders: true,
      maskSensitiveData: true,
      maxLogSize: 10485760, // 10MB
      rotationInterval: 86400000 // 24 hours
    };
  }

  private createDefaultMetricsConfiguration(): IMetricsConfiguration {
    return {
      enabled: true,
      collectRequestMetrics: true,
      collectResponseMetrics: true,
      collectErrorMetrics: true,
      collectPerformanceMetrics: true,
      collectBusinessMetrics: true,
      aggregationInterval: 60000,
      retentionPeriod: 2592000000 // 30 days
    };
  }

  private createDefaultCircuitBreakerConfiguration(): ICircuitBreakerConfiguration {
    return {
      enabled: true,
      failureThreshold: 5,
      recoveryTimeout: 60000,
      monitoringPeriod: 10000,
      expectedExceptionTypes: ['TimeoutException', 'ConnectionException'],
      fallbackEnabled: true,
      fallbackResponse: { message: 'Service temporarily unavailable' }
    };
  }

  private createDefaultRetryConfiguration(): IRetryConfiguration {
    return {
      enabled: true,
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitterEnabled: true,
      retryableStatusCodes: [500, 502, 503, 504],
      retryableExceptions: ['TimeoutException', 'ConnectionException']
    };
  }

  private createDefaultTimeoutConfiguration(): ITimeoutConfiguration {
    return {
      connectionTimeout: 5000,
      requestTimeout: 30000,
      responseTimeout: 30000,
      idleTimeout: 60000,
      keepAliveTimeout: 300000
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `api_gateway_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * External System Integration Entity
 * Manages external system connections, authentication, and data synchronization
 */
export class ExternalSystemIntegrationEntity implements IExternalSystemConfiguration {
  public id: string;
  public name: string;
  public description: string;
  public tenantId: string;
  
  // System Configuration
  public systemType: string;
  public vendor: string;
  public version: string;
  public baseUrl: string;
  public endpoints: IEndpoint[];
  
  // Connection Configuration
  public connectionConfiguration: IConnectionConfiguration;
  public authenticationConfiguration: IAuthenticationConfiguration;
  public securityConfiguration: ISecurityConfiguration;
  
  // Data Configuration
  public dataFormat: DataFormat;
  public supportedOperations: string[];
  public dataMapping: IDataMapping[];
  public transformationRules: ITransformationRule[];
  
  // Synchronization Configuration
  public syncMode: SyncMode;
  public syncSchedule?: string;
  public syncBatchSize: number;
  public syncTimeout: number;
  public conflictResolution: string;
  
  // Error Handling
  public errorHandlingStrategy: ErrorHandlingStrategy;
  public retryConfiguration: IRetryConfiguration;
  public fallbackConfiguration?: IFallbackConfiguration;
  
  // Monitoring
  public monitoringConfiguration: IMonitoringConfiguration;
  public healthCheckConfiguration: IHealthCheckConfiguration;
  public alertConfiguration: IAlertConfiguration;
  
  // Status
  public status: IntegrationStatus;
  public lastSyncAt?: Date;
  public lastHealthCheckAt?: Date;
  public isActive: boolean;
  public createdAt: Date;
  public updatedAt: Date;

  // Runtime Statistics
  private syncCount: number = 0;
  private successfulSyncs: number = 0;
  private failedSyncs: number = 0;
  private averageSyncTime: number = 0;
  private lastError?: string;
  private errorCount: number = 0;

  constructor(configuration: Partial<IExternalSystemConfiguration>) {
    this.id = configuration.id || this.generateId();
    this.name = configuration.name || '';
    this.description = configuration.description || '';
    this.tenantId = configuration.tenantId || '';
    
    this.systemType = configuration.systemType || '';
    this.vendor = configuration.vendor || '';
    this.version = configuration.version || '1.0.0';
    this.baseUrl = configuration.baseUrl || '';
    this.endpoints = configuration.endpoints || [];
    
    this.connectionConfiguration = configuration.connectionConfiguration || this.createDefaultConnectionConfiguration();
    this.authenticationConfiguration = configuration.authenticationConfiguration || this.createDefaultAuthenticationConfiguration();
    this.securityConfiguration = configuration.securityConfiguration || this.createDefaultSecurityConfiguration();
    
    this.dataFormat = configuration.dataFormat || DataFormat.JSON;
    this.supportedOperations = configuration.supportedOperations || ['CREATE', 'READ', 'UPDATE', 'DELETE'];
    this.dataMapping = configuration.dataMapping || [];
    this.transformationRules = configuration.transformationRules || [];
    
    this.syncMode = configuration.syncMode || SyncMode.REAL_TIME;
    this.syncSchedule = configuration.syncSchedule;
    this.syncBatchSize = configuration.syncBatchSize || 100;
    this.syncTimeout = configuration.syncTimeout || 30000;
    this.conflictResolution = configuration.conflictResolution || 'last-write-wins';
    
    this.errorHandlingStrategy = configuration.errorHandlingStrategy || ErrorHandlingStrategy.RETRY_WITH_BACKOFF;
    this.retryConfiguration = configuration.retryConfiguration || this.createDefaultRetryConfiguration();
    this.fallbackConfiguration = configuration.fallbackConfiguration;
    
    this.monitoringConfiguration = configuration.monitoringConfiguration || this.createDefaultMonitoringConfiguration();
    this.healthCheckConfiguration = configuration.healthCheckConfiguration || this.createDefaultHealthCheckConfiguration();
    this.alertConfiguration = configuration.alertConfiguration || this.createDefaultAlertConfiguration();
    
    this.status = configuration.status || IntegrationStatus.INACTIVE;
    this.lastSyncAt = configuration.lastSyncAt;
    this.lastHealthCheckAt = configuration.lastHealthCheckAt;
    this.isActive = configuration.isActive !== false;
    this.createdAt = configuration.createdAt || new Date();
    this.updatedAt = configuration.updatedAt || new Date();
  }

  /**
   * Validate integration configuration
   */
  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Integration name is required');
    }

    if (!this.tenantId || this.tenantId.trim().length === 0) {
      errors.push('Tenant ID is required');
    }

    if (!this.systemType || this.systemType.trim().length === 0) {
      errors.push('System type is required');
    }

    if (!this.baseUrl || this.baseUrl.trim().length === 0) {
      errors.push('Base URL is required');
    }

    if (this.endpoints.length === 0) {
      errors.push('At least one endpoint must be configured');
    }

    if (this.syncBatchSize < 1 || this.syncBatchSize > 10000) {
      errors.push('Sync batch size must be between 1 and 10000');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Update sync statistics
   */
  public updateSyncStatistics(syncTime: number, isSuccess: boolean, error?: string): void {
    this.syncCount++;
    
    if (isSuccess) {
      this.successfulSyncs++;
      this.lastSyncAt = new Date();
    } else {
      this.failedSyncs++;
      this.errorCount++;
      this.lastError = error;
    }
    
    // Update average sync time
    this.averageSyncTime = (this.averageSyncTime * (this.syncCount - 1) + syncTime) / this.syncCount;
  }

  /**
   * Get success rate
   */
  public getSuccessRate(): number {
    if (this.syncCount === 0) return 100;
    return (this.successfulSyncs / this.syncCount) * 100;
  }

  /**
   * Get integration statistics
   */
  public getStatistics(): any {
    return {
      syncCount: this.syncCount,
      successfulSyncs: this.successfulSyncs,
      failedSyncs: this.failedSyncs,
      successRate: this.getSuccessRate(),
      averageSyncTime: this.averageSyncTime,
      errorCount: this.errorCount,
      lastError: this.lastError,
      lastSyncAt: this.lastSyncAt,
      lastHealthCheckAt: this.lastHealthCheckAt,
      status: this.status
    };
  }

  /**
   * Update health status
   */
  public updateHealthStatus(isHealthy: boolean, details?: any): void {
    this.lastHealthCheckAt = new Date();
    this.status = isHealthy ? IntegrationStatus.ACTIVE : IntegrationStatus.ERROR;
    
    if (!isHealthy && details) {
      this.lastError = details.error || 'Health check failed';
    }
  }

  /**
   * Create default configurations
   */
  private createDefaultConnectionConfiguration(): IConnectionConfiguration {
    return {
      timeout: 30000,
      retries: 3,
      keepAlive: true,
      poolSize: 10,
      maxIdleTime: 300000,
      enableCompression: true,
      compressionType: CompressionType.GZIP
    };
  }

  private createDefaultAuthenticationConfiguration(): IAuthenticationConfiguration {
    return {
      type: AuthenticationType.API_KEY,
      credentials: {},
      tokenRefreshEnabled: false,
      tokenRefreshInterval: 3600000
    };
  }

  private createDefaultSecurityConfiguration(): ISecurityConfiguration {
    return {
      enableTls: true,
      tlsVersion: '1.2',
      certificateValidation: true,
      enableMutualTls: false,
      encryptionEnabled: true,
      encryptionAlgorithm: 'AES-256-GCM'
    };
  }

  private createDefaultRetryConfiguration(): IRetryConfiguration {
    return {
      enabled: true,
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitterEnabled: true,
      retryableStatusCodes: [500, 502, 503, 504],
      retryableExceptions: ['TimeoutException', 'ConnectionException']
    };
  }

  private createDefaultMonitoringConfiguration(): IMonitoringConfiguration {
    return {
      enabled: true,
      level: MonitoringLevel.STANDARD,
      metricsEnabled: true,
      tracingEnabled: true,
      loggingEnabled: true,
      alertingEnabled: true,
      dashboardEnabled: true,
      exportInterval: 60000,
      retentionPeriod: 2592000000 // 30 days
    };
  }

  private createDefaultHealthCheckConfiguration(): IHealthCheckConfiguration {
    return {
      enabled: true,
      interval: 60000,
      timeout: 10000,
      path: '/health',
      method: 'GET',
      expectedStatusCodes: [200, 204],
      expectedResponseTime: 5000,
      consecutiveFailures: 3,
      consecutiveSuccesses: 2
    };
  }

  private createDefaultAlertConfiguration(): IAlertConfiguration {
    return {
      enabled: true,
      thresholds: {
        errorRate: 5,
        responseTime: 5000,
        availability: 95
      },
      channels: ['email', 'webhook'],
      escalationPolicy: 'immediate',
      suppressionRules: []
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `ext_system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Webhook Configuration Entity
 * Manages webhook endpoints, events, security, and delivery
 */
export class WebhookConfigurationEntity implements IWebhookConfiguration {
  public id: string;
  public name: string;
  public description: string;
  public tenantId: string;
  
  // Webhook Configuration
  public url: string;
  public method: string;
  public headers: Record<string, string>;
  public timeout: number;
  public retryConfiguration: IRetryConfiguration;
  
  // Event Configuration
  public eventTypes: WebhookEventType[];
  public eventFilters: IEventFilter[];
  public eventTransformation?: IEventTransformation;
  
  // Security Configuration
  public securityConfiguration: IWebhookSecurityConfiguration;
  public authenticationConfiguration?: IAuthenticationConfiguration;
  
  // Delivery Configuration
  public deliveryMode: string;
  public batchSize?: number;
  public batchTimeout?: number;
  public orderingGuarantee: boolean;
  public duplicateDetection: boolean;
  
  // Status
  public status: WebhookStatus;
  public isActive: boolean;
  public lastDeliveryAt?: Date;
  public lastSuccessAt?: Date;
  public lastFailureAt?: Date;
  public createdAt: Date;
  public updatedAt: Date;

  // Runtime Statistics
  private deliveryCount: number = 0;
  private successfulDeliveries: number = 0;
  private failedDeliveries: number = 0;
  private averageDeliveryTime: number = 0;
  private consecutiveFailures: number = 0;

  constructor(configuration: Partial<IWebhookConfiguration>) {
    this.id = configuration.id || this.generateId();
    this.name = configuration.name || '';
    this.description = configuration.description || '';
    this.tenantId = configuration.tenantId || '';
    
    this.url = configuration.url || '';
    this.method = configuration.method || 'POST';
    this.headers = configuration.headers || { 'Content-Type': 'application/json' };
    this.timeout = configuration.timeout || 30000;
    this.retryConfiguration = configuration.retryConfiguration || this.createDefaultRetryConfiguration();
    
    this.eventTypes = configuration.eventTypes || [];
    this.eventFilters = configuration.eventFilters || [];
    this.eventTransformation = configuration.eventTransformation;
    
    this.securityConfiguration = configuration.securityConfiguration || this.createDefaultSecurityConfiguration();
    this.authenticationConfiguration = configuration.authenticationConfiguration;
    
    this.deliveryMode = configuration.deliveryMode || 'immediate';
    this.batchSize = configuration.batchSize;
    this.batchTimeout = configuration.batchTimeout;
    this.orderingGuarantee = configuration.orderingGuarantee || false;
    this.duplicateDetection = configuration.duplicateDetection || true;
    
    this.status = configuration.status || WebhookStatus.ACTIVE;
    this.isActive = configuration.isActive !== false;
    this.lastDeliveryAt = configuration.lastDeliveryAt;
    this.lastSuccessAt = configuration.lastSuccessAt;
    this.lastFailureAt = configuration.lastFailureAt;
    this.createdAt = configuration.createdAt || new Date();
    this.updatedAt = configuration.updatedAt || new Date();
  }

  /**
   * Validate webhook configuration
   */
  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Webhook name is required');
    }

    if (!this.tenantId || this.tenantId.trim().length === 0) {
      errors.push('Tenant ID is required');
    }

    if (!this.url || this.url.trim().length === 0) {
      errors.push('Webhook URL is required');
    }

    if (!this.isValidUrl(this.url)) {
      errors.push('Invalid webhook URL format');
    }

    if (this.eventTypes.length === 0) {
      errors.push('At least one event type must be configured');
    }

    if (this.timeout < 1000 || this.timeout > 300000) {
      errors.push('Timeout must be between 1 second and 5 minutes');
    }

    if (this.batchSize && (this.batchSize < 1 || this.batchSize > 1000)) {
      errors.push('Batch size must be between 1 and 1000');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Update delivery statistics
   */
  public updateDeliveryStatistics(deliveryTime: number, isSuccess: boolean): void {
    this.deliveryCount++;
    this.lastDeliveryAt = new Date();
    
    if (isSuccess) {
      this.successfulDeliveries++;
      this.lastSuccessAt = new Date();
      this.consecutiveFailures = 0;
      
      if (this.status === WebhookStatus.FAILED) {
        this.status = WebhookStatus.ACTIVE;
      }
    } else {
      this.failedDeliveries++;
      this.lastFailureAt = new Date();
      this.consecutiveFailures++;
      
      // Mark as failed after 5 consecutive failures
      if (this.consecutiveFailures >= 5) {
        this.status = WebhookStatus.FAILED;
      }
    }
    
    // Update average delivery time
    this.averageDeliveryTime = (this.averageDeliveryTime * (this.deliveryCount - 1) + deliveryTime) / this.deliveryCount;
  }

  /**
   * Get success rate
   */
  public getSuccessRate(): number {
    if (this.deliveryCount === 0) return 100;
    return (this.successfulDeliveries / this.deliveryCount) * 100;
  }

  /**
   * Get webhook statistics
   */
  public getStatistics(): any {
    return {
      deliveryCount: this.deliveryCount,
      successfulDeliveries: this.successfulDeliveries,
      failedDeliveries: this.failedDeliveries,
      successRate: this.getSuccessRate(),
      averageDeliveryTime: this.averageDeliveryTime,
      consecutiveFailures: this.consecutiveFailures,
      lastDeliveryAt: this.lastDeliveryAt,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      status: this.status
    };
  }

  /**
   * Check if event should be delivered
   */
  public shouldDeliverEvent(eventType: WebhookEventType, eventData: any): boolean {
    // Check if event type is subscribed
    if (!this.eventTypes.includes(eventType)) {
      return false;
    }

    // Check event filters
    return this.eventFilters.every(filter => this.evaluateFilter(filter, eventData));
  }

  /**
   * Transform event data
   */
  public transformEventData(eventData: any): any {
    if (!this.eventTransformation) {
      return eventData;
    }

    // Apply transformation rules
    return this.applyTransformation(eventData, this.eventTransformation);
  }

  /**
   * Helper methods
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private evaluateFilter(filter: IEventFilter, eventData: any): boolean {
    // Simple filter evaluation (can be extended)
    const value = this.getNestedValue(eventData, filter.field);
    
    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'not_equals':
        return value !== filter.value;
      case 'contains':
        return String(value).includes(String(filter.value));
      case 'greater_than':
        return Number(value) > Number(filter.value);
      case 'less_than':
        return Number(value) < Number(filter.value);
      default:
        return true;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private applyTransformation(data: any, transformation: IEventTransformation): any {
    // Apply transformation rules (simplified implementation)
    let result = { ...data };
    
    if (transformation.fieldMappings) {
      transformation.fieldMappings.forEach(mapping => {
        const value = this.getNestedValue(data, mapping.source);
        this.setNestedValue(result, mapping.target, value);
      });
    }
    
    if (transformation.excludeFields) {
      transformation.excludeFields.forEach(field => {
        this.deleteNestedValue(result, field);
      });
    }
    
    return result;
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private deleteNestedValue(obj: any, path: string): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => current?.[key], obj);
    if (target) {
      delete target[lastKey];
    }
  }

  /**
   * Create default configurations
   */
  private createDefaultRetryConfiguration(): IRetryConfiguration {
    return {
      enabled: true,
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 60000,
      backoffMultiplier: 2,
      jitterEnabled: true,
      retryableStatusCodes: [500, 502, 503, 504, 408, 429],
      retryableExceptions: ['TimeoutException', 'ConnectionException']
    };
  }

  private createDefaultSecurityConfiguration(): IWebhookSecurityConfiguration {
    return {
      enableSignature: true,
      signatureAlgorithm: 'HMAC-SHA256',
      signatureHeader: 'X-Webhook-Signature',
      enableTimestamp: true,
      timestampHeader: 'X-Webhook-Timestamp',
      timestampTolerance: 300000, // 5 minutes
      enableIpWhitelist: false,
      ipWhitelist: []
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Supporting interfaces
interface IRoute {
  id: string;
  path: string;
  target: string;
  methods: string[];
  priority: number;
  isActive: boolean;
  middleware: string[];
  rateLimit?: IRateLimitConfiguration;
  cache?: ICacheConfiguration;
  authentication?: IAuthenticationConfiguration;
  authorization?: IAuthorizationPolicy;
}

interface IPathRewriting {
  pattern: string;
  replacement: string;
  isRegex: boolean;
}

interface IAuthorizationPolicy {
  id: string;
  name: string;
  rules: IAuthorizationRule[];
  effect: 'allow' | 'deny';
}

interface IAuthorizationRule {
  resource: string;
  action: string;
  conditions: ICondition[];
}

interface ICondition {
  field: string;
  operator: string;
  value: any;
}

interface ICorsConfiguration {
  enabled: boolean;
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  allowCredentials: boolean;
  maxAge: number;
}

interface IThrottlingPolicy {
  id: string;
  name: string;
  rules: IThrottlingRule[];
  isActive: boolean;
}

interface IThrottlingRule {
  condition: ICondition;
  limit: number;
  window: number;
  action: string;
}

interface ICachingPolicy {
  id: string;
  name: string;
  rules: ICachingRule[];
  isActive: boolean;
}

interface ICachingRule {
  condition: ICondition;
  ttl: number;
  varyBy: string[];
  excludeHeaders: string[];
}

interface ILoggingConfiguration {
  enabled: boolean;
  level: string;
  format: string;
  includeRequestBody: boolean;
  includeResponseBody: boolean;
  includeHeaders: boolean;
  maskSensitiveData: boolean;
  maxLogSize: number;
  rotationInterval: number;
}

interface IMetricsConfiguration {
  enabled: boolean;
  collectRequestMetrics: boolean;
  collectResponseMetrics: boolean;
  collectErrorMetrics: boolean;
  collectPerformanceMetrics: boolean;
  collectBusinessMetrics: boolean;
  aggregationInterval: number;
  retentionPeriod: number;
}

interface IRetryConfiguration {
  enabled: boolean;
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
  retryableStatusCodes: number[];
  retryableExceptions: string[];
}

interface ITimeoutConfiguration {
  connectionTimeout: number;
  requestTimeout: number;
  responseTimeout: number;
  idleTimeout: number;
  keepAliveTimeout: number;
}

interface IEndpoint {
  id: string;
  path: string;
  method: string;
  description: string;
  parameters: IParameter[];
  requestSchema?: any;
  responseSchema?: any;
}

interface IParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: any;
}

interface IConnectionConfiguration {
  timeout: number;
  retries: number;
  keepAlive: boolean;
  poolSize: number;
  maxIdleTime: number;
  enableCompression: boolean;
  compressionType: CompressionType;
}

interface IDataMapping {
  sourceField: string;
  targetField: string;
  transformation?: string;
  defaultValue?: any;
}

interface ITransformationRule {
  id: string;
  name: string;
  type: TransformationType;
  configuration: any;
  isActive: boolean;
}

interface IFallbackConfiguration {
  enabled: boolean;
  strategy: string;
  fallbackData?: any;
  fallbackService?: string;
}

interface IAlertConfiguration {
  enabled: boolean;
  thresholds: Record<string, number>;
  channels: string[];
  escalationPolicy: string;
  suppressionRules: ISuppressionRule[];
}

interface ISuppressionRule {
  condition: ICondition;
  duration: number;
}

interface IEventFilter {
  field: string;
  operator: string;
  value: any;
}

interface IEventTransformation {
  fieldMappings?: IFieldMapping[];
  excludeFields?: string[];
  includeFields?: string[];
  customTransformation?: string;
}

interface IFieldMapping {
  source: string;
  target: string;
  transformation?: string;
}

interface IWebhookSecurityConfiguration {
  enableSignature: boolean;
  signatureAlgorithm: string;
  signatureHeader: string;
  enableTimestamp: boolean;
  timestampHeader: string;
  timestampTolerance: number;
  enableIpWhitelist: boolean;
  ipWhitelist: string[];
}

