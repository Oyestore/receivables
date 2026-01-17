import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateGamificationTables1732500000007 implements MigrationInterface {
    name = 'CreateGamificationTables1732500000007';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create gamification_points table
        await queryRunner.createTable(
            new Table({
                name: 'gamification_points',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'user_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'event_type',
                        type: 'enum',
                        enum: ['invoice_created', 'invoice_paid', 'referral_signup', 'referral_converted', 'milestone_achieved', 'streak_maintained', 'profile_completed', 'first_payment', 'dispute_resolved'],
                        isNullable: false,
                    },
                    {
                        name: 'points',
                        type: 'int',
                        isNullable: false,
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'reference_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'reference_type',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'metadata',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                ],
            }),
            true,
        );

        // Create user_levels table
        await queryRunner.createTable(
            new Table({
                name: 'user_levels',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'user_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'total_points',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'current_level',
                        type: 'int',
                        default: 1,
                        isNullable: false,
                    },
                    {
                        name: 'points_to_next_level',
                        type: 'int',
                        isNullable: false,
                    },
                    {
                        name: 'current_streak',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'longest_streak',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'last_activity_date',
                        type: 'date',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                ],
            }),
            true,
        );

        // Create achievements table
        await queryRunner.createTable(
            new Table({
                name: 'achievements',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'code',
                        type: 'varchar',
                        length: '50',
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: false,
                    },
                    {
                        name: 'category',
                        type: 'enum',
                        enum: ['invoicing', 'collections', 'referrals', 'engagement', 'milestones'],
                        isNullable: false,
                    },
                    {
                        name: 'icon_url',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'points_reward',
                        type: 'int',
                        isNullable: false,
                    },
                    {
                        name: 'requirement_type',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                    },
                    {
                        name: 'requirement_value',
                        type: 'int',
                        isNullable: false,
                    },
                    {
                        name: 'is_active',
                        type: 'boolean',
                        default: true,
                        isNullable: false,
                    },
                    {
                        name: 'display_order',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                ],
            }),
            true,
        );

        // Create user_achievements table
        await queryRunner.createTable(
            new Table({
                name: 'user_achievements',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'user_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'achievement_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'progress',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'is_unlocked',
                        type: 'boolean',
                        default: false,
                        isNullable: false,
                    },
                    {
                        name: 'unlocked_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                ],
            }),
            true,
        );

        // Create indexes for gamification_points
        await queryRunner.createIndex(
            'gamification_points',
            new Index('idx_gamification_points_user_id', ['user_id']),
        );

        await queryRunner.createIndex(
            'gamification_points',
            new Index('idx_gamification_points_event_type', ['event_type']),
        );

        await queryRunner.createIndex(
            'gamification_points',
            new Index('idx_gamification_points_created_at', ['created_at']),
        );

        // Create indexes for user_levels
        await queryRunner.createIndex(
            'user_levels',
            new Index('idx_user_levels_user_id', ['user_id']),
        );

        await queryRunner.createIndex(
            'user_levels',
            new Index('idx_user_levels_current_level', ['current_level']),
        );

        await queryRunner.createIndex(
            'user_levels',
            new Index('idx_user_levels_total_points', ['total_points']),
        );

        // Create indexes for achievements
        await queryRunner.createIndex(
            'achievements',
            new Index('idx_achievements_code', ['code']),
        );

        await queryRunner.createIndex(
            'achievements',
            new Index('idx_achievements_category', ['category']),
        );

        await queryRunner.createIndex(
            'achievements',
            new Index('idx_achievements_is_active', ['is_active']),
        );

        // Create indexes for user_achievements
        await queryRunner.createIndex(
            'user_achievements',
            new Index('idx_user_achievements_user_id', ['user_id']),
        );

        await queryRunner.createIndex(
            'user_achievements',
            new Index('idx_user_achievements_achievement_id', ['achievement_id']),
        );

        await queryRunner.createIndex(
            'user_achievements',
            new Index('idx_user_achievements_is_unlocked', ['is_unlocked']),
        );

        // Add foreign key constraints
        await queryRunner.createForeignKey(
            'user_achievements',
            new ForeignKey({
                columnNames: ['achievement_id'],
                referencedTableName: 'achievements',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('user_achievements');
        await queryRunner.dropTable('achievements');
        await queryRunner.dropTable('user_levels');
        await queryRunner.dropTable('gamification_points');
    }
}
