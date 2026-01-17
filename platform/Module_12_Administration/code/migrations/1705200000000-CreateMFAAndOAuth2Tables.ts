import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateMFAAndOAuth2Tables1705200000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // ===== MFA Tables =====

        // User MFA Settings
        await queryRunner.createTable(
            new Table({
                name: 'user_mfa_settings',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'user_id', type: 'uuid', isNullable: false },
                    { name: 'mfa_enabled', type: 'boolean', default: false },
                    { name: 'mfa_secret', type: 'varchar', length: '255', isNullable: true },
                    { name: 'backup_codes', type: 'text', isArray: true, isNullable: true },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                    { name: 'verified_at', type: 'timestamp', isNullable: true },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'user_mfa_settings',
            new TableIndex({ name: 'IDX_USER_MFA_USER', columnNames: ['user_id'], isUnique: true })
        );

        await queryRunner.createForeignKey(
            'user_mfa_settings',
            new TableForeignKey({
                columnNames: ['user_id'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        // MFA Backup Codes
        await queryRunner.createTable(
            new Table({
                name: 'mfa_backup_codes',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'user_id', type: 'uuid', isNullable: false },
                    { name: 'code_hash', type: 'varchar', length: '255', isNullable: false },
                    { name: 'used_at', type: 'timestamp', isNullable: true },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'mfa_backup_codes',
            new TableIndex({ name: 'IDX_MFA_BACKUP_USER', columnNames: ['user_id'] })
        );

        await queryRunner.createForeignKey(
            'mfa_backup_codes',
            new TableForeignKey({
                columnNames: ['user_id'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        // ===== OAuth2 Tables =====

        // OAuth Clients
        await queryRunner.createTable(
            new Table({
                name: 'oauth_clients',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'client_id', type: 'varchar', length: '255', isUnique: true, isNullable: false },
                    { name: 'client_secret', type: 'varchar', length: '255', isNullable: false },
                    { name: 'client_name', type: 'varchar', length: '255', isNullable: true },
                    { name: 'redirect_uris', type: 'text', isArray: true, isNullable: true },
                    { name: 'grants', type: 'varchar', length: '50', isArray: true, isNullable: true },
                    { name: 'tenant_id', type: 'uuid', isNullable: true },
                    { name: 'is_trusted', type: 'boolean', default: false },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'oauth_clients',
            new TableIndex({ name: 'IDX_OAUTH_CLIENT_ID', columnNames: ['client_id'], isUnique: true })
        );

        await queryRunner.createIndex(
            'oauth_clients',
            new TableIndex({ name: 'IDX_OAUTH_CLIENT_TENANT', columnNames: ['tenant_id'] })
        );

        await queryRunner.createForeignKey(
            'oauth_clients',
            new TableForeignKey({
                columnNames: ['tenant_id'],
                referencedTableName: 'tenants',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        // OAuth Tokens
        await queryRunner.createTable(
            new Table({
                name: 'oauth_tokens',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'access_token', type: 'varchar', length: '500', isUnique: true, isNullable: false },
                    { name: 'refresh_token', type: 'varchar', length: '500', isUnique: true, isNullable: true },
                    { name: 'client_id', type: 'uuid', isNullable: false },
                    { name: 'user_id', type: 'uuid', isNullable: true },
                    { name: 'expires_at', type: 'timestamp', isNullable: false },
                    { name: 'refresh_expires_at', type: 'timestamp', isNullable: true },
                    { name: 'scope', type: 'text', isArray: true, isNullable: true },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'oauth_tokens',
            new TableIndex({ name: 'IDX_OAUTH_TOKEN_ACCESS', columnNames: ['access_token'], isUnique: true })
        );

        await queryRunner.createIndex(
            'oauth_tokens',
            new TableIndex({ name: 'IDX_OAUTH_TOKEN_REFRESH', columnNames: ['refresh_token'], isUnique: true })
        );

        await queryRunner.createIndex(
            'oauth_tokens',
            new TableIndex({ name: 'IDX_OAUTH_TOKEN_USER', columnNames: ['user_id'] })
        );

        await queryRunner.createForeignKey(
            'oauth_tokens',
            new TableForeignKey({
                columnNames: ['client_id'],
                referencedTableName: 'oauth_clients',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        await queryRunner.createForeignKey(
            'oauth_tokens',
            new TableForeignKey({
                columnNames: ['user_id'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        // OAuth Authorization Codes
        await queryRunner.createTable(
            new Table({
                name: 'oauth_authorization_codes',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'code', type: 'varchar', length: '255', isUnique: true, isNullable: false },
                    { name: 'client_id', type: 'uuid', isNullable: false },
                    { name: 'user_id', type: 'uuid', isNullable: false },
                    { name: 'redirect_uri', type: 'text', isNullable: true },
                    { name: 'expires_at', type: 'timestamp', isNullable: false },
                    { name: 'scope', type: 'text', isArray: true, isNullable: true },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'oauth_authorization_codes',
            new TableIndex({ name: 'IDX_OAUTH_CODE', columnNames: ['code'], isUnique: true })
        );

        await queryRunner.createForeignKey(
            'oauth_authorization_codes',
            new TableForeignKey({
                columnNames: ['client_id'],
                referencedTableName: 'oauth_clients',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        await queryRunner.createForeignKey(
            'oauth_authorization_codes',
            new TableForeignKey({
                columnNames: ['user_id'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        // ===== SAML Providers =====
        await queryRunner.createTable(
            new Table({
                name: 'saml_providers',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'tenant_id', type: 'uuid', isNullable: false },
                    { name: 'provider_name', type: 'varchar', length: '255', isNullable: false },
                    { name: 'entity_id', type: 'varchar', length: '500', isNullable: false },
                    { name: 'sso_login_url', type: 'text', isNullable: false },
                    { name: 'sso_logout_url', type: 'text', isNullable: true },
                    { name: 'certificate', type: 'text', isNullable: false },
                    { name: 'metadata_xml', type: 'text', isNullable: true },
                    { name: 'is_active', type: 'boolean', default: true },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                    { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'saml_providers',
            new TableIndex({ name: 'IDX_SAML_TENANT', columnNames: ['tenant_id'] })
        );

        await queryRunner.createForeignKey(
            'saml_providers',
            new TableForeignKey({
                columnNames: ['tenant_id'],
                referencedTableName: 'tenants',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        // ===== Enhanced Audit Logs =====
        await queryRunner.createTable(
            new Table({
                name: 'audit_logs',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'tenant_id', type: 'uuid', isNullable: true },
                    { name: 'user_id', type: 'uuid', isNullable: true },
                    { name: 'action', type: 'varchar', length: '100', isNullable: false },
                    { name: 'resource_type', type: 'varchar', length: '100', isNullable: true },
                    { name: 'resource_id', type: 'varchar', length: '255', isNullable: true },
                    { name: 'changes', type: 'jsonb', isNullable: true },
                    { name: 'ip_address', type: 'inet', isNullable: true },
                    { name: 'user_agent', type: 'text', isNullable: true },
                    { name: 'status', type: 'varchar', length: '50', isNullable: true },
                    { name: 'error_message', type: 'text', isNullable: true },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'audit_logs',
            new TableIndex({ name: 'IDX_AUDIT_TENANT_CREATED', columnNames: ['tenant_id', 'created_at'] })
        );

        await queryRunner.createIndex(
            'audit_logs',
            new TableIndex({ name: 'IDX_AUDIT_USER_CREATED', columnNames: ['user_id', 'created_at'] })
        );

        await queryRunner.createIndex(
            'audit_logs',
            new TableIndex({ name: 'IDX_AUDIT_ACTION', columnNames: ['action'] })
        );

        await queryRunner.createIndex(
            'audit_logs',
            new TableIndex({ name: 'IDX_AUDIT_RESOURCE', columnNames: ['resource_type', 'resource_id'] })
        );

        // Security Events
        await queryRunner.createTable(
            new Table({
                name: 'security_events',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'tenant_id', type: 'uuid', isNullable: true },
                    { name: 'user_id', type: 'uuid', isNullable: true },
                    { name: 'event_type', type: 'varchar', length: '100', isNullable: false },
                    { name: 'severity', type: 'varchar', length: '50', isNullable: false },
                    { name: 'description', type: 'text', isNullable: true },
                    { name: 'metadata', type: 'jsonb', isNullable: true },
                    { name: 'resolved_at', type: 'timestamp', isNullable: true },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'security_events',
            new TableIndex({ name: 'IDX_SECURITY_EVENT_TENANT', columnNames: ['tenant_id', 'created_at'] })
        );

        await queryRunner.createIndex(
            'security_events',
            new TableIndex({ name: 'IDX_SECURITY_EVENT_TYPE', columnNames: ['event_type'] })
        );

        await queryRunner.createIndex(
            'security_events',
            new TableIndex({ name: 'IDX_SECURITY_EVENT_SEVERITY', columnNames: ['severity'] })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('security_events');
        await queryRunner.dropTable('audit_logs');
        await queryRunner.dropTable('saml_providers');
        await queryRunner.dropTable('oauth_authorization_codes');
        await queryRunner.dropTable('oauth_tokens');
        await queryRunner.dropTable('oauth_clients');
        await queryRunner.dropTable('mfa_backup_codes');
        await queryRunner.dropTable('user_mfa_settings');
    }
}
