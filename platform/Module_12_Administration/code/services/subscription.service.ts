import { Pool } from 'pg';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError, NotFoundError } from '../../../Module_11_Common/code/errors/app-error';

const logger = new Logger('SubscriptionService');

export interface ISubscriptionPlan {
    id: string;
    planName: string;
    planType: 'free' | 'tier-1' | 'tier-2' | 'enterprise' | 'custom';
    status: 'active' | 'deprecated' | 'archived';
    basePrice: number;
    currency: string;
    billingCycle: 'monthly' | 'quarterly' | 'annual';
    features: any;
    moduleAccess: any;
    usageLimits: any;
}

export interface ITenantSubscription {
    id: string;
    tenantId: string;
    planId: string;
    status: 'active' | 'canceled' | 'suspended' | 'expired';
    startDate: Date;
    endDate?: Date;
    autoRenew: boolean;
}

/**
 * Subscription Management Service
 * Handles subscription plans and tenant subscriptions
 */
export class SubscriptionService {
    private pool: Pool;

    constructor() {
        this.pool = databaseService.getPool();
    }

    /**
     * Create subscription plan
     */
    async createPlan(planData: Omit<ISubscriptionPlan, 'id'>): Promise<ISubscriptionPlan> {
        try {
            const result = await this.pool.query(
                `INSERT INTO subscription_plans (
          plan_name, plan_type, status, base_price, currency, billing_cycle,
          features, module_access, usage_limits
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
                [
                    planData.planName,
                    planData.planType,
                    planData.status || 'active',
                    planData.basePrice,
                    planData.currency || 'USD',
                    planData.billingCycle,
                    JSON.stringify(planData.features),
                    JSON.stringify(planData.moduleAccess),
                    JSON.stringify(planData.usageLimits),
                ]
            );

            logger.info('Subscription plan created', {
                plan Name: planData.planName,
                planId: result.rows[0].id,
            });

            return this.mapPlanFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to create subscription plan', { error });
            throw error;
        }
    }

    /**
     * List all active plans
     */
    async listPlans(): Promise<ISubscriptionPlan[]> {
        try {
            const result = await this.pool.query(
                'SELECT * FROM subscription_plans WHERE status = $1 ORDER BY base_price ASC',
                ['active']
            );

            return result.rows.map(row => this.mapPlanFromDb(row));
        } catch (error) {
            logger.error('Failed to list subscription plans', { error });
            throw error;
        }
    }

    /**
     * Get plan by ID
     */
    async getPlanById(planId: string): Promise<ISubscriptionPlan> {
        try {
            const result = await this.pool.query(
                'SELECT * FROM subscription_plans WHERE id = $1',
                [planId]
            );

            if (result.rows.length === 0) {
                throw new NotFoundError('Subscription plan not found');
            }

            return this.mapPlanFromDb(result.rows[0]);
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            logger.error('Failed to get subscription plan', { error, planId });
            throw error;
        }
    }

    /**
     * Subscribe tenant to plan
     */
    async subscribeTenant(
        tenantId: string,
        planId: string,
        options?: {
            startDate?: Date;
            endDate?: Date;
            autoRenew?: boolean;
            trialDays?: number;
        }
    ): Promise<ITenantSubscription> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Validate plan exists
            const planResult = await client.query(
                'SELECT id, billing_cycle FROM subscription_plans WHERE id = $1 AND status = $2',
                [planId, 'active']
            );

            if (planResult.rows.length === 0) {
                throw new ValidationError('Invalid or inactive subscription plan');
            }

            const plan = planResult.rows[0];

            // Check for existing active subscription
            const existingResult = await client.query(
                'SELECT id FROM tenant_subscriptions WHERE tenant_id = $1 AND status = $2',
                [tenantId, 'active']
            );

            if (existingResult.rows.length > 0) {
                throw new ValidationError('Tenant already has an active subscription');
            }

            // Calculate dates
            const startDate = options?.startDate || new Date();
            let endDate = options?.endDate;
            let trialEndDate = null;

            if (options?.trialDays) {
                trialEndDate = new Date(startDate);
                trialEndDate.setDate(trialEndDate.getDate() + options.trialDays);
            }

            if (!endDate) {
                endDate = this.calculateEndDate(startDate, plan.billing_cycle);
            }

            // Create subscription
            const subResult = await client.query(
                `INSERT INTO tenant_subscriptions (
          tenant_id, plan_id, status, start_date, end_date, auto_renew, trial_end_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
                [
                    tenantId,
                    planId,
                    'active',
                    startDate,
                    endDate,
                    options?.autoRenew !== false,
                    trialEndDate,
                ]
            );

            // Setup module access based on plan
            await this.setupModuleAccess(tenantId, planId, client);

            await client.query('COMMIT');

            logger.info('Tenant subscribed to plan', { tenantId, planId });

            return this.mapSubscriptionFromDb(subResult.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Failed to subscribe tenant', { error, tenantId, planId });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Upgrade subscription
     */
    async upgradeSubscription(
        tenantId: string,
        newPlanId: string
    ): Promise<{
        subscription: ITenantSubscription;
        prorationAmount: number;
    }> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Get current subscription
            const currentSubResult = await client.query(
                'SELECT * FROM tenant_subscriptions WHERE tenant_id = $1 AND status = $2',
                [tenantId, 'active']
            );

            if (currentSubResult.rows.length === 0) {
                throw new ValidationError('No active subscription found');
            }

            const currentSub = currentSubResult.rows[0];

            // Get plan details
            const [currentPlan, newPlan] = await Promise.all([
                this.getPlanById(currentSub.plan_id),
                this.getPlanById(newPlanId),
            ]);

            // Calculate proration
            const prorationAmount = this.calculatePror ation(
                currentPlan,
                newPlan,
                currentSub.start_date,
                currentSub.end_date
            );

            // Record change
            await client.query(
                `INSERT INTO subscription_changes (
          tenant_id, from_plan_id, to_plan_id, change_type, effective_date, prorated_amount
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)`,
                [tenantId, currentSub.plan_id, newPlanId, 'upgrade', prorationAmount]
            );

            // Update subscription
            const updatedSubResult = await client.query(
                'UPDATE tenant_subscriptions SET plan_id = $1, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $2 AND status = $3 RETURNING *',
                [newPlanId, tenantId, 'active']
            );

            // Update module access
            await this.setupModuleAccess(tenantId, newPlanId, client);

            await client.query('COMMIT');

            logger.info('Subscription upgraded', { tenantId, newPlanId, prorationAmount });

            return {
                subscription: this.mapSubscriptionFromDb(updatedSubResult.rows[0]),
                prorationAmount,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Failed to upgrade subscription', { error, tenantId });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(tenantId: string, immediate: boolean = false): Promise<void> {
        try {
            if (immediate) {
                await this.pool.query(
                    'UPDATE tenant_subscriptions SET status = $1, end_date = CURRENT_TIMESTAMP WHERE tenant_id = $2 AND status = $3',
                    ['canceled', tenantId, 'active']
                );
            } else {
                await this.pool.query(
                    'UPDATE tenant_subscriptions SET auto_renew = false WHERE tenant_id = $1 AND status = $2',
                    [tenantId, 'active']
                );
            }

            logger.info('Subscription canceled', { tenantId, immediate });
        } catch (error) {
            logger.error('Failed to cancel subscription', { error, tenantId });
            throw error;
        }
    }

    /**
     * Get tenant subscription
     */
    async getTenantSubscription(tenantId: string): Promise<ITenantSubscription | null> {
        try {
            const result = await this.pool.query(
                'SELECT * FROM tenant_subscriptions WHERE tenant_id = $1 AND status = $2',
                [tenantId, 'active']
            );

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapSubscriptionFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to get tenant subscription', { error, tenantId });
            throw error;
        }
    }

    /**
     * Setup module access based on plan
     */
    private async setupModuleAccess(
        tenantId: string,
        planId: string,
        dbClient: any
    ): Promise<void> {
        const plan = await this.getPlanById(planId);

        // Clear existing module access
        await dbClient.query('DELETE FROM module_access WHERE tenant_id = $1', [tenantId]);

        // Setup new module access
        if (plan.moduleAccess) {
            for (const [moduleName, config] of Object.entries(plan.moduleAccess)) {
                await dbClient.query(
                    `INSERT INTO module_access (tenant_id, module_name, access_level, features_enabled, usage_quota)
           VALUES ($1, $2, $3, $4, $5)`,
                    [
                        tenantId,
                        moduleName,
                        (config as any).accessLevel || 'standard',
                        (config as any).features || [],
                        JSON.stringify((config as any).quota || {}),
                    ]
                );
            }
        }
    }

    /**
     * Calculate end date based on billing cycle
     */
    private calculateEndDate(startDate: Date, billingCycle: string): Date {
        const endDate = new Date(startDate);

        switch (billingCycle) {
            case 'monthly':
                endDate.setMonth(endDate.getMonth() + 1);
                break;
            case 'quarterly':
                endDate.setMonth(endDate.getMonth() + 3);
                break;
            case 'annual':
                endDate.setFullYear(endDate.getFullYear() + 1);
                break;
        }

        return endDate;
    }

    /**
     * Calculate proration amount
     */
    private calculateProration(
        currentPlan: ISubscriptionPlan,
        newPlan: ISubscriptionPlan,
        startDate: Date,
        endDate: Date
    ): number {
        const now = new Date();
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const remainingDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        const currentDailyRate = currentPlan.basePrice / totalDays;
        const newDailyRate = newPlan.basePrice / totalDays;

        const currentCredit = currentDailyRate * remainingDays;
        const newCharge = newDailyRate * remainingDays;

        return Math.max(0, newCharge - currentCredit);
    }

    /**
     * Map plan from database
     */
    private mapPlanFromDb(row: any): ISubscriptionPlan {
        return {
            id: row.id,
            planName: row.plan_name,
            planType: row.plan_type,
            status: row.status,
            basePrice: parseFloat(row.base_price),
            currency: row.currency,
            billingCycle: row.billing_cycle,
            features: row.features,
            moduleAccess: row.module_access,
            usageLimits: row.usage_limits,
        };
    }

    /**
     * Map subscription from database
     */
    private mapSubscriptionFromDb(row: any): ITenantSubscription {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            planId: row.plan_id,
            status: row.status,
            startDate: row.start_date,
            endDate: row.end_date,
            autoRenew: row.auto_renew,
        };
    }
}

export const subscriptionService = new SubscriptionService();
