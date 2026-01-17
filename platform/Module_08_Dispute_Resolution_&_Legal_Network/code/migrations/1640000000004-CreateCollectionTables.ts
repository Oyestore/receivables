import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateCollectionTables1640000000004 implements MigrationInterface {
    name = 'CreateCollectionTables1640000000004';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create collection_cases table
        await queryRunner.createTable(
            new Table({
                name: 'collection_cases',
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
                        name: 'dispute_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'case_number',
                        type: 'varchar',
                        length: '50',
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: 'customer_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'customer_name',
                        type: 'varchar',
                        length: '200',
                        isNullable: false,
                    },
                    {
                        name: 'invoice_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'outstanding_amount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'original_amount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'recovered_amount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['pending', 'in_progress', 'paused', 'negotiating', 'legal_notice_sent', 'settled', 'paid', 'written_off', 'cancelled'],
                        default: "'pending'",
                        isNullable: false,
                    },
                    {
                        name: 'strategy',
                        type: 'enum',
                        enum: ['friendly_reminder', 'formal_notice', 'legal_action', 'negotiation', 'settlement', 'write_off'],
                        isNullable: false,
                    },
                    {
                        name: 'days_overdue',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'assigned_collector_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'assigned_collector_name',
                        type: 'varchar',
                        length: '200',
                        isNullable: true,
                    },
                    {
                        name: 'legal_provider_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'last_contact_date',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'next_follow_up_date',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'communications',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'payment_plan',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'settlement',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'notes',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'closed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'closed_reason',
                        type: 'varchar',
                        length: '100',
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
                    {
                        name: 'created_by',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                ],
            }),
            true,
        );

        // Create collection_sequences table
        await queryRunner.createTable(
            new Table({
                name: 'collection_sequences',
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
                        name: 'collection_case_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'steps',
                        type: 'jsonb',
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '50',
                        default: 'active',
                        isNullable: false,
                    },
                    {
                        name: 'current_step',
                        type: 'int',
                        default: 0,
                        isNullable: false,
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

        // Create indexes for collection_cases
        await queryRunner.createIndex(
            'collection_cases',
            new Index('idx_collection_cases_status', ['status']),
        );

        await queryRunner.createIndex(
            'collection_cases',
            new Index('idx_collection_cases_tenant_id', ['tenant_id']),
        );

        await queryRunner.createIndex(
            'collection_cases',
            new Index('idx_collection_cases_dispute_id', ['dispute_id']),
        );

        await queryRunner.createIndex(
            'collection_cases',
            new Index('idx_collection_cases_created_at', ['created_at']),
        );

        await queryRunner.createIndex(
            'collection_cases',
            new Index('idx_collection_cases_customer_id', ['customer_id']),
        );

        await queryRunner.createIndex(
            'collection_cases',
            new Index('idx_collection_cases_strategy', ['strategy']),
        );

        // Create indexes for collection_sequences
        await queryRunner.createIndex(
            'collection_sequences',
            new Index('idx_collection_sequences_collection_case_id', ['collection_case_id']),
        );

        await queryRunner.createIndex(
            'collection_sequences',
            new Index('idx_collection_sequences_tenant_id', ['tenant_id']),
        );

        await queryRunner.createIndex(
            'collection_sequences',
            new Index('idx_collection_sequences_status', ['status']),
        );

        // Add foreign key constraints
        await queryRunner.createForeignKey(
            'collection_cases',
            new ForeignKey({
                columnNames: ['dispute_id'],
                referencedTableName: 'dispute_cases',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            }),
        );

        await queryRunner.createForeignKey(
            'collection_sequences',
            new ForeignKey({
                columnNames: ['collection_case_id'],
                referencedTableName: 'collection_cases',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('collection_sequences');
        await queryRunner.dropTable('collection_cases');
    }
}
