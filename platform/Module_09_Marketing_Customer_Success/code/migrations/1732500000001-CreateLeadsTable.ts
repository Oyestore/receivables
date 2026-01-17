import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateLeadsTable1732500000001 implements MigrationInterface {
    name = 'CreateLeadsTable1732500000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'leads',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'first_name',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'last_name',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'email',
                        type: 'varchar',
                        length: '255',
                        isNullable: false,
                    },
                    {
                        name: 'phone',
                        type: 'varchar',
                        length: '20',
                        isNullable: true,
                    },
                    {
                        name: 'company_name',
                        type: 'varchar',
                        length: '200',
                        isNullable: true,
                    },
                    {
                        name: 'source',
                        type: 'enum',
                        enum: ['WEBSITE', 'REFERRAL', 'PARTNER', 'CAMPAIGN', 'OTHER'],
                        default: 'WEBSITE',
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'],
                        default: 'NEW',
                        isNullable: false,
                    },
                    {
                        name: 'score',
                        type: 'float',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'assigned_to',
                        type: 'uuid',
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
            'leads',
            new Index('idx_leads_email', ['email']),
        );

        await queryRunner.createIndex(
            'leads',
            new Index('idx_leads_status', ['status']),
        );

        await queryRunner.createIndex(
            'leads',
            new Index('idx_leads_source', ['source']),
        );

        await queryRunner.createIndex(
            'leads',
            new Index('idx_leads_score', ['score']),
        );

        await queryRunner.createIndex(
            'leads',
            new Index('idx_leads_created_at', ['created_at']),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('leads');
    }
}
