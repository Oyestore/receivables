-- Module 03: Payment Integration - Initial Database Schema
-- Created: 2025-01-12
-- Purpose: Complete database schema for payment integration module

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE payment_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'REFUNDED',
    'PARTIALLY_REFUNDED'
);

CREATE TYPE payment_method AS ENUM (
    'CREDIT_CARD',
    'DEBIT_CARD',
    'NET_BANKING',
    'UPI',
    'WALLET',
    'BANK_TRANSFER',
    'CHEQUE',
    'CASH',
    'VOICE_PAYMENT',
    'SMS_PAYMENT'
);

CREATE TYPE gateway_provider AS ENUM (
    'RAZORPAY',
    'PAYU',
    'CCAVENUE',
    'STRIPE',
    'PAYPAL',
    'UPI_PROVIDER',
    'VOICE_PROVIDER',
    'SMS_PROVIDER'
);

CREATE TYPE transaction_type AS ENUM (
    'PAYMENT',
    'REFUND',
    'CHARGEBACK',
    'DISPUTE',
    'FEE',
    'PENALTY'
);

CREATE TYPE fraud_risk_level AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

-- Core Payment Tables

-- Payment Gateways Configuration
CREATE TABLE payment_gateways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    provider gateway_provider NOT NULL,
    api_key_encrypted TEXT,
    api_secret_encrypted TEXT,
    webhook_secret_encrypted TEXT,
    environment VARCHAR(20) DEFAULT 'sandbox',
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    supported_methods JSONB DEFAULT '[]',
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Payment Methods
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gateway_id UUID REFERENCES payment_gateways(id) ON DELETE CASCADE,
    method payment_method NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    configuration JSONB DEFAULT '{}',
    fees JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment Transactions
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    gateway_id UUID REFERENCES payment_gateways(id),
    gateway_transaction_id VARCHAR(100),
    method payment_method NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status payment_status DEFAULT 'PENDING',
    customer_id UUID,
    invoice_id UUID,
    order_id VARCHAR(100),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    fraud_score DECIMAL(5,2) DEFAULT 0,
    fraud_risk_level fraud_risk_level DEFAULT 'LOW',
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    refund_amount DECIMAL(12,2) DEFAULT 0,
    fees JSONB DEFAULT '{}',
    taxes JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment History (Audit Trail)
CREATE TABLE payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,
    old_status payment_status,
    new_status payment_status NOT NULL,
    changed_by VARCHAR(100),
    change_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Voice Payment Records
CREATE TABLE voice_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,
    customer_phone VARCHAR(20) NOT NULL,
    voice_file_path TEXT,
    transcript TEXT,
    confidence_score DECIMAL(5,2),
    language VARCHAR(10) DEFAULT 'en',
    duration_seconds INTEGER,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_method VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SMS Payment Records
CREATE TABLE sms_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,
    customer_phone VARCHAR(20) NOT NULL,
    sms_message TEXT,
    sms_id VARCHAR(100),
    delivery_status VARCHAR(20),
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Installment Plans
CREATE TABLE installment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,
    total_amount DECIMAL(12,2) NOT NULL,
    number_of_installments INTEGER NOT NULL,
    installment_amount DECIMAL(12,2) NOT NULL,
    frequency VARCHAR(20) DEFAULT 'monthly',
    next_due_date DATE,
    completed_installments INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Installment Payments
CREATE TABLE installment_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES installment_plans(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    transaction_id UUID REFERENCES payment_transactions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Discount Applications
CREATE TABLE discount_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,
    discount_code VARCHAR(50),
    discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed', 'early_payment'
    discount_value DECIMAL(12,2) NOT NULL,
    original_amount DECIMAL(12,2) NOT NULL,
    discounted_amount DECIMAL(12,2) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Late Fee Applications
CREATE TABLE late_fee_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,
    fee_type VARCHAR(20) NOT NULL, -- 'fixed', 'percentage'
    fee_value DECIMAL(12,2) NOT NULL,
    base_amount DECIMAL(12,2) NOT NULL,
    fee_amount DECIMAL(12,2) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    is_paid BOOLEAN DEFAULT false
);

-- Payment Patterns (for ML)
CREATE TABLE payment_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL,
    pattern_type VARCHAR(50) NOT NULL, -- 'payment_frequency', 'amount_range', 'preferred_method'
    pattern_data JSONB NOT NULL,
    confidence_score DECIMAL(5,2),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment Metrics
CREATE TABLE payment_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_date DATE NOT NULL,
    total_transactions INTEGER DEFAULT 0,
    successful_transactions INTEGER DEFAULT 0,
    failed_transactions INTEGER DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    average_transaction_value DECIMAL(12,2) DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    gateway_breakdown JSONB DEFAULT '{}',
    method_breakdown JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Intelligence Records
CREATE TABLE ai_intelligence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'customer', 'transaction', 'pattern'
    entity_id UUID NOT NULL,
    intelligence_type VARCHAR(50) NOT NULL, -- 'fraud_prediction', 'payment_forecast', 'recommendation'
    prediction JSONB NOT NULL,
    confidence_score DECIMAL(5,2),
    model_version VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Accounting Integration Tables

-- Accounting System Configurations
CREATE TABLE accounting_systems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'zoho', 'quickbooks', 'busy', 'tally', 'marg'
    api_endpoint TEXT,
    api_key_encrypted TEXT,
    api_secret_encrypted TEXT,
    oauth_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    company_id VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Accounting Integration Mappings
CREATE TABLE accounting_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    accounting_system_id UUID REFERENCES accounting_systems(id) ON DELETE CASCADE,
    local_entity VARCHAR(100) NOT NULL, -- 'payment_transaction', 'customer', 'invoice'
    remote_entity VARCHAR(100) NOT NULL,
    field_mappings JSONB DEFAULT '{}',
    sync_direction VARCHAR(20) DEFAULT 'bidirectional', -- 'import', 'export', 'bidirectional'
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Accounting Sync Logs
CREATE TABLE accounting_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    accounting_system_id UUID REFERENCES accounting_systems(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'entity'
    entity_type VARCHAR(50),
    entity_id UUID,
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'partial'
    records_processed INTEGER DEFAULT 0,
    records_success INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '{}',
    sync_started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sync_completed_at TIMESTAMP WITH TIME ZONE
);

-- Create Indexes

-- Payment Transactions Indexes
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_customer_id ON payment_transactions(customer_id);
CREATE INDEX idx_payment_transactions_invoice_id ON payment_transactions(invoice_id);
CREATE INDEX idx_payment_transactions_gateway_id ON payment_transactions(gateway_id);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at);
CREATE INDEX idx_payment_transactions_amount ON payment_transactions(amount);
CREATE INDEX idx_payment_transactions_fraud_risk ON payment_transactions(fraud_risk_level);

-- Payment History Indexes
CREATE INDEX idx_payment_history_transaction_id ON payment_history(transaction_id);
CREATE INDEX idx_payment_history_created_at ON payment_history(created_at);

-- Voice Payments Indexes
CREATE INDEX idx_voice_payments_transaction_id ON voice_payments(transaction_id);
CREATE INDEX idx_voice_payments_customer_phone ON voice_payments(customer_phone);

-- SMS Payments Indexes
CREATE INDEX idx_sms_payments_transaction_id ON sms_payments(transaction_id);
CREATE INDEX idx_sms_payments_customer_phone ON sms_payments(customer_phone);

-- Installment Plans Indexes
CREATE INDEX idx_installment_plans_transaction_id ON installment_plans(transaction_id);
CREATE INDEX idx_installment_plans_next_due_date ON installment_plans(next_due_date);

-- Payment Metrics Indexes
CREATE INDEX idx_payment_metrics_date ON payment_metrics(metric_date);

-- AI Intelligence Indexes
CREATE INDEX idx_ai_intelligence_entity ON ai_intelligence(entity_type, entity_id);
CREATE INDEX idx_ai_intelligence_type ON ai_intelligence(intelligence_type);
CREATE INDEX idx_ai_intelligence_created_at ON ai_intelligence(created_at);

-- Accounting Integration Indexes
CREATE INDEX idx_accounting_systems_type ON accounting_systems(type);
CREATE INDEX idx_accounting_mappings_system_id ON accounting_mappings(accounting_system_id);
CREATE INDEX idx_accounting_sync_logs_system_id ON accounting_sync_logs(accounting_system_id);
CREATE INDEX idx_accounting_sync_logs_created_at ON accounting_sync_logs(sync_started_at);

-- Create Triggers and Functions

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_gateways_updated_at BEFORE UPDATE ON payment_gateways FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_installment_plans_updated_at BEFORE UPDATE ON installment_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_patterns_updated_at BEFORE UPDATE ON payment_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounting_systems_updated_at BEFORE UPDATE ON accounting_systems FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounting_mappings_updated_at BEFORE UPDATE ON accounting_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Payment History Trigger
CREATE OR REPLACE FUNCTION log_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO payment_history (transaction_id, old_status, new_status, changed_by, change_reason)
        VALUES (NEW.id, OLD.status, NEW.status, current_user, 'Status updated');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER payment_status_change_log AFTER UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION log_payment_status_change();

-- Materialized Views for Analytics

-- Daily Payment Summary
CREATE MATERIALIZED VIEW daily_payment_summary AS
SELECT 
    DATE(created_at) as payment_date,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as successful_transactions,
    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_transactions,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount,
    SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END) as successful_amount,
    ROUND(
        (COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
    ) as success_rate
FROM payment_transactions
GROUP BY DATE(created_at);

-- Gateway Performance
CREATE MATERIALIZED VIEW gateway_performance AS
SELECT 
    pg.name as gateway_name,
    pg.provider,
    COUNT(pt.id) as total_transactions,
    COUNT(CASE WHEN pt.status = 'COMPLETED' THEN 1 END) as successful_transactions,
    SUM(pt.amount) as total_amount,
    AVG(pt.amount) as average_amount,
    ROUND(
        (COUNT(CASE WHEN pt.status = 'COMPLETED' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
    ) as success_rate,
    AVG(pt.fraud_score) as average_fraud_score
FROM payment_gateways pg
LEFT JOIN payment_transactions pt ON pg.id = pt.gateway_id
GROUP BY pg.id, pg.name, pg.provider;

-- Method Performance
CREATE MATERIALIZED VIEW method_performance AS
SELECT 
    method,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as successful_transactions,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount,
    ROUND(
        (COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
    ) as success_rate
FROM payment_transactions
GROUP BY method;

-- Create indexes for materialized views
CREATE INDEX idx_daily_payment_summary_date ON daily_payment_summary(payment_date);
CREATE INDEX idx_gateway_performance_gateway ON gateway_performance(gateway_name);
CREATE INDEX idx_method_performance_method ON method_performance(method);

-- Create refresh functions
CREATE OR REPLACE FUNCTION refresh_payment_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW daily_payment_summary;
    REFRESH MATERIALIZED VIEW gateway_performance;
    REFRESH MATERIALIZED VIEW method_performance;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE payment_transactions IS 'Core payment transaction records';
COMMENT ON TABLE payment_gateways IS 'Payment gateway configurations';
COMMENT ON TABLE payment_methods IS 'Available payment methods per gateway';
COMMENT ON TABLE voice_payments IS 'Voice payment transaction details';
COMMENT ON TABLE sms_payments IS 'SMS payment transaction details';
COMMENT ON TABLE installment_plans IS 'Installment payment plan details';
COMMENT ON TABLE ai_intelligence IS 'AI-powered insights and predictions';
COMMENT ON TABLE accounting_systems IS 'External accounting system configurations';
COMMENT ON MATERIALIZED VIEW daily_payment_summary IS 'Daily payment analytics summary';
COMMENT ON MATERIALIZED VIEW gateway_performance IS 'Payment gateway performance metrics';
COMMENT ON MATERIALIZED VIEW method_performance IS 'Payment method performance metrics';
