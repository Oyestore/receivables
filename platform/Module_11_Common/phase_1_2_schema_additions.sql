-- SQL Schema Additions for Phase 1.2: Advanced Invoice Template Management

-- This script assumes the existence of a `tenants` table and an `organizations` table
-- from the broader platform context, and an `invoices` table from Phase 1.1.

-- Create the new table for invoice templates
CREATE TABLE invoice_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL, -- REFERENCES tenants(id) - Assuming tenants table exists
    organization_id UUID NOT NULL, -- REFERENCES organizations(id) - Assuming organizations table exists
    template_name VARCHAR(255) NOT NULL,
    description TEXT,
    template_definition JSONB NOT NULL, -- Stores layout, styles, field mappings
    is_system_template BOOLEAN DEFAULT FALSE,
    is_default_for_org BOOLEAN DEFAULT FALSE,
    preview_image_url VARCHAR(1024),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_org_template_name UNIQUE (organization_id, template_name)
    -- Add FOREIGN KEY constraints if tenants and organizations tables are confirmed to be in the same DB and managed by this module's setup
    -- FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    -- FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

COMMENT ON TABLE invoice_templates IS 'Stores invoice template designs and configurations for Phase 1.2.';
COMMENT ON COLUMN invoice_templates.template_definition IS 'JSONB structure defining template layout, styling, and data field mappings.';
COMMENT ON COLUMN invoice_templates.is_system_template IS 'True if this is a pre-defined system template, false if user-created.';
COMMENT ON COLUMN invoice_templates.is_default_for_org IS 'Indicates if this template is the default for the organization (can also be managed in organization_settings).';

-- Alterations to existing tables (from Phase 1.1 or broader platform)

-- Add a column to the organizations table (or a dedicated organization_settings table)
-- to store the default invoice template ID for the organization.
-- This assumes an `organizations` table exists.
-- ALTER TABLE organizations
-- ADD COLUMN default_invoice_template_id UUID REFERENCES invoice_templates(id) ON DELETE SET NULL;
-- COMMENT ON COLUMN organizations.default_invoice_template_id IS 'ID of the default invoice template for this organization.';

-- Add a column to the invoices table (from Phase 1.1)
-- to store the ID of the template selected for a specific invoice, overriding the organizational default if set.
-- This assumes an `invoices` table exists from Phase 1.1.
-- ALTER TABLE invoices
-- ADD COLUMN selected_template_id UUID REFERENCES invoice_templates(id) ON DELETE SET NULL;
-- COMMENT ON COLUMN invoices.selected_template_id IS 'ID of the specific template chosen for this invoice, overrides organizational default.';


-- Note: The ALTER TABLE statements are commented out. 
-- They should be applied to your existing database schema from Phase 1.1.
-- Please ensure the `organizations` and `invoices` tables exist before applying these alterations.

