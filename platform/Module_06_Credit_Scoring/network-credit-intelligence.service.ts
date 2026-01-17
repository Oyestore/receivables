import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { createHash } from 'crypto';
import { NetworkBuyerProfile } from './network-buyer-profile.entity';
import { NetworkPaymentObservation } from './network-payment-observation.entity';
import { TenantContribution } from './tenant-contribution.entity';
import { NetworkIntelligence } from './network-intelligence.entity';
import { BuyerProfile } from './buyer-profile.entity';

/**
 * Network Credit Intelligence Service
 * 
 * The 10x multiplier: Community-powered credit scoring
 * Transforms isolated credit assessment into network intelligence
 */
@Injectable()
export class NetworkCreditIntelligenceService {
    private readonly logger = new Logger(NetworkCreditIntelligenceService.name);

    constructor(
        @InjectRepository(NetworkBuyerProfile)
        private readonly networkBuyerRepo: Repository<NetworkBuyerProfile>,
        @InjectRepository(NetworkPaymentObservation)
        private readonly observationRepo: Repository<NetworkPaymentObservation>,
        @InjectRepository(TenantContribution)
        private readonly contributionRepo: Repository<TenantContribution>,
        @InjectRepository(NetworkIntelligence)
        private readonly intelligenceRepo: Repository<NetworkIntelligence>,
        @InjectRepository(BuyerProfile)
        private readonly buyerProfileRepo: Repository<BuyerProfile>,
    ) {
        this.logger.log('Network Credit Intelligence Service initialized');
    }

    /**
     * Get community credit score for a buyer
     * This is the PRIMARY value proposition
     */
    async getCommunityScore(
        buyerPAN: string,
        tenantId: string,
    ): Promise<{
        communityScore: number;
        trustTier: string;
        dataPoints: number;
        confidence: number;
        aggregateMetrics: any;
        industryRank: number;
        trendDirection: string;
        badges: string[];
        accessGranted: boolean;
        upgradeRequired?: boolean;
    }> {
        try {
            // Check tenant access
            const contribution = await this.contributionRepo.findOne({
                where: { tenantId, isActive: true },
            });

            if (!contribution || !contribution.benefits.communityScoreAccess) {
                return {
                    communityScore: 0,
                    trustTier: 'Unknown',
                    dataPoints: 0,
                    confidence: 0,
                    aggregateMetrics: null,
                    industryRank: 0,
                    trendDirection: 'unknown',
                    badges: [],
                    accessGranted: false,
                    upgradeRequired: true,
                };
            }

            // Get network profile
            const globalBuyerId = this.hashIdentifier(buyerPAN);
            const networkProfile = await this.networkBuyerRepo.findOne({
                where: { globalBuyerId, isActive: true },
            });

            if (!networkProfile) {
                this.logger.log(`No network data for buyer: ${globalBuyerId}`);
                return {
                    communityScore: 50, // Neutral score
                    trustTier: 'Bronze',
                    dataPoints: 0,
                    confidence: 0,
                    aggregateMetrics: null,
                    industryRank: 50,
                    trendDirection: 'unknown',
                    badges: [],
                    accessGranted: true,
                };
            }

            // Record access
            contribution.networkScoresAccessed += 1;
            contribution.lastAccessDate = new Date();
            await this.contributionRepo.save(contribution);

            return {
                communityScore: networkProfile.communityScore,
                trustTier: networkProfile.trustTier,
                dataPoints: networkProfile.dataPoints,
                confidence: networkProfile.confidence,
                aggregateMetrics: networkProfile.aggregateMetrics,
                industryRank: networkProfile.industryRank,
                trendDirection: networkProfile.trendDirection,
                badges: networkProfile.trustBadges || [],
                accessGranted: true,
            };
        } catch (error) {
            this.logger.error(`Failed to get community score: ${error.message}`);
            throw error;
        }
    }

    /**
     * Contribute payment observation to network
     * Privacy-first: Anonymizes before storing
     */
    async contributePaymentObservation(
        tenantId: string,
        buyerPAN: string,
        paymentData: {
            daysToPay: number;
            invoiceAmount: number;
            transactionDate: Date;
            paidOnTime: boolean;
            hadDispute: boolean;
            industryCode: string;
            region: string;
            revenueClass: string;
        },
    ): Promise<void> {
        try {
            // Check if tenant opted in
            const contribution = await this.contributionRepo.findOne({
                where: { tenantId, isActive: true },
            });

            if (!contribution || !contribution.optInToNetworkSharing) {
                this.logger.log(`Tenant ${tenantId} not opted in for sharing`);
                return;
            }

            if (!contribution.privacySettings.sharePaymentHistory) {
                return;
            }

            // Anonymize identifiers
            const globalBuyerId = this.hashIdentifier(buyerPAN);
            const anonymousTenantId = this.hashIdentifier(tenantId);

            // Create observation
            const observation = new NetworkPaymentObservation();
            observation.globalBuyerId = globalBuyerId;
            observation.anonymousTenantId = anonymousTenantId;
            observation.industryCode = paymentData.industryCode;
            observation.region = paymentData.region;
            observation.revenueClass = paymentData.revenueClass;
            observation.daysToPay = paymentData.daysToPay;
            observation.invoiceAgeAtPayment = paymentData.daysToPay;
            observation.paidOnTime = paymentData.paidOnTime;
            observation.paidLate = !paymentData.paidOnTime;
            observation.daysLate = paymentData.paidOnTime ? 0 : Math.abs(paymentData.daysToPay);
            observation.transactionSizeCategory = NetworkPaymentObservation.categorizeTransactionSize(
                paymentData.invoiceAmount,
            );
            observation.hadDispute = paymentData.hadDispute;
            observation.observationDate = new Date(
                paymentData.transactionDate.getFullYear(),
                paymentData.transactionDate.getMonth(),
                1,
            ); // Month/year only
            observation.seasonality = NetworkPaymentObservation.extractSeasonality(
                paymentData.transactionDate,
            );
            observation.observationYear = paymentData.transactionDate.getFullYear();
            observation.observationMonth = paymentData.transactionDate.getMonth() + 1;
            observation.contributedAt = new Date();

            await this.observationRepo.save(observation);

            // Update contribution metrics
            contribution.transactionsShared += 1;
            await this.contributionRepo.save(contribution);

            this.logger.log(`Payment observation contributed for buyer: ${globalBuyerId}`);
        } catch (error) {
            this.logger.error(`Failed to contribute observation: ${error.message}`);
            // Don't throw - contribution failures shouldn't break main workflow
        }
    }

    /**
     * Aggregate network data and update buyer profiles
     * Runs daily via cron job
     */
    @Cron('0 2 * * *') // 2 AM daily
    async aggregateNetworkData(): Promise<void> {
        try {
            this.logger.log('Starting network data aggregation...');

            const startTime = Date.now();

            // Get all global buyer IDs with observations
            const globalBuyerIds = await this.observationRepo
                .createQueryBuilder('obs')
                .select('DISTINCT obs.globalBuyerId')
                .where('obs.isActive = :active', { active: true })
                .getRawMany();

            let processed = 0;
            let updated = 0;

            for (const { globalBuyerId } of globalBuyerIds) {
                try {
                    await this.aggregateBuyerData(globalBuyerId);
                    processed++;
                    updated++;

                    if (processed % 100 === 0) {
                        this.logger.log(`Processed ${processed} buyers...`);
                    }
                } catch (error) {
                    this.logger.error(`Failed to aggregate buyer ${globalBuyerId}: ${error.message}`);
                }
            }

            const duration = Date.now() - startTime;
            this.logger.log(
                `Network aggregation complete: ${updated}/${processed} buyers updated in ${duration}ms`,
            );
        } catch (error) {
            this.logger.error(`Network aggregation failed: ${error.message}`);
        }
    }

    /**
     * Aggregate data for a single buyer
     */
    private async aggregateBuyerData(globalBuyerId: string): Promise<void> {
        // Get all observations for this buyer
        const observations = await this.observationRepo.find({
            where: { globalBuyerId, isActive: true },
            order: { observationDate: 'DESC' },
        });

        if (observations.length === 0) {
            return;
        }

        // Calculate aggregate metrics
        const totalTransactions = observations.length;
        const uniqueTenants = new Set(observations.map((o) => o.anonymousTenantId)).size;
        const avgDaysToPay =
            observations.reduce((sum, o) => sum + o.daysToPay, 0) / totalTransactions;
        const onTimeCount = observations.filter((o) => o.paidOnTime).length;
        const onTimePaymentRate = (onTimeCount / totalTransactions) * 100;
        const disputeCount = observations.filter((o) => o.hadDispute).length;
        const disputeRate = (disputeCount / totalTransactions) * 100;
        const partialPayments = observations.filter((o) => o.wasPartialPayment).length;
        const partialPaymentRate = (partialPayments / totalTransactions) * 100;

        // Calculate community score (0-100)
        const communityScore = this.calculateCommunityScore({
            avgDaysToPay,
            onTimePaymentRate,
            disputeRate,
            partialPaymentRate,
            totalTransactions,
            uniqueTenants,
        });

        // Calculate confidence based on data points
        const confidence = this.calculateConfidence(totalTransactions, uniqueTenants);

        // Calculate trend
        const recentObs = observations.slice(0, 10);
        const olderObs = observations.slice(10, 20);
        const trendDirection =
            this.calculateTrend(recentObs, olderObs);

        // Get or create network profile
        let profile = await this.networkBuyerRepo.findOne({
            where: { globalBuyerId },
        });

        if (!profile) {
            profile = new NetworkBuyerProfile();
            profile.globalBuyerId = globalBuyerId;
            profile.industryCode = observations[0].industryCode;
            profile.region = observations[0].region;
            profile.revenueClass = observations[0].revenueClass;
        }

        // Update profile
        profile.communityScore = communityScore;
        profile.dataPoints = totalTransactions;
        profile.confidence = confidence;
        profile.aggregateMetrics = {
            avgDaysToPay,
            onTimePaymentRate,
            disputeRate,
            partialPaymentRate,
            totalTransactions,
            totalVolume: 0, // Anonymized
            avgTransactionSize: 0, // Anonymized
        };
        profile.trendDirection = trendDirection;
        profile.verifiedByCount = uniqueTenants;
        profile.contributingTenants = uniqueTenants;
        profile.lastDataUpdate = new Date();

        // Calculate Credit Trust Score
        profile.creditTrustScore = this.calculateCreditTrustScore(profile);
        profile.trustTier = profile.calculateTrustTier();

        // Generate trust badges
        profile.trustBadges = this.generateTrustBadges(profile);

        // Calculate consistency score
        profile.consistencyScore = this.calculateConsistencyScore(observations);

        await this.networkBuyerRepo.save(profile);
    }

    /**
     * Calculate community score (0-100)
     */
    private calculateCommunityScore(metrics: {
        avgDaysToPay: number;
        onTimePaymentRate: number;
        disputeRate: number;
        partialPaymentRate: number;
        totalTransactions: number;
        uniqueTenants: number;
    }): number {
        let score = 50; // Start neutral

        // On-time payment rate (0-40 points)
        score += (metrics.onTimePaymentRate / 100) * 40;

        // Average days to pay (0-30 points)
        const avgDaysScore = Math.max(0, 30 - metrics.avgDaysToPay);
        score += (avgDaysScore / 30) * 30;

        // Dispute rate (0-15 points penalty)
        score -= (metrics.disputeRate / 100) * 15;

        // Partial payment rate (0-10 points penalty)
        score -= (metrics.partialPaymentRate / 100) * 10;

        // Data volume bonus (0-5 points)
        const volumeBonus = Math.min(5, metrics.totalTransactions / 20);
        score += volumeBonus;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate confidence based on data volume
     */
    private calculateConfidence(totalTransactions: number, uniqueTenants: number): number {
        const transactionConfidence = Math.min(50, totalTransactions * 2);
        const tenantConfidence = Math.min(50, uniqueTenants * 5);
        return Math.min(100, transactionConfidence + tenantConfidence);
    }

    /**
     * Calculate trend direction
     */
    private calculateTrend(recentObs: any[], olderObs: any[]): string {
        if (recentObs.length < 3 || olderObs.length < 3) {
            return 'stable';
        }

        const recentAvg =
            recentObs.reduce((sum, o) => sum + o.daysToPay, 0) / recentObs.length;
        const olderAvg = olderObs.reduce((sum, o) => sum + o.daysToPay, 0) / olderObs.length;

        const change = ((olderAvg - recentAvg) / olderAvg) * 100;

        if (change > 10) return 'improving';
        if (change < -10) return 'declining';
        return 'stable';
    }

    /**
     * Calculate Credit Trust Score
     */
    private calculateCreditTrustScore(profile: NetworkBuyerProfile): number {
        let score = profile.communityScore * 0.6; // 60% weight

        // Verification bonus
        const verificationBonus = Math.min(20, profile.verifiedByCount * 2);
        score += verificationBonus;

        // Consistency bonus
        const consistencyBonus = (profile.consistencyScore / 100) * 10;
        score += consistencyBonus;

        // Trend adjustment
        if (profile.trendDirection === 'improving') score += 5;
        if (profile.trendDirection === 'declining') score -= 5;

        // Confidence adjustment
        const confAdj = (profile.confidence / 100) * 5;
        score += confAdj;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate consistency score across tenants
     */
    private calculateConsistencyScore(observations: NetworkPaymentObservation[]): number {
        if (observations.length < 10) return 50;

        const tenantGroups = new Map<string, number[]>();

        for (const obs of observations) {
            if (!tenantGroups.has(obs.anonymousTenantId)) {
                tenantGroups.set(obs.anonymousTenantId, []);
            }
            tenantGroups.get(obs.anonymousTenantId).push(obs.daysToPay);
        }

        if (tenantGroups.size < 2) return 75;

        const tenantAvgs = Array.from(tenantGroups.values()).map(
            (days) => days.reduce((sum, d) => sum + d, 0) / days.length,
        );

        const globalAvg = tenantAvgs.reduce((sum, avg) => sum + avg, 0) / tenantAvgs.length;
        const variance =
            tenantAvgs.reduce((sum, avg) => sum + Math.pow(avg - globalAvg, 2), 0) /
            tenantAvgs.length;
        const stdDev = Math.sqrt(variance);

        // Lower stddev = higher consistency
        const consistencyScore = Math.max(0, 100 - stdDev * 2);

        return Math.min(100, consistencyScore);
    }

    /**
     * Generate trust badges
     */
    private generateTrustBadges(profile: NetworkBuyerProfile): string[] {
        const badges: string[] = [];

        if (profile.verifiedByCount >= 50) {
            badges.push(`Verified by ${profile.verifiedByCount}+ businesses`);
        }

        if (profile.aggregateMetrics?.onTimePaymentRate >= 95) {
            badges.push('Excellent payment record');
        }

        if (profile.creditTrustScore >= 90) {
            badges.push('Top 10% credit trust');
        }

        if (profile.trendDirection === 'improving') {
            badges.push('Improving performance');
        }

        if (profile.consistencyScore >= 90) {
            badges.push('Highly consistent payer');
        }

        return badges;
    }

    /**
     * Hash identifier for anonymization (SHA-256)
     */
    private hashIdentifier(identifier: string): string {
        return createHash('sha256').update(identifier).digest('hex');
    }

    /**
     * Register tenant for network participation
     */
    async registerTenant(
        tenantId: string,
        tier: string = 'STANDARD',
    ): Promise<TenantContribution> {
        let contribution = await this.contributionRepo.findOne({
            where: { tenantId },
        });

        if (!contribution) {
            contribution = new TenantContribution();
            contribution.tenantId = tenantId;
            contribution.contributionTier = tier;
            contribution.optInToNetworkSharing = true;
            contribution.privacySettings = {
                sharePaymentHistory: true,
                shareIndustryData: true,
                shareRegionalData: true,
                allowCrossTenantBenchmarking: true,
            };
        }

        contribution.calculateBenefits();
        await this.contributionRepo.save(contribution);

        this.logger.log(`Tenant ${tenantId} registered for network with tier: ${tier}`);
        return contribution;
    }

    /**
     * Get network intelligence for tenant
     */
    async getNetworkIntelligence(
        tenantId: string,
        industryCode?: string,
    ): Promise<NetworkIntelligence[]> {
        const contribution = await this.contributionRepo.findOne({
            where: { tenantId },
        });

        if (!contribution) {
            return [];
        }

        const query = this.intelligenceRepo
            .createQueryBuilder('intel')
            .where('intel.isActive = :active', { active: true })
            .andWhere('intel.validUntil > :now', { now: new Date() })
            .orderBy('intel.severity', 'DESC')
            .addOrderBy('intel.createdAt', 'DESC');

        if (industryCode) {
            query.andWhere('(intel.industryCode = :industry OR intel.industryCode IS NULL)', {
                industry: industryCode,
            });
        }

        const intelligence = await query.getMany();

        // Filter by tenant tier access
        return intelligence.filter((intel) =>
            intel.isAccessibleBy(contribution.contributionTier),
        );
    }
}
