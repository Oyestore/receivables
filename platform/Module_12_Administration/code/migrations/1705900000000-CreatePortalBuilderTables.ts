import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePortalBuilderTables1705900000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension if not already enabled
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // ===== Portal Templates Table =====
        await queryRunner.query(`
      CREATE TABLE portal_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_name VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(100) CHECK (category IN ('admin', 'customer', 'partner', 'analytics', 'custom')),
        description TEXT,
        thumbnail_url TEXT,
        layout_config JSONB NOT NULL,
        components JSONB NOT NULL,
        is_public BOOLEAN DEFAULT false,
        is_featured BOOLEAN DEFAULT false,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_portal_templates_category ON portal_templates(category);
    `);

        // ===== Portal Instances Table =====
        await queryRunner.query(`
      CREATE TABLE portal_instances (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        template_id UUID REFERENCES portal_templates(id),
        portal_name VARCHAR(255) NOT NULL,
        custom_config JSONB,
        domain VARCHAR(255),
        branding JSONB,
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        published_at TIMESTAMP,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_tenant_portal UNIQUE(tenant_id, portal_name)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_portal_instances_tenant ON portal_instances(tenant_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_portal_instances_domain ON portal_instances(domain) WHERE domain IS NOT NULL;
    `);

        // ===== Portal Pages Table =====
        await queryRunner.query(`
      CREATE TABLE portal_pages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        portal_id UUID NOT NULL REFERENCES portal_instances(id) ON DELETE CASCADE,
        page_name VARCHAR(255) NOT NULL,
        route VARCHAR(500) NOT NULL,
        layout JSONB,
        components JSONB NOT NULL,
        permissions JSONB,
        meta_tags JSONB,
        is_homepage BOOLEAN DEFAULT false,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_portal_route UNIQUE(portal_id, route)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_portal_pages_portal ON portal_pages(portal_id);
    `);

        // ===== Portal Components Table =====
        await queryRunner.query(`
      CREATE TABLE portal_components (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        component_type VARCHAR(100) NOT NULL UNIQUE,
        component_name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        config_schema JSONB NOT NULL,
        render_config JSONB,
        preview_image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_portal_components_category ON portal_components(category);
    `);

        // ===== Portal Themes Table =====
        await queryRunner.query(`
      CREATE TABLE portal_themes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        theme_name VARCHAR(255) NOT NULL UNIQUE,
        color_scheme JSONB NOT NULL,
        typography JSONB,
        css_overrides TEXT,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // ===== Portal Workflows Table =====
        await queryRunner.query(`
      CREATE TABLE portal_workflows (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        portal_id UUID NOT NULL REFERENCES portal_instances(id) ON DELETE CASCADE,
        workflow_name VARCHAR(255) NOT NULL,
        trigger_config JSONB NOT NULL,
        actions JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_portal_workflows_portal ON portal_workflows(portal_id);
    `);

        // ===== Workflow Executions Table =====
        await queryRunner.query(`
      CREATE TABLE workflow_executions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workflow_id UUID NOT NULL REFERENCES portal_workflows(id) ON DELETE CASCADE,
        trigger_data JSONB,
        execution_status VARCHAR(50) CHECK (execution_status IN ('running', 'completed', 'failed', 'cancelled')),
        result JSONB,
        error_message TEXT,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id, started_at DESC);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_workflow_executions_status ON workflow_executions(execution_status);
    `);

        // ===== Workflow Actions Table =====
        await queryRunner.query(`
      CREATE TABLE workflow_actions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workflow_id UUID NOT NULL REFERENCES portal_workflows(id) ON DELETE CASCADE,
        action_type VARCHAR(100) NOT NULL CHECK (action_type IN ('email', 'webhook', 'api_call', 'data_update', 'notification', 'custom')),
        action_config JSONB NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_workflow_actions_workflow ON workflow_actions(workflow_id, display_order);
    `);

        // Insert default components
        await queryRunner.query(`
      INSERT INTO portal_components (component_type, component_name, category, config_schema, render_config)
      VALUES
        ('header', 'Page Header', 'layout', '{"title": {"type": "string"}, "logo": {"type": "string"}, "navigation": {"type": "array"}}', '{"defaultHeight": "80px"}'),
        ('sidebar', 'Sidebar Navigation', 'layout', '{"items": {"type": "array"}, "position": {"type": "string", "enum": ["left", "right"]}}', '{"defaultWidth": "250px"}'),
        ('card', 'Info Card', 'content', '{"title": {"type": "string"}, "content": {"type": "string"}, "icon": {"type": "string"}}', '{}'),
        ('table', 'Data Table', 'data', '{"columns": {"type": "array"}, "dataSource": {"type": "string"}}', '{"pagination": true}'),
        ('chart', 'Chart Widget', 'visualization', '{"chartType": {"type": "string", "enum": ["line", "bar", "pie"]}, "dataSource": {"type": "string"}}', '{}'),
        ('form', 'Form Builder', 'input', '{"fields": {"type": "array"}, "submitAction": {"type": "string"}}', '{"validation": true}'),
        ('button', 'Action Button', 'input', '{"label": {"type": "string"}, "action": {"type": "string"}, "style": {"type": "string"}}', '{}'),
        ('text', 'Text Block', 'content', '{"content": {"type": "string"}, "format": {"type": "string"}}', '{"richText": true}')
    `);

        // Insert default theme
        await queryRunner.query(`
      INSERT INTO portal_themes (theme_name, color_scheme, typography, is_default)
      VALUES (
        'Default Light',
        '{"primary": "#1976d2", "secondary": "#dc004e", "background": "#ffffff", "text": "#000000"}',
        '{"fontFamily": "Inter, sans-serif", "fontSize": "16px"}',
        true
      )
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS workflow_actions CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS workflow_executions CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS portal_workflows CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS portal_themes CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS portal_components CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS portal_pages CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS portal_instances CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS portal_templates CASCADE`);
    }
}
