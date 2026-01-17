-- =====================================================================================
-- SME Receivables Management Platform - Administrative Module Database Schema
-- Tenant-Level Administrative Schema (Tier 2)
-- 
-- @description: Comprehensive database schema for tenant-level administrative operations
-- @version: 1.0.0
-- @created: 2025-01-21
-- @author: SME Platform Development Team
-- =====================================================================================

-- Create dedicated schema for tenant administration
CREATE SCHEMA IF NOT EXISTS admin_tenant;

-- Set search path for this session
SET search_path TO admin_tenant, public;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================================
-- USER MANAGEMENT AND AUTHENTICATION
-- =====================================================================================

-- Users table for tenant-level user management
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    department VARCHAR(100),
    job_title VARCHAR(100),
    employee_id VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'suspended', 'deactivated', 'locked', 
               'password_expired', 'pending_verification')),
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activated_date TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    password_hash VARCHAR(255) NOT NULL,
    password_changed_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    password_expires_date TIMESTAMP WITH TIME ZONE,
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret VARCHAR(255),
    mfa_backup_codes JSONB DEFAULT '[]',
    login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    preferences JSONB NOT NULL DEFAULT '{}',
    profile_picture_url VARCHAR(500),
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    CONSTRAINT unique_tenant_username UNIQUE (tenant_id, username),
    CONSTRAINT unique_tenant_email UNIQUE (tenant_id, email),
    CONSTRAINT unique_tenant_employee_id UNIQUE (tenant_id, employee_id),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$')
);

-- User sessions table for session management
CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    location_info JSONB DEFAULT '{}',
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    logout_reason VARCHAR(100),
    CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE CASCADE
);

-- User preferences table for detailed user customization
CREATE TABLE user_preferences (
    preference_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    preference_category VARCHAR(100) NOT NULL,
    preference_key VARCHAR(255) NOT NULL,
    preference_value JSONB NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT unique_user_preference UNIQUE (user_id, preference_category, preference_key)
);

-- User activity log for tracking user actions
CREATE TABLE user_activity_log (
    activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    activity_type VARCHAR(100) NOT NULL,
    activity_description TEXT,
    resource_type VARCHAR(100),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER,
    outcome VARCHAR(20) NOT NULL DEFAULT 'success'
        CHECK (outcome IN ('success', 'failure', 'error', 'warning')),
    additional_data JSONB DEFAULT '{}',
    CONSTRAINT fk_user_activity_log_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_activity_log_session FOREIGN KEY (session_id) 
        REFERENCES user_sessions(session_id) ON DELETE SET NULL
);

-- =====================================================================================
-- ROLE AND PERMISSION MANAGEMENT
-- =====================================================================================

-- Roles table for access control
CREATE TABLE roles (
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    role_name VARCHAR(255) NOT NULL,
    role_description TEXT,
    role_type VARCHAR(50) NOT NULL DEFAULT 'custom'
        CHECK (role_type IN ('system', 'custom', 'inherited', 'temporary', 'delegated')),
    is_system_role BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    permissions JSONB NOT NULL DEFAULT '{}',
    conditions JSONB DEFAULT '{}',
    inheritance JSONB DEFAULT '{}',
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT unique_tenant_role_name UNIQUE (tenant_id, role_name)
);

-- Role permissions table for granular permission management
CREATE TABLE role_permissions (
    permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    permission_type VARCHAR(50) NOT NULL
        CHECK (permission_type IN ('create', 'read', 'update', 'delete', 'execute', 
               'approve', 'export', 'import', 'configure', 'monitor')),
    permission_scope JSONB DEFAULT '{}',
    conditions JSONB DEFAULT '{}',
    is_granted BOOLEAN NOT NULL DEFAULT true,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiration_date TIMESTAMP WITH TIME ZONE,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) 
        REFERENCES roles(role_id) ON DELETE CASCADE,
    CONSTRAINT unique_role_permission UNIQUE (role_id, module_name, permission_type)
);

-- User role assignments table
CREATE TABLE user_role_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    assigned_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID NOT NULL,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiration_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    assignment_reason TEXT,
    conditions JSONB DEFAULT '{}',
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    CONSTRAINT fk_user_role_assignments_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_role_assignments_role FOREIGN KEY (role_id) 
        REFERENCES roles(role_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_role_assignments_assigned_by FOREIGN KEY (assigned_by) 
        REFERENCES users(user_id),
    CONSTRAINT unique_active_user_role UNIQUE (user_id, role_id, is_active) 
        DEFERRABLE INITIALLY DEFERRED
);

-- Role hierarchy table for role inheritance
CREATE TABLE role_hierarchy (
    hierarchy_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_role_id UUID NOT NULL,
    child_role_id UUID NOT NULL,
    inheritance_type VARCHAR(50) NOT NULL DEFAULT 'full'
        CHECK (inheritance_type IN ('full', 'partial', 'conditional')),
    inheritance_rules JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    CONSTRAINT fk_role_hierarchy_parent FOREIGN KEY (parent_role_id) 
        REFERENCES roles(role_id) ON DELETE CASCADE,
    CONSTRAINT fk_role_hierarchy_child FOREIGN KEY (child_role_id) 
        REFERENCES roles(role_id) ON DELETE CASCADE,
    CONSTRAINT unique_role_hierarchy UNIQUE (parent_role_id, child_role_id),
    CONSTRAINT no_self_inheritance CHECK (parent_role_id != child_role_id)
);

-- =====================================================================================
-- MODULE ACCESS CONTROL AND BILLING
-- =====================================================================================

-- Module access control table
CREATE TABLE module_access_control (
    access_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    role_id UUID,
    module_name VARCHAR(100) NOT NULL,
    access_level VARCHAR(50) NOT NULL DEFAULT 'none'
        CHECK (access_level IN ('none', 'read', 'write', 'admin', 'owner')),
    features_enabled JSONB DEFAULT '[]',
    usage_limits JSONB DEFAULT '{}',
    restrictions JSONB DEFAULT '{}',
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiration_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    CONSTRAINT fk_module_access_control_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_module_access_control_role FOREIGN KEY (role_id) 
        REFERENCES roles(role_id) ON DELETE CASCADE,
    CONSTRAINT check_user_or_role CHECK ((user_id IS NOT NULL) OR (role_id IS NOT NULL))
);

-- Feature usage tracking table
CREATE TABLE feature_usage_tracking (
    usage_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    feature_name VARCHAR(100) NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 1,
    usage_data JSONB DEFAULT '{}',
    session_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_feature_usage_tracking_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_feature_usage_tracking_session FOREIGN KEY (session_id) 
        REFERENCES user_sessions(session_id) ON DELETE SET NULL
);

-- Tenant billing summary table
CREATE TABLE tenant_billing_summary (
    summary_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    subscription_charges DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    usage_charges DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    overage_charges DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    usage_summary JSONB NOT NULL DEFAULT '{}',
    billing_details JSONB DEFAULT '{}',
    invoice_generated BOOLEAN NOT NULL DEFAULT false,
    invoice_id UUID,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tenant_billing_period UNIQUE (tenant_id, billing_period_start, billing_period_end)
);

-- =====================================================================================
-- NOTIFICATIONS AND COMMUNICATIONS
-- =====================================================================================

-- Notification templates table
CREATE TABLE notification_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL
        CHECK (template_type IN ('email', 'sms', 'push', 'in_app', 'webhook')),
    subject VARCHAR(500),
    body TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_system_template BOOLEAN NOT NULL DEFAULT false,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    CONSTRAINT unique_tenant_template_name UNIQUE (tenant_id, template_name, template_type)
);

-- User notifications table
CREATE TABLE user_notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'critical', 'emergency')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    scheduled_date TIMESTAMP WITH TIME ZONE,
    sent_date TIMESTAMP WITH TIME ZONE,
    read_date TIMESTAMP WITH TIME ZONE,
    delivery_attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    metadata JSONB DEFAULT '{}',
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_notifications_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE CASCADE
);

-- Notification preferences table
CREATE TABLE notification_preferences (
    preference_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    notification_category VARCHAR(100) NOT NULL,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    sms_enabled BOOLEAN NOT NULL DEFAULT false,
    push_enabled BOOLEAN NOT NULL DEFAULT true,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    frequency VARCHAR(50) NOT NULL DEFAULT 'immediate'
        CHECK (frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'never')),
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT unique_user_notification_category UNIQUE (user_id, notification_category)
);

-- =====================================================================================
-- TENANT CONFIGURATION AND CUSTOMIZATION
-- =====================================================================================

-- Tenant settings table
CREATE TABLE tenant_settings (
    setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    setting_category VARCHAR(100) NOT NULL,
    setting_key VARCHAR(255) NOT NULL,
    setting_value JSONB NOT NULL,
    is_encrypted BOOLEAN NOT NULL DEFAULT false,
    is_user_configurable BOOLEAN NOT NULL DEFAULT true,
    validation_rules JSONB DEFAULT '{}',
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    CONSTRAINT unique_tenant_setting UNIQUE (tenant_id, setting_category, setting_key)
);

-- Custom fields table for tenant-specific data
CREATE TABLE custom_fields (
    field_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL
        CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select', 'multi_select', 'file')),
    field_options JSONB DEFAULT '{}',
    is_required BOOLEAN NOT NULL DEFAULT false,
    is_searchable BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    validation_rules JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    CONSTRAINT unique_tenant_custom_field UNIQUE (tenant_id, entity_type, field_name)
);

-- Custom field values table
CREATE TABLE custom_field_values (
    value_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID NOT NULL,
    entity_id UUID NOT NULL,
    field_value JSONB,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    CONSTRAINT fk_custom_field_values_field FOREIGN KEY (field_id) 
        REFERENCES custom_fields(field_id) ON DELETE CASCADE,
    CONSTRAINT unique_field_entity_value UNIQUE (field_id, entity_id)
);

-- =====================================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================================================

-- Users indexes
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_last_login ON users(last_login);
CREATE INDEX idx_users_created_date ON users(created_date);

-- User sessions indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_tenant_id ON user_sessions(tenant_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_date);

-- User preferences indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_category ON user_preferences(preference_category);

-- User activity log indexes
CREATE INDEX idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_tenant_id ON user_activity_log(tenant_id);
CREATE INDEX idx_user_activity_log_timestamp ON user_activity_log(timestamp);
CREATE INDEX idx_user_activity_log_activity_type ON user_activity_log(activity_type);

-- Roles indexes
CREATE INDEX idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX idx_roles_type ON roles(role_type);
CREATE INDEX idx_roles_active ON roles(is_active);

-- Role permissions indexes
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_module ON role_permissions(module_name);

-- User role assignments indexes
CREATE INDEX idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX idx_user_role_assignments_role_id ON user_role_assignments(role_id);
CREATE INDEX idx_user_role_assignments_active ON user_role_assignments(is_active);
CREATE INDEX idx_user_role_assignments_effective_date ON user_role_assignments(effective_date);

-- Module access control indexes
CREATE INDEX idx_module_access_control_tenant_id ON module_access_control(tenant_id);
CREATE INDEX idx_module_access_control_user_id ON module_access_control(user_id);
CREATE INDEX idx_module_access_control_role_id ON module_access_control(role_id);
CREATE INDEX idx_module_access_control_module ON module_access_control(module_name);

-- Feature usage tracking indexes
CREATE INDEX idx_feature_usage_tracking_tenant_id ON feature_usage_tracking(tenant_id);
CREATE INDEX idx_feature_usage_tracking_user_id ON feature_usage_tracking(user_id);
CREATE INDEX idx_feature_usage_tracking_module ON feature_usage_tracking(module_name);
CREATE INDEX idx_feature_usage_tracking_timestamp ON feature_usage_tracking(timestamp);
CREATE INDEX idx_feature_usage_tracking_billing_period ON feature_usage_tracking(billing_period_start, billing_period_end);

-- Tenant billing summary indexes
CREATE INDEX idx_tenant_billing_summary_tenant_id ON tenant_billing_summary(tenant_id);
CREATE INDEX idx_tenant_billing_summary_period ON tenant_billing_summary(billing_period_start, billing_period_end);

-- Notification templates indexes
CREATE INDEX idx_notification_templates_tenant_id ON notification_templates(tenant_id);
CREATE INDEX idx_notification_templates_type ON notification_templates(template_type);
CREATE INDEX idx_notification_templates_active ON notification_templates(is_active);

-- User notifications indexes
CREATE INDEX idx_user_notifications_tenant_id ON user_notifications(tenant_id);
CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_status ON user_notifications(status);
CREATE INDEX idx_user_notifications_scheduled_date ON user_notifications(scheduled_date);

-- Notification preferences indexes
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Tenant settings indexes
CREATE INDEX idx_tenant_settings_tenant_id ON tenant_settings(tenant_id);
CREATE INDEX idx_tenant_settings_category ON tenant_settings(setting_category);

-- Custom fields indexes
CREATE INDEX idx_custom_fields_tenant_id ON custom_fields(tenant_id);
CREATE INDEX idx_custom_fields_entity_type ON custom_fields(entity_type);
CREATE INDEX idx_custom_fields_active ON custom_fields(is_active);

-- Custom field values indexes
CREATE INDEX idx_custom_field_values_field_id ON custom_field_values(field_id);
CREATE INDEX idx_custom_field_values_entity_id ON custom_field_values(entity_id);

-- =====================================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================================================

-- Apply updated_date trigger to relevant tables
CREATE TRIGGER update_users_updated_date 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_user_preferences_updated_date 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_roles_updated_date 
    BEFORE UPDATE ON roles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_user_role_assignments_updated_date 
    BEFORE UPDATE ON user_role_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_module_access_control_updated_date 
    BEFORE UPDATE ON module_access_control 
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_notification_templates_updated_date 
    BEFORE UPDATE ON notification_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_notification_preferences_updated_date 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_tenant_settings_updated_date 
    BEFORE UPDATE ON tenant_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_custom_fields_updated_date 
    BEFORE UPDATE ON custom_fields 
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_custom_field_values_updated_date 
    BEFORE UPDATE ON custom_field_values 
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

-- =====================================================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================================================

-- User overview with roles and permissions
CREATE VIEW user_overview AS
SELECT 
    u.user_id,
    u.tenant_id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    u.department,
    u.job_title,
    u.status,
    u.last_login,
    u.mfa_enabled,
    (SELECT json_agg(json_build_object('role_id', r.role_id, 'role_name', r.role_name, 'role_type', r.role_type))
     FROM user_role_assignments ura 
     JOIN roles r ON ura.role_id = r.role_id 
     WHERE ura.user_id = u.user_id AND ura.is_active = true) as roles,
    (SELECT COUNT(*) FROM user_sessions WHERE user_id = u.user_id AND is_active = true) as active_sessions
FROM users u;

-- Role permissions summary
CREATE VIEW role_permissions_summary AS
SELECT 
    r.role_id,
    r.tenant_id,
    r.role_name,
    r.role_type,
    (SELECT json_agg(json_build_object('module', rp.module_name, 'permission', rp.permission_type, 'granted', rp.is_granted))
     FROM role_permissions rp 
     WHERE rp.role_id = r.role_id) as permissions,
    (SELECT COUNT(*) FROM user_role_assignments WHERE role_id = r.role_id AND is_active = true) as assigned_users
FROM roles r
WHERE r.is_active = true;

-- Module access summary
CREATE VIEW module_access_summary AS
SELECT 
    tenant_id,
    module_name,
    COUNT(DISTINCT user_id) as total_users,
    COUNT(DISTINCT CASE WHEN access_level = 'admin' THEN user_id END) as admin_users,
    COUNT(DISTINCT CASE WHEN access_level = 'write' THEN user_id END) as write_users,
    COUNT(DISTINCT CASE WHEN access_level = 'read' THEN user_id END) as read_users,
    AVG(CASE WHEN is_active THEN 1 ELSE 0 END) as access_rate
FROM module_access_control
GROUP BY tenant_id, module_name;

-- =====================================================================================
-- INITIAL DATA SETUP
-- =====================================================================================

-- Insert default system roles (these will be created per tenant)
-- Note: This is a template - actual roles will be created when tenants are provisioned

-- Insert default notification templates
-- Note: These will be created per tenant during tenant provisioning

-- =====================================================================================
-- SCHEMA VALIDATION AND COMMENTS
-- =====================================================================================

-- Add table comments for documentation
COMMENT ON SCHEMA admin_tenant IS 'Tenant-level administrative schema for SME Receivables Management Platform';

COMMENT ON TABLE users IS 'Tenant users and their authentication information';
COMMENT ON TABLE user_sessions IS 'Active user sessions and session management';
COMMENT ON TABLE user_preferences IS 'User-specific preferences and customizations';
COMMENT ON TABLE user_activity_log IS 'Comprehensive user activity tracking';
COMMENT ON TABLE roles IS 'Role definitions for access control';
COMMENT ON TABLE role_permissions IS 'Granular permissions for roles';
COMMENT ON TABLE user_role_assignments IS 'User to role assignments with temporal control';
COMMENT ON TABLE role_hierarchy IS 'Role inheritance and hierarchy management';
COMMENT ON TABLE module_access_control IS 'Module-level access control and restrictions';
COMMENT ON TABLE feature_usage_tracking IS 'Feature usage tracking for billing and analytics';
COMMENT ON TABLE tenant_billing_summary IS 'Billing summaries and usage calculations';
COMMENT ON TABLE notification_templates IS 'Customizable notification templates';
COMMENT ON TABLE user_notifications IS 'User notifications and delivery tracking';
COMMENT ON TABLE notification_preferences IS 'User notification preferences';
COMMENT ON TABLE tenant_settings IS 'Tenant-specific configuration settings';
COMMENT ON TABLE custom_fields IS 'Custom field definitions for tenant customization';
COMMENT ON TABLE custom_field_values IS 'Values for custom fields';

-- Schema creation completed successfully
SELECT 'Tenant administrative schema created successfully' as status;

