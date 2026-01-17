import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

/**
 * Network Payment Observation Entity
 * 
 * Anonymized payment behavior data for network intelligence
 * Privacy-first: No tenant IDs, no buyer names, only aggregatable metrics
 */
@Entity('network_payment_observations')
@Index(['globalBuyerId'])
@Index(['industryCode'])
@Index(['observationDate'])
@Index(['globalBuyerId', 'observationDate'])
export class NetworkPaymentObservation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Anonymized Identifiers
    @Column({ type: 'varchar', length: 64 })
    @Index()
    globalBuyerId: string; // SHA-256 hash

    @Column({ type: 'varchar', length: 64 })
    @Index()
    anonymousTenantId: string; // SHA-256 hash of tenant, for uniqueness checks

    // Classification Context
    @Column({ type: 'varchar', length: 50 })
    industryCode: string;

    @Column({ type: 'varchar', length: 50 })
    region: string;

    @Column({ type: 'varchar', length: 20 })
    revenueClass: string;

    // Payment Behavior (Anonymized)
    @Column({ type: 'integer' })
    daysToPay: number;

    @Column({ type: 'integer' })
    invoiceAgeAtPayment: number; // Days from invoice date

    @Column({ type: 'boolean', default: false })
    paidOnTime: boolean;

    @Column({ type: 'boolean', default: false })
    paidEarly: boolean;

    @Column({ type: 'boolean', default: false })
    paidLate: boolean;

    @Column({ type: 'integer', nullable: true })
    daysLate: number; // If paid late

    // Transaction Characteristics (Normalized)
    @Column({ type: 'varchar', length: 20 })
    transactionSizeCategory: string; // 'SMALL' | 'MEDIUM' | 'LARGE' | 'VERY_LARGE'

    @Column({ type: 'boolean', default: false })
    wasPartialPayment: boolean;

    @Column({ type: 'boolean', default: false })
    hadDispute: boolean;

    @Column({ type: 'integer', default: 0 })
    disputeDuration: number; // Days to resolve

    // Quality Indicators
    @Column({ type: 'boolean', default: false })
    requiredFollowUp: boolean;

    @Column({ type: 'integer', default: 0 })
    followUpCount: number;

    @Column({ type: 'boolean', default: false })
    promiseToPayGiven: boolean;

    @Column({ type: 'boolean', default: false })
    promiseToPayKept: boolean;

    // Temporal Context
    @Column({ type: 'date' })
    @Index()
    observationDate: Date; // Month/Year only (no exact dates for privacy)

    @Column({ type: 'varchar', length: 20 })
    seasonality: string; // 'Q1' | 'Q2' | 'Q3' | 'Q4'

    @Column({ type: 'integer' })
    observationYear: number;

    @Column({ type: 'integer' })
    observationMonth: number;

    // Data Quality
    @Column({ type: 'decimal', precision: 5, scale: 2, default: 100 })
    dataQuality: number; // Completeness score (0-100)

    @Column({ type: 'boolean', default: true })
    verified: boolean; // Verified by system

    // Privacy Metadata
    @Column({ type: 'boolean', default: true })
    anonymized: boolean;

    @Column({ type: 'boolean', default: true })
    aggregatable: boolean; // Can be used in aggregations

    @Column({ type: 'timestamp' })
    contributedAt: Date;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Helper method to categorize transaction size
    static categorizeTransactionSize(amount: number): string {
        if (amount < 50000) return 'SMALL'; // < 50K
        if (amount < 500000) return 'MEDIUM'; // 50K - 5L
        if (amount < 5000000) return 'LARGE'; // 5L - 50L
        return 'VERY_LARGE'; // > 50L
    }

    // Helper method to extract seasonality
    static extractSeasonality(date: Date): string {
        const month = date.getMonth() + 1;
        if (month <= 3) return 'Q1';
        if (month <= 6) return 'Q2';
        if (month <= 9) return 'Q3';
        return 'Q4';
    }
}
