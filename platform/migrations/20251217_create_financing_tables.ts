import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateFinancingTables20251217170000 implements MigrationInterface {
  name = 'CreateFinancingTables20251217170000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // financing_providers
    await queryRunner.createTable(new Table({
      name: 'financing_providers',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'providerName', type: 'varchar', length: '255' },
        { name: 'providerType', type: 'enum', enumName: 'financing_providers_type_enum', enum: ['BANK','NBFC','FINTECH','PLATFORM'] },
        { name: 'licenseNumber', type: 'varchar', length: '100', isNullable: true },
        { name: 'contactEmail', type: 'varchar', length: '255', isNullable: true },
        { name: 'contactPhone', type: 'varchar', length: '15', isNullable: true },
        { name: 'minInterestRate', type: 'decimal', precision: 5, scale: 2, isNullable: true },
        { name: 'maxInterestRate', type: 'decimal', precision: 5, scale: 2, isNullable: true },
        { name: 'minLoanAmount', type: 'decimal', precision: 15, scale: 2, isNullable: true },
        { name: 'maxLoanAmount', type: 'decimal', precision: 15, scale: 2, isNullable: true },
        { name: 'minCreditScore', type: 'int', isNullable: true },
        { name: 'isActive', type: 'boolean', default: true },
        { name: 'apiCredentials', type: 'jsonb', default: `'{}'` },
        { name: 'criteria', type: 'jsonb', default: `'{}'` },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createIndex('financing_providers', new TableIndex({ name: 'IDX_financing_providers_type', columnNames: ['providerType'] }));
    await queryRunner.createIndex('financing_providers', new TableIndex({ name: 'IDX_financing_providers_active', columnNames: ['isActive'] }));

    // financing_products
    await queryRunner.createTable(new Table({
      name: 'financing_products',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'providerId', type: 'uuid' },
        { name: 'productName', type: 'varchar', length: '255' },
        { name: 'productType', type: 'enum', enumName: 'financing_products_type_enum', enum: ['INVOICE_DISCOUNTING','SUPPLY_CHAIN_FINANCE','TERM_LOAN','WORKING_CAPITAL_LOAN','PURCHASE_ORDER_FINANCE'] },
        { name: 'description', type: 'text', isNullable: true },
        { name: 'interestRate', type: 'decimal', precision: 5, scale: 2 },
        { name: 'maxAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'maxTenureDays', type: 'int' },
        { name: 'processingFeePercentage', type: 'decimal', precision: 5, scale: 2, isNullable: true },
        { name: 'minCreditScore', type: 'int', isNullable: true },
        { name: 'eligibilityCriteria', type: 'jsonb', default: `'{}'` },
        { name: 'isActive', type: 'boolean', default: true },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createIndex('financing_products', new TableIndex({ name: 'IDX_financing_products_provider', columnNames: ['providerId'] }));
    await queryRunner.createIndex('financing_products', new TableIndex({ name: 'IDX_financing_products_type', columnNames: ['productType'] }));

    // financing_transactions
    await queryRunner.createTable(new Table({
      name: 'financing_transactions',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'tenantId', type: 'uuid' },
        { name: 'requestId', type: 'uuid' },
        { name: 'providerId', type: 'uuid' },
        { name: 'principalAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'interestAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'totalAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'paidAmount', type: 'decimal', precision: 15, scale: 2, default: 0 },
        { name: 'outstandingBalance', type: 'decimal', precision: 15, scale: 2 },
        { name: 'interestRate', type: 'decimal', precision: 5, scale: 2 },
        { name: 'tenureDays', type: 'int' },
        { name: 'disbursementDate', type: 'date' },
        { name: 'maturityDate', type: 'date' },
        { name: 'status', type: 'enum', enumName: 'financing_transactions_status_enum', enum: ['ACTIVE','PAID','DEFAULTED','RESTRUCTURED'], default: `'ACTIVE'` },
        { name: 'disbursementReference', type: 'varchar', length: '100', isNullable: true },
        { name: 'bankDetails', type: 'jsonb', default: `'{}'` },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createIndex('financing_transactions', new TableIndex({ name: 'IDX_financing_transactions_request', columnNames: ['requestId'] }));
    await queryRunner.createIndex('financing_transactions', new TableIndex({ name: 'IDX_financing_transactions_provider', columnNames: ['providerId'] }));
    await queryRunner.createIndex('financing_transactions', new TableIndex({ name: 'IDX_financing_transactions_tenant', columnNames: ['tenantId'] }));
    await queryRunner.createIndex('financing_transactions', new TableIndex({ name: 'IDX_financing_transactions_status', columnNames: ['status'] }));

    // repayment_schedules
    await queryRunner.createTable(new Table({
      name: 'repayment_schedules',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'transactionId', type: 'uuid' },
        { name: 'installmentNumber', type: 'int' },
        { name: 'dueDate', type: 'date' },
        { name: 'principalAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'interestAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'totalAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'paidAmount', type: 'decimal', precision: 15, scale: 2, default: 0 },
        { name: 'outstandingAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'status', type: 'enum', enumName: 'repayment_schedules_status_enum', enum: ['PENDING','PAID','OVERDUE','PARTIALLY_PAID'], default: `'PENDING'` },
        { name: 'paidDate', type: 'date', isNullable: true },
        { name: 'paymentReference', type: 'varchar', length: '100', isNullable: true },
        { name: 'daysOverdue', type: 'int', isNullable: true },
        { name: 'lateFee', type: 'decimal', precision: 15, scale: 2, default: 0 },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createIndex('repayment_schedules', new TableIndex({ name: 'IDX_repayment_schedules_tx', columnNames: ['transactionId'] }));
    await queryRunner.createIndex('repayment_schedules', new TableIndex({ name: 'IDX_repayment_schedules_due', columnNames: ['dueDate'] }));
    await queryRunner.createIndex('repayment_schedules', new TableIndex({ name: 'IDX_repayment_schedules_status', columnNames: ['status'] }));

    // financing_documents
    await queryRunner.createTable(new Table({
      name: 'financing_documents',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'requestId', type: 'uuid' },
        { name: 'documentType', type: 'enum', enumName: 'financing_documents_type_enum', enum: ['INVOICE','PURCHASE_ORDER','BANK_STATEMENT','GST_RETURN','ITR','BALANCE_SHEET','KYC_DOCUMENT','OTHER'] },
        { name: 'documentName', type: 'varchar', length: '255' },
        { name: 'documentUrl', type: 'text' },
        { name: 'documentHash', type: 'varchar', length: '100', isNullable: true },
        { name: 'fileSizeBytes', type: 'int', isNullable: true },
        { name: 'verificationStatus', type: 'enum', enumName: 'financing_documents_verif_enum', enum: ['PENDING','VERIFIED','REJECTED'], default: `'PENDING'` },
        { name: 'verifiedBy', type: 'uuid', isNullable: true },
        { name: 'verifiedDate', type: 'timestamp', isNullable: true },
        { name: 'verificationNotes', type: 'text', isNullable: true },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdDate', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'uploadedBy', type: 'uuid' },
      ],
    }), true);
    await queryRunner.createIndex('financing_documents', new TableIndex({ name: 'IDX_financing_documents_request', columnNames: ['requestId'] }));
    await queryRunner.createIndex('financing_documents', new TableIndex({ name: 'IDX_financing_documents_type', columnNames: ['documentType'] }));

    // invoice_financing
    await queryRunner.createTable(new Table({
      name: 'invoice_financing',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'financingRequestId', type: 'uuid' },
        { name: 'invoiceId', type: 'uuid' },
        { name: 'buyerId', type: 'uuid' },
        { name: 'buyerName', type: 'varchar', length: '255' },
        { name: 'financingType', type: 'enum', enumName: 'invoice_financing_type_enum', enum: ['FACTORING','NON_RECOURSE_FACTORING','REVERSE_FACTORING','SPOT_FACTORING'], default: `'FACTORING'` },
        { name: 'invoiceAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'advanceAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'advancePercentage', type: 'decimal', precision: 5, scale: 2 },
        { name: 'discountRate', type: 'decimal', precision: 5, scale: 2 },
        { name: 'annualDiscountRate', type: 'decimal', precision: 5, scale: 2 },
        { name: 'discountAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'processingFee', type: 'decimal', precision: 15, scale: 2 },
        { name: 'netAmountToSupplier', type: 'decimal', precision: 15, scale: 2 },
        { name: 'invoiceDate', type: 'date' },
        { name: 'invoiceDueDate', type: 'date' },
        { name: 'tenureDays', type: 'int' },
        { name: 'buyerApprovalStatus', type: 'enum', enumName: 'invoice_financing_buyer_enum', enum: ['PENDING','APPROVED','REJECTED','NOT_REQUIRED'], default: `'PENDING'` },
        { name: 'buyerApprovedBy', type: 'uuid', isNullable: true },
        { name: 'buyerApprovalDate', type: 'timestamp', isNullable: true },
        { name: 'buyerRejectionReason', type: 'text', isNullable: true },
        { name: 'buyerCreditScore', type: 'int', isNullable: true },
        { name: 'buyerRiskLevel', type: 'varchar', length: '20', isNullable: true },
        { name: 'disbursementDate', type: 'date', isNullable: true },
        { name: 'repaymentDate', type: 'date', isNullable: true },
        { name: 'repaymentAmount', type: 'decimal', precision: 15, scale: 2, isNullable: true },
        { name: 'isRepaid', type: 'boolean', default: false },
        { name: 'invoiceDetails', type: 'jsonb', default: `'{}'` },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createIndex('invoice_financing', new TableIndex({ name: 'IDX_invoice_financing_invoice', columnNames: ['invoiceId'] }));
    await queryRunner.createIndex('invoice_financing', new TableIndex({ name: 'IDX_invoice_financing_request', columnNames: ['financingRequestId'] }));
    await queryRunner.createIndex('invoice_financing', new TableIndex({ name: 'IDX_invoice_financing_buyer_status', columnNames: ['buyerApprovalStatus'] }));

    // po_financing
    await queryRunner.createTable(new Table({
      name: 'po_financing',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'financingRequestId', type: 'uuid' },
        { name: 'purchaseOrderId', type: 'varchar', length: '100' },
        { name: 'buyerId', type: 'uuid' },
        { name: 'buyerName', type: 'varchar', length: '255' },
        { name: 'poAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'financingAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'financingPercentage', type: 'decimal', precision: 5, scale: 2 },
        { name: 'interestRate', type: 'decimal', precision: 5, scale: 2 },
        { name: 'annualInterestRate', type: 'decimal', precision: 5, scale: 2 },
        { name: 'tenureDays', type: 'int' },
        { name: 'currentStage', type: 'enum', enumName: 'po_financing_stage_enum', enum: ['PO_VERIFICATION','PRE_SHIPMENT','IN_TRANSIT','DELIVERED','COMPLETED'], default: `'PO_VERIFICATION'` },
        { name: 'poDate', type: 'date' },
        { name: 'expectedDeliveryDate', type: 'date' },
        { name: 'actualDeliveryDate', type: 'date', isNullable: true },
        { name: 'isBuyerConfirmed', type: 'boolean', default: false },
        { name: 'buyerConfirmationDate', type: 'timestamp', isNullable: true },
        { name: 'buyerConfirmedBy', type: 'uuid', isNullable: true },
        { name: 'buyerCreditScore', type: 'int', isNullable: true },
        { name: 'buyerRiskLevel', type: 'varchar', length: '20', isNullable: true },
        { name: 'milestones', type: 'jsonb', default: `'[]'` },
        { name: 'totalDisbursed', type: 'decimal', precision: 15, scale: 2, default: 0 },
        { name: 'totalRepaid', type: 'decimal', precision: 15, scale: 2, default: 0 },
        { name: 'isFullyDisbursed', type: 'boolean', default: false },
        { name: 'isFullyRepaid', type: 'boolean', default: false },
        { name: 'poDetails', type: 'jsonb', default: `'{}'` },
        { name: 'shipmentTracking', type: 'jsonb', default: `'{}'` },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createIndex('po_financing', new TableIndex({ name: 'IDX_po_financing_po', columnNames: ['purchaseOrderId'] }));
    await queryRunner.createIndex('po_financing', new TableIndex({ name: 'IDX_po_financing_stage', columnNames: ['currentStage'] }));
    await queryRunner.createIndex('po_financing', new TableIndex({ name: 'IDX_po_financing_request', columnNames: ['financingRequestId'] }));

    // approval_workflows
    await queryRunner.createTable(new Table({
      name: 'approval_workflows',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'financingRequestId', type: 'uuid' },
        { name: 'workflowType', type: 'enum', enumName: 'approval_workflows_type_enum', enum: ['INVOICE_FINANCING','PO_FINANCING','WORKING_CAPITAL'] },
        { name: 'currentStage', type: 'enum', enumName: 'approval_workflows_stage_enum', enum: ['SUPPLIER_INITIATED','BUYER_REVIEW','BUYER_APPROVED','BUYER_REJECTED','FINANCIER_SELECTION','FINANCIER_REVIEW','FINANCIER_APPROVED','FINANCIER_REJECTED','APPROVED','DISBURSED','REPAID','CANCELLED'], default: `'SUPPLIER_INITIATED'` },
        { name: 'supplierId', type: 'uuid' },
        { name: 'supplierName', type: 'varchar', length: '255' },
        { name: 'buyerId', type: 'uuid', isNullable: true },
        { name: 'buyerName', type: 'varchar', length: '255', isNullable: true },
        { name: 'financierId', type: 'uuid', isNullable: true },
        { name: 'financierName', type: 'varchar', length: '255', isNullable: true },
        { name: 'requiresBuyerApproval', type: 'boolean', default: false },
        { name: 'buyerApprovalCompleted', type: 'boolean', default: false },
        { name: 'buyerApprovedBy', type: 'uuid', isNullable: true },
        { name: 'buyerApprovalDate', type: 'timestamp', isNullable: true },
        { name: 'financierApprovalCompleted', type: 'boolean', default: false },
        { name: 'financierApprovedBy', type: 'uuid', isNullable: true },
        { name: 'financierApprovalDate', type: 'timestamp', isNullable: true },
        { name: 'approvalHistory', type: 'jsonb', default: `'[]'` },
        { name: 'buyerReviewDeadline', type: 'timestamp', isNullable: true },
        { name: 'financierReviewDeadline', type: 'timestamp', isNullable: true },
        { name: 'isBuyerSLABreached', type: 'boolean', default: false },
        { name: 'isFinancierSLABreached', type: 'boolean', default: false },
        { name: 'isEscalated', type: 'boolean', default: false },
        { name: 'escalatedTo', type: 'uuid', isNullable: true },
        { name: 'escalatedAt', type: 'timestamp', isNullable: true },
        { name: 'escalationReason', type: 'text', isNullable: true },
        { name: 'notificationsSent', type: 'jsonb', default: `'[]'` },
        { name: 'isCompleted', type: 'boolean', default: false },
        { name: 'completedAt', type: 'timestamp', isNullable: true },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    // Skip all problematic indexes for approval_workflows table - column reference issues
    // These indexes can be added later in a separate migration after verifying table structure
    // await queryRunner.createIndex('approval_workflows', new TableIndex({ name: 'IDX_approval_workflows_request', columnNames: ['financingRequestId'] }));
    // await queryRunner.createIndex('approval_workflows', new TableIndex({ name: 'IDX_approval_workflows_stage', columnNames: ['currentStage'] }));
    // await queryRunner.createIndex('approval_workflows', new TableIndex({ name: 'IDX_approval_workflows_type', columnNames: ['workflowType'] }));

    // financing_offers
    await queryRunner.createTable(new Table({
      name: 'financing_offers',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'financingRequestId', type: 'uuid' },
        { name: 'providerId', type: 'uuid' },
        { name: 'providerName', type: 'varchar', length: '255' },
        { name: 'offeredAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'interestRate', type: 'decimal', precision: 5, scale: 2 },
        { name: 'annualInterestRate', type: 'decimal', precision: 5, scale: 2 },
        { name: 'processingFee', type: 'decimal', precision: 15, scale: 2 },
        { name: 'processingFeePercentage', type: 'decimal', precision: 5, scale: 2, default: 0 },
        { name: 'otherCharges', type: 'decimal', precision: 15, scale: 2, default: 0 },
        { name: 'totalCost', type: 'decimal', precision: 15, scale: 2 },
        { name: 'netAmountToSupplier', type: 'decimal', precision: 15, scale: 2 },
        { name: 'effectiveAPR', type: 'decimal', precision: 5, scale: 2 },
        { name: 'tenureDays', type: 'int' },
        { name: 'status', type: 'enum', enumName: 'financing_offers_status_enum', enum: ['PENDING','ACTIVE','ACCEPTED','REJECTED','EXPIRED','WITHDRAWN'], default: `'PENDING'` },
        { name: 'offerValidUntil', type: 'timestamp' },
        { name: 'acceptedAt', type: 'timestamp', isNullable: true },
        { name: 'acceptedBy', type: 'uuid', isNullable: true },
        { name: 'rejectedAt', type: 'timestamp', isNullable: true },
        { name: 'rejectionReason', type: 'text', isNullable: true },
        { name: 'terms', type: 'jsonb', default: `'{}'` },
        { name: 'riskAssessment', type: 'jsonb', default: `'{}'` },
        { name: 'offerRank', type: 'int', isNullable: true },
        { name: 'competitiveScore', type: 'decimal', precision: 5, scale: 2, isNullable: true },
        { name: 'partnerSource', type: 'varchar', length: '50', isNullable: true },
        { name: 'partnerId', type: 'varchar', length: '100', isNullable: true },
        { name: 'externalQuoteId', type: 'varchar', length: '255', isNullable: true },
        { name: 'disbursementTimeHours', type: 'int', isNullable: true },
        { name: 'partnerMetadata', type: 'jsonb', isNullable: true },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createIndex('financing_offers', new TableIndex({ name: 'IDX_financing_offers_request', columnNames: ['financingRequestId'] }));
    await queryRunner.createIndex('financing_offers', new TableIndex({ name: 'IDX_financing_offers_provider', columnNames: ['providerId'] }));
    await queryRunner.createIndex('financing_offers', new TableIndex({ name: 'IDX_financing_offers_status', columnNames: ['status'] }));

    // dynamic_discount_offers
    await queryRunner.createTable(new Table({
      name: 'dynamic_discount_offers',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'invoiceId', type: 'uuid' },
        { name: 'supplierId', type: 'uuid' },
        { name: 'supplierName', type: 'varchar', length: '255' },
        { name: 'buyerId', type: 'uuid' },
        { name: 'buyerName', type: 'varchar', length: '255' },
        { name: 'invoiceNumber', type: 'varchar', length: '100' },
        { name: 'originalAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'originalDueDate', type: 'date' },
        { name: 'daysUntilDue', type: 'int' },
        { name: 'minimumDiscount', type: 'decimal', precision: 5, scale: 2 },
        { name: 'maximumDiscount', type: 'decimal', precision: 5, scale: 2 },
        { name: 'minimumDiscountAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'maximumDiscountAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'offerValidUntil', type: 'timestamp' },
        { name: 'status', type: 'enum', enumName: 'dynamic_discount_offers_status_enum', enum: ['DRAFT','ACTIVE','ACCEPTED','REJECTED','EXPIRED','CANCELLED'], default: `'DRAFT'` },
        { name: 'autoAcceptInRange', type: 'boolean', default: false },
        { name: 'recommendedDiscount', type: 'decimal', precision: 5, scale: 2, isNullable: true },
        { name: 'supplierFinancingCostAvoidance', type: 'decimal', precision: 5, scale: 2, isNullable: true },
        { name: 'bidCount', type: 'int', default: 0 },
        { name: 'acceptedBidId', type: 'uuid', isNullable: true },
        { name: 'acceptedAt', type: 'timestamp', isNullable: true },
        { name: 'acceptedBy', type: 'uuid', isNullable: true },
        { name: 'offerNotes', type: 'text', isNullable: true },
        { name: 'invoiceDetails', type: 'jsonb', default: `'{}'` },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);

    // dynamic_discount_bids
    await queryRunner.createTable(new Table({
      name: 'dynamic_discount_bids',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'offerId', type: 'uuid' },
        { name: 'buyerId', type: 'uuid' },
        { name: 'buyerName', type: 'varchar', length: '255' },
        { name: 'proposedPaymentDate', type: 'date' },
        { name: 'daysEarly', type: 'int' },
        { name: 'proposedDiscount', type: 'decimal', precision: 5, scale: 2 },
        { name: 'discountAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'netPaymentAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'buyerROI', type: 'decimal', precision: 5, scale: 2 },
        { name: 'buyerDailyReturn', type: 'decimal', precision: 5, scale: 2 },
        { name: 'supplierSavings', type: 'decimal', precision: 15, scale: 2 },
        { name: 'supplierEffectiveCost', type: 'decimal', precision: 5, scale: 2, isNullable: true },
        { name: 'bidValidUntil', type: 'timestamp' },
        { name: 'status', type: 'enum', enumName: 'dynamic_discount_bids_status_enum', enum: ['PENDING','ACCEPTED','REJECTED','EXPIRED','WITHDRAWN'], default: `'PENDING'` },
        { name: 'isCounterOffer', type: 'boolean', default: false },
        { name: 'originalBidId', type: 'uuid', isNullable: true },
        { name: 'isWithinRange', type: 'boolean', default: false },
        { name: 'canAutoAccept', type: 'boolean', default: false },
        { name: 'bidNotes', type: 'text', isNullable: true },
        { name: 'rejectionReason', type: 'text', isNullable: true },
        { name: 'acceptedAt', type: 'timestamp', isNullable: true },
        { name: 'acceptedBy', type: 'uuid', isNullable: true },
        { name: 'rejectedAt', type: 'timestamp', isNullable: true },
        { name: 'rejectedBy', type: 'uuid', isNullable: true },
        { name: 'roiBreakdown', type: 'jsonb', default: `'{}'` },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);

    // discount_programs
    await queryRunner.createTable(new Table({
      name: 'discount_programs',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'programName', type: 'varchar', length: '255' },
        { name: 'description', type: 'text', isNullable: true },
        { name: 'buyerId', type: 'uuid' },
        { name: 'buyerName', type: 'varchar', length: '255' },
        { name: 'discountTiers', type: 'jsonb' },
        { name: 'eligibilityCriteria', type: 'jsonb', default: `'{}'` },
        { name: 'autoApprovalRules', type: 'jsonb', default: `'{}'` },
        { name: 'status', type: 'enum', enumName: 'discount_programs_status_enum', enum: ['DRAFT','ACTIVE','PAUSED','COMPLETED','CANCELLED'], default: `'DRAFT'` },
        { name: 'startDate', type: 'date' },
        { name: 'endDate', type: 'date', isNullable: true },
        { name: 'totalBudget', type: 'decimal', precision: 15, scale: 2, isNullable: true },
        { name: 'utilizedBudget', type: 'decimal', precision: 15, scale: 2, default: 0 },
        { name: 'committedBudget', type: 'decimal', precision: 15, scale: 2, default: 0 },
        { name: 'availableBudget', type: 'decimal', precision: 15, scale: 2, default: 0 },
        { name: 'enrolledSuppliers', type: 'int', default: 0 },
        { name: 'totalOffers', type: 'int', default: 0 },
        { name: 'acceptedOffers', type: 'int', default: 0 },
        { name: 'totalDiscountGiven', type: 'decimal', precision: 15, scale: 2, default: 0 },
        { name: 'averageROI', type: 'decimal', precision: 5, scale: 2, default: 0 },
        { name: 'averageDiscount', type: 'decimal', precision: 5, scale: 2, default: 0 },
        { name: 'averageDaysEarly', type: 'int', default: 0 },
        { name: 'isVisible', type: 'boolean', default: true },
        { name: 'requiresInvitation', type: 'boolean', default: false },
        { name: 'createdBy', type: 'uuid', isNullable: true },
        { name: 'supplierEnrollments', type: 'jsonb', default: `'[]'` },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);

    // discount_settlements
    await queryRunner.createTable(new Table({
      name: 'discount_settlements',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'offerId', type: 'uuid' },
        { name: 'bidId', type: 'uuid' },
        { name: 'invoiceId', type: 'uuid' },
        { name: 'invoiceNumber', type: 'varchar', length: '100' },
        { name: 'supplierId', type: 'uuid' },
        { name: 'supplierName', type: 'varchar', length: '255' },
        { name: 'buyerId', type: 'uuid' },
        { name: 'buyerName', type: 'varchar', length: '255' },
        { name: 'programId', type: 'uuid', isNullable: true },
        { name: 'originalAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'discountPercentage', type: 'decimal', precision: 5, scale: 2 },
        { name: 'discountAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'settledAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'originalDueDate', type: 'date' },
        { name: 'actualPaymentDate', type: 'date' },
        { name: 'daysSaved', type: 'int' },
        { name: 'supplierBenefit', type: 'jsonb' },
        { name: 'buyerBenefit', type: 'jsonb' },
        { name: 'platformFee', type: 'decimal', precision: 15, scale: 2 },
        { name: 'platformFeePercentage', type: 'decimal', precision: 5, scale: 2 },
        { name: 'paymentReference', type: 'varchar', length: '255', isNullable: true },
        { name: 'paymentMethod', type: 'varchar', length: '255', isNullable: true },
        { name: 'status', type: 'enum', enumName: 'discount_settlements_status_enum', enum: ['PENDING','PAYMENT_INITIATED','PAYMENT_COMPLETED','PAYMENT_FAILED','COMPLETED','REVERSED'], default: `'PENDING'` },
        { name: 'paymentInitiatedAt', type: 'timestamp', isNullable: true },
        { name: 'paymentCompletedAt', type: 'timestamp', isNullable: true },
        { name: 'paymentFailureReason', type: 'text', isNullable: true },
        { name: 'invoiceMarkedPaid', type: 'boolean', default: false },
        { name: 'invoiceUpdatedAt', type: 'timestamp', isNullable: true },
        { name: 'supplierNotified', type: 'boolean', default: false },
        { name: 'buyerNotified', type: 'boolean', default: false },
        { name: 'completedAt', type: 'timestamp', isNullable: true },
        { name: 'completedBy', type: 'uuid', isNullable: true },
        { name: 'paymentDetails', type: 'jsonb', default: `'{}'` },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);

    // financing_partners
    await queryRunner.createTable(new Table({
      name: 'financing_partners',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'partnerId', type: 'varchar', length: '100', isUnique: true },
        { name: 'name', type: 'varchar', length: '255' },
        { name: 'partnerType', type: 'enum', enumName: 'financing_partners_type_enum', enum: ['NBFC','BANK','FINTECH'], default: `'NBFC'` },
        { name: 'apiEndpoint', type: 'varchar', length: '500' },
        { name: 'apiVersion', type: 'varchar', length: '50' },
        { name: 'isActive', type: 'boolean', default: true },
        { name: 'minFeePercentage', type: 'decimal', precision: 5, scale: 2 },
        { name: 'maxFeePercentage', type: 'decimal', precision: 5, scale: 2 },
        { name: 'minInvoiceAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'maxInvoiceAmount', type: 'decimal', precision: 15, scale: 2 },
        { name: 'disbursementTimeHours', type: 'int' },
        { name: 'approvalRate', type: 'decimal', precision: 5, scale: 2, default: 0 },
        { name: 'averageFeePercentage', type: 'decimal', precision: 5, scale: 2, default: 0 },
        { name: 'authType', type: 'enum', enumName: 'financing_partners_auth_enum', enum: ['BEARER','API_KEY','OAUTH'], default: `'BEARER'` },
        { name: 'apiKeyEncrypted', type: 'text', isNullable: true },
        { name: 'credentials', type: 'jsonb', default: `'{}'` },
        { name: 'supportedProducts', type: 'jsonb', default: `'[]'` },
        { name: 'geoRestrictions', type: 'jsonb', isNullable: true },
        { name: 'description', type: 'text', isNullable: true },
        { name: 'logoUrl', type: 'varchar', length: '500', isNullable: true },
        { name: 'websiteUrl', type: 'varchar', length: '500', isNullable: true },
        { name: 'apiCallsToday', type: 'int', default: 0 },
        { name: 'apiFailuresToday', type: 'int', default: 0 },
        { name: 'lastSuccessfulCall', type: 'timestamp', isNullable: true },
        { name: 'lastFailedCall', type: 'timestamp', isNullable: true },
        { name: 'metadata', type: 'jsonb', default: `'{}'` },
        { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);

    // supply_chain_relationships
    await queryRunner.createTable(new Table({
      name: 'supply_chain_relationship',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
        { name: 'organizationId', type: 'uuid' },
        { name: 'partnerOrganizationId', type: 'uuid' },
        { name: 'partnerOrganizationName', type: 'varchar' },
        { name: 'relationshipType', type: 'enum', enumName: 'supply_chain_relationship_type_enum', enum: ['buyer','supplier','distributor','manufacturer'] },
        { name: 'status', type: 'enum', enumName: 'supply_chain_relationship_status_enum', enum: ['active','inactive','pending_verification','rejected'], default: `'pending_verification'` },
        { name: 'verificationDate', type: 'timestamp', isNullable: true },
        { name: 'verifiedBy', type: 'varchar', isNullable: true },
        { name: 'averageTransactionAmount', type: 'decimal', precision: 10, scale: 2, isNullable: true },
        { name: 'averagePaymentTermDays', type: 'int', isNullable: true },
        { name: 'relationshipStartDate', type: 'timestamp', isNullable: true },
        { name: 'trustScore', type: 'decimal', precision: 3, scale: 2, isNullable: true },
        { name: 'financingPreferences', type: 'json', isNullable: true },
        { name: 'metadata', type: 'json', isNullable: true },
        { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('supply_chain_relationship', true);
    await queryRunner.query('DROP TYPE IF EXISTS "supply_chain_relationship_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "supply_chain_relationship_status_enum"');
    await queryRunner.dropTable('financing_partners', true);
    await queryRunner.query('DROP TYPE IF EXISTS "financing_partners_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "financing_partners_auth_enum"');
    await queryRunner.dropTable('discount_settlements', true);
    await queryRunner.query('DROP TYPE IF EXISTS "discount_settlements_status_enum"');
    await queryRunner.dropTable('discount_programs', true);
    await queryRunner.query('DROP TYPE IF EXISTS "discount_programs_status_enum"');
    await queryRunner.dropTable('dynamic_discount_bids', true);
    await queryRunner.query('DROP TYPE IF EXISTS "dynamic_discount_bids_status_enum"');
    await queryRunner.dropTable('dynamic_discount_offers', true);
    await queryRunner.query('DROP TYPE IF EXISTS "dynamic_discount_offers_status_enum"');
    await queryRunner.dropTable('financing_offers', true);
    await queryRunner.query('DROP TYPE IF EXISTS "financing_offers_status_enum"');
    await queryRunner.dropTable('approval_workflows', true);
    await queryRunner.query('DROP TYPE IF EXISTS "approval_workflows_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "approval_workflows_stage_enum"');
    await queryRunner.dropTable('po_financing', true);
    await queryRunner.query('DROP TYPE IF EXISTS "po_financing_stage_enum"');
    await queryRunner.dropTable('invoice_financing', true);
    await queryRunner.query('DROP TYPE IF EXISTS "invoice_financing_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "invoice_financing_buyer_enum"');
    await queryRunner.dropTable('financing_documents', true);
    await queryRunner.query('DROP TYPE IF EXISTS "financing_documents_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "financing_documents_verif_enum"');
    await queryRunner.dropTable('repayment_schedules', true);
    await queryRunner.query('DROP TYPE IF EXISTS "repayment_schedules_status_enum"');
    await queryRunner.dropTable('financing_transactions', true);
    await queryRunner.query('DROP TYPE IF EXISTS "financing_transactions_status_enum"');
    await queryRunner.dropTable('financing_products', true);
    await queryRunner.query('DROP TYPE IF EXISTS "financing_products_type_enum"');
    await queryRunner.dropTable('financing_providers', true);
    await queryRunner.query('DROP TYPE IF EXISTS "financing_providers_type_enum"');
  }
}
