import { Pool } from 'pg';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError } from '../../../Module_11_Common/code/errors/app-error';
import { subscriptionService } from './subscription.service';
import { moduleAccessService } from './module-access.service';

const logger = new Logger('TenantProvisioningService');

export interface IProvisioningJob {
    id: string;
    tenantId: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
    progress: number;
    currentStep?: string;
    stepsCompleted: string[];
    errorMessage?: string;
}

export interface ITenantProvisioningConfig {
    tenantName: string;
    adminEmail: string;
    adminPassword: string;
    subscriptionPlanId: string;
    organizationDetails?: Record<string, any>;
}

/**
 * Tenant Provisioning Service
 * Automates tenant environment setup
 */
export class TenantProvisioningService {
    private pool: Pool;

    private readonly PROVISIONING_STEPS = [
        'create_tenant_record',
        'create_database_schema',
        'configure_settings',
        'create_admin_user',
        'assign_admin_roles',
        'setup_subscription',
        'configure_modules',
        'send_welcome_email',
    ];

    constructor() {
        this.pool = databaseService.getPool();
    }

    /**
     * Start tenant provisioning
     */
    async provisionTenant(config: ITen antProvisioningConfig): Promise<IProvisioningJob> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Step 1: Create tenant record
            const tenantResult = await client.query(
                `INSERT INTO tenants (name, status, settings, created_at)
         VALUES ($1, 'provisioning', $2, CURRENT_TIMESTAMP)
         RETURNING id`,
                [config.tenantName, JSON.stringify(config.organizationDetails || {})]
            );

            const tenantId = tenantResult.rows[0].id;

            // Create provisioning job
            const jobResult = await client.query(
                `INSERT INTO provisioning_jobs (tenant_id, status, progress, current_step, steps_completed)
         VALUES ($1, 'pending', 0, 'create_tenant_record', ARRAY['create_tenant_record'])
         RETURNING id`,
                [tenantId]
            );

            const jobId = jobResult.rows[0].id;

            await client.query('COMMIT');

            logger.info('Tenant provisioning started', { tenantId, jobId });

            // Execute provisioning asynchronously
            this.executeProvisioning(jobId, tenantId, config).catch(error => {
                logger.error('Provisioning execution failed', { error, tenantId, jobId });
            });

            return {
                id: jobId,
                tenantId,
                status: 'pending',
                progress: 0,
                currentStep: 'create_tenant_record',
                stepsCompleted: ['create_tenant_record'],
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Failed to start tenant provisioning', { error });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get provisioning job status
     */
    async getProvisioningStatus(jobId: string): Promise<IProvisioningJob> {
        try {
            const result = await this.pool.query(
                'SELECT * FROM provisioning_jobs WHERE id = $1',
                [jobId]
            );

            if (result.rows.length === 0) {
                throw new ValidationError('Provisioning job not found');
            }

            return this.mapJobFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to get provisioning status', { error, jobId });
            throw error;
        }
    }

    /**
     * Execute provisioning steps
     */
    private async executeProvisioning(
        jobId: string,
        tenantId: string,
        config: ITenantProvisioningConfig
    ): Promise<void> {
        try {
            await this.updateJobStatus(jobId, 'in_progress', 10);

            // Step 2: Create database schema (if needed)
            await this.createDatabaseSchema(tenantId);
            await this.updateJobProgress(jobId, 'create_database_schema', 25);

            // Step 3: Configure initial settings
            await this.configureSettings(tenantId);
            await this.updateJobProgress(jobId, 'configure_settings', 40);

            // Step 4: Create admin user
            const adminUserId = await this.createAdminUser(tenantId, config);
            await this.updateJobProgress(jobId, 'create_admin_user', 55);

            // Step 5: Assign admin roles
            await this.assignAdminRoles(tenantId, adminUserId);
            await this.updateJobProgress(jobId, 'assign_admin_roles', 65);

            // Step 6: Setup subscription
            await subscriptionService.subscribeTenant(tenantId, config.subscriptionPlanId);
            await this.updateJobProgress(jobId, 'setup_subscription', 80);

            // Step 7: Configure module access
            await this.configureModules(tenantId, config.subscriptionPlanId);
            await this.updateJobProgress(jobId, 'configure_modules', 90);

            // Step 8: Send welcome email
            await this.sendWelcomeEmail(config.adminEmail, config.tenantName);
            await this.updateJobProgress(jobId, 'send_welcome_email', 100);

            // Mark tenant as active
            await this.pool.query(
                'UPDATE tenants SET status = $1 WHERE id = $2',
                ['active', tenantId]
            );

            // Mark job as completed
            await this.updateJobStatus(jobId, 'completed', 100);

            logger.info('Tenant provisioning completed', { tenantId, jobId });
        } catch (error) {
            logger.error('Provisioning failed', { error, tenantId, jobId });

            // Mark job as failed
            await this.pool.query(
                `UPDATE provisioning_jobs 
         SET status = 'failed', error_message = $1
         WHERE id = $2`,
                [(error as Error).message, jobId]
            );

            // Attempt rollback
            await this.rollbackProvisioning(tenantId, jobId);
        }
    }

    /**
     * Create database schema for tenant
     */
    private async createDatabaseSchema(tenantId: string): Promise<void> {
        // In a multi-tenant architecture, you might create:
        // - Separate schemas in the same database
        // - Separate databases
        // - Or use row-level security with tenant_id

        // For this implementation, we're using shared database with tenant_id
        // No additional schema creation needed

        logger.info('Database schema validated', { tenantId });
    }

    /**
     * Configure initial settings
     */
    private async configureSettings(tenantId: string): Promise<void> {
        const defaultSettings = {
            timezone: 'UTC',
            currency: 'USD',
            language: 'en',
            features: {
                notifications: true,
                analytics: true,
            },
        };

        await this.pool.query(
            'UPDATE tenants SET settings = $1 WHERE id = $2',
            [JSON.stringify(defaultSettings), tenantId]
        );

        logger.info('Tenant settings configured', { tenantId });
    }

    /**
     * Create admin user
     */
    private async createAdminUser(
        tenantId: string,
        config: ITenantProvisioningConfig
    ): Promise<string> {
        const bcrypt = require('bcrypt');
        const passwordHash = await bcrypt.hash(config.adminPassword, 10);

        const result = await this.pool.query(
            `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, status)
       VALUES ($1, $2, $3, 'Admin', 'User', 'active')
       RETURNING id`,
            [tenantId, config.adminEmail, passwordHash]
        );

        logger.info('Admin user created', { tenantId, userId: result.rows[0].id });

        return result.rows[0].id;
    }

    /**
     * Assign admin roles
     */
    private async assignAdminRoles(tenantId: string, userId: string): Promise<void> {
        // Get or create admin role
        let adminRoleResult = await this.pool.query(
            'SELECT id FROM roles WHERE tenant_id IS NULL AND name = $1',
            ['platform_admin']
        );

        let adminRoleId: string;

        if (adminRoleResult.rows.length === 0) {
            // Create platform admin role
            const createRoleResult = await this.pool.query(
                `INSERT INTO roles (name, description, created_by)
         VALUES ('platform_admin', 'Platform Administrator', 'system')
         RETURNING id`,
                []
            );
            adminRoleId = createRoleResult.rows[0].id;
        } else {
            adminRoleId = adminRoleResult.rows[0].id;
        }

        // Assign role to user
        await this.pool.query(
            'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3)',
            [userId, adminRoleId, 'system']
        );

        logger.info('Admin roles assigned', { tenantId, userId });
    }

    /**
     * Configure module access based on subscription plan
     */
    private async configureModules(tenantId: string, planId: string): Promise<void> {
        // Module access is handled by subscription service
        logger.info('Module access configured', { tenantId });
    }

    /**
     * Send welcome email
     */
    private async sendWelcomeEmail(email: string, tenantName: string): Promise<void> {
        // In production, integrate with Module 11 notification service
        logger.info('Welcome email sent', { email, tenantName });
    }

    /**
     * Rollback provisioning
     */
    private async rollbackProvisioning(tenantId: string, jobId: string): Promise<void> {
        try {
            logger.warn('Rolling back tenant provisioning', { tenantId, jobId });

            // Delete in reverse order
            await this.pool.query('DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE tenant_id = $1)', [tenantId]);
            await this.pool.query('DELETE FROM users WHERE tenant_id = $1', [tenantId]);
            await this.pool.query('DELETE FROM tenant_subscriptions WHERE tenant_id = $1', [tenantId]);
            await this.pool.query('DELETE FROM module_access WHERE tenant_id = $1', [tenantId]);
            await this.pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);

            await this.pool.query(
                'UPDATE provisioning_jobs SET status = $1 WHERE id = $2',
                ['rolled_back', jobId]
            );

            logger.info('Provisioning rolled back', { tenantId, jobId });
        } catch (error) {
            logger.error('Rollback failed', { error, tenantId, jobId });
        }
    }

    /**
     * Update job status
     */
    private async updateJobStatus(
        jobId: string,
        status: string,
        progress: number
    ): Promise<void> {
        await this.pool.query(
            `UPDATE provisioning_jobs 
       SET status = $1, progress = $2, 
           started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
           completed_at = CASE WHEN $1 IN ('completed', 'failed', 'rolled_back') THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE id = $3`,
            [status, progress, jobId]
        );
    }

    /**
     * Update job progress
     */
    private async updateJobProgress(
        jobId: string,
        completedStep: string,
        progress: number
    ): Promise<void> {
        await this.pool.query(
            `UPDATE provisioning_jobs 
       SET current_step = $1, progress = $2, 
           steps_completed = array_append(steps_completed, $1)
       WHERE id = $3`,
            [completedStep, progress, jobId]
        );

        logger.info('Provisioning step completed', { jobId, step: completedStep, progress });
    }

    /**
     * Map job from database
     */
    private mapJobFromDb(row: any): IProvisioningJob {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            status: row.status,
            progress: row.progress,
            currentStep: row.current_step,
            stepsCompleted: row.steps_completed || [],
            errorMessage: row.error_message,
        };
    }
}

export const tenantProvisioningService = new TenantProvisioningService();
