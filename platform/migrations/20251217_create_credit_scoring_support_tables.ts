import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCreditScoringSupportTables20251217172000 implements MigrationInterface {
  name = 'CreateCreditScoringSupportTables20251217172000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'industry_risk_profiles',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenantId', type: 'uuid', isNullable: true },
        { name: 'industryCode', type: 'varchar', length: '10' },
        { name: 'industryName', type: 'varchar', length: '100' },
        { name: 'category', type: 'enum', enumName: 'industry_risk_category_enum', enum: [
          'MANUFACTURING','RETAIL','CONSTRUCTION','IT_SOFTWARE','HEALTHCARE','AGRICULTURE','HOSPITALITY','TEXTILES','AUTOMOTIVE','PHARMACEUTICALS','FINANCIAL_SERVICES','EDUCATION','REAL_ESTATE','LOGISTICS','FOOD_BEVERAGE','OTHER'
        ], default: `'OTHER'` },
        { name: 'baseRiskFactor', type: 'decimal', precision: 5, scale: 2, default: 1.0 },
        { name: 'seasonalityFactor', type: 'decimal', precision: 5, scale: 2, default: 0 },
        { name: 'economicSensitivity', type: 'decimal', precision: 5, scale: 2, default: 0 },
        { name: 'averageDSO', type: 'int', default: 30 },
        { name: 'defaultRate', type: 'decimal', precision: 5, scale: 2, default: 0 },
        { name: 'seasonalPatterns', type: 'jsonb', isNullable: true },
        { name: 'keyRiskFactors', type: 'jsonb', isNullable: true },
        { name: 'benchmarks', type: 'jsonb', isNullable: true },
        { name: 'notes', type: 'text', isNullable: true },
        { name: 'isActive', type: 'boolean', default: true },
        { name: 'isSystemDefault', type: 'boolean', default: false },
        { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'createdBy', type: 'varchar', isNullable: true },
        { name: 'updatedBy', type: 'varchar', isNullable: true },
      ],
    }), true);
    await queryRunner.createIndex('industry_risk_profiles', new TableIndex({ name: 'IDX_industry_risk_industry_tenant', columnNames: ['industryCode','tenantId'] }));
    await queryRunner.createIndex('industry_risk_profiles', new TableIndex({ name: 'IDX_industry_risk_code', columnNames: ['industryCode'] }));

    await queryRunner.createTable(new Table({
      name: 'regional_risk_factors',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenantId', type: 'uuid', isNullable: true },
        { name: 'stateCode', type: 'varchar', length: '10' },
        { name: 'stateName', type: 'varchar', length: '100' },
        { name: 'region', type: 'varchar', length: '50', isNullable: true },
        { name: 'baseRiskFactor', type: 'decimal', precision: 5, scale: 2, default: 1.0 },
        { name: 'economicStability', type: 'decimal', precision: 5, scale: 2, default: 0 },
        { name: 'businessEnvironment', type: 'decimal', precision: 5, scale: 2, default: 0 },
        { name: 'averagePaymentDays', type: 'int', default: 30 },
        { name: 'defaultRate', type: 'decimal', precision: 5, scale: 2, default: 0 },
        { name: 'economicIndicators', type: 'jsonb', isNullable: true },
        { name: 'paymentNorms', type: 'jsonb', isNullable: true },
        { name: 'keyRiskFactors', type: 'jsonb', isNullable: true },
        { name: 'notes', type: 'text', isNullable: true },
        { name: 'isActive', type: 'boolean', default: true },
        { name: 'isSystemDefault', type: 'boolean', default: false },
        { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'createdBy', type: 'varchar', isNullable: true },
        { name: 'updatedBy', type: 'varchar', isNullable: true },
      ],
    }), true);
    await queryRunner.createIndex('regional_risk_factors', new TableIndex({ name: 'IDX_regional_risk_state_tenant', columnNames: ['stateCode','tenantId'] }));
    await queryRunner.createIndex('regional_risk_factors', new TableIndex({ name: 'IDX_regional_risk_state', columnNames: ['stateCode'] }));

    await queryRunner.createTable(new Table({
      name: 'scoring_model_templates',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenantId', type: 'uuid', isNullable: true },
        { name: 'templateName', type: 'varchar', length: '100' },
        { name: 'description', type: 'text', isNullable: true },
        { name: 'industryCode', type: 'varchar', length: '50', isNullable: true },
        { name: 'businessSize', type: 'varchar', length: '50', isNullable: true },
        { name: 'factorWeights', type: 'jsonb' },
        { name: 'scoreThresholds', type: 'jsonb', isNullable: true },
        { name: 'customFactors', type: 'jsonb', isNullable: true },
        { name: 'isActive', type: 'boolean', default: true },
        { name: 'isSystemTemplate', type: 'boolean', default: false },
        { name: 'usageCount', type: 'int', default: 0 },
        { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'createdBy', type: 'varchar', isNullable: true },
      ],
    }), true);
    await queryRunner.createIndex('scoring_model_templates', new TableIndex({ name: 'IDX_scoring_templates_name_tenant', columnNames: ['templateName','tenantId'] }));

    await queryRunner.createTable(new Table({
      name: 'insurance_policies',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'invoice_id', type: 'uuid' },
        { name: 'provider_id', type: 'varchar' },
        { name: 'policy_number', type: 'varchar' },
        { name: 'coverageAmount', type: 'decimal', precision: 10, scale: 2 },
        { name: 'premiumAmount', type: 'decimal', precision: 10, scale: 2 },
        { name: 'premiumRate', type: 'decimal', precision: 5, scale: 2 },
        { name: 'coverageStartDate', type: 'timestamp' },
        { name: 'coverageEndDate', type: 'timestamp' },
        { name: 'status', type: 'enum', enumName: 'insurance_policies_status_enum', enum: ['PENDING','ACTIVE','CLAIMED','EXPIRED','CANCELLED'], default: `'PENDING'` },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);

    await queryRunner.createTable(new Table({
      name: 'risk_indicators',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenantId', type: 'uuid' },
        { name: 'buyerId', type: 'uuid' },
        { name: 'indicatorType', type: 'varchar', length: '100' },
        { name: 'indicatorName', type: 'varchar', length: '255' },
        { name: 'description', type: 'text', isNullable: true },
        { name: 'currentValue', type: 'decimal', precision: 15, scale: 2 },
        { name: 'thresholdWarning', type: 'decimal', precision: 15, scale: 2, isNullable: true },
        { name: 'thresholdCritical', type: 'decimal', precision: 15, scale: 2, isNullable: true },
        { name: 'severity', type: 'enum', enumName: 'risk_indicators_severity_enum', enum: ['INFO','WARNING','CRITICAL'], default: `'INFO'` },
        { name: 'lastChecked', type: 'timestamp' },
        { name: 'lastChanged', type: 'timestamp', isNullable: true },
        { name: 'historicalValues', type: 'jsonb', default: `'{}'` },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createIndex('risk_indicators', new TableIndex({ name: 'IDX_risk_indicators_buyer', columnNames: ['buyerId'] }));
    await queryRunner.createIndex('risk_indicators', new TableIndex({ name: 'IDX_risk_indicators_tenant', columnNames: ['tenantId'] }));
    await queryRunner.createIndex('risk_indicators', new TableIndex({ name: 'IDX_risk_indicators_severity', columnNames: ['severity'] }));
    await queryRunner.createIndex('risk_indicators', new TableIndex({ name: 'IDX_risk_indicators_type', columnNames: ['indicatorType'] }));

    await queryRunner.createTable(new Table({
      name: 'risk_alerts',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenantId', type: 'uuid' },
        { name: 'buyerId', type: 'uuid' },
        { name: 'riskIndicatorId', type: 'uuid', isNullable: true },
        { name: 'alertType', type: 'varchar', length: '100' },
        { name: 'title', type: 'varchar', length: '255' },
        { name: 'description', type: 'text' },
        { name: 'severity', type: 'enum', enumName: 'risk_alerts_severity_enum', enum: ['INFO','WARNING','CRITICAL','URGENT'] },
        { name: 'status', type: 'enum', enumName: 'risk_alerts_status_enum', enum: ['NEW','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','DISMISSED'], default: `'NEW'` },
        { name: 'triggeredDate', type: 'timestamp' },
        { name: 'acknowledgedBy', type: 'uuid', isNullable: true },
        { name: 'acknowledgedDate', type: 'timestamp', isNullable: true },
        { name: 'resolvedBy', type: 'uuid', isNullable: true },
        { name: 'resolvedDate', type: 'timestamp', isNullable: true },
        { name: 'resolutionNotes', type: 'text', isNullable: true },
        { name: 'alertData', type: 'jsonb', default: `'{}'` },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createIndex('risk_alerts', new TableIndex({ name: 'IDX_risk_alerts_buyer', columnNames: ['buyerId'] }));
    await queryRunner.createIndex('risk_alerts', new TableIndex({ name: 'IDX_risk_alerts_tenant', columnNames: ['tenantId'] }));
    await queryRunner.createIndex('risk_alerts', new TableIndex({ name: 'IDX_risk_alerts_status', columnNames: ['status'] }));
    await queryRunner.createIndex('risk_alerts', new TableIndex({ name: 'IDX_risk_alerts_severity', columnNames: ['severity'] }));
    await queryRunner.createIndex('risk_alerts', new TableIndex({ name: 'IDX_risk_alerts_triggered', columnNames: ['triggeredDate'] }));

    await queryRunner.createTable(new Table({
      name: 'credit_limits',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenantId', type: 'uuid' },
        { name: 'buyerId', type: 'uuid' },
        { name: 'recommendedLimit', type: 'decimal', precision: 15, scale: 2 },
        { name: 'approvedLimit', type: 'decimal', precision: 15, scale: 2 },
        { name: 'currentUtilization', type: 'decimal', precision: 15, scale: 2, default: 0 },
        { name: 'utilizationPercentage', type: 'decimal', precision: 5, scale: 2, default: 0 },
        { name: 'status', type: 'enum', enumName: 'credit_limits_status_enum', enum: ['ACTIVE','SUSPENDED','EXPIRED','PENDING_APPROVAL'], default: `'PENDING_APPROVAL'` },
        { name: 'validFrom', type: 'timestamp', isNullable: true },
        { name: 'validUntil', type: 'timestamp', isNullable: true },
        { name: 'lastReviewDate', type: 'timestamp', isNullable: true },
        { name: 'nextReviewDate', type: 'timestamp', isNullable: true },
        { name: 'notes', type: 'text', isNullable: true },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'createdBy', type: 'uuid' },
        { name: 'updatedBy', type: 'uuid', isNullable: true },
      ],
    }), true);
    await queryRunner.createIndex('credit_limits', new TableIndex({ name: 'IDX_credit_limits_buyer', columnNames: ['buyerId'] }));
    await queryRunner.createIndex('credit_limits', new TableIndex({ name: 'IDX_credit_limits_tenant', columnNames: ['tenantId'] }));
    await queryRunner.createIndex('credit_limits', new TableIndex({ name: 'IDX_credit_limits_status', columnNames: ['status'] }));

    await queryRunner.createTable(new Table({
      name: 'credit_limit_approvals',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'creditLimitId', type: 'uuid' },
        { name: 'requestedLimit', type: 'decimal', precision: 15, scale: 2 },
        { name: 'approvedLimit', type: 'decimal', precision: 15, scale: 2, isNullable: true },
        { name: 'status', type: 'enum', enumName: 'credit_limit_approvals_status_enum', enum: ['PENDING','APPROVED','REJECTED','EXPIRED'], default: `'PENDING'` },
        { name: 'requestedBy', type: 'uuid' },
        { name: 'approverId', type: 'uuid', isNullable: true },
        { name: 'approvalDate', type: 'timestamp', isNullable: true },
        { name: 'requestComments', type: 'text', isNullable: true },
        { name: 'approvalComments', type: 'text', isNullable: true },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createIndex('credit_limit_approvals', new TableIndex({ name: 'IDX_credit_limit_approvals_limit', columnNames: ['creditLimitId'] }));
    await queryRunner.createIndex('credit_limit_approvals', new TableIndex({ name: 'IDX_credit_limit_approvals_approver', columnNames: ['approverId'] }));
    await queryRunner.createIndex('credit_limit_approvals', new TableIndex({ name: 'IDX_credit_limit_approvals_status', columnNames: ['status'] }));

    await queryRunner.createTable(new Table({
      name: 'payment_history',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenantId', type: 'uuid' },
        { name: 'buyerId', type: 'uuid' },
        { name: 'invoiceId', type: 'uuid' },
        { name: 'invoiceNumber', type: 'varchar', length: '100' },
        { name: 'invoiceAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'paidAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'invoiceDate', type: 'date' },
        { name: 'dueDate', type: 'date' },
        { name: 'paymentDate', type: 'date', isNullable: true },
        { name: 'daysLate', type: 'int', isNullable: true },
        { name: 'paymentMethod', type: 'varchar', length: '50', isNullable: true },
        { name: 'paymentStatus', type: 'varchar', length: '50' },
        { name: 'isDisputed', type: 'boolean', default: false },
        { name: 'notes', type: 'text', isNullable: true },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createIndex('payment_history', new TableIndex({ name: 'IDX_payment_history_buyer', columnNames: ['buyerId'] }));
    await queryRunner.createIndex('payment_history', new TableIndex({ name: 'IDX_payment_history_tenant', columnNames: ['tenantId'] }));
    await queryRunner.createIndex('payment_history', new TableIndex({ name: 'IDX_payment_history_invoice', columnNames: ['invoiceId'] }));
    await queryRunner.createIndex('payment_history', new TableIndex({ name: 'IDX_payment_history_date', columnNames: ['paymentDate'] }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('payment_history', true);
    await queryRunner.dropTable('credit_limit_approvals', true);
    await queryRunner.query('DROP TYPE IF EXISTS "credit_limit_approvals_status_enum"');
    await queryRunner.dropTable('credit_limits', true);
    await queryRunner.query('DROP TYPE IF EXISTS "credit_limits_status_enum"');
    await queryRunner.dropTable('risk_alerts', true);
    await queryRunner.query('DROP TYPE IF EXISTS "risk_alerts_severity_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "risk_alerts_status_enum"');
    await queryRunner.dropTable('risk_indicators', true);
    await queryRunner.query('DROP TYPE IF EXISTS "risk_indicators_severity_enum"');
    await queryRunner.dropTable('insurance_policies', true);
    await queryRunner.query('DROP TYPE IF EXISTS "insurance_policies_status_enum"');
    await queryRunner.dropTable('scoring_model_templates', true);
    await queryRunner.dropTable('regional_risk_factors', true);
    await queryRunner.dropTable('industry_risk_profiles', true);
    await queryRunner.query('DROP TYPE IF EXISTS "industry_risk_category_enum"');
  }
}
