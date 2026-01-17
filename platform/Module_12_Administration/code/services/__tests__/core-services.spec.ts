import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tenant, TenantStatus } from '../../entities/tenant.entity';
import { User, UserStatus } from '../../entities/user.entity';
import { SubscriptionPlan } from '../../entities/subscription.entity';

// Mock service class for testing
class MockAdministrationService {
    constructor(
        private tenantRepo: Repository<Tenant>,
        private userRepo: Repository<User>
    ) { }

    async createTenant(data: Partial<Tenant>): Promise<Tenant> {
        const tenant = this.tenantRepo.create({ ...data, status: TenantStatus.PROVISIONING });
        return this.tenantRepo.save(tenant);
    }

    async activateTenant(tenantId: string): Promise<Tenant> {
        const tenant = await this.tenantRepo.findOne({ where: { tenantId } });
        if (!tenant) throw new Error('Tenant not found');

        tenant.status = TenantStatus.ACTIVE;
        tenant.activatedDate = new Date();
        return this.tenantRepo.save(tenant);
    }

    async suspendTenant(tenantId: string, reason: string): Promise<Tenant> {
        const tenant = await this.tenantRepo.findOne({ where: { tenantId } });
        if (!tenant) throw new Error('Tenant not found');

        tenant.status = TenantStatus.SUSPENDED;
        tenant.metadata = { ...tenant.metadata, suspensionReason: reason };
        return this.tenantRepo.save(tenant);
    }

    async getTenantStats(tenantId: string): Promise<any> {
        const users = await this.userRepo.count({ where: { tenantId } });
        const tenant = await this.tenantRepo.findOne({ where: { tenantId } });

        return {
            totalUsers: users,
            activeUsers: await this.userRepo.count({ where: { tenantId, status: UserStatus.ACTIVE } }),
            tenantStatus: tenant?.status,
            createdDate: tenant?.createdDate,
        };
    }
}

describe('Administration Core Services', () => {
    let service: MockAdministrationService;
    let tenantRepo: Repository<Tenant>;
    let userRepo: Repository<User>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MockAdministrationService,
                {
                    provide: getRepositoryToken(Tenant),
                    useValue: {
                        create: jest.fn((data) => ({ ...data, tenantId: 'generated-id' })),
                        save: jest.fn((data) => Promise.resolve(data)),
                        findOne: jest.fn(),
                        find: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        count: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        findOne: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<MockAdministrationService>(MockAdministrationService);
        tenantRepo = module.get<Repository<Tenant>>(getRepositoryToken(Tenant));
        userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Tenant Management', () => {
        it('should create tenant with provisioning status', async () => {
            const tenantData = {
                organizationName: 'Acme Corp',
                businessType: 'private_limited' as any,
                subscriptionPlanId: 'plan-1',
                createdBy: 'admin-1',
            };

            const result = await service.createTenant(tenantData);

            expect(result.status).toBe(TenantStatus.PROVISIONING);
            expect(tenantRepo.create).toHaveBeenCalled();
            expect(tenantRepo.save).toHaveBeenCalled();
        });

        it('should activate tenant', async () => {
            const mockTenant = {
                tenantId: 'tenant-1',
                status: TenantStatus.PROVISIONING,
                organizationName: 'Acme',
            };

            jest.spyOn(tenantRepo, 'findOne').mockResolvedValue(mockTenant as any);

            const result = await service.activateTenant('tenant-1');

            expect(result.status).toBe(TenantStatus.ACTIVE);
            expect(result.activatedDate).toBeDefined();
        });

        it('should suspend tenant with reason', async () => {
            const mockTenant = {
                tenantId: 'tenant-1',
                status: TenantStatus.ACTIVE,
                metadata: {},
            };

            jest.spyOn(tenantRepo, 'findOne').mockResolvedValue(mockTenant as any);

            const result = await service.suspendTenant('tenant-1', 'Payment overdue');

            expect(result.status).toBe(TenantStatus.SUSPENDED);
            expect(result.metadata.suspensionReason).toBe('Payment overdue');
        });

        it('should handle tenant not found', async () => {
            jest.spyOn(tenantRepo, 'findOne').mockResolvedValue(null);

            await expect(service.activateTenant('invalid-id')).rejects.toThrow('Tenant not found');
        });
    });

    describe('Tenant Statistics', () => {
        it('should calculate tenant stats', async () => {
            const mockTenant = {
                tenantId: 'tenant-1',
                status: TenantStatus.ACTIVE,
                createdDate: new Date(),
            };

            jest.spyOn(tenantRepo, 'findOne').mockResolvedValue(mockTenant as any);
            jest.spyOn(userRepo, 'count')
                .mockResolvedValueOnce(10) // total users
                .mockResolvedValueOnce(8);  // active users

            const stats = await service.getTenantStats('tenant-1');

            expect(stats.totalUsers).toBe(10);
            expect(stats.activeUsers).toBe(8);
            expect(stats.tenantStatus).toBe(TenantStatus.ACTIVE);
        });
    });
});

describe('Subscription Service Tests', () => {
    let subscriptionRepo: Repository<SubscriptionPlan>;

    class MockSubscriptionService {
        constructor(private planRepo: Repository<SubscriptionPlan>) { }

        async createPlan(data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
            const plan = this.planRepo.create(data);
            return this.planRepo.save(plan);
        }

        async activatePlan(planId: string): Promise<SubscriptionPlan> {
            const plan = await this.planRepo.findOne({ where: { planId } });
            if (!plan) throw new Error('Plan not found');

            plan.status = 'active' as any;
            plan.effectiveDate = new Date();
            return this.planRepo.save(plan);
        }

        async getPlanFeatures(planId: string): Promise<any> {
            const plan = await this.planRepo.findOne({ where: { planId } });
            return plan?.featureSet || {};
        }
    }

    let service: MockSubscriptionService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MockSubscriptionService,
                {
                    provide: getRepositoryToken(SubscriptionPlan),
                    useValue: {
                        create: jest.fn((data) => data),
                        save: jest.fn((data) => Promise.resolve({ ...data, planId: 'plan-id' })),
                        findOne: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<MockSubscriptionService>(MockSubscriptionService);
        subscriptionRepo = module.get<Repository<SubscriptionPlan>>(getRepositoryToken(SubscriptionPlan));
    });

    it('should create subscription plan', async () => {
        const planData = {
            planName: 'Enterprise',
            planType: 'subscription' as any,
            basePrice: 299.99,
            currency: 'USD',
            createdBy: 'admin-1',
        };

        const result = await service.createPlan(planData);

        expect(result.planId).toBe('plan-id');
        expect(subscriptionRepo.create).toHaveBeenCalled();
    });

    it('should activate plan with effective date', async () => {
        const mockPlan = {
            planId: 'plan-1',
            status: 'draft' as any,
            planName: 'Pro',
        };

        jest.spyOn(subscriptionRepo, 'findOne').mockResolvedValue(mockPlan as any);

        const result = await service.activatePlan('plan-1');

        expect(result.status).toBe('active');
        expect(result.effectiveDate).toBeDefined();
    });

    it('should get plan features', async () => {
        const mockPlan = {
            planId: 'plan-1',
            featureSet: {
                invoicing: true,
                analytics: true,
                multiCurrency: false,
            },
        };

        jest.spyOn(subscriptionRepo, 'findOne').mockResolvedValue(mockPlan as any);

        const features = await service.getPlanFeatures('plan-1');

        expect(features.invoicing).toBe(true);
        expect(features.analytics).toBe(true);
    });
});

describe('User Management Service Tests', () => {
    let userRepo: Repository<User>;

    class MockUserManagementService {
        constructor(private userRepo: Repository<User>) { }

        async createUser(data: Partial<User>): Promise<User> {
            const user = this.userRepo.create({ ...data, status: UserStatus.PENDING });
            return this.userRepo.save(user);
        }

        async activateUser(userId: string): Promise<User> {
            const user = await this.userRepo.findOne({ where: { userId } });
            if (!user) throw new Error('User not found');

            user.status = UserStatus.ACTIVE;
            user.activatedDate = new Date();
            return this.userRepo.save(user);
        }

        async lockUser(userId: string, durationMinutes: number): Promise<User> {
            const user = await this.userRepo.findOne({ where: { userId } });
            if (!user) throw new Error('User not found');

            user.status = UserStatus.LOCKED;
            user.lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
            return this.userRepo.save(user);
        }

        async enableMFA(userId: string, secret: string): Promise<User> {
            const user = await this.userRepo.findOne({ where: { userId } });
            if (!user) throw new Error('User not found');

            user.mfaEnabled = true;
            user.mfaSecret = secret;
            user.mfaBackupCodes = ['code1', 'code2', 'code3'];
            return this.userRepo.save(user);
        }
    }

    let service: MockUserManagementService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MockUserManagementService,
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        create: jest.fn((data) => data),
                        save: jest.fn((data) => Promise.resolve({ ...data, userId: 'user-id' })),
                        findOne: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<MockUserManagementService>(MockUserManagementService);
        userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    });

    it('should create user with pending status', async () => {
        const userData = {
            tenantId: 'tenant-1',
            username: 'jdoe',
            email: 'jdoe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            passwordHash: 'hashed',
            createdBy: 'admin-1',
        };

        const result = await service.createUser(userData);

        expect(result.status).toBe(UserStatus.PENDING);
    });

    it('should activate user', async () => {
        const mockUser = { userId: 'user-1', status: UserStatus.PENDING };
        jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as any);

        const result = await service.activateUser('user-1');

        expect(result.status).toBe(UserStatus.ACTIVE);
        expect(result.activatedDate).toBeDefined();
    });

    it('should lock user with duration', async () => {
        const mockUser = { userId: 'user-1', status: UserStatus.ACTIVE };
        jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as any);

        const result = await service.lockUser('user-1', 30);

        expect(result.status).toBe(UserStatus.LOCKED);
        expect(result.lockedUntil).toBeDefined();
    });

    it('should enable MFA for user', async () => {
        const mockUser = { userId: 'user-1', mfaEnabled: false };
        jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as any);

        const result = await service.enableMFA('user-1', 'secret-key');

        expect(result.mfaEnabled).toBe(true);
        expect(result.mfaSecret).toBe('secret-key');
        expect(result.mfaBackupCodes).toHaveLength(3);
    });
});
