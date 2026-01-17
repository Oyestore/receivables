import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateGamificationTables1732405000000 implements MigrationInterface {
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
                    },
                    {
                        name: 'event_type',
                        type: 'enum',
                        enum: [
                            'invoice_created',
                            'invoice_paid',
                            'referral_signup',
                            'referral_converted',
                            'milestone_achieved',
                            'streak_maintained',
                            'profile_completed',
                            'first_payment',
                            'dispute_resolved',
                        ],
                    },
                    {
                        name: 'points',
                        type: 'int',
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'reference_id',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'reference_type',
                        type: 'varchar',
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
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
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
                        isUnique: true,
                    },
                    {
                        name: 'total_points',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'current_level',
                        type: 'int',
                        default: 1,
                    },
                    {
                        name: 'points_to_next_level',
                        type: 'int',
                    },
                    {
                        name: 'current_streak',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'longest_streak',
                        type: 'int',
                        default: 0,
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
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
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
                        isUnique: true,
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                    },
                    {
                        name: 'description',
                        type: 'text',
                    },
                    {
                        name: 'category',
                        type: 'enum',
                        enum: ['invoicing', 'collections', 'referrals', 'engagement', 'milestones'],
                    },
                    {
                        name: 'icon_url',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'points_reward',
                        type: 'int',
                    },
                    {
                        name: 'requirement_type',
                        type: 'varchar',
                    },
                    {
                        name: 'requirement_value',
                        type: 'int',
                    },
                    {
                        name: 'is_active',
                        type: 'boolean',
                        default: true,
                    },
                    {
                        name: 'display_order',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
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
                    },
                    {
                        name: 'achievement_id',
                        type: 'uuid',
                    },
                    {
                        name: 'progress',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'is_unlocked',
                        type: 'boolean',
                        default: false,
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
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Create foreign keys
        await queryRunner.createForeignKey(
            'gamification_points',
            new TableForeignKey({
                columnNames: ['user_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'user_levels',
            new TableForeignKey({
                columnNames: ['user_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'user_achievements',
            new TableForeignKey({
                columnNames: ['user_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'user_achievements',
            new TableForeignKey({
                columnNames: ['achievement_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'achievements',
                onDelete: 'CASCADE',
            }),
        );

        // Create indexes
        await queryRunner.createIndex(
            'gamification_points',
            new TableIndex({
                name: 'idx_gamification_points_user_id',
                columnNames: ['user_id'],
            }),
        );

        await queryRunner.createIndex(
            'gamification_points',
            new TableIndex({
                name: 'idx_gamification_points_created_at',
                columnNames: ['created_at'],
            }),
        );

        await queryRunner.createIndex(
            'user_levels',
            new TableIndex({
                name: 'idx_user_levels_total_points',
                columnNames: ['total_points'],
            }),
        );

        await queryRunner.createIndex(
            'user_achievements',
            new TableIndex({
                name: 'idx_user_achievements_user_id',
                columnNames: ['user_id'],
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
