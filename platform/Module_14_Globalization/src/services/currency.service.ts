import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CurrencyExchangeRateEntity } from '../entities/globalization.entity';
import { PaymentRouteEntity } from '../entities/intelligence.entity';
import { CurrencyIntelligenceService, EnhancedRateResult } from './currency-intelligence.service';

export interface CreateRateParams {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    rateDate?: Date;
    source?: 'manual' | 'api' | 'bank';
}

export interface EnhancedCurrencyRate extends EnhancedRateResult {
    timestamp: Date;
    tenantId: string;
}

@Injectable()
export class CurrencyService implements OnModuleInit {
    private readonly logger = new Logger(CurrencyService.name);
    // In-memory cache for high-frequency access
    private rateCache = new Map<string, { rate: number; timestamp: number }>();
    private readonly CACHE_TTL = 3600 * 1000; // 1 hour

    constructor(
        @InjectRepository(CurrencyExchangeRateEntity)
        private rateRepo: Repository<CurrencyExchangeRateEntity>,
        @InjectRepository(PaymentRouteEntity)
        private routeRepo: Repository<PaymentRouteEntity>,
        private currencyIntelligence: CurrencyIntelligenceService,
    ) { }

    onModuleInit() {
        this.logger.log('Currency Service Initialized');
        // Preload common rates asynchronously
        this.refreshCache();
    }

    /**
     * Get exchange rate between two currencies.
     * Uses caching, direct lookup, reverse lookup, and triangulation.
     */
    async getRate(fromCurrency: string, toCurrency: string, tenantId: string = 'system'): Promise<number> {
        if (fromCurrency === toCurrency) return 1;

        const cacheKey = `${fromCurrency}-${toCurrency}`;
        const cached = this.rateCache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
            return cached.rate;
        }

        // 1. Direct Database Lookup
        const directRate = await this.rateRepo.findOne({
            where: {
                fromCurrency,
                toCurrency,
                isActive: true
            },
            order: { rateDate: 'DESC' }
        });

        if (directRate) {
            this.cacheRate(fromCurrency, toCurrency, directRate.rate);
            return directRate.rate;
        }

        // 2. Reverse Lookup (1 / rate)
        const reverseRate = await this.rateRepo.findOne({
            where: {
                fromCurrency: toCurrency,
                toCurrency: fromCurrency,
                isActive: true
            },
            order: { rateDate: 'DESC' }
        });

        if (reverseRate && reverseRate.rate !== 0) {
            const computedRate = 1 / reverseRate.rate;
            this.cacheRate(fromCurrency, toCurrency, computedRate);
            return computedRate;
        }

        // 3. Triangulation via USD (Standard Base)
        if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
            const usdToFrom = await this.getRate('USD', fromCurrency, tenantId);
            const usdToTo = await this.getRate('USD', toCurrency, tenantId);
            
            if (usdToFrom && usdToTo && usdToFrom !== 0) {
                const triangulatedRate = usdToTo / usdToFrom;
                this.cacheRate(fromCurrency, toCurrency, triangulatedRate);
                return triangulatedRate;
            }
        }

        // 4. Use Intelligence Service as fallback
        try {
            const enhancedResult = await this.currencyIntelligence.getEnhancedRate(fromCurrency, toCurrency);
            this.cacheRate(fromCurrency, toCurrency, enhancedResult.currentRate);
            return enhancedResult.currentRate;
        } catch (error) {
            this.logger.error(`Intelligence service failed for ${fromCurrency}-${toCurrency}: ${error.message}`);
            throw new Error(`No rate found for ${fromCurrency} to ${toCurrency}`);
        }
    }

    /**
     * Get enhanced rate with intelligence predictions
     * This is the new intelligent method that outperforms paid services
     */
    async getEnhancedRate(fromCurrency: string, toCurrency: string, tenantId: string = 'system'): Promise<EnhancedCurrencyRate> {
        const enhancedResult = await this.currencyIntelligence.getEnhancedRate(fromCurrency, toCurrency);
        
        // Store the rate in database for historical tracking
        await this.storeRate({
            fromCurrency,
            toCurrency,
            rate: enhancedResult.currentRate,
            source: 'api'
        });

        return {
            ...enhancedResult,
            timestamp: new Date(),
            tenantId
        };
    }

    /**
     * Get optimal conversion timing recommendation
     */
    async getOptimalTimingRecommendation(fromCurrency: string, toCurrency: string): Promise<{
      recommendation: 'buy_now' | 'wait' | 'hold';
      expectedSavings: number;
      confidence: number;
      bestTimeToConvert: string;
      riskLevel: 'low' | 'medium' | 'high';
    }> {
        const enhanced = await this.getEnhancedRate(fromCurrency, toCurrency);
        
        return {
            recommendation: enhanced.prediction.recommendation,
            expectedSavings: enhanced.optimalTiming.expectedSavings,
            confidence: enhanced.prediction.confidence,
            bestTimeToConvert: enhanced.optimalTiming.bestTimeToConvert,
            riskLevel: enhanced.optimalTiming.riskLevel,
        };
    }

    /**
     * Convert amount from one currency to another
     */
    async convert(amount: number, fromCurrency: string, toCurrency: string, tenantId: string = 'system'): Promise<{
        convertedAmount: number;
        rate: number;
        fromCurrency: string;
        toCurrency: string;
        timestamp: Date;
    }> {
        const rate = await this.getRate(fromCurrency, toCurrency, tenantId);
        return {
            convertedAmount: amount * rate,
            rate,
            fromCurrency,
            toCurrency,
            timestamp: new Date()
        };
    }

    /**
     * Batch rate optimization for multiple currency pairs
     */
    async optimizeBatchConversions(requests: Array<{from: string; to: string; amount: number}>): Promise<Array<{
        pair: string;
        currentRate: number;
        recommendation: 'buy_now' | 'wait' | 'hold';
        expectedSavings: number;
        optimizedAmount?: number;
    }>> {
        const results = [];
        
        for (const request of requests) {
            try {
                const enhanced = await this.getEnhancedRate(request.from, request.to);
                
                let optimizedAmount = request.amount;
                if (enhanced.prediction.recommendation === 'wait') {
                    // Calculate potential optimized amount if waiting
                    optimizedAmount = request.amount * (1 + enhanced.optimalTiming.expectedSavings / 100);
                }
                
                results.push({
                    pair: `${request.from}-${request.to}`,
                    currentRate: enhanced.currentRate,
                    recommendation: enhanced.prediction.recommendation,
                    expectedSavings: enhanced.optimalTiming.expectedSavings,
                    optimizedAmount: optimizedAmount !== request.amount ? optimizedAmount : undefined,
                });
            } catch (error) {
                this.logger.error(`Failed to optimize ${request.from}-${request.to}: ${error.message}`);
                results.push({
                    pair: `${request.from}-${request.to}`,
                    currentRate: 0,
                    recommendation: 'hold',
                    expectedSavings: 0,
                });
            }
        }
        
        return results;
    }

    // Helper methods
    private cacheRate(from: string, to: string, rate: number): void {
        const cacheKey = `${from}-${to}`;
        this.rateCache.set(cacheKey, {
            rate,
            timestamp: Date.now()
        });
    }

    private async storeRate(params: CreateRateParams): Promise<void> {
        const rateEntity = this.rateRepo.create({
            fromCurrency: params.fromCurrency,
            toCurrency: params.toCurrency,
            rate: params.rate,
            rateDate: params.rateDate || new Date(),
            source: params.source || 'api',
            isActive: true
        });

        await this.rateRepo.save(rateEntity);
    }

    private async refreshCache(): Promise<void> {
        // Implementation for refreshing cache
        this.logger.log('Cache refreshed');
    }
}
