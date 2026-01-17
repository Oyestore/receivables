import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { FinancingApplication } from './financing-application.entity';

export enum OfferStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected',
    EXPIRED = 'expired',
    WITHDRAWN = 'withdrawn',
}

export enum OfferType {
    PRE_APPROVED = 'pre_approved',
    CUSTOM = 'custom',
    NEGOTIATED = 'negotiated',
}

@Entity('financing_offers')
export class FinancingOffer {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'offer_number', unique: true })
    offerNumber: string;

    @Column({ name: 'application_id' })
    applicationId: string;

    @Column({ name: 'partner_id' })
    partnerId: string;

    @Column({ name: 'offer_type', type: 'enum', enum: OfferType, default: OfferType.CUSTOM })
    offerType: OfferType;

    @Column({ name: 'offer_amount', type: 'decimal', precision: 15, scale: 2 })
    offerAmount: number;

    @Column({ name: 'interest_rate', type: 'decimal', precision: 5, scale: 2 })
    interestRate: number;

    @Column({ name: 'processing_fee', type: 'decimal', precision: 5, scale: 2 })
    processingFee: number;

    @Column({ name: 'tenure_months' })
    tenureMonths: number;

    @Column({ name: 'emi_amount', type: 'decimal', precision: 15, scale: 2 })
    emiAmount: number;

    @Column({ name: 'total_interest', type: 'decimal', precision: 15, scale: 2 })
    totalInterest: number;

    @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2 })
    totalAmount: number;

    @Column({ name: 'net_disbursement_amount', type: 'decimal', precision: 15, scale: 2 })
    netDisbursementAmount: number;

    @Column({ name: 'status', type: 'enum', enum: OfferStatus, default: OfferStatus.PENDING })
    status: OfferStatus;

    @Column({ name: 'valid_until' })
    validUntil: Date;

    @Column({ name: 'accepted_at', nullable: true })
    acceptedAt: Date;

    @Column({ name: 'rejected_at', nullable: true })
    rejectedAt: Date;

    @Column({ name: 'expires_at' })
    expiresAt: Date;

    @Column({ type: 'jsonb' })
    terms: {
        repaymentSchedule: any[];
        prepaymentTerms: string;
        latePaymentPenalty: number;
        foreclosureCharges: number;
        otherCharges: any;
        documentation: string[];
        processingTime: number;
        disbursementMethod: string;
    };

    @Column({ type: 'jsonb', nullable: true })
    eligibility: {
        minCreditScore: number;
        maxDebtToIncome: number;
        minBusinessAge: number;
        requiredDocuments: string[];
        otherCriteria: any;
    };

    @Column({ type: 'jsonb', nullable: true })
    features: {
        flexibleRepayment: boolean;
        prepaymentAllowed: boolean;
        partPaymentAllowed: boolean;
        creditLine: boolean;
        renewalOption: boolean;
        otherFeatures: string[];
    };

    @Column({ type: 'text', nullable: true })
    rejectionReason: string;

    @Column({ name: 'external_offer_id', nullable: true })
    externalOfferId: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: {
        source: string;
        campaign?: string;
        referral?: string;
        score: number;
        confidence: number;
        aiGenerated: boolean;
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
    @ManyToOne(() => FinancingApplication, application => application.offers)
    @JoinColumn({ name: 'application_id' })
    application: FinancingApplication;
}

@Entity('financing_providers')
export class FinancingProvider {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    name: string;

    @Column({ name: 'display_name' })
    displayName: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'provider_type' })
    providerType: 'nbfc' | 'bank' | 'fintech' | 'p2p' | 'marketplace';

    @Column({ name: 'license_number', nullable: true })
    licenseNumber: string;

    @Column({ name: 'license_expiry', nullable: true })
    licenseExpiry: Date;

    @Column({ name: 'contact_email' })
    contactEmail: string;

    @Column({ name: 'contact_phone', nullable: true })
    contactPhone: string;

    @Column({ name: 'website_url', nullable: true })
    websiteUrl: string;

    @Column({ name: 'logo_url', nullable: true })
    logoUrl: string;

    @Column({ name: 'api_endpoint', nullable: true })
    apiEndpoint: string;

    @Column({ name: 'api_version', nullable: true })
    apiVersion: string;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ name: 'is_verified', default: false })
    isVerified: boolean;

    @Column({ type: 'jsonb' })
    configuration: {
        minAmount: number;
        maxAmount: number;
        minInterestRate: number;
        maxInterestRate: number;
        minTenure: number;
        maxTenure: number;
        supportedProducts: string[];
        integrationType: string;
        webhookUrl?: string;
        credentials?: any;
    };

    @Column({ type: 'jsonb', nullable: true })
    statistics: {
        totalApplications: number;
        approvedApplications: number;
        rejectedApplications: number;
        totalDisbursed: number;
        averageProcessingTime: number;
        lastUpdated: Date;
    };

    @Column({ type: 'jsonb', nullable: true })
    compliance: {
        rbiRegistered: boolean;
        creditBureauIntegration: boolean;
        gstCompliant: boolean;
        amlKycEnabled: boolean;
        dataPrivacyCompliant: boolean;
        certifications: string[];
    };

    @Column({ type: 'jsonb', nullable: true })
    ratings: {
        creditRating?: string;
        customerRating: number;
        industryRanking: number;
        totalReviews: number;
        lastUpdated: Date;
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

@Entity('financing_products')
export class FinancingProduct {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'provider_id' })
    providerId: string;

    @Column({ unique: true })
    name: string;

    @Column({ name: 'display_name' })
    displayName: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'product_type' })
    productType: 'invoice_discounting' | 'invoice_factoring' | 'working_capital' | 'term_loan' | 'overdraft' | 'supply_chain';

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ type: 'jsonb' })
    eligibility: {
        minBusinessAge: number;
        maxBusinessAge?: number;
        minAnnualRevenue: number;
        maxAnnualRevenue?: number;
        minCreditScore: number;
        requiredDocuments: string[];
        excludedIndustries: string[];
        geographicalRestrictions: string[];
    };

    @Column({ type: 'jsonb' })
    terms: {
        minAmount: number;
        maxAmount: number;
        minInterestRate: number;
        maxInterestRate: number;
        minTenure: number;
        maxTenure: number;
        processingFee: number;
        prepaymentCharges: number;
        latePaymentPenalty: number;
        foreclosureCharges: number;
    };

    @Column({ type: 'jsonb' })
    features: {
        flexibleRepayment: boolean;
        prepaymentAllowed: boolean;
        partPaymentAllowed: boolean;
        creditLine: boolean;
        renewalOption: boolean;
        quickDisbursement: boolean;
        minimalDocumentation: boolean;
        onlineProcess: boolean;
    };

    @Column({ type: 'jsonb', nullable: true })
    pricing: {
        interestRateType: 'fixed' | 'floating' | 'reducing';
        interestCalculation: string;
        processingFeeType: 'fixed' | 'percentage';
        otherCharges: any;
    };

    @Column({ type: 'jsonb', nullable: true })
    statistics: {
        totalApplications: number;
        approvedApplications: number;
        rejectedApplications: number;
        averageAmount: number;
        averageTenure: number;
        approvalRate: number;
        lastUpdated: Date;
    };

    @Column({ name: 'sort_order', default: 0 })
    sortOrder: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'created_by' })
    createdBy: string;

    @Column({ name: 'updated_by', nullable: true })
    updatedBy: string;
}
