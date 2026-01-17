import { Request, Response, NextFunction } from 'express';
import { usageTrackingService } from '../services/usage-tracking.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError } from '../../../Module_11_Common/code/errors/app-error';

const logger = new Logger('UsageController');

export class UsageController {
    /**
     * GET /api/v1/usage/stats
     * Get usage statistics for tenant
     */
    async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user?.tenantId;
            const { startDate, endDate } = req.query;

            if (!tenantId) {
                throw new ValidationError('Tenant ID not found');
            }

            const stats = await usageTrackingService.getUsageStats(
                tenantId,
                startDate ? new Date(startDate as string) : undefined,
                endDate ? new Date(endDate as string) : undefined
            );

            res.status(200).json({
                data: stats,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/usage/quotas
     * Set quota for tenant (admin only)
     */
    async setQuota(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { tenantId, moduleName, quotaType, quotaLimit, resetPeriod } = req.body;

            if (!tenantId || !moduleName || !quotaType || !quotaLimit || !resetPeriod) {
                throw new ValidationError('Missing required fields');
            }

            await usageTrackingService.setQuota({
                tenantId,
                moduleName,
                quotaType,
                quotaLimit,
                resetPeriod,
            });

            res.status(200).json({
                message: 'Quota set successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/usage/quota/:moduleName/:quotaType
     * Check quota status
     */
    async checkQuota(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user?.tenantId;
            const { moduleName, quotaType } = req.params;

            if (!tenantId) {
                throw new ValidationError('Tenant ID not found');
            }

            const quotaStatus = await usageTrackingService.checkQuota(
                tenantId,
                moduleName,
                quotaType
            );

            res.status(200).json({
                data: quotaStatus,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const usageController = new UsageController();
