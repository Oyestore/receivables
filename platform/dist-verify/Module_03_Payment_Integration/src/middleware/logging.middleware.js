"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var LoggingMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingMiddleware = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
let LoggingMiddleware = LoggingMiddleware_1 = class LoggingMiddleware {
    constructor() {
        this.logger = new common_1.Logger(LoggingMiddleware_1.name);
        this.sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'set-cookie'];
        this.sensitiveFields = ['password', 'token', 'secret', 'key', 'credit_card', 'cvv'];
    }
    use(req, res, next) {
        const requestId = (0, uuid_1.v4)();
        const startTime = Date.now();
        // Add request ID to request object for tracking
        req.requestId = requestId;
        // Log incoming request
        this.logRequest(req, requestId);
        // Override res.end to log response
        const originalEnd = res.end;
        res.end = function (...args) {
            const responseTime = Date.now() - startTime;
            // Log response
            LoggingMiddleware_1.prototype.logResponse.call(LoggingMiddleware_1.prototype, req, res, requestId, responseTime);
            // Call original end
            originalEnd.apply(this, args);
        };
        // Handle response close events
        res.on('close', () => {
            const responseTime = Date.now() - startTime;
            this.logResponse(req, res, requestId, responseTime);
        });
        next();
    }
    logRequest(req, requestId) {
        const logData = {
            requestId,
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            ip: this.getClientIP(req),
            timestamp: new Date().toISOString(),
            headers: this.sanitizeHeaders(req.headers),
            query: this.sanitizeData(req.query),
            params: this.sanitizeData(req.params),
            body: this.sanitizeData(req.body),
        };
        this.logger.log(`Incoming Request: ${req.method} ${req.url}`, JSON.stringify(logData, null, 2));
    }
    logResponse(req, res, requestId, responseTime) {
        const logData = {
            requestId,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString(),
            headers: this.sanitizeHeaders(res.getHeaders()),
        };
        const level = res.statusCode >= 400 ? 'error' : res.statusCode >= 300 ? 'warn' : 'log';
        this.logger[level](`Outgoing Response: ${req.method} ${req.url} - ${res.statusCode} (${responseTime}ms)`, JSON.stringify(logData, null, 2));
    }
    getClientIP(req) {
        return (req.ip ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection?.socket?.remoteAddress ||
            'unknown');
    }
    sanitizeHeaders(headers) {
        const sanitized = {};
        for (const [key, value] of Object.entries(headers)) {
            if (this.sensitiveHeaders.includes(key.toLowerCase())) {
                sanitized[key] = '[REDACTED]';
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    sanitizeData(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }
        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeData(item));
        }
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (this.isSensitiveField(key)) {
                sanitized[key] = '[REDACTED]';
            }
            else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeData(value);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    isSensitiveField(fieldName) {
        const lowerFieldName = fieldName.toLowerCase();
        return this.sensitiveFields.some(sensitive => lowerFieldName.includes(sensitive.toLowerCase()));
    }
    // Utility methods for custom logging
    logCustomEvent(event, data, requestId) {
        const logData = {
            requestId,
            event,
            timestamp: new Date().toISOString(),
            data: this.sanitizeData(data),
        };
        this.logger.log(`Custom Event: ${event}`, JSON.stringify(logData, null, 2));
    }
    logError(error, req, requestId) {
        const logData = {
            requestId,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
            },
            request: req ? {
                method: req.method,
                url: req.url,
                ip: this.getClientIP(req),
            } : undefined,
            timestamp: new Date().toISOString(),
        };
        this.logger.error(`Error: ${error.message}`, JSON.stringify(logData, null, 2));
    }
    logPerformance(operation, duration, metadata) {
        const logData = {
            operation,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
            metadata: this.sanitizeData(metadata),
        };
        const level = duration > 1000 ? 'warn' : duration > 500 ? 'log' : 'debug';
        this.logger[level](`Performance: ${operation} took ${duration}ms`, JSON.stringify(logData, null, 2));
    }
    logSecurity(event, details, req) {
        const logData = {
            event,
            details: this.sanitizeData(details),
            request: req ? {
                method: req.method,
                url: req.url,
                ip: this.getClientIP(req),
                userAgent: req.get('User-Agent'),
            } : undefined,
            timestamp: new Date().toISOString(),
        };
        this.logger.warn(`Security Event: ${event}`, JSON.stringify(logData, null, 2));
    }
    logBusiness(event, data, userId) {
        const logData = {
            event,
            userId,
            timestamp: new Date().toISOString(),
            data: this.sanitizeData(data),
        };
        this.logger.log(`Business Event: ${event}`, JSON.stringify(logData, null, 2));
    }
};
exports.LoggingMiddleware = LoggingMiddleware;
exports.LoggingMiddleware = LoggingMiddleware = LoggingMiddleware_1 = __decorate([
    (0, common_1.Injectable)()
], LoggingMiddleware);
//# sourceMappingURL=logging.middleware.js.map