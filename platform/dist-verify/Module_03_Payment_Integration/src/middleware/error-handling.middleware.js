"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ErrorHandlingMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandlingMiddleware = void 0;
const common_1 = require("@nestjs/common");
let ErrorHandlingMiddleware = ErrorHandlingMiddleware_1 = class ErrorHandlingMiddleware {
    constructor() {
        this.logger = new common_1.Logger(ErrorHandlingMiddleware_1.name);
    }
    use(req, res, next) {
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
    handleError(error, req, res) {
        const requestId = req.requestId || 'unknown';
        // Log the error
        this.logError(error, req, requestId);
        // Determine error type and status code
        const errorResponse = this.createErrorResponse(error, requestId);
        // Send error response
        res.status(errorResponse.statusCode).json(errorResponse.body);
    }
    createErrorResponse(error, requestId) {
        // Handle HTTP exceptions
        if (error instanceof common_1.HttpException) {
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
                            : exceptionResponse.message || error.message,
                        details: typeof exceptionResponse === 'object' ? exceptionResponse.details : undefined,
                        requestId,
                        timestamp: new Date().toISOString(),
                    },
                },
            };
        }
        // Handle validation errors
        if (error.name === 'ValidationError') {
            return {
                statusCode: common_1.HttpStatus.BAD_REQUEST,
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
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
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
                statusCode: common_1.HttpStatus.UNAUTHORIZED,
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
                statusCode: common_1.HttpStatus.UNAUTHORIZED,
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
                statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
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
                statusCode: common_1.HttpStatus.BAD_REQUEST,
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
                statusCode: common_1.HttpStatus.SERVICE_UNAVAILABLE,
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
            statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
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
    getErrorCode(status) {
        switch (status) {
            case common_1.HttpStatus.BAD_REQUEST:
                return 'BAD_REQUEST';
            case common_1.HttpStatus.UNAUTHORIZED:
                return 'UNAUTHORIZED';
            case common_1.HttpStatus.FORBIDDEN:
                return 'FORBIDDEN';
            case common_1.HttpStatus.NOT_FOUND:
                return 'NOT_FOUND';
            case common_1.HttpStatus.METHOD_NOT_ALLOWED:
                return 'METHOD_NOT_ALLOWED';
            case common_1.HttpStatus.CONFLICT:
                return 'CONFLICT';
            case common_1.HttpStatus.TOO_MANY_REQUESTS:
                return 'TOO_MANY_REQUESTS';
            case common_1.HttpStatus.UNPROCESSABLE_ENTITY:
                return 'UNPROCESSABLE_ENTITY';
            case common_1.HttpStatus.SERVICE_UNAVAILABLE:
                return 'SERVICE_UNAVAILABLE';
            case common_1.HttpStatus.INTERNAL_SERVER_ERROR:
                return 'INTERNAL_SERVER_ERROR';
            default:
                return 'UNKNOWN_ERROR';
        }
    }
    logError(error, req, requestId) {
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
    getClientIP(req) {
        return (req.ip ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection?.socket?.remoteAddress ||
            'unknown');
    }
    // Utility method to create custom errors
    createError(message, code, statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR) {
        const error = new Error(message);
        error.code = code;
        error.statusCode = statusCode;
        return error;
    }
    // Utility method to handle async errors
    async handleAsync(operation, errorMessage = 'Operation failed') {
        try {
            return await operation();
        }
        catch (error) {
            this.logger.error(errorMessage, error);
            throw error;
        }
    }
    // Utility method to validate and handle errors
    validateAndHandle(data, validator, errorMessage = 'Validation failed') {
        if (!validator(data)) {
            const error = new Error(errorMessage);
            error.name = 'ValidationError';
            throw error;
        }
        return data;
    }
};
exports.ErrorHandlingMiddleware = ErrorHandlingMiddleware;
exports.ErrorHandlingMiddleware = ErrorHandlingMiddleware = ErrorHandlingMiddleware_1 = __decorate([
    (0, common_1.Injectable)()
], ErrorHandlingMiddleware);
//# sourceMappingURL=error-handling.middleware.js.map