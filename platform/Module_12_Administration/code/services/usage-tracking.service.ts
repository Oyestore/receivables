import { Pool } from 'pg';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError } from '../../../Module_11_Common/code/errors/app-error';

const logger = new Logger('UsageTrackingService');

export interface IUsageEvent {
    tenantId: string;
    userId?: string;
    moduleName: string;
    eventType: string;
    quantity?: number;
    metadata?: Record<string, any>;
}

export interface IUsageQuota {
    tenantId: string;
    moduleName: string;
    quotaType: string;
    quotaLimit: number;
    quotaUsed: number;
    resetPeriod: 'daily' | 'weekly' | 'monthly' | 'annual';
    lastReset: Date;
}

export interface IUsageStats {
    totalEvents: number;
    eventsByModule: Record<string, number>;
    quotaUtilization: Record<string, { used: number; limit: number; percentage: number }>;
}

/**
 * Usage Tracking Service
 * Tracks usage events and enforces quotas
 */
export class UsageTrackingService {
    private pool: Pool;

    constructor() {
        this.pool = databaseService.getPool();
    }

    /**
     * Track usage event
     */
    async trackEvent(eventData: IUsageEvent): Promise<void> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Insert usage event
            await client.query(
                `INSERT INTO usage_events (tenant_id, user_id, module_name, event_type, quantity, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    eventData.tenantId,
                    eventData.userId || null,
                    eventData.moduleName,
                    eventData.eventType,
                    eventData.quantity || 1,
                    JSON.stringify(eventData.metadata || {}),
                ]
            );

            // Update quota if applicable
            await this.updateQuota(
                eventData.tenantId,
                eventData.moduleName,
                eventData.eventType,
                eventData.quantity || 1,
                client
            );

            await client.query('COMMIT');

            logger.debug('Usage event tracked', {
                tenantId: eventData.tenantId,
                moduleName: eventData.moduleName,
                eventType: eventData.eventType,
            });
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Failed to track usage event', { error, eventData });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Check if tenant has quota available
     */
    async checkQuota(
        tenantId: string,
        moduleName: string,
        quotaType: string,
        requiredQuantity: number = 1
    ): Promise<{ allowed: boolean; remaining: number; limit: number }> {
        try {
            const quota = await this.getQuota(tenantId, moduleName, quotaType);

            if (!quota) {
                // No quota defined means unlimited
                return { allowed: true, remaining: -1, limit: -1 };
            }

            // Check if quota needs reset
            await this.checkAndResetQuota(quota);

            const remaining = quota.quotaLimit - quota.quotaUsed;
            const allowed = remaining >= requiredQuantity;

            return {
                allowed,
                remaining,
                limit: quota.quotaLimit,
            };
        } catch (error) {
            logger.error('Failed to check quota', { error, tenantId, moduleName, quotaType });
            throw error;
        }
    }

    /**
     * Set quota for tenant
     */
    async setQuota(quotaData: {
        tenantId: string;
        moduleName: string;
        quotaType: string;
        quotaLimit: number;
        resetPeriod: 'daily' | 'weekly' | 'monthly' | 'annual';
    }): Promise<void> {
        try {
            await this.pool.query(
                `INSERT INTO usage_quotas (
          tenant_id, module_name, quota_type, quota_limit, quota_used, reset_period, last_reset
        ) VALUES ($1, $2, $3, $4, 0, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (tenant_id, module_name, quota_type) DO UPDATE
        SET quota_limit = $4, reset_period = $5, updated_at = CURRENT_TIMESTAMP`,
                [
                    quotaData.tenantId,
                    quotaData.moduleName,
                    quotaData.quotaType,
                    quotaData.quotaLimit,
                    quotaData.resetPeriod,
                ]
            );

            logger.info('Quota set', {
                tenantId: quotaData.tenantId,
                moduleName: quotaData.moduleName,
                quotaType: quotaData.quotaType,
                quotaLimit: quotaData.quotaLimit,
            });
        } catch (error) {
            logger.error('Failed to set quota', { error, quotaData });
            throw error;
        }
    }

    /**
     * Get usage statistics for tenant
     */
    async getUsageStats(
        tenantId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<IUsageStats> {
        try {
            let query = `
        SELECT module_name, event_type, SUM(quantity) as total
        FROM usage_events
        WHERE tenant_id = $1
      `;
            const params: any[] = [tenantId];
            let paramIndex = 2;

            if (startDate) {
                query += ` AND created_at >= $${paramIndex}`;
                params.push(startDate);
                paramIndex++;
            }

            if (endDate) {
                query += ` AND created_at <= $${paramIndex}`;
                params.push(endDate);
                paramIndex++;
            }

            query += ' GROUP BY module_name, event_type';

            const eventsResult = await this.pool.query(query, params);

            // Get quotas
            const quotasResult = await this.pool.query(
                'SELECT * FROM usage_quotas WHERE tenant_id = $1',
                [tenantId]
            );

            // Calculate stats
            const eventsByModule: Record<string, number> = {};
            let totalEvents = 0;

            for (const row of eventsResult.rows) {
                const total = parseInt(row.total, 10);
                eventsByModule[row.module_name] = (eventsByModule[row.module_name] || 0) + total;
                totalEvents += total;
            }

            const quotaUtilization: Record<string, { used: number; limit: number; percentage: number }> = {};

            for (const row of quotasResult.rows) {
                const key = `${row.module_name}:${row.quota_type}`;
                quotaUtilization[key] = {
                    used: row.quota_used,
                    limit: row.quota_limit,
                    percentage: (row.quota_used / row.quota_limit) * 100,
                };
            }

            return {
                totalEvents,
                eventsByModule,
                quotaUtilization,
            };
        } catch (error) {
            logger.error('Failed to get usage stats', { error, tenantId });
            throw error;
        }
    }

    /**
     * Reset quotas for all tenants (scheduled job)
     */
    async resetQuotas(resetPeriod: 'daily' | 'weekly' | 'monthly' | 'annual'): Promise<number> {
        try {
            const result = await this.pool.query(
                `UPDATE usage_quotas 
         SET quota_used = 0, last_reset = CURRENT_TIMESTAMP
         WHERE reset_period = $1 AND last_reset < $2`,
                [resetPeriod, this.calculateResetThreshold(resetPeriod)]
            );

            logger.info('Quotas reset', {
                resetPeriod,
                count: result.rowCount,
            });

            return result.rowCount || 0;
        } catch (error) {
            logger.error('Failed to reset quotas', { error, resetPeriod });
            throw error;
        }
    }

    /**
     * Get quota
     */
    private async getQuota(
        tenantId: string,
        moduleName: string,
        quotaType: string
    ): Promise<IUsageQuota | null> {
        try {
            const result = await this.pool.query(
                'SELECT * FROM usage_quotas WHERE tenant_id = $1 AND module_name = $2 AND quota_type = $3',
                [tenantId, moduleName, quotaType]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapQuotaFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to get quota', { error, tenantId, moduleName, quotaType });
            throw error;
        }
    }

    /**
     * Update quota usage
     */
    private async updateQuota(
        tenantId: string,
        moduleName: string,
        quotaType: string,
        quantity: number,
        dbClient: any
    ): Promise<void> {
        await dbClient.query(
            `UPDATE usage_quotas 
       SET quota_used = quota_used + $1, updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $2 AND module_name = $3 AND quota_type = $4`,
            [quantity, tenantId, moduleName, quotaType]
        );
    }

    /**
     * Check and reset quota if needed
     */
    private async checkAndResetQuota(quota: IUsageQuota): Promise<void> {
        const resetThreshold = this.calculateResetThreshold(quota.resetPeriod);

        if (new Date(quota.lastReset) < resetThreshold) {
            await this.pool.query(
                `UPDATE usage_quotas 
         SET quota_used = 0, last_reset = CURRENT_TIMESTAMP
         WHERE tenant_id = $1 AND module_name = $2 AND quota_type = $3`,
                [quota.tenantId, quota.moduleName, quota.quotaType]
            );

            logger.info('Quota auto-reset', {
                tenantId: quota.tenantId,
                moduleName: quota.moduleName,
                quotaType: quota.quotaType,
            });
        }
    }

    /**
     * Calculate reset threshold based on period
     */
    private calculateResetThreshold(period: string): Date {
        const now = new Date();
        const threshold = new Date();

        switch (period) {
            case 'daily':
                threshold.setDate(now.getDate() - 1);
                break;
            case 'weekly':
                threshold.setDate(now.getDate() - 7);
                break;
            case 'monthly':
                threshold.setMonth(now.getMonth() - 1);
                break;
            case 'annual':
                threshold.setFullYear(now.getFullYear() - 1);
                break;
        }

        return threshold;
    }

    /**
     * Map quota from database
     */
    private mapQuotaFromDb(row: any): IUsageQuota {
        return {
            tenantId: row.tenant_id,
            moduleName: row.module_name,
            quotaType: row.quota_type,
            quotaLimit: row.quota_limit,
            quotaUsed: row.quota_used,
            resetPeriod: row.reset_period,
            lastReset: row.last_reset,
        };
    }
}

export const usageTrackingService = new UsageTrackingService();

/**
 * Usage tracking middleware
 * Automatically tracks API usage
 */
export const trackUsageMiddleware = (moduleName: string, eventType: string) => {
    return async (req: any, res: any, next: any) => {
        // Track usage after response
        const originalJson = res.json.bind(res);

        res.json = function (data: any) {
            setImmediate(async () => {
                try {
                    if (res.statusCode < 400) {
                        await usageTrackingService.trackEvent({
                            tenantId: req.user?.tenantId,
                            userId: req.user?.id,
                            moduleName,
                            eventType,
                            metadata: {
                                path: req.path,
                                method: req.method,
                                statusCode: res.statusCode,
                            },
                        });
                    }
                } catch (error) {
                    logger.error('Usage tracking middleware error', { error });
                }
            });

            return originalJson(data);
        };

        next();
    };
};

/**
 * Quota enforcement middleware
 * Checks quota before allowing request
 */
export const enforceQuotaMiddleware = (moduleName: string, quotaType: string) => {
    return async (req: any, res: any, next: any) => {
        try {
            const tenantId = req.user?.tenantId;

            if (!tenantId) {
                return next();
            }

            const quotaCheck = await usageTrackingService.checkQuota(
                tenantId,
                moduleName,
                quotaType
            );

            if (!quotaCheck.allowed) {
                logger.warn('Quota exceeded', { tenantId, moduleName, quotaType });

                return res.status(429).json({
                    error: 'Quota Exceeded',
                    message: `You have exceeded your ${quotaType} quota for ${moduleName}`,
                    limit: quotaCheck.limit,
                    remaining: quotaCheck.remaining,
                });
            }

            // Add quota info to request
            req.quotaInfo = quotaCheck;

            next();
        } catch (error) {
            logger.error('Quota enforcement middleware error', { error });
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to check quota',
            });
        }
    };
};
