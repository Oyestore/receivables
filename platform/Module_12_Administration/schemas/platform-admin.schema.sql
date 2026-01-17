-- =====================================================================================
-- SME Receivables Management Platform - Administrative Module Database Schema
-- Platform-Level Administrative Schema (Tier 1)
-- 
-- @description: Comprehensive database schema for platform-level administrative operations
-- @version: 1.0.0
-- @created: 2025-01-21
-- @author: SME Platform Development Team
-- =====================================================================================

-- Create dedicated schema for platform administration
CREATE SCHEMA IF NOT EXISTS admin_platform;

-- Set search path for this session
SET search_path TO admin_platform, public;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================================
-- SUBSCRIPTION PLANS AND PRICING MANAGEMENT
-- =====================================================================================

-- Subscription plans table for billing and access control
CREATE TABLE subscription_plans (
    plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_name VARCHAR(255) NOT NULL UNIQUE,
    plan_type VARCHAR(50) NOT NULL 
        CHECK (plan_type IN ('subscription', 'usage', 'hybrid', 'enterprise', 'trial', 'freemium')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'deprecated', 'archived')),
    base_price DECIMAL(12,2) DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    billing_cycle VARCHAR(50) 
        CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual', 'usage_based', 'one_time')),
    effective_date TIMESTAMP WITH TIME ZONE,
    expiration_date TIMESTAMP WITH TIME ZONE,
    feature_set JSONB NOT NULL DEFAULT '{}',
    usage_limits JSONB NOT NULL DEFAULT '{}',
    pricing_rules JSONB NOT NULL DEFAULT '{}',
    target_segments JSONB NOT NULL DEFAULT '[]',
    description TEXT,
    terms_and_conditions TEXT,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}'
);

-- Plan features table for granular feature control
CREATE TABLE plan_features (
    feature_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    feature_name VARCHAR(255) NOT NULL,
    access_level VARCHAR(50) NOT NULL DEFAULT 'read'
        CHECK (access_level IN ('none', 'read', 'write', 'admin', 'owner')),
    usage_limit INTEGER DEFAULT -1, -- -1 means unlimited
    feature_config JSONB DEFAULT '{}',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_plan_features_plan FOREIGN KEY (plan_id) 
        REFERENCES subscription_plans(plan_id) ON DELETE CASCADE,
    UNIQUE(plan_id, module_name, feature_name)
);

-- Usage rates table for usage-based billing
CREATE TABLE usage_rates (
    rate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    rate_type VARCHAR(50) NOT NULL
        CHECK (rate_type IN ('per_transaction', 'per_user', 'per_gb', 'per_hour', 'per_api_call')),
    rate_amount DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
    included_quantity INTEGER NOT NULL DEFAULT 0,
    overage_rate DECIMAL(10,4) DEFAULT 0.0000,
    billing_unit VARCHAR(50) NOT NULL,
    tier_pricing JSONB DEFAULT '[]', -- For tiered pricing structures
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usage_rates_plan FOREIGN KEY (plan_id) 
        REFERENCES subscription_plans(plan_id) ON DELETE CASCADE
);

-- =====================================================================================
-- TENANT MANAGEMENT
-- =====================================================================================

-- Main tenants table for organization management
CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL
        CHECK (business_type IN ('sole_proprietorship', 'partnership', 'private_limited', 
               'public_limited', 'llp', 'trust', 'society', 'cooperative', 'government', 'ngo')),
    status VARCHAR(50) NOT NULL DEFAULT 'provisioning'
        CHECK (status IN ('provisioning', 'active', 'suspended', 'terminated', 
               'pending_activation', 'under_review', 'migration_in_progress')),
    subscription_plan_id UUID NOT NULL,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activated_date TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE,
    compliance_status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (compliance_status IN ('pending', 'compliant', 'non_compliant', 
               'under_review', 'remediation_required', 'exempted')),
    data_residency VARCHAR(100) NOT NULL DEFAULT 'default'
        CHECK (data_residency IN ('default', 'india', 'singapore', 'uae', 
               'us_east', 'eu_west', 'custom')),
    custom_domain VARCHAR(255),
    resource_limits JSONB NOT NULL DEFAULT '{}',
    configuration JSONB NOT NULL DEFAULT '{}',
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    CONSTRAINT fk_tenants_subscription_plan FOREIGN KEY (subscription_plan_id) 
        REFERENCES subscription_plans(plan_id),
    CONSTRAINT unique_organization_name UNIQUE (organization_name),
    CONSTRAINT unique_custom_domain UNIQUE (custom_domain)
);

-- Tenant contacts table for organization contact management
CREATE TABLE tenant_contacts (
    contact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    contact_type VARCHAR(50) NOT NULL
        CHECK (contact_type IN ('primary', 'billing', 'technical', 'legal', 'compliance', 'emergency')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    department VARCHAR(100),
    job_title VARCHAR(100),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    CONSTRAINT fk_tenant_contacts_tenant FOREIGN KEY (tenant_id) 
        REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Tenant configurations table for detailed configuration management
CREATE TABLE tenant_configurations (
    config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    config_category VARCHAR(100) NOT NULL,
    config_key VARCHAR(255) NOT NULL,
    config_value JSONB NOT NULL,
    is_encrypted BOOLEAN NOT NULL DEFAULT false,
    is_sensitive BOOLEAN NOT NULL DEFAULT false,
    version INTEGER NOT NULL DEFAULT 1,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiration_date TIMESTAMP WITH TIME ZONE,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    CONSTRAINT fk_tenant_configurations_tenant FOREIGN KEY (tenant_id) 
        REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    CONSTRAINT unique_tenant_config UNIQUE (tenant_id, config_category, config_key)
);

-- =====================================================================================
-- BILLING AND SUBSCRIPTION MANAGEMENT
-- =====================================================================================

-- Tenant subscriptions table for subscription lifecycle management
CREATE TABLE tenant_subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    plan_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'cancelled', 'expired', 'trial', 'pending')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE,
    trial_end_date TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    billing_cycle VARCHAR(50) NOT NULL,
    next_billing_date TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    current_period_end TIMESTAMP WITH TIME ZONE,
    custom_pricing JSONB DEFAULT '{}',
    usage_tracking JSONB DEFAULT '{}',
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    CONSTRAINT fk_tenant_subscriptions_tenant FOREIGN KEY (tenant_id) 
        REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_tenant_subscriptions_plan FOREIGN KEY (plan_id) 
        REFERENCES subscription_plans(plan_id),
    CONSTRAINT unique_active_subscription UNIQUE (tenant_id, status) 
        DEFERRABLE INITIALLY DEFERRED
);

-- Billing information table for payment and billing details
CREATE TABLE tenant_billing_info (
    billing_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    billing_email VARCHAR(255) NOT NULL,
    billing_address JSONB NOT NULL DEFAULT '{}',
    payment_methods JSONB NOT NULL DEFAULT '[]',
    tax_information JSONB DEFAULT '{}',
    billing_preferences JSONB DEFAULT '{}',
    current_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    credit_limit DECIMAL(12,2) DEFAULT 0.00,
    payment_terms INTEGER NOT NULL DEFAULT 30, -- days
    auto_pay_enabled BOOLEAN NOT NULL DEFAULT false,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    CONSTRAINT fk_tenant_billing_info_tenant FOREIGN KEY (tenant_id) 
        REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    CONSTRAINT unique_tenant_billing UNIQUE (tenant_id)
);

-- Usage tracking table for billing calculations
CREATE TABLE usage_tracking (
    usage_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    subscription_id UUID NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
    metric_unit VARCHAR(50) NOT NULL,
    billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    recorded_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    additional_data JSONB DEFAULT '{}',
    CONSTRAINT fk_usage_tracking_tenant FOREIGN KEY (tenant_id) 
        REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_usage_tracking_subscription FOREIGN KEY (subscription_id) 
        REFERENCES tenant_subscriptions(subscription_id) ON DELETE CASCADE
);

-- =====================================================================================
-- PLATFORM ADMINISTRATION AND MONITORING
-- =====================================================================================

-- Platform administrators table
CREATE TABLE platform_administrators (
    admin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin'
        CHECK (role IN ('super_admin', 'admin', 'billing_admin', 'support_admin', 'read_only')),
    status VARCHAR(50) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'suspended', 'locked')),
    password_hash VARCHAR(255) NOT NULL,
    mfa_enabled BOOLEAN NOT NULL DEFAULT true,
    mfa_secret VARCHAR(255),
    last_login TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    permissions JSONB NOT NULL DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    CONSTRAINT valid_admin_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Platform audit logs table for comprehensive tracking
CREATE TABLE platform_audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    user_id UUID,
    admin_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    details JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    severity VARCHAR(20) NOT NULL DEFAULT 'info'
        CHECK (severity IN ('low', 'medium', 'high', 'critical', 'emergency')),
    outcome VARCHAR(20) NOT NULL DEFAULT 'success'
        CHECK (outcome IN ('success', 'failure', 'error', 'warning')),
    duration_ms INTEGER,
    correlation_id UUID,
    CONSTRAINT fk_platform_audit_logs_tenant FOREIGN KEY (tenant_id) 
        REFERENCES tenants(tenant_id) ON DELETE SET NULL,
    CONSTRAINT fk_platform_audit_logs_admin FOREIGN KEY (admin_id) 
        REFERENCES platform_administrators(admin_id) ON DELETE SET NULL
);

-- Platform metrics table for performance monitoring
CREATE TABLE platform_metrics (
    metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(50) NOT NULL,
    metric_type VARCHAR(50) NOT NULL
        CHECK (metric_type IN ('counter', 'gauge', 'histogram', 'summary')),
    labels JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID,
    aggregation_period VARCHAR(20)
        CHECK (aggregation_period IN ('minute', 'hour', 'day', 'week', 'month')),
    CONSTRAINT fk_platform_metrics_tenant FOREIGN KEY (tenant_id) 
        REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

-- System configuration table for platform settings
CREATE TABLE system_configuration (
    config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_category VARCHAR(100) NOT NULL,
    config_key VARCHAR(255) NOT NULL,
    config_value JSONB NOT NULL,
    is_encrypted BOOLEAN NOT NULL DEFAULT false,
    is_sensitive BOOLEAN NOT NULL DEFAULT false,
    environment VARCHAR(50) NOT NULL DEFAULT 'production'
        CHECK (environment IN ('development', 'testing', 'staging', 'production', 'sandbox')),
    version INTEGER NOT NULL DEFAULT 1,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiration_date TIMESTAMP WITH TIME ZONE,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    CONSTRAINT unique_system_config UNIQUE (config_category, config_key, environment)
);

-- =====================================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================================================

-- Subscription plans indexes
CREATE INDEX idx_subscription_plans_status ON subscription_plans(status);
CREATE INDEX idx_subscription_plans_type ON subscription_plans(plan_type);
CREATE INDEX idx_subscription_plans_effective_date ON subscription_plans(effective_date);

-- Plan features indexes
CREATE INDEX idx_plan_features_plan_id ON plan_features(plan_id);
CREATE INDEX idx_plan_features_module ON plan_features(module_name);

-- Usage rates indexes
CREATE INDEX idx_usage_rates_plan_id ON usage_rates(plan_id);
CREATE INDEX idx_usage_rates_module ON usage_rates(module_name);

-- Tenants indexes
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_created_date ON tenants(created_date);
CREATE INDEX idx_tenants_organization_name ON tenants(organization_name);
CREATE INDEX idx_tenants_subscription_plan ON tenants(subscription_plan_id);
CREATE INDEX idx_tenants_last_activity ON tenants(last_activity);
CREATE INDEX idx_tenants_compliance_status ON tenants(compliance_status);

-- Tenant contacts indexes
CREATE INDEX idx_tenant_contacts_tenant_id ON tenant_contacts(tenant_id);
CREATE INDEX idx_tenant_contacts_type ON tenant_contacts(contact_type);
CREATE INDEX idx_tenant_contacts_email ON tenant_contacts(email);

-- Tenant configurations indexes
CREATE INDEX idx_tenant_configurations_tenant_id ON tenant_configurations(tenant_id);
CREATE INDEX idx_tenant_configurations_category ON tenant_configurations(config_category);

-- Tenant subscriptions indexes
CREATE INDEX idx_tenant_subscriptions_tenant_id ON tenant_subscriptions(tenant_id);
CREATE INDEX idx_tenant_subscriptions_plan_id ON tenant_subscriptions(plan_id);
CREATE INDEX idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX idx_tenant_subscriptions_billing_date ON tenant_subscriptions(next_billing_date);

-- Billing info indexes
CREATE INDEX idx_tenant_billing_info_tenant_id ON tenant_billing_info(tenant_id);

-- Usage tracking indexes
CREATE INDEX idx_usage_tracking_tenant_id ON usage_tracking(tenant_id);
CREATE INDEX idx_usage_tracking_subscription_id ON usage_tracking(subscription_id);
CREATE INDEX idx_usage_tracking_module ON usage_tracking(module_name);
CREATE INDEX idx_usage_tracking_period ON usage_tracking(billing_period_start, billing_period_end);
CREATE INDEX idx_usage_tracking_recorded_date ON usage_tracking(recorded_date);

-- Platform administrators indexes
CREATE INDEX idx_platform_administrators_username ON platform_administrators(username);
CREATE INDEX idx_platform_administrators_email ON platform_administrators(email);
CREATE INDEX idx_platform_administrators_status ON platform_administrators(status);
CREATE INDEX idx_platform_administrators_role ON platform_administrators(role);

-- Platform audit logs indexes
CREATE INDEX idx_platform_audit_logs_tenant_id ON platform_audit_logs(tenant_id);
CREATE INDEX idx_platform_audit_logs_user_id ON platform_audit_logs(user_id);
CREATE INDEX idx_platform_audit_logs_admin_id ON platform_audit_logs(admin_id);
CREATE INDEX idx_platform_audit_logs_action ON platform_audit_logs(action);
CREATE INDEX idx_platform_audit_logs_timestamp ON platform_audit_logs(timestamp);
CREATE INDEX idx_platform_audit_logs_resource ON platform_audit_logs(resource_type, resource_id);
CREATE INDEX idx_platform_audit_logs_severity ON platform_audit_logs(severity);

-- Platform metrics indexes
CREATE INDEX idx_platform_metrics_name ON platform_metrics(metric_name);
CREATE INDEX idx_platform_metrics_timestamp ON platform_metrics(timestamp);
CREATE INDEX idx_platform_metrics_tenant_id ON platform_metrics(tenant_id);
CREATE INDEX idx_platform_metrics_type ON platform_metrics(metric_type);

-- System configuration indexes
CREATE INDEX idx_system_configuration_category ON system_configuration(config_category);
CREATE INDEX idx_system_configuration_environment ON system_configuration(environment);
CREATE INDEX idx_system_configuration_effective_date ON system_configuration(effective_date);

-- =====================================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================================================

-- Function to update the updated_date column
CREATE OR REPLACE FUNCTION update_updated_date_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_date = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_date trigger to relevant tables
CREATE TRIGGER update_subscription_plans_updated_date 
    BEFORE UPDATE ON subscription_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_tenants_updated_date 
    BEFORE UPDATE ON tenants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_tenant_contacts_updated_date 
    BEFORE UPDATE ON tenant_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_tenant_configurations_updated_date 
    BEFORE UPDATE ON tenant_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_tenant_subscriptions_updated_date 
    BEFORE UPDATE ON tenant_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_tenant_billing_info_updated_date 
    BEFORE UPDATE ON tenant_billing_info 
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_platform_administrators_updated_date 
    BEFORE UPDATE ON platform_administrators 
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_system_configuration_updated_date 
    BEFORE UPDATE ON system_configuration 
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

-- =====================================================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================================================

-- Comprehensive tenant view with subscription and billing information
CREATE VIEW tenant_overview AS
SELECT 
    t.tenant_id,
    t.organization_name,
    t.business_type,
    t.status,
    t.created_date,
    t.activated_date,
    t.last_activity,
    t.compliance_status,
    t.data_residency,
    sp.plan_name,
    sp.plan_type,
    ts.status as subscription_status,
    ts.next_billing_date,
    tbi.current_balance,
    tbi.currency,
    (SELECT COUNT(*) FROM admin_tenant.users WHERE tenant_id = t.tenant_id) as user_count,
    (SELECT json_agg(json_build_object('type', contact_type, 'name', first_name || ' ' || last_name, 'email', email))
     FROM tenant_contacts WHERE tenant_id = t.tenant_id AND is_active = true) as contacts
FROM tenants t
LEFT JOIN subscription_plans sp ON t.subscription_plan_id = sp.plan_id
LEFT JOIN tenant_subscriptions ts ON t.tenant_id = ts.tenant_id AND ts.status = 'active'
LEFT JOIN tenant_billing_info tbi ON t.tenant_id = tbi.tenant_id;

-- Platform metrics summary view
CREATE VIEW platform_metrics_summary AS
SELECT 
    metric_name,
    metric_type,
    COUNT(*) as measurement_count,
    AVG(metric_value) as avg_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    DATE_TRUNC('day', timestamp) as measurement_date
FROM platform_metrics
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY metric_name, metric_type, DATE_TRUNC('day', timestamp)
ORDER BY measurement_date DESC, metric_name;

-- =====================================================================================
-- INITIAL DATA SETUP
-- =====================================================================================

-- Insert default subscription plans
INSERT INTO subscription_plans (plan_name, plan_type, status, base_price, currency, billing_cycle, feature_set, usage_limits, created_by) VALUES
('Starter', 'subscription', 'active', 99.00, 'USD', 'monthly', 
 '{"modules": ["invoice_generation", "customer_relationship"], "features": {"basic_reporting": true, "email_support": true}}',
 '{"users": 5, "storage": 10, "api_calls": 10000}',
 uuid_generate_v4()),
('Professional', 'subscription', 'active', 299.00, 'USD', 'monthly',
 '{"modules": ["invoice_generation", "customer_relationship", "payment_integration", "financial_analytics"], "features": {"advanced_reporting": true, "priority_support": true, "api_access": true}}',
 '{"users": 25, "storage": 100, "api_calls": 100000}',
 uuid_generate_v4()),
('Enterprise', 'enterprise', 'active', 999.00, 'USD', 'monthly',
 '{"modules": ["all"], "features": {"custom_branding": true, "dedicated_support": true, "sso": true, "advanced_security": true}}',
 '{"users": -1, "storage": -1, "api_calls": -1}',
 uuid_generate_v4());

-- Insert default system configuration
INSERT INTO system_configuration (config_category, config_key, config_value, created_by) VALUES
('platform', 'max_tenants', '10000', uuid_generate_v4()),
('platform', 'max_users_per_tenant', '1000', uuid_generate_v4()),
('security', 'session_timeout', '3600', uuid_generate_v4()),
('security', 'max_login_attempts', '5', uuid_generate_v4()),
('billing', 'default_currency', '"USD"', uuid_generate_v4()),
('billing', 'payment_terms_days', '30', uuid_generate_v4());

-- =====================================================================================
-- SCHEMA VALIDATION AND COMMENTS
-- =====================================================================================

-- Add table comments for documentation
COMMENT ON SCHEMA admin_platform IS 'Platform-level administrative schema for SME Receivables Management Platform';

COMMENT ON TABLE subscription_plans IS 'Subscription plans and pricing models for tenant billing';
COMMENT ON TABLE plan_features IS 'Feature definitions and access levels for subscription plans';
COMMENT ON TABLE usage_rates IS 'Usage-based pricing rates for billing calculations';
COMMENT ON TABLE tenants IS 'Tenant organizations and their basic information';
COMMENT ON TABLE tenant_contacts IS 'Contact information for tenant organizations';
COMMENT ON TABLE tenant_configurations IS 'Detailed configuration settings for tenants';
COMMENT ON TABLE tenant_subscriptions IS 'Active subscriptions and billing cycles for tenants';
COMMENT ON TABLE tenant_billing_info IS 'Billing and payment information for tenants';
COMMENT ON TABLE usage_tracking IS 'Usage metrics tracking for billing calculations';
COMMENT ON TABLE platform_administrators IS 'Platform administrators and their access levels';
COMMENT ON TABLE platform_audit_logs IS 'Comprehensive audit trail for platform operations';
COMMENT ON TABLE platform_metrics IS 'Performance and operational metrics for monitoring';
COMMENT ON TABLE system_configuration IS 'System-wide configuration settings';

-- Schema creation completed successfully
SELECT 'Platform administrative schema created successfully' as status;

