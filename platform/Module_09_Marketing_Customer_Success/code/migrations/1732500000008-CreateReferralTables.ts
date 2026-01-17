import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateReferralTables1732500000008 implements MigrationInterface {
    name = 'CreateReferralTables1732500000008';

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
                        name: 'tenant_id',
                        type: 'uuid',
                        isNullable: false,
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
                        enum: ['pending', 'converted', 'completed', 'rewarded', 'expired', 'fraud'],
                        default: 'pending',
                        isNullable: false,
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
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'utm_medium',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'utm_campaign',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'referrer_ip',
                        type: 'varchar',
                        length: '45',
                        isNullable: true,
                    },
                    {
                        name: 'referee_ip',
                        type: 'varchar',
                        length: '45',
                        isNullable: true,
                    },
                    {
                        name: 'referrer_reward_amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'referee_reward_amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                        isNullable: false,
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
                        name: 'tenant_id',
                        type: 'uuid',
                        isNullable: false,
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
                        isNullable: false,
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
                        isNullable: false,
                    },
                    {
                        name: 'completed_referrals',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'pending_referrals',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'total_earned',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'total_claimed',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'pending_rewards',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'current_tier',
                        type: 'enum',
                        enum: ['bronze', 'silver', 'gold', 'platinum'],
                        default: 'bronze',
                        isNullable: false,
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
                        isNullable: false,
                    },
                    {
                        name: 'best_streak',
                        type: 'int',
                        default: 0,
                        isNullable: false,
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
                        isNullable: false,
                    },
                ],
            }),
            true,
        );

        // Create indexes for referrals
        await queryRunner.createIndex(
            'referrals',
            new Index('idx_referrals_tenant_id', ['tenant_id']),
        );

        await queryRunner.createIndex(
            'referrals',
            new Index('idx_referrals_referrer_id', ['referrer_id']),
        );

        await queryRunner.createIndex(
            'referrals',
            new Index('idx_referrals_referee_id', ['referee_id']),
        );

        await queryRunner.createIndex(
            'referrals',
            new Index('idx_referrals_referral_code', ['referral_code']),
        );

        await queryRunner.createIndex(
            'referrals',
            new Index('idx_referrals_status', ['status']),
        );

        await queryRunner.createIndex(
            'referrals',
            new Index('idx_referrals_created_at', ['created_at']),
        );

        // Create indexes for referral_rewards
        await queryRunner.createIndex(
            'referral_rewards',
            new Index('idx_referral_rewards_tenant_id', ['tenant_id']),
        );

        await queryRunner.createIndex(
            'referral_rewards',
            new Index('idx_referral_rewards_user_id', ['user_id']),
        );

        await queryRunner.createIndex(
            'referral_rewards',
            new Index('idx_referral_rewards_referral_id', ['referral_id']),
        );

        await queryRunner.createIndex(
            'referral_rewards',
            new Index('idx_referral_rewards_reward_type', ['reward_type']),
        );

        await queryRunner.createIndex(
            'referral_rewards',
            new Index('idx_referral_rewards_is_claimed', ['is_claimed']),
        );

        // Create indexes for referral_stats
        await queryRunner.createIndex(
            'referral_stats',
            new Index('idx_referral_stats_user_id', ['user_id']),
        );

        await queryRunner.createIndex(
            'referral_stats',
            new Index('idx_referral_stats_current_tier', ['current_tier']),
        );

        await queryRunner.createIndex(
            'referral_stats',
            new Index('idx_referral_stats_rank', ['rank']),
        );

        await queryRunner.createIndex(
            'referral_stats',
            new Index('idx_referral_stats_total_referrals', ['total_referrals']),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('referral_stats');
        await queryRunner.dropTable('referral_rewards');
        await queryRunner.dropTable('referrals');
    }
}
