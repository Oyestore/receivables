import { Injectable, NestMiddleware, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthenticationMiddleware.name);

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Skip authentication for health checks and public endpoints
      if (req.path.startsWith('/health') || req.path.startsWith('/public')) {
        return next();
      }

      // Get API key from header
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        throw new UnauthorizedException('API key required');
      }

      // Validate API key (in production, validate against database)
      if (!this.isValidApiKey(apiKey)) {
        throw new UnauthorizedException('Invalid API key');
      }

      // Add user context to request
      (req as any).user = await this.getUserFromApiKey(apiKey);
      
      next();
    } catch (error: any) {
      this.logger.error('Authentication error', error);
      res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: error.message,
      });
    }
  }

  private isValidApiKey(apiKey: string): boolean {
    // In production, validate against database
    const validKeys = process.env.VALID_API_KEYS?.split(',') || [];
    return validKeys.includes(apiKey) || apiKey.startsWith('sk-test-');
  }

  private async getUserFromApiKey(apiKey: string): Promise<any> {
    // In production, fetch user from database
    return {
      id: 'user-123',
      email: 'user@example.com',
      role: 'admin',
      permissions: ['read', 'write', 'admin'],
    };
  }
}

@Injectable()
export class ValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ValidationMiddleware.name);

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        this.validateRequestBody(req);
      }

      // Validate query parameters
      this.validateQueryParams(req);

      // Validate content type
      this.validateContentType(req);

      next();
    } catch (error: any) {
      this.logger.error('Validation error', error);
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: error.message,
      });
    }
  }

  private validateRequestBody(req: Request): void {
    if (req.body && typeof req.body === 'object') {
      // Check for SQL injection patterns
      const bodyStr = JSON.stringify(req.body);
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
        /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
        /(--|\/\*|\*\/)/i,
      ];

      for (const pattern of sqlPatterns) {
        if (pattern.test(bodyStr)) {
          throw new BadRequestException('Invalid request format');
        }
      }

      // Check for XSS patterns
      const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*<\/script>)/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
      ];

      for (const pattern of xssPatterns) {
        if (pattern.test(bodyStr)) {
          throw new BadRequestException('Invalid request format');
        }
      }
    }
  }

  private validateQueryParams(req: Request): void {
    if (req.query) {
      const queryStr = JSON.stringify(req.query);
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
        /(--|\/\*|\*\/)/i,
      ];

      for (const pattern of sqlPatterns) {
        if (pattern.test(queryStr)) {
          throw new BadRequestException('Invalid query parameters');
        }
      }
    }
  }

  private validateContentType(req: Request): void {
    const validContentTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
    ];

    if (req.method !== 'GET' && req.method !== 'DELETE') {
      const contentType = req.headers['content-type'];
      if (!contentType || !validContentTypes.some(type => contentType.includes(type))) {
        throw new BadRequestException('Invalid content type');
      }
    }
  }
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private readonly requests = new Map<string, { count: number; resetTime: number }>();

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = this.getClientId(req);
      const now = Date.now();
      const windowMs = 60 * 1000; // 1 minute window
      const maxRequests = 100; // 100 requests per minute

      const clientData = this.requests.get(clientId);
      
      if (!clientData || now > clientData.resetTime) {
        this.requests.set(clientId, {
          count: 1,
          resetTime: now + windowMs,
        });
        return next();
      }

      if (clientData.count >= maxRequests) {
        res.set('X-RateLimit-Limit', maxRequests.toString());
        res.set('X-RateLimit-Remaining', '0');
        res.set('X-RateLimit-Reset', clientData.resetTime.toString());
        
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many requests',
        });
      }

      clientData.count++;
      res.set('X-RateLimit-Limit', maxRequests.toString());
      res.set('X-RateLimit-Remaining', (maxRequests - clientData.count).toString());
      res.set('X-RateLimit-Reset', clientData.resetTime.toString());

      next();
    } catch (error: any) {
      this.logger.error('Rate limit error', error);
      next();
    }
  }

  private getClientId(req: Request): string {
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  }
}

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);
  private readonly requestId = 'req-id';

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);

    // Log request
    this.logger.log(`[${requestId}] ${req.method} ${req.path}`, {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });

      // Override res.end to log response
      const originalEnd = res.end;
      (res as any).end = function (chunk?: any, encoding?: any) {
        const duration = Date.now() - startTime;
        
        this.logger.log(`[${requestId}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`, {
          statusCode: res.statusCode,
          duration: duration,
          timestamp: new Date().toISOString(),
        });

        originalEnd.call(this, chunk, encoding);
      };

      next();
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }
}

@Injectable()
export class ErrorHandlingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ErrorHandlingMiddleware.name);

  async use(error: Error, req: Request, res: Response, next: NextFunction) {
    this.logger.error(`Error in ${req.method} ${req.path}`, error);

    // Don't send error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    
    const errorResponse = {
      success: false,
      error: error.name || 'Internal Server Error',
      message: isProduction ? 'Something went wrong' : error.message,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      ...(isProduction ? {} : { stack: error.stack }),
    };

    res.status(500).json(errorResponse);
  }
}
