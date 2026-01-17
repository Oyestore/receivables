import { Request, Response, NextFunction } from 'express';
import { tenantProvisioningService } from '../services/tenant-provisioning.service';
import { auditService } from '../services/audit.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError } from '../../../Module_11_Common/code/errors/app-error';

const logger = new Logger('ProvisioningController');

export class ProvisioningController {
    /**
     * POST /api/v1/provisioning/tenants
     * Start tenant provisioning
     */
    async provisionTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { tenantName, adminEmail, adminPassword, subscriptionPlanId, organizationDetails } = req.body;

            if (!tenantName || !adminEmail || !adminPassword || !subscriptionPlanId) {
                throw new ValidationError('Missing required fields: tenantName, adminEmail, adminPassword, subscriptionPlanId');
            }

            const job = await tenantProvisioningService.provisionTenant({
                tenantName,
                adminEmail,
                adminPassword,
                subscriptionPlanId,
                organizationDetails,
            });

            await auditService.log({
                userId: req.user?.id,
                action: 'tenant.provision_start',
                resourceType: 'tenant',
                resourceId: job.tenantId,
                changes: { tenantName, subscriptionPlanId },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(202).json({
                message: 'Tenant provisioning started',
                data: {
                    jobId: job.id,
                    tenantId: job.tenantId,
                    status: job.status,
                    progress: job.progress,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/provisioning/jobs/:jobId
     * Get provisioning job status
     */
    async getJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { jobId } = req.params;

            const job = await tenantProvisioningService.getProvisioningStatus(jobId);

            res.status(200).json({
                data: job,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const provisioningController = new ProvisioningController();
