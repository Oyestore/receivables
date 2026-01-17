import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    AccountingSyncError,
    ErrorSeverity,
    ErrorCategory,
    ErrorResolutionStatus,
} from '../entities/accounting-sync-error.entity';

/**
 * Error context for better error tracking
 */
export interface ErrorContext {
    tenantId: string;
    accountingSystem: string;
    operation: string;
    entityType?: string;
    entityId?: string;
    syncLogId?: string;
    requestId?: string;
    metadata?: Record<string, any>;
}

/**
 * Error handling result
 */
export interface ErrorHandlingResult {
    errorId: string;
    isRetryable: boolean;
    severity: ErrorSeverity;
    category: ErrorCategory;
    suggestedFix?: string;
    shouldNotifyAdmin: boolean;
}

/**
 * Centralized error handler service for accounting integration
 * 
 * Responsibilities:
 * - Classify and categorize errors
 * - Determine retry-ability
 * - Store error details in database
 * - Generate suggested fixes
 * - Manage admin notifications
 * 
 * @example
 * ```typescript
 * try {
 *   await tallyConnector.fetchCustomers();
 * } catch (error) {
 *   const result = await errorHandler.handleError(error, context);
 *   if (result.isRetryable) {
 *     // Queue for retry
 *   }
 * }
 * ```
 */
@Injectable()
export class ErrorHandlerService {
    private readonly logger = new Logger(ErrorHandlerService.name);

    constructor(
        @InjectRepository(AccountingSyncError)
        private readonly errorRepo: Repository<AccountingSyncError>,
    ) { }

    /**
     * Handle and classify an error
     * 
     * @param error - Error that occurred
     * @param context - Error context
     * @returns Error handling result
     */
    async handleError(
        error: Error,
        context: ErrorContext
    ): Promise<ErrorHandlingResult> {
        try {
            // Classify error
            const category = this.classifyError(error);
            const severity = this.determineSeverity(error, category);
            const isRetryable = this.isRetryable(error, category);
            const suggestedFix = this.generateSuggestedFix(error, category);

            // Create error record
            const errorRecord = this.errorRepo.create({
                tenant_id: context.tenantId,
                accounting_system: context.accountingSystem,
                sync_log_id: context.syncLogId,
                severity,
                category,
                error_message: error.message,
                error_code: (error as any).code,
                stack_trace: this.sanitizeStackTrace(error.stack),
                error_context: {
                    entity_type: context.entityType,
                    entity_id: context.entityId,
                    operation: context.operation,
                    endpoint: (error as any).endpoint,
                    http_status: (error as any).statusCode || (error as any).status,
                    request_id: context.requestId,
                    raw_error: this.sanitizeErrorObject(error),
                },
                is_retryable: isRetryable,
                retry_count: 0,
                max_retries: this.getMaxRetries(category),
                resolution_status: Error ResolutionStatus.UNRESOLVED,
                suggested_fix: suggestedFix,
                admin_notified: false,
                metadata: context.metadata,
            });

            const savedError = await this.errorRepo.save(errorRecord);

            // Determine if admin should be notified
            const shouldNotifyAdmin = this.shouldNotifyAdmin(severity, category);

            // Log error
            this.logError(error, context, severity, category);

            return {
                errorId: savedError.id,
                isRetryable,
                severity,
                category,
                suggestedFix,
                shouldNotifyAdmin,
            };
        } catch (handlingError) {
            // Error handling itself failed - log but don't throw
            this.logger.error('Failed to handle error:', handlingError.stack);

            // Return safe defaults
            return {
                errorId: 'UNKNOWN',
                isRetryable: false,
                severity: ErrorSeverity.HIGH,
                category: ErrorCategory.UNKNOWN,
                shouldNotifyAdmin: true,
            };
        }
    }

    /**
     * Mark error as resolved
     * 
     * @param errorId - Error ID
     * @param resolutionStatus - How it was resolved
     * @param notes - Resolution notes
     * @param resolvedBy - User who resolved it
     */
    async resolveError(
        errorId: string,
        resolutionStatus: ErrorResolutionStatus,
        notes?: string,
        resolvedBy?: string
    ): Promise<void> {
        await this.errorRepo.update(errorId, {
            resolution_status: resolutionStatus,
            resolution_notes: notes,
            resolved_by: resolvedBy,
            resolved_at: new Date(),
        });

        this.logger.log(`Error ${errorId} resolved as ${resolutionStatus}`);
    }

    /**
     * Increment retry count for an error
     * 
     * @param errorId - Error ID
     * @param nextRetryAt - When next retry is scheduled
     */
    async incrementRetryCount(errorId: string, nextRetryAt?: Date): Promise<void> {
        const error = await this.errorRepo.findOne({ where: { id: errorId } });

        if (!error) {
            this.logger.warn(`Error ${errorId} not found for retry increment`);
            return;
        }

        await this.errorRepo.update(errorId, {
            retry_count: error.retry_count + 1,
            last_retry_at: new Date(),
            next_retry_at: nextRetryAt,
        });
    }

    // ==========================================
    // PRIVATE METHODS
    // ==========================================

    /**
     * Classify error into category
     */
    private classifyError(error: Error): ErrorCategory {
        const errorCode = (error as any).code;
        const errorMessage = error.message.toLowerCase();
        const statusCode = (error as any).statusCode || (error as any).status;

        // Network/connection errors
        if (errorCode && ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(errorCode)) {
            return ErrorCategory.CONNECTION;
        }

        // HTTP status code classification
        if (statusCode) {
            if (statusCode === 401) return ErrorCategory.AUTHENTICATION;
            if (statusCode === 403) return ErrorCategory.AUTHORIZATION;
            if (statusCode === 400 || statusCode === 422) return ErrorCategory.VALIDATION;
            if (statusCode === 408 || statusCode === 504) return ErrorCategory.TIMEOUT;
            if (statusCode === 429) return ErrorCategory.RATE_LIMIT;
            if (statusCode >= 500) return ErrorCategory.SYSTEM;
        }

        // Message-based classification
        if (errorMessage.includes('auth') || errorMessage.includes('credential')) {
            return ErrorCategory.AUTHENTICATION;
        }

        if (errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
            return ErrorCategory.AUTHORIZATION;
        }

        if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
            return ErrorCategory.VALIDATION;
        }

        if (errorMessage.includes('mapping') || errorMessage.includes('field')) {
            return ErrorCategory.MAPPING;
        }

        if (errorMessage.includes('conflict') || errorMessage.includes('duplicate')) {
            return ErrorCategory.CONFLICT;
        }

        if (errorMessage.includes('timeout')) {
            return ErrorCategory.TIMEOUT;
        }

        if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
            return ErrorCategory.RATE_LIMIT;
        }

        return ErrorCategory.UNKNOWN;
    }

    /**
     * Determine error severity
     */
    private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
        // Critical errors
        if (category === ErrorCategory.SYSTEM) {
            return ErrorSeverity.CRITICAL;
        }

        if (category === ErrorCategory.DATA_INTEGRITY) {
            return ErrorSeverity.CRITICAL;
        }

        // High severity errors
        if (category === ErrorCategory.AUTHENTICATION) {
            return ErrorSeverity.HIGH;
        }

        if (category === ErrorCategory.AUTHORIZATION) {
            return ErrorSeverity.HIGH;
        }

        // Medium severity errors
        if (category === ErrorCategory.VALIDATION) {
            return ErrorSeverity.MEDIUM;
        }

        if (category === ErrorCategory.MAPPING) {
            return ErrorSeverity.MEDIUM;
        }

        if (category === ErrorCategory.CONFLICT) {
            return ErrorSeverity.MEDIUM;
        }

        // Low severity errors (transient)
        if (category === ErrorCategory.CONNECTION) {
            return ErrorSeverity.LOW;
        }

        if (category === ErrorCategory.TIMEOUT) {
            return ErrorSeverity.LOW;
        }

        if (category === ErrorCategory.RATE_LIMIT) {
            return ErrorSeverity.LOW;
        }

        return ErrorSeverity.MEDIUM;
    }

    /**
     * Check if error is retryable
     */
    private isRetryable(error: Error, category: ErrorCategory): boolean {
        // Never retry authentication/authorization errors
        if (category === ErrorCategory.AUTHENTICATION || category === ErrorCategory.AUTHORIZATION) {
            return false;
        }

        // Never retry validation errors
        if (category === ErrorCategory.VALIDATION) {
            return false;
        }

        // Retry transient errors
        if ([
            ErrorCategory.CONNECTION,
            ErrorCategory.TIMEOUT,
            ErrorCategory.RATE_LIMIT,
            ErrorCategory.SYSTEM,
        ].includes(category)) {
            return true;
        }

        // Retry conflicts (might resolve)
        if (category === ErrorCategory.CONFLICT) {
            return true;
        }

        return false;
    }

    /**
     * Generate suggested fix for error
     */
    private generateSuggestedFix(error: Error, category: ErrorCategory): string {
        switch (category) {
            case ErrorCategory.AUTHENTICATION:
                return 'Check credentials in configuration. Verify API keys, username/password, or OAuth tokens are correct and not expired.';

            case ErrorCategory.AUTHORIZATION:
                return 'Verify user has necessary permissions in the accounting system. Check role assignments and access rights.';

            case ErrorCategory.CONNECTION:
                return 'Check network connectivity to accounting system. Verify firewall rules and server URL/port configuration.';

            case ErrorCategory.VALIDATION:
                return 'Review data being sent. Check required fields, data types, and value constraints match accounting system requirements.';

            case ErrorCategory.MAPPING:
                return 'Review field mappings configuration. Ensure all required platform fields are mapped to accounting system fields.';

            case ErrorCategory.CONFLICT:
                return 'Check for duplicate records or conflicting data. Review conflict resolution strategy in configuration.';

            case ErrorCategory.TIMEOUT:
                return 'Operation took too long. Consider increasing timeout settings or reducing batch size.';

            case ErrorCategory.RATE_LIMIT:
                return 'API rate limit exceeded. Wait before retrying or reduce sync frequency.';

            case ErrorCategory.SYSTEM:
                return 'Accounting system error. Check accounting system status and logs. May require vendor support.';

            case ErrorCategory.DATA_INTEGRITY:
                return 'Data consistency issue detected. Review data in both systems and resolve discrepancies manually.';

            default:
                return 'Review error details and logs. Contact support if issue persists.';
        }
    }

    /**
     * Get max retries based on category
     */
    private getMaxRetries(category: ErrorCategory): number {
        switch (category) {
            case ErrorCategory.CONNECTION:
            case ErrorCategory.TIMEOUT:
                return 5; // Transient errors - retry more

            case ErrorCategory.RATE_LIMIT:
                return 3; // Rate limit - retry with backoff

            case ErrorCategory.SYSTEM:
                return 3; // System errors - retry a few times

            case ErrorCategory.CONFLICT:
                return 2; // Conflicts - retry once or twice

            default:
                return 0; // Don't retry others
        }
    }

    /**
     * Should we notify admin for this error?
     */
    private shouldNotifyAdmin(severity: ErrorSeverity, category: ErrorCategory): boolean {
        // Always notify for critical errors
        if (severity === ErrorSeverity.CRITICAL) {
            return true;
        }

        // Notify for high severity errors
        if (severity === ErrorSeverity.HIGH) {
            return true;
        }

        // Notify for auth errors (needs manual fix)
        if (category === ErrorCategory.AUTHENTICATION || category === ErrorCategory.AUTHORIZATION) {
            return true;
        }

        // Don't notify for transient errors
        if ([ErrorCategory.CONNECTION, ErrorCategory.TIMEOUT, ErrorCategory.RATE_LIMIT].includes(category)) {
            return false;
        }

        return false;
    }

    /**
     * Sanitize stack trace (remove sensitive data, limit length)
     */
    private sanitizeStackTrace(stackTrace?: string): string {
        if (!stackTrace) {
            return '';
        }

        // Remove potential sensitive data (API keys, passwords in URLs, etc.)
        let sanitized = stackTrace
            .replace(/apikey=[^&\s]+/gi, 'apikey=***')
            .replace(/password=[^&\s]+/gi, 'password=***')
            .replace(/token=[^&\s]+/gi, 'token=***');

        // Limit length to prevent database bloat
        const maxLength = 5000;
        if (sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength) + '\n... (truncated)';
        }

        return sanitized;
    }

    /**
     * Sanitize error object (remove sensitive data)
     */
    private sanitizeErrorObject(error: any): any {
        const sanitized = { ...error };

        // Remove sensitive fields
        const sensitiveFields = ['password', 'api_key', 'token', 'secret', 'authorization'];

        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '***';
            }
        }

        // Sanitize nested objects
        if (sanitized.config) {
            for (const field of sensitiveFields) {
                if (sanitized.config[field]) {
                    sanitized.config[field] = '***';
                }
            }
        }

        return sanitized;
    }

    /**
     * Log error with appropriate level
     */
    private logError(
        error: Error,
        context: ErrorContext,
        severity: ErrorSeverity,
        category: ErrorCategory
    ): void {
        const logMessage =
            `Accounting sync error [${severity}/${category}] - ` +
            `Tenant: ${context.tenantId}, ` +
            `System: ${context.accountingSystem}, ` +
            `Operation: ${context.operation}, ` +
            `Error: ${error.message}`;

        switch (severity) {
            case ErrorSeverity.CRITICAL:
                this.logger.error(logMessage, error.stack);
                break;
            case ErrorSeverity.HIGH:
                this.logger.error(logMessage);
                break;
            case ErrorSeverity.MEDIUM:
                this.logger.warn(logMessage);
                break;
            case ErrorSeverity.LOW:
                this.logger.debug(logMessage);
                break;
        }
    }
}
