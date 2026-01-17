import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnalyticsTables1705700000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension if not already enabled
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // ===== Analytics Metrics Table =====
        await queryRunner.query(`
      CREATE TABLE analytics_metrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        metric_name VARCHAR(255) NOT NULL UNIQUE,
        metric_category VARCHAR(100),
        metric_type VARCHAR(50) CHECK (metric_type IN ('count', 'sum', 'average', 'percentage', 'ratio', 'custom')),
        calculation_formula TEXT,
        unit_type VARCHAR(50),
        aggregation_period VARCHAR(50) CHECK (aggregation_period IN ('realtime', 'hourly', 'daily', 'weekly', 'monthly')),
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_analytics_metrics_category ON analytics_metrics(metric_category);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_analytics_metrics_active ON analytics_metrics(is_active);
    `);

        // ===== Analytics KPIs Table =====
        await queryRunner.query(`
      CREATE TABLE analytics_kpis (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        metric_id UUID NOT NULL REFERENCES analytics_metrics(id),
        kpi_date DATE NOT NULL,
        kpi_value DECIMAL(15,2),
        target_value DECIMAL(15,2),
        variance DECIMAL(15,2),
        variance_percentage DECIMAL(5,2),
        trend VARCHAR(50) CHECK (trend IN ('up', 'down', 'stable')),
        status VARCHAR(50) CHECK (status IN ('on_track', 'at_risk', 'off_track', 'exceeded')),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_tenant_metric_date UNIQUE(tenant_id, metric_id, kpi_date)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_analytics_kpis_tenant ON analytics_kpis(tenant_id, kpi_date DESC);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_analytics_kpis_metric ON analytics_kpis(metric_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_analytics_kpis_status ON analytics_kpis(status);
    `);

        // ===== Analytics Reports Table =====
        await queryRunner.query(`
      CREATE TABLE analytics_reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        report_name VARCHAR(255) NOT NULL,
        report_type VARCHAR(50) CHECK (report_type IN ('standard', 'custom', 'scheduled', 'ad_hoc')),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        report_config JSONB NOT NULL,
        schedule VARCHAR(50) CHECK (schedule IN ('once', 'daily', 'weekly', 'monthly', 'quarterly')),
        next_run_date TIMESTAMP,
        recipients JSONB,
        output_format VARCHAR(50) CHECK (output_format IN ('pdf', 'excel', 'csv', 'json', 'html')),
        is_active BOOLEAN DEFAULT true,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_analytics_reports_tenant ON analytics_reports(tenant_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_analytics_reports_schedule ON analytics_reports(schedule, next_run_date);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_analytics_reports_active ON analytics_reports(is_active);
    `);

        // ===== Analytics Dashboards Table =====
        await queryRunner.query(`
      CREATE TABLE analytics_dashboards (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        dashboard_name VARCHAR(255) NOT NULL,
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        layout JSONB,
        widgets JSONB NOT NULL,
        filters JSONB,
        refresh_interval INTEGER DEFAULT 300,
        is_default BOOLEAN DEFAULT false,
        is_public BOOLEAN DEFAULT false,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_analytics_dashboards_tenant ON analytics_dashboards(tenant_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_analytics_dashboards_default ON analytics_dashboards(is_default);
    `);

        // ===== Report Executions Table =====
        await queryRunner.query(`
      CREATE TABLE report_executions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        report_id UUID NOT NULL REFERENCES analytics_reports(id) ON DELETE CASCADE,
        execution_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_status VARCHAR(50) CHECK (execution_status IN ('running', 'completed', 'failed', 'cancelled')),
        output_file_path TEXT,
        file_size INTEGER,
        execution_time_ms INTEGER,
        error_message TEXT,
        parameters JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_report_executions_report ON report_executions(report_id, execution_date DESC);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_report_executions_status ON report_executions(execution_status);
    `);

        // ===== Data Exports Table =====
        await queryRunner.query(`
      CREATE TABLE data_exports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        export_name VARCHAR(255) NOT NULL,
        export_type VARCHAR(50) CHECK (export_type IN ('metrics', 'kpis', 'custom_query', 'dashboard')),
        query_config JSONB NOT NULL,
        output_format VARCHAR(50) CHECK (output_format IN ('pdf', 'excel', 'csv', 'json')),
        file_path TEXT,
        file_size INTEGER,
        row_count INTEGER,
        status VARCHAR(50) CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        requested_by UUID,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_data_exports_tenant ON data_exports(tenant_id, requested_at DESC);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_data_exports_status ON data_exports(status);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_data_exports_expires ON data_exports(expires_at);
    `);

        // Insert default analytics metrics
        await queryRunner.query(`
      INSERT INTO analytics_metrics (metric_name, metric_category, metric_type, unit_type, aggregation_period, description)
      VALUES
        ('Total Revenue', 'Financial', 'sum', 'currency', 'daily', 'Total revenue generated'),
        ('Active Users', 'User Engagement', 'count', 'users', 'daily', 'Number of active users'),
        ('Conversion Rate', 'Sales', 'percentage', 'percent', 'daily', 'Percentage of conversions'),
        ('Average Transaction Value', 'Financial', 'average', 'currency', 'daily', 'Average value per transaction'),
        ('Customer Churn Rate', 'Customer Success', 'percentage', 'percent', 'monthly', 'Monthly customer churn rate'),
        ('Net Promoter Score', 'Customer Success', 'average', 'score', 'monthly', 'Customer satisfaction score'),
        ('API Response Time', 'Technical', 'average', 'milliseconds', 'hourly', 'Average API response time'),
        ('System Uptime', 'Technical', 'percentage', 'percent', 'daily', 'System availability percentage'),
        ('Customer Acquisition Cost', 'Financial', 'average', 'currency', 'monthly', 'Cost to acquire new customer'),
        ('Lifetime Value', 'Financial', 'average', 'currency', 'monthly', 'Average customer lifetime value')
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS data_exports CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS report_executions CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS analytics_dashboards CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS analytics_reports CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS analytics_kpis CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS analytics_metrics CASCADE`);
    }
}
