import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdvancedAuthTables1706200000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // ===== Biometric Registrations Table =====
        await queryRunner.query(`
      CREATE TABLE biometric_registrations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        biometric_type VARCHAR(50) NOT NULL CHECK (biometric_type IN ('fingerprint', 'face', 'voice', 'iris', 'webauthn')),
        device_id VARCHAR(255),
        public_key TEXT NOT NULL,
        credential_id TEXT,
        counter BIGINT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP
      )
    `);

        await queryRunner.query(`CREATE INDEX idx_biometric_registrations_user ON biometric_registrations(user_id, is_active);`);
        await queryRunner.query(`CREATE INDEX idx_biometric_registrations_device ON biometric_registrations(device_id);`);

        // ===== Hardware Tokens Table =====
        await queryRunner.query(`
      CREATE TABLE hardware_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_serial VARCHAR(255) NOT NULL UNIQUE,
        token_type VARCHAR(50) CHECK (token_type IN ('yubikey', 'rsa', 'totp_hardware', 'u2f', 'fido2')),
        counter BIGINT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP
      )
    `);

        await queryRunner.query(`CREATE INDEX idx_hardware_tokens_user ON hardware_tokens(user_id, status);`);

        // ===== Directory Connections Table =====
        await queryRunner.query(`
      CREATE TABLE directory_connections (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        directory_type VARCHAR(50) NOT NULL CHECK (directory_type IN ('ldap', 'active_directory', 'azure_ad', 'okta', 'google_workspace')),
        connection_config JSONB NOT NULL,
        sync_config JSONB,
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
        last_sync_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`CREATE INDEX idx_directory_connections_tenant ON directory_connections(tenant_id, status);`);

        // ===== Directory Sync Logs Table =====
        await queryRunner.query(`
      CREATE TABLE directory_sync_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        connection_id UUID NOT NULL REFERENCES directory_connections(id) ON DELETE CASCADE,
        sync_type VARCHAR(50) CHECK (sync_type IN ('full', 'incremental', 'manual')),
        records_processed INTEGER DEFAULT 0,
        records_created INTEGER DEFAULT 0,
        records_updated INTEGER DEFAULT 0,
        records_deleted INTEGER DEFAULT 0,
        status VARCHAR(50) CHECK (status IN ('running', 'completed', 'failed')),
        error_message TEXT,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

        await queryRunner.query(`CREATE INDEX idx_directory_sync_logs_connection ON directory_sync_logs(connection_id, started_at DESC);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS directory_sync_logs CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS directory_connections CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS hardware_tokens CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS biometric_registrations CASCADE`);
    }
}
