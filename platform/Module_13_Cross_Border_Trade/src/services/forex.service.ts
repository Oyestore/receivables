import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForexRate, CurrencyPair } from '../entities/forex-rate.entity';

export interface ForexRateDto {
  currencyPair: CurrencyPair;
  rate: number;
  lockedRate?: number;
  lockedUntil?: Date;
  spread?: number;
  commission?: number;
}

export interface CurrencyConversionRequest {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  lockRate?: boolean;
  lockDurationMinutes?: number;
}

export interface CurrencyConversionResult {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  convertedAmount: number;
  rate: number;
  lockedRate?: number;
  lockedUntil?: Date;
  timestamp: Date;
  currencyPair: CurrencyPair;
  spread?: number;
  commission?: number;
}

@Injectable()
export class ForexService {
  private readonly logger = new Logger(ForexService.name);

  constructor(
    @InjectRepository(ForexRate)
    private forexRateRepo: Repository<ForexRate>,
  ) {}

  /**
   * Get current exchange rate between two currencies
   */
  async getCurrentRate(fromCurrency: string, toCurrency: string): Promise<ForexRate | null> {
    this.logger.log(`Getting current rate for ${fromCurrency} to ${toCurrency}`);

    const currencyPair = `${fromCurrency}_${toCurrency}` as CurrencyPair;
    
    const rate = await this.forexRateRepo.findOne({
      where: {
        currencyPair,
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    });

    return rate;
  }

  /**
   * Convert currency using current or locked rate
   */
  async convertCurrency(request: CurrencyConversionRequest): Promise<CurrencyConversionResult> {
    this.logger.log(`Converting ${request.amount} ${request.fromCurrency} to ${request.toCurrency}`);

    let rate: ForexRate | null;

    if (request.lockRate) {
      // Try to get locked rate first
      rate = await this.getLockedRate(request.fromCurrency, request.toCurrency);
      
      if (!rate) {
        // Lock a new rate
        rate = await this.lockRate(
          request.fromCurrency,
          request.toCurrency,
          request.lockDurationMinutes || 30
        );
      }
    } else {
      // Get current rate
      rate = await this.getCurrentRate(request.fromCurrency, request.toCurrency);
    }

    if (!rate) {
      throw new NotFoundException(`Exchange rate not found for ${request.fromCurrency} to ${request.toCurrency}`);
    }

    const convertedAmount = request.amount * rate.rate;

    return {
      fromCurrency: request.fromCurrency,
      toCurrency: request.toCurrency,
      amount: request.amount,
      convertedAmount,
      rate: rate.rate,
      lockedRate: rate.lockedRate,
      lockedUntil: rate.lockedUntil,
      timestamp: new Date(),
      currencyPair: rate.currencyPair,
      spread: rate.spread,
      commission: rate.commission,
    };
  }

  /**
   * Lock an exchange rate for a specific duration
   */
  async lockRate(
    fromCurrency: string,
    toCurrency: string,
    durationMinutes: number = 30
  ): Promise<ForexRate> {
    this.logger.log(`Locking rate for ${fromCurrency} to ${toCurrency} for ${durationMinutes} minutes`);

    const currentRate = await this.getCurrentRate(fromCurrency, toCurrency);
    
    if (!currentRate) {
      throw new NotFoundException(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + durationMinutes);

    // Create a new locked rate entry
    const lockedRate = this.forexRateRepo.create({
      currencyPair: currentRate.currencyPair,
      rate: currentRate.rate,
      lockedRate: currentRate.rate,
      lockedUntil,
      isActive: true,
      source: 'locked',
      metadata: {
        originalRateId: currentRate.id,
        lockDuration: durationMinutes,
        lockedAt: new Date(),
      },
    });

    return await this.forexRateRepo.save(lockedRate);
  }

  /**
   * Get locked rate for currency pair
   */
  async getLockedRate(fromCurrency: string, toCurrency: string): Promise<ForexRate | null> {
    const currencyPair = `${fromCurrency}_${toCurrency}` as CurrencyPair;
    
    return await this.forexRateRepo.findOne({
      where: {
        currencyPair,
        lockedRate: { $ne: null } as any,
        lockedUntil: { $gt: new Date() } as any,
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all available currencies
   */
  async getAvailableCurrencies(): Promise<string[]> {
    const rates = await this.forexRateRepo.find({
      where: { isActive: true },
      select: ['currencyPair'],
    });

    const currencies = new Set<string>();
    rates.forEach(rate => {
      const [from, to] = rate.currencyPair.split('_');
      currencies.add(from);
      currencies.add(to);
    });

    return Array.from(currencies).sort();
  }

  /**
   * Get exchange rates for a specific currency
   */
  async getRatesForCurrency(currency: string): Promise<ForexRate[]> {
    const rates = await this.forexRateRepo.find({
      where: {
        isActive: true,
      },
    });

    return rates.filter(rate => {
      const [from, to] = rate.currencyPair.split('_');
      return from === currency || to === currency;
    });
  }

  /**
   * Update exchange rate (admin function)
   */
  async updateRate(rateData: ForexRateDto, source: string = 'manual'): Promise<ForexRate> {
    this.logger.log(`Updating rate for ${rateData.currencyPair}`);

    // Deactivate existing rates for this pair
    await this.forexRateRepo.update(
      {
        currencyPair: rateData.currencyPair,
        isActive: true,
      },
      { isActive: false }
    );

    // Create new rate
    const newRate = this.forexRateRepo.create({
      ...rateData,
      isActive: true,
      source,
      metadata: {
        updatedAt: new Date(),
      },
    });

    return await this.forexRateRepo.save(newRate);
  }

  /**
   * Get historical rates for analysis
   */
  async getHistoricalRates(
    fromCurrency: string,
    toCurrency: string,
    startDate: Date,
    endDate: Date
  ): Promise<ForexRate[]> {
    const currencyPair = `${fromCurrency}_${toCurrency}` as CurrencyPair;
    
    return await this.forexRateRepo.find({
      where: {
        currencyPair,
        createdAt: { $between: [startDate, endDate] } as any,
      },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Calculate FX hedge requirements
   */
  async calculateHedgeRequirements(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    hedgePercentage: number = 100
  ): Promise<any> {
    const currentRate = await this.getCurrentRate(fromCurrency, toCurrency);
    
    if (!currentRate) {
      throw new NotFoundException(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    const hedgeAmount = (amount * hedgePercentage) / 100;
    const hedgeValue = hedgeAmount * currentRate.rate;

    return {
      originalAmount: amount,
      hedgePercentage,
      hedgeAmount,
      hedgeValue,
      currentRate: currentRate.rate,
      fromCurrency,
      toCurrency,
      recommendation: hedgePercentage >= 80 ? 'High hedge recommended' : 'Consider increasing hedge',
    };
  }

  /**
   * Get FX analytics
   */
  async getFxAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    const query = this.forexRateRepo.createQueryBuilder('rate');

    if (startDate && endDate) {
      query.where('rate.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const rates = await query.getMany();

    const analytics = {
      totalRates: rates.length,
      currencyPairs: [...new Set(rates.map(r => r.currencyPair))],
      averageRates: rates.reduce((acc: any, rate) => {
        if (!acc[rate.currencyPair]) {
          acc[rate.currencyPair] = { sum: 0, count: 0, avg: 0 };
        }
        acc[rate.currencyPair].sum += rate.rate;
        acc[rate.currencyPair].count += 1;
        acc[rate.currencyPair].avg = acc[rate.currencyPair].sum / acc[rate.currencyPair].count;
        return acc;
      }, {}),
      lockedRates: rates.filter(r => r.lockedRate !== null).length,
      sources: [...new Set(rates.map(r => r.source))],
      mostRecent: rates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 10),
    };

    return analytics;
  }

  /**
   * Cleanup expired locked rates
   */
  async cleanupExpiredLocks(): Promise<number> {
    const result = await this.forexRateRepo
      .createQueryBuilder()
      .update()
      .set({ isActive: false })
      .where('lockedUntil < :now', { now: new Date() })
      .andWhere('lockedRate IS NOT NULL')
      .execute();

    this.logger.log(`Cleaned up ${result.affected} expired locked rates`);
    return result.affected || 0;
  }
}
