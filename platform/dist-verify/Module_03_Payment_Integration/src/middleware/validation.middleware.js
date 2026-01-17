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
var ValidationMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationMiddleware = void 0;
const common_1 = require("@nestjs/common");
let ValidationMiddleware = ValidationMiddleware_1 = class ValidationMiddleware {
    constructor() {
        this.logger = new common_1.Logger(ValidationMiddleware_1.name);
    }
    async use(req, res, next) {
        try {
            // Validate request body if present
            if (req.body && Object.keys(req.body).length > 0) {
                const bodyErrors = await this.validateObject(req.body, 'body');
                if (bodyErrors.length > 0) {
                    return this.sendValidationError(res, bodyErrors, 'Request body validation failed');
                }
            }
            // Validate query parameters if present
            if (req.query && Object.keys(req.query).length > 0) {
                const queryErrors = await this.validateObject(req.query, 'query');
                if (queryErrors.length > 0) {
                    return this.sendValidationError(res, queryErrors, 'Query parameter validation failed');
                }
            }
            // Validate path parameters if present
            if (req.params && Object.keys(req.params).length > 0) {
                const paramErrors = await this.validateObject(req.params, 'params');
                if (paramErrors.length > 0) {
                    return this.sendValidationError(res, paramErrors, 'Path parameter validation failed');
                }
            }
            // Sanitize inputs
            this.sanitizeRequest(req);
            next();
        }
        catch (error) {
            this.logger.error(`Validation middleware error: ${error.message}`, error.stack);
            return res.status(500).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Internal validation error',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
    async validateObject(obj, context) {
        const errors = [];
        // Basic validation rules
        for (const [key, value] of Object.entries(obj)) {
            // Check for potential XSS attacks
            if (typeof value === 'string') {
                if (this.containsXSS(value)) {
                    errors.push(`${key} contains potentially dangerous content`);
                }
                if (this.containsSQLInjection(value)) {
                    errors.push(`${key} contains potentially malicious SQL content`);
                }
            }
            // Check for empty required fields
            if (value === null || value === undefined || value === '') {
                errors.push(`${key} is required`);
            }
            // Validate data types
            if (key.includes('email') && typeof value === 'string') {
                if (!this.isValidEmail(value)) {
                    errors.push(`${key} must be a valid email address`);
                }
            }
            if (key.includes('phone') || key.includes('mobile')) {
                if (!this.isValidPhone(value)) {
                    errors.push(`${key} must be a valid phone number`);
                }
            }
            if (key.includes('amount') || key.includes('price') || key.includes('total')) {
                if (!this.isValidAmount(value)) {
                    errors.push(`${key} must be a valid positive number`);
                }
            }
            if (key.includes('date') || key.includes('time')) {
                if (!this.isValidDate(value)) {
                    errors.push(`${key} must be a valid date`);
                }
            }
        }
        return errors;
    }
    sanitizeRequest(req) {
        // Sanitize request body
        if (req.body) {
            req.body = this.sanitizeObject(req.body);
        }
        // Sanitize query parameters
        if (req.query) {
            req.query = this.sanitizeObject(req.query);
        }
        // Sanitize path parameters
        if (req.params) {
            req.params = this.sanitizeObject(req.params);
        }
    }
    sanitizeObject(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return this.sanitizeString(obj);
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item));
        }
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = this.sanitizeObject(value);
        }
        return sanitized;
    }
    sanitizeString(value) {
        if (typeof value !== 'string') {
            return value;
        }
        return value
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .replace(/['"\\]/g, '') // Remove quotes and backslashes
            .trim();
    }
    containsXSS(value) {
        const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<img[^>]*src[^>]*javascript:/gi,
            /<\s*script/gi,
            /<\s*object/gi,
            /<\s*embed/gi,
            /<\s*link/gi,
        ];
        return xssPatterns.some(pattern => pattern.test(value));
    }
    containsSQLInjection(value) {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
            /(--|\*\/|\/\*|;|'|")/,
            /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
            /(\b(OR|AND)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/gi,
        ];
        return sqlPatterns.some(pattern => pattern.test(value));
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    isValidPhone(phone) {
        if (typeof phone !== 'string' && typeof phone !== 'number') {
            return false;
        }
        const phoneStr = String(phone);
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phoneStr.replace(/[\s\-\(\)]/g, ''));
    }
    isValidAmount(amount) {
        const num = parseFloat(amount);
        return !isNaN(num) && num > 0 && num <= 999999999.99;
    }
    isValidDate(date) {
        if (typeof date !== 'string') {
            return false;
        }
        const dateObj = new Date(date);
        return !isNaN(dateObj.getTime()) && dateObj.toString() !== 'Invalid Date';
    }
    sendValidationError(res, errors, message) {
        this.logger.warn(`Validation failed: ${errors.join(', ')}`);
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_FAILED',
                message,
                details: errors,
                timestamp: new Date().toISOString(),
            },
        });
    }
};
exports.ValidationMiddleware = ValidationMiddleware;
exports.ValidationMiddleware = ValidationMiddleware = ValidationMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ValidationMiddleware);
//# sourceMappingURL=validation.middleware.js.map