"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiGatewayService = void 0;
const api_gateway_entity_1 = require("../entities/api-gateway.entity");
const logger_util_1 = require("../../shared/utils/logger.util");
/**
 * API Gateway Service
 * Comprehensive API gateway with security, rate limiting, and load balancing
 */
class ApiGatewayService {
    constructor() {
        this.rateLimitConfigs = new Map();
        this.circuitBreakers = new Map();
        this.loadBalancers = new Map();
        this.requestCache = new Map();
        this.activeRequests = new Map();
        this.logger = new logger_util_1.Logger('ApiGatewayService');
        this.initializeDefaultConfigurations();
        this.startHealthCheckScheduler();
        this.startCacheCleanupScheduler();
    }
    /**
     * Initialize default configurations
     */
    initializeDefaultConfigurations() {
        // Default rate limit configurations
        const defaultRateLimits = [
            {
                endpoint: '/api/payments',
                method: 'POST',
                limitType: 'per_minute',
                limit: 100,
                windowSize: 60
            },
            {
                endpoint: '/api/payments/status',
                method: 'GET',
                limitType: 'per_minute',
                limit: 500,
                windowSize: 60
            },
            {
                endpoint: '/api/gateways',
                limitType: 'per_hour',
                limit: 1000,
                windowSize: 3600
            }
        ];
        defaultRateLimits.forEach(config => {
            const rateLimitConfig = new api_gateway_entity_1.RateLimitConfiguration(config);
            this.rateLimitConfigs.set(rateLimitConfig.id, rateLimitConfig);
        });
        // Default circuit breakers
        const defaultCircuitBreakers = [
            {
                serviceName: 'payment-orchestration',
                failureThreshold: 5,
                recoveryTimeout: 60000,
                successThreshold: 3
            },
            {
                serviceName: 'risk-assessment',
                failureThreshold: 3,
                recoveryTimeout: 30000,
                successThreshold: 2
            }
        ];
        defaultCircuitBreakers.forEach(config => {
            const circuitBreaker = new api_gateway_entity_1.CircuitBreaker(config);
            this.circuitBreakers.set(circuitBreaker.serviceName, circuitBreaker);
        });
        // Default load balancer configurations
        const defaultLoadBalancers = [
            {
                serviceName: 'payment-orchestration',
                strategy: 'weighted_round_robin',
                backends: [
                    {
                        id: 'po-1',
                        url: 'http://payment-orchestration-1:3001',
                        weight: 3,
                        isHealthy: true,
                        currentConnections: 0,
                        lastHealthCheck: new Date(),
                        responseTime: 150
                    },
                    {
                        id: 'po-2',
                        url: 'http://payment-orchestration-2:3001',
                        weight: 2,
                        isHealthy: true,
                        currentConnections: 0,
                        lastHealthCheck: new Date(),
                        responseTime: 200
                    }
                ]
            }
        ];
        defaultLoadBalancers.forEach(config => {
            const loadBalancer = new api_gateway_entity_1.LoadBalancerConfiguration(config);
            this.loadBalancers.set(loadBalancer.serviceName, loadBalancer);
        });
        this.logger.info('Default API Gateway configurations initialized', {
            rateLimitConfigs: this.rateLimitConfigs.size,
            circuitBreakers: this.circuitBreakers.size,
            loadBalancers: this.loadBalancers.size
        });
    }
    /**
     * Process incoming API request
     */
    async processRequest(endpoint, method, headers, body, queryParams, ipAddress, userAgent) {
        const startTime = Date.now();
        // Create API request
        const apiRequest = new api_gateway_entity_1.ApiRequest({
            endpoint,
            method,
            headers,
            body,
            queryParams,
            ipAddress: ipAddress || 'unknown',
            userAgent: userAgent || 'unknown'
        });
        this.activeRequests.set(apiRequest.id, apiRequest);
        try {
            this.logger.info('Processing API request', {
                requestId: apiRequest.id,
                endpoint,
                method,
                ipAddress,
                userAgent
            });
            // Step 1: Authentication and Authorization
            const authResult = await this.authenticateRequest(apiRequest);
            if (!authResult.success) {
                const responseTime = Date.now() - startTime;
                apiRequest.setResponse(401, responseTime);
                return {
                    success: false,
                    request: apiRequest,
                    error: authResult.error,
                    statusCode: 401
                };
            }
            apiRequest.isAuthenticated = authResult.isAuthenticated;
            apiRequest.authenticationMethod = authResult.method;
            apiRequest.tenantId = authResult.tenantId || '';
            apiRequest.userId = authResult.userId;
            // Step 2: Risk Assessment
            const riskScore = await this.assessRequestRisk(apiRequest);
            apiRequest.riskScore = riskScore;
            if (apiRequest.isHighRisk()) {
                apiRequest.addSecurityFlag('HIGH_RISK_REQUEST');
                this.logger.warn('High risk request detected', {
                    requestId: apiRequest.id,
                    riskScore,
                    endpoint,
                    ipAddress
                });
            }
            // Step 3: Rate Limiting
            const rateLimitResult = await this.checkRateLimit(apiRequest);
            if (!rateLimitResult.allowed) {
                const responseTime = Date.now() - startTime;
                apiRequest.setResponse(429, responseTime);
                apiRequest.updateRateLimitStatus(rateLimitResult.remaining, rateLimitResult.resetTime);
                return {
                    success: false,
                    request: apiRequest,
                    error: 'Rate limit exceeded',
                    statusCode: 429
                };
            }
            apiRequest.updateRateLimitStatus(rateLimitResult.remaining, rateLimitResult.resetTime);
            // Step 4: Circuit Breaker Check
            const serviceName = this.getServiceNameFromEndpoint(endpoint);
            const circuitBreaker = this.circuitBreakers.get(serviceName);
            if (circuitBreaker && !circuitBreaker.canExecute()) {
                const responseTime = Date.now() - startTime;
                apiRequest.setResponse(503, responseTime);
                apiRequest.addSecurityFlag('CIRCUIT_BREAKER_OPEN');
                return {
                    success: false,
                    request: apiRequest,
                    error: 'Service temporarily unavailable',
                    statusCode: 503
                };
            }
            // Step 5: Load Balancing and Request Routing
            const routingResult = await this.routeRequest(apiRequest, serviceName);
            if (!routingResult.success) {
                const responseTime = Date.now() - startTime;
                apiRequest.setResponse(502, responseTime);
                if (circuitBreaker) {
                    circuitBreaker.recordFailure();
                }
                return {
                    success: false,
                    request: apiRequest,
                    error: routingResult.error,
                    statusCode: 502
                };
            }
            // Step 6: Process Response
            const responseTime = Date.now() - startTime;
            apiRequest.setResponse(routingResult.statusCode, responseTime, routingResult.responseSize);
            if (circuitBreaker) {
                if (routingResult.statusCode < 500) {
                    circuitBreaker.recordSuccess();
                }
                else {
                    circuitBreaker.recordFailure();
                }
            }
            this.logger.info('API request processed successfully', {
                requestId: apiRequest.id,
                statusCode: routingResult.statusCode,
                responseTime,
                backend: routingResult.backend
            });
            return {
                success: true,
                request: apiRequest,
                response: routingResult.response,
                statusCode: routingResult.statusCode
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            apiRequest.setResponse(500, responseTime);
            apiRequest.addSecurityFlag('PROCESSING_ERROR');
            this.logger.error('API request processing failed', {
                requestId: apiRequest.id,
                error: error.message,
                endpoint,
                responseTime
            });
            return {
                success: false,
                request: apiRequest,
                error: 'Internal server error',
                statusCode: 500
            };
        }
        finally {
            // Clean up active request
            setTimeout(() => {
                this.activeRequests.delete(apiRequest.id);
            }, 300000); // Keep for 5 minutes for monitoring
        }
    }
    /**
     * Authenticate API request
     */
    async authenticateRequest(request) {
        try {
            // Check for API key
            const apiKey = request.headers['x-api-key'] || request.headers['authorization'];
            if (!apiKey) {
                return {
                    success: false,
                    isAuthenticated: false,
                    error: 'Missing authentication credentials'
                };
            }
            // Validate API key (simplified - would integrate with actual auth service)
            if (apiKey.startsWith('Bearer ')) {
                const token = apiKey.substring(7);
                const tokenValidation = await this.validateJWTToken(token);
                if (tokenValidation.valid) {
                    return {
                        success: true,
                        isAuthenticated: true,
                        method: 'JWT',
                        tenantId: tokenValidation.tenantId,
                        userId: tokenValidation.userId
                    };
                }
                else {
                    return {
                        success: false,
                        isAuthenticated: false,
                        error: 'Invalid JWT token'
                    };
                }
            }
            else if (apiKey.startsWith('sk_')) {
                const keyValidation = await this.validateApiKey(apiKey);
                if (keyValidation.valid) {
                    return {
                        success: true,
                        isAuthenticated: true,
                        method: 'API_KEY',
                        tenantId: keyValidation.tenantId,
                        userId: keyValidation.userId
                    };
                }
                else {
                    return {
                        success: false,
                        isAuthenticated: false,
                        error: 'Invalid API key'
                    };
                }
            }
            return {
                success: false,
                isAuthenticated: false,
                error: 'Unsupported authentication method'
            };
        }
        catch (error) {
            this.logger.error('Authentication failed', {
                requestId: request.id,
                error: error.message
            });
            return {
                success: false,
                isAuthenticated: false,
                error: 'Authentication service error'
            };
        }
    }
    /**
     * Validate JWT token (placeholder implementation)
     */
    async validateJWTToken(token) {
        // Simulate token validation
        if (token.length < 10) {
            return { valid: false, error: 'Invalid token format' };
        }
        // Simulate successful validation
        return {
            valid: true,
            tenantId: `tenant_${Math.random().toString(36).substr(2, 8)}`,
            userId: `user_${Math.random().toString(36).substr(2, 8)}`
        };
    }
    /**
     * Validate API key (placeholder implementation)
     */
    async validateApiKey(apiKey) {
        // Simulate API key validation
        if (!apiKey.startsWith('sk_')) {
            return { valid: false, error: 'Invalid API key format' };
        }
        // Simulate successful validation
        return {
            valid: true,
            tenantId: `tenant_${Math.random().toString(36).substr(2, 8)}`,
            userId: `user_${Math.random().toString(36).substr(2, 8)}`
        };
    }
    /**
     * Assess request risk
     */
    async assessRequestRisk(request) {
        let riskScore = 0;
        // IP-based risk assessment
        if (request.ipAddress === 'unknown' || request.ipAddress.startsWith('10.')) {
            riskScore += 10; // Internal network
        }
        else {
            riskScore += 20; // External network
        }
        // User agent risk assessment
        if (!request.userAgent || request.userAgent === 'unknown') {
            riskScore += 30; // Missing user agent
        }
        else if (request.userAgent.includes('bot') || request.userAgent.includes('crawler')) {
            riskScore += 40; // Bot traffic
        }
        // Endpoint risk assessment
        if (request.endpoint.includes('/payments')) {
            riskScore += 20; // Financial endpoint
        }
        if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
            riskScore += 15; // Mutating operations
        }
        // Time-based risk assessment
        const hour = new Date().getHours();
        if (hour < 6 || hour > 22) {
            riskScore += 25; // Off-hours activity
        }
        // Request frequency risk assessment
        const recentRequests = this.getRecentRequestCount(request.ipAddress, 300000); // 5 minutes
        if (recentRequests > 100) {
            riskScore += 50; // High frequency
        }
        else if (recentRequests > 50) {
            riskScore += 25; // Medium frequency
        }
        return Math.min(riskScore, 100); // Cap at 100
    }
    /**
     * Check rate limiting
     */
    async checkRateLimit(request) {
        const applicableConfigs = Array.from(this.rateLimitConfigs.values())
            .filter(config => config.isActive &&
            (config.endpoint === request.endpoint || config.endpoint === '*') &&
            (!config.method || config.method === request.method) &&
            !config.isExempt(request.userId, request.ipAddress))
            .sort((a, b) => b.priority - a.priority);
        if (applicableConfigs.length === 0) {
            return {
                allowed: true,
                remaining: 1000,
                resetTime: new Date(Date.now() + 3600000)
            };
        }
        const config = applicableConfigs[0];
        const key = `${request.tenantId || 'global'}_${request.ipAddress}_${config.endpoint}_${config.method || 'ALL'}`;
        const windowStart = config.getWindowStartTime();
        const windowEnd = new Date(windowStart.getTime() + (config.windowSize * 1000));
        // Get current request count for the window
        const requestCount = this.getRequestCountInWindow(key, windowStart, windowEnd);
        const remaining = Math.max(0, config.limit - requestCount - 1);
        const allowed = requestCount < config.limit;
        if (allowed) {
            this.recordRequest(key);
        }
        this.logger.debug('Rate limit check', {
            requestId: request.id,
            key,
            requestCount,
            limit: config.limit,
            remaining,
            allowed,
            windowStart,
            windowEnd
        });
        return {
            allowed,
            remaining,
            resetTime: windowEnd
        };
    }
    /**
     * Route request to appropriate backend service
     */
    async routeRequest(request, serviceName) {
        try {
            const loadBalancer = this.loadBalancers.get(serviceName);
            if (!loadBalancer) {
                return {
                    success: false,
                    statusCode: 502,
                    error: `No load balancer configured for service: ${serviceName}`
                };
            }
            const backend = loadBalancer.selectBackend();
            if (!backend) {
                return {
                    success: false,
                    statusCode: 503,
                    error: 'No healthy backends available'
                };
            }
            loadBalancer.incrementConnections(backend.id);
            try {
                // Simulate backend request (in 
                (Content);
                truncated;
                due;
                to;
                size;
                limit.Use;
                line;
                ranges;
                to;
                read in chunks;
            }
            finally { }
        }
        finally { }
    }
}
exports.ApiGatewayService = ApiGatewayService;
//# sourceMappingURL=api-gateway.service.js.map