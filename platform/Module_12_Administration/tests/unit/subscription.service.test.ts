import { SubscriptionService } from '../code/services/subscription.service';

describe('SubscriptionService', () => {
    let subscriptionService: SubscriptionService;
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

        subscriptionService = new SubscriptionService();
    });

    describe('createPlan', () => {
        it('should create a subscription plan', async () => {
            const planData = {
                planName: 'Professional',
                planType: 'tier-2' as const,
                status: 'active' as const,
                basePrice: 99.99,
                currency: 'USD',
                billingCycle: 'monthly' as const,
                features: { analytics: true },
                moduleAccess: { invoicing: { accessLevel: 'admin' } },
                usageLimits: { invoices: 1000 },
            };

            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 'plan-123', ...planData }],
            });

            const result = await subscriptionService.createPlan(planData);

            expect(result).toHaveProperty('id');
            expect(result.planName).toBe('Professional');
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO subscription_plans'),
                expect.arrayContaining([planData.planName, planData.planType])
            );
        });
    });

    describe('listPlans', () => {
        it('should return all active plans', async () => {
            const mockPlans = [
                { id: 'plan-1', plan_name: 'Free', base_price: 0 },
                { id: 'plan-2', plan_name: 'Pro', base_price: 99.99 },
            ];

            mockPool.query.mockResolvedValueOnce({ rows: mockPlans });

            const result = await subscriptionService.listPlans();

            expect(result).toHaveLength(2);
            expect(result[0].planName).toBe('Free');
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE status = $1'),
                ['active']
            );
        });
    });

    describe('subscribeTenant', () => {
        it('should subscribe tenant to a plan', async () => {
            const tenantId = 'tenant-123';
            const planId = 'plan-456';

            const mockClient = {
                query: jest.fn(),
                release: jest.fn(),
            };

            mockPool.connect.mockResolvedValue(mockClient);

            // Mock plan exists
            mockClient.query
                .mockResolvedValueOnce() // BEGIN
                .mockResolvedValueOnce({
                    // Check plan
                    rows: [{ id: planId, billing_cycle: 'monthly' }],
                })
                .mockResolvedValueOnce({ rows: [] }) // Check existing subscription
                .mockResolvedValueOnce({
                    // Create subscription
                    rows: [{
                        id: 'sub-789',
                        tenant_id: tenantId,
                        plan_id: planId,
                        status: 'active',
                        start_date: new Date(),
                        auto_renew: true,
                    }],
                })
                .mockResolvedValueOnce() // Module access setup
                .mockResolvedValue(); // COMMIT

            const result = await subscriptionService.subscribeTenant(tenantId, planId, {
                trialDays: 14,
            });

            expect(result.tenantId).toBe(tenantId);
            expect(result.planId).toBe(planId);
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });

        it('should throw error if plan does not exist', async () => {
            const tenantId = 'tenant-123';
            const planId = 'invalid-plan';

            const mockClient = {
                query: jest.fn(),
                release: jest.fn(),
            };

            mockPool.connect.mockResolvedValue(mockClient);

            mockClient.query
                .mockResolvedValueOnce() // BEGIN
                .mockResolvedValueOnce({ rows: [] }); // Plan not found

            await expect(
                subscriptionService.subscribeTenant(tenantId, planId)
            ).rejects.toThrow('Invalid or inactive subscription plan');
        });

        it('should throw error if tenant already has active subscription', async () => {
            const tenantId = 'tenant-123';
            const planId = 'plan-456';

            const mockClient = {
                query: jest.fn(),
                release: jest.fn(),
            };

            mockPool.connect.mockResolvedValue(mockClient);

            mockClient.query
                .mockResolvedValueOnce() // BEGIN
                .mockResolvedValueOnce({
                    rows: [{ id: planId, billing_cycle: 'monthly' }],
                })
                .mockResolvedValueOnce({
                    rows: [{ id: 'existing-sub' }],
                }); // Existing subscription

            await expect(
                subscriptionService.subscribeTenant(tenantId, planId)
            ).rejects.toThrow('Tenant already has an active subscription');
        });
    });

    describe('upgradeSubscription', () => {
        it('should upgrade subscription and calculate proration', async () => {
            const tenantId = 'tenant-123';
            const newPlanId = 'plan-pro';

            const mockClient = {
                query: jest.fn(),
                release: jest.fn(),
            };

            mockPool.connect.mockResolvedValue(mockClient);

            // Mock current subscription
            mockClient.query
                .mockResolvedValueOnce() // BEGIN
                .mockResolvedValueOnce({
                    rows: [{
                        plan_id: 'plan-basic',
                        start_date: new Date('2024-01-01'),
                        end_date: new Date('2024-02-01'),
                    }],
                });

            // Mock getPlanById calls (would need to mock the module)
            jest.spyOn(subscriptionService as any, 'getPlanById')
                .mockResolvedValueOnce({
                    id: 'plan-basic',
                    basePrice: 49.99,
                    billingCycle: 'monthly',
                })
                .mockResolvedValueOnce({
                    id: 'plan-pro',
                    basePrice: 99.99,
                    billingCycle: 'monthly',
                });

            mockClient.query
                .mockResolvedValueOnce() // Insert subscription_changes
                .mockResolvedValueOnce({
                    // Update subscription
                    rows: [{
                        id: 'sub-123',
                        tenant_id: tenantId,
                        plan_id: newPlanId,
                        status: 'active',
                    }],
                })
                .mockResolvedValueOnce() // Setup module access
                .mockResolvedValue(); // COMMIT

            const result = await subscriptionService.upgradeSubscription(tenantId, newPlanId);

            expect(result.subscription.planId).toBe(newPlanId);
            expect(result.prorationAmount).toBeGreaterThanOrEqual(0);
        });
    });

    describe('cancelSubscription', () => {
        it('should cancel subscription immediately', async () => {
            const tenantId = 'tenant-123';

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await subscriptionService.cancelSubscription(tenantId, true);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('status = $1'),
                ['canceled', tenantId, 'active']
            );
        });

        it('should turn off auto-renew for gradual cancellation', async () => {
            const tenantId = 'tenant-123';

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await subscriptionService.cancelSubscription(tenantId, false);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('auto_renew = false'),
                [tenantId, 'active']
            );
        });
    });

    describe('getTenantSubscription', () => {
        it('should return active subscription', async () => {
            const tenantId = 'tenant-123';

            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 'sub-123',
                    tenant_id: tenantId,
                    plan_id: 'plan-123',
                    status: 'active',
                    start_date: new Date(),
                    auto_renew: true,
                }],
            });

            const result = await subscriptionService.getTenantSubscription(tenantId);

            expect(result).not.toBeNull();
            expect(result?.tenantId).toBe(tenantId);
        });

        it('should return null if no active subscription', async () => {
            const tenantId = 'tenant-123';

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const result = await subscriptionService.getTenantSubscription(tenantId);

            expect(result).toBeNull();
        });
    });
});
