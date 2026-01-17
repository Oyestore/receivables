import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ValidationMiddleware.name);

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      if (req.body && Object.keys(req.body).length > 0) {
        const validationResult = this.validateRequestBody(req.body);
        if (!validationResult.isValid) {
          this.logger.warn(`Invalid request body: ${validationResult.error}`);
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Invalid request body',
              details: validationResult.error,
              timestamp: new Date().toISOString(),
            },
          });
        }
      }

      // Validate query parameters
      if (req.query && Object.keys(req.query).length > 0) {
        const validationResult = this.validateQueryParams(req.query);
        if (!validationResult.isValid) {
          this.logger.warn(`Invalid query parameters: ${validationResult.error}`);
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Invalid query parameters',
              details: validationResult.error,
              timestamp: new Date().toISOString(),
            },
          });
        }
      }

      // Validate path parameters
      if (req.params && Object.keys(req.params).length > 0) {
        const validationResult = this.validatePathParams(req.params);
        if (!validationResult.isValid) {
          this.logger.warn(`Invalid path parameters: ${validationResult.error}`);
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Invalid path parameters',
              details: validationResult.error,
              timestamp: new Date().toISOString(),
            },
          });
        }
      }

      // Sanitize request
      this.sanitizeRequest(req);
      next();
    } catch (error) {
      this.logger.error(`Validation middleware error: ${error.message}`);
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

  private validateRequestBody(body: any): { isValid: boolean; error?: string } {
    // Check for potential XSS attacks
    const bodyString = JSON.stringify(body);
    if (this.containsXSS(bodyString)) {
      return { isValid: false, error: 'Potential XSS attack detected' };
    }

    // Check for SQL injection patterns
    if (this.containsSQLInjection(bodyString)) {
      return { isValid: false, error: 'Potential SQL injection detected' };
    }

    // Validate JSON structure
    try {
      JSON.parse(bodyString);
    } catch (error) {
      return { isValid: false, error: 'Invalid JSON structure' };
    }

    // Validate data types based on common patterns
    if (body.limit && (typeof body.limit !== 'number' || body.limit < 0 || body.limit > 1000)) {
      return { isValid: false, error: 'Invalid limit parameter (must be between 0 and 1000)' };
    }

    if (body.offset && (typeof body.offset !== 'number' || body.offset < 0)) {
      return { isValid: false, error: 'Invalid offset parameter (must be non-negative)' };
    }

    if (body.page && (typeof body.page !== 'number' || body.page < 1)) {
      return { isValid: false, error: 'Invalid page parameter (must be >= 1)' };
    }

    return { isValid: true };
  }

  private validateQueryParams(query: any): { isValid: boolean; error?: string } {
    const queryString = JSON.stringify(query);

    // Check for XSS and SQL injection
    if (this.containsXSS(queryString)) {
      return { isValid: false, error: 'Potential XSS attack in query parameters' };
    }

    if (this.containsSQLInjection(queryString)) {
      return { isValid: false, error: 'Potential SQL injection in query parameters' };
    }

    // Validate common query parameters
    if (query.limit && (isNaN(Number(query.limit)) || Number(query.limit) < 0 || Number(query.limit) > 1000)) {
      return { isValid: false, error: 'Invalid limit parameter' };
    }

    if (query.offset && (isNaN(Number(query.offset)) || Number(query.offset) < 0)) {
      return { isValid: false, error: 'Invalid offset parameter' };
    }

    if (query.page && (isNaN(Number(query.page)) || Number(query.page) < 1)) {
      return { isValid: false, error: 'Invalid page parameter' };
    }

    // Validate date formats
    if (query.startDate && !this.isValidDate(query.startDate)) {
      return { isValid: false, error: 'Invalid startDate format (use YYYY-MM-DD)' };
    }

    if (query.endDate && !this.isValidDate(query.endDate)) {
      return { isValid: false, error: 'Invalid endDate format (use YYYY-MM-DD)' };
    }

    return { isValid: true };
  }

  private validatePathParams(params: any): { isValid: boolean; error?: string } {
    const paramsString = JSON.stringify(params);

    // Check for XSS and SQL injection
    if (this.containsXSS(paramsString)) {
      return { isValid: false, error: 'Potential XSS attack in path parameters' };
    }

    if (this.containsSQLInjection(paramsString)) {
      return { isValid: false, error: 'Potential SQL injection in path parameters' };
    }

    // Validate UUID patterns
    if (params.id && !this.isValidUUID(params.id)) {
      return { isValid: false, error: 'Invalid ID format (must be UUID)' };
    }

    return { isValid: true };
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
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const sanitizedKey = this.sanitizeString(key);
        const sanitizedValue = this.sanitizeObject(obj[key]);
        sanitized[sanitizedKey] = sanitizedValue;
      }
    }

    return sanitized;
  }

  private sanitizeString(str: string): string {
    if (typeof str !== 'string') {
      return str;
    }

    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/['";]/gi, '') // Remove quotes and semicolons
      .trim();
  }

  private containsXSS(str: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /<link/gi,
      /<meta/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(str));
  }

  private containsSQLInjection(str: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(--|\*\/|\/\*)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(\b(OR|AND)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/gi,
    ];

    return sqlPatterns.some(pattern => pattern.test(str));
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
