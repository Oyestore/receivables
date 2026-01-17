import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateDiscountOfferTable1732391400000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'discount_offers',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'invoice_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'buyer_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'supplier_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'original_amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'discounted_amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'discount_rate',
                        type: 'decimal',
                        precision: 5,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'apr',
                        type: 'decimal',
                        precision: 5,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'days_early',
                        type: 'int',
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
                        default: "'OFFERED'",
                        isNullable: false,
                    },
                    {
                        name: 'offer_expiry_date',
                        type: 'timestamp',
                        isNullable: false,
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
                foreignKeys: [
                    {
                        columnNames: ['invoice_id'],
                        referencedTableName: 'invoices',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
                indices: [
                    {
                        name: 'IDX_discount_offers_invoice_id',
                        columnNames: ['invoice_id'],
                    },
                    {
                        name: 'IDX_discount_offers_status',
                        columnNames: ['status'],
                    },
                ],
            }),
            true
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('discount_offers');
    }
}
