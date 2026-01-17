import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRiskAssessmentTables1705600000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension if not already enabled
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // ===== Risk Categories Table =====
        await queryRunner.query(`
      CREATE TABLE risk_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        category_name VARCHAR(100) NOT NULL UNIQUE,
        category_type VARCHAR(50) NOT NULL CHECK (category_type IN ('operational', 'financial', 'security', 'compliance', 'strategic', 'reputational')),
        weight DECIMAL(3,2) DEFAULT 1.00 CHECK (weight >= 0 AND weight <= 5),
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_categories_type ON risk_categories(category_type);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_categories_active ON risk_categories(is_active);
    `);

        // ===== Risk Assessments Table =====
        await queryRunner.query(`
      CREATE TABLE risk_assessments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        assessment_number VARCHAR(100) UNIQUE NOT NULL,
        assessment_date DATE NOT NULL,
        overall_risk_score DECIMAL(5,2) CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
        risk_level VARCHAR(50) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
        assessment_type VARCHAR(50) CHECK (assessment_type IN ('periodic', 'triggered', 'incident', 'audit')),
        assessment_data JSONB,
        assessor_id UUID,
        assessor_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
        completion_date DATE,
        next_assessment_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_assessments_tenant ON risk_assessments(tenant_id, assessment_date DESC);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_assessments_status ON risk_assessments(status);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_assessments_level ON risk_assessments(risk_level);
    `);

        // ===== Risk Indicators Table =====
        await queryRunner.query(`
      CREATE TABLE risk_indicators (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES risk_categories(id),
        indicator_name VARCHAR(255) NOT NULL,
        indicator_type VARCHAR(50) CHECK (indicator_type IN ('kri', 'kpi', 'threshold', 'trend')),
        measurement_unit VARCHAR(50),
        threshold_value DECIMAL(12,2),
        threshold_operator VARCHAR(10) CHECK (threshold_operator IN ('>', '<', '>=', '<=', '=', '!=')),
        current_value DECIMAL(12,2),
        previous_value DECIMAL(12,2),
        status VARCHAR(50) DEFAULT 'normal' CHECK (status IN ('normal', 'warning', 'critical', 'unknown')),
        calculation_formula TEXT,
        collection_frequency VARCHAR(50) CHECK (collection_frequency IN ('realtime', 'hourly', 'daily', 'weekly', 'monthly')),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_tenant_indicator UNIQUE(tenant_id, indicator_name)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_indicators_tenant ON risk_indicators(tenant_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_indicators_category ON risk_indicators(category_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_indicators_status ON risk_indicators(status);
    `);

        // ===== Risk Events Table =====
        await queryRunner.query(`
      CREATE TABLE risk_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        category_id UUID REFERENCES risk_categories(id),
        event_title VARCHAR(255) NOT NULL,
        event_description TEXT,
        event_type VARCHAR(50) CHECK (event_type IN ('incident', 'near_miss', 'threat', 'vulnerability', 'breach')),
        severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        impact_score DECIMAL(3,1) CHECK (impact_score >= 0 AND impact_score <= 10),
        likelihood_score DECIMAL(3,1) CHECK (likelihood_score >= 0 AND likelihood_score <= 10),
        risk_score DECIMAL(5,2),
        event_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        detection_date TIMESTAMP,
        resolution_date TIMESTAMP,
        status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'mitigating', 'resolved', 'closed')),
        affected_systems JSONB,
        financial_impact DECIMAL(12,2),
        reported_by UUID,
        assigned_to UUID,
        root_cause TEXT,
        lessons_learned TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_events_tenant ON risk_events(tenant_id, event_date DESC);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_events_status ON risk_events(status);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_events_severity ON risk_events(severity);
    `);

        // ===== Risk Mitigation Table =====
        await queryRunner.query(`
      CREATE TABLE risk_mitigation (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        assessment_id UUID REFERENCES risk_assessments(id),
        event_id UUID REFERENCES risk_events(id),
        category_id UUID REFERENCES risk_categories(id),
        risk_description TEXT NOT NULL,
        mitigation_strategy TEXT NOT NULL,
        mitigation_type VARCHAR(50) CHECK (mitigation_type IN ('avoid', 'transfer', 'mitigate', 'accept')),
        implementation_plan TEXT,
        assigned_to UUID,
        owner_name VARCHAR(255),
        priority VARCHAR(50) CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        status VARCHAR(50) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled', 'on_hold')),
        start_date DATE,
        due_date DATE,
        completion_date DATE,
        estimated_cost DECIMAL(12,2),
        actual_cost DECIMAL(12,2),
        effectiveness_score DECIMAL(3,1) CHECK (effectiveness_score >= 0 AND effectiveness_score <= 10),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_mitigation_dates CHECK (start_date IS NULL OR due_date IS NULL OR start_date <= due_date)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_mitigation_tenant ON risk_mitigation(tenant_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_mitigation_status ON risk_mitigation(status, priority);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_mitigation_assigned ON risk_mitigation(assigned_to);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_mitigation_due ON risk_mitigation(due_date);
    `);

        // ===== Risk Trends Table =====
        await queryRunner.query(`
      CREATE TABLE risk_trends (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        trend_date DATE NOT NULL,
        overall_risk_score DECIMAL(5,2),
        risk_level VARCHAR(50),
        category_scores JSONB,
        open_events INTEGER DEFAULT 0,
        critical_events INTEGER DEFAULT 0,
        mitigation_completion_rate DECIMAL(5,2),
        trend_direction VARCHAR(50) CHECK (trend_direction IN ('improving', 'stable', 'deteriorating')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_tenant_trend_date UNIQUE(tenant_id, trend_date)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_trends_tenant ON risk_trends(tenant_id, trend_date DESC);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_trends_score ON risk_trends(overall_risk_score);
    `);

        // ===== Risk Predictions Table =====
        await queryRunner.query(`
      CREATE TABLE risk_predictions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        category_id UUID REFERENCES risk_categories(id),
        prediction_date DATE NOT NULL,
        prediction_horizon VARCHAR(50) CHECK (prediction_horizon IN ('7_days', '30_days', '90_days', '180_days', '365_days')),
        predicted_risk_score DECIMAL(5,2),
        predicted_risk_level VARCHAR(50),
        confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
        prediction_factors JSONB,
        ml_model_version VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_predictions_tenant ON risk_predictions(tenant_id, prediction_date DESC);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_risk_predictions_category ON risk_predictions(category_id);
    `);

        // Insert default risk categories
        await queryRunner.query(`
      INSERT INTO risk_categories (category_name, category_type, weight, description)
      VALUES
        ('Operational Risk', 'operational', 1.0, 'Risks arising from inadequate or failed internal processes, people, and systems'),
        ('Financial Risk', 'financial', 1.2, 'Risks related to financial loss, liquidity, or market conditions'),
        ('Cybersecurity Risk', 'security', 1.5, 'Risks related to data breaches, cyber attacks, and information security'),
        ('Compliance Risk', 'compliance', 1.3, 'Risks arising from violation of laws, regulations, or internal policies'),
        ('Strategic Risk', 'strategic', 1.1, 'Risks that affect long-term business strategy and competitive position'),
        ('Reputational Risk', 'reputational', 1.2, 'Risks that damage brand reputation and customer trust')
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS risk_predictions CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS risk_trends CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS risk_mitigation CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS risk_events CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS risk_indicators CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS risk_assessments CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS risk_categories CASCADE`);
    }
}
