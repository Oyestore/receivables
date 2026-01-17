import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger: winston.Logger;
  private readonly sensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization',
    'credit_card', 'ssn', 'social_security', 'bank_account',
    'api_key', 'private_key', 'access_token', 'refresh_token'
  ];

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'analytics-api',
        version: '4.0.0',
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
        new DailyRotateFile({
          filename: 'logs/analytics-api-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: process.env.LOG_FILE_MAX_SIZE || '20m',
          maxFiles: process.env.LOG_FILE_MAX_FILES || '14d',
          format: winston.format.json(),
        }),
        new DailyRotateFile({
          filename: 'logs/analytics-api-error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: process.env.LOG_FILE_MAX_SIZE || '20m',
          maxFiles: process.env.LOG_FILE_MAX_FILES || '14d',
          format: winston.format.json(),
        }),
      ],
    });
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    const startTime = Date.now();

    // Add request ID to request for tracking
    req['requestId'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Log incoming request
    this.logRequest(req, requestId);

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function (this: Response, ...args: any[]) {
      const duration = Date.now() - startTime;
      this.logResponse(req, this, duration, requestId);
      originalEnd.apply(this, args);
    }.bind(res);

    // Handle response events
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      this.logResponse(req, res, duration, requestId);
    });

    res.on('error', (error) => {
      this.logger.error('Response error', {
        requestId,
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
      });
    });

    next();
  }

  private logRequest(req: Request, requestId: string): void {
    const logData = {
      requestId,
      event: 'request_start',
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: this.getClientIP(req),
      apiKey: req['apiKeyPrefix'] || 'anonymous',
      headers: this.sanitizeHeaders(req.headers),
      query: this.sanitizeObject(req.query),
      params: this.sanitizeObject(req.params),
      body: this.sanitizeObject(req.body),
      timestamp: new Date().toISOString(),
    };

    this.logger.info('Incoming request', logData);
  }

  private logResponse(req: Request, res: Response, duration: number, requestId: string): void {
    const logData = {
      requestId,
      event: 'request_end',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
      apiKey: req['apiKeyPrefix'] || 'anonymous',
      timestamp: new Date().toISOString(),
    };

    if (res.statusCode >= 400) {
      this.logger.warn('Request completed with error', logData);
    } else {
      this.logger.info('Request completed', logData);
    }

    // Log slow requests
    if (duration > 5000) {
      this.logger.warn('Slow request detected', {
        ...logData,
        performance: 'slow',
        threshold: '5000ms',
      });
    }

    // Log very slow requests
    if (duration > 10000) {
      this.logger.error('Very slow request detected', {
        ...logData,
        performance: 'very_slow',
        threshold: '10000ms',
      });
    }
  }

  private getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIP = req.headers['x-real-ip'] as string;
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized: any = {};
    
    for (const key in headers) {
      if (this.sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = headers[key];
      }
    }
    
    return sanitized;
  }

  private sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    
    for (const key in obj) {
      if (this.sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitized[key] = this.sanitizeObject(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
    
    return sanitized;
  }

  // Utility methods for custom logging
  logAnalyticsEvent(event: string, data: any, level: 'info' | 'warn' | 'error' = 'info'): void {
    this.logger[level](`Analytics event: ${event}`, {
      event,
      data: this.sanitizeObject(data),
      timestamp: new Date().toISOString(),
    });
  }

  logPerformanceMetrics(metrics: any): void {
    this.logger.info('Performance metrics', {
      event: 'performance_metrics',
      metrics,
      timestamp: new Date().toISOString(),
    });
  }

  logSecurityEvent(event: string, data: any): void {
    this.logger.warn(`Security event: ${event}`, {
      event,
      data: this.sanitizeObject(data),
      timestamp: new Date().toISOString(),
    });
  }

  logBusinessEvent(event: string, data: any): void {
    this.logger.info(`Business event: ${event}`, {
      event,
      data: this.sanitizeObject(data),
      timestamp: new Date().toISOString(),
    });
  }
}
