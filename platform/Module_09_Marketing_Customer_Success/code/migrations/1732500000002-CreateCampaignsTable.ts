import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateCampaignsTable1732500000002 implements MigrationInterface {
    name = 'CreateCampaignsTable1732500000002';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'campaigns',
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
                        name: 'created_by',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '200',
                        isNullable: false,
                    },
                    {
                        name: 'type',
                        type: 'enum',
                        enum: ['email', 'sms', 'whatsapp', 'multi_channel'],
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'],
                        default: 'draft',
                        isNullable: false,
                    },
                    {
                        name: 'target_audience',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'content',
                        type: 'jsonb',
                        isNullable: false,
                    },
                    {
                        name: 'scheduled_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'started_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'completed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'total_sent',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'total_opened',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'total_clicked',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'total_converted',
                        type: 'int',
                        default: 0,
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
            'campaigns',
            new Index('idx_campaigns_tenant_id', ['tenant_id']),
        );

        await queryRunner.createIndex(
            'campaigns',
            new Index('idx_campaigns_status', ['status']),
        );

        await queryRunner.createIndex(
            'campaigns',
            new Index('idx_campaigns_type', ['type']),
        );

        await queryRunner.createIndex(
            'campaigns',
            new Index('idx_campaigns_created_by', ['created_by']),
        );

        await queryRunner.createIndex(
            'campaigns',
            new Index('idx_campaigns_created_at', ['created_at']),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('campaigns');
    }
}
