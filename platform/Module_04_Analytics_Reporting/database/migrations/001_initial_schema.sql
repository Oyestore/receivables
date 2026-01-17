-- Module 04: Analytics & Reporting - Database Schema
-- Created: 2025-01-12
-- Purpose: Complete database schema for analytics and reporting module

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS analytics_db;

-- Use the database
\c analytics_db;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create enums
CREATE TYPE dashboard_type AS ENUM ('business', 'financial', 'operational', 'custom');
CREATE TYPE widget_type AS ENUM ('chart', 'table', 'metric', 'text', 'image', 'filter');
CREATE TYPE report_format AS ENUM ('pdf', 'xlsx', 'csv', 'json', 'html');
CREATE TYPE report_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE anomaly_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE insight_type AS ENUM ('trend', 'anomaly', 'prediction', 'recommendation', 'alert');

-- Create tables

-- Dashboards table
CREATE TABLE dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type dashboard_type NOT NULL DEFAULT 'custom',
    layout JSONB NOT NULL DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    version INTEGER DEFAULT 1
);

-- Dashboard widgets table
CREATE TABLE dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type widget_type NOT NULL,
    position JSONB NOT NULL DEFAULT '{}',
    config JSONB NOT NULL DEFAULT '{}',
    data_source JSONB NOT NULL DEFAULT '{}',
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    refresh_interval INTEGER DEFAULT 300, -- seconds
    last_refreshed_at TIMESTAMP WITH TIME ZONE
);

-- Dashboard versions table
CREATE TABLE dashboard_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    layout JSONB NOT NULL DEFAULT '{}',
    widgets JSONB NOT NULL DEFAULT '{}',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    change_description TEXT,
    is_active BOOLEAN DEFAULT false,
    UNIQUE(dashboard_id, version)
);

-- Dashboard collaboration table
CREATE TABLE dashboard_collaboration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer', -- owner, editor, viewer
    permissions JSONB DEFAULT '{}',
    invited_by UUID NOT NULL,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(dashboard_id, user_id)
);

-- Report templates table
CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_config JSONB NOT NULL DEFAULT '{}',
    format report_format NOT NULL DEFAULT 'pdf',
    parameters JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}'
);

-- Report executions table
CREATE TABLE report_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    format report_format NOT NULL DEFAULT 'pdf',
    parameters JSONB DEFAULT '{}',
    status report_status NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    file_path VARCHAR(500),
    file_size BIGINT,
    error_message TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER DEFAULT 0
);

-- Scheduled reports table
CREATE TABLE scheduled_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    schedule_type VARCHAR(50) NOT NULL, -- daily, weekly, monthly, custom
    schedule_config JSONB NOT NULL DEFAULT '{}',
    parameters JSONB DEFAULT '{}',
    recipients JSONB NOT NULL DEFAULT '[]', -- array of email addresses
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE
);

-- Anomaly detection table
CREATE TABLE anomaly_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity anomaly_severity NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,4),
    expected_value DECIMAL(15,4),
    deviation_percentage DECIMAL(5,2),
    confidence_score DECIMAL(5,2),
    data_source VARCHAR(255) NOT NULL,
    detection_config JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active', -- active, resolved, ignored
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}'
);

-- AI insights table
CREATE TABLE ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type insight_type NOT NULL,
    confidence_score DECIMAL(5,2),
    data_sources JSONB DEFAULT '[]',
    insight_data JSONB NOT NULL DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    is_actionable BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'new', -- new, reviewed, implemented, dismissed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[] DEFAULT '{}'
);

-- Analytics events table (for tracking user interactions)
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    user_id UUID,
    session_id VARCHAR(255),
    properties JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics table
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(50),
    tags JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_source VARCHAR(255) NOT NULL
);

-- Create indexes
CREATE INDEX idx_dashboards_created_by ON dashboards(created_by);
CREATE INDEX idx_dashboards_type ON dashboards(type);
CREATE INDEX idx_dashboards_is_active ON dashboards(is_active);
CREATE INDEX idx_dashboards_created_at ON dashboards(created_at);

CREATE INDEX idx_dashboard_widgets_dashboard_id ON dashboard_widgets(dashboard_id);
CREATE INDEX idx_dashboard_widgets_type ON dashboard_widgets(type);
CREATE INDEX idx_dashboard_widgets_is_visible ON dashboard_widgets(is_visible);

CREATE INDEX idx_dashboard_versions_dashboard_id ON dashboard_versions(dashboard_id);
CREATE INDEX idx_dashboard_versions_version ON dashboard_versions(version);
CREATE INDEX idx_dashboard_versions_created_at ON dashboard_versions(created_at);

CREATE INDEX idx_dashboard_collaboration_dashboard_id ON dashboard_collaboration(dashboard_id);
CREATE INDEX idx_dashboard_collaboration_user_id ON dashboard_collaboration(user_id);
CREATE INDEX idx_dashboard_collaboration_role ON dashboard_collaboration(role);

CREATE INDEX idx_report_templates_created_by ON report_templates(created_by);
CREATE INDEX idx_report_templates_category ON report_templates(category);
CREATE INDEX idx_report_templates_is_public ON report_templates(is_public);

CREATE INDEX idx_report_executions_template_id ON report_executions(template_id);
CREATE INDEX idx_report_executions_status ON report_executions(status);
CREATE INDEX idx_report_executions_created_by ON report_executions(created_by);
CREATE INDEX idx_report_executions_created_at ON report_executions(created_at);

CREATE INDEX idx_scheduled_reports_template_id ON scheduled_reports(template_id);
CREATE INDEX idx_scheduled_reports_is_active ON scheduled_reports(is_active);
CREATE INDEX idx_scheduled_reports_next_run_at ON scheduled_reports(next_run_at);

CREATE INDEX idx_anomaly_detections_severity ON anomaly_detections(severity);
CREATE INDEX idx_anomaly_detections_status ON anomaly_detections(status);
CREATE INDEX idx_anomaly_detections_detected_at ON anomaly_detections(detected_at);
CREATE INDEX idx_anomaly_detections_metric_name ON anomaly_detections(metric_name);

CREATE INDEX idx_ai_insights_type ON ai_insights(type);
CREATE INDEX idx_ai_insights_status ON ai_insights(status);
CREATE INDEX idx_ai_insights_created_at ON ai_insights(created_at);
CREATE INDEX idx_ai_insights_confidence_score ON ai_insights(confidence_score);

CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_entity_type ON analytics_events(entity_type);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);

CREATE INDEX idx_performance_metrics_metric_name ON performance_metrics(metric_name);
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX idx_performance_metrics_data_source ON performance_metrics(data_source);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dashboards_updated_at BEFORE UPDATE ON dashboards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_widgets_updated_at BEFORE UPDATE ON dashboard_widgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON report_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_reports_updated_at BEFORE UPDATE ON scheduled_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create materialized views for analytics
CREATE MATERIALIZED VIEW dashboard_usage_stats AS
SELECT 
    d.id as dashboard_id,
    d.name as dashboard_name,
    d.type as dashboard_type,
    COUNT(dw.id) as widget_count,
    COUNT(dc.id) as collaborator_count,
    d.access_count,
    d.last_accessed_at,
    d.created_at,
    d.updated_at
FROM dashboards d
LEFT JOIN dashboard_widgets dw ON d.id = dw.dashboard_id AND dw.is_visible = true
LEFT JOIN dashboard_collaboration dc ON d.id = dc.dashboard_id AND dc.is_active = true
WHERE d.is_active = true
GROUP BY d.id, d.name, d.type, d.access_count, d.last_accessed_at, d.created_at, d.updated_at;

CREATE MATERIALIZED VIEW report_execution_stats AS
SELECT 
    DATE_TRUNC('day', created_at) as execution_date,
    status,
    COUNT(*) as execution_count,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_execution_time_seconds,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_executions,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_executions
FROM report_executions
GROUP BY DATE_TRUNC('day', created_at), status
ORDER BY execution_date DESC;

CREATE MATERIALIZED VIEW anomaly_detection_stats AS
SELECT 
    DATE_TRUNC('day', detected_at) as detection_date,
    severity,
    COUNT(*) as anomaly_count,
    AVG(deviation_percentage) as avg_deviation_percentage,
    AVG(confidence_score) as avg_confidence_score
FROM anomaly_detections
GROUP BY DATE_TRUNC('day', detected_at), severity
ORDER BY detection_date DESC;

-- Create functions for refreshing materialized views
CREATE OR REPLACE FUNCTION refresh_dashboard_usage_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_usage_stats;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_report_execution_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY report_execution_stats;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_anomaly_detection_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY anomaly_detection_stats;
END;
$$ LANGUAGE plpgsql;

-- Create indexes on materialized views
CREATE INDEX idx_dashboard_usage_stats_type ON dashboard_usage_stats(dashboard_type);
CREATE INDEX idx_dashboard_usage_stats_created_at ON dashboard_usage_stats(created_at);

CREATE INDEX idx_report_execution_stats_date ON report_execution_stats(execution_date);
CREATE INDEX idx_report_execution_stats_status ON report_execution_stats(status);

CREATE INDEX idx_anomaly_detection_stats_date ON anomaly_detection_stats(detection_date);
CREATE INDEX idx_anomaly_detection_stats_severity ON anomaly_detection_stats(severity);

-- Create sample data for testing
INSERT INTO dashboards (id, name, description, type, layout, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Executive Dashboard', 'High-level business metrics overview', 'business', '{"grid": {"cols": 12, "rows": 8}}', '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440002', 'Financial Analytics', 'Detailed financial performance metrics', 'financial', '{"grid": {"cols": 12, "rows": 10}}', '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440003', 'Operations Dashboard', 'Operational efficiency metrics', 'operational', '{"grid": {"cols": 12, "rows": 8}}', '550e8400-e29b-41d4-a716-446655440000');

INSERT INTO dashboard_widgets (id, dashboard_id, name, type, position, config, data_source) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Revenue Chart', 'chart', '{"x": 0, "y": 0, "w": 6, "h": 4}', '{"chartType": "line", "title": "Monthly Revenue"}', '{"query": "SELECT month, revenue FROM monthly_revenue"}'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Customer Count', 'metric', '{"x": 6, "y": 0, "w": 3, "h": 2}', '{"title": "Total Customers", "format": "number"}', '{"query": "SELECT COUNT(*) as count FROM customers"}'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Profit Margin', 'chart', '{"x": 0, "y": 0, "w": 8, "h": 4}', '{"chartType": "bar", "title": "Profit Margin by Product"}', '{"query": "SELECT product, margin FROM profit_margins"}');

-- Output summary
DO $$
BEGIN
    RAISE NOTICE 'Module 04 Analytics & Reporting database schema created successfully';
    RAISE NOTICE 'Tables created: %', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE');
    RAISE NOTICE 'Indexes created: %', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public');
    RAISE NOTICE 'Materialized views created: 3';
    RAISE NOTICE 'Triggers created: 4';
    RAISE NOTICE 'Functions created: 4';
END $$;
