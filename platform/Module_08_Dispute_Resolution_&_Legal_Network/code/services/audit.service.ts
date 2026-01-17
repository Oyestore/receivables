import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
    DisputeAuditLog,
    AuditAction,
    AuditEntityType,
} from '../entities/dispute-audit-log.entity';

interface AuditLogCreate {
    tenantId: string;
    entityType: AuditEntityType;
    entityId: string;
    action: AuditAction;
    performedById?: string;
    performedByName?: string;
    performedByRole?: string;
    changes?: Array<{
        field: string;
        oldValue: any;
        newValue: any;
    }>;
    metadata?: {
        ipAddress?: string;
        userAgent?: string;
        requestId?: string;
        sessionId?: string;
        reason?: string;
    };
    description?: string;
    fromStatus?: string;
    toStatus?: string;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);
    private readonly DATA_RETENTION_YEARS = 7; // For compliance (GDPR, etc.)

    constructor(
        @InjectRepository(DisputeAuditLog)
        private auditLogRepo: Repository<DisputeAuditLog>,
    ) { }

    /**
     * Create audit log (immutable)
     */
    async log(data: AuditLogCreate): Promise<DisputeAuditLog> {
        const log = this.auditLogRepo.create({
            ...data,
            performedAt: new Date(),
            expiresAt: new Date(Date.now() + this.DATA_RETENTION_YEARS * 365 * 24 * 60 * 60 * 1000),
            isSensitive: this.isSensitiveAction(data.action),
        });

        const saved = await this.auditLogRepo.save(log);

        // Don't log PII in application logs
        if (!log.isSensitive) {
            this.logger.log(
                `Audit: ${data.action} on ${data.entityType}:${data.entityId} by ${data.performedByName}`,
            );
        } else {
            this.logger.log(`Audit: ${data.action} on ${data.entityType} (sensitive data redacted)`);
        }

        return saved;
    }

    /**
     * Get audit logs for an entity
     */
    async getEntityLogs(
        entityId: string,
        tenantId: string,
        entityType?: AuditEntityType,
    ): Promise<DisputeAuditLog[]> {
        const where: any = { entityId, tenantId };
        if (entityType) {
            where.entityType = entityType;
        }

        return this.auditLogRepo.find({
            where,
            order: { performedAt: 'DESC' },
        });
    }

    /**
     * Get logs by action
     */
    async getLogsByAction(
        action: AuditAction,
        tenantId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<DisputeAuditLog[]> {
        const where: any = { action, tenantId };

        if (startDate && endDate) {
            where.performedAt = Between(startDate, endDate);
        }

        return this.auditLogRepo.find({
            where,
            order: { performedAt: 'DESC' },
            take: 1000, // Limit for performance
        });
    }

    /**
     * Get logs by user
     */
    async getUserLogs(
        performedById: string,
        tenantId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<DisputeAuditLog[]> {
        const where: any = { performedById, tenantId };

        if (startDate && endDate) {
            where.performedAt = Between(startDate, endDate);
        }

        return this.auditLogRepo.find({
            where,
            order: { performedAt: 'DESC' },
            take: 1000,
        });
    }

    /**
     * Export audit logs for compliance
     */
    async exportLogs(
        tenantId: string,
        startDate: Date,
        endDate: Date,
        entityType?: AuditEntityType,
    ): Promise<DisputeAuditLog[]> {
        const where: any = {
            tenantId,
            performedAt: Between(startDate, endDate),
        };

        if (entityType) {
            where.entityType = entityType;
        }

        return this.auditLogRepo.find({
            where,
            order: { performedAt: 'ASC' },
        });
    }

    /**
     * Archive old logs
     */
    async archiveExpiredLogs(): Promise<number> {
        const result = await this.auditLogRepo.update(
            {
                expiresAt: Between(new Date(0), new Date()),
                isArchived: false,
            },
            { isArchived: true },
        );

        this.logger.log(`Archived ${result.affected} expired audit logs`);
        return result.affected || 0;
    }

    /**
     * Get audit summary for a period
     */
    async getAuditSummary(
        tenantId: string,
        startDate: Date,
        endDate: Date,
    ): Promise<{
        total: number;
        byAction: Record<AuditAction, number>;
        byEntityType: Record<AuditEntityType, number>;
    }> {
        const logs = await this.auditLogRepo.find({
            where: {
                tenantId,
                performedAt: Between(startDate, endDate),
            },
        });

        const summary = {
            total: logs.length,
            byAction: {} as Record<AuditAction, number>,
            byEntityType: {} as Record<AuditEntityType, number>,
        };

        for (const log of logs) {
            summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1;
            summary.byEntityType[log.entityType] = (summary.byEntityType[log.entityType] || 0) + 1;
        }

        return summary;
    }

    /**
     * Track dispute lifecycle changes
     */
    async logDisputeStatusChange(
        disputeId: string,
        tenantId: string,
        fromStatus: string,
        toStatus: string,
        performedById: string,
        performedByName: string,
        reason?: string,
    ): Promise<DisputeAuditLog> {
        return this.log({
            tenantId,
            entityType: AuditEntityType.DISPUTE_CASE,
            entityId: disputeId,
            action: AuditAction.STATUS_CHANGE,
            performedById,
            performedByName,
            fromStatus,
            toStatus,
            changes: [
                {
                    field: 'status',
                    oldValue: fromStatus,
                    newValue: toStatus,
                },
            ],
            description: reason || `Status changed from ${fromStatus} to ${toStatus}`,
        });
    }

    /**
     * Track document uploads
     */
    async logDocumentUpload(
        disputeId: string,
        tenantId: string,
        documentId: string,
        documentName: string,
        performedById: string,
        performedByName: string,
    ): Promise<DisputeAuditLog> {
        return this.log({
            tenantId,
            entityType: AuditEntityType.DISPUTE_CASE,
            entityId: disputeId,
            action: AuditAction.DOCUMENT_UPLOAD,
            performedById,
            performedByName,
            description: `Document uploaded: ${documentName}`,
            metadata: {
                reason: `Document ${documentId} uploaded`,
            },
        });
    }

    /**
     * Track approval decisions
     */
    async logApproval(
        disputeId: string,
        tenantId: string,
        approvalId: string,
        decision: 'approved' | 'rejected',
        performedById: string,
        performedByName: string,
        comments?: string,
    ): Promise<DisputeAuditLog> {
        return this.log({
            tenantId,
            entityType: AuditEntityType.APPROVAL,
            entityId: approvalId,
            action: decision === 'approved' ? AuditAction.APPROVE : AuditAction.REJECT,
            performedById,
            performedByName,
            description: `Approval ${decision} by ${performedByName}${comments ? `: ${comments}` : ''}`,
        });
    }

    /**
     * Determine if action involves sensitive data
     */
    private isSensitiveAction(action: AuditAction): boolean {
        // Mark certain actions as sensitive for PII compliance
        const sensitiveActions = [
            AuditAction.CREATE,
            AuditAction.UPDATE,
            AuditAction.DELETE,
        ];
        return sensitiveActions.includes(action);
    }
}
