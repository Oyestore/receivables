import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { FinancingApplication } from './financing-application.entity';

export enum RiskLevel {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    VERY_HIGH = 'very_high',
}

export enum RiskCategory {
    EXCELLENT = 'excellent',
    GOOD = 'good',
    AVERAGE = 'average',
    POOR = 'poor',
    VERY_POOR = 'very_poor',
}

@Entity('financing_risk_assessments')
export class FinancingRiskAssessment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'application_id' })
    applicationId: string;

    @Column({ name: 'assessment_version', default: '1.0' })
    assessmentVersion: string;

    @Column({ name: 'credit_score' })
    creditScore: number;

    @Column({ name: 'risk_level', type: 'enum', enum: RiskLevel })
    riskLevel: RiskLevel;

    @Column({ name: 'risk_category', type: 'enum', enum: RiskCategory })
    riskCategory: RiskCategory;

    @Column({ name: 'confidence_score', type: 'decimal', precision: 3, scale: 2 })
    confidenceScore: number;

    @Column({ name: 'probability_of_default', type: 'decimal', precision: 5, scale: 4 })
    probabilityOfDefault: number;

    @Column({ name: 'loss_given_default', type: 'decimal', precision: 5, scale: 4 })
    lossGivenDefault: number;

    @Column({ name: 'expected_loss', type: 'decimal', precision: 5, scale: 4 })
    expectedLoss: number;

    @Column({ type: 'jsonb' })
    businessRiskFactors: {
        businessAgeRisk: number;
        revenueStability: number;
        industryRisk: number;
        geographicRisk: number;
        customerConcentration: number;
        supplierDependency: number;
    };

    @Column({ type: 'jsonb' })
    financialRiskFactors: {
        debtToEquityRatio: number;
        currentRatio: number;
        quickRatio: number;
        grossMargin: number;
        netMargin: number;
        operatingCashFlow: number;
        workingCapitalRatio: number;
    };

    @Column({ type: 'jsonb' })
    creditHistoryFactors: {
        paymentHistory: number;
        creditUtilization: number;
        creditInquiries: number;
        publicRecords: number;
        collectionAccounts: number;
    };

    @Column({ type: 'jsonb' })
    industryBenchmarks: {
        industryAverageScore: number;
        industryMedianRevenue: number;
        industryGrowthRate: number;
        industryDefaultRate: number;
    };

    @Column({ type: 'jsonb' })
    recommendations: {
        maxLoanAmount: number;
        recommendedInterestRate: number;
        recommendedTenure: number;
        requiredCollateral: string[];
        suggestedCovenants: string[];
        monitoringRequirements: string[];
    };

    @Column({ type: 'jsonb' })
    riskMitigation: {
        insuranceRequirements: string[];
        guarantees: string[];
        collateralRequirements: string[];
        monitoringFrequency: string;
        reportingRequirements: string[];
    };

    @Column({ type: 'jsonb' })
    scenarioAnalysis: {
        baseCase: any;
        stressTest: any;
        worstCase: any;
        sensitivityFactors: any;
    };

    @Column({ name: 'assessment_date' })
    assessmentDate: Date;

    @Column({ name: 'next_review_date' })
    nextReviewDate: Date;

    @Column({ name: 'assessor_id' })
    assessorId: string;

    @Column({ name: 'assessment_model', nullable: true })
    assessmentModel: string;

    @Column({ type: 'jsonb', nullable: true })
    modelOutputs: {
        featureImportance: any;
        shapValues: any;
        predictionProbability: number;
        modelVersion: string;
    };

    @Column({ type: 'jsonb', nullable: true })
    manualOverrides: {
        originalScore: number;
        overriddenScore: number;
        reason: string;
        approver: string;
        timestamp: Date;
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
    @ManyToOne(() => FinancingApplication, application => application.riskAssessments)
    @JoinColumn({ name: 'application_id' })
    application: FinancingApplication;
}

@Entity('financing_audit_logs')
export class FinancingAuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'entity_type' })
    entityType: 'application' | 'offer' | 'transaction' | 'document' | 'partner' | 'provider';

    @Column({ name: 'entity_id' })
    entityId: string;

    @Column({ name: 'action_type' })
    actionType: 'create' | 'update' | 'delete' | 'submit' | 'approve' | 'reject' | 'disburse' | 'repay' | 'cancel';

    @Column({ name: 'action_description' })
    actionDescription: string;

    @Column({ name: 'old_values', type: 'jsonb', nullable: true })
    oldValues: any;

    @Column({ name: 'new_values', type: 'jsonb', nullable: true })
    newValues: any;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({ name: 'user_role' })
    userRole: string;

    @Column({ name: 'user_email' })
    userEmail: string;

    @Column({ name: 'ip_address', nullable: true })
    ipAddress: string;

    @Column({ name: 'user_agent', nullable: true })
    userAgent: string;

    @Column({ name: 'session_id', nullable: true })
    sessionId: string;

    @Column({ name: 'request_id', nullable: true })
    requestId: string;

    @Column({ name: 'external_reference', nullable: true })
    externalReference: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: {
        source: string;
        module: string;
        integration?: string;
        webhook?: boolean;
        [key: string]: any;
    };

    @Column({ name: 'timestamp' })
    timestamp: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

@Entity('po_financing_requests')
export class POFinancingRequest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'request_number', unique: true })
    requestNumber: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({ name: 'po_number' })
    poNumber: string;

    @Column({ name: 'po_date' })
    poDate: Date;

    @Column({ name: 'buyer_name' })
    buyerName: string;

    @Column({ name: 'buyer_gstin', nullable: true })
    buyerGstin: string;

    @Column({ name: 'supplier_name' })
    supplierName: string;

    @Column({ name: 'supplier_gstin', nullable: true })
    supplierGstin: string;

    @Column({ name: 'po_amount', type: 'decimal', precision: 15, scale: 2 })
    poAmount: number;

    @Column({ name: 'financing_amount', type: 'decimal', precision: 15, scale: 2 })
    financingAmount: number;

    @Column({ name: 'financing_percentage', type: 'decimal', precision: 5, scale: 2 })
    financingPercentage: number;

    @Column({ name: 'interest_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
    interestRate: number;

    @Column({ name: 'tenure_days', nullable: true })
    tenureDays: number;

    @Column({ name: 'status', default: 'pending' })
    status: 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed' | 'completed' | 'cancelled';

    @Column({ type: 'jsonb' })
    purchaseOrderDetails: {
        items: any[];
        deliveryTerms: string;
        paymentTerms: string;
        deliveryDate: Date;
        otherTerms: string;
    };

    @Column({ type: 'jsonb', nullable: true })
    buyerDetails: {
        creditRating: string;
        paymentHistory: string;
        yearsInBusiness: number;
        annualRevenue: number;
        industry: string;
    };

    @Column({ type: 'jsonb', nullable: true })
    supplierDetails: {
        creditRating: string;
        yearsInBusiness: number;
        annualRevenue: number;
        industry: string;
        pastPerformance: string;
    };

    @Column({ type: 'jsonb', nullable: true })
    documents: {
        purchaseOrder: string;
        supplierKyc: string[];
        buyerKyc: string[];
        otherDocuments: string[];
    };

    @Column({ name: 'submitted_at', nullable: true })
    submittedAt: Date;

    @Column({ name: 'approved_at', nullable: true })
    approvedAt: Date;

    @Column({ name: 'disbursed_at', nullable: true })
    disbursedAt: Date;

    @Column({ name: 'completed_at', nullable: true })
    completedAt: Date;

    @Column({ type: 'text', nullable: true })
    rejectionReason: string;

    @Column({ type: 'jsonb', default: {} })
    metadata: {
        source: string;
        campaign?: string;
        referral?: string;
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
}
