import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateCustomerHealthTable1732500000004 implements MigrationInterface {
    name = 'CreateCustomerHealthTable1732500000004';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'customer_health',
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
                        name: 'customer_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'health_score',
                        type: 'int',
                        default: 50,
                        isNullable: false,
                    },
                    {
                        name: 'risk_level',
                        type: 'enum',
                        enum: ['low', 'medium', 'high', 'critical'],
                        default: 'medium',
                        isNullable: false,
                    },
                    {
                        name: 'last_activity_date',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'subscription_status',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'mrr',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'total_invoices',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'paid_invoices',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'overdue_invoices',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'support_tickets',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'nps_score',
                        type: 'int',
                        isNullable: true,
                    },
                    {
                        name: 'feature_adoption_rate',
                        type: 'decimal',
                        precision: 5,
                        scale: 2,
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'health_factors',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'recommendations',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'last_calculated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
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
            'customer_health',
            new Index('idx_customer_health_tenant_id', ['tenant_id']),
        );

        await queryRunner.createIndex(
            'customer_health',
            new Index('idx_customer_health_customer_id', ['customer_id']),
        );

        await queryRunner.createIndex(
            'customer_health',
            new Index('idx_customer_health_health_score', ['health_score']),
        );

        await queryRunner.createIndex(
            'customer_health',
            new Index('idx_customer_health_risk_level', ['risk_level']),
        );

        await queryRunner.createIndex(
            'customer_health',
            new Index('idx_customer_health_last_activity_date', ['last_activity_date']),
        );

        await queryRunner.createIndex(
            'customer_health',
            new Index('idx_customer_health_last_calculated_at', ['last_calculated_at']),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('customer_health');
    }
}
