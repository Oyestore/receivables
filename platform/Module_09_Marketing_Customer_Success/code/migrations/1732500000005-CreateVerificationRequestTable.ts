import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateVerificationRequestTable1732500000005 implements MigrationInterface {
    name = 'CreateVerificationRequestTable1732500000005';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'verification_requests',
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
                        name: 'verification_type',
                        type: 'enum',
                        enum: ['email', 'phone', 'identity', 'business', 'bank_account'],
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['pending', 'in_progress', 'verified', 'rejected', 'expired'],
                        default: 'pending',
                        isNullable: false,
                    },
                    {
                        name: 'data_to_verify',
                        type: 'jsonb',
                        isNullable: false,
                    },
                    {
                        name: 'verification_method',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'verification_code',
                        type: 'varchar',
                        length: '10',
                        isNullable: true,
                    },
                    {
                        name: 'attempts',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'max_attempts',
                        type: 'int',
                        default: 3,
                        isNullable: false,
                    },
                    {
                        name: 'expires_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'verified_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'verified_by',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'rejection_reason',
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

        // Create indexes
        await queryRunner.createIndex(
            'verification_requests',
            new Index('idx_verification_requests_tenant_id', ['tenant_id']),
        );

        await queryRunner.createIndex(
            'verification_requests',
            new Index('idx_verification_requests_user_id', ['user_id']),
        );

        await queryRunner.createIndex(
            'verification_requests',
            new Index('idx_verification_requests_status', ['status']),
        );

        await queryRunner.createIndex(
            'verification_requests',
            new Index('idx_verification_requests_verification_type', ['verification_type']),
        );

        await queryRunner.createIndex(
            'verification_requests',
            new Index('idx_verification_requests_expires_at', ['expires_at']),
        );

        await queryRunner.createIndex(
            'verification_requests',
            new Index('idx_verification_requests_created_at', ['created_at']),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('verification_requests');
    }
}
