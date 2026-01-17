import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PartnerType {
    CAPITAL_FLOAT = 'capital_float',
    LENDINGKART = 'lendingkart',
    INDIFI = 'indifi',
    FLEXILOANS = 'flexiloans',
    CUSTOM = 'custom',
}

export enum PartnerStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
}

export enum ApplicationStatus {
    DRAFT = 'draft',
    SUBMITTED = 'submitted',
    UNDER_REVIEW = 'under_review',
    DOCUMENTS_REQUESTED = 'documents_requested',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    DISBURSED = 'disbursed',
    CANCELLED = 'cancelled',
}

export enum FinancingType {
    INVOICE_DISCOUNTING = 'invoice_discounting',
    INVOICE_FACTORING = 'invoice_factoring',
    SUPPLY_CHAIN = 'supply_chain',
    WORKING_CAPITAL = 'working_capital',
}

@Entity('financing_partners')
export class FinancingPartner {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'partner_type', type: 'enum', enum: PartnerType })
    partnerType: PartnerType;

    @Column({ unique: true })
    name: string;

    @Column({ name: 'display_name' })
    displayName: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'logo_url', nullable: true })
    logoUrl: string;

    @Column({ name: 'status', type: 'enum', enum: PartnerStatus, default: PartnerStatus.ACTIVE })
    status: PartnerStatus;

    // API Configuration
    @Column({ name: 'api_base_url' })
    apiBaseUrl: string;

    @Column({ name: 'api_key', nullable: true })
    apiKey: string;

    @Column({ name: 'api_secret', nullable: true })
    apiSecret: string;

    @Column({ name: 'webhook_url', nullable: true })
    webhookUrl: string;

    @Column({ name: 'webhook_secret', nullable: true })
    webhookSecret: string;

    // Financing Terms
    @Column({ name: 'min_invoice_amount', type: 'decimal', precision: 10, scale: 2 })
    minInvoiceAmount: number;

    @Column({ name: 'max_invoice_amount', type: 'decimal', precision: 10, scale: 2 })
    maxInvoiceAmount: number;

    @Column({ name: 'min_discount_rate', type: 'decimal', precision: 5, scale: 2 })
    minDiscountRate: number; // Annual percentage

    @Column({ name: 'max_discount_rate', type: 'decimal', precision: 5, scale: 2 })
    maxDiscountRate: number;

    @Column({ name: 'processing_fee_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
    processingFeePercentage: number;

    @Column({ name: 'typical_turnaround_days', type: 'int' })
    typicalTurnaroundDays: number;

    // Statistics
    @Column({ name: 'total_applications', type: 'int', default: 0 })
    totalApplications: number;

    @Column({ name: 'approved_applications', type: 'int', default: 0 })
    approvedApplications: number;

    @Column({ name: 'total_funded_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
    totalFundedAmount: number;

    @Column({ name: 'avg_approval_time_hours', type: 'decimal', precision: 10, scale: 2, nullable: true })
    avgApprovalTimeHours: number;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

@Entity('financing_applications')
export class FinancingApplication {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @Column({ name: 'partner_id', type: 'uuid' })
    partnerId: string;

    @Column({ name: 'application_number', unique: true })
    applicationNumber: string;

    @Column({ name: 'financing_type', type: 'enum', enum: FinancingType })
    financingType: FinancingType;

    @Column({ name: 'status', type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.DRAFT })
    status: ApplicationStatus;

    // Invoice Selection
    @Column({ name: 'invoice_ids', type: 'jsonb' })
    invoiceIds: string[]; // Array of invoice IDs

    @Column({ name: 'total_invoice_amount', type: 'decimal', precision: 15, scale: 2 })
    totalInvoiceAmount: number;

    @Column({ name: 'requested_amount', type: 'decimal', precision: 15, scale: 2 })
    requestedAmount: number;

    @Column({ name: 'approved_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
    approvedAmount: number;

    // Financial Terms
    @Column({ name: 'discount_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
    discountRate: number;

    @Column({ name: 'processing_fee', type: 'decimal', precision: 10, scale: 2, nullable: true })
    processingFee: number;

    @Column({ name: 'net_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
    netAmount: number; // Amount after fees

    @Column({ name: 'repayment_tenure_days', type: 'int', nullable: true })
    repaymentTenureDays: number;

    // Business Information
    @Column({ name: 'business_name' })
    businessName: string;

    @Column({ name: 'business_pan' })
    businessPan: string;

    @Column({ name: 'business_gstin', nullable: true })
    businessGstin: string;

    @Column({ name: 'annual_revenue', type: 'decimal', precision: 15, scale: 2, nullable: true })
    annualRevenue: number;

    @Column({ name: 'years_in_business', type: 'int', nullable: true })
    yearsInBusiness: number;

    // Documents
    @Column({ name: 'documents', type: 'jsonb', nullable: true })
    documents: Array<{
        type: string;
        name: string;
        url: string;
        uploadedAt: string;
    }>;

    // Partner Communication
    @Column({ name: 'partner_application_id', nullable: true })
    partnerApplicationId: string;

    @Column({ name: 'partner_response', type: 'jsonb', nullable: true })
    partnerResponse: Record<string, any>;

    // Timestamps
    @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
    submittedAt: Date;

    @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
    approvedAt: Date;

    @Column({ name: 'rejected_at', type: 'timestamp', nullable: true })
    rejectedAt: Date;

    @Column({ name: 'disbursed_at', type: 'timestamp', nullable: true })
    disbursedAt: Date;

    @Column({ name: 'rejection_reason', type: 'text', nullable: true })
    rejectionReason: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

@Entity('partner_webhooks')
export class PartnerWebhook {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'partner_id', type: 'uuid' })
    partnerId: string;

    @Column({ name: 'application_id', type: 'uuid', nullable: true })
    applicationId: string;

    @Column({ name: 'event_type' })
    eventType: string; // application.approved, application.rejected, disbursement.completed

    @Column({ name: 'payload', type: 'jsonb' })
    payload: Record<string, any>;

    @Column({ name: 'processed', type: 'boolean', default: false })
    processed: boolean;

    @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
    processedAt: Date;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
