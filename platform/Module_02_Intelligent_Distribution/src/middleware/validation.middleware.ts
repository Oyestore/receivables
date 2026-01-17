import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ValidationMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Basic input sanitization
      this.sanitizeInput(req);

      // Validate request body if present
      if (req.body && Object.keys(req.body).length > 0) {
        await this.validateRequestBody(req);
      }

      // Validate query parameters
      if (req.query && Object.keys(req.query).length > 0) {
        this.validateQueryParams(req);
      }

      // Validate path parameters
      if (req.params && Object.keys(req.params).length > 0) {
        this.validatePathParams(req);
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  private sanitizeInput(req: Request): void {
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

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        if (typeof value === 'string') {
          // Remove potential XSS and SQL injection patterns
          sanitized[key] = this.sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  }

  private sanitizeString(str: string): string {
    return str
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove potential SQL injection patterns
      .replace(/('|(\\')|(;)|(\\;)|(\|)|(\\|)|(\\x)|(\\n)|(\\r)|(\%27)|(\%3B))/gi, '')
      // Remove potential XSS patterns
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      // Trim whitespace
      .trim();
  }

  private async validateRequestBody(req: Request): Promise<void> {
    // Check for common injection patterns
    const bodyString = JSON.stringify(req.body).toLowerCase();
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /(\b(select|insert|update|delete|drop|union|exec|script)\b)/gi,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(bodyString)) {
        throw new BadRequestException('Invalid input detected');
      }
    }

    // Validate JSON structure
    try {
      JSON.parse(JSON.stringify(req.body));
    } catch (error) {
      throw new BadRequestException('Invalid JSON format');
    }
  }

  private validateQueryParams(req: Request): void {
    // Validate common query parameter types
    const { page, limit, offset, sort, order } = req.query;

    if (page && !this.isValidNumber(page as string)) {
      throw new BadRequestException('Invalid page parameter');
    }

    if (limit && !this.isValidNumber(limit as string)) {
      throw new BadRequestException('Invalid limit parameter');
    }

    if (offset && !this.isValidNumber(offset as string)) {
      throw new BadRequestException('Invalid offset parameter');
    }

    if (sort && !this.isValidSortField(sort as string)) {
      throw new BadRequestException('Invalid sort field');
    }

    if (order && !['asc', 'desc'].includes(order as string)) {
      throw new BadRequestException('Invalid order parameter');
    }
  }

  private validatePathParams(req: Request): void {
    // Validate UUID patterns in path parameters
    for (const [key, value] of Object.entries(req.params)) {
      if (key.includes('id') && value && !this.isValidUUID(value as string)) {
        throw new BadRequestException(`Invalid ${key} parameter`);
      }
    }
  }

  private isValidNumber(str: string): boolean {
    const num = parseInt(str, 10);
    return !isNaN(num) && num > 0;
  }

  private isValidSortField(str: string): boolean {
    // Allow only alphanumeric characters, underscores, and dots
    return /^[a-zA-Z0-9_.]+$/.test(str);
  }

  private isValidUUID(str: string): boolean {
    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}
