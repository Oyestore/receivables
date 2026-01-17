import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAnalyticsTables20251217153800 implements MigrationInterface {
  name = 'CreateAnalyticsTables20251217153800';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // scheduled_reports
    await queryRunner.createTable(
      new Table({
        name: 'scheduled_reports',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isNullable: false, default: 'uuid_generate_v4()' },
          { name: 'dashboardId', type: 'uuid', isNullable: false },
          { name: 'tenantId', type: 'uuid', isNullable: false },
          { name: 'name', type: 'varchar', length: '255', isNullable: false },
          {
            name: 'frequency',
            type: 'enum',
            enumName: 'scheduled_reports_frequency_enum',
            enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'],
            default: `'WEEKLY'`,
          },
          { name: 'cronExpression', type: 'varchar', length: '255', isNullable: true },
          {
            name: 'format',
            type: 'enum',
            enumName: 'scheduled_reports_format_enum',
            enum: ['PDF', 'CSV', 'JSON'],
            default: `'PDF'`,
          },
          // simple-array stored as comma-separated text
          { name: 'recipients', type: 'text', isNullable: false, default: `''` },
          { name: 'isActive', type: 'boolean', isNullable: false, default: true },
          { name: 'lastRunAt', type: 'timestamp', isNullable: true },
          { name: 'nextRunAt', type: 'timestamp', isNullable: true },
          { name: 'createdBy', type: 'uuid', isNullable: false },
          { name: 'createdAt', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [],
      }),
      true,
    );
    await queryRunner.createIndex(
      'scheduled_reports',
      new TableIndex({
        name: 'IDX_scheduled_reports_tenant_active_nextrun',
        columnNames: ['tenantId', 'isActive', 'nextRunAt'],
      }),
    );

    // anomaly_detections
    await queryRunner.createTable(
      new Table({
        name: 'anomaly_detections',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isNullable: false, default: 'uuid_generate_v4()' },
          { name: 'tenantId', type: 'uuid', isNullable: false },
          { name: 'metricName', type: 'varchar', length: '255', isNullable: false },
          { name: 'metricCategory', type: 'varchar', length: '255', isNullable: true },
          { name: 'actualValue', type: 'decimal', precision: 20, scale: 6, isNullable: false },
          { name: 'expectedValue', type: 'decimal', precision: 20, scale: 6, isNullable: false },
          { name: 'deviation', type: 'decimal', precision: 20, scale: 6, isNullable: false },
          { name: 'deviationPercentage', type: 'decimal', precision: 10, scale: 6, isNullable: false },
          {
            name: 'algorithm',
            type: 'enum',
            enumName: 'anomaly_algorithm_enum',
            enum: ['ISOLATION_FOREST', 'ONE_CLASS_SVM', 'LSTM_AUTOENCODER', 'Z_SCORE', 'IQR', 'SEASONAL_DECOMPOSITION'],
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enumName: 'anomaly_type_enum',
            enum: ['STATISTICAL', 'BEHAVIORAL', 'PERFORMANCE', 'BUSINESS'],
            isNullable: false,
          },
          {
            name: 'severity',
            type: 'enum',
            enumName: 'anomaly_severity_enum',
            enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enumName: 'anomaly_status_enum',
            enum: ['DETECTED', 'INVESTIGATING', 'CONFIRMED', 'FALSE_POSITIVE', 'RESOLVED', 'IGNORED'],
            isNullable: false,
            default: `'DETECTED'`,
          },
          { name: 'statisticalAnalysis', type: 'jsonb', isNullable: false, default: `'{}'` },
          { name: 'timeSeriesContext', type: 'jsonb', isNullable: true },
          { name: 'modelMetrics', type: 'jsonb', isNullable: true },
          { name: 'alertConfig', type: 'jsonb', isNullable: false, default: `'{}'` },
          { name: 'context', type: 'jsonb', isNullable: true },
          { name: 'investigatedBy', type: 'uuid', isNullable: true },
          { name: 'investigatedAt', type: 'timestamp', isNullable: true },
          { name: 'investigationNotes', type: 'text', isNullable: true },
          { name: 'resolvedBy', type: 'uuid', isNullable: true },
          { name: 'resolvedAt', type: 'timestamp', isNullable: true },
          { name: 'resolutionNotes', type: 'text', isNullable: true },
          { name: 'rootCauseAnalysis', type: 'jsonb', isNullable: true },
          { name: 'notificationSent', type: 'boolean', isNullable: false, default: false },
          { name: 'notificationHistory', type: 'jsonb', isNullable: true },
          { name: 'correlationGroup', type: 'varchar', length: '255', isNullable: true },
          { name: 'relatedAnomalies', type: 'jsonb', isNullable: true },
          { name: 'detectedAt', type: 'timestamp', isNullable: false },
          { name: 'createdAt', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'anomaly_detections',
      new TableIndex({
        name: 'IDX_anomaly_tenant_status_created',
        columnNames: ['tenantId', 'status', 'createdAt'],
      }),
    );
    await queryRunner.createIndex(
      'anomaly_detections',
      new TableIndex({
        name: 'IDX_anomaly_tenant_metric_created',
        columnNames: ['tenantId', 'metricName', 'createdAt'],
      }),
    );
    await queryRunner.createIndex(
      'anomaly_detections',
      new TableIndex({
        name: 'IDX_anomaly_severity_status',
        columnNames: ['severity', 'status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('anomaly_detections', true);
    await queryRunner.query('DROP TYPE IF EXISTS "anomaly_algorithm_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "anomaly_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "anomaly_severity_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "anomaly_status_enum"');

    await queryRunner.dropTable('scheduled_reports', true);
    await queryRunner.query('DROP TYPE IF EXISTS "scheduled_reports_frequency_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "scheduled_reports_format_enum"');
  }
}
