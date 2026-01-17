import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateReferralTables1732470000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create referrals table
        await queryRunner.createTable(
            new Table({
                name: 'referrals',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'referrer_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'referee_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'referral_code',
                        type: 'varchar',
                        length: '8',
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['pending', 'completed', 'rewarded', 'expired', 'fraud'],
                        default: "'pending'",
                    },
                    {
                        name: 'clicked_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'signed_up_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'first_payment_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'completed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'utm_source',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'utm_medium',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'utm_campaign',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'referrer_ip',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'referee_ip',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'referrer_reward_amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'referee_reward_amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'referrer_rewarded_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'referee_rewarded_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'expires_at',
                        type: 'timestamp',
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

        // Create referral_rewards table
        await queryRunner.createTable(
            new Table({
                name: 'referral_rewards',
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
                        name: 'referral_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'reward_type',
                        type: 'enum',
                        enum: ['points', 'cash', 'discount', 'credits'],
                        isNullable: false,
                    },
                    {
                        name: 'reward_amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'reward_tier',
                        type: 'enum',
                        enum: ['bronze', 'silver', 'gold', 'platinum'],
                        isNullable: false,
                    },
                    {
                        name: 'is_claimed',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'claimed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'expires_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'description',
                        type: 'text',
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

        // Create referral_stats table
        await queryRunner.createTable(
            new Table({
                name: 'referral_stats',
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
                        isNullable: false,
                    },
                    {
                        name: 'total_referrals',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'completed_referrals',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'pending_referrals',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'total_earned',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'total_claimed',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'pending_rewards',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'current_tier',
                        type: 'enum',
                        enum: ['bronze', 'silver', 'gold', 'platinum'],
                        default: "'bronze'",
                    },
                    {
                        name: 'rank',
                        type: 'int',
                        isNullable: true,
                    },
                    {
                        name: 'current_streak',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'best_streak',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'last_referral_at',
                        type: 'timestamp',
                        isNullable: true,
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

        // Create indexes
        await queryRunner.createIndex(
            'referrals',
            new TableIndex({
                name: 'idx_referrals_code',
                columnNames: ['referral_code'],
            }),
        );

        await queryRunner.createIndex(
            'referrals',
            new TableIndex({
                name: 'idx_referrals_referrer',
                columnNames: ['referrer_id'],
            }),
        );

        await queryRunner.createIndex(
            'referrals',
            new TableIndex({
                name: 'idx_referrals_referee',
                columnNames: ['referee_id'],
            }),
        );

        await queryRunner.createIndex(
            'referrals',
            new TableIndex({
                name: 'idx_referrals_status',
                columnNames: ['status'],
            }),
        );

        await queryRunner.createIndex(
            'referral_rewards',
            new TableIndex({
                name: 'idx_rewards_user',
                columnNames: ['user_id'],
            }),
        );

        await queryRunner.createIndex(
            'referral_rewards',
            new TableIndex({
                name: 'idx_rewards_claimed',
                columnNames: ['is_claimed'],
            }),
        );

        await queryRunner.createIndex(
            'referral_stats',
            new TableIndex({
                name: 'idx_stats_user',
                columnNames: ['user_id'],
            }),
        );

        await queryRunner.createIndex(
            'referral_stats',
            new TableIndex({
                name: 'idx_stats_rank',
                columnNames: ['rank'],
            }),
        );

        // Create foreign keys
        await queryRunner.createForeignKey(
            'referral_rewards',
            new TableForeignKey({
                columnNames: ['referral_id'],
                referencedTableName: 'referrals',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('referral_rewards');
        await queryRunner.dropTable('referral_stats');
        await queryRunner.dropTable('referrals');
    }
}
