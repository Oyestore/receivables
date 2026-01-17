import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateWorkflowTables1640000000002 implements MigrationInterface {
    name = 'CreateWorkflowTables1640000000002';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create workflow_states table
        await queryRunner.createTable(
            new Table({
                name: 'workflow_states',
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
                        isNullable: false,
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'state_type',
                        type: 'enum',
                        enum: ['initial', 'in_progress', 'waiting', 'completed', 'failed', 'cancelled'],
                        default: "'in_progress'",
                        isNullable: false,
                    },
                    {
                        name: 'config',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'entered_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'exited_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'entered_by',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'exited_by',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'is_current',
                        type: 'boolean',
                        default: false,
                        isNullable: false,
                    },
                    {
                        name: 'sequence',
                        type: 'int',
                        default: 0,
                        isNullable: false,
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

        // Create workflow_transitions table
        await queryRunner.createTable(
            new Table({
                name: 'workflow_transitions',
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
                        name: 'from_state_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'to_state_id',
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
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'type',
                        type: 'enum',
                        enum: ['automatic', 'manual', 'conditional', 'scheduled'],
                        default: "'manual'",
                        isNullable: false,
                    },
                    {
                        name: 'conditions',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'actions',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'priority',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'is_enabled',
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

        // Create indexes for workflow_states
        await queryRunner.createIndex(
            'workflow_states',
            new Index('idx_workflow_states_dispute_id', ['dispute_id']),
        );

        await queryRunner.createIndex(
            'workflow_states',
            new Index('idx_workflow_states_state_type', ['state_type']),
        );

        await queryRunner.createIndex(
            'workflow_states',
            new Index('idx_workflow_states_tenant_id', ['tenant_id']),
        );

        await queryRunner.createIndex(
            'workflow_states',
            new Index('idx_workflow_states_is_current', ['is_current']),
        );

        // Create indexes for workflow_transitions
        await queryRunner.createIndex(
            'workflow_transitions',
            new Index('idx_workflow_transitions_from_state_id', ['from_state_id']),
        );

        await queryRunner.createIndex(
            'workflow_transitions',
            new Index('idx_workflow_transitions_to_state_id', ['to_state_id']),
        );

        await queryRunner.createIndex(
            'workflow_transitions',
            new Index('idx_workflow_transitions_tenant_id', ['tenant_id']),
        );

        // Add foreign key constraints
        await queryRunner.createForeignKey(
            'workflow_states',
            new ForeignKey({
                columnNames: ['dispute_id'],
                referencedTableName: 'dispute_cases',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'workflow_transitions',
            new ForeignKey({
                columnNames: ['from_state_id'],
                referencedTableName: 'workflow_states',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'workflow_transitions',
            new ForeignKey({
                columnNames: ['to_state_id'],
                referencedTableName: 'workflow_states',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('workflow_transitions');
        await queryRunner.dropTable('workflow_states');
    }
}
