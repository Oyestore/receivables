import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * Security middleware using Helmet.js
 * Protects against common web vulnerabilities
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
    constructor() { }

    use(req: Request, res: Response, next: NextFunction) {
        helmet({
            // Content Security Policy
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                    connectSrc: ["'self'"],
                    frameSrc: ["'none'"],
                    objectSrc: ["'none'"],
                },
            },
            // Hide X-Powered-By header
            hidePoweredBy: true,
            // Prevent clickjacking
            frameguard: {
                action: 'deny',
            },
            // Prevent MIME type sniffing
            noSniff: true,
            // Enable XSS filter
            xssFilter: true,
            // Force HTTPS
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true,
            },
            // Referrer policy
            referrerPolicy: {
                policy: 'strict-origin-when-cross-origin',
            },
        })(req, res, next);
    }
}

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
    /**
     * Remove SQL injection attempts
     */
    static sanitizeSQL(input: string): string {
        if (!input) return input;

        // Remove common SQL injection patterns
        return input
            .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi, '')
            .replace(/[';\-]/g, '')
            .trim();
    }

    /**
     * Remove XSS attempts
     */
    static sanitizeXSS(input: string): string {
        if (!input) return input;

        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
    }

    /**
     * Validate email format
     */
    static isValidEmail(email: string): boolean {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    }

    /**
     * Validate phone number (Indian format)
     */
    static isValidPhone(phone: string): boolean {
        const phoneRegex = /^[6-9]\d{9}$/;
        return phoneRegex.test(phone.replace(/\D/g, ''));
    }

    /**
     * Sanitize filename
     */
    static sanitizeFilename(filename: string): string {
        if (!filename) return filename;

        return filename
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/\.{2,}/g, '.')
            .substring(0, 255);
    }

    /**
     * Validate UUID
     */
    static isValidUUID(uuid: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    /**
     * Sanitize object recursively
     */
    static sanitizeObject(obj: any): any {
        if (typeof obj !== 'object' || obj === null) {
            if (typeof obj === 'string') {
                return this.sanitizeXSS(obj);
            }
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => this.sanitizeObject(item));
        }

        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = this.sanitizeObject(value);
        }
        return sanitized;
    }
}
