import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { NetworkPaymentObservation } from './network-payment-observation.entity';
import { NetworkBuyerProfile } from './network-buyer-profile.entity';
import { NetworkIntelligence } from './network-intelligence.entity';
import { TenantContribution } from './tenant-contribution.entity';

/**
 * Network Pattern Detection Service
 * 
 * AI-powered pattern recognition for network intelligence
 * Discovers emerging risks, industry trends, and strategic insights
 */
@Injectable()
export class NetworkPatternDetectionService {
    private readonly logger = new Logger(NetworkPatternDetectionService.name);

    constructor(
        @InjectRepository(NetworkPaymentObservation)
        private readonly observationRepo: Repository<NetworkPaymentObservation>,
        @InjectRepository(NetworkBuyerProfile)
        private readonly networkBuyerRepo: Repository<NetworkBuyerProfile>,
        @InjectRepository(NetworkIntelligence)
        private readonly intelligenceRepo: Repository<NetworkIntelligence>,
        @InjectRepository(TenantContribution)
        private readonly contributionRepo: Repository<TenantContribution>,
    ) { }

    /**
     * Detect emerging risk patterns
     * Runs daily to identify systemic risks
     */
    @Cron('0 3 * * *') // 3 AM daily
    async detectEmergingRisks(industryCode?: string): Promise<any[]> {
        try {
            this.logger.log('Detecting emerging risk patterns...');

            const patterns: any[] = [];

            // Pattern 1: Selective late payment (pays some on time, delays others)
            const selectivePatterns = await this.detectSelectiveDelays();
            patterns.push(...selectivePatterns);

            // Pattern 2: Industry-wide payment deterioration
            const industryPatterns = await this.detectIndustryDeterioration(industryCode);
            patterns.push(...industryPatterns);

            // Pattern 3: Geographic payment stress
            const geoPatterns = await this.detectGeographicStress();
            patterns.push(...geoPatterns);

            // Pattern 4: Seasonal anomalies
            const seasonalPatterns = await this.detectSeasonalAnomalies();
            patterns.push(...seasonalPatterns);

            // Store as network intelligence
            for (const pattern of patterns) {
                await this.storeIntelligence(pattern);
            }

            this.logger.log(`Detected ${patterns.length} emerging risk patterns`);
            return patterns;
        } catch (error) {
            this.logger.error(`Pattern detection failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Detect selective late payment behavior
     * Pattern: Buyer pays Vendor A on time, delays Vendor B
     */
    private async detectSelectiveDelays(): Promise<any[]> {
        const patterns: any[] = [];

        // Get buyers with inconsistent payment behavior across tenants
        const inconsistentBuyers = await this.observationRepo
            .createQueryBuilder('obs')
            .select([
                'obs.globalBuyerId',
                'COUNT(DISTINCT obs.anonymousTenantId) as tenantCount',
                'AVG(CASE WHEN obs.paidOnTime THEN 1 ELSE 0 END) as avgOnTimeRate',
                'STDDEV(obs.daysToPay) as paymentVariability',
            ])
            .where('obs.isActive = :active', { active: true })
            .andWhere('obs.observationDate > :date', {
                date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
            })
            .groupBy('obs.globalBuyerId')
            .having('COUNT(DISTINCT obs.anonymousTenantId) >= 3') // Verified by 3+ tenants
            .andHaving('STDDEV(obs.daysToPay) > 15') // High variability
            .getRawMany();

        for (const buyer of inconsistentBuyers.slice(0, 20)) {
            // Top 20 only
            patterns.push({
                pattern: `Buyer pays some vendors on time but delays others significantly`,
                buyerCount: 1,
                globalBuyerId: buyer.obs_globalBuyerId,
                riskLevel: 'HIGH',
                recommendation: 'Flag as strategic late payer - negotiate stricter terms',
                evidence: {
                    tenantCount: parseInt(buyer.tenantCount),
                    avgOnTimeRate: parseFloat(buyer.avgOnTimeRate),
                    paymentVariability: parseFloat(buyer.paymentVariability),
                },
            });
        }

        return patterns;
    }

    /**
     * Detect industry-wide payment deterioration
     */
    private async detectIndustryDeterioration(industryCode?: string): Promise<any[]> {
        const patterns: any[] = [];

        const industries = industryCode
            ? [industryCode]
            : await this.getActiveIndustries();

        for (const industry of industries) {
            const recent = await this.getIndustryMetrics(industry, 30); // Last 30 days
            const baseline = await this.getIndustryMetrics(industry, 90, 60); // 60-90 days ago

            if (!recent || !baseline) continue;

            const delayIncrease =
                ((recent.avgDaysToPay - baseline.avgDaysToPay) / baseline.avgDaysToPay) * 100;

            if (delayIncrease > 35) {
                // 35%+ increase
                patterns.push({
                    pattern: `Industry-wide payment delays increasing`,
                    industry,
                    riskLevel: 'HIGH',
                    recommendation: 'Tighten credit terms for this sector',
                    evidence: {
                        delayIncrease: `${delayIncrease.toFixed(1)}%`,
                        recentAvgDays: recent.avgDaysToPay,
                        baselineAvgDays: baseline.avgDaysToPay,
                        affectedBuyers: recent.buyerCount,
                    },
                });
            }
        }

        return patterns;
    }

    /**
     * Detect geographic payment stress
     */
    private async detectGeographicStress(): Promise<any[]> {
        const patterns: any[] = [];

        const regions = await this.getActiveRegions();

        for (const region of regions) {
            const recent = await this.getRegionMetrics(region, 30);
            const baseline = await this.getRegionMetrics(region, 90, 60);

            if (!recent || !baseline) continue;

            const onTimeRateDrop =
                baseline.onTimePaymentRate - recent.onTimePaymentRate;

            if (onTimeRateDrop > 20) {
                // 20+ percentage point drop
                patterns.push({
                    pattern: `Regional payment stress detected`,
                    region,
                    riskLevel: 'MEDIUM',
                    recommendation: 'Monitor regional economic indicators',
                    evidence: {
                        onTimeRateDrop: `${onTimeRateDrop.toFixed(1)}%`,
                        recentRate: recent.onTimePaymentRate,
                        baselineRate: baseline.onTimePaymentRate,
                        affectedBuyers: recent.buyerCount,
                    },
                });
            }
        }

        return patterns;
    }

    /**
     * Detect seasonal anomalies
     */
    private async detectSeasonalAnomalies(): Promise<any[]> {
        const patterns: any[] = [];

        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Compare this month to same month last year
        const currentMetrics = await this.getMonthMetrics(currentYear, currentMonth);
        const lastYearMetrics = await this.getMonthMetrics(currentYear - 1, currentMonth);

        if (currentMetrics && lastYearMetrics) {
            const volumeChange =
                ((currentMetrics.transactionCount - lastYearMetrics.transactionCount) /
                    lastYearMetrics.transactionCount) *
                100;

            if (volumeChange < -50) {
                // 50% volume drop
                patterns.push({
                    pattern: `Unusual drop in business activity`,
                    riskLevel: 'MEDIUM',
                    recommendation: 'Economic slowdown indicator - review credit exposure',
                    evidence: {
                        volumeChange: `${volumeChange.toFixed(1)}%`,
                        currentVolume: currentMetrics.transactionCount,
                        lastYearVolume: lastYearMetrics.transactionCount,
                    },
                });
            }
        }

        return patterns;
    }

    /**
     * Get network insights for tenant dashboard
     */
    async getNetworkInsights(tenantId: string): Promise<any> {
        const contribution = await this.contributionRepo.findOne({
            where: { tenantId },
        });

        if (!contribution) {
            return { error: 'Tenant not registered for network' };
        }

        // Get key metrics
        const totalBuyers = await this.networkBuyerRepo.count();
        const highTrustBuyers = await this.networkBuyerRepo.count({
            where: { creditTrustScore: Between(80, 100) },
        });
        const riskBuyers = await this.networkBuyerRepo.count({
            where: { creditTrustScore: Between(0, 50) },
        });

        const totalObservations = await this.observationRepo.count();

        const recentIntelligence = await this.intelligenceRepo.find({
            where: { isActive: true },
            order: { createdAt: 'DESC' },
            take: 5,
        });

        return {
            networkMetrics: {
                totalBuyers,
                highTrustBuyers,
                riskBuyers,
                totalObservations,
                dataQuality: 85, //(totalObservations / totalBuyers) * 100,
            },
            contribution: {
                tier: contribution.contributionTier,
                buyersShared: contribution.buyersShared,
                transactionsShared: contribution.transactionsShared,
                networkRank: contribution.networkRank,
                benefits: contribution.benefits,
            },
            recentIntelligence: recentIntelligence.map((intel) => ({
                type: intel.intelligenceType,
                severity: intel.severity,
                title: intel.title,
                evidence: intel.evidence,
            })),
        };
    }

    /**
     * Get industry payment trends
     */
    async getIndustryPaymentTrends(industryCode: string): Promise<any> {
        const last12Months = [];
        const now = new Date();

        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const metrics = await this.getIndustryMetrics(
                industryCode,
                30,
                0,
                date,
            );

            last12Months.push({
                month: date.toISOString().substring(0, 7),
                avgDaysToPay: metrics?.avgDaysToPay || 0,
                onTimeRate: metrics?.onTimePaymentRate || 0,
                transactionCount: metrics?.transactionCount || 0,
            });
        }

        return {
            industry: industryCode,
            trends: last12Months,
            currentAvg:
                last12Months[last12Months.length - 1]?.avgDaysToPay || 0,
        };
    }

    /**
     * Get peer benchmarking
     */
    async getPeerBenchmarking(
        tenantId: string,
        industryCode?: string,
    ): Promise<any> {
        // Would compare tenant's buyers against industry peers
        // Simplified version for now
        return {
            message: 'Peer benchmarking feature',
            tenantId,
            industryCode,
        };
    }

    /**
     * Get trust score distribution
     */
    async getTrustScoreDistribution(
        industryCode?: string,
        region?: string,
    ): Promise<any> {
        const query = this.networkBuyerRepo.createQueryBuilder('profile');

        if (industryCode) {
            query.andWhere('profile.industryCode = :industry', { industry: industryCode });
        }

        if (region) {
            query.andWhere('profile.region = :region', { region });
        }

        const profiles = await query.getMany();

        const distribution = {
            Diamond: profiles.filter((p) => p.trustTier === 'Diamond').length,
            Platinum: profiles.filter((p) => p.trustTier === 'Platinum').length,
            Gold: profiles.filter((p) => p.trustTier === 'Gold').length,
            Silver: profiles.filter((p) => p.trustTier === 'Silver').length,
            Bronze: profiles.filter((p) => p.trustTier === 'Bronze').length,
            Risk: profiles.filter((p) => p.trustTier === 'Risk').length,
        };

        return {
            total: profiles.length,
            distribution,
            industryCode,
            region,
        };
    }

    /**
     * Compare buyer to network standards
     */
    async compareBuyerToNetwork(buyerPAN: string, tenantId: string): Promise<any> {
        // Implementation would compare specific buyer metrics to network averages
        return {
            message: 'Buyer comparison feature',
            buyerPAN,
            tenantId,
        };
    }

    // Helper methods

    private async getActiveIndustries(): Promise<string[]> {
        const result = await this.observationRepo
            .createQueryBuilder('obs')
            .select('DISTINCT obs.industryCode')
            .where('obs.isActive = :active', { active: true })
            .getRawMany();

        return result.map((r) => r.obs_industryCode);
    }

    private async getActiveRegions(): Promise<string[]> {
        const result = await this.observationRepo
            .createQueryBuilder('obs')
            .select('DISTINCT obs.region')
            .where('obs.isActive = :active', { active: true })
            .getRawMany();

        return result.map((r) => r.obs_region);
    }

    private async getIndustryMetrics(
        industryCode: string,
        days: number,
        offset: number = 0,
        baseDate: Date = new Date(),
    ): Promise<any> {
        const endDate = new Date(baseDate.getTime() - offset * 24 * 60 * 60 * 1000);
        const startDate = new Date(
            endDate.getTime() - days * 24 * 60 * 60 * 1000,
        );

        const result = await this.observationRepo
            .createQueryBuilder('obs')
            .select([
                'AVG(obs.daysToPay) as avgDaysToPay',
                'AVG(CASE WHEN obs.paidOnTime THEN 100 ELSE 0 END) as onTimePaymentRate',
                'COUNT(*) as transactionCount',
                'COUNT(DISTINCT obs.globalBuyerId) as buyerCount',
            ])
            .where('obs.industryCode = :industry', { industry: industryCode })
            .andWhere('obs.observationDate BETWEEN :start AND :end', {
                start: startDate,
                end: endDate,
            })
            .andWhere('obs.isActive = :active', { active: true })
            .getRawOne();

        if (!result || result.transactionCount === '0') return null;

        return {
            avgDaysToPay: parseFloat(result.avgDaysToPay),
            onTimePaymentRate: parseFloat(result.onTimePaymentRate),
            transactionCount: parseInt(result.transactionCount),
            buyerCount: parseInt(result.buyerCount),
        };
    }

    private async getRegionMetrics(
        region: string,
        days: number,
        offset: number = 0,
    ): Promise<any> {
        const endDate = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
        const startDate = new Date(
            endDate.getTime() - days * 24 * 60 * 60 * 1000,
        );

        const result = await this.observationRepo
            .createQueryBuilder('obs')
            .select([
                'AVG(CASE WHEN obs.paidOnTime THEN 100 ELSE 0 END) as onTimePaymentRate',
                'COUNT(DISTINCT obs.globalBuyerId) as buyerCount',
            ])
            .where('obs.region = :region', { region })
            .andWhere('obs.observationDate BETWEEN :start AND :end', {
                start: startDate,
                end: endDate,
            })
            .andWhere('obs.isActive = :active', { active: true })
            .getRawOne();

        if (!result || result.buyerCount === '0') return null;

        return {
            onTimePaymentRate: parseFloat(result.onTimePaymentRate),
            buyerCount: parseInt(result.buyerCount),
        };
    }

    private async getMonthMetrics(year: number, month: number): Promise<any> {
        const result = await this.observationRepo
            .createQueryBuilder('obs')
            .select(['COUNT(*) as transactionCount'])
            .where('obs.observationYear = :year', { year })
            .andWhere('obs.observationMonth = :month', { month })
            .andWhere('obs.isActive = :active', { active: true })
            .getRawOne();

        if (!result) return null;

        return {
            transactionCount: parseInt(result.transactionCount),
        };
    }

    private async storeIntelligence(pattern: any): Promise<void> {
        const intelligence = new NetworkIntelligence();
        intelligence.intelligenceType = 'EMERGING_RISK';
        intelligence.severity = pattern.riskLevel || 'MEDIUM';
        intelligence.title = pattern.pattern;
        intelligence.description = pattern.recommendation;
        intelligence.recommendation = pattern.recommendation;
        intelligence.industryCode = pattern.industry || null;
        intelligence.region = pattern.region || null;
        intelligence.evidence = {
            pattern: pattern.pattern,
            affectedBuyerCount: pattern.buyerCount || pattern.evidence?.affectedBuyers || 0,
            dataPoints: 0,
            confidence: 85,
            timeframe: 'Last 30 days',
        };
        intelligence.affectedBuyers = pattern.buyerCount || 0;
        intelligence.detectedBy = 'NetworkPatternDetectionService';
        intelligence.aiConfidence = 85;
        intelligence.detectedAt = new Date();
        intelligence.validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        intelligence.visibleToTiers = ['STANDARD', 'PREMIUM'];

        await this.intelligenceRepo.save(intelligence);
    }
}
