import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateSubscriptionAndAccessControlTables1705200100000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // ===== Subscription Management =====

        // Subscription Plans
        await queryRunner.createTable(
            new Table({
                name: 'subscription_plans',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'plan_name', type: 'varchar', length: '255', isUnique: true, isNullable: false },
                    { name: 'plan_type', type: 'varchar', length: '50', isNullable: false },
                    { name: 'status', type: 'varchar', length: '50', default: "'active'" },
                    { name: 'base_price', type: 'decimal', precision: 10, scale: 2, isNullable: true },
                    { name: 'currency', type: 'varchar', length: '3', default: "'USD'" },
                    { name: 'billing_cycle', type: 'varchar', length: '50', isNullable: true },
                    { name: 'features', type: 'jsonb', isNullable: true },
                    { name: 'module_access', type: 'jsonb', isNullable: true },
                    { name: 'usage_limits', type: 'jsonb', isNullable: true },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                    { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'subscription_plans',
            new TableIndex({ name: 'IDX_PLAN_NAME', columnNames: ['plan_name'], isUnique: true })
        );

        await queryRunner.createIndex(
            'subscription_plans',
            new TableIndex({ name: 'IDX_PLAN_TYPE', columnNames: ['plan_type'] })
        );

        await queryRunner.createIndex(
            'subscription_plans',
            new TableIndex({ name: 'IDX_PLAN_STATUS', columnNames: ['status'] })
        );

        // Tenant Subscriptions
        await queryRunner.createTable(
            new Table({
                name: 'tenant_subscriptions',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'tenant_id', type: 'uuid', isNullable: false },
                    { name: 'plan_id', type: 'uuid', isNullable: false },
                    { name: 'status', type: 'varchar', length: '50', default: "'active'" },
                    { name: 'start_date', type: 'timestamp', isNullable: false },
                    { name: 'end_date', type: 'timestamp', isNullable: true },
                    { name: 'auto_renew', type: 'boolean', default: true },
                    { name: 'billing_contact', type: 'jsonb', isNullable: true },
                    { name: 'trial_end_date', type: 'timestamp', isNullable: true },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                    { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'tenant_subscriptions',
            new TableIndex({ name: 'IDX_SUBSCRIPTION_TENANT', columnNames: ['tenant_id'] })
        );

        await queryRunner.createIndex(
            'tenant_subscriptions',
            new TableIndex({ name: 'IDX_SUBSCRIPTION_PLAN', columnNames: ['plan_id'] })
        );

        await queryRunner.createIndex(
            'tenant_subscriptions',
            new TableIndex({ name: 'IDX_SUBSCRIPTION_STATUS', columnNames: ['status'] })
        );

        await queryRunner.createForeignKey(
            'tenant_subscriptions',
            new TableForeignKey({
                columnNames: ['tenant_id'],
                referencedTableName: 'tenants',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        await queryRunner.createForeignKey(
            'tenant_subscriptions',
            new TableForeignKey({
                columnNames: ['plan_id'],
                referencedTableName: 'subscription_plans',
                referencedColumnNames: ['id'],
                onDelete: 'RESTRICT',
            })
        );

        // Subscription Changes
        await queryRunner.createTable(
            new Table({
                name: 'subscription_changes',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'tenant_id', type: 'uuid', isNullable: false },
                    { name: 'from_plan_id', type: 'uuid', isNullable: true },
                    { name: 'to_plan_id', type: 'uuid', isNullable: false },
                    { name: 'change_type', type: 'varchar', length: '50', isNullable: false },
                    { name: 'effective_date', type: 'timestamp', isNullable: false },
                    { name: 'prorated_amount', type: 'decimal', precision: 10, scale: 2, isNullable: true },
                    { name: 'reason', type: 'text', isNullable: true },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'subscription_changes',
            new TableIndex({ name: 'IDX_SUBSCRIPTION_CHANGE_TENANT', columnNames: ['tenant_id', 'created_at'] })
        );

        await queryRunner.createForeignKey(
            'subscription_changes',
            new TableForeignKey({
                columnNames: ['tenant_id'],
                referencedTableName: 'tenants',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        // ===== Feature Flags & Module Access =====

        // Feature Flags
        await queryRunner.createTable(
            new Table({
                name: 'feature_flags',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'flag_key', type: 'varchar', length: '100', isUnique: true, isNullable: false },
                    { name: 'flag_name', type: 'varchar', length: '255', isNullable: false },
                    { name: 'description', type: 'text', isNullable: true },
                    { name: 'module_name', type: 'varchar', length: '100', isNullable: true },
                    { name: 'is_enabled', type: 'boolean', default: false },
                    { name: 'rollout_percentage', type: 'int', default: 0 },
                    { name: 'tenant_overrides', type: 'jsonb', isNullable: true },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                    { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'feature_flags',
            new TableIndex({ name: 'IDX_FLAG_KEY', columnNames: ['flag_key'], isUnique: true })
        );

        await queryRunner.createIndex(
            'feature_flags',
            new TableIndex({ name: 'IDX_FLAG_MODULE', columnNames: ['module_name'] })
        );

        // Module Access
        await queryRunner.createTable(
            new Table({
                name: 'module_access',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'tenant_id', type: 'uuid', isNullable: false },
                    { name: 'module_name', type: 'varchar', length: '100', isNullable: false },
                    { name: 'access_level', type: 'varchar', length: '50', isNullable: false },
                    { name: 'features_enabled', type: 'text', isArray: true, isNullable: true },
                    { name: 'usage_quota', type: 'jsonb', isNullable: true },
                    { name: 'is_active', type: 'boolean', default: true },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                    { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'module_access',
            new TableIndex({ name: 'IDX_MODULE_ACCESS_TENANT_MODULE', columnNames: ['tenant_id', 'module_name'], isUnique: true })
        );

        await queryRunner.createForeignKey(
            'module_access',
            new TableForeignKey({
                columnNames: ['tenant_id'],
                referencedTableName: 'tenants',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        // ===== Usage Tracking =====

        // Usage Events
        await queryRunner.createTable(
            new Table({
                name: 'usage_events',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'tenant_id', type: 'uuid', isNullable: false },
                    { name: 'user_id', type: 'uuid', isNullable: true },
                    { name: 'module_name', type: 'varchar', length: '100', isNullable: false },
                    { name: 'event_type', type: 'varchar', length: '100', isNullable: false },
                    { name: 'quantity', type: 'int', default: 1 },
                    { name: 'metadata', type: 'jsonb', isNullable: true },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'usage_events',
            new TableIndex({ name: 'IDX_USAGE_TENANT_CREATED', columnNames: ['tenant_id', 'created_at'] })
        );

        await queryRunner.createIndex(
            'usage_events',
            new TableIndex({ name: 'IDX_USAGE_MODULE', columnNames: ['module_name'] })
        );

        await queryRunner.createIndex(
            'usage_events',
            new TableIndex({ name: 'IDX_USAGE_EVENT_TYPE', columnNames: ['event_type'] })
        );

        // Usage Quotas
        await queryRunner.createTable(
            new Table({
                name: 'usage_quotas',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'tenant_id', type: 'uuid', isNullable: false },
                    { name: 'module_name', type: 'varchar', length: '100', isNullable: false },
                    { name: 'quota_type', type: 'varchar', length: '50', isNullable: false },
                    { name: 'quota_limit', type: 'int', isNullable: false },
                    { name: 'quota_used', type: 'int', default: 0 },
                    { name: 'reset_period', type: 'varchar', length: '50', isNullable: false },
                    { name: 'last_reset', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                    { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'usage_quotas',
            new TableIndex({ name: 'IDX_QUOTA_TENANT_MODULE_TYPE', columnNames: ['tenant_id', 'module_name', 'quota_type'], isUnique: true })
        );

        await queryRunner.createForeignKey(
            'usage_quotas',
            new TableForeignKey({
                columnNames: ['tenant_id'],
                referencedTableName: 'tenants',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        // ===== Provisioning =====

        // Provisioning Jobs
        await queryRunner.createTable(
            new Table({
                name: 'provisioning_jobs',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'tenant_id', type: 'uuid', isNullable: false },
                    { name: 'status', type: 'varchar', length: '50', default: "'pending'" },
                    { name: 'progress', type: 'int', default: 0 },
                    { name: 'current_step', type: 'varchar', length: '100', isNullable: true },
                    { name: 'steps_completed', type: 'text', isArray: true, default: "'{}'" },
                    { name: 'error_message', type: 'text', isNullable: true },
                    { name: 'started_at', type: 'timestamp', isNullable: true },
                    { name: 'completed_at', type: 'timestamp', isNullable: true },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'provisioning_jobs',
            new TableIndex({ name: 'IDX_PROVISIONING_TENANT', columnNames: ['tenant_id'] })
        );

        await queryRunner.createIndex(
            'provisioning_jobs',
            new TableIndex({ name: 'IDX_PROVISIONING_STATUS', columnNames: ['status'] })
        );

        await queryRunner.createForeignKey(
            'provisioning_jobs',
            new TableForeignKey({
                columnNames: ['tenant_id'],
                referencedTableName: 'tenants',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        // ===== Billing =====

        // Invoices
        await queryRunner.createTable(
            new Table({
                name: 'invoices',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'invoice_number', type: 'varchar', length: '50', isUnique: true, isNullable: false },
                    { name: 'tenant_id', type: 'uuid', isNullable: false },
                    { name: 'subscription_id', type: 'uuid', isNullable: true },
                    { name: 'status', type: 'varchar', length: '50', default: "'draft'" },
                    { name: 'subtotal', type: 'decimal', precision: 10, scale: 2, isNullable: false },
                    { name: 'tax_amount', type: 'decimal', precision: 10, scale: 2, default: 0 },
                    { name: 'total_amount', type: 'decimal', precision: 10, scale: 2, isNullable: false },
                    { name: 'currency', type: 'varchar', length: '3', default: "'USD'" },
                    { name: 'due_date', type: 'date', isNullable: false },
                    { name: 'paid_at', type: 'timestamp', isNullable: true },
                    { name: 'line_items', type: 'jsonb', isNullable: true },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                    { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'invoices',
            new TableIndex({ name: 'IDX_INVOICE_NUMBER', columnNames: ['invoice_number'], isUnique: true })
        );

        await queryRunner.createIndex(
            'invoices',
            new TableIndex({ name: 'IDX_INVOICE_TENANT', columnNames: ['tenant_id', 'created_at'] })
        );

        await queryRunner.createIndex(
            'invoices',
            new TableIndex({ name: 'IDX_INVOICE_STATUS', columnNames: ['status'] })
        );

        await queryRunner.createForeignKey(
            'invoices',
            new TableForeignKey({
                columnNames: ['tenant_id'],
                referencedTableName: 'tenants',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        await queryRunner.createForeignKey(
            'invoices',
            new TableForeignKey({
                columnNames: ['subscription_id'],
                referencedTableName: 'tenant_subscriptions',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            })
        );

        // Payments
        await queryRunner.createTable(
            new Table({
                name: 'payments',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'invoice_id', type: 'uuid', isNullable: false },
                    { name: 'tenant_id', type: 'uuid', isNullable: false },
                    { name: 'amount', type: 'decimal', precision: 10, scale: 2, isNullable: false },
                    { name: 'currency', type: 'varchar', length: '3', default: "'USD'" },
                    { name: 'payment_method', type: 'varchar', length: '50', isNullable: false },
                    { name: 'payment_status', type: 'varchar', length: '50', isNullable: false },
                    { name: 'transaction_id', type: 'varchar', length: '255', isNullable: true },
                    { name: 'processor_response', type: 'jsonb', isNullable: true },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'payments',
            new TableIndex({ name: 'IDX_PAYMENT_INVOICE', columnNames: ['invoice_id'] })
        );

        await queryRunner.createIndex(
            'payments',
            new TableIndex({ name: 'IDX_PAYMENT_TENANT', columnNames: ['tenant_id', 'created_at'] })
        );

        await queryRunner.createIndex(
            'payments',
            new TableIndex({ name: 'IDX_PAYMENT_TRANSACTION', columnNames: ['transaction_id'] })
        );

        await queryRunner.createForeignKey(
            'payments',
            new TableForeignKey({
                columnNames: ['invoice_id'],
                referencedTableName: 'invoices',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        await queryRunner.createForeignKey(
            'payments',
            new TableForeignKey({
                columnNames: ['tenant_id'],
                referencedTableName: 'tenants',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('payments');
        await queryRunner.dropTable('invoices');
        await queryRunner.dropTable('provisioning_jobs');
        await queryRunner.dropTable('usage_quotas');
        await queryRunner.dropTable('usage_events');
        await queryRunner.dropTable('module_access');
        await queryRunner.dropTable('feature_flags');
        await queryRunner.dropTable('subscription_changes');
        await queryRunner.dropTable('tenant_subscriptions');
        await queryRunner.dropTable('subscription_plans');
    }
}
