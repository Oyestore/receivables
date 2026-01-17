import { Injectable } from '@nestjs/common';
import * as validator from 'validator';
import * as sanitizeHtml from 'sanitize-html';

/**
 * Input Sanitization Utilities
 * 
 * Prevents XSS, SQL injection, and other injection attacks
 * Validates and sanitizes all user inputs
 */

@Injectable()
export class InputSanitizationService {
    /**
     * Sanitize HTML content (e.g., campaign message templates)
     */
    sanitizeHtml(input: string): string {
        return sanitizeHtml(input, {
            allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
            allowedAttributes: {
                'a': ['href', 'title'],
            },
            allowedSchemes: ['http', 'https', 'mailto'],
        });
    }

    /**
     * Validate and sanitize email address
     */
    sanitizeEmail(email: string): string | null {
        if (!validator.isEmail(email)) {
            return null;
        }
        return validator.normalizeEmail(email);
    }

    /**
     * Sanitize phone number
     */
    sanitizePhone(phone: string): string {
        // Remove all non-digit characters except + at start
        return phone.replace(/[^\d+]/g, '').replace(/\+(?=.)/g, '');
    }

    /**
     * Sanitize company name / contact name (prevent SQL injection)
     */
    sanitizeName(name: string): string {
        // Remove potentially dangerous characters
        return name.replace(/[<>\"'%;()&+]/g, '').trim();
    }

    /**
     * Validate URL
     */
    isValidUrl(url: string): boolean {
        return validator.isURL(url, {
            protocols: ['http', 'https'],
            require_protocol: true,
        });
    }

    /**
     * Sanitize search query (prevent NoSQL injection)
     */
    sanitizeSearchQuery(query: string): string {
        // Escape special regex characters
        return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Validate numeric input
     */
    sanitizeNumber(input: any): number | null {
        const num = Number(input);
        return isNaN(num) ? null : num;
    }

    /**
     * Validate and sanitize campaign budget
     */
    sanitizeBudget(budget: any): number {
        const num = this.sanitizeNumber(budget);
        if (num === null || num < 0) {
            throw new Error('Invalid budget amount');
        }
        return Math.round(num * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Validate campaign name
     */
    validateCampaignName(name: string): boolean {
        if (!name || name.length < 3 || name.length > 100) {
            return false;
        }
        // Allow alphanumeric, spaces, hyphens, underscores
        return /^[a-zA-Z0-9\s\-_]+$/.test(name);
    }

    /**
     * Sanitize JSON input (prevent prototype pollution)
     */
    sanitizeJson(input: any): any {
        if (typeof input !== 'object' || input === null) {
            return input;
        }

        // Remove dangerous properties
        const dangerous = ['__proto__', 'constructor', 'prototype'];
        const sanitized = Array.isArray(input) ? [] : {};

        for (const key in input) {
            if (dangerous.includes(key)) {
                continue;
            }
            sanitized[key] = typeof input[key] === 'object'
                ? this.sanitizeJson(input[key])
                : input[key];
        }

        return sanitized;
    }
}
