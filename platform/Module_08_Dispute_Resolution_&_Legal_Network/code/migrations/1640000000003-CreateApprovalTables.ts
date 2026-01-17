import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateApprovalTables1640000000003 implements MigrationInterface {
    name = 'CreateApprovalTables1640000000003';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create approval_workflows table
        await queryRunner.createTable(
            new Table({
                name: 'approval_workflows',
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
                        name: 'level',
                        type: 'enum',
                        enum: ['l1_manager', 'l2_director', 'l3_legal', 'l4_cfo', 'l5_ceo'],
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['pending', 'approved', 'rejected', 'delegated', 'expired'],
                        default: "'pending'",
                        isNullable: false,
                    },
                    {
                        name: 'approver_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'approver_name',
                        type: 'varchar',
                        length: '200',
                        isNullable: false,
                    },
                    {
                        name: 'approver_email',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'delegated_to_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'delegated_to_name',
                        type: 'varchar',
                        length: '200',
                        isNullable: true,
                    },
                    {
                        name: 'requested_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'responded_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'expires_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'comments',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'metadata',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'sequence',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'is_parallel',
                        type: 'boolean',
                        default: false,
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

        // Create approval_history table
        await queryRunner.createTable(
            new Table({
                name: 'approval_history',
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
                        name: 'workflow_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'performed_by_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'performed_by_name',
                        type: 'varchar',
                        length: '200',
                        isNullable: false,
                    },
                    {
                        name: 'decision',
                        type: 'enum',
                        enum: ['approve', 'reject', 'request_info', 'delegate'],
                        isNullable: false,
                    },
                    {
                        name: 'comments',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'performed_at',
                        type: 'timestamp',
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
                ],
            }),
            true,
        );

        // Create indexes for approval_workflows
        await queryRunner.createIndex(
            'approval_workflows',
            new Index('idx_approval_workflows_dispute_id', ['dispute_id']),
        );

        await queryRunner.createIndex(
            'approval_workflows',
            new Index('idx_approval_workflows_status', ['status']),
        );

        await queryRunner.createIndex(
            'approval_workflows',
            new Index('idx_approval_workflows_tenant_id', ['tenant_id']),
        );

        await queryRunner.createIndex(
            'approval_workflows',
            new Index('idx_approval_workflows_created_at', ['created_at']),
        );

        await queryRunner.createIndex(
            'approval_workflows',
            new Index('idx_approval_workflows_approver_id', ['approver_id']),
        );

        // Create indexes for approval_history
        await queryRunner.createIndex(
            'approval_history',
            new Index('idx_approval_history_workflow_id', ['workflow_id']),
        );

        await queryRunner.createIndex(
            'approval_history',
            new Index('idx_approval_history_tenant_id', ['tenant_id']),
        );

        await queryRunner.createIndex(
            'approval_history',
            new Index('idx_approval_history_performed_at', ['performed_at']),
        );

        await queryRunner.createIndex(
            'approval_history',
            new Index('idx_approval_history_performed_by_id', ['performed_by_id']),
        );

        // Add foreign key constraints
        await queryRunner.createForeignKey(
            'approval_workflows',
            new ForeignKey({
                columnNames: ['dispute_id'],
                referencedTableName: 'dispute_cases',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'approval_history',
            new ForeignKey({
                columnNames: ['workflow_id'],
                referencedTableName: 'approval_workflows',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('approval_history');
        await queryRunner.dropTable('approval_workflows');
    }
}
