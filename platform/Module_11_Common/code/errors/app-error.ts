/**
 * Base Application Error Class
 * All custom errors in the platform should extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode: string;
  public readonly timestamp: Date;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
    
    // Set the prototype explicitly to ensure instanceof works correctly
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Convert error to JSON format for API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      error: {
        message: this.message,
        code: this.errorCode,
        statusCode: this.statusCode,
        timestamp: this.timestamp.toISOString(),
        ...(this.details && { details: this.details }),
      },
    };
  }

  /**
   * Convert error to log format
   */
  toLogFormat(): Record<string, unknown> {
    return {
      message: this.message,
      errorCode: this.errorCode,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      isOperational: this.isOperational,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * 400 Bad Request - Client sent invalid data
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', details?: Record<string, unknown>) {
    super(message, 400, 'BAD_REQUEST', true, details);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * 401 Unauthorized - Authentication required or failed
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: Record<string, unknown>) {
    super(message, 401, 'UNAUTHORIZED', true, details);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 403 Forbidden - User doesn't have permission
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: Record<string, unknown>) {
    super(message, 403, 'FORBIDDEN', true, details);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 404 Not Found - Resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource Not Found', details?: Record<string, unknown>) {
    super(message, 404, 'NOT_FOUND', true, details);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 409 Conflict - Resource already exists or conflict with current state
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', true, details);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 422 Unprocessable Entity - Validation failed
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation Failed', details?: Record<string, unknown>) {
    super(message, 422, 'VALIDATION_ERROR', true, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal Server Error', details?: Record<string, unknown>) {
    super(message, 500, 'INTERNAL_ERROR', true, details);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * 503 Service Unavailable - Service temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service Unavailable', details?: Record<string, unknown>) {
    super(message, 503, 'SERVICE_UNAVAILABLE', true, details);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * Database Error - Database operation failed
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database Error', details?: Record<string, unknown>) {
    super(message, 500, 'DATABASE_ERROR', true, details);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * External Service Error - Third-party service failed
 */
export class ExternalServiceError extends AppError {
  constructor(message: string = 'External Service Error', details?: Record<string, unknown>) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', true, details);
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/**
 * Rate Limit Error - Too many requests
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate Limit Exceeded', details?: Record<string, unknown>) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true, details);
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Token Error - JWT token issues
 */
export class TokenError extends AppError {
  constructor(message: string = 'Invalid Token', details?: Record<string, unknown>) {
    super(message, 401, 'TOKEN_ERROR', true, details);
    Object.setPrototypeOf(this, TokenError.prototype);
  }
}

/**
 * Multi-Tenancy Error - Tenant-related issues
 */
export class TenantError extends AppError {
  constructor(message: string = 'Tenant Error', details?: Record<string, unknown>) {
    super(message, 400, 'TENANT_ERROR', true, details);
    Object.setPrototypeOf(this, TenantError.prototype);
  }
}
