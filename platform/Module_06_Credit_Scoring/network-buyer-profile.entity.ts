import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

/**
 * Network Buyer Profile Entity
 * 
 * Anonymized buyer identity for cross-tenant community credit intelligence
 * Privacy-first design: No PII, only statistical aggregates
 */
@Entity('network_buyer_profiles')
@Index(['globalBuyerId'])
@Index(['industryCode', 'region'])
@Index(['creditTrustScore'])
export class NetworkBuyerProfile {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Anonymized Identity (SHA-256 hash of PAN/GSTIN)
    @Column({ type: 'varchar', length: 64, unique: true })
    @Index()
    globalBuyerId: string;

    // Classification (No PII)
    @Column({ type: 'varchar', length: 50 })
    industryCode: string; // NIC/ISIC code

    @Column({ type: 'varchar', length: 20 })
    revenueClass: string; // 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE'

    @Column({ type: 'varchar', length: 50 })
    region: string; // State/region

    @Column({ type: 'integer', default: 0 })
    employeeRange: number; // 0-10, 11-50, 51-200, 201-500, 500+

    // Community Payment Score (0-100)
    @Column({ type: 'decimal', precision: 5, scale: 2, default: 50 })
    communityScore: number;

    @Column({ type: 'integer', default: 0 })
    dataPoints: number; // Number of tenants contributed

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    confidence: number; // Statistical confidence (0-100)

    // Aggregate Metrics (Across ALL tenants)
    @Column({ type: 'jsonb', nullable: true })
    aggregateMetrics: {
        avgDaysToPay: number;
        onTimePaymentRate: number; // Percentage
        disputeRate: number; // Percentage
        partialPaymentRate: number; // Percentage
        totalTransactions: number;
        totalVolume: number; // Anonymized total
        avgTransactionSize: number;
    };

    // Performance Rankings
    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    industryRank: number; // Percentile rank (0-100)

    @Column({ type: 'varchar', length: 20, default: 'stable' })
    trendDirection: string; // 'improving' | 'stable' | 'declining'

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    trendVelocity: number; // Rate of improvement/decline

    // Credit Trust Score™ (0-100)
    @Column({ type: 'decimal', precision: 5, scale: 2, default: 50 })
    creditTrustScore: number;

    @Column({ type: 'varchar', length: 20, default: 'Bronze' })
    trustTier: string; // 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Risk'

    @Column({ type: 'jsonb', nullable: true })
    trustBadges: string[]; // ['Verified by 50+ businesses', 'Perfect record']

    // Network Validation
    @Column({ type: 'integer', default: 0 })
    verifiedByCount: number; // How many tenants validated

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    consistencyScore: number; // How consistent across tenants (0-100)

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    trustVelocity: number; // Improving/declining trust

    // Risk Indicators
    @Column({ type: 'jsonb', nullable: true })
    riskFlags: {
        inconsistentPaymentBehavior: boolean;
        strategicLatePayment: boolean;
        geographicConcentrationRisk: boolean;
        industryDownturnRisk: boolean;
    };

    @Column({ type: 'integer', default: 0 })
    riskAlertCount: number;

    // Usage Statistics
    @Column({ type: 'jsonb', nullable: true })
    usageStats: {
        autoApprovalRate: number; // Percentage
        avgCreditLimit: number; // Anonymized average
        avgPaymentTerms: number; // Days
        rejectionRate: number; // Percentage
    };

    // Data Quality Metrics
    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    dataQuality: number; // Completeness and recency (0-100)

    @Column({ type: 'timestamp', nullable: true })
    lastDataUpdate: Date;

    @Column({ type: 'integer', default: 0 })
    contributingTenants: number; // Count of unique tenants

    // Privacy Compliance
    @Column({ type: 'boolean', default: true })
    anonymized: boolean;

    @Column({ type: 'boolean', default: false })
    optedOut: boolean; // Buyer opted out of network

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Helper method to calculate trust tier
    calculateTrustTier(): string {
        if (this.creditTrustScore >= 90) return 'Diamond';
        if (this.creditTrustScore >= 80) return 'Platinum';
        if (this.creditTrustScore >= 70) return 'Gold';
        if (this.creditTrustScore >= 60) return 'Silver';
        if (this.creditTrustScore >= 50) return 'Bronze';
        return 'Risk';
    }

    // Helper method to check if buyer is highly trusted
    isHighlyTrusted(): boolean {
        return (
            this.creditTrustScore >= 80 &&
            this.verifiedByCount >= 10 &&
            this.consistencyScore >= 80
        );
    }
}
