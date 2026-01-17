import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateReferralRewardTable1732391600000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
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
                        name: 'referrer_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'referee_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'campaign_id',
                        type: 'varchar',
                        length: '100',
                        default: "'DEFAULT_CAMPAIGN'",
                        isNullable: false,
                    },
                    {
                        name: 'amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'currency',
                        type: 'varchar',
                        length: '3',
                        default: "'INR'",
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['PENDING', 'APPROVED', 'PAID', 'REJECTED'],
                        default: "'PENDING'",
                        isNullable: false,
                    },
                    {
                        name: 'paid_at',
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
                        onUpdate: 'CURRENT_TIMESTAMP',
                    },
                ],
                indices: [
                    {
                        name: 'IDX_referral_rewards_referrer_id',
                        columnNames: ['referrer_id'],
                    },
                    {
                        name: 'IDX_referral_rewards_referee_id',
                        columnNames: ['referee_id'],
                    },
                    {
                        name: 'IDX_referral_rewards_status',
                        columnNames: ['status'],
                    },
                ],
            }),
            true
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('referral_rewards');
    }
}
