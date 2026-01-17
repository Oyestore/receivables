import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateFinancingPartnerTables1732480000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create financing_partners table
        await queryRunner.createTable(
            new Table({
                name: 'financing_partners',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'partner_type',
                        type: 'enum',
                        enum: ['capital_float', 'lendingkart', 'indifi', 'flexiloans', 'custom'],
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        isUnique: true,
                    },
                    {
                        name: 'display_name',
                        type: 'varchar',
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'logo_url',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['active', 'inactive', 'suspended'],
                        default: "'active'",
                    },
                    {
                        name: 'api_base_url',
                        type: 'varchar',
                    },
                    {
                        name: 'api_key',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'api_secret',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'webhook_url',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'webhook_secret',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'min_invoice_amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                    },
                    {
                        name: 'max_invoice_amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                    },
                    {
                        name: 'min_discount_rate',
                        type: 'decimal',
                        precision: 5,
                        scale: 2,
                    },
                    {
                        name: 'max_discount_rate',
                        type: 'decimal',
                        precision: 5,
                        scale: 2,
                    },
                    {
                        name: 'processing_fee_percentage',
                        type: 'decimal',
                        precision: 5,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'typical_turnaround_days',
                        type: 'int',
                    },
                    {
                        name: 'total_applications',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'approved_applications',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'total_funded_amount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'avg_approval_time_hours',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: 'metadata',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Create financing_applications table
        await queryRunner.createTable(
            new Table({
                name: 'financing_applications',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'tenant_id',
                        type: 'uuid',
                    },
                    {
                        name: 'user_id',
                        type: 'uuid',
                    },
                    {
                        name: 'partner_id',
                        type: 'uuid',
                    },
                    {
                        name: 'application_number',
                        type: 'varchar',
                        isUnique: true,
                    },
                    {
                        name: 'financing_type',
                        type: 'enum',
                        enum: ['invoice_discounting', 'invoice_factoring', 'supply_chain', 'working_capital'],
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['draft', 'submitted', 'under_review', 'documents_requested', 'approved', 'rejected', 'disbursed', 'cancelled'],
                        default: "'draft'",
                    },
                    {
                        name: 'invoice_ids',
                        type: 'jsonb',
                    },
                    {
                        name: 'total_invoice_amount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                    },
                    {
                        name: 'requested_amount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                    },
                    {
                        name: 'approved_amount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: 'discount_rate',
                        type: 'decimal',
                        precision: 5,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: 'processing_fee',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: 'net_amount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: 'repayment_tenure_days',
                        type: 'int',
                        isNullable: true,
                    },
                    {
                        name: 'business_name',
                        type: 'varchar',
                    },
                    {
                        name: 'business_pan',
                        type: 'varchar',
                    },
                    {
                        name: 'business_gstin',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'annual_revenue',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: 'years_in_business',
                        type: 'int',
                        isNullable: true,
                    },
                    {
                        name: 'documents',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'partner_application_id',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'partner_response',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'submitted_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'approved_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'rejected_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'disbursed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'rejection_reason',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'metadata',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Create partner_webhooks table
        await queryRunner.createTable(
            new Table({
                name: 'partner_webhooks',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'partner_id',
                        type: 'uuid',
                    },
                    {
                        name: 'application_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'event_type',
                        type: 'varchar',
                    },
                    {
                        name: 'payload',
                        type: 'jsonb',
                    },
                    {
                        name: 'processed',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'processed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'error_message',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Create indexes
        await queryRunner.createIndex(
            'financing_partners',
            new TableIndex({
                name: 'idx_partners_status',
                columnNames: ['status'],
            }),
        );

        await queryRunner.createIndex(
            'financing_applications',
            new TableIndex({
                name: 'idx_applications_user',
                columnNames: ['user_id'],
            }),
        );

        await queryRunner.createIndex(
            'financing_applications',
            new TableIndex({
                name: 'idx_applications_partner',
                columnNames: ['partner_id'],
            }),
        );

        await queryRunner.createIndex(
            'financing_applications',
            new TableIndex({
                name: 'idx_applications_status',
                columnNames: ['status'],
            }),
        );

        await queryRunner.createIndex(
            'financing_applications',
            new TableIndex({
                name: 'idx_applications_number',
                columnNames: ['application_number'],
            }),
        );

        await queryRunner.createIndex(
            'partner_webhooks',
            new TableIndex({
                name: 'idx_webhooks_partner',
                columnNames: ['partner_id'],
            }),
        );

        await queryRunner.createIndex(
            'partner_webhooks',
            new TableIndex({
                name: 'idx_webhooks_processed',
                columnNames: ['processed'],
            }),
        );

        // Create foreign keys
        await queryRunner.createForeignKey(
            'financing_applications',
            new TableForeignKey({
                columnNames: ['partner_id'],
                referencedTableName: 'financing_partners',
                referencedColumnNames: ['id'],
                onDelete: 'RESTRICT',
            }),
        );

        await queryRunner.createForeignKey(
            'partner_webhooks',
            new TableForeignKey({
                columnNames: ['partner_id'],
                referencedTableName: 'financing_partners',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('partner_webhooks');
        await queryRunner.dropTable('financing_applications');
        await queryRunner.dropTable('financing_partners');
    }
}
