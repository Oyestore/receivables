import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

/**
 * Network Intelligence Entity
 * 
 * AI-discovered patterns and insights from network data
 * Early warnings, emerging risks, industry trends
 */
@Entity('network_intelligence')
@Index(['intelligenceType'])
@Index(['severity'])
@Index(['validUntil'])
export class NetworkIntelligence {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Intelligence Classification
    @Column({
        type: 'enum',
        enum: ['EMERGING_RISK', 'INDUSTRY_ALERT', 'PATTERN_DETECTION', 'BENCHMARK_INSIGHT'],
    })
    @Index()
    intelligenceType: string;

    @Column({ type: 'varchar', length: 20 })
    @Index()
    severity: string; // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

    // Intelligence Content
    @Column({ type: 'varchar', length: 500 })
    title: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'text' })
    recommendation: string;

    // Context
    @Column({ type: 'varchar', length: 50, nullable: true })
    industryCode: string; // If industry-specific

    @Column({ type: 'varchar', length: 50, nullable: true })
    region: string; // If region-specific

    // Evidence
    @Column({ type: 'jsonb' })
    evidence: {
        pattern: string;
        affectedBuyerCount: number;
        dataPoints: number;
        confidence: number; // 0-100
        timeframe: string; // 'Last 30 days', 'Last quarter'
    };

    // Impact Assessment
    @Column({ type: 'integer', default: 0 })
    affectedBuyers: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    estimatedImpact: number; // Percentage or amount

    @Column({ type: 'jsonb', nullable: true })
    metrics: {
        avgDelayIncrease?: number; // Days
        defaultRateChange?: number; // Percentage points
        volumeChange?: number; // Percentage
        otherMetrics?: Record<string, number>;
    };

    // AI Model Details
    @Column({ type: 'varchar', length: 100 })
    detectedBy: string; // AI model/algorithm name

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    aiConfidence: number; // AI confidence (0-100)

    @Column({ type: 'timestamp' })
    detectedAt: Date;

    // Validity
    @Column({ type: 'timestamp' })
    @Index()
    validUntil: Date;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    // Tenant Visibility
    @Column({ type: 'jsonb', default: [] })
    visibleToTiers: string[]; // ['STANDARD', 'PREMIUM']

    @Column({ type: 'integer', default: 0 })
    viewCount: number;

    @Column({ type: 'integer', default: 0 })
    actionTakenCount: number; // How many tenants acted on this

    // Validation
    @Column({ type: 'boolean', default: false })
    humanValidated: boolean;

    @Column({ type: 'timestamp', nullable: true })
    validatedAt: Date;

    @Column({ type: 'varchar', length: 50, nullable: true })
    validatedBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Helper method to check if still valid
    isValid(): boolean {
        return this.isActive && new Date() < this.validUntil;
    }

    // Helper method to check if tenant can access
    isAccessibleBy(tenantTier: string): boolean {
        return this.visibleToTiers.includes(tenantTier);
    }
}
