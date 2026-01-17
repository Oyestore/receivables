import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ValidationError } from 'class-validator';

@Injectable()
export class ValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ValidationMiddleware.name);

  constructor() {}

  async use(req: Request, res: Response, next: NextFunction) {
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
    } catch (error) {
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

  private async validateObject(obj: any, context: string): Promise<string[]> {
    const errors: string[] = [];

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

  private sanitizeRequest(req: Request): void {
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

  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = this.sanitizeObject(value);
    }

    return sanitized;
  }

  private sanitizeString(value: any): any {
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

  private containsXSS(value: string): boolean {
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

  private containsSQLInjection(value: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(--|\*\/|\/\*|;|'|")/,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(\b(OR|AND)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/gi,
    ];

    return sqlPatterns.some(pattern => pattern.test(value));
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: any): boolean {
    if (typeof phone !== 'string' && typeof phone !== 'number') {
      return false;
    }
    
    const phoneStr = String(phone);
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phoneStr.replace(/[\s\-\(\)]/g, ''));
  }

  private isValidAmount(amount: any): boolean {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num <= 999999999.99;
  }

  private isValidDate(date: any): boolean {
    if (typeof date !== 'string') {
      return false;
    }
    
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime()) && dateObj.toString() !== 'Invalid Date';
  }

  private sendValidationError(res: Response, errors: string[], message: string): Response {
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
}
