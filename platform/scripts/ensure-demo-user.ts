
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { TenantEntity } from '../Module_12_Administration/src/entities/tenant.entity';
import { UserEntity } from '../Module_12_Administration/src/entities/user.entity';
import { UserStatus } from '../Module_12_Administration/src/enums/administrative.enum';
import { RoleEntity } from '../Module_12_Administration/src/entities/role.entity';
import { UserRoleEntity } from '../Module_12_Administration/src/entities/user-role.entity';
import { TenantContactEntity } from '../Module_12_Administration/src/entities/tenant-contact.entity';
import { TenantConfigurationEntity } from '../Module_12_Administration/src/entities/tenant-configuration.entity';
import { UserSessionEntity } from '../Module_12_Administration/src/entities/user-session.entity';
import { UserPreferenceEntity } from '../Module_12_Administration/src/entities/user-preference.entity';
import { PermissionEntity } from '../Module_12_Administration/src/entities/permission.entity';
import { SubscriptionPlanEntity } from '../Module_12_Administration/src/entities/subscription-plan.entity';
import { AuditLogEntity } from '../Module_12_Administration/src/entities/audit-log.entity';
import { PlanFeatureEntity } from '../Module_12_Administration/src/entities/plan-feature.entity';
import { UsageRateEntity } from '../Module_12_Administration/src/entities/usage-rate.entity';

async function ensureDemoUser() {
    console.log('Initializing DataSource...');
    const options = {
        ...dataSourceOptions,
        entities: [
            TenantEntity,
            TenantContactEntity,
            TenantConfigurationEntity,
            UserEntity,
            RoleEntity,
            UserRoleEntity,
            PermissionEntity,
            SubscriptionPlanEntity,
            AuditLogEntity,
            PlanFeatureEntity,
            UsageRateEntity,
            UserSessionEntity,
            UserPreferenceEntity,
        ]
    };
    const ds = new DataSource(options);

    try {
        await ds.initialize();
        console.log('✅ DataSource initialized.');

        const tenantRepo = ds.getRepository(TenantEntity);
        const userRepo = ds.getRepository(UserEntity);
        const roleRepo = ds.getRepository(RoleEntity);
        const userRoleRepo = ds.getRepository(UserRoleEntity);

        // 1. Check/Create Tenant
        let tenant = await tenantRepo.findOne({ where: { organizationName: 'Demo Company' } });
        if (!tenant) {
            console.log('Creating Demo Tenant...');
            tenant = tenantRepo.create({
                organizationName: 'Demo Company',
                businessType: 'private_limited' as any,
                status: 'active' as any,
                subscriptionPlanId: uuidv4(), // Mock Plan ID
                complianceStatus: 'compliant' as any,
                dataResidency: 'india' as any,
                resourceLimits: {
                    maxUsers: 10,
                    maxStorage: 1024,
                    maxApiCalls: 1000,
                    maxComputeHours: 100,
                    maxIntegrations: 5,
                    maxCustomFields: 10,
                    maxWorkflows: 5,
                    maxReports: 10
                },
                metadata: {
                    modules: ['invoicing', 'payments', 'analytics']
                },
                createdBy: uuidv4() // Mock System ID
            });
            await tenantRepo.save(tenant);
            console.log('✅ Created Tenant:', tenant.id);
        } else {
            console.log('ℹ️ Found Tenant:', tenant.id);
        }

        // 2. Check/Create Role
        let role = await roleRepo.findOne({ where: { roleName: 'Admin', tenantId: tenant.id } });
        if (!role) {
            console.log('Creating Admin Role...');
            role = roleRepo.create({
                tenantId: tenant.id,
                roleName: 'Admin',
                roleDescription: 'Administrator',
                roleType: 'system' as any, // Valid RoleType
                isSystemRole: true,
                isActive: true,
                permissions: [], // Full access implied for now
                createdBy: uuidv4() // Use valid UUID
            });
            await roleRepo.save(role);
            console.log('✅ Created Role:', role.id);
        } else {
            console.log('ℹ️ Found Role:', role.id);
        }

        // 3. Check/Create User
        const email = 'demo@platform.com';
        let user = await userRepo.findOne({ where: { email } });

        const password = 'Password123!';
        const hashedPassword = await bcrypt.hash(password, 10);

        if (!user) {
            console.log(`Creating User ${email}...`);
            user = userRepo.create({
                tenantId: tenant.id,
                email: email,
                username: 'demo_user',
                firstName: 'Demo',
                lastName: 'User',
                passwordHash: hashedPassword,
                status: UserStatus.ACTIVE,
                mfaEnabled: false,
                createdBy: uuidv4(), // Use valid UUID
                preferences: { default: true } as any
            });
            await userRepo.save(user);
            console.log('✅ Created User:', user.id);

            // Assign Role
            const userRole = userRoleRepo.create({
                userId: user.id,
                roleId: role.id,
                tenantId: tenant.id,
                assignedBy: uuidv4() // Use valid UUID
            });
            await userRoleRepo.save(userRole);
            console.log('✅ Assigned Admin Role to User');

        } else {
            console.log(`ℹ️ Found User ${email}:`, user.id);
            // Reset password to be sure
            user.passwordHash = hashedPassword;
            user.status = UserStatus.ACTIVE;
            await userRepo.save(user);
            console.log('✅ Reset User Password and Status');
        }

        console.log('DONE. Demo User is Ready.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await ds.destroy();
    }
}

ensureDemoUser();
