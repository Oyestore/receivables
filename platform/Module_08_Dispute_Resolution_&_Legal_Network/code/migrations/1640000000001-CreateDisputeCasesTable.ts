import { MigrationInterface, QueryRunner, Table, Index, ForeignKey, Unique } from 'typeorm';

export class CreateDisputeCasesTable1640000000001 implements MigrationInterface {
    name = 'CreateDisputeCasesTable1640000000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'dispute_cases',
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
                        name: 'case_number',
                        type: 'varchar',
                        length: '50',
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: 'invoice_id',
                        type: 'uuid',
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
                        name: 'type',
                        type: 'enum',
                        enum: ['non_payment', 'partial_payment', 'delayed_payment', 'quality_dispute', 'quantity_dispute', 'contract_breach', 'other'],
                        default: "'non_payment'",
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['draft', 'filed', 'under_review', 'mediation', 'arbitration', 'legal_notice_sent', 'court_proceedings', 'resolved', 'closed'],
                        default: "'draft'",
                        isNullable: false,
                    },
                    {
                        name: 'priority',
                        type: 'enum',
                        enum: ['low', 'medium', 'high', 'urgent'],
                        default: "'medium'",
                        isNullable: false,
                    },
                    {
                        name: 'disputed_amount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: false,
                    },
                    {
                        name: 'evidence',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'assigned_legal_provider_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'timeline',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'resolution',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'notes',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'filed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'resolved_at',
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

        // Create indexes
        await queryRunner.createIndex(
            'dispute_cases',
            new Index('idx_dispute_cases_status', ['status']),
        );

        await queryRunner.createIndex(
            'dispute_cases',
            new Index('idx_dispute_cases_priority', ['priority']),
        );

        await queryRunner.createIndex(
            'dispute_cases',
            new Index('idx_dispute_cases_tenant_id', ['tenant_id']),
        );

        await queryRunner.createIndex(
            'dispute_cases',
            new Index('idx_dispute_cases_created_at', ['created_at']),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('dispute_cases');
    }
}
