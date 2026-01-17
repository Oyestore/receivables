import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateMSMECasesTable1732400000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'msme_cases',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'dispute_case_id',
                        type: 'uuid',
                    },
                    {
                        name: 'msme_case_number',
                        type: 'varchar',
                        isUnique: true,
                        isNullable: true,
                    },
                    {
                        name: 'msme_application_id',
                        type: 'varchar',
                        isUnique: true,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['draft', 'submitted', 'under_review', 'hearing_scheduled', 'conciliation_in_progress', 'award_passed', 'closed', 'rejected'],
                        default: "'draft'",
                    },
                    {
                        name: 'supplier_name',
                        type: 'varchar',
                    },
                    {
                        name: 'supplier_udyam_number',
                        type: 'varchar',
                    },
                    {
                        name: 'supplier_email',
                        type: 'varchar',
                    },
                    {
                        name: 'supplier_phone',
                        type: 'varchar',
                    },
                    {
                        name: 'supplier_address',
                        type: 'text',
                    },
                    {
                        name: 'buyer_name',
                        type: 'varchar',
                    },
                    {
                        name: 'buyer_pan',
                        type: 'varchar',
                    },
                    {
                        name: 'buyer_email',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'buyer_phone',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'buyer_address',
                        type: 'text',
                    },
                    {
                        name: 'amount_claimed',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                    },
                    {
                        name: 'dispute_description',
                        type: 'text',
                    },
                    {
                        name: 'invoice_numbers',
                        type: 'text',
                        isArray: true,
                    },
                    {
                        name: 'documents_uploaded',
                        type: 'jsonb',
                        default: "'[]'",
                    },
                    {
                        name: 'portal_reference_id',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'conciliator_assigned',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'hearing_date',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'award_details',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'timeline',
                        type: 'jsonb',
                        default: "'[]'",
                    },
                    {
                        name: 'last_sync_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'sync_errors',
                        type: 'text',
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
                        onUpdate: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Add foreign key
        await queryRunner.createForeignKey(
            'msme_cases',
            new TableForeignKey({
                columnNames: ['dispute_case_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'dispute_cases',
                onDelete: 'CASCADE',
            }),
        );

        // Create indexes
        await queryRunner.query(`CREATE INDEX idx_msme_cases_status ON msme_cases(status)`);
        await queryRunner.query(`CREATE INDEX idx_msme_cases_dispute_case_id ON msme_cases(dispute_case_id)`);
        await queryRunner.query(`CREATE INDEX idx_msme_cases_created_at ON msme_cases(created_at)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('msme_cases');
    }
}
