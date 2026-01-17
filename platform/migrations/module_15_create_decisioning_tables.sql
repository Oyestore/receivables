-- Module 15: Credit Decisioning - Database Migration
-- Create credit_decisions and decision_rules tables

-- Drop tables if exist (for development)
DROP TABLE IF EXISTS credit_decisions CASCADE;
DROP TABLE IF EXISTS decision_rules CASCADE;

-- Create decision_rules table (must be first due to foreign key)
CREATE TABLE decision_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    rule_name VARCHAR(200) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('credit_score', 'payment_history', 'amount_limit', 'industry', 'custom')),
    
    -- Rule conditions stored as JSONB
    conditions JSONB NOT NULL,
    
    action_on_true VARCHAR(20) NOT NULL CHECK (action_on_true IN ('approve', 'reject', 'manual_review', 'conditional')),
    action_on_false VARCHAR(20) NOT NULL CHECK (action_on_false IN ('approve', 'reject', 'manual_review', 'conditional', 'continue')),
    
    priority INTEGER DEFAULT 0,
    weight DECIMAL(5,2) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT true,
    applies_to TEXT[] NOT NULL, -- Array of decision types
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

-- Create credit_decisions table
CREATE TABLE credit_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    application_id UUID,
    
    decision_type VARCHAR(30) NOT NULL CHECK (decision_type IN ('invoice_approval', 'credit_limit', 'financing', 'payment_terms')),
    decision_result VARCHAR(20) NOT NULL CHECK (decision_result IN ('approved', 'rejected', 'manual_review', 'conditional')),
    
    amount DECIMAL(15,2),
    credit_score INTEGER,
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'very_high')),
    
    -- Conditions for conditional approvals
    conditions JSONB,
    
    -- Rules applied during decision
    rules_applied JSONB NOT NULL,
    
    -- Decision factors
    factors JSONB,
    
    notes TEXT,
    decided_by UUID, -- 'system' or user ID
    reviewed_by UUID,
    reviewed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_decision_rules_tenant ON decision_rules(tenant_id);
CREATE INDEX idx_decision_rules_type ON decision_rules(rule_type);
CREATE INDEX idx_decision_rules_active ON decision_rules(is_active);
CREATE INDEX idx_decision_rules_priority ON decision_rules(priority DESC);

CREATE INDEX idx_credit_decisions_tenant ON credit_decisions(tenant_id);
CREATE INDEX idx_credit_decisions_customer ON credit_decisions(customer_id);
CREATE INDEX idx_credit_decisions_type ON credit_decisions(decision_type);
CREATE INDEX idx_credit_decisions_result ON credit_decisions(decision_result);
CREATE INDEX idx_credit_decisions_risk ON credit_decisions(risk_level);
CREATE INDEX idx_credit_decisions_created ON credit_decisions(created_at DESC);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_decision_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decision_rules_updated_at
    BEFORE UPDATE ON decision_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_decision_rules_updated_at();

CREATE OR REPLACE FUNCTION update_credit_decisions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_credit_decisions_updated_at
    BEFORE UPDATE ON credit_decisions
    FOR EACH ROW
    EXECUTE FUNCTION update_credit_decisions_updated_at();

-- Insert sample decision rules
INSERT INTO decision_rules (
    tenant_id,
    rule_name,
    description,
    rule_type,
    conditions,
    action_on_true,
    action_on_false,
    priority,
    weight,
    applies_to,
    created_by
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'High Credit Score Auto-Approve',
    'Automatically approve if credit score is above 750',
    'credit_score',
    '[{"field": "creditScore", "operator": "gte", "value": 750}]'::jsonb,
    'approve',
    'continue',
    100,
    2.0,
    ARRAY['invoice_approval', 'credit_limit', 'financing'],
    '00000000-0000-0000-0000-000000000001'
), (
    '00000000-0000-0000-0000-000000000001',
    'Amount Limit Check',
    'Review manually if amount exceeds 100000',
    'amount_limit',
    '[{"field": "amount", "operator": "gt", "value": 100000}]'::jsonb,
    'manual_review',
    'continue',
    90,
    1.5,
    ARRAY['invoice_approval', 'financing'],
    '00000000-0000-0000-0000-000000000001'
);

-- Insert sample credit decisions
INSERT INTO credit_decisions (
    tenant_id,
    customer_id,
    decision_type,
    decision_result,
    amount,
    credit_score,
    risk_level,
    rules_applied,
    decided_by
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'credit_limit',
    'approved',
    50000,
    780,
    'low',
    '[{"ruleId": "1", "ruleName": "High Credit Score Auto-Approve", "result": true, "weight": 2.0}]'::jsonb,
    '00000000-0000-0000-0000-000000000001'
);

-- Verification query
SELECT 
    (SELECT COUNT(*) FROM decision_rules WHERE is_active = true) as active_rules,
    (SELECT COUNT(*) FROM credit_decisions) as total_decisions,
    (SELECT COUNT(*) FROM credit_decisions WHERE decision_result = 'approved') as approved_decisions;
