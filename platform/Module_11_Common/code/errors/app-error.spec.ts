import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
  ServiceUnavailableError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError,
  TokenError,
  TenantError,
} from './app-error';

describe('AppError', () => {
  describe('Base AppError', () => {
    it('should create error with default values', () => {
      const error = new AppError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create error with custom values', () => {
      const details = { field: 'email', value: 'invalid' };
      const error = new AppError('Custom error', 400, 'CUSTOM_ERROR', false, details);

      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('CUSTOM_ERROR');
      expect(error.isOperational).toBe(false);
      expect(error.details).toEqual(details);
    });

    it('should convert to JSON format', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      const json = error.toJSON();

      expect(json).toHaveProperty('error');
      expect(json.error).toHaveProperty('message', 'Test error');
      expect(json.error).toHaveProperty('code', 'TEST_ERROR');
      expect(json.error).toHaveProperty('statusCode', 400);
      expect(json.error).toHaveProperty('timestamp');
    });

    it('should convert to log format', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      const logFormat = error.toLogFormat();

      expect(logFormat).toHaveProperty('message', 'Test error');
      expect(logFormat).toHaveProperty('errorCode', 'TEST_ERROR');
      expect(logFormat).toHaveProperty('statusCode', 400);
      expect(logFormat).toHaveProperty('timestamp');
      expect(logFormat).toHaveProperty('stack');
      expect(logFormat).toHaveProperty('isOperational', true);
    });

    it('should include details in JSON when provided', () => {
      const details = { field: 'email' };
      const error = new AppError('Test error', 400, 'TEST_ERROR', true, details);
      const json = error.toJSON();

      expect(json.error).toHaveProperty('details', details);
    });

    it('should have proper stack trace', () => {
      const error = new AppError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });
  });

  describe('BadRequestError', () => {
    it('should create 400 error', () => {
      const error = new BadRequestError('Invalid request');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('Invalid request');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('BAD_REQUEST');
    });

    it('should use default message', () => {
      const error = new BadRequestError();

      expect(error.message).toBe('Bad Request');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create 401 error', () => {
      const error = new UnauthorizedError('Authentication failed');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('UNAUTHORIZED');
    });
  });

  describe('ForbiddenError', () => {
    it('should create 403 error', () => {
      const error = new ForbiddenError('Access denied');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('NotFoundError', () => {
    it('should create 404 error', () => {
      const error = new NotFoundError('User not found');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('ConflictError', () => {
    it('should create 409 error', () => {
      const error = new ConflictError('Resource already exists');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.errorCode).toBe('CONFLICT');
    });
  });

  describe('ValidationError', () => {
    it('should create 422 error', () => {
      const details = { field: 'email', message: 'Invalid email format' };
      const error = new ValidationError('Validation failed', details);

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(422);
      expect(error.errorCode).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(details);
    });
  });

  describe('InternalServerError', () => {
    it('should create 500 error', () => {
      const error = new InternalServerError('Server error');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(InternalServerError);
      expect(error.message).toBe('Server error');
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('INTERNAL_ERROR');
    });
  });

  describe('ServiceUnavailableError', () => {
    it('should create 503 error', () => {
      const error = new ServiceUnavailableError('Service down');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ServiceUnavailableError);
      expect(error.message).toBe('Service down');
      expect(error.statusCode).toBe(503);
      expect(error.errorCode).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('DatabaseError', () => {
    it('should create database error', () => {
      const error = new DatabaseError('Connection failed');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.message).toBe('Connection failed');
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('DATABASE_ERROR');
    });
  });

  describe('ExternalServiceError', () => {
    it('should create external service error', () => {
      const error = new ExternalServiceError('API call failed');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ExternalServiceError);
      expect(error.message).toBe('API call failed');
      expect(error.statusCode).toBe(502);
      expect(error.errorCode).toBe('EXTERNAL_SERVICE_ERROR');
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error', () => {
      const error = new RateLimitError('Too many requests');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('TokenError', () => {
    it('should create token error', () => {
      const error = new TokenError('Invalid token');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(TokenError);
      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('TOKEN_ERROR');
    });
  });

  describe('TenantError', () => {
    it('should create tenant error', () => {
      const error = new TenantError('Tenant not found');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(TenantError);
      expect(error.message).toBe('Tenant not found');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('TENANT_ERROR');
    });
  });

  describe('instanceof checks', () => {
    it('should work with instanceof operator', () => {
      const error = new BadRequestError('Test');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof BadRequestError).toBe(true);
      expect(error instanceof UnauthorizedError).toBe(false);
    });
  });
});
