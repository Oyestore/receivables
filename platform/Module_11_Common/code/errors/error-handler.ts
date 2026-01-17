import { Request, Response, NextFunction } from 'express';
import { AppError } from './app-error';
import { Logger } from '../logging/logger';

const logger = new Logger('ErrorHandler');

/**
 * Global error handling middleware
 * Catches all errors and formats them for client response
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If headers already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle AppError instances
  if (err instanceof AppError) {
    logger.error('Application error occurred', err.toLogFormat());

    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Handle unknown errors
  logger.error('Unexpected error occurred', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Don't expose internal error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;

  res.status(500).json({
    error: {
      message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 * Should be registered after all routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.url} not found`,
      code: 'ROUTE_NOT_FOUND',
      statusCode: 404,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Process uncaught exceptions
 */
export function handleUncaughtException(error: Error): void {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack,
  });

  // Give time for logs to flush
  setTimeout(() => {
    process.exit(1);
  }, 1000);
}

/**
 * Process unhandled promise rejections
 */
export function handleUnhandledRejection(reason: unknown): void {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });

  // Give time for logs to flush
  setTimeout(() => {
    process.exit(1);
  }, 1000);
}
