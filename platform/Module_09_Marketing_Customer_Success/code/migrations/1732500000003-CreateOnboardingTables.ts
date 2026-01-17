import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateOnboardingTables1732500000003 implements MigrationInterface {
    name = 'CreateOnboardingTables1732500000003';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create onboarding_workflows table
        await queryRunner.createTable(
            new Table({
                name: 'onboarding_workflows',
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
                        name: 'workflow_type',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'],
                        default: 'pending',
                        isNullable: false,
                    },
                    {
                        name: 'current_step',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'total_steps',
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

        // Create onboarding_steps table
        await queryRunner.createTable(
            new Table({
                name: 'onboarding_steps',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'workflow_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'step_name',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'step_type',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'],
                        default: 'pending',
                        isNullable: false,
                    },
                    {
                        name: 'sequence_order',
                        type: 'int',
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
                        name: 'data',
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

        // Create indexes for onboarding_workflows
        await queryRunner.createIndex(
            'onboarding_workflows',
            new Index('idx_onboarding_workflows_tenant_id', ['tenant_id']),
        );

        await queryRunner.createIndex(
            'onboarding_workflows',
            new Index('idx_onboarding_workflows_customer_id', ['customer_id']),
        );

        await queryRunner.createIndex(
            'onboarding_workflows',
            new Index('idx_onboarding_workflows_status', ['status']),
        );

        await queryRunner.createIndex(
            'onboarding_workflows',
            new Index('idx_onboarding_workflows_created_at', ['created_at']),
        );

        // Create indexes for onboarding_steps
        await queryRunner.createIndex(
            'onboarding_steps',
            new Index('idx_onboarding_steps_workflow_id', ['workflow_id']),
        );

        await queryRunner.createIndex(
            'onboarding_steps',
            new Index('idx_onboarding_steps_status', ['status']),
        );

        await queryRunner.createIndex(
            'onboarding_steps',
            new Index('idx_onboarding_steps_sequence_order', ['sequence_order']),
        );

        // Add foreign key constraint
        await queryRunner.createForeignKey(
            'onboarding_steps',
            new ForeignKey({
                columnNames: ['workflow_id'],
                referencedTableName: 'onboarding_workflows',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('onboarding_steps');
        await queryRunner.dropTable('onboarding_workflows');
    }
}
