/**
 * Audit Logging Service
 * 
 * Comprehensive audit trail for all Module 10 operations
 * Ensures compliance with DPDP Act and enterprise audit requirements
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface AuditLogEntry {
    id?: string;
    timestamp: Date;
    tenantId: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    result: 'success' | 'failure';
    errorMessage?: string;
}

@Injectable()
export class AuditLoggingService {
    private readonly logger = new Logger(AuditLoggingService.name);

    // In production, this would use a dedicated audit_logs table
    // For now, we'll log to application logs with structured format

    async logWorkflowStart(
        tenantId: string,
        userId: string,
        workflowType: string,
        workflowId: string,
        input: Record<string, any>,
        ipAddress?: string
    ): Promise<void> {
        const entry: AuditLogEntry = {
            timestamp: new Date(),
            tenantId,
            userId,
            action: 'WORKFLOW_START',
            resourceType: 'workflow',
            resourceId: workflowId,
            details: {
                workflowType,
                input: this.sanitizeInput(input),
            },
            ipAddress,
            result: 'success',
        };

        await this.writeAuditLog(entry);
    }

    async logWorkflowCompletion(
        tenantId: string,
        userId: string,
        workflowType: string,
        workflowId: string,
        status: 'completed' | 'failed',
        duration: number,
        errorMessage?: string
    ): Promise<void> {
        const entry: AuditLogEntry = {
            timestamp: new Date(),
            tenantId,
            userId,
            action: 'WORKFLOW_COMPLETE',
            resourceType: 'workflow',
            resourceId: workflowId,
            details: {
                workflowType,
                status,
                durationMs: duration,
            },
            result: status === 'completed' ? 'success' : 'failure',
            errorMessage,
        };

        await this.writeAuditLog(entry);
    }

    async logConstraintAnalysis(
        tenantId: string,
        userId: string,
        constraintsFound: number,
        primaryConstraint?: string
    ): Promise<void> {
        const entry: AuditLogEntry = {
            timestamp: new Date(),
            tenantId,
            userId,
            action: 'CONSTRAINT_ANALYSIS',
            resourceType: 'constraint',
            details: {
                constraintsFound,
                primaryConstraint,
            },
            result: 'success',
        };

        await this.writeAuditLog(entry);
    }

    async logRecommendationGeneration(
        tenantId: string,
        userId: string,
        recommendationCount: number,
        topRecommendation?: string
    ): Promise<void> {
        const entry: AuditLogEntry = {
            timestamp: new Date(),
            tenantId,
            userId,
            action: 'RECOMMENDATION_GENERATE',
            resourceType: 'recommendation',
            details: {
                count: recommendationCount,
                topRecommendation,
            },
            result: 'success',
        };

        await this.writeAuditLog(entry);
    }

    async logGatewayRequest(
        tenantId: string,
        userId: string,
        module: string,
        action: string,
        success: boolean,
        errorMessage?: string
    ): Promise<void> {
        const entry: AuditLogEntry = {
            timestamp: new Date(),
            tenantId,
            userId,
            action: 'GATEWAY_REQUEST',
            resourceType: 'module',
            resourceId: module,
            details: {
                module,
                action,
            },
            result: success ? 'success' : 'failure',
            errorMessage,
        };

        await this.writeAuditLog(entry);
    }

    async logEventPublish(
        tenantId: string,
        userId: string,
        eventType: string,
        sourceModule: string
    ): Promise<void> {
        const entry: AuditLogEntry = {
            timestamp: new Date(),
            tenantId,
            userId,
            action: 'EVENT_PUBLISH',
            resourceType: 'event',
            details: {
                eventType,
                sourceModule,
            },
            result: 'success',
        };

        await this.writeAuditLog(entry);
    }

    async logSecurityEvent(
        tenantId: string,
        userId: string,
        eventType: 'authentication' | 'authorization' | 'access_denied',
        details: Record<string, any>,
        ipAddress?: string
    ): Promise<void> {
        const entry: AuditLogEntry = {
            timestamp: new Date(),
            tenantId,
            userId,
            action: `SECURITY_${eventType.toUpperCase()}`,
            resourceType: 'security',
            details,
            ipAddress,
            result: eventType === 'access_denied' ? 'failure' : 'success',
        };

        await this.writeAuditLog(entry);
    }

    async logConfigChange(
        tenantId: string,
        userId: string,
        configKey: string,
        oldValue: any,
        newValue: any,
        ipAddress?: string
    ): Promise<void> {
        const entry: AuditLogEntry = {
            timestamp: new Date(),
            tenantId,
            userId,
            action: 'CONFIG_CHANGE',
            resourceType: 'configuration',
            resourceId: configKey,
            details: {
                configKey,
                oldValue: this.sanitizeInput(oldValue),
                newValue: this.sanitizeInput(newValue),
            },
            ipAddress,
            result: 'success',
        };

        await this.writeAuditLog(entry);
    }

    // ============================================================================
    // Audit Query Methods
    // ============================================================================

    async getAuditTrail(
        tenantId: string,
        filters?: {
            userId?: string;
            action?: string;
            resourceType?: string;
            startDate?: Date;
            endDate?: Date;
            limit?: number;
        }
    ): Promise<AuditLogEntry[]> {
        // In production, this would query from audit_logs table
        // For now, returning empty array as logs are written to file
        this.logger.log(`Querying audit trail for tenant ${tenantId}`, filters);
        return [];
    }

    async getResourceHistory(
        tenantId: string,
        resourceType: string,
        resourceId: string
    ): Promise<AuditLogEntry[]> {
        this.logger.log(`Getting history for ${resourceType}:${resourceId}`);
        return [];
    }

    // ============================================================================
    // Private Methods
    // ============================================================================

    private async writeAuditLog(entry: AuditLogEntry): Promise<void> {
        // In production, write to dedicated audit_logs table with retention policy
        // For now, log as structured JSON for easy parsing

        this.logger.log({
            type: 'AUDIT',
            ...entry,
        });

        // Could also write to file, send to SIEM, etc.
    }

    private sanitizeInput(input: any): any {
        // Remove sensitive data from audit logs
        if (typeof input !== 'object' || input === null) {
            return input;
        }

        const sanitized = { ...input };
        const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'creditCard'];

        for (const key of Object.keys(sanitized)) {
            if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
                sanitized[key] = '***REDACTED***';
            }
        }

        return sanitized;
    }
}
