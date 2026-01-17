import { Injectable, NestMiddleware, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ErrorHandlingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ErrorHandlingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Global error handler
    res.on('error', (error) => {
      this.handleError(error, req, res);
    });

    // Catch unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection', reason);
    });

    // Catch uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception', error);
      process.exit(1);
    });

    next();
  }

  public handleError(error: Error, req: Request, res: Response): void {
    const requestId = (req as any).requestId || 'unknown';
    
    // Log the error
    this.logError(error, req, requestId);

    // Determine error type and status code
    const errorResponse = this.createErrorResponse(error, requestId);

    // Send error response
    res.status(errorResponse.statusCode).json(errorResponse.body);
  }

  private createErrorResponse(error: Error, requestId: string): {
    statusCode: number;
    body: any;
  } {
    // Handle HTTP exceptions
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const exceptionResponse = error.getResponse();

      return {
        statusCode: status,
        body: {
          success: false,
          error: {
            code: this.getErrorCode(status),
            message: typeof exceptionResponse === 'string' 
              ? exceptionResponse 
              : (exceptionResponse as any).message || error.message,
            details: typeof exceptionResponse === 'object' ? (exceptionResponse as any).details : undefined,
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
      };
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        body: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.message,
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
      };
    }

    // Handle database errors
    if (error.name === 'QueryFailedError') {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Database operation failed',
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
      };
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        body: {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid authentication token',
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
      };
    }

    if (error.name === 'TokenExpiredError') {
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        body: {
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Authentication token has expired',
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
      };
    }

    // Handle rate limiting errors
    if (error.name === 'RateLimitError') {
      return {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        body: {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
      };
    }

    // Handle payment gateway errors
    if (error.name.includes('Payment') || error.message.includes('payment')) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        body: {
          success: false,
          error: {
            code: 'PAYMENT_ERROR',
            message: 'Payment processing failed',
            details: error.message,
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
      };
    }

    // Handle network errors
    if (error.name === 'NetworkError' || error.message.includes('ECONNREFUSED')) {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        body: {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'External service is temporarily unavailable',
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
      };
    }

    // Default error response
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: process.env.NODE_ENV === 'production' 
            ? 'An unexpected error occurred' 
            : error.message,
          requestId,
          timestamp: new Date().toISOString(),
        },
      },
    };
  }

  private getErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.METHOD_NOT_ALLOWED:
        return 'METHOD_NOT_ALLOWED';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'INTERNAL_SERVER_ERROR';
      default:
        return 'UNKNOWN_ERROR';
    }
  }

  private logError(error: Error, req: Request, requestId: string): void {
    const logData = {
      requestId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      request: {
        method: req.method,
        url: req.url,
        ip: this.getClientIP(req),
        userAgent: req.get('User-Agent'),
      },
      timestamp: new Date().toISOString(),
    };

    this.logger.error(`Request Error: ${error.message}`, JSON.stringify(logData, null, 2));
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

  // Utility method to create custom errors
  public createError(message: string, code: string, statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR): Error {
    const error = new Error(message);
    (error as any).code = code;
    (error as any).statusCode = statusCode;
    return error;
  }

  // Utility method to handle async errors
  public async handleAsync<T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Operation failed'
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logger.error(errorMessage, error);
      throw error;
    }
  }

  // Utility method to validate and handle errors
  public validateAndHandle<T>(
    data: T,
    validator: (data: T) => boolean,
    errorMessage: string = 'Validation failed'
  ): T {
    if (!validator(data)) {
      const error = new Error(errorMessage);
      (error as any).name = 'ValidationError';
      throw error;
    }
    return data;
  }
}
