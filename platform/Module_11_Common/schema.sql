-- PostgreSQL Schema for Smart Invoice Generation Module (Phase 1.1 with Enhancements)

-- Drop existing tables if they exist (optional, for clean setup)
-- DROP TABLE IF EXISTS client_preferences CASCADE;
-- DROP TABLE IF EXISTS recurring_invoice_profiles CASCADE;
-- DROP TABLE IF EXISTS product_service_catalog CASCADE;
-- DROP TABLE IF EXISTS invoice_line_items CASCADE;
-- DROP TABLE IF EXISTS invoices CASCADE;

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL, -- Assuming a tenants table exists or will exist
    client_id UUID, -- Assuming a clients table exists or will exist
    invoice_number VARCHAR(255) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- e.g., 'draft', 'sent', 'paid', 'overdue', 'void'
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    sub_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    balance_due DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    terms_and_conditions TEXT,
    template_id UUID, -- For Phase 1.2, FK to invoice_templates.id
    ai_extraction_source VARCHAR(255), -- e.g., file name/ID of uploaded doc
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Invoice Line Items Table
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL, -- Denormalized for easier querying, matches invoices.tenant_id
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(12, 2) NOT NULL,
    item_sub_total DECIMAL(12, 2) NOT NULL, -- quantity * unit_price
    tax_rate_id UUID, -- For Phase 1.3, FK to a future tax_rates table
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(12, 2) NOT NULL, -- item_sub_total + tax_amount - discount_amount
    product_id UUID, -- FK to product_service_catalog.id
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Product/Service Catalog Table
CREATE TABLE IF NOT EXISTS product_service_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    default_unit_price DECIMAL(12, 2),
    default_tax_id UUID, -- Nullable, for future tax integration (Phase 1.3)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, item_name) -- Ensure item names are unique per tenant
);

-- Add foreign key constraint for product_id in invoice_line_items after product_service_catalog is created
ALTER TABLE invoice_line_items
ADD CONSTRAINT fk_product_service_catalog
FOREIGN KEY (product_id)
REFERENCES product_service_catalog(id)
ON DELETE SET NULL;

-- Recurring Invoice Profiles Table
CREATE TABLE IF NOT EXISTS recurring_invoice_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    client_id UUID NOT NULL, -- Assuming a clients table exists
    source_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL, -- Optional, for templating from an existing invoice
    profile_name VARCHAR(255) NOT NULL, -- Name for the recurring profile
    frequency VARCHAR(50) NOT NULL, -- e.g., 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
    start_date DATE NOT NULL,
    end_date DATE, -- Nullable for ongoing
    next_run_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- e.g., 'active', 'paused', 'completed', 'cancelled'
    invoice_data JSONB, -- Stores a template of the invoice data to be generated
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Client Preferences Table
CREATE TABLE IF NOT EXISTS client_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    client_id UUID NOT NULL UNIQUE, -- Assuming a clients table exists, FK to clients.id
    default_payment_terms TEXT,
    default_notes TEXT,
    default_invoice_template_id UUID, -- Nullable, for future template integration (Phase 1.2)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_tenant_id ON invoice_line_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_service_catalog_tenant_id ON product_service_catalog(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoice_profiles_tenant_id ON recurring_invoice_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoice_profiles_next_run_date ON recurring_invoice_profiles(next_run_date);
CREATE INDEX IF NOT EXISTS idx_client_preferences_tenant_id ON client_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_preferences_client_id ON client_preferences(client_id);

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update updated_at on table updates
CREATE TRIGGER set_invoices_timestamp
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_invoice_line_items_timestamp
BEFORE UPDATE ON invoice_line_items
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_product_service_catalog_timestamp
BEFORE UPDATE ON product_service_catalog
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_recurring_invoice_profiles_timestamp
BEFORE UPDATE ON recurring_invoice_profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_client_preferences_timestamp
BEFORE UPDATE ON client_preferences
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

COMMIT;

