import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateDisputeResolutionTables1732393000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create dispute_cases table
        await queryRunner.createTable(
            new Table({
                name: 'dispute_cases',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        default: 'uuid_generate_v4()'
                    },
                    {
                        name: 'tenant_id',
                        type: 'uuid',
                        isNullable: false
                    },
                    {
                        name: 'case_number',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                        isUnique: true
                    },
                    {
                        name: 'invoice_id',
                        type: 'uuid',
                        isNullable: false
                    },
                    {
                        name: 'customer_id',
                        type: 'uuid',
                        isNullable: false
                    },
                    {
                        name: 'customer_name',
                        type: 'varchar',
                        length: '200',
                        isNullable: false
                    },
                    {
                        name: 'type',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                        default: "'non_payment'"
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                        default: "'draft'"
                    },
                    {
                        name: 'priority',
                        type: 'varchar',
                        length: '20',
                        isNullable: false,
                        default: "'medium'"
                    },
                    {
                        name: 'disputed_amount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        isNullable: false
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: false
                    },
                    {
                        name: 'evidence',
                        type: 'jsonb',
                        isNullable: true
                    },
                    {
                        name: 'assigned_legal_provider_id',
                        type: 'uuid',
                        isNullable: true
                    },
                    {
                        name: 'timeline',
                        type: 'jsonb',
                        isNullable: true
                    },
                    {
                        name: 'resolution',
                        type: 'jsonb',
                        isNullable: true
                    },
                    {
                        name: 'notes',
                        type: 'text',
                        isNullable: true
                    },
                    {
                        name: 'filed_at',
                        type: 'timestamp',
                        isNullable: true
                    },
                    {
                        name: 'resolved_at',
                        type: 'timestamp',
                        isNullable: true
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP'
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP'
                    },
                    {
                        name: 'created_by',
                        type: 'varchar',
                        length: '100',
                        isNullable: false
                    }
                ]
            }),
            true
        );

        // Create indexes for dispute_cases
        await queryRunner.createIndex(
            'dispute_cases',
            new TableIndex({
                name: 'IDX_dispute_cases_status',
                columnNames: ['status']
            })
        );

        await queryRunner.createIndex(
            'dispute_cases',
            new TableIndex({
                name: 'IDX_dispute_cases_priority',
                columnNames: ['priority']
            })
        );

        await queryRunner.createIndex(
            'dispute_cases',
            new TableIndex({
                name: 'IDX_dispute_cases_tenant_id',
                columnNames: ['tenant_id']
            })
        );

        // Create legal_provider_profiles table
        await queryRunner.createTable(
            new Table({
                name: 'legal_provider_profiles',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        default: 'uuid_generate_v4()'
                    },
                    {
                        name: 'firm_name',
                        type: 'varchar',
                        length: '200',
                        isNullable: false
                    },
                    {
                        name: 'provider_type',
                        type: 'varchar',
                        length: '50',
                        isNullable: false
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                        default: "'pending_verification'"
                    },
                    {
                        name: 'specializations',
                        type: 'text',
                        isNullable: false
                    },
                    {
                        name: 'bar_council_number',
                        type: 'varchar',
                        length: '100',
                        isNullable: false
                    },
                    {
                        name: 'years_of_experience',
                        type: 'int',
                        isNullable: false
                    },
                    {
                        name: 'contact_info',
                        type: 'jsonb',
                        isNullable: false
                    },
                    {
                        name: 'pricing',
                        type: 'jsonb',
                        isNullable: true
                    },
                    {
                        name: 'rating',
                        type: 'decimal',
                        precision: 3,
                        scale: 2,
                        default: 0
                    },
                    {
                        name: 'total_cases_handled',
                        type: 'int',
                        default: 0
                    },
                    {
                        name: 'successful_resolutions',
                        type: 'int',
                        default: 0
                    },
                    {
                        name: 'average_resolution_days',
                        type: 'decimal',
                        precision: 5,
                        scale: 2,
                        default: 0
                    },
                    {
                        name: 'languages',
                        type: 'jsonb',
                        isNullable: true
                    },
                    {
                        name: 'certifications',
                        type: 'jsonb',
                        isNullable: true
                    },
                    {
                        name: 'bio',
                        type: 'text',
                        isNullable: true
                    },
                    {
                        name: 'accepts_new_cases',
                        type: 'boolean',
                        default: true
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP'
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP'
                    }
                ]
            }),
            true
        );

        // Create indexes for legal_provider_profiles
        await queryRunner.createIndex(
            'legal_provider_profiles',
            new TableIndex({
                name: 'IDX_legal_provider_profiles_status',
                columnNames: ['status']
            })
        );

        await queryRunner.createIndex(
            'legal_provider_profiles',
            new TableIndex({
                name: 'IDX_legal_provider_profiles_provider_type',
                columnNames: ['provider_type']
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.dropIndex('legal_provider_profiles', 'IDX_legal_provider_profiles_provider_type');
        await queryRunner.dropIndex('legal_provider_profiles', 'IDX_legal_provider_profiles_status');
        await queryRunner.dropIndex('dispute_cases', 'IDX_dispute_cases_tenant_id');
        await queryRunner.dropIndex('dispute_cases', 'IDX_dispute_cases_priority');
        await queryRunner.dropIndex('dispute_cases', 'IDX_dispute_cases_status');

        // Drop tables
        await queryRunner.dropTable('legal_provider_profiles');
        await queryRunner.dropTable('dispute_cases');
    }
}
