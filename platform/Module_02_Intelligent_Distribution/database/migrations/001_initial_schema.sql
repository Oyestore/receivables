-- Module 02: Intelligent Distribution Database Schema
-- Created: 2025-01-12
-- Description: Complete database schema for intelligent distribution and follow-up system

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_distribution_rules_tenant_id ON distribution_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_distribution_rules_priority ON distribution_rules(priority);
CREATE INDEX IF NOT EXISTS idx_distribution_rules_is_active ON distribution_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_distribution_rules_rule_type ON distribution_rules(rule_type);

CREATE INDEX IF NOT EXISTS idx_distribution_assignments_tenant_id ON distribution_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_distribution_assignments_invoice_id ON distribution_assignments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_distribution_assignments_customer_id ON distribution_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_distribution_assignments_status ON distribution_assignments(distribution_status);
CREATE INDEX IF NOT EXISTS idx_distribution_assignments_sent_at ON distribution_assignments(sent_at);
CREATE INDEX IF NOT EXISTS idx_distribution_assignments_rule_id ON distribution_assignments(rule_id);

CREATE INDEX IF NOT EXISTS idx_distribution_records_tenant_id ON distribution_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_distribution_records_assignment_id ON distribution_records(assignment_id);
CREATE INDEX IF NOT EXISTS idx_distribution_records_status ON distribution_records(status);
CREATE INDEX IF NOT EXISTS idx_distribution_records_created_at ON distribution_records(created_at);

CREATE INDEX IF NOT EXISTS idx_recipient_contacts_tenant_id ON recipient_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recipient_contacts_customer_id ON recipient_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_recipient_contacts_channel ON recipient_contacts(channel);
CREATE INDEX IF NOT EXISTS idx_recipient_contacts_is_active ON recipient_contacts(is_active);

CREATE INDEX IF NOT EXISTS idx_follow_up_rules_tenant_id ON follow_up_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_rules_trigger_type ON follow_up_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_follow_up_rules_is_active ON follow_up_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_follow_up_sequences_tenant_id ON follow_up_sequences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_sequences_rule_id ON follow_up_sequences(rule_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_sequences_is_active ON follow_up_sequences(is_active);

CREATE INDEX IF NOT EXISTS idx_follow_up_steps_sequence_id ON follow_up_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_steps_step_order ON follow_up_steps(step_order);

CREATE INDEX IF NOT EXISTS idx_sender_profiles_tenant_id ON sender_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sender_profiles_channel ON sender_profiles(channel);
CREATE INDEX IF NOT EXISTS idx_sender_profiles_is_active ON sender_profiles(is_active);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create audit triggers for important tables
CREATE TRIGGER update_distribution_rules_modified 
    BEFORE UPDATE ON distribution_rules 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_distribution_assignments_modified 
    BEFORE UPDATE ON distribution_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_recipient_contacts_modified 
    BEFORE UPDATE ON recipient_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_follow_up_rules_modified 
    BEFORE UPDATE ON follow_up_rules 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_follow_up_sequences_modified 
    BEFORE UPDATE ON follow_up_sequences 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_sender_profiles_modified 
    BEFORE UPDATE ON sender_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Create full-text search indexes
CREATE INDEX IF NOT EXISTS idx_distribution_rules_fulltext ON distribution_rules USING gin(to_tsvector('english', rule_name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_recipient_contacts_fulltext ON recipient_contacts USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || email));

-- Create partitioned table for large distribution data (optional)
-- This helps with performance for large datasets
-- CREATE TABLE distribution_assignments_partitioned (
--     LIKE distribution_assignments INCLUDING ALL
-- ) PARTITION BY RANGE (created_at);

-- Create functions for business logic
CREATE OR REPLACE FUNCTION calculate_distribution_success_rate(tenant_id_param UUID, start_date DATE, end_date DATE)
RETURNS NUMERIC AS $$
DECLARE
    total_assignments INTEGER;
    successful_assignments INTEGER;
    success_rate NUMERIC;
BEGIN
    SELECT COUNT(*) INTO total_assignments
    FROM distribution_assignments
    WHERE tenant_id = tenant_id_param
    AND created_at BETWEEN start_date AND end_date;
    
    SELECT COUNT(*) INTO successful_assignments
    FROM distribution_assignments
    WHERE tenant_id = tenant_id_param
    AND created_at BETWEEN start_date AND end_date
    AND distribution_status = 'DELIVERED';
    
    IF total_assignments = 0 THEN
        RETURN 0;
    END IF;
    
    success_rate := (successful_assignments::NUMERIC / total_assignments::NUMERIC) * 100;
    RETURN success_rate;
END;
$$ LANGUAGE plpgsql;

-- Create function for channel performance metrics
CREATE OR REPLACE FUNCTION get_channel_performance_metrics(tenant_id_param UUID, days INTEGER DEFAULT 30)
RETURNS TABLE (
    channel VARCHAR(50),
    total_sent INTEGER,
    delivered INTEGER,
    failed INTEGER,
    success_rate NUMERIC,
    avg_delivery_time INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        da.assigned_channel as channel,
        COUNT(*) as total_sent,
        COUNT(CASE WHEN da.distribution_status = 'DELIVERED' THEN 1 END) as delivered,
        COUNT(CASE WHEN da.distribution_status = 'FAILED' THEN 1 END) as failed,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE WHEN da.distribution_status = 'DELIVERED' THEN 1 END) * 100.0 / COUNT(*))
            ELSE 0
        END as success_rate,
        CASE 
            WHEN COUNT(CASE WHEN da.distribution_status = 'DELIVERED' THEN 1 END) > 0 THEN 
                EXTRACT(EPOCH FROM (AVG(da.delivered_at - da.sent_at)))
            ELSE 0
        END as avg_delivery_time
    FROM distribution_assignments da
    WHERE 
        da.tenant_id = tenant_id_param
        AND da.created_at >= CURRENT_DATE - INTERVAL (days || ' days')
    GROUP BY da.assigned_channel
    ORDER BY success_rate DESC;
END;
$$ LANGUAGE plpgsql;

-- Create view for distribution analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS distribution_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    tenant_id,
    assigned_channel,
    COUNT(*) as total_assignments,
    COUNT(CASE WHEN distribution_status = 'DELIVERED' THEN 1 END) as delivered,
    COUNT(CASE WHEN distribution_status = 'FAILED' THEN 1 END) as failed,
    COUNT(CASE WHEN distribution_status = 'PENDING' THEN 1 END) as pending,
    AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at))) as avg_delivery_time_seconds
FROM distribution_assignments
GROUP BY DATE_TRUNC('day', created_at), tenant_id, assigned_channel
ORDER BY date DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_distribution_analytics_date ON distribution_analytics(date);
CREATE INDEX IF NOT EXISTS idx_distribution_analytics_tenant ON distribution_analytics(tenant_id);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_distribution_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY distribution_analytics;
END;
$$ LANGUAGE plpgsql;

-- Create backup table for audit trail
CREATE TABLE IF NOT EXISTS distribution_audit_log (
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
CREATE OR REPLACE FUNCTION distribution_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO distribution_audit_log (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), current_user());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO distribution_audit_log (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), current_user());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO distribution_audit_log (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', NULL, row_to_json(NEW), current_user());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers
CREATE TRIGGER distribution_rules_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON distribution_rules
    FOR EACH ROW EXECUTE FUNCTION distribution_audit_trigger();

CREATE TRIGGER distribution_assignments_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON distribution_assignments
    FOR EACH ROW EXECUTE FUNCTION distribution_audit_trigger();

CREATE TRIGGER recipient_contacts_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON recipient_contacts
    FOR EACH ROW EXECUTE FUNCTION distribution_audit_trigger();

-- Create stored procedures for common operations
CREATE OR REPLACE FUNCTION get_customer_distribution_summary(customer_id_param UUID, tenant_id_param UUID)
RETURNS TABLE (
    total_assignments INTEGER,
    successful_assignments INTEGER,
    failed_assignments INTEGER,
    pending_assignments INTEGER,
    success_rate NUMERIC,
    preferred_channel VARCHAR(50),
    last_assignment_date TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_assignments,
        COUNT(CASE WHEN da.distribution_status = 'DELIVERED' THEN 1 END) as successful_assignments,
        COUNT(CASE WHEN da.distribution_status = 'FAILED' THEN 1 END) as failed_assignments,
        COUNT(CASE WHEN da.distribution_status = 'PENDING' THEN 1 END) as pending_assignments,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE WHEN da.distribution_status = 'DELIVERED' THEN 1 END) * 100.0 / COUNT(*))
            ELSE 0
        END as success_rate,
        mode() WITHIN GROUP (ORDER BY da.assigned_channel) as preferred_channel,
        MAX(da.created_at) as last_assignment_date
    FROM distribution_assignments da
    WHERE 
        da.customer_id = customer_id_param
        AND da.tenant_id = tenant_id_param
    GROUP BY customer_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function for rule performance metrics
CREATE OR REPLACE FUNCTION get_rule_performance_metrics(rule_id_param UUID, days INTEGER DEFAULT 30)
RETURNS TABLE (
    rule_id UUID,
    usage_count INTEGER,
    success_rate NUMERIC,
    avg_processing_time INTEGER,
    total_processed NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        da.rule_id,
        COUNT(*) as usage_count,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE WHEN da.distribution_status = 'DELIVERED' THEN 1 END) * 100.0 / COUNT(*))
            ELSE 0
        END as success_rate,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                EXTRACT(EPOCH FROM (AVG(da.delivered_at - da.created_at)))
            ELSE 0
        END as avg_processing_time,
        SUM(CASE WHEN da.total_amount IS NOT NULL THEN da.total_amount ELSE 0 END) as total_processed
    FROM distribution_assignments da
    WHERE 
        da.rule_id = rule_id_param
        AND da.created_at >= CURRENT_DATE - INTERVAL (days || ' days')
    GROUP BY da.rule_id;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_distribution_assignments_created_at ON distribution_assignments(created_at);
CREATE INDEX IF NOT EXISTS idx_distribution_assignments_total_amount ON distribution_assignments(total_amount);
CREATE INDEX IF NOT EXISTS idx_distribution_records_created_at ON distribution_records(created_at);
CREATE INDEX IF NOT EXISTS idx_recipient_contacts_created_at ON recipient_contacts(created_at);
CREATE INDEX IF NOT EXISTS idx_follow_up_sequences_created_at ON follow_up_sequences(created_at);

-- Create function for data cleanup (old records)
CREATE OR REPLACE FUNCTION cleanup_old_distribution_logs(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM distribution_audit_log 
    WHERE changed_at < CURRENT_DATE - INTERVAL (days_to_keep || ' days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job for cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-distribution-logs', '0 2 * * 0', 'SELECT cleanup_old_distribution_logs(365);');

-- Add comments for documentation
COMMENT ON TABLE distribution_rules IS 'Intelligent distribution rules for automated routing';
COMMENT ON TABLE distribution_assignments IS 'Distribution assignments tracking';
COMMENT ON TABLE distribution_records IS 'Detailed distribution records';
COMMENT ON TABLE recipient_contacts IS 'Contact information for recipients';
COMMENT ON TABLE follow_up_rules IS 'Follow-up automation rules';
COMMENT ON TABLE follow_up_sequences IS 'Follow-up sequence definitions';
COMMENT ON TABLE follow_up_steps IS 'Individual follow-up steps';
COMMENT ON TABLE sender_profiles IS 'Sender profile configurations';

-- Add column comments
COMMENT ON COLUMN distribution_assignments.distribution_status IS 'Current status: PENDING, SENT, DELIVERED, FAILED, CANCELLED';
COMMENT ON COLUMN distribution_assignments.assigned_channel IS 'Distribution channel: EMAIL, SMS, WHATSAPP, POSTAL, EDI, API';
COMMENT ON COLUMN recipient_contacts.channel IS 'Preferred communication channel';
COMMENT ON COLUMN follow_up_rules.trigger_type IS 'Trigger type: TIME_BASED, EVENT_BASED, STATUS_BASED';
COMMENT ON COLUMN sender_profiles.channel IS 'Channel type: EMAIL, SMS, WHATSAPP';

-- Create materialized view for reporting (refresh manually or via cron)
CREATE MATERIALIZED VIEW IF NOT EXISTS distribution_summary_report AS
SELECT 
    DATE_TRUNC('month', da.created_at) as month,
    da.tenant_id,
    da.assigned_channel,
    COUNT(*) as total_distributions,
    COUNT(CASE WHEN da.distribution_status = 'DELIVERED' THEN 1 END) as successful_distributions,
    COUNT(CASE WHEN da.distribution_status = 'FAILED' THEN 1 END) as failed_distributions,
    SUM(CASE WHEN da.total_amount IS NOT NULL THEN da.total_amount ELSE 0 END) as total_amount_processed,
    AVG(EXTRACT(EPOCH FROM (da.delivered_at - da.sent_at))) as avg_delivery_time_seconds
FROM distribution_assignments da
GROUP BY DATE_TRUNC('month', da.created_at), da.tenant_id, da.assigned_channel;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_distribution_summary_report_month ON distribution_summary_report(month);
CREATE INDEX IF NOT EXISTS idx_distribution_summary_report_tenant ON distribution_summary_report(tenant_id);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_distribution_summary_report()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY distribution_summary_report;
END;
$$ LANGUAGE plpgsql;
