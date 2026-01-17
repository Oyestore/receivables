import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);
  private readonly sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'set-cookie'];
  private readonly sensitiveFields = ['password', 'token', 'secret', 'key', 'credit_card', 'cvv'];

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    const startTime = Date.now();

    // Add request ID to request object for tracking
    (req as any).requestId = requestId;

    // Log incoming request
    this.logRequest(req, requestId);

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(this: Response, ...args: any[]) {
      const responseTime = Date.now() - startTime;
      
      // Log response
      LoggingMiddleware.prototype.logResponse.call(
        LoggingMiddleware.prototype,
        req,
        res,
        requestId,
        responseTime
      );

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

  private logRequest(req: Request, requestId: string): void {
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

  private logResponse(req: Request, res: Response, requestId: string, responseTime: number): void {
    const logData = {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      headers: this.sanitizeHeaders(res.getHeaders() as any),
    };

    const level = res.statusCode >= 400 ? 'error' : res.statusCode >= 300 ? 'warn' : 'log';
    
    this.logger[level](
      `Outgoing Response: ${req.method} ${req.url} - ${res.statusCode} (${responseTime}ms)`,
      JSON.stringify(logData, null, 2)
    );
  }

  private getClientIP(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress ||
      'unknown'
    );
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(headers)) {
      if (this.sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();
    return this.sensitiveFields.some(sensitive => 
      lowerFieldName.includes(sensitive.toLowerCase())
    );
  }

  // Utility methods for custom logging
  public logCustomEvent(event: string, data: any, requestId?: string): void {
    const logData = {
      requestId,
      event,
      timestamp: new Date().toISOString(),
      data: this.sanitizeData(data),
    };

    this.logger.log(`Custom Event: ${event}`, JSON.stringify(logData, null, 2));
  }

  public logError(error: Error, req?: Request, requestId?: string): void {
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

  public logPerformance(operation: string, duration: number, metadata?: any): void {
    const logData = {
      operation,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      metadata: this.sanitizeData(metadata),
    };

    const level = duration > 1000 ? 'warn' : duration > 500 ? 'log' : 'debug';
    
    this.logger[level](
      `Performance: ${operation} took ${duration}ms`,
      JSON.stringify(logData, null, 2)
    );
  }

  public logSecurity(event: string, details: any, req?: Request): void {
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

  public logBusiness(event: string, data: any, userId?: string): void {
    const logData = {
      event,
      userId,
      timestamp: new Date().toISOString(),
      data: this.sanitizeData(data),
    };

    this.logger.log(`Business Event: ${event}`, JSON.stringify(logData, null, 2));
  }
}
