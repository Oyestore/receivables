import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner, PartnerType, PartnerStatus } from '../entities/partner.entity';
import { PartnerCommission } from '../entities/partner-commission.entity';

export interface PartnerPerformance {
    partnerId: string;
    period: {
        start: Date;
        end: Date;
    };

    // Referrals
    referralsCount: number;
    conversionsCount: number;
    conversionRate: number;

    // Revenue
    revenueGenerated: number;
    averageDealSize: number;

    // Commissions
    commissionsEarned: number;
    commissionsPaid: number;
    commissionsPending: number;

    // Customer quality
    averageCustomerLTV: number;
    churnRate: number;

    // Ranking
    ranking: {
        overall: number;              // Position among all partners
        inTier: number;               // Position in their tier
        percentile: number;           // Top X%
    };
}

@Injectable()
export class PartnerManagementService {
    private readonly logger = new Logger(PartnerManagementService.name);

    constructor(
        private eventEmitter: EventEmitter2,
        @InjectRepository(Partner)
        private partnerRepository: Repository<Partner>,
        @InjectRepository(PartnerCommission)
        private commissionRepository: Repository<PartnerCommission>,
    ) { }

    /**
     * Register new partner
     */
    async registerPartner(
        partnerData: {
            name: string;
            type: PartnerType;
            primaryContact: {
                name: string;
                email: string;
                phone?: string;
            };
            requestedCommissionRate?: number;
        },
    ): Promise<Partner> {
        const partnerId = this.generateId();

        // Determine initial tier and commission rate
        const tier = 'bronze';
        const commissionRate = partnerData.requestedCommissionRate || this.getDefaultCommissionRate(partnerData.type);

        const partner = this.partnerRepository.create({
            id: partnerId,
            name: partnerData.name,
            type: partnerData.type,
            status: PartnerStatus.PENDING,
            primaryContact: partnerData.primaryContact,
            commissionRate,
            tier,
            totalReferrals: 0,
            activeCustomers: 0,
            totalRevenue: 0,
            lifetimeCommissions: 0,
            joinedAt: new Date(),
            lastActivityAt: new Date(),
            apiKeysGenerated: 0
        });

        // Generate API key for integration partners
        if (partnerData.type === PartnerType.INTEGRATION) {
            partner.apiKey = this.generateAPIKey();
            partner.apiKeysGenerated = 1;
        }

        await this.partnerRepository.save(partner);
        this.logger.log(`New partner registered: ${partner.name} (${partnerId})`);

        // Emit event
        this.eventEmitter.emit('partner.registered', partner);

        return partner;
    }

    /**
     * Track partner referral
     */
    async trackReferral(
        partnerId: string,
        customerData: {
            customerId: string;
            email: string;
            companyName: string;
            estimatedRevenue: number;
        },
    ): Promise<{
        referralId: string;
        trackingLink: string;
    }> {
        // In full implementation, this would create a Referral record linked to the Partner.
        // For now, we update the partner stats.
        const referralId = this.generateId();
        const trackingLink = `https://platform.com/ref/${partnerId}/${referralId}`;

        await this.partnerRepository.increment({ id: partnerId }, 'totalReferrals', 1);

        this.logger.log(`Partner referral tracked: ${referralId} by ${partnerId}`);

        // Emit event for tracking
        this.eventEmitter.emit('partner.referral.tracked', {
            partnerId,
            referralId,
            ...customerData,
        });

        return {
            referralId,
            trackingLink,
        };
    }

    /**
     * Calculate and record commission
     */
    async calculateCommission(
        partnerId: string,
        transaction: {
            customerId: string;
            transactionType: 'new_customer' | 'renewal' | 'expansion';
            revenueAmount: number;
        },
    ): Promise<PartnerCommission> {
        // Get partner details
        const partner = await this.partnerRepository.findOne({ where: { id: partnerId } });
        if (!partner) throw new Error('Partner not found');

        // Calculate commission
        const commissionAmount = transaction.revenueAmount * (partner.commissionRate / 100);

        const commission = this.commissionRepository.create({
            id: this.generateId(),
            partnerId,
            customerId: transaction.customerId,
            transactionType: transaction.transactionType,
            revenueAmount: transaction.revenueAmount,
            commissionRate: partner.commissionRate,
            commissionAmount: Math.round(commissionAmount),
            status: 'pending',
            createdAt: new Date(),
        });

        await this.commissionRepository.save(commission);

        // Update partner lifetime stats
        await this.partnerRepository.manager.transaction(async manager => {
            await manager.increment(Partner, { id: partnerId }, 'totalRevenue', transaction.revenueAmount);
            await manager.increment(Partner, { id: partnerId }, 'lifetimeCommissions', commission.commissionAmount);
        });

        this.logger.log(
            `Commission calculated: ₹${commission.commissionAmount} for partner ${partnerId}`
        );

        // Emit event
        this.eventEmitter.emit('partner.commission.calculated', commission);

        return commission;
    }

    /**
     * Get partner performance metrics
     */
    async getPartnerPerformance(
        partnerId: string,
        startDate: Date,
        endDate: Date,
    ): Promise<PartnerPerformance> {
        const partner = await this.partnerRepository.findOne({ where: { id: partnerId } });
        if (!partner) throw new Error('Partner not found');

        // Real aggregation from commissions table
        const { revenueGenerated, commissionsEarned } = await this.commissionRepository
            .createQueryBuilder('commission')
            .select('SUM(commission.revenueAmount)', 'revenueGenerated')
            .addSelect('SUM(commission.commissionAmount)', 'commissionsEarned')
            .where('commission.partnerId = :partnerId', { partnerId })
            .andWhere('commission.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
            .getRawOne();

        const conversionsCount = await this.commissionRepository.count({
            where: {
                partnerId,
                transactionType: 'new_customer',
                // createdAt between... (implied for simplicity or adding complexity if needed)
            }
        });

        const safeRevenue = parseFloat(revenueGenerated) || 0;
        const safeCommissions = parseFloat(commissionsEarned) || 0;

        return {
            partnerId,
            period: { start: startDate, end: endDate },
            referralsCount: partner.totalReferrals, // From partner entity counter
            conversionsCount: conversionsCount,
            conversionRate: partner.totalReferrals > 0 ? conversionsCount / partner.totalReferrals : 0,
            revenueGenerated: safeRevenue,
            averageDealSize: conversionsCount > 0 ? safeRevenue / conversionsCount : 0,
            commissionsEarned: safeCommissions,
            commissionsPaid: 0, // Simplified: needs payout table
            commissionsPending: safeCommissions, // Assuming all pending
            averageCustomerLTV: 0, // Requires deeper analytics
            churnRate: 0, // Requires deeper analytics
            ranking: {
                overall: 0, // To be implemented in leaderboard
                inTier: 0,
                percentile: 0,
            },
        };
    }

    /**
     * Get partner leaderboard
     */
    async getPartnerLeaderboard(
        metric: 'revenue' | 'referrals' | 'conversions' = 'revenue',
        limit: number = 10,
    ): Promise<Array<{
        rank: number;
        partnerId: string;
        partnerName: string;
        tier: string;
        value: number;
    }>> {
        const query = this.partnerRepository.createQueryBuilder('partner');

        if (metric === 'revenue') {
            query.orderBy('partner.totalRevenue', 'DESC');
        } else if (metric === 'referrals') {
            query.orderBy('partner.totalReferrals', 'DESC');
        } else {
            // conversions implied by activeCustomers for now
            query.orderBy('partner.activeCustomers', 'DESC');
        }

        const topPartners = await query.take(limit).getMany();

        return topPartners.map((p, index) => ({
            rank: index + 1,
            partnerId: p.id,
            partnerName: p.name,
            tier: p.tier,
            value: metric === 'revenue' ? p.totalRevenue : (metric === 'referrals' ? p.totalReferrals : p.activeCustomers),
        }));
    }

    /**
     * Manage partner tier upgrades
     */
    async evaluateTierUpgrade(
        partnerId: string,
    ): Promise<{
        currentTier: 'bronze' | 'silver' | 'gold' | 'platinum';
        recommendedTier: 'bronze' | 'silver' | 'gold' | 'platinum';
        eligible: boolean;
    }> {
        const partner = await this.partnerRepository.findOne({ where: { id: partnerId } });
        if (!partner) throw new Error('Partner Not Found');

        const tierRequirements = {
            platinum: { minimumRevenue: 500000, minimumReferrals: 100 },
            gold: { minimumRevenue: 200000, minimumReferrals: 50 },
            silver: { minimumRevenue: 50000, minimumReferrals: 20 },
            bronze: { minimumRevenue: 0, minimumReferrals: 0 },
        };

        // Determine recommended tier based on performance
        let recommendedTier: typeof partner.tier = 'bronze';

        if (partner.totalRevenue >= tierRequirements.platinum.minimumRevenue &&
            partner.totalReferrals >= tierRequirements.platinum.minimumReferrals) {
            recommendedTier = 'platinum';
        } else if (partner.totalRevenue >= tierRequirements.gold.minimumRevenue &&
            partner.totalReferrals >= tierRequirements.gold.minimumReferrals) {
            recommendedTier = 'gold';
        } else if (partner.totalRevenue >= tierRequirements.silver.minimumRevenue &&
            partner.totalReferrals >= tierRequirements.silver.minimumReferrals) {
            recommendedTier = 'silver';
        }

        const eligible = this.getTierRank(recommendedTier) > this.getTierRank(partner.tier);

        return {
            currentTier: partner.tier,
            recommendedTier,
            eligible,
        };
    }

    /**
     * Generate partner portal access credentials
     */
    async generatePortalAccess(
        partnerId: string,
    ): Promise<{
        portalUrl: string;
        accessToken: string;
        expiresAt: Date;
    }> {
        const accessToken = this.generateAPIKey();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90); // 90 days

        return {
            portalUrl: `https://partners.platform.com/dashboard/${partnerId}`,
            accessToken,
            expiresAt,
        };
    }

    /**
     * Get commission payout report
     */
    async getCommissionPayoutReport(
        partnerId: string,
        status: 'all' | 'pending' | 'paid' = 'all',
    ): Promise<{
        totalCommissions: number;
        commissionsPaid: number;
        commissionsPending: number;
        nextPayoutDate: Date;
        nextPayoutAmount: number;
        transactions: PartnerCommission[];
    }> {
        const transactions = await this.commissionRepository.find({
            where: {
                partnerId,
                status: status === 'all' ? undefined : (status as any)
            },
            order: { createdAt: 'DESC' }
        });

        const totalCommissions = transactions.reduce((sum, t) => sum + Number(t.commissionAmount), 0);
        const commissionsPaid = transactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + Number(t.commissionAmount), 0);
        const commissionsPending = transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + Number(t.commissionAmount), 0);

        const nextPayoutDate = new Date();
        nextPayoutDate.setDate(nextPayoutDate.getDate() + 7);

        return {
            totalCommissions,
            commissionsPaid,
            commissionsPending,
            nextPayoutDate,
            nextPayoutAmount: commissionsPending,
            transactions,
        };
    }

    // Private helper methods

    private getDefaultCommissionRate(type: PartnerType): number {
        const rates = {
            [PartnerType.CHANNEL]: 20,
            [PartnerType.AFFILIATE]: 15,
            [PartnerType.INTEGRATION]: 10,
            [PartnerType.STRATEGIC]: 25,
        };
        return rates[type] || 15;
    }

    private getTierRank(tier: 'bronze' | 'silver' | 'gold' | 'platinum'): number {
        const ranks = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
        return ranks[tier];
    }

    private generateAPIKey(): string {
        return `pk_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }

    private generateId(): string {
        return `prt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
