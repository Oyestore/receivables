import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

export enum ReferralStatus {
    PENDING = 'pending',
    CONVERTED = 'converted',
    COMPLETED = 'completed',
    REWARDED = 'rewarded',
    EXPIRED = 'expired',
    FRAUD = 'fraud',
}

export enum RewardType {
    POINTS = 'points',
    CASH = 'cash',
    DISCOUNT = 'discount',
    CREDITS = 'credits',
}

export enum RewardTier {
    BRONZE = 'bronze',    // 1-4 referrals
    SILVER = 'silver',    // 5-9 referrals
    GOLD = 'gold',        // 10-24 referrals
    PLATINUM = 'platinum', // 25+ referrals
}

@Entity('referrals')
export class Referral {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'referrer_id', type: 'uuid' })
    referrerId: string; // User who shared the code

    @Column({ name: 'referee_id', type: 'uuid', nullable: true })
    refereeId: string; // User who used the code

    @Column({ name: 'referral_code', unique: true })
    referralCode: string; // Unique 8-character code

    @Column({ name: 'status', type: 'enum', enum: ReferralStatus, default: ReferralStatus.PENDING })
    status: ReferralStatus;

    // Tracking
    @Column({ name: 'clicked_at', type: 'timestamp', nullable: true })
    clickedAt: Date;

    @Column({ name: 'signed_up_at', type: 'timestamp', nullable: true })
    signedUpAt: Date;

    @Column({ name: 'first_payment_at', type: 'timestamp', nullable: true })
    firstPaymentAt: Date;

    @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
    completedAt: Date;

    // Attribution
    @Column({ name: 'utm_source', nullable: true })
    utmSource: string;

    @Column({ name: 'utm_medium', nullable: true })
    utmMedium: string;

    @Column({ name: 'utm_campaign', nullable: true })
    utmCampaign: string;

    @Column({ name: 'referrer_ip', nullable: true })
    referrerIp: string;

    @Column({ name: 'referee_ip', nullable: true })
    refereeIp: string;

    // Rewards
    @Column({ name: 'referrer_reward_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
    referrerRewardAmount: number;

    @Column({ name: 'referee_reward_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
    refereeRewardAmount: number;

    @Column({ name: 'referrer_rewarded_at', type: 'timestamp', nullable: true })
    referrerRewardedAt: Date;

    @Column({ name: 'referee_rewarded_at', type: 'timestamp', nullable: true })
    refereeRewardedAt: Date;

    @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
    expiresAt: Date;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    get referredUserId(): string {
        return this.refereeId;
    }
}

@Entity('referral_rewards')
export class ReferralReward {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @Column({ name: 'referral_id', type: 'uuid' })
    referralId: string;

    @Column({ name: 'reward_type', type: 'enum', enum: RewardType })
    rewardType: RewardType;

    @Column({ name: 'reward_amount', type: 'decimal', precision: 10, scale: 2 })
    rewardAmount: number;

    @Column({ name: 'reward_tier', type: 'enum', enum: RewardTier })
    rewardTier: RewardTier;

    @Column({ name: 'is_claimed', type: 'boolean', default: false })
    isClaimed: boolean;

    @Column({ name: 'claimed_at', type: 'timestamp', nullable: true })
    claimedAt: Date;

    @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
    expiresAt: Date;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

@Entity('referral_stats')
export class ReferralStats {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid', unique: true })
    userId: string;

    // Counts
    @Column({ name: 'total_referrals', type: 'int', default: 0 })
    totalReferrals: number;

    @Column({ name: 'completed_referrals', type: 'int', default: 0 })
    completedReferrals: number;

    @Column({ name: 'pending_referrals', type: 'int', default: 0 })
    pendingReferrals: number;

    // Earnings
    @Column({ name: 'total_earned', type: 'decimal', precision: 10, scale: 2, default: 0 })
    totalEarned: number;

    @Column({ name: 'total_claimed', type: 'decimal', precision: 10, scale: 2, default: 0 })
    totalClaimed: number;

    @Column({ name: 'pending_rewards', type: 'decimal', precision: 10, scale: 2, default: 0 })
    pendingRewards: number;

    // Tier
    @Column({ name: 'current_tier', type: 'enum', enum: RewardTier, default: RewardTier.BRONZE })
    currentTier: RewardTier;

    @Column({ name: 'rank', type: 'int', nullable: true })
    rank: number; // Leaderboard rank

    // Streaks
    @Column({ name: 'current_streak', type: 'int', default: 0 })
    currentStreak: number; // Consecutive months with referrals

    @Column({ name: 'best_streak', type: 'int', default: 0 })
    bestStreak: number;

    @Column({ name: 'last_referral_at', type: 'timestamp', nullable: true })
    lastReferralAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
