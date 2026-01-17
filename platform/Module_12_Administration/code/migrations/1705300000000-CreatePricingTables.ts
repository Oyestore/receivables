import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePricingTables1705300000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // ===== Pricing Models Table =====
        await queryRunner.query(`
      CREATE TABLE pricing_models (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        model_name VARCHAR(255) NOT NULL,
        model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('base', 'usage', 'feature', 'hybrid')),
        base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        is_active BOOLEAN DEFAULT true,
        ml_config JSONB,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID,
        CONSTRAINT unique_model_name UNIQUE(model_name)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_pricing_models_active ON pricing_models(is_active);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_pricing_models_type ON pricing_models(model_type);
    `);

        // ===== Pricing Tiers Table =====
        await queryRunner.query(`
      CREATE TABLE pricing_tiers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        model_id UUID NOT NULL REFERENCES pricing_models(id) ON DELETE CASCADE,
        tier_name VARCHAR(100) NOT NULL,
        min_volume INTEGER CHECK (min_volume >= 0),
        max_volume INTEGER CHECK (max_volume IS NULL OR max_volume > min_volume),
        unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
        features JSONB,
        discount_percentage DECIMAL(5,2) CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_model_tier UNIQUE(model_id, tier_name),
        CONSTRAINT volume_range_check CHECK (min_volume IS NULL OR max_volume IS NULL OR min_volume < max_volume)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_pricing_tiers_model ON pricing_tiers(model_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_pricing_tiers_volume ON pricing_tiers(min_volume, max_volume);
    `);

        // ===== Discount Rules Table =====
        await queryRunner.query(`
      CREATE TABLE discount_rules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        rule_name VARCHAR(255) NOT NULL,
        rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('volume', 'promotional', 'partner', 'seasonal', 'loyalty')),
        discount_percentage DECIMAL(5,2) CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
        discount_amount DECIMAL(10,2) CHECK (discount_amount >= 0),
        conditions JSONB,
        valid_from TIMESTAMP,
        valid_until TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        max_uses INTEGER,
        current_uses INTEGER DEFAULT 0,
        applies_to JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_discount CHECK (discount_percentage IS NOT NULL OR discount_amount IS NOT NULL),
        CONSTRAINT valid_date_range CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_from < valid_until)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_discount_rules_active ON discount_rules(is_active, valid_from, valid_until);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_discount_rules_type ON discount_rules(rule_type);
    `);

        // ===== Pricing Experiments Table (A/B Testing) =====
        await queryRunner.query(`
      CREATE TABLE pricing_experiments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        experiment_name VARCHAR(255) NOT NULL,
        control_model_id UUID NOT NULL REFERENCES pricing_models(id),
        variant_model_id UUID NOT NULL REFERENCES pricing_models(id),
        traffic_split INTEGER DEFAULT 50 CHECK (traffic_split >= 0 AND traffic_split <= 100),
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP,
        status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
        hypothesis TEXT,
        success_metrics JSONB,
        results JSONB,
        winner VARCHAR(50) CHECK (winner IN ('control', 'variant', 'inconclusive')),
        confidence_level DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID,
        CONSTRAINT unique_experiment_name UNIQUE(experiment_name),
        CONSTRAINT different_models CHECK (control_model_id != variant_model_id),
        CONSTRAINT valid_experiment_dates CHECK (start_date < end_date OR end_date IS NULL)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_pricing_experiments_status ON pricing_experiments(status);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_pricing_experiments_dates ON pricing_experiments(start_date, end_date);
    `);

        // ===== Pricing Analytics Table =====
        await queryRunner.query(`
      CREATE TABLE pricing_analytics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        model_id UUID NOT NULL REFERENCES pricing_models(id) ON DELETE CASCADE,
        metric_date DATE NOT NULL,
        conversions INTEGER DEFAULT 0 CHECK (conversions >= 0),
        revenue DECIMAL(12,2) DEFAULT 0 CHECK (revenue >= 0),
        churn_count INTEGER DEFAULT 0 CHECK (churn_count >= 0),
        price_elasticity DECIMAL(5,4),
        competitor_avg_price DECIMAL(10,2),
        market_position VARCHAR(50) CHECK (market_position IN ('premium', 'competitive', 'discount')),
        customer_acquisition_cost DECIMAL(10,2),
        customer_lifetime_value DECIMAL(12,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_model_date UNIQUE(model_id, metric_date)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_pricing_analytics_date ON pricing_analytics(metric_date DESC);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_pricing_analytics_model ON pricing_analytics(model_id, metric_date DESC);
    `);

        // ===== Price History Table =====
        await queryRunner.query(`
      CREATE TABLE price_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        model_id UUID NOT NULL REFERENCES pricing_models(id) ON DELETE CASCADE,
        previous_price DECIMAL(10,2) NOT NULL,
        new_price DECIMAL(10,2) NOT NULL,
        change_percentage DECIMAL(5,2),
        change_reason TEXT,
        effective_date TIMESTAMP NOT NULL,
        changed_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_price_history_model ON price_history(model_id, effective_date DESC);
    `);

        // ===== Regional Pricing Table =====
        await queryRunner.query(`
      CREATE TABLE regional_pricing (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        model_id UUID NOT NULL REFERENCES pricing_models(id) ON DELETE CASCADE,
        region_code VARCHAR(10) NOT NULL,
        region_name VARCHAR(100) NOT NULL,
        base_price_multiplier DECIMAL(4,2) DEFAULT 1.00 CHECK (base_price_multiplier > 0),
        currency VARCHAR(3) NOT NULL,
        tax_rate DECIMAL(5,2) DEFAULT 0 CHECK (tax_rate >= 0),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_model_region UNIQUE(model_id, region_code)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_regional_pricing_model ON regional_pricing(model_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_regional_pricing_region ON regional_pricing(region_code);
    `);

        // ===== Customer Price Assignments Table =====
        await queryRunner.query(`
      CREATE TABLE customer_price_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        model_id UUID NOT NULL REFERENCES pricing_models(id),
        experiment_id UUID REFERENCES pricing_experiments(id),
        assigned_variant VARCHAR(50) CHECK (assigned_variant IN ('control', 'variant')),
        custom_price DECIMAL(10,2),
        discount_rule_id UUID REFERENCES discount_rules(id),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_tenant_model UNIQUE(tenant_id, model_id)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_customer_assignments_tenant ON customer_price_assignments(tenant_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_customer_assignments_experiment ON customer_price_assignments(experiment_id, assigned_variant);
    `);

        // ===== Price Recommendations Table (ML-generated) =====
        await queryRunner.query(`
      CREATE TABLE price_recommendations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        model_id UUID NOT NULL REFERENCES pricing_models(id),
        recommended_price DECIMAL(10,2) NOT NULL,
        current_price DECIMAL(10,2) NOT NULL,
        confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
        reasoning JSONB,
        expected_impact JSONB,
        ml_model_version VARCHAR(50),
        recommendation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
        reviewed_by UUID,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_price_recommendations_model ON price_recommendations(model_id, recommendation_date DESC);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_price_recommendations_status ON price_recommendations(status);
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS price_recommendations CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS customer_price_assignments CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS regional_pricing CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS price_history CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS pricing_analytics CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS pricing_experiments CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS discount_rules CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS pricing_tiers CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS pricing_models CASCADE`);
    }
}
