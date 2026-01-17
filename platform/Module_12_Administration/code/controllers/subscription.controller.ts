import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../services/subscription.service';
import { auditService } from '../services/audit.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError } from '../../../Module_11_Common/code/errors/app-error';

const logger = new Logger('SubscriptionController');

export class SubscriptionController {
    /**
     * GET /api/v1/subscriptions/plans
     * List all subscription plans
     */
    async listPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const plans = await subscriptionService.listPlans();

            res.status(200).json({
                data: plans,
                total: plans.length,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/subscriptions/plans
     * Create a new subscription plan (admin only)
     */
    async createPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const planData = req.body;

            const plan = await subscriptionService.createPlan(planData);

            await auditService.log({
                tenantId: req.user?.tenantId,
                userId: req.user?.id,
                action: 'subscription_plan.create',
                resourceType: 'subscription_plan',
                resourceId: plan.id,
                changes: { planData },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(201).json({
                message: 'Subscription plan created',
                data: plan,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/tenant/:tenantId/subscription
     * Subscribe tenant to a plan
     */
    async subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { tenantId } = req.params;
            const { planId, trialDays, autoRenew } = req.body;

            if (!planId) {
                throw new ValidationError('Plan ID is required');
            }

            const subscription = await subscriptionService.subscribeTenant(tenantId, planId, {
                trialDays,
                autoRenew,
            });

            await auditService.log({
                tenantId,
                userId: req.user?.id,
                action: 'subscription.create',
                resourceType: 'subscription',
                resourceId: subscription.id,
                changes: { planId, trialDays, autoRenew },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(201).json({
                message: 'Subscription created successfully',
                data: subscription,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/tenant/:tenantId/subscription
     * Get tenant's subscription
     */
    async getSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { tenantId } = req.params;

            const subscription = await subscriptionService.getTenantSubscription(tenantId);

            if (!subscription) {
                res.status(404).json({
                    error: 'Not Found',
                    message: 'No active subscription found',
                });
                return;
            }

            res.status(200).json({
                data: subscription,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/tenant/:tenantId/subscription/upgrade
     * Upgrade subscription
     */
    async upgrade(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { tenantId } = req.params;
            const { planId } = req.body;

            if (!planId) {
                throw new ValidationError('New plan ID is required');
            }

            const result = await subscriptionService.upgradeSubscription(tenantId, planId);

            await auditService.log({
                tenantId,
                userId: req.user?.id,
                action: 'subscription.upgrade',
                resourceType: 'subscription',
                resourceId: result.subscription.id,
                changes: {
                    newPlanId: planId,
                    prorationAmount: result.prorationAmount,
                },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(200).json({
                message: 'Subscription upgraded successfully',
                data: {
                    subscription: result.subscription,
                    prorationAmount: result.prorationAmount,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/v1/tenant/:tenantId/subscription
     * Cancel subscription
     */
    async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { tenantId } = req.params;
            const { immediate } = req.query;

            await subscriptionService.cancelSubscription(tenantId, immediate === 'true');

            await auditService.log({
                tenantId,
                userId: req.user?.id,
                action: 'subscription.cancel',
                resourceType: 'subscription',
                changes: { immediate: immediate === 'true' },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(200).json({
                message: immediate === 'true'
                    ? 'Subscription canceled immediately'
                    : 'Subscription will not auto-renew',
            });
        } catch (error) {
            next(error);
        }
    }
}

export const subscriptionController = new SubscriptionController();
