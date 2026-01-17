import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIntegrationMarketplaceTables1705800000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension if not already enabled
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // ===== Marketplace Integrations Table =====
        await queryRunner.query(`
      CREATE TABLE marketplace_integrations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        integration_name VARCHAR(255) NOT NULL UNIQUE,
        integration_slug VARCHAR(100) NOT NULL UNIQUE,
        category VARCHAR(100) CHECK (category IN ('payment', 'crm', 'accounting', 'communication', 'storage', 'analytics', 'other')),
        provider VARCHAR(255) NOT NULL,
        description TEXT,
        logo_url TEXT,
        config_schema JSONB NOT NULL,
        auth_type VARCHAR(50) CHECK (auth_type IN ('oauth2', 'api_key', 'basic', 'custom')),
        is_official BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        version VARCHAR(50),
        documentation_url TEXT,
        support_contact VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_marketplace_integrations_category ON marketplace_integrations(category);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_marketplace_integrations_active ON marketplace_integrations(is_active);
    `);

        // ===== Tenant Integrations Table =====
        await queryRunner.query(`
      CREATE TABLE tenant_integrations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        integration_id UUID NOT NULL REFERENCES marketplace_integrations(id),
        credentials JSONB,
        config JSONB,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'error', 'disconnected')),
        last_sync_at TIMESTAMP,
        error_message TEXT,
        metadata JSONB,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_tenant_integration UNIQUE(tenant_id, integration_id)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_tenant_integrations_tenant ON tenant_integrations(tenant_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_tenant_integrations_status ON tenant_integrations(status);
    `);

        // ===== Integration Connectors Table =====
        await queryRunner.query(`
      CREATE TABLE integration_connectors (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        integration_id UUID NOT NULL REFERENCES marketplace_integrations(id) ON DELETE CASCADE,
        connector_name VARCHAR(255) NOT NULL,
        connector_type VARCHAR(100) CHECK (connector_type IN ('api', 'webhook', 'oauth_callback', 'sync', 'export', 'import')),
        endpoint_url TEXT,
        http_method VARCHAR(10) CHECK (http_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
        auth_config JSONB,
        headers JSONB,
        request_template JSONB,
        response_mapping JSONB,
        retry_config JSONB,
        timeout_ms INTEGER DEFAULT 30000,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_integration_connector UNIQUE(integration_id, connector_name)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_integration_connectors_integration ON integration_connectors(integration_id);
    `);

        // ===== Integration Webhooks Table =====
        await queryRunner.query(`
      CREATE TABLE integration_webhooks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        integration_id UUID NOT NULL REFERENCES marketplace_integrations(id),
        tenant_integration_id UUID REFERENCES tenant_integrations(id) ON DELETE CASCADE,
        webhook_url TEXT NOT NULL,
        events TEXT[] NOT NULL,
        secret VARCHAR(255),
        headers JSONB,
        is_active BOOLEAN DEFAULT true,
        failed_count INTEGER DEFAULT 0,
        last_triggered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_integration_webhooks_tenant_integration ON integration_webhooks(tenant_integration_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_integration_webhooks_active ON integration_webhooks(is_active);
    `);

        // ===== Webhook Deliveries Table =====
        await queryRunner.query(`
      CREATE TABLE webhook_deliveries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        webhook_id UUID NOT NULL REFERENCES integration_webhooks(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        delivery_status VARCHAR(50) CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'retrying')),
        http_status_code INTEGER,
        response_body TEXT,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        next_retry_at TIMESTAMP,
        delivered_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id, created_at DESC);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(delivery_status);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE delivery_status = 'retrying';
    `);

        // ===== OAuth Connections Table =====
        await queryRunner.query(`
      CREATE TABLE oauth_connections (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        integration_id UUID NOT NULL REFERENCES marketplace_integrations(id),
        tenant_integration_id UUID REFERENCES tenant_integrations(id) ON DELETE CASCADE,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_type VARCHAR(50) DEFAULT 'Bearer',
        expires_at TIMESTAMP,
        scope TEXT,
        state VARCHAR(255),
        additional_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_oauth_connection UNIQUE(tenant_id, integration_id)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_oauth_connections_tenant ON oauth_connections(tenant_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_oauth_connections_expires ON oauth_connections(expires_at);
    `);

        // Insert pre-built integrations
        await queryRunner.query(`
      INSERT INTO marketplace_integrations (
        integration_name, integration_slug, category, provider, description,
        config_schema, auth_type, is_official, version
      ) VALUES
        (
          'Stripe Payment Gateway',
          'stripe',
          'payment',
          'Stripe Inc.',
          'Accept payments and manage subscriptions with Stripe',
          '{"api_key": {"type": "string", "required": true, "secret": true}, "webhook_secret": {"type": "string", "required": false, "secret": true}}',
          'api_key',
          true,
          '2023-10-01'
        ),
        (
          'PayPal Commerce',
          'paypal',
          'payment',
          'PayPal Holdings',
          'Process payments through PayPal',
          '{"client_id": {"type": "string", "required": true}, "client_secret": {"type": "string", "required": true, "secret": true}, "mode": {"type": "string", "enum": ["sandbox", "live"]}}',
          'oauth2',
          true,
          'v2'
        ),
        (
          'Salesforce CRM',
          'salesforce',
          'crm',
          'Salesforce.com',
          'Sync customer data with Salesforce CRM',
          '{"instance_url": {"type": "string", "required": true}, "client_id": {"type": "string", "required": true}, "client_secret": {"type": "string", "required": true, "secret": true}}',
          'oauth2',
          true,
          'v58.0'
        ),
        (
          'HubSpot',
          'hubspot',
          'crm',
          'HubSpot Inc.',
          'Marketing, sales, and service software',
          '{"api_key": {"type": "string", "required": true, "secret": true}}',
          'api_key',
          true,
          'v3'
        ),
        (
          'QuickBooks Online',
          'quickbooks',
          'accounting',
          'Intuit Inc.',
          'Accounting and financial management',
          '{"realm_id": {"type": "string", "required": true}, "client_id": {"type": "string", "required": true}, "client_secret": {"type": "string", "required": true, "secret": true}}',
          'oauth2',
          true,
          'v3'
        ),
        (
          'Slack',
          'slack',
          'communication',
          'Slack Technologies',
          'Team collaboration and messaging',
          '{"bot_token": {"type": "string", "required": true, "secret": true}, "signing_secret": {"type": "string", "required": true, "secret": true}}',
          'oauth2',
          true,
          'v1'
        )
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS oauth_connections CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS webhook_deliveries CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS integration_webhooks CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS integration_connectors CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS tenant_integrations CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS marketplace_integrations CASCADE`);
    }
}
