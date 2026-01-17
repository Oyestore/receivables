import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateDocumentTables1640000000006 implements MigrationInterface {
    name = 'CreateDocumentTables1640000000006';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create document_templates table
        await queryRunner.createTable(
            new Table({
                name: 'document_templates',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'template_code',
                        type: 'varchar',
                        length: '50',
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: 'template_name',
                        type: 'varchar',
                        length: '200',
                        isNullable: false,
                    },
                    {
                        name: 'template_type',
                        type: 'enum',
                        enum: ['legal_notice', 'demand_letter', 'settlement_proposal', 'case_filed_notice', 'resolution_certificate'],
                        isNullable: false,
                    },
                    {
                        name: 'language',
                        type: 'enum',
                        enum: ['en', 'hi'],
                        default: "'en'",
                        isNullable: false,
                    },
                    {
                        name: 'content',
                        type: 'text',
                        isNullable: false,
                    },
                    {
                        name: 'variables',
                        type: 'jsonb',
                        isNullable: false,
                    },
                    {
                        name: 'metadata',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'is_active',
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
                    {
                        name: 'created_by',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'updated_by',
                        type: 'uuid',
                        isNullable: true,
                    },
                ],
            }),
            true,
        );

        // Create generated_documents table
        await queryRunner.createTable(
            new Table({
                name: 'generated_documents',
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
                        name: 'template_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'document_type',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                    },
                    {
                        name: 'language',
                        type: 'varchar',
                        length: '10',
                        isNullable: false,
                    },
                    {
                        name: 'file_path',
                        type: 'varchar',
                        length: '500',
                        isNullable: false,
                    },
                    {
                        name: 'file_size',
                        type: 'int',
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['draft', 'generated', 'signed', 'sent', 'delivered'],
                        default: "'draft'",
                        isNullable: false,
                    },
                    {
                        name: 'variables',
                        type: 'jsonb',
                        isNullable: false,
                    },
                    {
                        name: 'generated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                    {
                        name: 'signed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'signature_data',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'generated_by',
                        type: 'uuid',
                        isNullable: false,
                    },
                ],
            }),
            true,
        );

        // Create indexes for document_templates
        await queryRunner.createIndex(
            'document_templates',
            new Index('idx_document_templates_template_code', ['template_code']),
        );

        await queryRunner.createIndex(
            'document_templates',
            new Index('idx_document_templates_template_type', ['template_type']),
        );

        await queryRunner.createIndex(
            'document_templates',
            new Index('idx_document_templates_language', ['language']),
        );

        await queryRunner.createIndex(
            'document_templates',
            new Index('idx_document_templates_is_active', ['is_active']),
        );

        // Create indexes for generated_documents
        await queryRunner.createIndex(
            'generated_documents',
            new Index('idx_generated_documents_dispute_case_id', ['dispute_case_id']),
        );

        await queryRunner.createIndex(
            'generated_documents',
            new Index('idx_generated_documents_template_id', ['template_id']),
        );

        await queryRunner.createIndex(
            'generated_documents',
            new Index('idx_generated_documents_status', ['status']),
        );

        await queryRunner.createIndex(
            'generated_documents',
            new Index('idx_generated_documents_generated_at', ['generated_at']),
        );

        // Add foreign key constraints
        await queryRunner.createForeignKey(
            'generated_documents',
            new ForeignKey({
                columnNames: ['dispute_case_id'],
                referencedTableName: 'dispute_cases',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'generated_documents',
            new ForeignKey({
                columnNames: ['template_id'],
                referencedTableName: 'document_templates',
                referencedColumnNames: ['id'],
                onDelete: 'RESTRICT',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('generated_documents');
        await queryRunner.dropTable('document_templates');
    }
}
