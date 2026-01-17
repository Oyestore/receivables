import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateDocumentGenerationTables1732395000000 implements MigrationInterface {
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
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'template_code',
                        type: 'varchar',
                        length: '50',
                        isUnique: true,
                    },
                    {
                        name: 'template_name',
                        type: 'varchar',
                        length: '200',
                    },
                    {
                        name: 'template_type',
                        type: 'varchar',
                        length: '50',
                    },
                    {
                        name: 'language',
                        type: 'varchar',
                        length: '10',
                        default: "'en'",
                    },
                    {
                        name: 'content',
                        type: 'text',
                    },
                    {
                        name: 'variables',
                        type: 'jsonb',
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
                    },
                    {
                        name: 'created_by',
                        type: 'uuid',
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
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'dispute_case_id',
                        type: 'uuid',
                    },
                    {
                        name: 'template_id',
                        type: 'uuid',
                    },
                    {
                        name: 'document_type',
                        type: 'varchar',
                        length: '50',
                    },
                    {
                        name: 'language',
                        type: 'varchar',
                        length: '10',
                    },
                    {
                        name: 'file_path',
                        type: 'varchar',
                        length: '500',
                    },
                    {
                        name: 'file_size',
                        type: 'int',
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '20',
                        default: "'draft'",
                    },
                    {
                        name: 'variables',
                        type: 'jsonb',
                    },
                    {
                        name: 'generated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
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
                    },
                ],
            }),
            true,
        );

        // Create indexes
        await queryRunner.createIndex(
            'document_templates',
            new TableIndex({
                name: 'IDX_document_templates_code',
                columnNames: ['template_code'],
            }),
        );

        await queryRunner.createIndex(
            'document_templates',
            new TableIndex({
                name: 'IDX_document_templates_type',
                columnNames: ['template_type'],
            }),
        );

        await queryRunner.createIndex(
            'document_templates',
            new TableIndex({
                name: 'IDX_document_templates_language',
                columnNames: ['language'],
            }),
        );

        await queryRunner.createIndex(
            'generated_documents',
            new TableIndex({
                name: 'IDX_generated_documents_case',
                columnNames: ['dispute_case_id'],
            }),
        );

        await queryRunner.createIndex(
            'generated_documents',
            new TableIndex({
                name: 'IDX_generated_documents_status',
                columnNames: ['status'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('generated_documents', 'IDX_generated_documents_status');
        await queryRunner.dropIndex('generated_documents', 'IDX_generated_documents_case');
        await queryRunner.dropIndex('document_templates', 'IDX_document_templates_language');
        await queryRunner.dropIndex('document_templates', 'IDX_document_templates_type');
        await queryRunner.dropIndex('document_templates', 'IDX_document_templates_code');

        await queryRunner.dropTable('generated_documents');
        await queryRunner.dropTable('document_templates');
    }
}
