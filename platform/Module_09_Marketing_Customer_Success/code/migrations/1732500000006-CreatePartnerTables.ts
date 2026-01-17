import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreatePartnerTables1732500000006 implements MigrationInterface {
    name = 'CreatePartnerTables1732500000006';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create partners table
        await queryRunner.createTable(
            new Table({
                name: 'partners',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'type',
                        type: 'enum',
                        enum: ['channel', 'affiliate', 'integration', 'strategic'],
                        default: 'channel',
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['pending', 'active', 'suspended', 'terminated'],
                        default: 'pending',
                        isNullable: false,
                    },
                    {
                        name: 'primary_contact',
                        type: 'json',
                        isNullable: false,
                    },
                    {
                        name: 'commission_rate',
                        type: 'decimal',
                        precision: 5,
                        scale: 2,
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'tier',
                        type: 'varchar',
                        length: '20',
                        default: 'bronze',
                        isNullable: false,
                    },
                    {
                        name: 'total_referrals',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'active_customers',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'total_revenue',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'lifetime_commissions',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'joined_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                    {
                        name: 'last_activity_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                    {
                        name: 'api_key',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'api_keys_generated',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                ],
            }),
            true,
        );

        // Create partner_commissions table
        await queryRunner.createTable(
            new Table({
                name: 'partner_commissions',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'partner_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'referral_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'customer_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'commission_type',
                        type: 'enum',
                        enum: ['referral', 'recurring', 'bonus', 'tier_upgrade'],
                        isNullable: false,
                    },
                    {
                        name: 'commission_amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'commission_rate',
                        type: 'decimal',
                        precision: 5,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'revenue_amount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['pending', 'approved', 'paid', 'cancelled'],
                        default: 'pending',
                        isNullable: false,
                    },
                    {
                        name: 'earned_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                    {
                        name: 'approved_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'paid_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'payment_method',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'notes',
                        type: 'text',
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

        // Create indexes for partners
        await queryRunner.createIndex(
            'partners',
            new Index('idx_partners_name', ['name']),
        );

        await queryRunner.createIndex(
            'partners',
            new Index('idx_partners_type', ['type']),
        );

        await queryRunner.createIndex(
            'partners',
            new Index('idx_partners_status', ['status']),
        );

        await queryRunner.createIndex(
            'partners',
            new Index('idx_partners_tier', ['tier']),
        );

        await queryRunner.createIndex(
            'partners',
            new Index('idx_partners_joined_at', ['joined_at']),
        );

        await queryRunner.createIndex(
            'partners',
            new Index('idx_partners_api_key', ['api_key']),
        );

        // Create indexes for partner_commissions
        await queryRunner.createIndex(
            'partner_commissions',
            new Index('idx_partner_commissions_partner_id', ['partner_id']),
        );

        await queryRunner.createIndex(
            'partner_commissions',
            new Index('idx_partner_commissions_referral_id', ['referral_id']),
        );

        await queryRunner.createIndex(
            'partner_commissions',
            new Index('idx_partner_commissions_customer_id', ['customer_id']),
        );

        await queryRunner.createIndex(
            'partner_commissions',
            new Index('idx_partner_commissions_status', ['status']),
        );

        await queryRunner.createIndex(
            'partner_commissions',
            new Index('idx_partner_commissions_earned_at', ['earned_at']),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('partner_commissions');
        await queryRunner.dropTable('partners');
    }
}
