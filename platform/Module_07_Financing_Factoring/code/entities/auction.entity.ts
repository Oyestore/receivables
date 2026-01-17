import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum AuctionStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    EXPIRED = 'expired',
}

export interface PartnerOfferRecord {
    partnerId: string;
    partnerName: string;
    offerId: string;
    receivedAt: Date;
    responseTime: number; // milliseconds
    offer: any; // StandardOffer
    error?: string;
}

export interface WinningOfferDetails {
    winnerId: string;
    winnerName: string;
    offerId: string;
    rank: number;
    totalOffers: number;
    effectiveAPR: number;
    amount: number;
    tenure: number;
    totalCost: number;
    savings: number; // vs next best
    savingsPercentage: number;
    selectedAt: Date;
    reason: string;
}

export interface AuctionAnalytics {
    // Participation
    partnersInvited: number;
    offersReceived: number;
    offersRejected: number;
    participationRate: number; // (offers / partners) * 100

    // Performance
    averageResponseTime: number; // milliseconds
    fastestPartner: string;
    fastestResponseTime: number;
    slowestPartner: string;
    slowestResponseTime: number;

    // Offer quality
    bestRate: number;
    worstRate: number;
    averageRate: number;
    rateSpread: number; // best - worst

    // Savings
    savingsVsBestAlternative: number;
    savingsPercentage: number;

    // Duration
    startTime: Date;
    endTime: Date;
    durationMs: number;
}

@Entity('financing_auctions')
@Index(['tenantId', 'userId'])
@Index(['applicationId'])
@Index(['status'])
export class FinancingAuction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index()
    applicationId: string;

    @Column()
    tenantId: string;

    @Column()
    userId: string;

    @Column('simple-array')
    partnerIds: string[]; // Partners invited to auction

    @Column({
        type: 'enum',
        enum: AuctionStatus,
        default: AuctionStatus.PENDING,
    })
    status: AuctionStatus;

    @Column('jsonb', { nullable: true, default: [] })
    offers: PartnerOfferRecord[]; // Collected offers

    @Column('jsonb', { nullable: true })
    winningOffer: WinningOfferDetails | null;

    @Column({ type: 'timestamp' })
    startedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    completedAt: Date | null;

    @Column({ type: 'timestamp' })
    expiresAt: Date; // Auction timeout deadline

    @Column({ type: 'int', default: 15 })
    timeoutMinutes: number; // Configurable timeout

    @Column({ type: 'int', default: 2 })
    minOffersRequired: number; // Minimum offers to complete

    @Column('jsonb', { nullable: true })
    analytics: AuctionAnalytics | null;

    @Column('jsonb', { nullable: true })
    rankingContext: {
        prioritize: string;
        urgency: string;
        businessProfile?: any;
    };

    @Column('jsonb', { nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ nullable: true })
    createdBy: string;

    @Column({ nullable: true })
    cancelledBy: string;

    @Column({ type: 'text', nullable: true })
    cancellationReason: string;
}
