-- Module 02: Intelligent Distribution - Database Migration
-- Create distribution_rules and distribution_assignments tables

-- Drop tables if exist (for development)
DROP TABLE IF EXISTS distribution_assignments CASCADE;
DROP TABLE IF EXISTS distribution_rules CASCADE;

-- Create distribution_rules table
CREATE TABLE distribution_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    rule_name VARCHAR(200) NOT NULL,
    description TEXT,
    rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('amount_based', 'customer_based', 'industry_based', 'geographic', 'custom')),
    
    -- Rule conditions stored as JSONB
    conditions JSONB NOT NULL,
    
    target_channel VARCHAR(50) NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

-- Create distribution_assignments table
CREATE TABLE distribution_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    invoice_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    
    assigned_channel VARCHAR(50) NOT NULL,
    rule_id UUID REFERENCES distribution_rules(id) ON DELETE SET NULL,
    assignment_reason TEXT NOT NULL,
    
    distribution_status VARCHAR(20) NOT NULL CHECK (distribution_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    error TEXT,
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_distribution_rules_tenant ON distribution_rules(tenant_id);
CREATE INDEX idx_distribution_rules_type ON distribution_rules(rule_type);
CREATE INDEX idx_distribution_rules_active ON distribution_rules(is_active);
CREATE INDEX idx_distribution_rules_priority ON distribution_rules(priority DESC);

CREATE INDEX idx_distribution_assignments_tenant ON distribution_assignments(tenant_id);
CREATE INDEX idx_distribution_assignments_invoice ON distribution_assignments(invoice_id);
CREATE INDEX idx_distribution_assignments_customer ON distribution_assignments(customer_id);
CREATE INDEX idx_distribution_assignments_channel ON distribution_assignments(assigned_channel);
CREATE INDEX idx_distribution_assignments_status ON distribution_assignments(distribution_status);
CREATE INDEX idx_distribution_assignments_created ON distribution_assignments(created_at DESC);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_distribution_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_distribution_rules_updated_at
    BEFORE UPDATE ON distribution_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_distribution_rules_updated_at();

CREATE OR REPLACE FUNCTION update_distribution_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_distribution_assignments_updated_at
    BEFORE UPDATE ON distribution_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_distribution_assignments_updated_at();

-- Insert sample distribution rules
INSERT INTO distribution_rules (
    tenant_id,
    rule_name,
    description,
    rule_type,
    conditions,
    target_channel,
    priority,
    created_by
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'High-Value Invoices - Email',
    'Send invoices over $10,000 via email for tracking',
    'amount_based',
    '[{"field": "amount", "operator": "gt", "value": 10000}]'::jsonb,
    'email',
    100,
    '00000000-0000-0000-0000-000000000001'
), (
    '00000000-0000-0000-0000-000000000001',
    'Quick Invoices - WhatsApp',
    'Send invoices under $1,000 via WhatsApp for instant delivery',
    'amount_based',
    '[{"field": "amount", "operator": "lt", "value": 1000}]'::jsonb,
    'whatsapp',
    50,
    '00000000-0000-0000-0000-000000000001'
);

-- Insert sample distribution assignments
INSERT INTO distribution_assignments (
    tenant_id,
    invoice_id,
    customer_id,
    assigned_channel,
    assignment_reason,
    distribution_status,
    sent_at,
    delivered_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000002',
    'email',
    'Matched rule: High-Value Invoices - Email',
    'delivered',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour 55 minutes'
);

-- Verification query
SELECT 
    (SELECT COUNT(*) FROM distribution_rules WHERE is_active = true) as active_rules,
    (SELECT COUNT(*) FROM distribution_assignments) as total_assignments,
    (SELECT COUNT(*) FROM distribution_assignments WHERE distribution_status = 'delivered') as delivered;
