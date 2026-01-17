import { Injectable } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class LoggerService {
    private logger: winston.Logger;

    constructor() {
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss',
                }),
                winston.format.errors({ stack: true }),
                winston.format.splat(),
                winston.format.json(),
            ),
            defaultMeta: { service: 'invoice-management' },
            transports: [
                // Write all logs to combined.log
                new winston.transports.File({
                    filename: 'logs/combined.log',
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                }),
                // Write all logs with level 'error' to error.log
                new winston.transports.File({
                    filename: 'logs/error.log',
                    level: 'error',
                    maxsize: 5242880,
                    maxFiles: 5,
                }),
            ],
        });

        // If not in production, also log to console with colors
        if (process.env.NODE_ENV !== 'production') {
            this.logger.add(
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple(),
                    ),
                }),
            );
        }
    }

    // Structured logging methods
    info(message: string, metadata?: any): void {
        this.logger.info(message, metadata);
    }

    error(message: string, error?: Error, metadata?: any): void {
        this.logger.error(message, {
            ...metadata,
            error: error?.message,
            stack: error?.stack,
        });
    }

    warn(message: string, metadata?: any): void {
        this.logger.warn(message, metadata);
    }

    debug(message: string, metadata?: any): void {
        this.logger.debug(message, metadata);
    }

    // Business event logging
    logInvoiceCreated(invoiceId: string, tenantId: string, amount: number): void {
        this.info('Invoice created', {
            event: 'invoice_created',
            invoice_id: invoiceId,
            tenant_id: tenantId,
            amount,
        });
    }

    logInvoiceSent(invoiceId: string, tenantId: string, channel: string): void {
        this.info('Invoice sent', {
            event: 'invoice_sent',
            invoice_id: invoiceId,
            tenant_id: tenantId,
            channel,
        });
    }

    logInvoicePaid(invoiceId: string, tenantId: string, amount: number): void {
        this.info('Invoice paid', {
            event: 'invoice_paid',
            invoice_id: invoiceId,
            tenant_id: tenantId,
            amount,
        });
    }

    logApprovalGranted(invoiceId: string, approverId: string): void {
        this.info('Approval granted', {
            event: 'approval_granted',
            invoice_id: invoiceId,
            approver_id: approverId,
        });
    }

    logApprovalRejected(invoiceId: string, approverId: string, reason: string): void {
        this.warn('Approval rejected', {
            event: 'approval_rejected',
            invoice_id: invoiceId,
            approver_id: approverId,
            reason,
        });
    }

    // Audit logging
    logAuditEvent(
        userId: string,
        action: string,
        resourceType: string,
        resourceId: string,
        changes?: any,
    ): void {
        this.info('Audit event', {
            event_type: 'audit',
            user_id: userId,
            action,
            resource_type: resourceType,
            resource_id: resourceId,
            changes,
        });
    }

    // Performance logging
    logPerformance(operation: string, duration: number, metadata?: any): void {
        if (duration > 1000) {
            this.warn('Slow operation detected', {
                event: 'performance',
                operation,
                duration_ms: duration,
                ...metadata,
            });
        } else {
            this.debug('Operation completed', {
                event: 'performance',
                operation,
                duration_ms: duration,
                ...metadata,
            });
        }
    }

    // Security logging
    logSecurityEvent(
        event: string,
        userId?: string,
        ipAddress?: string,
        metadata?: any,
    ): void {
        this.warn('Security event', {
            event_type: 'security',
            event,
            user_id: userId,
            ip_address: ipAddress,
            ...metadata,
        });
    }
}
