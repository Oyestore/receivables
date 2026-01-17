import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCollectionScenarios20251217160000 implements MigrationInterface {
  name = 'CreateCollectionScenarios20251217160000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'collection_scenarios',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'tenantId', type: 'uuid', isNullable: false },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          { name: 'description', type: 'text', isNullable: true },
          {
            name: 'riskLevel',
            type: 'enum',
            enumName: 'collection_scenarios_risk_enum',
            enum: ['low', 'medium', 'high', 'critical'],
            default: `'medium'`,
          },
          { name: 'priority', type: 'int', isNullable: false, default: 1 },
          { name: 'isActive', type: 'boolean', isNullable: false, default: true },
          { name: 'actions', type: 'jsonb', isNullable: false, default: `'[]'` },
          { name: 'conditions', type: 'jsonb', isNullable: true },
          { name: 'createdAt', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'collection_scenarios',
      new TableIndex({
        name: 'IDX_collection_scenarios_tenant_name',
        columnNames: ['tenantId', 'name'],
      }),
    );
    await queryRunner.createIndex(
      'collection_scenarios',
      new TableIndex({
        name: 'IDX_collection_scenarios_risk',
        columnNames: ['riskLevel'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('collection_scenarios', true);
    await queryRunner.query('DROP TYPE IF EXISTS "collection_scenarios_risk_enum"');
  }
}
