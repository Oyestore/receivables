import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';

import { TenantEntity } from '../Module_12_Administration/src/entities/tenant.entity';
import { TenantContactEntity } from '../Module_12_Administration/src/entities/tenant-contact.entity';
import { TenantConfigurationEntity } from '../Module_12_Administration/src/entities/tenant-configuration.entity';
import { UserEntity } from '../Module_12_Administration/src/entities/user.entity';
import { RoleEntity } from '../Module_12_Administration/src/entities/role.entity';
import { UserRoleEntity } from '../Module_12_Administration/src/entities/user-role.entity';
import { PermissionEntity } from '../Module_12_Administration/src/entities/permission.entity';
import { UserSessionEntity } from '../Module_12_Administration/src/entities/user-session.entity';
import { SubscriptionPlanEntity } from '../Module_12_Administration/src/entities/subscription-plan.entity';
import { AuditLogEntity } from '../Module_12_Administration/src/entities/audit-log.entity';
import { PlanFeatureEntity } from '../Module_12_Administration/src/entities/plan-feature.entity';
import { UsageRateEntity } from '../Module_12_Administration/src/entities/usage-rate.entity';
import { UserPreferenceEntity } from '../Module_12_Administration/src/entities/user-preference.entity';

async function verify() {
    console.log('Testing DataSource Initialization...');
    // Explicitly load Admin entities to bypass Glob issues, plus keep original Globs
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
            // UserSessionEntity,
            // UserPreferenceEntity,
            // ...(dataSourceOptions.entities as string[])
        ]
    };
    const ds = new DataSource(options);
    try {
        await ds.initialize();
        console.log('✅ DataSource initialized successfully.');
        console.log('Entities loaded:', ds.entityMetadatas.map(e => e.name).join(', '));
        console.log('Attempting programmatic synchronization...');
        await ds.synchronize();
        console.log('✅ Synchronized successfully!');
        await ds.destroy();
    } catch (error) {
        console.error('❌ Failed to initialize DataSource:', error);
        process.exit(1);
    }
}

verify();
