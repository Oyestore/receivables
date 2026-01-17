import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateLegalProviderTables1640000000005 implements MigrationInterface {
    name = 'CreateLegalProviderTables1640000000005';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create legal_provider_profiles table
        await queryRunner.createTable(
            new Table({
                name: 'legal_provider_profiles',
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
                        isNullable: false,
                    },
                    {
                        name: 'firm_name',
                        type: 'varchar',
                        length: '200',
                        isNullable: false,
                    },
                    {
                        name: 'provider_type',
                        type: 'enum',
                        enum: ['law_firm', 'individual_lawyer', 'legal_consultant', 'arbitrator', 'mediator'],
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['active', 'inactive', 'suspended', 'pending_verification'],
                        default: "'pending_verification'",
                        isNullable: false,
                    },
                    {
                        name: 'specializations',
                        type: 'simple-array',
                        isNullable: false,
                    },
                    {
                        name: 'bar_council_number',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'years_of_experience',
                        type: 'int',
                        isNullable: false,
                    },
                    {
                        name: 'contact_info',
                        type: 'jsonb',
                        isNullable: false,
                    },
                    {
                        name: 'pricing',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'rating',
                        type: 'decimal',
                        precision: 3,
                        scale: 2,
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'total_cases_handled',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'successful_resolutions',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'active_cases',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'average_resolution_days',
                        type: 'decimal',
                        precision: 5,
                        scale: 2,
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'languages',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'certifications',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'bio',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'accepts_new_cases',
                        type: 'boolean',
                        default: true,
                        isNullable: false,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                ],
            }),
            true,
        );

        // Create indexes
        await queryRunner.createIndex(
            'legal_provider_profiles',
            new Index('idx_legal_provider_profiles_status', ['status']),
        );

        await queryRunner.createIndex(
            'legal_provider_profiles',
            new Index('idx_legal_provider_profiles_provider_type', ['provider_type']),
        );

        await queryRunner.createIndex(
            'legal_provider_profiles',
            new Index('idx_legal_provider_profiles_tenant_id', ['tenant_id']),
        );

        await queryRunner.createIndex(
            'legal_provider_profiles',
            new Index('idx_legal_provider_profiles_rating', ['rating']),
        );

        await queryRunner.createIndex(
            'legal_provider_profiles',
            new Index('idx_legal_provider_profiles_specializations', ['specializations']),
        );

        await queryRunner.createIndex(
            'legal_provider_profiles',
            new Index('idx_legal_provider_profiles_accepts_new_cases', ['accepts_new_cases']),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('legal_provider_profiles');
    }
}
