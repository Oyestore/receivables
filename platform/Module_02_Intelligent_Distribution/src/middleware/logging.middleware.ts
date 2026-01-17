import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const requestId = uuidv4();
    const startTime = Date.now();

    // Add request ID to request for tracking
    req['requestId'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Log incoming request
    this.logIncomingRequest(req, requestId);

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any) {
      const duration = Date.now() - startTime;
      
      // Log outgoing response
      this.logOutgoingResponse(req, res, duration, requestId);
      
      // Call original end
      originalEnd.call(this, chunk, encoding);
    }.bind(this);

    next();
  }

  private logIncomingRequest(req: Request, requestId: string): void {
    const logData = {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: this.getClientIP(req),
      timestamp: new Date().toISOString(),
      headers: this.sanitizeHeaders(req.headers),
      query: req.query,
      params: req.params,
    };

    // Log only essential info for production
    if (process.env.NODE_ENV === 'production') {
      this.logger.log(`[${requestId}] ${req.method} ${req.url} - ${this.getClientIP(req)}`);
    } else {
      this.logger.log(`Incoming Request`, logData);
    }
  }

  private logOutgoingResponse(req: Request, res: Response, duration: number, requestId: string): void {
    const logData = {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.getHeader('content-length') || 0,
      timestamp: new Date().toISOString(),
    };

    // Determine log level based on status code
    const logLevel = this.getLogLevel(res.statusCode);

    if (process.env.NODE_ENV === 'production') {
      this.logger[logLevel](`[${requestId}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    } else {
      this.logger[logLevel](`Outgoing Response`, logData);
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
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'x-api-key',
      'cookie',
      'set-cookie',
      'x-auth-token',
      'x-access-token',
    ];

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private getLogLevel(statusCode: number): 'log' | 'warn' | 'error' {
    if (statusCode >= 500) {
      return 'error';
    } else if (statusCode >= 400) {
      return 'warn';
    } else {
      return 'log';
    }
  }

  // Utility method to log custom events
  logEvent(event: string, data: any, requestId?: string): void {
    const logData = {
      requestId,
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(`Event: ${event}`, logData);
  }

  // Utility method to log errors
  logError(error: Error, req?: Request, requestId?: string): void {
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
      } : null,
      timestamp: new Date().toISOString(),
    };

    this.logger.error(`Error: ${error.message}`, logData);
  }

  // Utility method to log performance metrics
  logPerformance(operation: string, duration: number, metadata?: any): void {
    const logData = {
      operation,
      duration: `${duration}ms`,
      metadata,
      timestamp: new Date().toISOString(),
    };

    if (duration > 1000) {
      this.logger.warn(`Slow Operation: ${operation}`, logData);
    } else {
      this.logger.log(`Performance: ${operation}`, logData);
    }
  }
}
