"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RateLimitMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitMiddleware = void 0;
const common_1 = require("@nestjs/common");
let RateLimitMiddleware = RateLimitMiddleware_1 = class RateLimitMiddleware {
    constructor() {
        this.logger = new common_1.Logger(RateLimitMiddleware_1.name);
        this.rateLimitMap = new Map();
        // Default: 100 requests per 15 minutes
        this.windowMs = 15 * 60 * 1000; // 15 minutes in milliseconds
        this.maxRequests = 100;
        // Clean up expired entries every 5 minutes
        setInterval(() => {
            this.cleanupExpiredEntries();
        }, 5 * 60 * 1000);
    }
    use(req, res, next) {
        const clientId = this.getClientId(req);
        const now = Date.now();
        // Get current rate limit info for this client
        let rateLimitInfo = this.rateLimitMap.get(clientId);
        if (!rateLimitInfo || now > rateLimitInfo.resetTime) {
            // First request or window has expired
            rateLimitInfo = {
                requests: 1,
                resetTime: now + this.windowMs,
                lastRequest: now,
            };
            this.rateLimitMap.set(clientId, rateLimitInfo);
            // Set rate limit headers
            this.setRateLimitHeaders(res, rateLimitInfo);
            next();
            return;
        }
        // Check if rate limit is exceeded
        if (rateLimitInfo.requests >= this.maxRequests) {
            const resetIn = Math.ceil((rateLimitInfo.resetTime - now) / 1000);
            this.logger.warn(`Rate limit exceeded for client: ${clientId}. Requests: ${rateLimitInfo.requests}, Limit: ${this.maxRequests}`);
            return res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many requests. Please try again later.',
                    details: {
                        limit: this.maxRequests,
                        windowMs: this.windowMs,
                        resetIn,
                        retryAfter: resetIn,
                    },
                    timestamp: new Date().toISOString(),
                },
            });
        }
        // Increment request count
        rateLimitInfo.requests++;
        rateLimitInfo.lastRequest = now;
        this.rateLimitMap.set(clientId, rateLimitInfo);
        // Set rate limit headers
        this.setRateLimitHeaders(res, rateLimitInfo);
        this.logger.debug(`Rate limit check for client: ${clientId}. Requests: ${rateLimitInfo.requests}/${this.maxRequests}`);
        next();
    }
    getClientId(req) {
        // Try to get API key first (from auth middleware)
        const apiKey = req.apiKey;
        if (apiKey) {
            return `api:${apiKey.substring(0, 8)}`;
        }
        // Fall back to IP address
        const ip = req.ip ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection?.socket?.remoteAddress ||
            'unknown';
        return `ip:${ip}`;
    }
    setRateLimitHeaders(res, rateLimitInfo) {
        const now = Date.now();
        const resetIn = Math.ceil((rateLimitInfo.resetTime - now) / 1000);
        const remaining = Math.max(0, this.maxRequests - rateLimitInfo.requests);
        res.setHeader('X-RateLimit-Limit', this.maxRequests);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', rateLimitInfo.resetTime);
        res.setHeader('X-RateLimit-Reset-In', resetIn);
    }
    cleanupExpiredEntries() {
        const now = Date.now();
        let cleanedCount = 0;
        for (const [clientId, rateLimitInfo] of this.rateLimitMap.entries()) {
            if (now > rateLimitInfo.resetTime) {
                this.rateLimitMap.delete(clientId);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            this.logger.debug(`Cleaned up ${cleanedCount} expired rate limit entries`);
        }
    }
    // Utility method to get current rate limit status for a client
    getRateLimitStatus(clientId) {
        const info = this.rateLimitMap.get(clientId);
        if (!info) {
            return null;
        }
        const now = Date.now();
        if (now > info.resetTime) {
            this.rateLimitMap.delete(clientId);
            return null;
        }
        return {
            ...info,
            remaining: Math.max(0, this.maxRequests - info.requests),
        };
    }
    // Utility method to reset rate limit for a client
    resetRateLimit(clientId) {
        return this.rateLimitMap.delete(clientId);
    }
    // Utility method to get statistics
    getStatistics() {
        const now = Date.now();
        let activeClients = 0;
        let totalRequests = 0;
        for (const [clientId, rateLimitInfo] of this.rateLimitMap.entries()) {
            if (now <= rateLimitInfo.resetTime) {
                activeClients++;
                totalRequests += rateLimitInfo.requests;
            }
        }
        return {
            totalClients: this.rateLimitMap.size,
            activeClients,
            averageRequestsPerClient: activeClients > 0 ? totalRequests / activeClients : 0,
        };
    }
};
exports.RateLimitMiddleware = RateLimitMiddleware;
exports.RateLimitMiddleware = RateLimitMiddleware = RateLimitMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RateLimitMiddleware);
//# sourceMappingURL=rate-limit.middleware.js.map