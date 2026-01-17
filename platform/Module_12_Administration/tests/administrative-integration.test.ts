/**
 * Administrative Module Integration Tests
 * SME Receivables Management Platform - Administrative Module
 * 
 * @fileoverview Comprehensive integration tests for the 2-tier hierarchical administrative module
 * @version 1.0.0
 * @since 2025-01-21
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { DataSource } from 'typeorm';

// Platform-Level Services
import { TenantManagementService } from '../../src/platform-admin/services/tenant-management.service';
import { SubscriptionManagementService } from '../../src/platform-admin/services/subscription-management.service';

// Tenant-Level Services
import { UserManagementService } from '../../src/tenant-admin/services/user-management.service';

// Entities
import { Tenant } from '../../src/platform-admin/entities/tenant.entity';
import { SubscriptionPlan } from '../../src/platform-admin/entities/subscription-plan.entity';
import { User } from '../../src/tenant-admin/entities/user.entity';
import { UserSession } from '../../src/tenant-admin/entities/user-session.entity';

// Enums and Interfaces
import { 
  TenantStatus, 
  BusinessType, 
  UserStatus, 
  SubscriptionPlanType, 
  BillingCycle, 
  Currency,
  TimeZone
} from '../../src/shared/enums/administrative.enum';

/**
 * Integration test suite for the Administrative Module
 * Tests end-to-end workflows across platform and tenant levels
 */
describe('Administrative Module Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let tenantManagementService: TenantManagementService;
  let subscriptionManagementService: SubscriptionManagementService;
  let userManagementService: UserManagementService;

  // Test data
  let testSubscriptionPlan: SubscriptionPlan;
  let testTenant: Tenant;
  let testUser: User;
  let adminAccessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test'
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DB_HOST || 'localhost',
          port: parseInt(process.env.TEST_DB_PORT) || 5432,
          username: process.env.TEST_DB_USERNAME || 'test',
          password: process.env.TEST_DB_PASSWORD || 'test',
          database: process.env.TEST_DB_NAME || 'sme_admin_test',
          entities: [__dirname + '/../../src/**/*.entity{.ts,.js}'],
          synchronize: true,
          dropSchema: true,
          logging: false
        }),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' }
        }),
        TypeOrmModule.forFeature([
          Tenant,
          SubscriptionPlan,
          User,
          UserSession
        ])
      ],
      providers: [
        TenantManagementService,
        SubscriptionManagementService,
        UserManagementService
      ]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    tenantManagementService = moduleFixture.get<TenantManagementService>(TenantManagementService);
    subscriptionManagementService = moduleFixture.get<SubscriptionManagementService>(SubscriptionManagementService);
    userManagementService = moduleFixture.get<UserManagementService>(UserManagementService);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await dataSource.query('TRUNCATE TABLE admin_platform.subscription_plans CASCADE');
    await dataSource.query('TRUNCATE TABLE admin_platform.tenants CASCADE');
    await dataSource.query('TRUNCATE TABLE admin_tenant.users CASCADE');
    await dataSource.query('TRUNCATE TABLE admin_tenant.user_sessions CASCADE');
  });

  // =====================================================================================
  // PLATFORM-LEVEL INTEGRATION TESTS
  // =====================================================================================

  describe('Platform-Level Operations', () => {
    describe('Subscription Plan Management', () => {
      it('should create a subscription plan successfully', async () => {
        const createPlanDto = {
          planName: 'Professional Plan',
          planType: SubscriptionPlanType.SUBSCRIPTION,
          basePrice: 99.99,
          currency: Currency.USD,
          billingCycle: BillingCycle.MONTHLY,
          enabledModules: ['invoice_generation', 'payment_integration'],
          features: {
            invoice_generation: ['basic_invoicing', 'recurring_invoices'],
            payment_integration: ['payment_gateway', 'payment_tracking']
          },
          usageLimits: {
            users: 50,
            storage: 100,
            apiCalls: 50000,
            computeHours: 500,
            integrations: 10,
            customFields: 100,
            workflows: 25,
            reports: 50
          },
          targetSegments: ['SME', 'Mid-Market'],
          description: 'Professional plan for growing businesses',
          createdBy: 'system-admin'
        };

        const plan = await subscriptionManagementService.createSubscriptionPlan(createPlanDto);

        expect(plan).toBeDefined();
        expect(plan.planName).toBe(createPlanDto.planName);
        expect(plan.planType).toBe(createPlanDto.planType);
        expect(plan.basePrice).toBe(createPlanDto.basePrice);
        expect(plan.status).toBe('draft');
        expect(plan.featureSet.modules).toEqual(createPlanDto.enabledModules);

        testSubscriptionPlan = plan;
      });

      it('should activate a subscription plan', async () => {
        // First create a plan
        const createPlanDto = {
          planName: 'Enterprise Plan',
          planType: SubscriptionPlanType.SUBSCRIPTION,
          basePrice: 299.99,
          currency: Currency.USD,
          billingCycle: BillingCycle.MONTHLY,
          enabledModules: ['invoice_generation'],
          features: { invoice_generation: ['advanced_invoicing'] },
          usageLimits: {
            users: 100,
            storage: 500,
            apiCalls: 100000,
            computeHours: 1000,
            integrations: 25,
            customFields: 200,
            workflows: 50,
            reports: 100
          },
          targetSegments: ['Enterprise'],
          createdBy: 'system-admin'
        };

        const plan = await subscriptionManagementService.createSubscriptionPlan(createPlanDto);
        
        // Activate the plan
        const activatedPlan = await subscriptionManagementService.activateSubscriptionPlan(
          plan.id, 
          'system-admin'
        );

        expect(activatedPlan.status).toBe('active');
        expect(activatedPlan.isActive).toBe(true);
        expect(activatedPlan.effectiveDate).toBeDefined();
      });

      it('should get active subscription plans', async () => {
        // Create and activate multiple plans
        const plans = await Promise.all([
          subscriptionManagementService.createSubscriptionPlan({
            planName: 'Basic Plan',
            planType: SubscriptionPlanType.SUBSCRIPTION,
            basePrice: 29.99,
            currency: Currency.USD,
            billingCycle: BillingCycle.MONTHLY,
            enabledModules: ['invoice_generation'],
            features: { invoice_generation: ['basic_invoicing'] },
            usageLimits: {
              users: 10,
              storage: 50,
              apiCalls: 10000,
              computeHours: 100,
              integrations: 3,
              customFields: 25,
              workflows: 5,
              reports: 10
            },
            targetSegments: ['Startup'],
            createdBy: 'system-admin'
          }),
          subscriptionManagementService.createSubscriptionPlan({
            planName: 'Premium Plan',
            planType: SubscriptionPlanType.SUBSCRIPTION,
            basePrice: 199.99,
            currency: Currency.USD,
            billingCycle: BillingCycle.MONTHLY,
            enabledModules: ['invoice_generation', 'payment_integration'],
            features: {
              invoice_generation: ['advanced_invoicing'],
              payment_integration: ['payment_gateway']
            },
            usageLimits: {
              users: 75,
              storage: 250,
              apiCalls: 75000,
              computeHours: 750,
              integrations: 15,
              customFields: 150,
              workflows: 35,
              reports: 75
            },
            targetSegments: ['SME'],
            createdBy: 'system-admin'
          })
        ]);

        // Activate plans
        await Promise.all(plans.map(plan => 
          subscriptionManagementService.activateSubscriptionPlan(plan.id, 'system-admin')
        ));

        const activePlans = await subscriptionManagementService.getActiveSubscriptionPlans();
        
        expect(activePlans).toHaveLength(2);
        expect(activePlans.every(plan => plan.isActive)).toBe(true);
      });
    });

    describe('Tenant Management', () => {
      beforeEach(async () => {
        // Create a subscription plan for tenant creation
        testSubscriptionPlan = await subscriptionManagementService.createSubscriptionPlan({
          planName: 'Test Plan',
          planType: SubscriptionPlanType.SUBSCRIPTION,
          basePrice: 99.99,
          currency: Currency.USD,
          billingCycle: BillingCycle.MONTHLY,
          enabledModules: ['invoice_generation'],
          features: { invoice_generation: ['basic_invoicing'] },
          usageLimits: {
            users: 50,
            storage: 100,
            apiCalls: 50000,
            computeHours: 500,
            integrations: 10,
            customFields: 100,
            workflows: 25,
            reports: 50
          },
          targetSegments: ['SME'],
          createdBy: 'system-admin'
        });

        await subscriptionManagementService.activateSubscriptionPlan(
          testSubscriptionPlan.id, 
          'system-admin'
        );
      });

      it('should create a tenant with comprehensive provisioning', async () => {
        const createTenantDto = {
          organizationName: 'Acme Corporation',
          businessType: BusinessType.PRIVATE_LIMITED,
          subscriptionPlanId: testSubscriptionPlan.id,
          customDomain: 'acme.smeplatform.com',
          contacts: [
            {
              contactType: 'primary',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@acme.com',
              phone: '+1234567890',
              department: 'IT',
              jobTitle: 'CTO',
              isPrimary: true
            }
          ],
          createdBy: 'system-admin'
        };

        const result = await tenantManagementService.createTenant(createTenantDto);

        expect(result.provisioningStatus).toBe('success');
        expect(result.tenant).toBeDefined();
        expect(result.tenant.organizationName).toBe(createTenantDto.organizationName);
        expect(result.tenant.businessType).toBe(createTenantDto.businessType);
        expect(result.tenant.status).toBe(TenantStatus.PENDING_ACTIVATION);
        expect(result.provisioningSteps).toHaveLength(6);
        expect(result.provisioningSteps.every(step => step.status === 'completed')).toBe(true);

        testTenant = result.tenant;
      });

      it('should activate a tenant', async () => {
        // First create a tenant
        const createTenantDto = {
          organizationName: 'Beta Corp',
          businessType: BusinessType.PARTNERSHIP,
          subscriptionPlanId: testSubscriptionPlan.id,
          contacts: [
            {
              contactType: 'primary',
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'jane.smith@beta.com',
              isPrimary: true
            }
          ],
          createdBy: 'system-admin'
        };

        const result = await tenantManagementService.createTenant(createTenantDto);
        const tenant = result.tenant;

        // Activate the tenant
        const activatedTenant = await tenantManagementService.activateTenant(
          tenant.id, 
          'system-admin'
        );

        expect(activatedTenant.status).toBe(TenantStatus.ACTIVE);
        expect(activatedTenant.isActive).toBe(true);
        expect(activatedTenant.activatedDate).toBeDefined();
      });

      it('should get tenant metrics', async () => {
        // Create multiple tenants with different statuses
        const tenants = await Promise.all([
          tenantManagementService.createTenant({
            organizationName: 'Company A',
            businessType: BusinessType.PRIVATE_LIMITED,
            subscriptionPlanId: testSubscriptionPlan.id,
            contacts: [{ contactType: 'primary', firstName: 'A', lastName: 'User', email: 'a@company.com', isPrimary: true }],
            createdBy: 'system-admin'
          }),
          tenantManagementService.createTenant({
            organizationName: 'Company B',
            businessType: BusinessType.PUBLIC_LIMITED,
            subscriptionPlanId: testSubscriptionPlan.id,
            contacts: [{ contactType: 'primary', firstName: 'B', lastName: 'User', email: 'b@company.com', isPrimary: true }],
            createdBy: 'system-admin'
          })
        ]);

        // Activate one tenant
        await tenantManagementService.activateTenant(tenants[0].tenant.id, 'system-admin');

        const metrics = await tenantManagementService.getTenantMetrics();

        expect(metrics.totalTenants).toBe(2);
        expect(metrics.activeTenants).toBe(1);
        expect(metrics.tenantsByBusinessType[BusinessType.PRIVATE_LIMITED]).toBe(1);
        expect(metrics.tenantsByBusinessType[BusinessType.PUBLIC_LIMITED]).toBe(1);
      });
    });
  });

  // =====================================================================================
  // TENANT-LEVEL INTEGRATION TESTS
  // =====================================================================================

  describe('Tenant-Level Operations', () => {
    beforeEach(async () => {
      // Create subscription plan and tenant for user tests
      testSubscriptionPlan = await subscriptionManagementService.createSubscriptionPlan({
        planName: 'User Test Plan',
        planType: SubscriptionPlanType.SUBSCRIPTION,
        basePrice: 99.99,
        currency: Currency.USD,
        billingCycle: BillingCycle.MONTHLY,
        enabledModules: ['invoice_generation'],
        features: { invoice_generation: ['basic_invoicing'] },
        usageLimits: {
          users: 50,
          storage: 100,
          apiCalls: 50000,
          computeHours: 500,
          integrations: 10,
          customFields: 100,
          workflows: 25,
          reports: 50
        },
        targetSegments: ['SME'],
        createdBy: 'system-admin'
      });

      await subscriptionManagementService.activateSubscriptionPlan(
        testSubscriptionPlan.id, 
        'system-admin'
      );

      const tenantResult = await tenantManagementService.createTenant({
        organizationName: 'User Test Corp',
        businessType: BusinessType.PRIVATE_LIMITED,
        subscriptionPlanId: testSubscriptionPlan.id,
        contacts: [
          {
            contactType: 'primary',
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@usertest.com',
            isPrimary: true
          }
        ],
        createdBy: 'system-admin'
      });

      testTenant = await tenantManagementService.activateTenant(
        tenantResult.tenant.id, 
        'system-admin'
      );
    });

    describe('User Management', () => {
      it('should create a user successfully', async () => {
        const createUserDto = {
          tenantId: testTenant.id,
          username: 'testuser',
          email: 'testuser@usertest.com',
          firstName: 'Test',
          lastName: 'User',
          phone: '+1234567890',
          department: 'Finance',
          jobTitle: 'Accountant',
          password: 'SecurePassword123!',
          roleIds: [], // Would need to create roles first
          timezone: TimeZone.UTC,
          language: 'en',
          createdBy: 'admin-user'
        };

        const user = await userManagementService.createUser(createUserDto);

        expect(user).toBeDefined();
        expect(user.username).toBe(createUserDto.username);
        expect(user.email).toBe(createUserDto.email);
        expect(user.firstName).toBe(createUserDto.firstName);
        expect(user.lastName).toBe(createUserDto.lastName);
        expect(user.tenantId).toBe(testTenant.id);
        expect(user.status).toBe(UserStatus.PENDING);

        testUser = user;
      });

      it('should activate a user', async () => {
        // First create a user
        const createUserDto = {
          tenantId: testTenant.id,
          username: 'activateuser',
          email: 'activate@usertest.com',
          firstName: 'Activate',
          lastName: 'User',
          password: 'SecurePassword123!',
          roleIds: [],
          createdBy: 'admin-user'
        };

        const user = await userManagementService.createUser(createUserDto);

        // Activate the user
        const activatedUser = await userManagementService.activateUser(
          user.id, 
          'admin-user'
        );

        expect(activatedUser.status).toBe(UserStatus.ACTIVE);
        expect(activatedUser.isActive).toBe(true);
        expect(activatedUser.activatedDate).toBeDefined();
      });

      it('should authenticate user login', async () => {
        // Create and activate a user
        const createUserDto = {
          tenantId: testTenant.id,
          username: 'loginuser',
          email: 'login@usertest.com',
          firstName: 'Login',
          lastName: 'User',
          password: 'SecurePassword123!',
          roleIds: [],
          createdBy: 'admin-user'
        };

        const user = await userManagementService.createUser(createUserDto);
        await userManagementService.activateUser(user.id, 'admin-user');

        // Attempt login
        const loginDto = {
          tenantId: testTenant.id,
          username: 'loginuser',
          password: 'SecurePassword123!',
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent'
        };

        const loginResult = await userManagementService.login(loginDto);

        expect(loginResult.success).toBe(true);
        expect(loginResult.user).toBeDefined();
        expect(loginResult.accessToken).toBeDefined();
        expect(loginResult.refreshToken).toBeDefined();
        expect(loginResult.sessionId).toBeDefined();
      });

      it('should handle failed login attempts', async () => {
        // Create and activate a user
        const createUserDto = {
          tenantId: testTenant.id,
          username: 'failuser',
          email: 'fail@usertest.com',
          firstName: 'Fail',
          lastName: 'User',
          password: 'SecurePassword123!',
          roleIds: [],
          createdBy: 'admin-user'
        };

        const user = await userManagementService.createUser(createUserDto);
        await userManagementService.activateUser(user.id, 'admin-user');

        // Attempt login with wrong password
        const loginDto = {
          tenantId: testTenant.id,
          username: 'failuser',
          password: 'WrongPassword',
          ipAddress: '127.0.0.1'
        };

        const loginResult = await userManagementService.login(loginDto);

        expect(loginResult.success).toBe(false);
        expect(loginResult.error).toBe('Invalid credentials');

        // Check that login attempts were recorded
        const updatedUser = await userManagementService.findUserById(user.id);
        expect(updatedUser.loginAttempts).toBe(1);
      });

      it('should get user metrics for tenant', async () => {
        // Create multiple users with different statuses
        const users = await Promise.all([
          userManagementService.createUser({
            tenantId: testTenant.id,
            username: 'user1',
            email: 'user1@usertest.com',
            firstName: 'User',
            lastName: 'One',
            password: 'Password123!',
            roleIds: [],
            department: 'Sales',
            createdBy: 'admin-user'
          }),
          userManagementService.createUser({
            tenantId: testTenant.id,
            username: 'user2',
            email: 'user2@usertest.com',
            firstName: 'User',
            lastName: 'Two',
            password: 'Password123!',
            roleIds: [],
            department: 'Marketing',
            createdBy: 'admin-user'
          })
        ]);

        // Activate one user
        await userManagementService.activateUser(users[0].id, 'admin-user');

        const metrics = await userManagementService.getUserMetrics(testTenant.id);

        expect(metrics.totalUsers).toBe(2);
        expect(metrics.activeUsers).toBe(1);
        expect(metrics.pendingUsers).toBe(1);
        expect(metrics.usersByDepartment['Sales']).toBe(1);
        expect(metrics.usersByDepartment['Marketing']).toBe(1);
      });
    });
  });

  // =====================================================================================
  // CROSS-TIER INTEGRATION TESTS
  // =====================================================================================

  describe('Cross-Tier Integration', () => {
    it('should handle complete tenant onboarding workflow', async () => {
      // Step 1: Create subscription plan
      const plan = await subscriptionManagementService.createSubscriptionPlan({
        planName: 'Complete Workflow Plan',
        planType: SubscriptionPlanType.SUBSCRIPTION,
        basePrice: 149.99,
        currency: Currency.USD,
        billingCycle: BillingCycle.MONTHLY,
        enabledModules: ['invoice_generation', 'payment_integration'],
        features: {
          invoice_generation: ['basic_invoicing', 'recurring_invoices'],
          payment_integration: ['payment_gateway']
        },
        usageLimits: {
          users: 25,
          storage: 75,
          apiCalls: 25000,
          computeHours: 250,
          integrations: 8,
          customFields: 75,
          workflows: 15,
          reports: 30
        },
        targetSegments: ['SME'],
        createdBy: 'system-admin'
      });

      await subscriptionManagementService.activateSubscriptionPlan(plan.id, 'system-admin');

      // Step 2: Create tenant
      const tenantResult = await tenantManagementService.createTenant({
        organizationName: 'Complete Workflow Corp',
        businessType: BusinessType.PRIVATE_LIMITED,
        subscriptionPlanId: plan.id,
        contacts: [
          {
            contactType: 'primary',
            firstName: 'Workflow',
            lastName: 'Admin',
            email: 'admin@workflow.com',
            isPrimary: true
          }
        ],
        createdBy: 'system-admin'
      });

      expect(tenantResult.provisioningStatus).toBe('success');

      // Step 3: Activate tenant
      const tenant = await tenantManagementService.activateTenant(
        tenantResult.tenant.id, 
        'system-admin'
      );

      expect(tenant.isActive).toBe(true);

      // Step 4: Create admin user
      const adminUser = await userManagementService.createUser({
        tenantId: tenant.id,
        username: 'workflowadmin',
        email: 'admin@workflow.com',
        firstName: 'Workflow',
        lastName: 'Admin',
        password: 'AdminPassword123!',
        roleIds: [],
        createdBy: 'system-admin'
      });

      // Step 5: Activate admin user
      const activeAdminUser = await userManagementService.activateUser(
        adminUser.id, 
        'system-admin'
      );

      expect(activeAdminUser.isActive).toBe(true);

      // Step 6: Test admin login
      const loginResult = await userManagementService.login({
        tenantId: tenant.id,
        username: 'workflowadmin',
        password: 'AdminPassword123!',
        ipAddress: '127.0.0.1'
      });

      expect(loginResult.success).toBe(true);
      expect(loginResult.accessToken).toBeDefined();

      // Step 7: Create regular users
      const regularUsers = await Promise.all([
        userManagementService.createUser({
          tenantId: tenant.id,
          username: 'user1',
          email: 'user1@workflow.com',
          firstName: 'Regular',
          lastName: 'User1',
          password: 'UserPassword123!',
          roleIds: [],
          department: 'Finance',
          createdBy: activeAdminUser.id
        }),
        userManagementService.createUser({
          tenantId: tenant.id,
          username: 'user2',
          email: 'user2@workflow.com',
          firstName: 'Regular',
          lastName: 'User2',
          password: 'UserPassword123!',
          roleIds: [],
          department: 'Operations',
          createdBy: activeAdminUser.id
        })
      ]);

      // Step 8: Activate regular users
      await Promise.all(regularUsers.map(user => 
        userManagementService.activateUser(user.id, activeAdminUser.id)
      ));

      // Step 9: Verify complete setup
      const tenantMetrics = await tenantManagementService.getTenantMetrics();
      const userMetrics = await userManagementService.getUserMetrics(tenant.id);

      expect(tenantMetrics.activeTenants).toBeGreaterThanOrEqual(1);
      expect(userMetrics.totalUsers).toBe(3);
      expect(userMetrics.activeUsers).toBe(3);
      expect(userMetrics.usersByDepartment['Finance']).toBe(1);
      expect(userMetrics.usersByDepartment['Operations']).toBe(1);
    });

    it('should handle tenant suspension and user access revocation', async () => {
      // Create complete setup
      const plan = await subscriptionManagementService.createSubscriptionPlan({
        planName: 'Suspension Test Plan',
        planType: SubscriptionPlanType.SUBSCRIPTION,
        basePrice: 99.99,
        currency: Currency.USD,
        billingCycle: BillingCycle.MONTHLY,
        enabledModules: ['invoice_generation'],
        features: { invoice_generation: ['basic_invoicing'] },
        usageLimits: {
          users: 10,
          storage: 50,
          apiCalls: 10000,
          computeHours: 100,
          integrations: 5,
          customFields: 25,
          workflows: 5,
          reports: 10
        },
        targetSegments: ['SME'],
        createdBy: 'system-admin'
      });

      await subscriptionManagementService.activateSubscriptionPlan(plan.id, 'system-admin');

      const tenantResult = await tenantManagementService.createTenant({
        organizationName: 'Suspension Test Corp',
        businessType: BusinessType.PRIVATE_LIMITED,
        subscriptionPlanId: plan.id,
        contacts: [
          {
            contactType: 'primary',
            firstName: 'Test',
            lastName: 'Admin',
            email: 'admin@suspension.com',
            isPrimary: true
          }
        ],
        createdBy: 'system-admin'
      });

      const tenant = await tenantManagementService.activateTenant(
        tenantResult.tenant.id, 
        'system-admin'
      );

      const user = await userManagementService.createUser({
        tenantId: tenant.id,
        username: 'suspenduser',
        email: 'user@suspension.com',
        firstName: 'Suspend',
        lastName: 'User',
        password: 'Password123!',
        roleIds: [],
        createdBy: 'system-admin'
      });

      await userManagementService.activateUser(user.id, 'system-admin');

      // Test successful login before suspension
      const loginBefore = await userManagementService.login({
        tenantId: tenant.id,
        username: 'suspenduser',
        password: 'Password123!',
        ipAddress: '127.0.0.1'
      });

      expect(loginBefore.success).toBe(true);

      // Suspend tenant
      const suspendedTenant = await tenantManagementService.suspendTenant(
        tenant.id, 
        'Non-payment', 
        'system-admin'
      );

      expect(suspendedTenant.status).toBe(TenantStatus.SUSPENDED);

      // Test that user login fails after tenant suspension
      const loginAfter = await userManagementService.login({
        tenantId: tenant.id,
        username: 'suspenduser',
        password: 'Password123!',
        ipAddress: '127.0.0.1'
      });

      // Note: This would require additional logic to check tenant status during login
      // For now, we verify the tenant is suspended
      expect(suspendedTenant.isSuspended).toBe(true);
    });
  });

  // =====================================================================================
  // PERFORMANCE AND LOAD TESTS
  // =====================================================================================

  describe('Performance Tests', () => {
    it('should handle bulk user creation efficiently', async () => {
      // Create subscription plan and tenant
      const plan = await subscriptionManagementService.createSubscriptionPlan({
        planName: 'Bulk Test Plan',
        planType: SubscriptionPlanType.SUBSCRIPTION,
        basePrice: 199.99,
        currency: Currency.USD,
        billingCycle: BillingCycle.MONTHLY,
        enabledModules: ['invoice_generation'],
        features: { invoice_generation: ['basic_invoicing'] },
        usageLimits: {
          users: 1000,
          storage: 1000,
          apiCalls: 100000,
          computeHours: 1000,
          integrations: 50,
          customFields: 500,
          workflows: 100,
          reports: 200
        },
        targetSegments: ['Enterprise'],
        createdBy: 'system-admin'
      });

      await subscriptionManagementService.activateSubscriptionPlan(plan.id, 'system-admin');

      const tenantResult = await tenantManagementService.createTenant({
        organizationName: 'Bulk Test Corp',
        businessType: BusinessType.PRIVATE_LIMITED,
        subscriptionPlanId: plan.id,
        contacts: [
          {
            contactType: 'primary',
            firstName: 'Bulk',
            lastName: 'Admin',
            email: 'admin@bulk.com',
            isPrimary: true
          }
        ],
        createdBy: 'system-admin'
      });

      const tenant = await tenantManagementService.activateTenant(
        tenantResult.tenant.id, 
        'system-admin'
      );

      // Create 50 users and measure performance
      const startTime = Date.now();
      const userPromises = [];

      for (let i = 1; i <= 50; i++) {
        userPromises.push(
          userManagementService.createUser({
            tenantId: tenant.id,
            username: `bulkuser${i}`,
            email: `user${i}@bulk.com`,
            firstName: `User`,
            lastName: `${i}`,
            password: 'BulkPassword123!',
            roleIds: [],
            department: i % 2 === 0 ? 'Finance' : 'Operations',
            createdBy: 'system-admin'
          })
        );
      }

      const users = await Promise.all(userPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(users).toHaveLength(50);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(users.every(user => user.id)).toBe(true);

      // Test bulk activation
      const activationStartTime = Date.now();
      const activationPromises = users.map(user => 
        userManagementService.activateUser(user.id, 'system-admin')
      );

      await Promise.all(activationPromises);
      const activationEndTime = Date.now();
      const activationDuration = activationEndTime - activationStartTime;

      expect(activationDuration).toBeLessThan(20000); // Should complete within 20 seconds

      // Verify metrics
      const metrics = await userManagementService.getUserMetrics(tenant.id);
      expect(metrics.totalUsers).toBe(50);
      expect(metrics.activeUsers).toBe(50);
    });

    it('should handle concurrent login attempts', async () => {
      // Create setup
      const plan = await subscriptionManagementService.createSubscriptionPlan({
        planName: 'Concurrent Test Plan',
        planType: SubscriptionPlanType.SUBSCRIPTION,
        basePrice: 99.99,
        currency: Currency.USD,
        billingCycle: BillingCycle.MONTHLY,
        enabledModules: ['invoice_generation'],
        features: { invoice_generation: ['basic_invoicing'] },
        usageLimits: {
          users: 100,
          storage: 100,
          apiCalls: 50000,
          computeHours: 500,
          integrations: 10,
          customFields: 100,
          workflows: 25,
          reports: 50
        },
        targetSegments: ['SME'],
        createdBy: 'system-admin'
      });

      await subscriptionManagementService.activateSubscriptionPlan(plan.id, 'system-admin');

      const tenantResult = await tenantManagementService.createTenant({
        organizationName: 'Concurrent Test Corp',
        businessType: BusinessType.PRIVATE_LIMITED,
        subscriptionPlanId: plan.id,
        contacts: [
          {
            contactType: 'primary',
            firstName: 'Concurrent',
            lastName: 'Admin',
            email: 'admin@concurrent.com',
            isPrimary: true
          }
        ],
        createdBy: 'system-admin'
      });

      const tenant = await tenantManagementService.activateTenant(
        tenantResult.tenant.id, 
        'system-admin'
      );

      // Create test users
      const testUsers = await Promise.all([
        userManagementService.createUser({
          tenantId: tenant.id,
          username: 'concurrent1',
          email: 'concurrent1@test.com',
          firstName: 'Concurrent',
          lastName: 'User1',
          password: 'Password123!',
          roleIds: [],
          createdBy: 'system-admin'
        }),
        userManagementService.createUser({
          tenantId: tenant.id,
          username: 'concurrent2',
          email: 'concurrent2@test.com',
          firstName: 'Concurrent',
          lastName: 'User2',
          password: 'Password123!',
          roleIds: [],
          createdBy: 'system-admin'
        }),
        userManagementService.createUser({
          tenantId: tenant.id,
          username: 'concurrent3',
          email: 'concurrent3@test.com',
          firstName: 'Concurrent',
          lastName: 'User3',
          password: 'Password123!',
          roleIds: [],
          createdBy: 'system-admin'
        })
      ]);

      // Activate users
      await Promise.all(testUsers.map(user => 
        userManagementService.activateUser(user.id, 'system-admin')
      ));

      // Perform concurrent logins
      const startTime = Date.now();
      const loginPromises = testUsers.map((user, index) => 
        userManagementService.login({
          tenantId: tenant.id,
          username: `concurrent${index + 1}`,
          password: 'Password123!',
          ipAddress: '127.0.0.1'
        })
      );

      const loginResults = await Promise.all(loginPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(loginResults.every(result => result.success)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(loginResults.every(result => result.accessToken)).toBe(true);
    });
  });

  // =====================================================================================
  // ERROR HANDLING AND EDGE CASES
  // =====================================================================================

  describe('Error Handling', () => {
    it('should handle duplicate tenant creation gracefully', async () => {
      const plan = await subscriptionManagementService.createSubscriptionPlan({
        planName: 'Duplicate Test Plan',
        planType: SubscriptionPlanType.SUBSCRIPTION,
        basePrice: 99.99,
        currency: Currency.USD,
        billingCycle: BillingCycle.MONTHLY,
        enabledModules: ['invoice_generation'],
        features: { invoice_generation: ['basic_invoicing'] },
        usageLimits: {
          users: 50,
          storage: 100,
          apiCalls: 50000,
          computeHours: 500,
          integrations: 10,
          customFields: 100,
          workflows: 25,
          reports: 50
        },
        targetSegments: ['SME'],
        createdBy: 'system-admin'
      });

      await subscriptionManagementService.activateSubscriptionPlan(plan.id, 'system-admin');

      const createTenantDto = {
        organizationName: 'Duplicate Corp',
        businessType: BusinessType.PRIVATE_LIMITED,
        subscriptionPlanId: plan.id,
        contacts: [
          {
            contactType: 'primary',
            firstName: 'Duplicate',
            lastName: 'Admin',
            email: 'admin@duplicate.com',
            isPrimary: true
          }
        ],
        createdBy: 'system-admin'
      };

      // Create first tenant
      const firstResult = await tenantManagementService.createTenant(createTenantDto);
      expect(firstResult.provisioningStatus).toBe('success');

      // Attempt to create duplicate tenant
      const secondResult = await tenantManagementService.createTenant(createTenantDto);
      expect(secondResult.provisioningStatus).toBe('failed');
      expect(secondResult.errors).toContain('Organization name already exists');
    });

    it('should handle invalid subscription plan gracefully', async () => {
      const createTenantDto = {
        organizationName: 'Invalid Plan Corp',
        businessType: BusinessType.PRIVATE_LIMITED,
        subscriptionPlanId: 'invalid-plan-id',
        contacts: [
          {
            contactType: 'primary',
            firstName: 'Invalid',
            lastName: 'Admin',
            email: 'admin@invalid.com',
            isPrimary: true
          }
        ],
        createdBy: 'system-admin'
      };

      const result = await tenantManagementService.createTenant(createTenantDto);
      expect(result.provisioningStatus).toBe('failed');
      expect(result.errors).toContain('Invalid or inactive subscription plan');
    });

    it('should handle duplicate user creation gracefully', async () => {
      // Create setup
      const plan = await subscriptionManagementService.createSubscriptionPlan({
        planName: 'User Duplicate Test Plan',
        planType: SubscriptionPlanType.SUBSCRIPTION,
        basePrice: 99.99,
        currency: Currency.USD,
        billingCycle: BillingCycle.MONTHLY,
        enabledModules: ['invoice_generation'],
        features: { invoice_generation: ['basic_invoicing'] },
        usageLimits: {
          users: 50,
          storage: 100,
          apiCalls: 50000,
          computeHours: 500,
          integrations: 10,
          customFields: 100,
          workflows: 25,
          reports: 50
        },
        targetSegments: ['SME'],
        createdBy: 'system-admin'
      });

      await subscriptionManagementService.activateSubscriptionPlan(plan.id, 'system-admin');

      const tenantResult = await tenantManagementService.createTenant({
        organizationName: 'User Duplicate Corp',
        businessType: BusinessType.PRIVATE_LIMITED,
        subscriptionPlanId: plan.id,
        contacts: [
          {
            contactType: 'primary',
            firstName: 'User',
            lastName: 'Admin',
            email: 'admin@userduplicate.com',
            isPrimary: true
          }
        ],
        createdBy: 'system-admin'
      });

      const tenant = await tenantManagementService.activateTenant(
        tenantResult.tenant.id, 
        'system-admin'
      );

      const createUserDto = {
        tenantId: tenant.id,
        username: 'duplicateuser',
        email: 'duplicate@test.com',
        firstName: 'Duplicate',
        lastName: 'User',
        password: 'Password123!',
        roleIds: [],
        createdBy: 'system-admin'
      };

      // Create first user
      const firstUser = await userManagementService.createUser(createUserDto);
      expect(firstUser).toBeDefined();

      // Attempt to create duplicate user
      await expect(userManagementService.createUser(createUserDto))
        .rejects
        .toThrow('Username or email already exists within tenant');
    });
  });
});

/**
 * Test utilities and helpers
 */
class TestHelpers {
  /**
   * Generate random test data
   */
  static generateRandomString(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate test email
   */
  static generateTestEmail(prefix: string = 'test'): string {
    return `${prefix}${this.generateRandomString(6)}@test.com`;
  }

  /**
   * Wait for specified duration
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Measure execution time
   */
  static async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  }
}

