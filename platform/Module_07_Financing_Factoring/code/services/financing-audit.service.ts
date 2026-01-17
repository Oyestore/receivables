import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancingAuditLog } from '../entities/financing-risk-assessment.entity';
import { FinancingApplication } from '../entities/financing-application.entity';
import { FinancingOffer } from '../entities/financing-offer.entity';
import { FinancingTransaction } from '../entities/financing-application.entity';

export interface AuditLogQuery {
    entityType?: string;
    entityId?: string;
    actionType?: string;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
}

@Injectable()
export class FinancingAuditService {
    private readonly logger = new Logger(FinancingAuditService.name);

    constructor(
        @InjectRepository(FinancingAuditLog)
        private readonly auditLogRepository: Repository<FinancingAuditLog>,
        @InjectRepository(FinancingApplication)
        private readonly applicationRepository: Repository<FinancingApplication>,
        @InjectRepository(FinancingOffer)
        private readonly offerRepository: Repository<FinancingOffer>,
        @InjectRepository(FinancingTransaction)
        private readonly transactionRepository: Repository<FinancingTransaction>,
    ) {}

    /**
     * Log an audit event
     */
    async logEvent(
        entityType: string,
        entityId: string,
        actionType: string,
        actionDescription: string,
        userId: string,
        userRole: string,
        userEmail: string,
        oldValues?: any,
        newValues?: any,
        metadata?: any,
        ipAddress?: string,
        userAgent?: string,
        sessionId?: string,
        requestId?: string,
        externalReference?: string
    ): Promise<FinancingAuditLog> {
        this.logger.log(`Logging audit event: ${actionType} on ${entityType}:${entityId}`);

        const auditLog = this.auditLogRepository.create({
            entityType,
            entityId,
            actionType,
            actionDescription,
            oldValues,
            newValues,
            userId,
            userRole,
            userEmail,
            ipAddress,
            userAgent,
            sessionId,
            requestId,
            externalReference,
            metadata: {
                source: 'financing_module',
                module: 'Module_07_Financing',
                ...metadata,
            },
            timestamp: new Date(),
        });

        return await this.auditLogRepository.save(auditLog);
    }

    /**
     * Get audit logs with filters
     */
    async getAuditLogs(query: AuditLogQuery): Promise<{ logs: FinancingAuditLog[]; total: number }> {
        const { 
            entityType, 
            entityId, 
            actionType, 
            userId, 
            dateFrom, 
            dateTo, 
            page = 1, 
            limit = 50 
        } = query;

        const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

        if (entityType) {
            queryBuilder.andWhere('audit.entityType = :entityType', { entityType });
        }

        if (entityId) {
            queryBuilder.andWhere('audit.entityId = :entityId', { entityId });
        }

        if (actionType) {
            queryBuilder.andWhere('audit.actionType = :actionType', { actionType });
        }

        if (userId) {
            queryBuilder.andWhere('audit.userId = :userId', { userId });
        }

        if (dateFrom) {
            queryBuilder.andWhere('audit.timestamp >= :dateFrom', { dateFrom });
        }

        if (dateTo) {
            queryBuilder.andWhere('audit.timestamp <= :dateTo', { dateTo });
        }

        const total = await queryBuilder.getCount();

        queryBuilder
            .orderBy('audit.timestamp', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        const logs = await queryBuilder.getMany();

        return { logs, total };
    }

    /**
     * Get audit trail for a specific entity
     */
    async getEntityAuditTrail(entityType: string, entityId: string): Promise<FinancingAuditLog[]> {
        return await this.auditLogRepository.find({
            where: { entityType, entityId },
            order: { timestamp: 'ASC' },
        });
    }

    /**
     * Get user activity logs
     */
    async getUserActivity(userId: string, limit: number = 100): Promise<FinancingAuditLog[]> {
        return await this.auditLogRepository.find({
            where: { userId },
            order: { timestamp: 'DESC' },
            take: limit,
        });
    }

    /**
     * Get audit statistics
     */
    async getAuditStatistics(dateFrom?: Date, dateTo?: Date): Promise<any> {
        const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

        if (dateFrom) {
            queryBuilder.andWhere('audit.timestamp >= :dateFrom', { dateFrom });
        }

        if (dateTo) {
            queryBuilder.andWhere('audit.timestamp <= :dateTo', { dateTo });
        }

        const totalEvents = await queryBuilder.getCount();

        const actionTypeStats = await queryBuilder
            .select('audit.actionType', 'actionType')
            .addSelect('COUNT(*)', 'count')
            .groupBy('audit.actionType')
            .getRawMany();

        const entityTypeStats = await queryBuilder
            .select('audit.entityType', 'entityType')
            .addSelect('COUNT(*)', 'count')
            .groupBy('audit.entityType')
            .getRawMany();

        const userActivityStats = await queryBuilder
            .select('audit.userId', 'userId')
            .addSelect('audit.userEmail', 'userEmail')
            .addSelect('COUNT(*)', 'count')
            .groupBy('audit.userId, audit.userEmail')
            .orderBy('count', 'DESC')
            .limit(10)
            .getRawMany();

        const dailyActivityStats = await queryBuilder
            .select('DATE(audit.timestamp)', 'date')
            .addSelect('COUNT(*)', 'count')
            .groupBy('DATE(audit.timestamp)')
            .orderBy('date', 'DESC')
            .limit(30)
            .getRawMany();

        return {
            totalEvents,
            actionTypeBreakdown: actionTypeStats,
            entityTypeBreakdown: entityTypeStats,
            topUsers: userActivityStats,
            dailyActivity: dailyActivityStats,
        };
    }

    /**
     * Auto-log application events
     */
    async logApplicationEvent(
        applicationId: string,
        actionType: string,
        userId: string,
        userRole: string,
        userEmail: string,
        oldData?: any,
        newData?: any,
        metadata?: any
    ): Promise<void> {
        const application = await this.applicationRepository.findOne({
            where: { id: applicationId },
        });

        if (!application) {
            this.logger.warn(`Application ${applicationId} not found for audit logging`);
            return;
        }

        await this.logEvent(
            'application',
            applicationId,
            actionType,
            this.generateActionDescription(actionType, 'application', application.applicationNumber),
            userId,
            userRole,
            userEmail,
            oldData,
            newData,
            metadata
        );
    }

    /**
     * Auto-log offer events
     */
    async logOfferEvent(
        offerId: string,
        actionType: string,
        userId: string,
        userRole: string,
        userEmail: string,
        oldData?: any,
        newData?: any,
        metadata?: any
    ): Promise<void> {
        const offer = await this.offerRepository.findOne({
            where: { id: offerId },
            relations: ['application'],
        });

        if (!offer) {
            this.logger.warn(`Offer ${offerId} not found for audit logging`);
            return;
        }

        await this.logEvent(
            'offer',
            offerId,
            actionType,
            this.generateActionDescription(actionType, 'offer', offer.offerNumber),
            userId,
            userRole,
            userEmail,
            oldData,
            newData,
            {
                ...metadata,
                applicationId: offer.applicationId,
                applicationNumber: offer.application?.applicationNumber,
            }
        );
    }

    /**
     * Auto-log transaction events
     */
    async logTransactionEvent(
        transactionId: string,
        actionType: string,
        userId: string,
        userRole: string,
        userEmail: string,
        oldData?: any,
        newData?: any,
        metadata?: any
    ): Promise<void> {
        const transaction = await this.transactionRepository.findOne({
            where: { id: transactionId },
            relations: ['application'],
        });

        if (!transaction) {
            this.logger.warn(`Transaction ${transactionId} not found for audit logging`);
            return;
        }

        await this.logEvent(
            'transaction',
            transactionId,
            actionType,
            this.generateActionDescription(actionType, 'transaction', transaction.transactionNumber),
            userId,
            userRole,
            userEmail,
            oldData,
            newData,
            {
                ...metadata,
                applicationId: transaction.applicationId,
                applicationNumber: transaction.application?.applicationNumber,
                transactionType: transaction.transactionType,
                amount: transaction.amount,
            }
        );
    }

    /**
     * Generate action description
     */
    private generateActionDescription(actionType: string, entityType: string, entityNumber: string): string {
        const descriptions: Record<string, string> = {
            create: `Created new ${entityType} ${entityNumber}`,
            update: `Updated ${entityType} ${entityNumber}`,
            delete: `Deleted ${entityType} ${entityNumber}`,
            submit: `Submitted ${entityType} ${entityNumber}`,
            approve: `Approved ${entityType} ${entityNumber}`,
            reject: `Rejected ${entityType} ${entityNumber}`,
            disburse: `Disbursed funds for ${entityType} ${entityNumber}`,
            repay: `Recorded repayment for ${entityType} ${entityNumber}`,
            cancel: `Cancelled ${entityType} ${entityNumber}`,
        };

        return descriptions[actionType] || `${actionType} ${entityType} ${entityNumber}`;
    }

    /**
     * Get compliance report
     */
    async getComplianceReport(dateFrom: Date, dateTo: Date): Promise<any> {
        const auditLogs = await this.getAuditLogs({
            dateFrom,
            dateTo,
            limit: 10000,
        });

        const complianceMetrics = {
            totalEvents: auditLogs.logs.length,
            criticalActions: auditLogs.logs.filter(log => 
                ['approve', 'reject', 'disburse', 'delete'].includes(log.actionType)
            ).length,
            userActions: auditLogs.logs.filter(log => 
                log.userRole !== 'system'
            ).length,
            systemActions: auditLogs.logs.filter(log => 
                log.userRole === 'system'
            ).length,
            failedActions: auditLogs.logs.filter(log => 
                log.metadata?.status === 'failed'
            ).length,
            highRiskActions: auditLogs.logs.filter(log => 
                log.metadata?.riskLevel === 'high'
            ).length,
        };

        const actionFrequency = auditLogs.logs.reduce((acc, log) => {
            acc[log.actionType] = (acc[log.actionType] || 0) + 1;
            return acc;
        }, {});

        const userActivity = auditLogs.logs.reduce((acc, log) => {
            const key = `${log.userId} (${log.userEmail})`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        return {
            period: { from: dateFrom, to: dateTo },
            metrics: complianceMetrics,
            actionFrequency,
            topUsers: Object.entries(userActivity)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([user, count]) => ({ user, count })),
        };
    }

    /**
     * Archive old audit logs
     */
    async archiveAuditLogs(olderThanDays: number = 365): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const result = await this.auditLogRepository
            .createQueryBuilder()
            .delete()
            .where('timestamp < :cutoffDate', { cutoffDate })
            .execute();

        this.logger.log(`Archived ${result.affected} audit logs older than ${olderThanDays} days`);
        return result.affected || 0;
    }

    /**
     * Export audit logs
     */
    async exportAuditLogs(query: AuditLogQuery): Promise<any[]> {
        const { logs } = await this.getAuditLogs({
            ...query,
            limit: 10000, // Export limit
        });

        return logs.map(log => ({
            timestamp: log.timestamp,
            entityType: log.entityType,
            entityId: log.entityId,
            actionType: log.actionType,
            actionDescription: log.actionDescription,
            userId: log.userId,
            userRole: log.userRole,
            userEmail: log.userEmail,
            ipAddress: log.ipAddress,
            metadata: log.metadata,
        }));
    }
}
