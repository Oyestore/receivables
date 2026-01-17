import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCoreModuleTables20251217163000 implements MigrationInterface {
  name = 'CreateCoreModuleTables20251217163000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Module 06: Credit Scoring
    await queryRunner.createTable(new Table({
      name: 'buyer_profiles',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenantId', type: 'uuid' },
        { name: 'companyName', type: 'varchar', length: '255' },
        { name: 'tradeName', type: 'varchar', length: '100', isNullable: true },
        { name: 'gstNumber', type: 'varchar', length: '15', isUnique: true },
        { name: 'panNumber', type: 'varchar', length: '10', isUnique: true },
        { name: 'industryCode', type: 'varchar', length: '100' },
        { name: 'industryName', type: 'varchar', length: '255' },
        { name: 'businessType', type: 'varchar', length: '100' },
        { name: 'businessSize', type: 'varchar', length: '50' },
        { name: 'registeredAddress', type: 'varchar', length: '255' },
        { name: 'city', type: 'varchar', length: '100' },
        { name: 'state', type: 'varchar', length: '100' },
        { name: 'pincode', type: 'varchar', length: '10' },
        { name: 'contactName', type: 'varchar', length: '255', isNullable: true },
        { name: 'contactEmail', type: 'varchar', length: '255' },
        { name: 'contactPhone', type: 'varchar', length: '15' },
        { name: 'incorporationDate', type: 'date', isNullable: true },
        { name: 'annualTurnover', type: 'decimal', precision: 15, scale: 2, isNullable: true },
        { name: 'employeeCount', type: 'int', isNullable: true },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'createdBy', type: 'uuid' },
        { name: 'updatedBy', type: 'uuid', isNullable: true },
      ],
    }), true);
    await queryRunner.createIndex('buyer_profiles', new TableIndex({ name: 'IDX_buyer_profiles_tenant', columnNames: ['tenantId'] }));
    await queryRunner.createIndex('buyer_profiles', new TableIndex({ name: 'IDX_buyer_profiles_gst', columnNames: ['gstNumber'] }));
    await queryRunner.createIndex('buyer_profiles', new TableIndex({ name: 'IDX_buyer_profiles_pan', columnNames: ['panNumber'] }));

    await queryRunner.createTable(new Table({
      name: 'credit_assessments',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenantId', type: 'uuid' },
        { name: 'buyerId', type: 'uuid' },
        { name: 'creditScore', type: 'int' },
        { name: 'riskLevel', type: 'enum', enumName: 'credit_assessments_risk_enum', enum: ['LOW','MEDIUM','HIGH','CRITICAL'] },
        { name: 'confidenceScore', type: 'decimal', precision: 5, scale: 2 },
        { name: 'status', type: 'enum', enumName: 'credit_assessments_status_enum', enum: ['PENDING','COMPLETED','FAILED','EXPIRED'], default: `'PENDING'` },
        { name: 'assessmentDate', type: 'timestamp' },
        { name: 'validUntil', type: 'timestamp', isNullable: true },
        { name: 'assessmentNotes', type: 'text', isNullable: true },
        { name: 'scoreBreakdown', type: 'jsonb', default: `'{}'` },
        { name: 'dataSources', type: 'jsonb', default: `'{}'` },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'createdBy', type: 'uuid' },
      ],
    }), true);
    await queryRunner.createIndex('credit_assessments', new TableIndex({ name: 'IDX_credit_assessments_buyer', columnNames: ['buyerId'] }));
    await queryRunner.createIndex('credit_assessments', new TableIndex({ name: 'IDX_credit_assessments_tenant', columnNames: ['tenantId'] }));
    await queryRunner.createIndex('credit_assessments', new TableIndex({ name: 'IDX_credit_assessments_date', columnNames: ['assessmentDate'] }));

    await queryRunner.createTable(new Table({
      name: 'credit_score_factors',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'assessmentId', type: 'uuid' },
        { name: 'factorName', type: 'varchar', length: '100' },
        { name: 'factorDescription', type: 'text', isNullable: true },
        { name: 'weight', type: 'decimal', precision: 5, scale: 2 },
        { name: 'value', type: 'decimal', precision: 8, scale: 2 },
        { name: 'normalizedScore', type: 'decimal', precision: 8, scale: 2 },
        { name: 'impactLevel', type: 'enum', enumName: 'credit_score_factors_impact_enum', enum: ['VERY_NEGATIVE','NEGATIVE','NEUTRAL','POSITIVE','VERY_POSITIVE'] },
        { name: 'explanation', type: 'text', isNullable: true },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createIndex('credit_score_factors', new TableIndex({ name: 'IDX_credit_score_factors_assessment', columnNames: ['assessmentId'] }));

    // Module 07: Financing
    await queryRunner.createTable(new Table({
      name: 'financing_requests',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenantId', type: 'uuid' },
        { name: 'requestType', type: 'enum', enumName: 'financing_requests_type_enum', enum: ['INVOICE_FACTORING','SUPPLY_CHAIN_FINANCE','WORKING_CAPITAL','PURCHASE_ORDER_FINANCE'] },
        { name: 'requestedAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'approvedAmount', type: 'decimal', precision: 15, scale: 2, isNullable: true },
        { name: 'interestRate', type: 'decimal', precision: 5, scale: 2, isNullable: true },
        { name: 'tenureDays', type: 'int', isNullable: true },
        { name: 'status', type: 'enum', enumName: 'financing_requests_status_enum', enum: ['DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','DISBURSED','REJECTED','CANCELLED'], default: `'DRAFT'` },
        { name: 'invoiceId', type: 'uuid', isNullable: true },
        { name: 'providerId', type: 'uuid', isNullable: true },
        { name: 'purpose', type: 'text', isNullable: true },
        { name: 'buyerDetails', type: 'jsonb', default: `'{}'` },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'createdBy', type: 'uuid' },
        { name: 'updatedBy', type: 'uuid', isNullable: true },
      ],
    }), true);
    await queryRunner.createIndex('financing_requests', new TableIndex({ name: 'IDX_financing_requests_tenant', columnNames: ['tenantId'] }));
    await queryRunner.createIndex('financing_requests', new TableIndex({ name: 'IDX_financing_requests_status', columnNames: ['status'] }));
    await queryRunner.createIndex('financing_requests', new TableIndex({ name: 'IDX_financing_requests_type', columnNames: ['requestType'] }));

    // Module 17: Reconciliation GL
    await queryRunner.createTable(new Table({
      name: 'bank_accounts',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenantId', type: 'uuid' },
        { name: 'accountNumber', type: 'varchar', length: '50' },
        { name: 'ifsc', type: 'varchar', length: '20', isNullable: true },
        { name: 'bankName', type: 'varchar', length: '100', isNullable: true },
        { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createTable(new Table({
      name: 'bank_transactions',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'bankAccountId', type: 'uuid' },
        { name: 'transactionId', type: 'varchar', length: '100', isUnique: true },
        { name: 'transactionDate', type: 'date' },
        { name: 'valueDate', type: 'date' },
        { name: 'amount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'type', type: 'enum', enumName: 'bank_transactions_type_enum', enum: ['credit','debit'] },
        { name: 'description', type: 'text' },
        { name: 'utrNumber', type: 'varchar', length: '50', isNullable: true },
        { name: 'chequeNumber', type: 'varchar', length: '50', isNullable: true },
        { name: 'parsedData', type: 'jsonb', isNullable: true },
        { name: 'reconciliationStatus', type: 'enum', enumName: 'bank_transactions_status_enum', enum: ['pending','matched','unmatched','suspended','ignored'], default: `'pending'` },
        { name: 'matchedInvoiceId', type: 'uuid', isNullable: true },
        { name: 'matchedGLEntryId', type: 'uuid', isNullable: true },
        { name: 'suspenseEntryId', type: 'uuid', isNullable: true },
        { name: 'reconciledAt', type: 'timestamp', isNullable: true },
        { name: 'reconciledBy', type: 'uuid', isNullable: true },
        { name: 'reconciliationNotes', type: 'text', isNullable: true },
        { name: 'importedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createIndex('bank_transactions', new TableIndex({ name: 'IDX_bank_transactions_account_date', columnNames: ['bankAccountId','transactionDate'] }));
    await queryRunner.createIndex('bank_transactions', new TableIndex({ name: 'IDX_bank_transactions_status', columnNames: ['reconciliationStatus'] }));

    // Module 13: Cross Border Trade
    await queryRunner.createTable(new Table({
      name: 'cross_border_trades',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenant_id', type: 'uuid' },
        { name: 'trade_number', type: 'varchar', isUnique: true },
        { name: 'customer_id', type: 'uuid' },
        { name: 'invoice_id', type: 'uuid', isNullable: true },
        { name: 'type', type: 'enum', enumName: 'cross_border_trades_type_enum', enum: ['export','import'] },
        { name: 'origin_country', type: 'varchar' },
        { name: 'destination_country', type: 'varchar' },
        { name: 'amount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'currency', type: 'varchar' },
        { name: 'incoterm', type: 'varchar' },
        { name: 'shipping_method', type: 'enum', enumName: 'cross_border_trades_ship_enum', enum: ['air','sea','land','courier'] },
        { name: 'estimated_shipping_date', type: 'date', isNullable: true },
        { name: 'actual_shipping_date', type: 'date', isNullable: true },
        { name: 'estimated_arrival_date', type: 'date', isNullable: true },
        { name: 'actual_arrival_date', type: 'date', isNullable: true },
        { name: 'tracking_number', type: 'varchar', isNullable: true },
        { name: 'hs_code', type: 'varchar', isNullable: true },
        { name: 'customs_status', type: 'enum', enumName: 'cross_border_trades_customs_enum', enum: ['pending','submitted','approved','rejected','cleared'], default: `'pending'` },
        { name: 'customs_reference', type: 'varchar', isNullable: true },
        { name: 'duty_amount', type: 'decimal', precision: 15, scale: 2, default: 0 },
        { name: 'tax_amount', type: 'decimal', precision: 15, scale: 2, default: 0 },
        { name: 'status', type: 'enum', enumName: 'cross_border_trades_status_enum', enum: ['draft','pending_approval','approved','in_transit','customs_clearance','delivered','cancelled'], default: `'draft'` },
        { name: 'documents', type: 'jsonb', isNullable: true },
        { name: 'metadata', type: 'jsonb', isNullable: true },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'created_by', type: 'uuid', isNullable: true },
      ],
    }), true);

    // Module 14: Globalization & Localization
    await queryRunner.createTable(new Table({
      name: 'currency_exchange_rates',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenant_id', type: 'uuid' },
        { name: 'from_currency', type: 'varchar', length: '3' },
        { name: 'to_currency', type: 'varchar', length: '3' },
        { name: 'rate', type: 'decimal', precision: 15, scale: 6 },
        { name: 'rate_date', type: 'date' },
        { name: 'source', type: 'enum', enumName: 'currency_exchange_rates_source_enum', enum: ['manual','api','bank'], default: `'manual'` },
        { name: 'isActive', type: 'boolean', default: true },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createTable(new Table({
      name: 'localization_settings',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenant_id', type: 'uuid' },
        { name: 'language_code', type: 'varchar', length: '10', default: `'en_US'` },
        { name: 'country_code', type: 'varchar', length: '2' },
        { name: 'currency_code', type: 'varchar', length: '3' },
        { name: 'timezone', type: 'varchar', default: `'UTC'` },
        { name: 'date_format', type: 'varchar', default: `'YYYY-MM-DD'` },
        { name: 'time_format', type: 'varchar', default: `'HH:mm:ss'` },
        { name: 'number_format', type: 'jsonb', isNullable: true },
        { name: 'metadata', type: 'jsonb', isNullable: true },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createTable(new Table({
      name: 'translations',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'language_code', type: 'varchar', length: '10' },
        { name: 'translation_key', type: 'varchar' },
        { name: 'translatedText', type: 'text' },
        { name: 'context', type: 'varchar', isNullable: true },
        { name: 'isVerified', type: 'boolean', default: false },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);

    // Module 15: Credit Decisioning
    await queryRunner.createTable(new Table({
      name: 'credit_decisions',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenant_id', type: 'uuid' },
        { name: 'customer_id', type: 'uuid' },
        { name: 'application_id', type: 'uuid', isNullable: true },
        { name: 'decision_type', type: 'enum', enumName: 'credit_decisions_type_enum', enum: ['invoice_approval','credit_limit','financing','payment_terms'] },
        { name: 'decision_result', type: 'enum', enumName: 'credit_decisions_result_enum', enum: ['approved','rejected','manual_review','conditional'] },
        { name: 'amount', type: 'decimal', precision: 15, scale: 2, isNullable: true },
        { name: 'credit_score', type: 'int', isNullable: true },
        { name: 'risk_level', type: 'enum', enumName: 'credit_decisions_risk_enum', enum: ['low','medium','high','very_high'] },
        { name: 'conditions', type: 'jsonb', isNullable: true },
        { name: 'rules_applied', type: 'jsonb' },
        { name: 'factors', type: 'jsonb', isNullable: true },
        { name: 'notes', type: 'text', isNullable: true },
        { name: 'decided_by', type: 'varchar', isNullable: true },
        { name: 'reviewed_by', type: 'varchar', isNullable: true },
        { name: 'reviewed_at', type: 'timestamp', isNullable: true },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createTable(new Table({
      name: 'decision_rules',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenant_id', type: 'uuid' },
        { name: 'rule_name', type: 'varchar' },
        { name: 'description', type: 'text', isNullable: true },
        { name: 'rule_type', type: 'enum', enumName: 'decision_rules_type_enum', enum: ['credit_score','payment_history','amount_limit','industry','custom'] },
        { name: 'conditions', type: 'jsonb' },
        { name: 'action_on_true', type: 'enum', enumName: 'decision_rules_true_enum', enum: ['approve','reject','manual_review','conditional'] },
        { name: 'action_on_false', type: 'enum', enumName: 'decision_rules_false_enum', enum: ['approve','reject','manual_review','conditional','continue'] },
        { name: 'priority', type: 'int', default: 0 },
        { name: 'weight', type: 'decimal', precision: 5, scale: 2, default: 1.0 },
        { name: 'isActive', type: 'boolean', default: true },
        { name: 'applies_to', type: 'text' }, // store simple-array as text
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'created_by', type: 'varchar', isNullable: true },
      ],
    }), true);

    // Module 02: Intelligent Distribution
    await queryRunner.createTable(new Table({
      name: 'distribution_rules',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenant_id', type: 'uuid' },
        { name: 'rule_name', type: 'varchar' },
        { name: 'description', type: 'text', isNullable: true },
        { name: 'rule_type', type: 'enum', enumName: 'distribution_rules_type_enum', enum: ['amount_based','customer_based','industry_based','geographic','custom'] },
        { name: 'conditions', type: 'jsonb' },
        { name: 'target_channel', type: 'varchar' },
        { name: 'priority', type: 'int', default: 0 },
        { name: 'isActive', type: 'boolean', default: true },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'created_by', type: 'varchar', isNullable: true },
      ],
    }), true);
    await queryRunner.createTable(new Table({
      name: 'distribution_assignments',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenant_id', type: 'uuid' },
        { name: 'invoice_id', type: 'uuid' },
        { name: 'customer_id', type: 'uuid' },
        { name: 'assigned_channel', type: 'varchar' },
        { name: 'rule_id', type: 'uuid', isNullable: true },
        { name: 'assignment_reason', type: 'varchar' },
        { name: 'distribution_status', type: 'enum', enumName: 'distribution_assign_status_enum', enum: ['pending','sent','delivered','failed','bounced'] },
        { name: 'sent_at', type: 'timestamp', isNullable: true },
        { name: 'delivered_at', type: 'timestamp', isNullable: true },
        { name: 'error', type: 'text', isNullable: true },
        { name: 'metadata', type: 'jsonb', isNullable: true },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('distribution_assignments', true);
    await queryRunner.dropTable('distribution_rules', true);
    await queryRunner.dropTable('decision_rules', true);
    await queryRunner.dropTable('credit_decisions', true);
    await queryRunner.dropTable('translations', true);
    await queryRunner.dropTable('localization_settings', true);
    await queryRunner.dropTable('currency_exchange_rates', true);
    await queryRunner.dropTable('cross_border_trades', true);
    await queryRunner.dropTable('bank_transactions', true);
    await queryRunner.query('DROP TYPE IF EXISTS "bank_transactions_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "bank_transactions_status_enum"');
    await queryRunner.dropTable('bank_accounts', true);
    await queryRunner.dropTable('financing_requests', true);
    await queryRunner.query('DROP TYPE IF EXISTS "financing_requests_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "financing_requests_status_enum"');
    await queryRunner.dropTable('credit_score_factors', true);
    await queryRunner.query('DROP TYPE IF EXISTS "credit_score_factors_impact_enum"');
    await queryRunner.dropTable('credit_assessments', true);
    await queryRunner.query('DROP TYPE IF EXISTS "credit_assessments_risk_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "credit_assessments_status_enum"');
    await queryRunner.dropTable('buyer_profiles', true);
  }
}
