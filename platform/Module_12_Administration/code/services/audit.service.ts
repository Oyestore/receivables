import { Pool } from 'pg';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';

const logger = new Logger('AuditService');

export interface IAuditLog {
    tenantId?: string;
    userId?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
    status: 'success' | 'failure' | 'error';
    errorMessage?: string;
}

export interface ISecurityEvent {
    tenantId?: string;
    userId?: string;
    eventType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description?: string;
    metadata?: any;
}

/**
 * Enhanced Audit Logging Service
 * Provides comprehensive audit trails and security event tracking
 */
export class AuditService {
    private pool: Pool;

    constructor() {
        this.pool = databaseService.getPool();
    }

    /**
     * Log audit event
     */
    async log(auditData: IAuditLog): Promise<void> {
        try {
            await this.pool.query(
                `INSERT INTO audit_logs (
          tenant_id, user_id, action, resource_type, resource_id,
          changes, ip_address, user_agent, status, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7,$ $9, $10)`,
                [
                    auditData.tenantId || null,
                    auditData.userId || null,
                    auditData.action,
                    auditData.resourceType || null,
                    auditData.resourceId || null,
                    auditData.changes ? JSON.stringify(auditData.changes) : null,
                    auditData.ipAddress || null,
                    auditData.userAgent || null,
                    auditData.status,
                    auditData.errorMessage || null,
                ]
            );

            // Log to console for debugging (can be removed in production)
            logger.debug('Audit log created', {
                action: auditData.action,
                resourceType: auditData.resourceType,
                status: auditData.status,
            });
        } catch (error) {
            // Audit logging should never block the main operation
            logger.error('Failed to create audit log', { error, auditData });
        }
    }

    /**
     * Log security event
     */
    async logSecurityEvent(eventData: ISecurityEvent): Promise<void> {
        try {
            await this.pool.query(
                `INSERT INTO security_events (
          tenant_id, user_id, event_type, severity, description, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    eventData.tenantId || null,
                    eventData.userId || null,
                    eventData.eventType,
                    eventData.severity,
                    eventData.description || null,
                    eventData.metadata ? JSON.stringify(eventData.metadata) : null,
                ]
            );

            // Alert on high/critical security events
            if (eventData.severity === 'high' || eventData.severity === 'critical') {
                logger.warn('High severity security event', {
                    eventType: eventData.eventType,
                    severity: eventData.severity,
                    userId: eventData.userId,
                });
            }
        } catch (error) {
            logger.error('Failed to log security event', { error, eventData });
        }
    }

    /**
     * Get audit logs with filtering and pagination
     */
    async getAuditLogs(filters: {
    tenant Id?: string;
        userId?: string;
        action?: string;
        resourceType?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
  }): Promise < { logs: any[]; total: number } > {
    try {
        let query = 'SELECT * FROM audit_logs WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        if(filters.tenantId) {
    query += ` AND tenant_id = $${paramIndex}`;
    params.push(filters.tenantId);
    paramIndex++;
}

if (filters.userId) {
    query += ` AND user_id = $${paramIndex}`;
    params.push(filters.userId);
    paramIndex++;
}

if (filters.action) {
    query += ` AND action = $${paramIndex}`;
    params.push(filters.action);
    paramIndex++;
}

if (filters.resourceType) {
    query += ` AND resource_type = $${paramIndex}`;
    params.push(filters.resourceType);
    paramIndex++;
}

if (filters.startDate) {
    query += ` AND created_at >= $${paramIndex}`;
    params.push(filters.startDate);
    paramIndex++;
}

if (filters.endDate) {
    query += ` AND created_at <= $${paramIndex}`;
    params.push(filters.endDate);
    paramIndex++;
}

// Get total count
const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
const countResult = await this.pool.query(countQuery, params);
const total = parseInt(countResult.rows[0].count, 10);

// Add ordering and pagination
query += ` ORDER BY created_at DESC`;

if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
}

if (filters.offset) {
    query += ` OFFSET $${paramIndex}`;
    params.push(filters.offset);
}

const result = await this.pool.query(query, params);

return {
    logs: result.rows,
    total,
};
    } catch (error) {
    logger.error('Failed to get audit logs', { error, filters });
    throw error;
}
  }

  /**
   * Get security events
   */
  async getSecurityEvents(filters: {
    tenantId?: string;
    userId?: string;
    eventType?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}): Promise < { events: any[]; total: number } > {
    try {
        let query = 'SELECT * FROM security_events WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        if(filters.tenantId) {
    query += ` AND tenant_id = $${paramIndex}`;
    params.push(filters.tenantId);
    paramIndex++;
}

if (filters.userId) {
    query += ` AND user_id = $${paramIndex}`;
    params.push(filters.userId);
    paramIndex++;
}

if (filters.eventType) {
    query += ` AND event_type = $${paramIndex}`;
    params.push(filters.eventType);
    paramIndex++;
}

if (filters.severity) {
    query += ` AND severity = $${paramIndex}`;
    params.push(filters.severity);
    paramIndex++;
}

if (filters.startDate) {
    query += ` AND created_at >= $${paramIndex}`;
    params.push(filters.startDate);
    paramIndex++;
}

if (filters.endDate) {
    query += ` AND created_at <= $${paramIndex}`;
    params.push(filters.endDate);
    paramIndex++;
}

// Get total count
const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
const countResult = await this.pool.query(countQuery, params);
const total = parseInt(countResult.rows[0].count, 10);

// Add ordering and pagination
query += ` ORDER BY created_at DESC`;

if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
}

if (filters.offset) {
    query += ` OFFSET $${paramIndex}`;
    params.push(filters.offset);
}

const result = await this.pool.query(query, params);

return {
    events: result.rows,
    total,
};
    } catch (error) {
    logger.error('Failed to get security events', { error, filters });
    throw error;
}
  }

  /**
   * Resolve security event
   */
  async resolveSecurityEvent(eventId: string): Promise < void> {
    try {
        await this.pool.query(
            'UPDATE security_events SET resolved_at = CURRENT_TIMESTAMP WHERE id = $1',
            [eventId]
        );

        logger.info('Security event resolved', { eventId });
    } catch(error) {
        logger.error('Failed to resolve security event', { error, eventId });
        throw error;
    }
}

  /**
   * Delete old audit logs (for retention policy)
   */
  async deleteOldLogs(daysToRetain: number): Promise < number > {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToRetain);

        const result = await this.pool.query(
            'DELETE FROM audit_logs WHERE created_at < $1',
            [cutoffDate]
        );

        logger.info('Old audit logs deleted', {
            deletedCount: result.rowCount,
            cutoffDate,
        });

        return result.rowCount || 0;
    } catch(error) {
        logger.error('Failed to delete old audit logs', { error });
        throw error;
    }
}

  /**
   * Get audit statistics
   */
  async getStatistics(tenantId ?: string): Promise < {
    totalLogs: number;
    successfulActions: number;
    failedActions: number;
    securityEvents: number;
    criticalEvents: number;
} > {
    try {
        const tenantFilter = tenantId ? 'WHERE tenant_id = $1' : '';
        const params = tenantId ? [tenantId] : [];

        const logsResult = await this.pool.query(
            `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
          SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) as failed
         FROM audit_logs ${tenantFilter}`,
            params
        );

        const eventsResult = await this.pool.query(
            `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical
         FROM security_events ${tenantFilter}`,
            params
        );

        return {
            totalLogs: parseInt(logsResult.rows[0].total, 10),
            successfulActions: parseInt(logsResult.rows[0].successful, 10),
            failedActions: parseInt(logsResult.rows[0].failed, 10),
            securityEvents: parseInt(eventsResult.rows[0].total, 10),
            criticalEvents: parseInt(eventsResult.rows[0].critical, 10),
        };
    } catch(error) {
        logger.error('Failed to get audit statistics', { error });
        throw error;
    }
}
}

export const auditService = new AuditService();

/**
 * Audit logging middleware
 * Automatically logs all administrative actions
 */
export const auditMiddleware = (action: string, resourceType?: string) => {
    return async (req: any, res: any, next: any) => {
        const originalJson = res.json.bind(res);

        res.json = function (data: any) {
            // Log after response
            setImmediate(async () => {
                try {
                    await auditService.log({
                        tenantId: req.user?.tenantId,
                        userId: req.user?.id,
                        action,
                        resourceType,
                        resourceId: req.params?.id || data?.id,
                        changes: {
                            request: req.body,
                            response: data,
                        },
                        ipAddress: req.ip,
                        userAgent: req.get('user-agent'),
                        status: res.statusCode < 400 ? 'success' : 'failure',
                    });
                } catch (error) {
                    logger.error('Audit middleware error', { error });
                }
            });

            return originalJson(data);
        };

        next();
    };
};
