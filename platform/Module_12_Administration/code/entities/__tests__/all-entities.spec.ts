import { Tenant, TenantContact, TenantStatus, BusinessType, ComplianceStatus, DataResidency, ContactType } from '../tenant.entity';
import { User, UserStatus } from '../user.entity';
import { SubscriptionPlan, PlanFeature, UsageRate, PlanType, PlanStatus, BillingCycle, AccessLevel, RateType } from '../subscription.entity';

describe('Module 12 Entity Tests - All Entities', () => {
    describe('Tenant Entity', () => {
        it('should create tenant with required fields', () => {
            const tenant = new Tenant();
            tenant.organizationName = 'Acme Corp';
            tenant.businessType = BusinessType.PRIVATE_LIMITED;
            tenant.subscriptionPlanId = 'plan-1';
            tenant.createdBy = 'user-1';

            expect(tenant.organizationName).toBe('Acme Corp');
            expect(tenant.businessType).toBe(BusinessType.PRIVATE_LIMITED);
        });

        it('should set default status to provisioning', () => {
            const tenant = new Tenant();
            tenant.status = TenantStatus.PROVISIONING;

            expect(tenant.status).toBe(TenantStatus.PROVISIONING);
        });

        it('should track tenant lifecycle', () => {
            const tenant = new Tenant();
            tenant.status = TenantStatus.PROVISIONING;
            tenant.createdDate = new Date();

            tenant.status = TenantStatus.ACTIVE;
            tenant.activatedDate = new Date();

            expect(tenant.status).toBe(TenantStatus.ACTIVE);
            expect(tenant.activatedDate).toBeDefined();
        });

        it('should support all business types', () => {
            const types = [BusinessType.SOLE_PROPRIETORSHIP, BusinessType.PARTNERSHIP, BusinessType.PRIVATE_LIMITED];
            types.forEach(type => {
                const tenant = new Tenant();
                tenant.businessType = type;
                expect(tenant.businessType).toBe(type);
            });
        });

        it('should handle compliance status', () => {
            const tenant = new Tenant();
            tenant.complianceStatus = ComplianceStatus.PENDING;
            expect(tenant.complianceStatus).toBe(ComplianceStatus.PENDING);

            tenant.complianceStatus = ComplianceStatus.COMPLIANT;
            expect(tenant.complianceStatus).toBe(ComplianceStatus.COMPLIANT);
        });

        it('should manage data residency', () => {
            const tenant = new Tenant();
            tenant.dataResidency = DataResidency.INDIA;

            expect(tenant.dataResidency).toBe(DataResidency.INDIA);
        });

        it('should store resource limits', () => {
            const tenant = new Tenant();
            tenant.resourceLimits = {
                maxUsers: 50,
                maxInvoices: 1000,
                storageGB: 10,
            };

            expect(tenant.resourceLimits.maxUsers).toBe(50);
        });

        it('should support custom domain', () => {
            const tenant = new Tenant();
            tenant.customDomain = 'acme.example.com';

            expect(tenant.customDomain).toBe('acme.example.com');
        });
    });

    describe('TenantContact Entity', () => {
        it('should create tenant contact', () => {
            const contact = new TenantContact();
            contact.tenantId = 'tenant-1';
            contact.contactType = ContactType.PRIMARY;
            contact.firstName = 'John';
            contact.lastName = 'Doe';
            contact.email = 'john@example.com';

            expect(contact.contactType).toBe(ContactType.PRIMARY);
            expect(contact.email).toBe('john@example.com');
        });

        it('should support multiple contact types', () => {
            const types = [ContactType.PRIMARY, ContactType.BILLING, ContactType.TECHNICAL];
            types.forEach(type => {
                const contact = new TenantContact();
                contact.contactType = type;
                expect(contact.contactType).toBe(type);
            });
        });
    });

    describe('User Entity', () => {
        it('should create user with required fields', () => {
            const user = new User();
            user.tenantId = 'tenant-1';
            user.username = 'jdoe';
            user.email = 'jdoe@example.com';
            user.firstName = 'John';
            user.lastName = 'Doe';
            user.passwordHash = 'hashed_password';
            user.createdBy = 'admin-1';

            expect(user.username).toBe('jdoe');
            expect(user.email).toBe('jdoe@example.com');
        });

        it('should set default status to pending', () => {
            const user = new User();
            user.status = UserStatus.PENDING;

            expect(user.status).toBe(UserStatus.PENDING);
        });

        it('should track user lifecycle', () => {
            const user = new User();
            user.status = UserStatus.PENDING;
            user.createdDate = new Date();

            user.status = UserStatus.ACTIVE;
            user.activatedDate = new Date();

            expect(user.status).toBe(UserStatus.ACTIVE);
            expect(user.activatedDate).toBeDefined();
        });

        it('should handle MFA settings', () => {
            const user = new User();
            user.mfaEnabled = true;
            user.mfaSecret = 'secret_key';
            user.mfaBackupCodes = ['code1', 'code2'];

            expect(user.mfaEnabled).toBe(true);
            expect(user.mfaBackupCodes).toHaveLength(2);
        });

        it('should track login attempts and locking', () => {
            const user = new User();
            user.loginAttempts = 3;
            user.status = UserStatus.LOCKED;
            user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);

            expect(user.loginAttempts).toBe(3);
            expect(user.status).toBe(UserStatus.LOCKED);
        });

        it('should manage password lifecycle', () => {
            const user = new User();
            user.passwordChangedDate = new Date();
            user.passwordExpiresDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

            expect(user.passwordChangedDate).toBeDefined();
            expect(user.passwordExpiresDate).toBeDefined();
        });

        it('should store user preferences', () => {
            const user = new User();
            user.preferences = {
                language: 'en',
                theme: 'dark',
                notifications: true,
            };

            expect(user.preferences.theme).toBe('dark');
        });
    });

    describe('SubscriptionPlan Entity', () => {
        it('should create subscription plan', () => {
            const plan = new SubscriptionPlan();
            plan.planName = 'Pro Plan';
            plan.planType = PlanType.SUBSCRIPTION;
            plan.basePrice = 99.99;
            plan.currency = 'USD';
            plan.billingCycle = BillingCycle.MONTHLY;
            plan.createdBy = 'admin-1';

            expect(plan.planName).toBe('Pro Plan');
            expect(plan.basePrice).toBe(99.99);
        });

        it('should support all plan types', () => {
            const types = [PlanType.SUBSCRIPTION, PlanType.TRIAL, PlanType.ENTERPRISE];
            types.forEach(type => {
                const plan = new SubscriptionPlan();
                plan.planType = type;
                expect(plan.planType).toBe(type);
            });
        });

        it('should manage plan status', () => {
            const plan = new SubscriptionPlan();
            plan.status = PlanStatus.DRAFT;
            expect(plan.status).toBe(PlanStatus.DRAFT);

            plan.status = PlanStatus.ACTIVE;
            expect(plan.status).toBe(PlanStatus.ACTIVE);
        });

        it('should store feature set', () => {
            const plan = new SubscriptionPlan();
            plan.featureSet = {
                invoicing: true,
                payments: true,
                analytics: true,
            };

            expect(plan.featureSet.analytics).toBe(true);
        });

        it('should define usage limits', () => {
            const plan = new SubscriptionPlan();
            plan.usageLimits = {
                maxInvoices: 1000,
                maxUsers: 10,
                apiCallsPerMonth: 10000,
            };

            expect(plan.usageLimits.maxInvoices).toBe(1000);
        });
    });

    describe('PlanFeature Entity', () => {
        it('should create plan feature', () => {
            const feature = new PlanFeature();
            feature.planId = 'plan-1';
            feature.moduleName = 'invoicing';
            feature.featureName = 'recurring_invoices';
            feature.accessLevel = AccessLevel.WRITE;

            expect(feature.featureName).toBe('recurring_invoices');
        });

        it('should support all access levels', () => {
            const levels = [AccessLevel.NONE, AccessLevel.READ, AccessLevel.WRITE, AccessLevel.ADMIN];
            levels.forEach(level => {
                const feature = new PlanFeature();
                feature.accessLevel = level;
                expect(feature.accessLevel).toBe(level);
            });
        });

        it('should handle usage limits', () => {
            const feature = new PlanFeature();
            feature.usageLimit = 100;

            expect(feature.usageLimit).toBe(100);
        });
    });

    describe('UsageRate Entity', () => {
        it('should create usage rate', () => {
            const rate = new UsageRate();
            rate.planId = 'plan-1';
            rate.moduleName = 'api';
            rate.rateType = RateType.PER_API_CALL;
            rate.rateAmount = 0.01;
            rate.billingUnit = 'call';

            expect(rate.rateType).toBe(RateType.PER_API_CALL);
            expect(rate.rateAmount).toBe(0.01);
        });

        it('should support tier pricing', () => {
            const rate = new UsageRate();
            rate.tierPricing = [
                { from: 0, to: 1000, rate: 0.01 },
                { from: 1001, to: 10000, rate: 0.008 },
            ];

            expect(rate.tierPricing).toHaveLength(2);
        });

        it('should handle overage rates', () => {
            const rate = new UsageRate();
            rate.includedQuantity = 1000;
            rate.overageRate = 0.02;

            expect(rate.overageRate).toBe(0.02);
        });
    });
});
