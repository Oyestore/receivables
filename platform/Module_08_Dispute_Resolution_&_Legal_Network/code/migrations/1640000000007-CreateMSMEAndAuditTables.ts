import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateMSMEAndAuditTables1640000000007 implements MigrationInterface {
    name = 'CreateMSMEAndAuditTables1640000000007';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create msme_cases table
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
                        isNullable: false,
                    },
                    {
                        name: 'msme_case_number',
                        type: 'varchar',
                        length: '50',
                        isUnique: true,
                        isNullable: true,
                    },
                    {
                        name: 'msme_application_id',
                        type: 'varchar',
                        length: '50',
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['draft', 'submitted', 'under_review', 'hearing_scheduled', 'conciliation_in_progress', 'award_passed', 'closed', 'rejected'],
                        default: "'draft'",
                        isNullable: false,
                    },
                    {
                        name: 'supplier_name',
                        type: 'varchar',
                        length: '200',
                        isNullable: false,
                    },
                    {
                        name: 'supplier_udyam_number',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                    },
                    {
                        name: 'supplier_email',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'supplier_phone',
                        type: 'varchar',
                        length: '20',
                        isNullable: false,
                    },
                    {
                        name: 'supplier_address',
                        type: 'text',
                        isNullable: false,
                    },
                    {
                        name: 'buyer_name',
                        type: 'varchar',
                        length: '200',
                        isNullable: false,
                    },
                    {
                        name: 'buyer_pan',
                        type: 'varchar',
                        length: '10',
                        isNullable: false,
                    },
                    {
                        name: 'buyer_email',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'buyer_phone',
                        type: 'varchar',
                        length: '20',
                        isNullable: true,
                    },
                    {
                        name: 'buyer_address',
                        type: 'text',
                        isNullable: false,
                    },
                    {
                        name: 'amount_claimed',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'dispute_description',
                        type: 'text',
                        isNullable: false,
                    },
                    {
                        name: 'invoice_numbers',
                        type: 'text',
                        array: true,
                        default: '{}',
                        isNullable: false,
                    },
                    {
                        name: 'documents_uploaded',
                        type: 'jsonb',
                        default: '[]',
                        isNullable: false,
                    },
                    {
                        name: 'portal_reference_id',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'conciliator_assigned',
                        type: 'varchar',
                        length: '200',
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
                        default: '[]',
                        isNullable: false,
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

        // Create dispute_audit_logs table
        await queryRunner.createTable(
            new Table({
                name: 'dispute_audit_logs',
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
                        name: 'entity_type',
                        type: 'enum',
                        enum: ['dispute_case', 'collection_case', 'workflow', 'approval', 'document', 'legal_provider'],
                        isNullable: false,
                    },
                    {
                        name: 'entity_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'action',
                        type: 'enum',
                        enum: ['create', 'update', 'delete', 'status_change', 'assign', 'unassign', 'approve', 'reject', 'comment', 'document_upload', 'document_delete', 'workflow_transition', 'resolution_added'],
                        isNullable: false,
                    },
                    {
                        name: 'performed_by_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'performed_by_name',
                        type: 'varchar',
                        length: '200',
                        isNullable: true,
                    },
                    {
                        name: 'performed_by_role',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'performed_at',
                        type: 'timestamp',
                        isNullable: false,
                    },
                    {
                        name: 'changes',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'metadata',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'from_status',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'to_status',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                    {
                        name: 'expires_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'is_archived',
                        type: 'boolean',
                        default: false,
                        isNullable: false,
                    },
                    {
                        name: 'is_sensitive',
                        type: 'boolean',
                        default: false,
                        isNullable: false,
                    },
                ],
            }),
            true,
        );

        // Create indexes for msme_cases
        await queryRunner.createIndex(
            'msme_cases',
            new Index('idx_msme_cases_dispute_case_id', ['dispute_case_id']),
        );

        await queryRunner.createIndex(
            'msme_cases',
            new Index('idx_msme_cases_msme_application_id', ['msme_application_id']),
        );

        await queryRunner.createIndex(
            'msme_cases',
            new Index('idx_msme_cases_status', ['status']),
        );

        await queryRunner.createIndex(
            'msme_cases',
            new Index('idx_msme_cases_supplier_udyam_number', ['supplier_udyam_number']),
        );

        await queryRunner.createIndex(
            'msme_cases',
            new Index('idx_msme_cases_buyer_pan', ['buyer_pan']),
        );

        // Create indexes for dispute_audit_logs
        await queryRunner.createIndex(
            'dispute_audit_logs',
            new Index('idx_dispute_audit_logs_tenant_entity', ['tenant_id', 'entity_id']),
        );

        await queryRunner.createIndex(
            'dispute_audit_logs',
            new Index('idx_dispute_audit_logs_tenant_action', ['tenant_id', 'action']),
        );

        await queryRunner.createIndex(
            'dispute_audit_logs',
            new Index('idx_dispute_audit_logs_performed_at', ['performed_at']),
        );

        await queryRunner.createIndex(
            'dispute_audit_logs',
            new Index('idx_dispute_audit_logs_performed_by_id', ['performed_by_id']),
        );

        await queryRunner.createIndex(
            'dispute_audit_logs',
            new Index('idx_dispute_audit_logs_expires_at', ['expires_at']),
        );

        await queryRunner.createIndex(
            'dispute_audit_logs',
            new Index('idx_dispute_audit_logs_is_archived', ['is_archived']),
        );

        // Add foreign key constraints
        await queryRunner.createForeignKey(
            'msme_cases',
            new ForeignKey({
                columnNames: ['dispute_case_id'],
                referencedTableName: 'dispute_cases',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('dispute_audit_logs');
        await queryRunner.dropTable('msme_cases');
    }
}
