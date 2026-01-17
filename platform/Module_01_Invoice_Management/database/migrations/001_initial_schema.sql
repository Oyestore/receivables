-- Invoice Management Database Schema
-- Module 01: Invoice Management
-- Created: 2025-01-12

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_user_id ON invoice_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_is_active ON invoice_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_user_id ON recurring_invoice_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_compliance_entity ON trade_compliance(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_trade_compliance_status ON trade_compliance(status);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create audit triggers for important tables
CREATE TRIGGER update_invoices_modified 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_invoice_templates_modified 
    BEFORE UPDATE ON invoice_templates 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Create full-text search indexes
CREATE INDEX IF NOT EXISTS idx_invoices_fulltext ON invoices USING gin(to_tsvector('english', customer_name || ' ' || invoice_number));
CREATE INDEX IF NOT EXISTS idx_invoice_templates_fulltext ON invoice_templates USING gin(to_tsvector('english', name || ' ' || description));

-- Create partitioned table for large invoice data (optional)
-- This helps with performance for large datasets
-- CREATE TABLE invoices_partitioned (
--     LIKE invoices INCLUDING ALL
-- ) PARTITION BY RANGE (date);

-- Create sample data for testing
INSERT INTO invoice_templates (id, name, description, template_definition, is_active, user_id, created_at, updated_at)
VALUES 
    ('default-template', 'Default Invoice Template', 'Standard invoice template for general use', '{"style": "modern", "colors": ["#4285F5", "#34A853"]}', true, 'system', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('gst-template', 'GST Compliant Template', 'GST compliant invoice template with tax breakdown', '{"style": "professional", "colors": ["#FF6B6B", "#4ECDC4"], "gst": true}', true, 'system', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Create sample recurring invoice profiles
INSERT INTO recurring_invoice_profiles (id, name, frequency, next_run_date, is_active, user_id, created_at, updated_at)
VALUES 
    ('sample-monthly', 'Monthly Service Invoice', 'monthly', CURRENT_TIMESTAMP + INTERVAL '1 month', true, 'demo-user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Create functions for business logic
CREATE OR REPLACE FUNCTION calculate_invoice_total(invoice_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(quantity * unit_price * (1 + COALESCE(tax_rate, 0) / 100)), 0)
    INTO total
    FROM invoice_line_items
    WHERE invoice_id = $1;
    
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Create function for invoice aging
CREATE OR REPLACE FUNCTION get_invoice_aging(days INTEGER DEFAULT 30)
RETURNS TABLE (
    customer_id UUID,
    customer_name VARCHAR(255),
    total_amount NUMERIC,
    paid_amount NUMERIC,
    outstanding_amount NUMERIC,
    days_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.customer_id,
        i.customer_name,
        i.total,
        COALESCE(i.paid_amount, 0),
        i.total - COALESCE(i.paid_amount, 0),
        CASE 
            WHEN i.due_date < CURRENT_DATE THEN CURRENT_DATE - i.due_date
            ELSE 0
        END as days_overdue
    FROM invoices i
    WHERE 
        i.due_date <= CURRENT_DATE - INTERVAL '1 day'
        AND i.status != 'PAID'
        AND i.due_date >= CURRENT_DATE - INTERVAL (days || ' days')
    ORDER BY days_overdue DESC;
END;
$$ LANGUAGE plpgsql;

-- Create view for invoice analytics
CREATE OR REPLACE VIEW invoice_analytics AS
SELECT 
    DATE_TRUNC('month', date) as month,
    COUNT(*) as total_invoices,
    SUM(total) as total_amount,
    AVG(total) as average_amount,
    COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_invoices,
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_invoices,
    COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) as overdue_invoices
FROM invoices
GROUP BY DATE_TRUNC('month', date)
ORDER BY month DESC;

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO invoice_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON invoice_line_items TO invoice_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON invoice_templates TO invoice_app_user;
-- GRANT SELECT ON invoice_analytics TO invoice_app_user;

-- Create backup table for audit trail
CREATE TABLE IF NOT EXISTS invoice_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    old_data JSONB,
    new_data JSONB,
    changed_by VARCHAR(255),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO invoice_audit_log (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), current_user());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO invoice_audit_log (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), current_user());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO invoice_audit_log (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', NULL, row_to_json(NEW), current_user());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers
CREATE TRIGGER invoices_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER invoice_line_items_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Create stored procedures for common operations
CREATE OR REPLACE FUNCTION get_customer_invoice_summary(customer_id UUID)
RETURNS TABLE (
    total_invoices INTEGER,
    total_amount NUMERIC,
    paid_amount NUMERIC,
    pending_amount NUMERIC,
    overdue_amount NUMERIC,
    last_invoice_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(total), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN total ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN total ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN total ELSE 0 END), 0) as overdue_amount,
        MAX(date) as last_invoice_date
    FROM invoices
    WHERE customer_id = $1
    GROUP BY customer_id;
END;
$$ LANGUAGE plpgsql;

-- Create function for template performance metrics
CREATE OR REPLACE FUNCTION get_template_performance_metrics(template_id UUID, days INTEGER DEFAULT 30)
RETURNS TABLE (
    template_id UUID,
    usage_count INTEGER,
    success_rate NUMERIC,
    average_payment_days INTEGER,
    total_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.template_id,
        COUNT(*) as usage_count,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE WHEN i.status = 'PAID' THEN 1 END) * 100.0 / COUNT(*))
            ELSE 0
        END as success_rate,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                EXTRACT(DAY FROM AVG(i.paid_date - i.date))
            ELSE 0
        END as average_payment_days,
        SUM(i.total) as total_amount
    FROM invoices i
    WHERE 
        i.template_id = $1
        AND i.date >= CURRENT_DATE - INTERVAL (days || ' days')
    GROUP BY i.template_id;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_product_id ON invoice_line_items(product_id);
CREATE INDEX IF NOT EXISTS idx_trade_compliance_compliance_type ON trade_compliance(compliance_type);
CREATE INDEX IF NOT EXISTS idx_trade_compliance_performed_at ON trade_compliance(performed_at);

-- Create function for data cleanup (old records)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM invoice_audit_log 
    WHERE changed_at < CURRENT_DATE - INTERVAL (days_to_keep || ' days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job for cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * 0', 'SELECT cleanup_old_audit_logs(365);');

-- Add comments for documentation
COMMENT ON TABLE invoices IS 'Main invoice table containing all invoice records';
COMMENT ON TABLE invoice_line_items IS 'Line items for each invoice with quantity, price, and tax information';
COMMENT ON TABLE invoice_templates IS 'Template definitions for invoice generation';
COMMENT ON TABLE recurring_invoice_profiles IS 'Recurring invoice configurations';
COMMENT ON TABLE trade_compliance IS 'Trade compliance check records';

-- Add column comments
COMMENT ON COLUMN invoices.status IS 'Current status of the invoice: DRAFT, SENT, PAID, OVERDUE, CANCELLED';
COMMENT ON COLUMN invoices.total IS 'Total amount including taxes';
COMMENT ON COLUMN invoices.paid_amount IS 'Amount already paid for this invoice';
COMMENT ON COLUMN invoices.due_date IS 'Due date for payment';
COMMENT ON COLUMN invoice_line_items.tax_rate IS 'Tax rate percentage for this line item';
COMMENT ON COLUMN invoice_templates.template_definition IS 'JSON definition of the template structure';
COMMENT ON COLUMN recurring_invoice_profiles.frequency IS 'Frequency of recurring invoice generation';
COMMENT ON COLUMN trade_compliance.compliance_type IS 'Type of compliance check performed';

-- Create materialized view for reporting (refresh manually or via cron)
CREATE MATERIALIZED VIEW IF NOT EXISTS invoice_summary_report AS
SELECT 
    DATE_TRUNC('month', i.date) as month,
    COUNT(*) as total_invoices,
    SUM(i.total) as total_revenue,
    AVG(i.total) as average_invoice_value,
    COUNT(CASE WHEN i.status = 'PAID' THEN 1 END) as paid_count,
    COUNT(CASE WHEN i.status = 'PENDING' THEN 1 END) as pending_count,
    COUNT(CASE WHEN i.status = 'OVERDUE' THEN 1 END) as overdue_count,
    SUM(CASE WHEN i.paid_amount > 0 THEN i.paid_amount ELSE 0 END) as total_paid,
    SUM(i.total - COALESCE(i.paid_amount, 0)) as total_outstanding
FROM invoices i
GROUP BY DATE_TRUNC('month', i.date);

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_invoice_summary_report_month ON invoice_summary_report(month);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_invoice_summary_report()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY invoice_summary_report;
END;
$$ LANGUAGE plpgsql;
