import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateFinancingTables1732085500000 implements MigrationInterface {
    name = 'CreateFinancingTables1732085500000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create financing_offers table
        await queryRunner.createTable(
            new Table({
                name: 'financing_offers',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        default: 'gen_random_uuid()',
                    },
                    {
                        name: 'tenant_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'invoice_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'partner_id',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'partner_name',
                        type: 'varchar',
                        length: '200',
                        isNullable: false,
                    },
                    {
                        name: 'offer_amount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'fee_percentage',
                        type: 'decimal',
                        precision: 5,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'fee_amount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'net_amount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'disbursement_time_hours',
                        type: 'int',
                        isNullable: false,
                    },
                    {
                        name: 'approval_status',
                        type: 'varchar',
                        length: '20',
                        isNullable: false,
                        default: "'pending'",
                    },
                    {
                        name: 'offer_valid_until',
                        type: 'timestamp',
                        isNullable: false,
                    },
                    {
                        name: 'credit_score',
                        type: 'int',
                        isNullable: true,
                    },
                    {
                        name: 'terms_conditions',
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
            true
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
                        default: 'gen_random_uuid()',
                    },
                    {
                        name: 'tenant_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'invoice_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'offer_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'partner_id',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'application_status',
                        type: 'varchar',
                        length: '20',
                        isNullable: false,
                        default: "'submitted'",
                    },
                    {
                        name: 'disbursed_amount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: 'disbursement_reference',
                        type: 'varchar',
                        length: '200',
                        isNullable: true,
                    },
                    {
                        name: 'submitted_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'approved_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'disbursed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'rejected_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'rejection_reason',
                        type: 'text',
                        isNullable: true,
                    },
                ],
            }),
            true
        );

        // Create indexes
        await queryRunner.createIndex(
            'financing_offers',
            new TableIndex({
                name: 'idx_offers_tenant_invoice',
                columnNames: ['tenant_id', 'invoice_id'],
            })
        );

        await queryRunner.createIndex(
            'financing_applications',
            new TableIndex({
                name: 'idx_applications_tenant',
                columnNames: ['tenant_id'],
            })
        );

        await queryRunner.createIndex(
            'financing_applications',
            new TableIndex({
                name: 'idx_applications_status',
                columnNames: ['application_status'],
            })
        );

        // Add check constraints
        await queryRunner.query(`
            ALTER TABLE financing_offers
            ADD CONSTRAINT chk_offer_approval_status
            CHECK (approval_status IN ('pending', 'pre_approved', 'expired'))
        `);

        await queryRunner.query(`
            ALTER TABLE financing_applications
            ADD CONSTRAINT chk_application_status
            CHECK (application_status IN ('submitted', 'under_review', 'approved', 'disbursed', 'rejected', 'cancelled'))
        `);

        console.log('✅ Created financing_offers and financing_applications tables');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS financing_applications CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS financing_offers CASCADE`);
        console.log('✅ Dropped financing tables');
    }
}
