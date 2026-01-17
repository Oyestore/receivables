"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadBalancerConfiguration = exports.CircuitBreaker = exports.RateLimitConfiguration = exports.ApiRequest = void 0;
/**
 * API Request Entity
 * Represents an API request with comprehensive tracking and security
 */
class ApiRequest {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.tenantId = data.tenantId || '';
        this.userId = data.userId;
        this.endpoint = data.endpoint || '';
        this.method = data.method || 'GET';
        this.headers = data.headers || {};
        this.body = data.body;
        this.queryParams = data.queryParams || {};
        this.ipAddress = data.ipAddress || '';
        this.userAgent = data.userAgent || '';
        this.timestamp = data.timestamp || new Date();
        this.responseStatus = data.responseStatus;
        this.responseTime = data.responseTime;
        this.responseSize = data.responseSize;
        this.riskScore = data.riskScore || 0;
        this.isAuthenticated = data.isAuthenticated || false;
        this.authenticationMethod = data.authenticationMethod;
        this.rateLimitStatus = data.rateLimitStatus || {
            remaining: 1000,
            resetTime: new Date(Date.now() + 3600000), // 1 hour from now
            isLimited: false
        };
        this.securityFlags = data.securityFlags || [];
        this.metadata = data.metadata || {};
    }
    generateId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    addSecurityFlag(flag) {
        if (!this.securityFlags.includes(flag)) {
            this.securityFlags.push(flag);
        }
    }
    updateRateLimitStatus(remaining, resetTime) {
        this.rateLimitStatus = {
            remaining,
            resetTime,
            isLimited: remaining <= 0
        };
    }
    setResponse(status, responseTime, responseSize) {
        this.responseStatus = status;
        this.responseTime = responseTime;
        this.responseSize = responseSize;
    }
    isHighRisk() {
        return this.riskScore >= 70;
    }
    toJSON() {
        return {
            id: this.id,
            tenantId: this.tenantId,
            userId: this.userId,
            endpoint: this.endpoint,
            method: this.method,
            headers: this.headers,
            body: this.body,
            queryParams: this.queryParams,
            ipAddress: this.ipAddress,
            userAgent: this.userAgent,
            timestamp: this.timestamp,
            responseStatus: this.responseStatus,
            responseTime: this.responseTime,
            responseSize: this.responseSize,
            riskScore: this.riskScore,
            isAuthenticated: this.isAuthenticated,
            authenticationMethod: this.authenticationMethod,
            rateLimitStatus: this.rateLimitStatus,
            securityFlags: this.securityFlags,
            metadata: this.metadata
        };
    }
}
exports.ApiRequest = ApiRequest;
/**
 * Rate Limit Configuration Entity
 * Manages rate limiting rules and policies
 */
class RateLimitConfiguration {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.tenantId = data.tenantId || '';
        this.endpoint = data.endpoint || '';
        this.method = data.method;
        this.limitType = data.limitType || 'per_hour';
        this.limit = data.limit || 1000;
        this.windowSize = data.windowSize || 3600; // 1 hour
        this.burstLimit = data.burstLimit;
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.priority = data.priority || 1;
        this.exemptUsers = data.exemptUsers || [];
        this.exemptIPs = data.exemptIPs || [];
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.metadata = data.metadata || {};
    }
    generateId() {
        return `rl_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }
    isExempt(userId, ipAddress) {
        if (userId && this.exemptUsers.includes(userId)) {
            return true;
        }
        if (ipAddress && this.exemptIPs.includes(ipAddress)) {
            return true;
        }
        return false;
    }
    getWindowStartTime() {
        const now = new Date();
        const windowStart = new Date(now.getTime() - (now.getTime() % (this.windowSize * 1000)));
        return windowStart;
    }
    toJSON() {
        return {
            id: this.id,
            tenantId: this.tenantId,
            endpoint: this.endpoint,
            method: this.method,
            limitType: this.limitType,
            limit: this.limit,
            windowSize: this.windowSize,
            burstLimit: this.burstLimit,
            isActive: this.isActive,
            priority: this.priority,
            exemptUsers: this.exemptUsers,
            exemptIPs: this.exemptIPs,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            metadata: this.metadata
        };
    }
}
exports.RateLimitConfiguration = RateLimitConfiguration;
/**
 * Circuit Breaker Entity
 * Manages circuit breaker patterns for service resilience
 */
class CircuitBreaker {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.serviceName = data.serviceName || '';
        this.tenantId = data.tenantId || '';
        this.state = data.state || 'CLOSED';
        this.failureThreshold = data.failureThreshold || 5;
        this.recoveryTimeout = data.recoveryTimeout || 60000; // 1 minute
        this.successThreshold = data.successThreshold || 3;
        this.currentFailures = data.currentFailures || 0;
        this.currentSuccesses = data.currentSuccesses || 0;
        this.lastFailureTime = data.lastFailureTime;
        this.lastSuccessTime = data.lastSuccessTime;
        this.nextAttemptTime = data.nextAttemptTime;
        this.totalRequests = data.totalRequests || 0;
        this.totalFailures = data.totalFailures || 0;
        this.totalSuccesses = data.totalSuccesses || 0;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.metadata = data.metadata || {};
    }
    generateId() {
        return `cb_${this.serviceName}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
    recordSuccess() {
        this.totalRequests++;
        this.totalSuccesses++;
        this.currentSuccesses++;
        this.currentFailures = 0;
        this.lastSuccessTime = new Date();
        this.updatedAt = new Date();
        if (this.state === 'HALF_OPEN' && this.currentSuccesses >= this.successThreshold) {
            this.state = 'CLOSED';
            this.currentSuccesses = 0;
        }
    }
    recordFailure() {
        this.totalRequests++;
        this.totalFailures++;
        this.currentFailures++;
        this.currentSuccesses = 0;
        this.lastFailureTime = new Date();
        this.updatedAt = new Date();
        if (this.state === 'CLOSED' && this.currentFailures >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttemptTime = new Date(Date.now() + this.recoveryTimeout);
        }
        else if (this.state === 'HALF_OPEN') {
            this.state = 'OPEN';
            this.nextAttemptTime = new Date(Date.now() + this.recoveryTimeout);
        }
    }
    canExecute() {
        if (this.state === 'CLOSED') {
            return true;
        }
        if (this.state === 'OPEN') {
            if (this.nextAttemptTime && new Date() >= this.nextAttemptTime) {
                this.state = 'HALF_OPEN';
                this.currentSuccesses = 0;
                this.currentFailures = 0;
                return true;
            }
            return false;
        }
        // HALF_OPEN state
        return true;
    }
    getFailureRate() {
        return this.totalRequests > 0 ? (this.totalFailures / this.totalRequests) * 100 : 0;
    }
    getSuccessRate() {
        return this.totalRequests > 0 ? (this.totalSuccesses / this.totalRequests) * 100 : 0;
    }
    reset() {
        this.state = 'CLOSED';
        this.currentFailures = 0;
        this.currentSuccesses = 0;
        this.nextAttemptTime = undefined;
        this.updatedAt = new Date();
    }
    toJSON() {
        return {
            id: this.id,
            serviceName: this.serviceName,
            tenantId: this.tenantId,
            state: this.state,
            failureThreshold: this.failureThreshold,
            recoveryTimeout: this.recoveryTimeout,
            successThreshold: this.successThreshold,
            currentFailures: this.currentFailures,
            currentSuccesses: this.currentSuccesses,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
            nextAttemptTime: this.nextAttemptTime,
            totalRequests: this.totalRequests,
            totalFailures: this.totalFailures,
            totalSuccesses: this.totalSuccesses,
            failureRate: this.getFailureRate(),
            successRate: this.getSuccessRate(),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            metadata: this.metadata
        };
    }
}
exports.CircuitBreaker = CircuitBreaker;
/**
 * Load Balancer Configuration Entity
 * Manages load balancing strategies and backend services
 */
class LoadBalancerConfiguration {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.serviceName = data.serviceName || '';
        this.tenantId = data.tenantId || '';
        this.strategy = data.strategy || 'round_robin';
        this.backends = data.backends || [];
        this.healthCheckInterval = data.healthCheckInterval || 30000; // 30 seconds
        this.healthCheckTimeout = data.healthCheckTimeout || 5000; // 5 seconds
        this.healthCheckPath = data.healthCheckPath || '/health';
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.metadata = data.metadata || {};
    }
    generateId() {
        return `lb_${this.serviceName}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
    addBackend(url, weight = 1) {
        const backend = {
            id: `backend_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            url,
            weight,
            isHealthy: true,
            currentConnections: 0,
            lastHealthCheck: new Date(),
            responseTime: 0
        };
        this.backends.push(backend);
        this.updatedAt = new Date();
    }
    removeBackend(backendId) {
        this.backends = this.backends.filter(backend => backend.id !== backendId);
        this.updatedAt = new Date();
    }
    updateBackendHealth(backendId, isHealthy, responseTime) {
        const backend = this.backends.find(b => b.id === backendId);
        if (backend) {
            backend.isHealthy = isHealthy;
            backend.lastHealthCheck = new Date();
            if (responseTime !== undefined) {
                backend.responseTime = responseTime;
            }
            this.updatedAt = new Date();
        }
    }
    getHealthyBackends() {
        return this.backends.filter(backend => backend.isHealthy);
    }
    selectBackend() {
        const healthyBackends = this.getHealthyBackends();
        if (healthyBackends.length === 0) {
            return null;
        }
        switch (this.strategy) {
            case 'round_robin':
                return this.selectRoundRobin(healthyBackends);
            case 'weighted_round_robin':
                return this.selectWeightedRoundRobin(healthyBackends);
            case 'least_connections':
                return this.selectLeastConnections(healthyBackends);
            case 'random':
                return healthyBackends[Math.floor(Math.random() * healthyBackends.length)];
            default:
                return healthyBackends[0];
        }
    }
    selectRoundRobin(backends) {
        const currentIndex = (this.metadata.roundRobinIndex || 0) % backends.length;
        this.metadata.roundRobinIndex = currentIndex + 1;
        return backends[currentIndex];
    }
    selectWeightedRoundRobin(backends) {
        const totalWeight = backends.reduce((sum, backend) => sum + backend.weight, 0);
        const random = Math.random() * totalWeight;
        let weightSum = 0;
        for (const backend of backends) {
            weightSum += backend.weight;
            if (random <= weightSum) {
                return backend;
            }
        }
        return backends[0];
    }
    selectLeastConnections(backends) {
        return backends.reduce((min, backend) => backend.currentConnections < min.currentConnections ? backend : min);
    }
    incrementConnections(backendId) {
        const backend = this.backends.find(b => b.id === backendId);
        if (backend) {
            backend.currentConnections++;
        }
    }
    decrementConnections(backendId) {
        const backend = this.backends.find(b => b.id === backendId);
        if (backend && backend.currentConnections > 0) {
            backend.currentConnections--;
        }
    }
    toJSON() {
        return {
            id: this.id,
            serviceName: this.serviceName,
            tenantId: this.tenantId,
            strategy: this.strategy,
            backends: this.backends,
            healthCheckInterval: this.healthCheckInterval,
            healthCheckTimeout: this.healthCheckTimeout,
            healthCheckPath: this.healthCheckPath,
            isActive: this.isActive,
            healthyBackendCount: this.getHealthyBackends().length,
            totalBackendCount: this.backends.length,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            metadata: this.metadata
        };
    }
}
exports.LoadBalancerConfiguration = LoadBalancerConfiguration;
//# sourceMappingURL=api-gateway.entity.js.map