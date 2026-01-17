import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MoreThanOrEqual, LessThanOrEqual, Repository } from 'typeorm';
import { CurrencyExchangeRateEntity } from '../entities/globalization.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

export interface RatePrediction {
  predictedRate: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  volatilityScore: number;
  recommendation: 'buy_now' | 'wait' | 'hold';
  timeHorizon: '1h' | '24h' | '7d';
}

export interface EnhancedRateResult {
  currentRate: number;
  sources: string[];
  prediction: RatePrediction;
  volatilityAnalysis: {
    current: number;
    average30d: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  optimalTiming: {
    bestTimeToConvert: string;
    expectedSavings: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

@Injectable()
export class CurrencyIntelligenceService {
  private readonly logger = new Logger(CurrencyIntelligenceService.name);
  private readonly rateCache = new Map<string, { result: EnhancedRateResult; rate: number; timestamp: number; sources: string[] }>();
  private readonly historicalData = new Map<string, number[]>();
  private readonly CACHE_TTL = 3600 * 1000; // 1 hour
  
  constructor(
    private configService: ConfigService,
    @Inject(getRepositoryToken(CurrencyExchangeRateEntity))
    private rateRepository: Repository<CurrencyExchangeRateEntity>,
  ) {}

  /**
   * Multi-source rate aggregation with intelligence
   */
  async getEnhancedRate(fromCurrency: string, toCurrency: string): Promise<EnhancedRateResult> {
    const cacheKey = `${fromCurrency}-${toCurrency}`;
    
    // 1. Aggregate rates from multiple free sources
    const aggregatedRates = await this.aggregateRatesFromSources(fromCurrency, toCurrency);
    
    // 2. Apply ML model for prediction
    const prediction = await this.predictRateMovement(fromCurrency, toCurrency, aggregatedRates);
    
    // 3. Analyze volatility patterns
    const volatilityAnalysis = await this.analyzeVolatility(fromCurrency, toCurrency);
    
    // 4. Calculate optimal timing
    const optimalTiming = await this.calculateOptimalTiming(fromCurrency, toCurrency, prediction);
    
    // 5. Cache and return enhanced result
    const result: EnhancedRateResult = {
      currentRate: aggregatedRates.weightedAverage,
      sources: aggregatedRates.sources,
      prediction,
      volatilityAnalysis,
      optimalTiming,
    };
    
    // Check cache first
    const cached = this.rateCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      return cached.result;
    }
    
    this.cacheRate(cacheKey, result);
    return result;
  }

  /**
   * Aggregate rates from multiple free sources with confidence scoring
   */
  private async aggregateRatesFromSources(fromCurrency: string, toCurrency: string) {
    const sources = [];
    const rates = [];
    const weights = [];

    // Source 1: European Central Bank (highest reliability)
    try {
      const ecbRate = await this.fetchECBRate(fromCurrency, toCurrency);
      if (ecbRate) {
        sources.push('ECB');
        rates.push(ecbRate);
        weights.push(0.4); // 40% weight
      }
    } catch (error) {
      this.logger.warn(`ECB rate fetch failed: ${error.message}`);
    }

    // Source 2: Open Exchange Rates (free tier)
    try {
      const oerRate = await this.fetchOpenExchangeRate(fromCurrency, toCurrency);
      if (oerRate) {
        sources.push('OER');
        rates.push(oerRate);
        weights.push(0.3); // 30% weight
      }
    } catch (error) {
      this.logger.warn(`Open Exchange Rate fetch failed: ${error.message}`);
    }

    // Source 3: Exchangerate-api.com (backup)
    try {
      const exRate = await this.fetchExchangeRateAPI(fromCurrency, toCurrency);
      if (exRate) {
        sources.push('EX');
        rates.push(exRate);
        weights.push(0.3); // 30% weight
      }
    } catch (error) {
      this.logger.warn(`Exchange Rate API fetch failed: ${error.message}`);
    }

    // Calculate weighted average
    const weightedAverage = rates.reduce((sum, rate, index) => sum + rate * weights[index], 0) / weights.reduce((sum, weight) => sum + weight, 0);

    return {
      weightedAverage,
      sources,
      individualRates: rates,
      weights,
      confidence: this.calculateConfidence(rates),
    };
  }

  /**
   * ML-based rate prediction using historical patterns
   */
  private async predictRateMovement(fromCurrency: string, toCurrency: string, currentData: any): Promise<RatePrediction> {
    const historicalRates = await this.getHistoricalRates(fromCurrency, toCurrency, 30); // 30 days
    
    if (historicalRates.length < 10) {
      // Not enough data for prediction
      return {
        predictedRate: currentData.weightedAverage,
        confidence: 0.3,
        trend: 'stable',
        volatilityScore: 0.1,
        recommendation: 'hold',
        timeHorizon: '24h',
      };
    }

    // Simple ML model: Linear regression with trend analysis
    const trend = this.calculateTrend(historicalRates);
    const volatility = this.calculateVolatility(historicalRates);
    const momentum = this.calculateMomentum(historicalRates);
    
    // Predict next 24h rate
    const predictedChange = (trend * 0.6) + (momentum * 0.4);
    const predictedRate = currentData.weightedAverage * (1 + predictedChange);
    
    // Determine recommendation based on prediction and volatility
    let recommendation: 'buy_now' | 'wait' | 'hold' = 'hold';
    if (predictedChange > 0.005 && volatility < 0.02) {
      recommendation = 'buy_now'; // Rate likely to increase
    } else if (predictedChange < -0.005 && volatility > 0.02) {
      recommendation = 'wait'; // Rate likely to decrease
    }

    return {
      predictedRate,
      confidence: Math.min(0.9, 0.5 + (historicalRates.length / 60)), // More data = higher confidence
      trend: predictedChange > 0.002 ? 'up' : predictedChange < -0.002 ? 'down' : 'stable',
      volatilityScore: volatility,
      recommendation,
      timeHorizon: '24h',
    };
  }

  /**
   * Volatility analysis with pattern recognition
   */
  private async analyzeVolatility(fromCurrency: string, toCurrency: string) {
    const rates = await this.getHistoricalRates(fromCurrency, toCurrency, 30);
    
    if (rates.length < 5) {
      return {
        current: 0.01,
        average30d: 0.01,
        trend: 'stable' as const,
      };
    }

    const currentVolatility = this.calculateVolatility(rates.slice(-7)); // Last 7 days
    const average30dVolatility = this.calculateVolatility(rates);
    
    // Determine volatility trend
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (currentVolatility > average30dVolatility * 1.2) {
      trend = 'increasing';
    } else if (currentVolatility < average30dVolatility * 0.8) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    return {
      current: currentVolatility,
      average30d: average30dVolatility,
      trend,
    };
  }

  /**
   * Calculate optimal timing for currency conversion
   */
  private async calculateOptimalTiming(
    fromCurrency: string, 
    toCurrency: string, 
    prediction: RatePrediction
  ) {
    const historicalData = await this.getHistoricalRates(fromCurrency, toCurrency, 30);
    
    // Find patterns in hourly rates
    const hourlyPatterns = this.analyzeHourlyPatterns(historicalData);
    const bestHour = Object.keys(hourlyPatterns).reduce((best, hour) => 
      hourlyPatterns[hour] > hourlyPatterns[best] ? hour : best
    );

    // Calculate expected savings
    const expectedSavings = prediction.trend === 'up' ? 
      (prediction.predictedRate - prediction.predictedRate * 0.99) * 100 : 
      (prediction.predictedRate * 1.01 - prediction.predictedRate) * 100;

    // Assess risk level based on volatility and prediction confidence
    let riskLevel: 'low' | 'medium' | 'high';
    if (prediction.volatilityScore < 0.01 && prediction.confidence > 0.7) {
      riskLevel = 'low';
    } else if (prediction.volatilityScore > 0.03 || prediction.confidence < 0.5) {
      riskLevel = 'high';
    } else {
      riskLevel = 'medium';
    }

    return {
      bestTimeToConvert: `${bestHour}:00 UTC`,
      expectedSavings: Math.round(expectedSavings * 100) / 100,
      riskLevel,
    };
  }

  // Helper methods for ML calculations
  private calculateTrend(rates: number[]): number {
    const n = rates.length;
    const x = Array.from({length: n}, (_, i) => i);
    const y = rates;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope / rates[0]; // Normalize to percentage
  }

  private calculateVolatility(rates: number[]): number {
    const returns = [];
    for (let i = 1; i < rates.length; i++) {
      returns.push((rates[i] - rates[i-1]) / rates[i-1]);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private calculateMomentum(rates: number[]): number {
    if (rates.length < 5) return 0;
    const recent = rates.slice(-5);
    const older = rates.slice(-10, -5);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    return (recentAvg - olderAvg) / olderAvg;
  }

  private calculateConfidence(rates: number[]): number {
    if (rates.length === 0) return 0;
    if (rates.length === 1) return 1;
    
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / rates.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Higher confidence for lower standard deviation
    return Math.max(0, 1 - (standardDeviation / mean));
  }

  private analyzeHourlyPatterns(rates: any[]): Record<string, number> {
    // This would analyze rates by hour of day
    // For now, return simple pattern
    return {
      '9': 0.02,
      '10': 0.03,
      '14': 0.04,
      '15': 0.05,
      '16': 0.04,
    };
  }

  private async getHistoricalRates(fromCurrency: string, toCurrency: string, days: number): Promise<number[]> {
    // Fetch from database or cache
    const cacheKey = `hist-${fromCurrency}-${toCurrency}-${days}`;
    if (this.historicalData.has(cacheKey)) {
      return this.historicalData.get(cacheKey)!;
    }

    // For now, return mock historical data
    const mockRates = Array.from({length: days}, () => 0.85 + Math.random() * 0.1);
    this.historicalData.set(cacheKey, mockRates);
    return mockRates;
  }

  private cacheRate(key: string, result: EnhancedRateResult): void {
    this.rateCache.set(key, {
      result: result,
      rate: result.currentRate,
      timestamp: Date.now(),
      sources: result.sources,
    });
  }

  // API integration methods (to be implemented)
  private async fetchECBRate(from: string, to: string): Promise<number | null> {
    // Implement ECB API integration
    return 0.85; // Mock
  }

  private async fetchOpenExchangeRate(from: string, to: string): Promise<number | null> {
    // Implement Open Exchange Rates API integration
    return 0.86; // Mock
  }

  private async fetchExchangeRateAPI(from: string, to: string): Promise<number | null> {
    // Implement exchangerate-api.com integration
    return 0.84; // Mock
  }
}
