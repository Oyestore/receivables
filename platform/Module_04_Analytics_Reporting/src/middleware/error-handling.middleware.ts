import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ErrorHandlingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ErrorHandlingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Global error handler
    res.on('error', (error) => {
      this.handleError(error, req, res);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection', {
        reason: reason,
        promise: promise,
        timestamp: new Date().toISOString(),
      });
    });

    next();
  }

  private handleError(error: Error, req: Request, res: Response): void {
    const errorResponse = this.formatErrorResponse(error, req);
    
    this.logger.error('Request error', {
      requestId: req['requestId'],
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      statusCode: errorResponse.statusCode,
      timestamp: new Date().toISOString(),
    });

    // Don't send response if headers already sent
    if (!res.headersSent) {
      res.status(errorResponse.statusCode).json(errorResponse.body);
    }
  }

  private formatErrorResponse(error: Error, req: Request): { statusCode: number; body: any } {
    // Handle different types of errors
    if (error.name === 'ValidationError') {
      return {
        statusCode: 400,
        body: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.message,
            timestamp: new Date().toISOString(),
            requestId: req['requestId'],
          },
        },
      };
    }

    if (error.name === 'UnauthorizedError') {
      return {
        statusCode: 401,
        body: {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
            requestId: req['requestId'],
          },
        },
      };
    }

    if (error.name === 'ForbiddenError') {
      return {
        statusCode: 403,
        body: {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied',
            timestamp: new Date().toISOString(),
            requestId: req['requestId'],
          },
        },
      };
    }

    if (error.name === 'NotFoundError') {
      return {
        statusCode: 404,
        body: {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found',
            timestamp: new Date().toISOString(),
            requestId: req['requestId'],
          },
        },
      };
    }

    if (error.name === 'ConflictError') {
      return {
        statusCode: 409,
        body: {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Resource conflict',
            timestamp: new Date().toISOString(),
            requestId: req['requestId'],
          },
        },
      };
    }

    if (error.name === 'TooManyRequestsError') {
      return {
        statusCode: 429,
        body: {
          success: false,
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Rate limit exceeded',
            timestamp: new Date().toISOString(),
            requestId: req['requestId'],
          },
        },
      };
    }

    if (error.name === 'DatabaseError') {
      return {
        statusCode: 500,
        body: {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Database operation failed',
            timestamp: new Date().toISOString(),
            requestId: req['requestId'],
          },
        },
      };
    }

    if (error.name === 'ExternalServiceError') {
      return {
        statusCode: 502,
        body: {
          success: false,
          error: {
            code: 'EXTERNAL_SERVICE_ERROR',
            message: 'External service unavailable',
            timestamp: new Date().toISOString(),
            requestId: req['requestId'],
          },
        },
      };
    }

    if (error.name === 'TimeoutError') {
      return {
        statusCode: 504,
        body: {
          success: false,
          error: {
            code: 'TIMEOUT_ERROR',
            message: 'Request timeout',
            timestamp: new Date().toISOString(),
            requestId: req['requestId'],
          },
        },
      };
    }

    // Default internal server error
    return {
      statusCode: 500,
      body: {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : error.message,
          timestamp: new Date().toISOString(),
          requestId: req['requestId'],
          ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
        },
      },
    };
  }
}

// Custom error classes for better error handling
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class TooManyRequestsError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'TooManyRequestsError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string = 'Database operation failed') {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends Error {
  constructor(message: string = 'External service unavailable') {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Request timeout') {
    super(message);
    this.name = 'TimeoutError';
  }
}
