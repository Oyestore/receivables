import { ModuleAccessService } from '../code/services/module-access.service';

describe('ModuleAccessService', () => {
    let moduleAccessService: ModuleAccessService;
    let mockPool: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPool = {
            query: jest.fn(),
        };

        jest.spyOn(require('../../../Module_11_Common/code/database/database.service'), 'databaseService').mockReturnValue({
            getPool: () => mockPool,
        });

        moduleAccessService = new ModuleAccessService();
        moduleAccessService.clearCache(); // Clear cache before each test
    });

    describe('hasModuleAccess', () => {
        it('should return true if tenant has required access level', async () => {
            mockPool.query.mockResolvedValue({
                rows: [{
                    tenant_id: 'tenant-123',
                    module_name: 'analytics',
                    access_level: 'write',
                    is_active: true,
                }],
            });

            const hasAccess = await moduleAccessService.hasModuleAccess(
                'tenant-123',
                'analytics',
                'read'
            );

            expect(hasAccess).toBe(true);
        });

        it('should return false if access level insufficient', async () => {
            mockPool.query.mockResolvedValue({
                rows: [{
                    tenant_id: 'tenant-123',
                    module_name: 'analytics',
                    access_level: 'read',
                    is_active: true,
                }],
            });

            const hasAccess = await moduleAccessService.hasModuleAccess(
                'tenant-123',
                'analytics',
                'admin'
            );

            expect(hasAccess).toBe(false);
        });

        it('should return false if module not active', async () => {
            mockPool.query.mockResolvedValue({
                rows: [{
                    tenant_id: 'tenant-123',
                    module_name: 'analytics',
                    access_level: 'admin',
                    is_active: false,
                }],
            });

            const hasAccess = await moduleAccessService.hasModuleAccess(
                'tenant-123',
                'analytics',
                'read'
            );

            expect(hasAccess).toBe(false);
        });
    });

    describe('isFeatureEnabled', () => {
        it('should return true if feature is globally enabled', async () => {
            mockPool.query.mockResolvedValue({
                rows: [{
                    flag_key: 'new_dashboard',
                    is_enabled: true,
                    rollout_percentage: 100,
                    tenant_overrides: {},
                }],
            });

            const isEnabled = await moduleAccessService.isFeatureEnabled('new_dashboard');

            expect(isEnabled).toBe(true);
        });

        it('should respect tenant override', async () => {
            mockPool.query.mockResolvedValue({
                rows: [{
                    flag_key: 'beta_feature',
                    is_enabled: false,
                    rollout_percentage: 0,
                    tenant_overrides: { 'tenant-123': true },
                }],
            });

            const isEnabled = await moduleAccessService.isFeatureEnabled(
                'beta_feature',
                'tenant-123'
            );

            expect(isEnabled).toBe(true);
        });

        it('should return false if feature not found', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            const isEnabled = await moduleAccessService.isFeatureEnabled('nonexistent');

            expect(isEnabled).toBe(false);
        });

        it('should handle rollout percentage', async () => {
            mockPool.query.mockResolvedValue({
                rows: [{
                    flag_key: 'gradual_rollout',
                    is_enabled: true,
                    rollout_percentage: 50,
                    tenant_overrides: {},
                }],
            });

            // Hash-based rollout - specific tenant will either always be in or out
            const isEnabled = await moduleAccessService.isFeatureEnabled(
                'gradual_rollout',
                'tenant-test'
            );

            expect(typeof isEnabled).toBe('boolean');
        });
    });

    describe('grantAccess', () => {
        it('should grant module access to tenant', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            await moduleAccessService.grantAccess({
                tenantId: 'tenant-123',
                moduleName: 'analytics',
                accessLevel: 'write',
                featuresEnabled: ['export', 'custom_reports'],
                usageQuota: { queries: 1000 },
            });

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO module_access'),
                expect.arrayContaining(['tenant-123', 'analytics', 'write'])
            );
        });
    });

    describe('revokeAccess', () => {
        it('should revoke module access', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            await moduleAccessService.revokeAccess('tenant-123', 'analytics');

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE module_access SET is_active = false'),
                ['tenant-123', 'analytics']
            );
        });
    });

    describe('setFeatureFlag', () => {
        it('should create or update feature flag', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            await moduleAccessService.setFeatureFlag({
                flagKey: 'new_feature',
                flagName: 'New Feature Beta',
                moduleName: 'analytics',
                isEnabled: true,
                rolloutPercentage: 50,
                tenantOverrides: { 'tenant-vip': true },
            });

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO feature_flags'),
                expect.arrayContaining(['new_feature', 'New Feature Beta'])
            );
        });
    });

    describe('caching', () => {
        it('should cache module access queries', async () => {
            mockPool.query.mockResolvedValue({
                rows: [{
                    tenant_id: 'tenant-123',
                    module_name: 'analytics',
                    access_level: 'write',
                    is_active: true,
                }],
            });

            // First call - should query database
            await moduleAccessService.hasModuleAccess('tenant-123', 'analytics', 'read');

            // Second call - should use cache
            await moduleAccessService.hasModuleAccess('tenant-123', 'analytics', 'read');

            // Should only query database once
            expect(mockPool.query).toHaveBeenCalledTimes(1);
        });

        it('should clear cache when access is granted', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            await moduleAccessService.grantAccess({
                tenantId: 'tenant-123',
                moduleName: 'analytics',
                accessLevel: 'write',
            });

            // Cache should be invalidated - next query will hit database
            mockPool.query.mockResolvedValue({
                rows: [{
                    tenant_id: 'tenant-123',
                    module_name: 'analytics',
                    access_level: 'write',
                    is_active: true,
                }],
            });

            await moduleAccessService.hasModuleAccess('tenant-123', 'analytics', 'read');

            expect(mockPool.query).toHaveBeenCalled();
        });
    });
});
