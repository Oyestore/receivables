import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global HTTP Exception Filter
 * Provides consistent error responses and prevents sensitive data leakage
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger('HttpExceptionFilter');

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let error = 'InternalServerError';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                message = (exceptionResponse as any).message || message;
                error = (exceptionResponse as any).error || error;
            }
        } else if (exception instanceof Error) {
            message = exception.message;
        }

        // SECURITY: Log error without exposing sensitive data
        this.logger.error(
            `${request.method} ${request.url} - Status: ${status}`,
            {
                statusCode: status,
                path: request.url,
                method: request.method,
                timestamp: new Date().toISOString(),
                // SECURITY: Don't log full request body or headers (may contain secrets)
                userAgent: request.get('user-agent'),
                ip: request.ip,
            }
        );

        // SECURITY: Don't expose stack traces in production
        const errorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            error,
            message: process.env.NODE_ENV === 'production'
                ? this.sanitizeMessage(message)
                : message,
        };

        response.status(status).json(errorResponse);
    }

    /**
     * Sanitize error messages to prevent information disclosure
     */
    private sanitizeMessage(message: string): string {
        // Remove potential sensitive information from error messages
        const sensitivePatterns = [
            /password/gi,
            /token/gi,
            /secret/gi,
            /api[_-]key/gi,
            /\b\d{16}\b/g, // Credit card numbers
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
        ];

        let sanitized = message;
        sensitivePatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '[REDACTED]');
        });

        return sanitized;
    }
}
