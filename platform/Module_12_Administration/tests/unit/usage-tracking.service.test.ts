import { UsageTrackingService } from '../code/services/usage-tracking.service';

describe('UsageTrackingService', () => {
    let usageTrackingService: UsageTrackingService;
    let mockPool: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPool = {
            query: jest.fn(),
            connect: jest.fn(() => ({
                query: jest.fn(),
                release: jest.fn(),
            })),
        };

        jest.spyOn(require('../../../Module_11_Common/code/database/database.service'), 'databaseService').mockReturnValue({
            getPool: () => mockPool,
        });

        usageTrackingService = new UsageTrackingService();
    });

    describe('trackEvent', () => {
        it('should track usage event and update quota', async () => {
            const eventData = {
                tenantId: 'tenant-123',
                userId: 'user-456',
                moduleName: 'invoicing',
                eventType: 'invoice.create',
                quantity: 1,
                metadata: { amount: 1000 },
            };

            const mockClient = {
                query: jest.fn(),
                release: jest.fn(),
            };

            mockPool.connect.mockResolvedValue(mockClient);

            mockClient.query
                .mockResolvedValueOnce() // BEGIN
                .mockResolvedValueOnce() // INSERT usage_events
                .mockResolvedValueOnce() // UPDATE quota
                .mockResolvedValue(); // COMMIT

            await usageTrackingService.trackEvent(eventData);

            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO usage_events'),
                expect.arrayContaining([eventData.tenantId, eventData.moduleName])
            );
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });
    });

    describe('checkQuota', () => {
        it('should return quota status with remaining amount', async () => {
            const quota = {
                tenant_id: 'tenant-123',
                module_name: 'invoicing',
                quota_type: 'invoice_count',
                quota_limit: 1000,
                quota_used: 750,
                reset_period: 'monthly',
                last_reset: new Date(),
            };

            jest.spyOn(usageTrackingService as any, 'getQuota').mockResolvedValue({
                tenantId: quota.tenant_id,
                moduleName: quota.module_name,
                quotaType: quota.quota_type,
                quotaLimit: quota.quota_limit,
                quotaUsed: quota.quota_used,
                resetPeriod: quota.reset_period,
                lastReset: quota.last_reset,
            });

            jest.spyOn(usageTrackingService as any, 'checkAndResetQuota').mockResolvedValue();

            const result = await usageTrackingService.checkQuota(
                'tenant-123',
                'invoicing',
                'invoice_count'
            );

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(250);
            expect(result.limit).toBe(1000);
        });

        it('should return unlimited if no quota defined', async () => {
            jest.spyOn(usageTrackingService as any, 'getQuota').mockResolvedValue(null);

            const result = await usageTrackingService.checkQuota(
                'tenant-123',
                'invoicing',
                'invoice_count'
            );

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(-1);
            expect(result.limit).toBe(-1);
        });

        it('should return not allowed if quota exceeded', async () => {
            jest.spyOn(usageTrackingService as any, 'getQuota').mockResolvedValue({
                quotaLimit: 1000,
                quotaUsed: 1000,
                lastReset: new Date(),
            });

            jest.spyOn(usageTrackingService as any, 'checkAndResetQuota').mockResolvedValue();

            const result = await usageTrackingService.checkQuota(
                'tenant-123',
                'invoicing',
                'invoice_count',
                10
            );

            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
        });
    });

    describe('setQuota', () => {
        it('should set quota for tenant', async () => {
            const quotaData = {
                tenantId: 'tenant-123',
                moduleName: 'invoicing',
                quotaType: 'invoice_count',
                quotaLimit: 1000,
                resetPeriod: 'monthly' as const,
            };

            mockPool.query.mockResolvedValue({ rows: [] });

            await usageTrackingService.setQuota(quotaData);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO usage_quotas'),
                expect.arrayContaining([
                    quotaData.tenantId,
                    quotaData.moduleName,
                    quotaData.quotaType,
                    quotaData.quotaLimit,
                    quotaData.resetPeriod,
                ])
            );
        });
    });

    describe('getUsageStats', () => {
        it('should return usage statistics', async () => {
            const tenantId = 'tenant-123';

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [
                        { module_name: 'invoicing', event_type: 'invoice.create', total: '50' },
                        { module_name: 'analytics', event_type: 'report.generate', total: '20' },
                    ],
                })
                .mockResolvedValueOnce({
                    rows: [
                        {
                            module_name: 'invoicing',
                            quota_type: 'invoice_count',
                            quota_used: 750,
                            quota_limit: 1000,
                        },
                    ],
                });

            const stats = await usageTrackingService.getUsageStats(tenantId);

            expect(stats.totalEvents).toBe(70);
            expect(stats.eventsByModule['invoicing']).toBe(50);
            expect(stats.quotaUtilization['invoicing:invoice_count'].percentage).toBe(75);
        });
    });

    describe('resetQuotas', () => {
        it('should reset quotas for given period', async () => {
            mockPool.query.mockResolvedValue({ rowCount: 5 });

            const count = await usageTrackingService.resetQuotas('daily');

            expect(count).toBe(5);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE usage_quotas'),
                expect.arrayContaining(['daily'])
            );
        });
    });
});
