import { Injectable, Logger } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Entity, Column, PrimaryColumn, Index, CreateDateColumn } from 'typeorm';

/**
 * Super-Charged Referral Engine 2.0
 * 
 * PHASE 9.5 TIER 1: Transform referrals from one-off rewards into a growth flywheel
 * 
 * Multi-tier referral program with dynamic incentives, social amplification,
 * and ambassador network that drives exponential viral growth.
 */

// ============================================================================
// ENTITIES
// ============================================================================

@Entity('referral_programs')
export class ReferralProgram {
    @PrimaryColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'varchar', length: 50 })
    tier: 'standard' | 'ambassador' | 'enterprise';

    @Column({ type: 'boolean', default: true })
    active: boolean;

    @Column({ type: 'json' })
    baseRewards: {
        referrerReward: number;           // Base reward for referrer
        referredReward: number;           // Welcome bonus for referred
        currency: string;
    };

    @Column({ type: 'json' })
    tierBenefits: {
        minReferrals: number;             // Minimum referrals to qualify
        rewardMultiplier: number;         // 1.0 = base, 1.5 = 50% more
        exclusivePerks: string[];
    };

    @Column({ type: 'json', nullable: true })
    conditions: {
        minContractValue?: number;
        qualifyingIndustries?: string[];
        validityDays?: number;
    };

    @CreateDateColumn()
    createdAt: Date;
}

@Entity('referral_invites')
@Index('idx_referrer_status', ['referrerId', 'status'])
export class ReferralInvite {
    @PrimaryColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    referrerId: string;

    @Column({ type: 'varchar', length: 200 })
    referredEmail: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    referredName: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    referredCompany: string;

    @Column({ type: 'varchar', length: 50 })
    status: string;                       // 'sent', 'clicked', 'signed_up', 'activated'

    @Column({ type: 'varchar', length: 100, nullable: true })
    programId: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    potentialReward: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    earnedReward: number;

    @Column({ type: 'json', nullable: true })
    dynamicIncentives: {
        ltv_multiplier?: number;
        urgency_bonus?: number;
        industry_match_bonus?: number;
    };

    @Column({ type: 'timestamp', nullable: true })
    sentAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    clickedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    convertedAt: Date;

    @CreateDateColumn()
    createdAt: Date;
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface DynamicIncentiveContext {
    referrerLTV: number;                  // Lifetime value of referrer
    referredCompanySize: 'small' | 'medium' | 'large';
    industryMatch: boolean;               // Same industry as referrer
    timeUrgency: 'high' | 'medium' | 'low'; // Campaign urgency
    competitiveThreat: boolean;           // Competitor trying to win them
}

export interface ReferralReward {
    baseReward: number;
    bonuses: Array<{
        type: string;
        amount: number;
        reason: string;
    }>;
    totalReward: number;
    tier: string;
}

export interface SocialShare {
    platform: 'linkedin' | 'twitter' | 'facebook' | 'whatsapp';
    message: string;
    shareLink: string;
    imageUrl?: string;
}

export interface AmbassadorMetrics {
    userId: string;
    totalReferrals: number;
    activeReferrals: number;
    totalEarnings: number;
    currentTier: 'standard' | 'ambassador' | 'enterprise';
    nextTierRequirements: {
        referralsNeeded: number;
        valueNeeded: number;
    };
    performanceScore: number;             // 0-100
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class SuperReferralEngine2Service {
    private readonly logger = new Logger(SuperReferralEngine2Service.name);

    constructor(
        private eventEmitter: EventEmitter2,
        @InjectRepository(ReferralInvite)
        private inviteRepository: Repository<ReferralInvite>,
        @InjectRepository(ReferralProgram)
        private programRepository: Repository<ReferralProgram>,
    ) { }

    /**
     * Send referral invite with dynamic incentives
     */
    async sendReferral(
        referrerId: string,
        referredContact: {
            email: string;
            name?: string;
            company?: string;
        },
        context: Partial<DynamicIncentiveContext> = {},
    ): Promise<ReferralInvite> {
        // Calculate dynamic reward based on context
        const potentialReward = await this.calculateDynamicReward(
            referrerId,
            context,
        );

        const invite = this.inviteRepository.create({
            id: this.generateId(),
            referrerId,
            referredEmail: referredContact.email,
            referredName: referredContact.name,
            referredCompany: referredContact.company,
            status: 'sent',
            programId: await this.selectOptimalProgram(referrerId),
            potentialReward: potentialReward.totalReward,
            earnedReward: null,
            dynamicIncentives: potentialReward.bonuses.reduce((acc, b) => {
                acc[b.type] = b.amount;
                return acc;
            }, {} as any),
            sentAt: new Date(),
            createdAt: new Date(),
        });

        await this.inviteRepository.save(invite);

        // Send invitation (emit event for communication service)
        this.eventEmitter.emit('referral.invite.send', {
            inviteId: invite.id,
            referrerId,
            referredEmail: referredContact.email,
            reward: potentialReward,
        });

        this.logger.log(
            `Referral sent: ${invite.id} from ${referrerId} to ${referredContact.email}, potential reward: ${potentialReward.totalReward}`,
        );

        return invite;
    }

    /**
     * Track referral conversion
     */
    async trackConversion(
        inviteId: string,
        referredUserId: string,
    ): Promise<{
        referrerReward: number;
        referredReward: number;
        celebrationMessage: string;
    }> {
        // Get invite
        const invite = await this.getInvite(inviteId);
        if (!invite) {
            throw new Error(`Referral invite not found: ${inviteId}`);
        }

        // Update status
        invite.status = 'activated';
        invite.convertedAt = new Date();
        invite.earnedReward = invite.potentialReward; // Grant full potential reward

        await this.inviteRepository.save(invite);

        // Award rewards
        const rewards = await this.processRewards(invite);

        // Trigger celebration automation
        await this.celebrateConversion(invite, rewards);

        // Update ambassador status
        await this.updateAmbassadorStatus(invite.referrerId);

        this.logger.log(
            `Referral converted: ${inviteId}, referrer earned ${rewards.referrerReward}`,
        );

        return {
            referrerReward: rewards.referrerReward,
            referredReward: rewards.referredReward,
            celebrationMessage: `🎉 Great news! You just earned ₹${rewards.referrerReward} from your referral!`,
        };
    }

    /**
     * Calculate dynamic reward based on context
     */
    async calculateDynamicReward(
        referrerId: string,
        context: Partial<DynamicIncentiveContext>,
    ): Promise<ReferralReward> {
        const baseReward = 500; // Base ₹500
        const bonuses: Array<{ type: string; amount: number; reason: string }> = [];
        let totalReward = baseReward;

        // LTV Multiplier (high-value referrers get more)
        if (context.referrerLTV && context.referrerLTV > 100000) {
            const ltv_bonus = 500;
            bonuses.push({
                type: 'ltv_multiplier',
                amount: ltv_bonus,
                reason: 'High-value customer bonus',
            });
            totalReward += ltv_bonus;
        }

        // Company Size Multiplier
        if (context.referredCompanySize === 'large') {
            const size_bonus = 2000;
            bonuses.push({
                type: 'company_size',
                amount: size_bonus,
                reason: 'Enterprise referral bonus',
            });
            totalReward += size_bonus;
        } else if (context.referredCompanySize === 'medium') {
            const size_bonus = 500;
            bonuses.push({
                type: 'company_size',
                amount: size_bonus,
                reason: 'Mid-market referral bonus',
            });
            totalReward += size_bonus;
        }

        // Industry Match (same industry as referrer)
        if (context.industryMatch) {
            const industry_bonus = 300;
            bonuses.push({
                type: 'industry_match',
                amount: industry_bonus,
                reason: 'Industry expertise bonus',
            });
            totalReward += industry_bonus;
        }

        // Urgency Bonus (campaign-driven)
        if (context.timeUrgency === 'high') {
            const urgency_bonus = 700;
            bonuses.push({
                type: 'urgency',
                amount: urgency_bonus,
                reason: 'Limited-time campaign bonus',
            });
            totalReward += urgency_bonus;
        }

        // Competitive Threat (win them before competitor does)
        if (context.competitiveThreat) {
            const competitive_bonus = 1000;
            bonuses.push({
                type: 'competitive',
                amount: competitive_bonus,
                reason: 'Competitive win bonus',
            });
            totalReward += competitive_bonus;
        }

        return {
            baseReward,
            bonuses,
            totalReward,
            tier: await this.getCurrentTier(referrerId),
        };
    }

    /**
     * Get ambassador dashboard metrics
     */
    async getAmbassadorDashboard(
        userId: string,
    ): Promise<AmbassadorMetrics> {
        // Query database for real metrics
        const referrals = await this.inviteRepository.find({
            where: { referrerId: userId }
        });

        const totalReferrals = referrals.length;
        const activeReferrals = referrals.filter(r => r.status === 'activated' || r.status === 'signed_up').length;

        // Ensure earnedReward is treated as number (decimal comes as string from DB usually)
        const totalEarnings = referrals.reduce((sum, r) => sum + (Number(r.earnedReward) || 0), 0);

        const currentTier = this.determineTier(totalReferrals);
        const nextTierRequirements = this.getNextTierRequirements(currentTier);

        return {
            userId,
            totalReferrals,
            activeReferrals,
            totalEarnings: Math.round(totalEarnings),
            currentTier,
            nextTierRequirements,
            performanceScore: Math.min(100, (activeReferrals / (totalReferrals || 1)) * 100 + totalReferrals),
        };
    }

    /**
     * Get AI-powered referral suggestions
     */
    async getSuggestedReferrals(
        userId: string,
    ): Promise<Array<{
        contact: {
            name: string;
            company: string;
            industry: string;
        };
        matchScore: number;
        potentialReward: number;
        reasoning: string;
    }>> {
        // Mock AI suggestions - in production, use ML model
        // Keeping this mocked as "AI Upgrade" is a separate task and this requires external data enrichment
        return [
            {
                contact: {
                    name: 'John Doe',
                    company: 'Tech Solutions Ltd',
                    industry: 'Technology',
                },
                matchScore: 92,
                potentialReward: 3500,
                reasoning: 'Similar profile to your successful referrals + enterprise size',
            },
            {
                contact: {
                    name: 'Jane Smith',
                    company: 'Manufacturing Co',
                    industry: 'Manufacturing',
                },
                matchScore: 78,
                potentialReward: 1200,
                reasoning: 'Industry match + medium company size',
            },
        ];
    }

    /**
     * Generate social share content
     */
    async generateSocialShare(
        userId: string,
        platform: SocialShare['platform'],
    ): Promise<SocialShare> {
        const shareLink = `https://platform.com/ref/${userId}`;

        const messages = {
            linkedin: `I've been using this incredible receivables management platform that's saved my business countless hours. Check it out and get ₹500 welcome bonus! ${shareLink}`,
            twitter: `🚀 Game-changing receivables platform! Get paid faster, reduce DSO. Join me and get ₹500 bonus: ${shareLink}`,
            facebook: `Just hit a huge milestone with receivables automation! This platform is amazing. Try it: ${shareLink}`,
            whatsapp: `Hey! I've been using this great platform for managing receivables. You should check it out - you'll get ₹500 to start: ${shareLink}`,
        };

        return {
            platform,
            message: messages[platform],
            shareLink,
        };
    }

    /**
     * Get referral leaderboard
     */
    async getLeaderboard(
        timeframe: 'week' | 'month' | 'all_time',
        limit: number = 10,
    ): Promise<Array<{
        userId: string;
        displayName: string;
        rank: number;
        referrals: number;
        earnings: number;
        badge?: string;
    }>> {
        // Aggregation query for leaderboard
        const result = await this.inviteRepository
            .createQueryBuilder('invite')
            .select('invite.referrerId', 'userId')
            .addSelect('COUNT(invite.id)', 'referrals')
            .addSelect('SUM(invite.earnedReward)', 'earnings')
            .where('invite.status = :status', { status: 'activated' }) // Only successful referrals count
            .groupBy('invite.referrerId')
            .orderBy('referrals', 'DESC')
            .limit(limit)
            .getRawMany();

        return result.map((r, index) => ({
            userId: r.userId,
            displayName: `Referrer ${r.userId.substring(0, 8)}`, // Anonymized for now
            rank: index + 1,
            referrals: parseInt(r.referrals),
            earnings: parseFloat(r.earnings || '0'),
            badge: index < 3 ? ['🥇', '🥈', '🥉'][index] : undefined,
        }));
    }

    // Private helper methods

    private async processRewards(invite: ReferralInvite): Promise<{
        referrerReward: number;
        referredReward: number;
    }> {
        const referrerReward = Number(invite.earnedReward) || 0;
        const referredReward = 500; // Welcome bonus

        // In production: Create wallet transactions
        this.logger.log(
            `Rewards processed: Referrer: ₹${referrerReward}, Referred: ₹${referredReward}`,
        );

        return {
            referrerReward,
            referredReward,
        };
    }

    private async celebrateConversion(
        invite: ReferralInvite,
        rewards: any,
    ): Promise<void> {
        // Send celebration notification
        this.eventEmitter.emit('referral.celebration', {
            referrerId: invite.referrerId,
            reward: rewards.referrerReward,
            referredName: invite.referredName || 'your contact',
        });

        // Optionally: Create social media post if user opted in
        this.eventEmitter.emit('referral.social.celebrate', {
            userId: invite.referrerId,
            achievement: `Earned ${rewards.referrerReward} from referral`,
        });
    }

    private async updateAmbassadorStatus(referrerId: string): Promise<void> {
        // Check if user qualifies for tier upgrade
        const metrics = await this.getAmbassadorDashboard(referrerId);

        const newTier = this.determineTier(metrics.totalReferrals);

        if (newTier !== metrics.currentTier) {
            this.eventEmitter.emit('ambassador.tier.upgraded', {
                userId: referrerId,
                oldTier: metrics.currentTier,
                newTier,
            });

            this.logger.log(`Ambassador ${referrerId} upgraded to ${newTier}`);
        }
    }

    private determineTier(
        totalReferrals: number,
    ): 'standard' | 'ambassador' | 'enterprise' {
        if (totalReferrals >= 50) return 'enterprise';
        if (totalReferrals >= 10) return 'ambassador';
        return 'standard';
    }

    private getNextTierRequirements(
        currentTier: 'standard' | 'ambassador' | 'enterprise',
    ): { referralsNeeded: number; valueNeeded: number } {
        const requirements = {
            standard: { referralsNeeded: 10, valueNeeded: 50000 },
            ambassador: { referralsNeeded: 50, valueNeeded: 250000 },
            enterprise: { referralsNeeded: 0, valueNeeded: 0 }, // Already at top
        };

        return requirements[currentTier];
    }

    private async getCurrentTier(userId: string): Promise<string> {
        const metrics = await this.getAmbassadorDashboard(userId);
        return metrics.currentTier;
    }

    private async selectOptimalProgram(referrerId: string): Promise<string> {
        // Select program based on referrer tier
        const tier = await this.getCurrentTier(referrerId);
        return `program_${tier}`;
    }

    private async getInvite(inviteId: string): Promise<ReferralInvite> {
        return await this.inviteRepository.findOne({ where: { id: inviteId } });
    }

    private generateId(): string {
        return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
