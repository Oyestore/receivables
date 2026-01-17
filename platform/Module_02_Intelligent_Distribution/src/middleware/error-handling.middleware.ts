import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

@Injectable()
export class ErrorHandlingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ErrorHandlingMiddleware.name);

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      next();
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  private handleError(error: any, req: Request, res: Response): void {
    const requestId = req['requestId'] || 'unknown';
    const timestamp = new Date().toISOString();

    // Log the error
    this.logError(error, req, requestId);

    // Determine error response
    const errorResponse = this.createErrorResponse(error, requestId, timestamp);

    // Send error response
    res.status(errorResponse.statusCode).json(errorResponse.body);
  }

  private logError(error: any, req: Request, requestId: string): void {
    const errorData = {
      requestId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
      },
      request: {
        method: req.method,
        url: req.url,
        ip: this.getClientIP(req),
        userAgent: req.headers['user-agent'],
      },
      timestamp: new Date().toISOString(),
    };

    if (error instanceof HttpException) {
      this.logger.warn(`HTTP Exception: ${error.message}`, errorData);
    } else {
      this.logger.error(`Unhandled Error: ${error.message}`, errorData);
    }
  }

  private createErrorResponse(error: any, requestId: string, timestamp: string): {
    statusCode: number;
    body: any;
  } {
    // Handle different types of errors
    if (error instanceof HttpException) {
      const response = error.getResponse();
      const status = error.getStatus();

      return {
        statusCode: status,
        body: {
          success: false,
          error: {
            code: this.getErrorCode(error),
            message: this.getErrorMessage(response),
            details: this.getErrorDetails(response),
          },
          meta: {
            requestId,
            timestamp,
            path: error.message?.path || '',
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
            details: error.details || error.message,
          },
          meta: {
            requestId,
            timestamp,
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
            details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
          },
          meta: {
            requestId,
            timestamp,
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
            details: null,
          },
          meta: {
            requestId,
            timestamp,
          },
        },
      };
    }

    // Handle rate limit errors
    if (error.name === 'RateLimitExceeded') {
      return {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        body: {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            details: {
              retryAfter: error.retryAfter || 60,
            },
          },
          meta: {
            requestId,
            timestamp,
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
          message: 'An unexpected error occurred',
          details: process.env.NODE_ENV === 'development' ? error.message : null,
        },
        meta: {
          requestId,
          timestamp,
        },
      },
    };
  }

  private getErrorCode(error: HttpException): string {
    const status = error.getStatus();
    
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      default:
        return 'HTTP_ERROR';
    }
  }

  private getErrorMessage(response: any): string {
    if (typeof response === 'string') {
      return response;
    }
    
    if (response && response.message) {
      return response.message;
    }
    
    if (response && response.error && response.error.message) {
      return response.error.message;
    }
    
    return 'An error occurred';
  }

  private getErrorDetails(response: any): any {
    if (typeof response === 'object' && response !== null) {
      if (response.details) {
        return response.details;
      }
      
      if (response.error && response.error.details) {
        return response.error.details;
      }
      
      // For validation errors, return the validation details
      if (response.message && Array.isArray(response.message)) {
        return response.message;
      }
    }
    
    return null;
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

  // Utility method to create a standardized error
  static createError(
    code: string,
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    details?: any,
  ): HttpException {
    const error = new HttpException(
      {
        code,
        message,
        details,
      },
      statusCode,
    );
    
    error.name = code;
    return error;
  }

  // Utility method to create a validation error
  static createValidationError(details: any): HttpException {
    return ErrorHandlingMiddleware.createError(
      'VALIDATION_ERROR',
      'Validation failed',
      HttpStatus.BAD_REQUEST,
      details,
    );
  }

  // Utility method to create a not found error
  static createNotFoundError(resource: string): HttpException {
    return ErrorHandlingMiddleware.createError(
      'NOT_FOUND',
      `${resource} not found`,
      HttpStatus.NOT_FOUND,
    );
  }

  // Utility method to create an unauthorized error
  static createUnauthorizedError(message: string = 'Unauthorized'): HttpException {
    return ErrorHandlingMiddleware.createError(
      'UNAUTHORIZED',
      message,
      HttpStatus.UNAUTHORIZED,
    );
  }

  // Utility method to create a forbidden error
  static createForbiddenError(message: string = 'Forbidden'): HttpException {
    return ErrorHandlingMiddleware.createError(
      'FORBIDDEN',
      message,
      HttpStatus.FORBIDDEN,
    );
  }
}
