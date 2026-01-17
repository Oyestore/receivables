import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { FinancingPartner, FinancingType } from './partner.entity';

export enum FinancingApplicationStatus {
    DRAFT = 'draft',
    SUBMITTED = 'submitted',
    UNDER_REVIEW = 'under_review',
    DOCUMENTS_REQUESTED = 'documents_requested',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    DISBURSED = 'disbursed',
    CANCELLED = 'cancelled',
    COMPLETED = 'completed',
}

export enum FinancingPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent',
}

@Entity('financing_applications')
export class FinancingApplication {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'application_number', unique: true })
    applicationNumber: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({ name: 'partner_id' })
    partnerId: string;

    @Column({ name: 'financing_type', type: 'enum', enum: FinancingType })
    financingType: FinancingType;

    @Column({ name: 'requested_amount', type: 'decimal', precision: 15, scale: 2 })
    requestedAmount: number;

    @Column({ name: 'approved_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
    approvedAmount: number;

    @Column({ name: 'disbursed_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
    disbursedAmount: number;

    @Column({ name: 'interest_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
    interestRate: number;

    @Column({ name: 'processing_fee', type: 'decimal', precision: 5, scale: 2, nullable: true })
    processingFee: number;

    @Column({ name: 'tenure_months', nullable: true })
    tenureMonths: number;

    @Column({ name: 'status', type: 'enum', enum: FinancingApplicationStatus, default: FinancingApplicationStatus.DRAFT })
    status: FinancingApplicationStatus;

    @Column({ name: 'priority', type: 'enum', enum: FinancingPriority, default: FinancingPriority.MEDIUM })
    priority: FinancingPriority;

    @Column({ name: 'external_application_id', nullable: true })
    externalApplicationId: string;

    @Column({ name: 'external_status', nullable: true })
    externalStatus: string;

    @Column({ type: 'jsonb', nullable: true })
    businessDetails: {
        businessName: string;
        businessPan: string;
        businessGstin?: string;
        businessType: string;
        industry: string;
        yearsInBusiness: number;
        annualRevenue: number;
        employeeCount: number;
        registeredAddress: string;
        businessEmail: string;
        businessPhone: string;
    };

    @Column({ type: 'jsonb', nullable: true })
    financialDetails: {
        bankStatements: string[];
        itrDocuments: string[];
        gstReturns: string[];
        balanceSheet: string[];
        profitLossStatement: string[];
        otherDocuments: string[];
    };

    @Column({ type: 'jsonb', nullable: true })
    invoiceDetails: {
        invoiceIds: string[];
        totalInvoiceAmount: number;
        averageInvoiceAge: number;
        customerConcentration: number;
        paymentHistory: string;
    };

    @Column({ type: 'jsonb', nullable: true })
    riskAssessment: {
        creditScore: number;
        riskCategory: string;
        riskFactors: string[];
        recommendedAmount: number;
        recommendedTerms: string;
    };

    @Column({ type: 'jsonb', nullable: true })
    terms: {
        repaymentSchedule: any[];
        emiAmount: number;
        totalInterest: number;
        totalAmount: number;
        prepaymentTerms: string;
        latePaymentPenalty: number;
    };

    @Column({ type: 'text', nullable: true })
    rejectionReason: string;

    @Column({ name: 'submitted_at', nullable: true })
    submittedAt: Date;

    @Column({ name: 'approved_at', nullable: true })
    approvedAt: Date;

    @Column({ name: 'disbursed_at', nullable: true })
    disbursedAt: Date;

    @Column({ name: 'completed_at', nullable: true })
    completedAt: Date;

    @Column({ name: 'next_action', nullable: true })
    nextAction: string;

    @Column({ name: 'next_action_due', nullable: true })
    nextActionDue: Date;

    @Column({ type: 'jsonb', default: {} })
    metadata: {
        source: string;
        campaign?: string;
        referral?: string;
        userAgent?: string;
        ipAddress?: string;
        [key: string]: any;
    };

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'created_by' })
    createdBy: string;

    @Column({ name: 'updated_by', nullable: true })
    updatedBy: string;

    // Relationships
    @ManyToOne(() => FinancingPartner, partner => partner.applications)
    @JoinColumn({ name: 'partner_id' })
    partner: FinancingPartner;

    @OneToMany(() => FinancingTransaction, transaction => transaction.application)
    transactions: FinancingTransaction[];

    @OneToMany(() => FinancingDocument, document => document.application)
    documents: FinancingDocument[];

    @OneToMany(() => FinancingOffer, offer => offer.application)
    offers: FinancingOffer[];
}

@Entity('financing_transactions')
export class FinancingTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'transaction_number', unique: true })
    transactionNumber: string;

    @Column({ name: 'application_id' })
    applicationId: string;

    @Column({ name: 'transaction_type' })
    transactionType: 'disbursement' | 'repayment' | 'fee' | 'penalty' | 'refund';

    @Column({ name: 'amount', type: 'decimal', precision: 15, scale: 2 })
    amount: number;

    @Column({ name: 'transaction_date' })
    transactionDate: Date;

    @Column({ name: 'payment_method', nullable: true })
    paymentMethod: string;

    @Column({ name: 'reference_number', nullable: true })
    referenceNumber: string;

    @Column({ name: 'external_transaction_id', nullable: true })
    externalTransactionId: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'status', default: 'pending' })
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

    @Column({ type: 'jsonb', nullable: true })
    metadata: {
        gatewayResponse?: any;
        bankReference?: string;
        utrNumber?: string;
        [key: string]: any;
    };

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relationships
    @ManyToOne(() => FinancingApplication, application => application.transactions)
    @JoinColumn({ name: 'application_id' })
    application: FinancingApplication;
}

@Entity('financing_documents')
export class FinancingDocument {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'application_id' })
    applicationId: string;

    @Column({ name: 'document_type' })
    documentType: 'pan' | 'gstin' | 'bank_statement' | 'itr' | 'gst_return' | 'balance_sheet' | 'profit_loss' | 'address_proof' | 'other';

    @Column({ name: 'document_name' })
    documentName: string;

    @Column({ name: 'file_path' })
    filePath: string;

    @Column({ name: 'file_size' })
    fileSize: number;

    @Column({ name: 'mime_type' })
    mimeType: string;

    @Column({ name: 'uploaded_by' })
    uploadedBy: string;

    @Column({ name: 'upload_date' })
    uploadDate: Date;

    @Column({ name: 'verification_status', default: 'pending' })
    verificationStatus: 'pending' | 'verified' | 'rejected';

    @Column({ type: 'text', nullable: true })
    verificationNotes: string;

    @Column({ name: 'verified_by', nullable: true })
    verifiedBy: string;

    @Column({ name: 'verified_at', nullable: true })
    verifiedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relationships
    @ManyToOne(() => FinancingApplication, application => application.documents)
    @JoinColumn({ name: 'application_id' })
    application: FinancingApplication;
}
