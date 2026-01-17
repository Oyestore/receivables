import { Pool } from 'pg';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError, UnauthorizedError } from '../../../Module_11_Common/code/errors/app-error';

const logger = new Logger('ModuleAccessService');

export interface IModuleAccess {
    tenantId: string;
    moduleName: string;
    accessLevel: 'none' | 'read' | 'write' | 'admin';
    featuresEnabled: string[];
    usageQuota: Record<string, number>;
    isActive: boolean;
}

export interface IFeatureFlag {
    flagKey: string;
    flagName: string;
    moduleName?: string;
    isEnabled: boolean;
    rolloutPercentage: number;
    tenantOverrides?: Record<string, boolean>;
}

/**
 * Module Access Control Service
 * Manages module-level access and feature flags
 */
export class ModuleAccessService {
    private pool: Pool;
    private cache: Map<string, IModuleAccess> = new Map();
    private flagCache: Map<string, IFeatureFlag> = new Map();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    constructor() {
        this.pool = databaseService.getPool();
    }

    /**
     * Check if tenant has access to module
     */
    async hasModuleAccess(
        tenantId: string,
        moduleName: string,
        requiredLevel: 'read' | 'write' | 'admin' = 'read'
    ): Promise<boolean> {
        try {
            const access = await this.getModuleAccess(tenantId, moduleName);

            if (!access || !access.isActive) {
                return false;
            }

            const levels = ['none', 'read', 'write', 'admin'];
            const currentLevelIndex = levels.indexOf(access.accessLevel);
            const requiredLevelIndex = levels.indexOf(requiredLevel);

            return currentLevelIndex >= requiredLevelIndex;
        } catch (error) {
            logger.error('Failed to check module access', { error, tenantId, moduleName });
            return false;
        }
    }

    /**
     * Check if feature is enabled
     */
    async isFeatureEnabled(
        flagKey: string,
        tenantId?: string
    ): Promise<boolean> {
        try {
            const flag = await this.getFeatureFlag(flagKey);

            if (!flag) {
                return false;
            }

            // Check tenant-specific override
            if (tenantId && flag.tenantOverrides && tenantId in flag.tenantOverrides) {
                return flag.tenantOverrides[tenantId];
            }

            // Check global enable
            if (!flag.isEnabled) {
                return false;
            }

            // Check rollout percentage
            if (flag.rolloutPercentage < 100) {
                // Simple hash-based rollout
                const hash = this.hashString(tenantId || 'global');
                return (hash % 100) < flag.rolloutPercentage;
            }

            return true;
        } catch (error) {
            logger.error('Failed to check feature flag', { error, flagKey, tenantId });
            return false;
        }
    }

    /**
     * Get module access for tenant
     */
    async getModuleAccess(tenantId: string, moduleName: string): Promise<IModuleAccess | null> {
        const cacheKey = `${tenantId}:${moduleName}`;

        // Check cache
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        try {
            const result = await this.pool.query(
                'SELECT * FROM module_access WHERE tenant_id = $1 AND module_name = $2',
                [tenantId, moduleName]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const access = this.mapAccessFromDb(result.rows[0]);

            // Cache the result
            this.cache.set(cacheKey, access);
            setTimeout(() => this.cache.delete(cacheKey), this.CACHE_TTL);

            return access;
        } catch (error) {
            logger.error('Failed to get module access', { error, tenantId, moduleName });
            throw error;
        }
    }

    /**
     * Grant module access to tenant
     */
    async grantAccess(accessData: {
        tenantId: string;
        moduleName: string;
        accessLevel: 'read' | 'write' | 'admin';
        featuresEnabled?: string[];
        usageQuota?: Record<string, number>;
    }): Promise<void> {
        try {
            await this.pool.query(
                `INSERT INTO module_access (
          tenant_id, module_name, access_level, features_enabled, usage_quota, is_active
        ) VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (tenant_id, module_name) DO UPDATE
        SET access_level = $3, features_enabled = $4, usage_quota = $5, is_active = true`,
                [
                    accessData.tenantId,
                    accessData.moduleName,
                    accessData.accessLevel,
                    accessData.featuresEnabled || [],
                    JSON.stringify(accessData.usageQuota || {}),
                ]
            );

            // Invalidate cache
            this.cache.delete(`${accessData.tenantId}:${accessData.moduleName}`);

            logger.info('Module access granted', {
                tenantId: accessData.tenantId,
                moduleName: accessData.moduleName,
                accessLevel: accessData.accessLevel,
            });
        } catch (error) {
            logger.error('Failed to grant module access', { error, accessData });
            throw error;
        }
    }

    /**
     * Revoke module access
     */
    async revokeAccess(tenantId: string, moduleName: string): Promise<void> {
        try {
            await this.pool.query(
                'UPDATE module_access SET is_active = false WHERE tenant_id = $1 AND module_name = $2',
                [tenantId, moduleName]
            );

            // Invalidate cache
            this.cache.delete(`${tenantId}:${moduleName}`);

            logger.info('Module access revoked', { tenantId, moduleName });
        } catch (error) {
            logger.error('Failed to revoke module access', { error, tenantId, moduleName });
            throw error;
        }
    }

    /**
     * Get feature flag
     */
    private async getFeatureFlag(flagKey: string): Promise<IFeatureFlag | null> {
        // Check cache
        if (this.flagCache.has(flagKey)) {
            return this.flagCache.get(flagKey)!;
        }

        try {
            const result = await this.pool.query(
                'SELECT * FROM feature_flags WHERE flag_key = $1',
                [flagKey]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const flag = this.mapFlagFromDb(result.rows[0]);

            // Cache the result
            this.flagCache.set(flagKey, flag);
            setTimeout(() => this.flagCache.delete(flagKey), this.CACHE_TTL);

            return flag;
        } catch (error) {
            logger.error('Failed to get feature flag', { error, flagKey });
            throw error;
        }
    }

    /**
     * Create or update feature flag
     */
    async setFeatureFlag(flagData: {
        flagKey: string;
        flagName: string;
        moduleName?: string;
        isEnabled: boolean;
        rolloutPercentage?: number;
        tenantOverrides?: Record<string, boolean>;
    }): Promise<void> {
        try {
            await this.pool.query(
                `INSERT INTO feature_flags (
          flag_key, flag_name, module_name, is_enabled, rollout_percentage, tenant_overrides
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (flag_key) DO UPDATE
        SET flag_name = $2, module_name = $3, is_enabled = $4, 
            rollout_percentage = $5, tenant_overrides = $6, updated_at = CURRENT_TIMESTAMP`,
                [
                    flagData.flagKey,
                    flagData.flagName,
                    flagData.moduleName || null,
                    flagData.isEnabled,
                    flagData.rolloutPercentage || 100,
                    JSON.stringify(flagData.tenantOverrides || {}),
                ]
            );

            // Invalidate cache
            this.flagCache.delete(flagData.flagKey);

            logger.info('Feature flag set', { flagKey: flagData.flagKey, isEnabled: flagData.isEnabled });
        } catch (error) {
            logger.error('Failed to set feature flag', { error, flagData });
            throw error;
        }
    }

    /**
     * Clear all caches
     */
    clearCache(): void {
        this.cache.clear();
        this.flagCache.clear();
        logger.info('Module access cache cleared');
    }

    /**
     * Hash string for rollout calculation
     */
    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Map access from database
     */
    private mapAccessFromDb(row: any): IModuleAccess {
        return {
            tenantId: row.tenant_id,
            moduleName: row.module_name,
            accessLevel: row.access_level,
            featuresEnabled: row.features_enabled || [],
            usageQuota: row.usage_quota || {},
            isActive: row.is_active,
        };
    }

    /**
     * Map flag from database
     */
    private mapFlagFromDb(row: any): IFeatureFlag {
        return {
            flagKey: row.flag_key,
            flagName: row.flag_name,
            moduleName: row.module_name,
            isEnabled: row.is_enabled,
            rolloutPercentage: row.rollout_percentage,
            tenantOverrides: row.tenant_overrides || {},
        };
    }
}

export const moduleAccessService = new ModuleAccessService();

/**
 * Module Access Middleware
 * Automatically checks module access for protected routes
 */
export const requireModuleAccess = (
    moduleName: string,
    accessLevel: 'read' | 'write' | 'admin' = 'read'
) => {
    return async (req: any, res: any, next: any) => {
        try {
            const tenantId = req.user?.tenantId;

            if (!tenantId) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Tenant ID not found',
                });
            }

            const hasAccess = await moduleAccessService.hasModuleAccess(
                tenantId,
                moduleName,
                accessLevel
            );

            if (!hasAccess) {
                logger.warn('Module access denied', { tenantId, moduleName, accessLevel });

                return res.status(403).json({
                    error: 'Forbidden',
                    message: `Access denied to module: ${moduleName}`,
                });
            }

            // Add module access info to request
            req.moduleAccess = await moduleAccessService.getModuleAccess(tenantId, moduleName);

            next();
        } catch (error) {
            logger.error('Module access middleware error', { error });
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to check module access',
            });
        }
    };
};

/**
 * Feature Flag Middleware
 * Checks if a feature is enabled
 */
export const requireFeatureFlag = (flagKey: string) => {
    return async (req: any, res: any, next: any) => {
        try {
            const tenantId = req.user?.tenantId;

            const isEnabled = await moduleAccessService.isFeatureEnabled(flagKey, tenantId);

            if (!isEnabled) {
                logger.warn('Feature flag disabled', { flagKey, tenantId });

                return res.status(403).json({
                    error: 'Feature Not Available',
                    message: `Feature '${flagKey}' is not enabled`,
                });
            }

            next();
        } catch (error) {
            logger.error('Feature flag middleware error', { error });
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to check feature flag',
            });
        }
    };
};
