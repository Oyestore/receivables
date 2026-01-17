import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

/**
 * Tenant Contribution Entity
 * 
 * Tracks tenant participation in network credit intelligence
 * Implements contribution-based access model
 */
@Entity('tenant_contributions')
@Index(['tenantId'])
@Index(['contributionTier'])
export class TenantContribution {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    @Index()
    tenantId: string;

    // Contribution Tier
    @Column({
        type: 'enum',
        enum: ['PRIVATE', 'RECEIVE_ONLY', 'STANDARD', 'PREMIUM'],
        default: 'STANDARD',
    })
    contributionTier: string;

    // Contribution Metrics
    @Column({ type: 'integer', default: 0 })
    buyersShared: number;

    @Column({ type: 'integer', default: 0 })
    transactionsShared: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    dataQuality: number; // Completeness, recency (0-100)

    @Column({ type: 'integer', default: 0 })
    networkRank: number; // Rank among all contributors (1 = top)

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    contributionScore: number; // Overall contribution score (0-100)

    // Access Benefits
    @Column({ type: 'jsonb', default: {} })
    benefits: {
        communityScoreAccess: boolean;
        advancedAnalytics: boolean;
        earlyWarningAlerts: boolean;
        prioritySupport: boolean;
        customReports: boolean;
        apiAccess: boolean;
    };

    // Usage Metrics
    @Column({ type: 'integer', default: 0 })
    networkScoresAccessed: number;

    @Column({ type: 'integer', default: 0 })
    alertsReceived: number;

    @Column({ type: 'timestamp', nullable: true })
    lastAccessDate: Date;

    // Privacy Settings
    @Column({ type: 'boolean', default: true })
    optInToNetworkSharing: boolean;

    @Column({ type: 'jsonb', default: {} })
    privacySettings: {
        sharePaymentHistory: boolean;
        shareIndustryData: boolean;
        shareRegionalData: boolean;
        allowCrossTenantBenchmarking: boolean;
    };

    // Subscription Details
    @Column({ type: 'varchar', length: 50, nullable: true })
    subscriptionPlan: string; // 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE'

    @Column({ type: 'timestamp', nullable: true })
    subscriptionStartDate: Date;

    @Column({ type: 'timestamp', nullable: true })
    subscriptionEndDate: Date;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Helper method to check access level
    hasAccessTo(feature: string): boolean {
        return this.benefits[feature] === true;
    }

    // Helper method to calculate tier benefits
    calculateBenefits(): void {
        switch (this.contributionTier) {
            case 'PRIVATE':
                this.benefits = {
                    communityScoreAccess: false,
                    advancedAnalytics: false,
                    earlyWarningAlerts: false,
                    prioritySupport: false,
                    customReports: false,
                    apiAccess: false,
                };
                break;
            case 'RECEIVE_ONLY':
                this.benefits = {
                    communityScoreAccess: true,
                    advancedAnalytics: false,
                    earlyWarningAlerts: false,
                    prioritySupport: false,
                    customReports: false,
                    apiAccess: false,
                };
                break;
            case 'STANDARD':
                this.benefits = {
                    communityScoreAccess: true,
                    advancedAnalytics: true,
                    earlyWarningAlerts: true,
                    prioritySupport: false,
                    customReports: false,
                    apiAccess: false,
                };
                break;
            case 'PREMIUM':
                this.benefits = {
                    communityScoreAccess: true,
                    advancedAnalytics: true,
                    earlyWarningAlerts: true,
                    prioritySupport: true,
                    customReports: true,
                    apiAccess: true,
                };
                break;
        }
    }
}
