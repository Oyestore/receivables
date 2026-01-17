import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCapacityPlanningTables1706100000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // ===== Resource Metrics Table =====
        await queryRunner.query(`
      CREATE TABLE resource_metrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        resource_type VARCHAR(100) NOT NULL CHECK (resource_type IN ('cpu', 'memory', 'storage', 'network', 'database', 'custom')),
        metric_name VARCHAR(255) NOT NULL,
        value DECIMAL(20,4) NOT NULL,
        unit VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`CREATE INDEX idx_resource_metrics_tenant_time ON resource_metrics(tenant_id, timestamp DESC);`);
        await queryRunner.query(`CREATE INDEX idx_resource_metrics_type ON resource_metrics(resource_type, timestamp DESC);`);

        // ===== Capacity Forecasts Table =====
        await queryRunner.query(`
      CREATE TABLE capacity_forecasts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        forecast_date DATE NOT NULL,
        resource_predictions JSONB NOT NULL,
        confidence DECIMAL(5,4),
        algorithm VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_tenant_forecast_date UNIQUE(tenant_id, forecast_date)
      )
    `);

        await queryRunner.query(`CREATE INDEX idx_capacity_forecasts_tenant ON capacity_forecasts(tenant_id, forecast_date);`);

        // ===== Scaling Policies Table =====
        await queryRunner.query(`
      CREATE TABLE scaling_policies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        policy_name VARCHAR(255) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        scale_trigger JSONB NOT NULL,
        scale_action JSONB NOT NULL,
        cooldown_minutes INTEGER DEFAULT 5,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`CREATE INDEX idx_scaling_policies_tenant ON scaling_policies(tenant_id, is_active);`);

        // ===== Scaling Events Table =====
        await queryRunner.query(`
      CREATE TABLE scaling_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        policy_id UUID REFERENCES scaling_policies(id) ON DELETE SET NULL,
        trigger_reason TEXT NOT NULL,
        action_taken JSONB NOT NULL,
        result VARCHAR(50) CHECK (result IN ('success', 'failed', 'skipped')),
        error_message TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`CREATE INDEX idx_scaling_events_tenant_time ON scaling_events(tenant_id, timestamp DESC);`);

        // ===== Cost Analysis Table =====
        await queryRunner.query(`
      CREATE TABLE cost_analysis (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        resource_costs JSONB NOT NULL,
        total_cost DECIMAL(15,2),
        optimization_suggestions JSONB,
        potential_savings DECIMAL(15,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_tenant_cost_period UNIQUE(tenant_id, period_start, period_end)
      )
    `);

        await queryRunner.query(`CREATE INDEX idx_cost_analysis_tenant_period ON cost_analysis(tenant_id, period_start, period_end);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS cost_analysis CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS scaling_events CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS scaling_policies CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS capacity_forecasts CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS resource_metrics CASCADE`);
    }
}
