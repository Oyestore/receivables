"use strict";
/**
 * Module 3 Phase 3.1: Advanced Automation Foundation
 * Integration Layer Entities
 *
 * Comprehensive entities for API gateway, service mesh, external integrations,
 * webhook management, and microservice orchestration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookConfigurationEntity = exports.ExternalSystemIntegrationEntity = exports.APIGatewayConfigurationEntity = void 0;
const workflow_orchestration_enum_1 = require("../../shared/enums/workflow-orchestration.enum");
/**
 * API Gateway Configuration Entity
 * Manages API gateway settings, routing, security, and policies
 */
class APIGatewayConfigurationEntity {
    constructor(configuration) {
        // Runtime Statistics
        this.requestCount = 0;
        this.errorCount = 0;
        this.averageResponseTime = 0;
        this.uptime = 0;
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
        this.authenticationMethods = configuration.authenticationMethods || [workflow_orchestration_enum_1.AuthenticationType.JWT];
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
            workflow_orchestration_enum_1.APIGatewayFeature.AUTHENTICATION,
            workflow_orchestration_enum_1.APIGatewayFeature.AUTHORIZATION,
            workflow_orchestration_enum_1.APIGatewayFeature.RATE_LIMITING,
            workflow_orchestration_enum_1.APIGatewayFeature.LOAD_BALANCING,
            workflow_orchestration_enum_1.APIGatewayFeature.CACHING,
            workflow_orchestration_enum_1.APIGatewayFeature.MONITORING
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
    validate() {
        const errors = [];
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
    addRoute(route) {
        this.routes.push(route);
        this.updatedAt = new Date();
    }
    /**
     * Remove route
     */
    removeRoute(routeId) {
        this.routes = this.routes.filter(route => route.id !== routeId);
        this.updatedAt = new Date();
    }
    /**
     * Update request statistics
     */
    updateRequestStatistics(responseTime, isError = false) {
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
    getErrorRate() {
        if (this.requestCount === 0)
            return 0;
        return (this.errorCount / this.requestCount) * 100;
    }
    /**
     * Get gateway statistics
     */
    getStatistics() {
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
    updateHealthCheck(isHealthy) {
        this.lastHealthCheck = new Date();
        if (isHealthy) {
            this.uptime = Date.now() - this.createdAt.getTime();
        }
    }
    /**
     * Create default configurations
     */
    createDefaultCorsConfiguration() {
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
    createDefaultSecurityHeaders() {
        return {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Content-Security-Policy': "default-src 'self'",
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        };
    }
    createDefaultRateLimitConfiguration() {
        return {
            enabled: true,
            strategy: workflow_orchestration_enum_1.RateLimitStrategy.TOKEN_BUCKET,
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
    createDefaultLoadBalancerConfiguration() {
        return {
            enabled: true,
            strategy: workflow_orchestration_enum_1.LoadBalancingStrategy.ROUND_ROBIN,
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
    createDefaultHealthCheckConfiguration() {
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
    createDefaultCacheConfiguration() {
        return {
            enabled: true,
            strategy: workflow_orchestration_enum_1.CachingStrategy.LRU,
            maxSize: 1000,
            ttl: 300000, // 5 minutes
            enableDistributedCache: true,
            cacheKeyGenerator: 'url-based',
            cacheHeaders: ['Cache-Control', 'ETag', 'Last-Modified'],
            varyHeaders: ['Accept', 'Accept-Encoding']
        };
    }
    createDefaultMonitoringConfiguration() {
        return {
            enabled: true,
            level: workflow_orchestration_enum_1.MonitoringLevel.DETAILED,
            metricsEnabled: true,
            tracingEnabled: true,
            loggingEnabled: true,
            alertingEnabled: true,
            dashboardEnabled: true,
            exportInterval: 60000,
            retentionPeriod: 2592000000 // 30 days
        };
    }
    createDefaultLoggingConfiguration() {
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
    createDefaultMetricsConfiguration() {
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
    createDefaultCircuitBreakerConfiguration() {
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
    createDefaultRetryConfiguration() {
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
    createDefaultTimeoutConfiguration() {
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
    generateId() {
        return `api_gateway_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.APIGatewayConfigurationEntity = APIGatewayConfigurationEntity;
/**
 * External System Integration Entity
 * Manages external system connections, authentication, and data synchronization
 */
class ExternalSystemIntegrationEntity {
    constructor(configuration) {
        // Runtime Statistics
        this.syncCount = 0;
        this.successfulSyncs = 0;
        this.failedSyncs = 0;
        this.averageSyncTime = 0;
        this.errorCount = 0;
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
        this.dataFormat = configuration.dataFormat || workflow_orchestration_enum_1.DataFormat.JSON;
        this.supportedOperations = configuration.supportedOperations || ['CREATE', 'READ', 'UPDATE', 'DELETE'];
        this.dataMapping = configuration.dataMapping || [];
        this.transformationRules = configuration.transformationRules || [];
        this.syncMode = configuration.syncMode || workflow_orchestration_enum_1.SyncMode.REAL_TIME;
        this.syncSchedule = configuration.syncSchedule;
        this.syncBatchSize = configuration.syncBatchSize || 100;
        this.syncTimeout = configuration.syncTimeout || 30000;
        this.conflictResolution = configuration.conflictResolution || 'last-write-wins';
        this.errorHandlingStrategy = configuration.errorHandlingStrategy || workflow_orchestration_enum_1.ErrorHandlingStrategy.RETRY_WITH_BACKOFF;
        this.retryConfiguration = configuration.retryConfiguration || this.createDefaultRetryConfiguration();
        this.fallbackConfiguration = configuration.fallbackConfiguration;
        this.monitoringConfiguration = configuration.monitoringConfiguration || this.createDefaultMonitoringConfiguration();
        this.healthCheckConfiguration = configuration.healthCheckConfiguration || this.createDefaultHealthCheckConfiguration();
        this.alertConfiguration = configuration.alertConfiguration || this.createDefaultAlertConfiguration();
        this.status = configuration.status || workflow_orchestration_enum_1.IntegrationStatus.INACTIVE;
        this.lastSyncAt = configuration.lastSyncAt;
        this.lastHealthCheckAt = configuration.lastHealthCheckAt;
        this.isActive = configuration.isActive !== false;
        this.createdAt = configuration.createdAt || new Date();
        this.updatedAt = configuration.updatedAt || new Date();
    }
    /**
     * Validate integration configuration
     */
    validate() {
        const errors = [];
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
    updateSyncStatistics(syncTime, isSuccess, error) {
        this.syncCount++;
        if (isSuccess) {
            this.successfulSyncs++;
            this.lastSyncAt = new Date();
        }
        else {
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
    getSuccessRate() {
        if (this.syncCount === 0)
            return 100;
        return (this.successfulSyncs / this.syncCount) * 100;
    }
    /**
     * Get integration statistics
     */
    getStatistics() {
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
    updateHealthStatus(isHealthy, details) {
        this.lastHealthCheckAt = new Date();
        this.status = isHealthy ? workflow_orchestration_enum_1.IntegrationStatus.ACTIVE : workflow_orchestration_enum_1.IntegrationStatus.ERROR;
        if (!isHealthy && details) {
            this.lastError = details.error || 'Health check failed';
        }
    }
    /**
     * Create default configurations
     */
    createDefaultConnectionConfiguration() {
        return {
            timeout: 30000,
            retries: 3,
            keepAlive: true,
            poolSize: 10,
            maxIdleTime: 300000,
            enableCompression: true,
            compressionType: workflow_orchestration_enum_1.CompressionType.GZIP
        };
    }
    createDefaultAuthenticationConfiguration() {
        return {
            type: workflow_orchestration_enum_1.AuthenticationType.API_KEY,
            credentials: {},
            tokenRefreshEnabled: false,
            tokenRefreshInterval: 3600000
        };
    }
    createDefaultSecurityConfiguration() {
        return {
            enableTls: true,
            tlsVersion: '1.2',
            certificateValidation: true,
            enableMutualTls: false,
            encryptionEnabled: true,
            encryptionAlgorithm: 'AES-256-GCM'
        };
    }
    createDefaultRetryConfiguration() {
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
    createDefaultMonitoringConfiguration() {
        return {
            enabled: true,
            level: workflow_orchestration_enum_1.MonitoringLevel.STANDARD,
            metricsEnabled: true,
            tracingEnabled: true,
            loggingEnabled: true,
            alertingEnabled: true,
            dashboardEnabled: true,
            exportInterval: 60000,
            retentionPeriod: 2592000000 // 30 days
        };
    }
    createDefaultHealthCheckConfiguration() {
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
    createDefaultAlertConfiguration() {
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
    generateId() {
        return `ext_system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.ExternalSystemIntegrationEntity = ExternalSystemIntegrationEntity;
/**
 * Webhook Configuration Entity
 * Manages webhook endpoints, events, security, and delivery
 */
class WebhookConfigurationEntity {
    constructor(configuration) {
        // Runtime Statistics
        this.deliveryCount = 0;
        this.successfulDeliveries = 0;
        this.failedDeliveries = 0;
        this.averageDeliveryTime = 0;
        this.consecutiveFailures = 0;
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
        this.status = configuration.status || workflow_orchestration_enum_1.WebhookStatus.ACTIVE;
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
    validate() {
        const errors = [];
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
    updateDeliveryStatistics(deliveryTime, isSuccess) {
        this.deliveryCount++;
        this.lastDeliveryAt = new Date();
        if (isSuccess) {
            this.successfulDeliveries++;
            this.lastSuccessAt = new Date();
            this.consecutiveFailures = 0;
            if (this.status === workflow_orchestration_enum_1.WebhookStatus.FAILED) {
                this.status = workflow_orchestration_enum_1.WebhookStatus.ACTIVE;
            }
        }
        else {
            this.failedDeliveries++;
            this.lastFailureAt = new Date();
            this.consecutiveFailures++;
            // Mark as failed after 5 consecutive failures
            if (this.consecutiveFailures >= 5) {
                this.status = workflow_orchestration_enum_1.WebhookStatus.FAILED;
            }
        }
        // Update average delivery time
        this.averageDeliveryTime = (this.averageDeliveryTime * (this.deliveryCount - 1) + deliveryTime) / this.deliveryCount;
    }
    /**
     * Get success rate
     */
    getSuccessRate() {
        if (this.deliveryCount === 0)
            return 100;
        return (this.successfulDeliveries / this.deliveryCount) * 100;
    }
    /**
     * Get webhook statistics
     */
    getStatistics() {
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
    shouldDeliverEvent(eventType, eventData) {
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
    transformEventData(eventData) {
        if (!this.eventTransformation) {
            return eventData;
        }
        // Apply transformation rules
        return this.applyTransformation(eventData, this.eventTransformation);
    }
    /**
     * Helper methods
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        }
        catch {
            return false;
        }
    }
    evaluateFilter(filter, eventData) {
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
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    applyTransformation(data, transformation) {
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
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key])
                current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }
    deleteNestedValue(obj, path) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => current?.[key], obj);
        if (target) {
            delete target[lastKey];
        }
    }
    /**
     * Create default configurations
     */
    createDefaultRetryConfiguration() {
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
    createDefaultSecurityConfiguration() {
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
    generateId() {
        return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.WebhookConfigurationEntity = WebhookConfigurationEntity;
//# sourceMappingURL=integration.entity.js.map