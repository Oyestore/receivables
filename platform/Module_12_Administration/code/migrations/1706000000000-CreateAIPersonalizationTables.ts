import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAIPersonalizationTables1706000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // ===== User Profiles Table =====
        await queryRunner.query(`
      CREATE TABLE user_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        preferences JSONB,
        behavior_data JSONB,
        segment VARCHAR(100),
        ml_features JSONB,
        last_activity_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`CREATE INDEX idx_user_profiles_segment ON user_profiles(segment);`);
        await queryRunner.query(`CREATE INDEX idx_user_profiles_last_activity ON user_profiles(last_activity_at);`);

        // ===== Personalization Rules Table =====
        await queryRunner.query(`
      CREATE TABLE personalization_rules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        rule_name VARCHAR(255) NOT NULL,
        target_segment VARCHAR(100),
        conditions JSONB NOT NULL,
        actions JSONB NOT NULL,
        priority INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`CREATE INDEX idx_personalization_rules_segment ON personalization_rules(target_segment);`);
        await queryRunner.query(`CREATE INDEX idx_personalization_rules_active ON personalization_rules(is_active, priority DESC);`);

        // ===== Recommendation Events Table =====
        await queryRunner.query(`
      CREATE TABLE recommendation_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_type VARCHAR(100) NOT NULL,
        item_id VARCHAR(255) NOT NULL,
        score DECIMAL(5,4),
        context JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`CREATE INDEX idx_recommendation_events_user ON recommendation_events(user_id, created_at DESC);`);
        await queryRunner.query(`CREATE INDEX idx_recommendation_events_item ON recommendation_events(item_type, item_id);`);

        // ===== A/B Experiments Table =====
        await queryRunner.query(`
      CREATE TABLE ab_experiments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        experiment_name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        variants JSONB NOT NULL,
        traffic_split JSONB NOT NULL,
        metrics JSONB,
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`CREATE INDEX idx_ab_experiments_status ON ab_experiments(status);`);

        // ===== Experiment Assignments Table =====
        await queryRunner.query(`
      CREATE TABLE experiment_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        experiment_id UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
        variant VARCHAR(100) NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_experiment UNIQUE(user_id, experiment_id)
      )
    `);

        await queryRunner.query(`CREATE INDEX idx_experiment_assignments_user ON experiment_assignments(user_id);`);
        await queryRunner.query(`CREATE INDEX idx_experiment_assignments_experiment ON experiment_assignments(experiment_id, variant);`);

        // ===== User Segments Table =====
        await queryRunner.query(`
      CREATE TABLE user_segments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        segment_name VARCHAR(255) NOT NULL UNIQUE,
        criteria JSONB NOT NULL,
        ml_model_id VARCHAR(255),
        member_count INTEGER DEFAULT 0,
        last_calculated_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`CREATE INDEX idx_user_segments_active ON user_segments(is_active);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS user_segments CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS experiment_assignments CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS ab_experiments CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS recommendation_events CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS personalization_rules CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS user_profiles CASCADE`);
    }
}
