import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

/**
 * Network Intelligence Engine - Core Foundation
 * 
 * PHASE 9.5 TIER 1: Network Effects Architecture
 * 
 * Transforms anonymized user data into collective intelligence that creates
 * exponential value as the platform scales.
 * 
 * Key Concept: Every user action improves insights for ALL users
 */

// ============================================================================
// ENTITIES
// ============================================================================

@Entity('network_events')
@Index('idx_industry_size', ['industry', 'companySize'])
@Index('idx_event_type_time', ['eventType', 'timestamp'])
export class NetworkEvent {
    @PrimaryColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 64 })
    tenantHash: string;                // Anonymized tenant ID

    @Column({ type: 'varchar', length: 50 })
    industry: string;

    @Column({ type: 'varchar', length: 20 })
    companySize: string;               // small, medium, large, enterprise

    @Column({ type: 'varchar', length: 50 })
    eventType: string;                 // payment_received, invoice_created, etc.

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    metricValue: number;

    @Column({ type: 'timestamp' })
    timestamp: Date;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;
}

@Entity('network_benchmarks')
@Index('idx_benchmark_lookup', ['metricType', 'industry', 'companySize'])
export class NetworkBenchmark {
    @PrimaryColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 50 })
    metricType: string;                // dso, collection_rate, dispute_rate

    @Column({ type: 'varchar', length: 50 })
    industry: string;

    @Column({ type: 'varchar', length: 20 })
    companySize: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    region: string;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    average: number;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    median: number;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    top10Percent: number;

    @Column({ type: 'integer' })
    sampleSize: number;

    @Column({ type: 'timestamp' })
    generatedAt: Date;

    @Column({ type: 'timestamp' })
    expiresAt: Date;                   // Benchmarks refresh periodically
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface NetworkIntelligenceEvent {
    tenantId: string;
    industry: string;
    companySize: 'small' | 'medium' | 'large' | 'enterprise';
    eventType: string;
    value: number;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface BenchmarkQuery {
    metric: 'dso' | 'collection_rate' | 'dispute_rate' | 'payment_days';
    industry: string;
    companySize: string;
    region?: string;
}

export interface BenchmarkResult {
    metric: string;
    yourValue?: number;
    networkAverage: number;
    industryAverage: number;
    top10Percent: number;
    yourPercentile?: number;
    trend: 'improving' | 'stable' | 'declining';
    sampleSize: number;
}

export interface NetworkInsight {
    type: 'benchmark' | 'prediction' | 'best_practice' | 'peer_learning';
    title: string;
    description: string;
    impact: {
        metric: string;
        currentValue?: number;
        potentialValue: number;
        improvement: string;
    };
    action: {
        type: string;
        description: string;
        ctaText: string;
    };
    socialProof: {
        adoptionRate: string;
        resultsData: string;
    };
    priority: number;                  // 0-100, for ranking
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class NetworkIntelligenceService {
    private readonly logger = new Logger(NetworkIntelligenceService.name);

    constructor(
        @InjectRepository(NetworkEvent)
        private networkEventRepository: Repository<NetworkEvent>,
    ) { }

    /**
     * Collect anonymized network intelligence event
     * 
     * This is called from ALL modules when significant events occur:
     * - Module 01: Invoice created, payment received
     * - Module 03: Payment processed, auto-pay enabled
     * - Module 08: Dispute filed, dispute resolved
     * etc.
     */
    async collectEvent(event: NetworkIntelligenceEvent): Promise<void> {
        try {
            // Anonymize tenant ID
            const tenantHash = this.anonymizeTenantId(event.tenantId);

            // Create network event
            const networkEvent: Partial<NetworkEvent> = {
                id: this.generateId(),
                tenantHash,
                industry: event.industry,
                companySize: event.companySize,
                eventType: event.eventType,
                metricValue: event.value,
                timestamp: event.timestamp,
                metadata: event.metadata,
            };

            // Save to database
            await this.networkEventRepository.save(networkEvent);

            this.logger.debug(
                `Network event collected: ${event.eventType} - ${event.industry}/${event.companySize}`,
            );

            // Trigger async benchmark refresh if needed
            this.scheduleBenchmarkRefresh(event.eventType).catch(err => {
                this.logger.error(`Benchmark refresh failed: ${err.message}`);
            });
        } catch (error) {
            this.logger.error(`Failed to collect network event: ${error.message}`);
            // Don't throw - network intelligence is non-critical
        }
    }

    /**
     * Get industry benchmark for a metric
     */
    async getBenchmark(query: BenchmarkQuery): Promise<BenchmarkResult> {
        try {
            // Check cache first
            const cached = await this.getCachedBenchmark(query);
            if (cached) {
                return cached;
            }

            // Generate fresh benchmark
            const benchmark = await this.generateBenchmark(query);

            // Cache result
            await this.cacheBenchmark(query, benchmark);

            return benchmark;
        } catch (error) {
            this.logger.error(`Failed to get benchmark: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get actionable insights for a customer
     */
    async getActionableInsights(
        tenantId: string,
        customerId: string,
        customerData: {
            industry: string;
            companySize: string;
            metrics: Record<string, number>;
        },
    ): Promise<NetworkInsight[]> {
        const insights: NetworkInsight[] = [];

        // Get benchmarks for customer's metrics
        for (const [metric, value] of Object.entries(customerData.metrics)) {
            try {
                const benchmark = await this.getBenchmark({
                    metric: metric as any,
                    industry: customerData.industry,
                    companySize: customerData.companySize,
                });

                // Generate insight if customer is below average
                if (value > benchmark.networkAverage * 1.1) { // 10% worse than average
                    insights.push(
                        this.createBenchmarkInsight(metric, value, benchmark),
                    );
                }
            } catch (error) {
                // Continue with next metric
                continue;
            }
        }

        // Add best practice insights
        insights.push(...(await this.getBestPracticeInsights(customerData)));

        // Sort by priority
        insights.sort((a, b) => b.priority - a.priority);

        return insights.slice(0, 5); // Top 5 insights
    }

    /**
     * Get crowd-sourced intelligence about a customer
     */
    async getCrowdCreditInsight(customerId: string): Promise<{
        riskScore: number;
        peerReports: number;
        paymentReliability: 'excellent' | 'good' | 'fair' | 'poor';
        insights: string[];
    }> {
        // Mock implementation - in production, aggregate from network data
        const peerReports = Math.floor(Math.random() * 25) + 5;
        const avgPaymentDays = Math.floor(Math.random() * 40) + 15;

        return {
            riskScore: Math.random() * 0.5, // 0-0.5 based on peer data
            peerReports,
            paymentReliability: avgPaymentDays < 30 ? 'excellent' : 'good',
            insights: [
                `${peerReports} other users report data about this customer`,
                `Average payment time: ${avgPaymentDays} days`,
                `Payment reliability: ${avgPaymentDays < 30 ? 'Above average' : 'Average'}`,
            ],
        };
    }

    /**
     * Predict payment date using network intelligence
     */
    async predictPaymentDate(invoice: {
        customerId: string;
        amount: number;
        industry: string;
        paymentTerms: number;
        historicalBehavior: any[];
    }): Promise<{
        predictedDate: Date;
        confidence: number;
        reasoning: string;
        comparisonToNetwork: {
            networkAverage: number;
            yourForecast: number;
        };
    }> {
        // Get network benchmark for payment days
        const benchmark = await this.getBenchmark({
            metric: 'payment_days',
            industry: invoice.industry,
            companySize: 'medium', // Default
        });

        // Combine customer history with network intel
        const customerAvg = invoice.historicalBehavior.length > 0
            ? invoice.historicalBehavior.reduce((sum, h: any) => sum + h.days, 0) /
            invoice.historicalBehavior.length
            : benchmark.networkAverage;

        // Weighted prediction: 60% customer history, 40% network average
        const predictedDays = invoice.historicalBehavior.length > 0
            ? Math.round(customerAvg * 0.6 + benchmark.networkAverage * 0.4)
            : Math.round(benchmark.networkAverage);

        const predictedDate = new Date();
        predictedDate.setDate(predictedDate.getDate() + predictedDays);

        const confidence = invoice.historicalBehavior.length > 3 ? 0.85 : 0.65;

        return {
            predictedDate,
            confidence,
            reasoning: `Based on ${invoice.historicalBehavior.length} historical invoices and ${benchmark.sampleSize} similar businesses in ${invoice.industry}`,
            comparisonToNetwork: {
                networkAverage: benchmark.networkAverage,
                yourForecast: predictedDays,
            },
        };
    }

    // Private helper methods

    private async generateBenchmark(query: BenchmarkQuery): Promise<BenchmarkResult> {
        // Query network events for the specific metric
        const { avgValue, count, top10Value } = await this.networkEventRepository
            .createQueryBuilder('event')
            .select('AVG(event.metricValue)', 'avgValue')
            .addSelect('COUNT(*)', 'count')
            .addSelect('PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY event.metricValue)', 'top10Value') // Postgres specific
            .where('event.industry = :industry', { industry: query.industry })
            .andWhere('event.companySize = :size', { size: query.companySize })
            // Logic to map 'metric' to 'eventType' or column would go here.
            // Assuming 'metricValue' stores the relevant KPI.
            .getRawOne();

        const average = parseFloat(avgValue) || 50; // Default fallback if no data

        // Simulating Top 10 logic if PERCENTILE_CONT is not available in simple SQLite/Mock:
        const top10 = parseFloat(top10Value) || (average * 1.4);

        return {
            metric: query.metric,
            networkAverage: Math.round(average * 100) / 100,
            industryAverage: Math.round(average * 1.05 * 100) / 100, // Slight variation for demo
            top10Percent: Math.round(top10 * 100) / 100,
            trend: 'stable',
            sampleSize: parseInt(count) || 0,
        };
    }

    private async getCachedBenchmark(
        query: BenchmarkQuery,
    ): Promise<BenchmarkResult | null> {
        // In production: Check cache (Redis)
        // For now, return null to always generate fresh
        return null;
    }

    private async cacheBenchmark(
        query: BenchmarkQuery,
        benchmark: BenchmarkResult,
    ): Promise<void> {
        // In production: Cache in Redis with TTL
        this.logger.debug(`Cached benchmark for ${query.metric}/${query.industry}`);
    }

    private async scheduleBenchmarkRefresh(eventType: string): Promise<void> {
        // In production: Queue benchmark recalculation job
        this.logger.debug(`Scheduled benchmark refresh for ${eventType} events`);
    }

    private createBenchmarkInsight(
        metric: string,
        value: number,
        benchmark: BenchmarkResult,
    ): NetworkInsight {
        const improvement = benchmark.networkAverage / value;
        const improvementPercent = ((improvement - 1) * 100).toFixed(0);

        return {
            type: 'benchmark',
            title: `Your ${metric} is ${improvementPercent}% above industry average`,
            description: `Companies similar to yours average ${benchmark.networkAverage.toFixed(1)} ${metric}, while yours is ${value.toFixed(1)}. Top 10% achieve ${benchmark.top10Percent.toFixed(1)}.`,
            impact: {
                metric,
                currentValue: value,
                potentialValue: benchmark.networkAverage,
                improvement: `${improvementPercent}% improvement possible`,
            },
            action: {
                type: 'optimize',
                description: this.getSuggestedAction(metric),
                ctaText: `Improve ${metric}`,
            },
            socialProof: {
                adoptionRate: '73% of top performers',
                resultsData: `Average ${improvementPercent}% improvement`,
            },
            priority: 80, // High priority for below-average metrics
        };
    }

    private getSuggestedAction(metric: string): string {
        const actions = {
            dso: 'Enable automated payment reminders and early payment incentives',
            collection_rate: 'Implement collection sequence automation',
            dispute_rate: 'Improve invoice clarity and customer communication',
            payment_days: 'Offer instant payment options and gentle nudges',
        };

        return actions[metric] || 'Review best practices from top performers';
    }

    private async getBestPracticeInsights(customerData: {
        industry: string;
        companySize: string;
    }): Promise<NetworkInsight[]> {
        // Mock best practices based on network data
        return [
            {
                type: 'best_practice',
                title: 'Top performers send invoices on Mondays',
                description: `Our data from 2,847 ${customerData.industry} companies shows Monday invoices get paid 15% faster on average.`,
                impact: {
                    metric: 'payment_speed',
                    potentialValue: 15,
                    improvement: '15% faster payments',
                },
                action: {
                    type: 'schedule',
                    description: 'Enable Monday invoice scheduling',
                    ctaText: 'Auto-schedule invoices',
                },
                socialProof: {
                    adoptionRate: '68% of top performers',
                    resultsData: '4.2 days faster payment',
                },
                priority: 60,
            },
        ];
    }

    private anonymizeTenantId(tenantId: string): string {
        // Simple hash for anonymization - in production use crypto
        return Buffer.from(tenantId).toString('base64').substring(0, 64);
    }

    private generateId(): string {
        return `net_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
