import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { Currency } from '../entities/currency.entity';
import { ExchangeRate, ExchangeRateType, ExchangeRateProvider } from '../entities/exchange-rate.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CurrencyConversionService {
  private readonly logger = new Logger(CurrencyConversionService.name);
  private baseCurrencyCode: string = 'INR'; // Default base currency

  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
    @InjectRepository(ExchangeRate)
    private readonly exchangeRateRepository: Repository<ExchangeRate>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeBaseCurrency();
  }

  /**
   * Initialize base currency from database
   */
  private async initializeBaseCurrency(): Promise<void> {
    try {
      const baseCurrency = await this.currencyRepository.findOne({
        where: { isBaseCurrency: true },
      });
      
      if (baseCurrency) {
        this.baseCurrencyCode = baseCurrency.code;
      }
    } catch (error) {
      this.logger.error(`Error initializing base currency: ${error.message}`, error.stack);
    }
  }

  /**
   * Convert amount between currencies
   */
  async convertAmount(
    amount: number,
    fromCurrencyCode: string,
    toCurrencyCode: string,
    date?: Date,
  ): Promise<{
    originalAmount: number;
    convertedAmount: number;
    exchangeRate: number;
    fromCurrency: string;
    toCurrency: string;
    date: Date;
  }> {
    // If currencies are the same, no conversion needed
    if (fromCurrencyCode === toCurrencyCode) {
      return {
        originalAmount: amount,
        convertedAmount: amount,
        exchangeRate: 1,
        fromCurrency: fromCurrencyCode,
        toCurrency: toCurrencyCode,
        date: date || new Date(),
      };
    }

    // Get exchange rate
    const exchangeRate = await this.getExchangeRate(fromCurrencyCode, toCurrencyCode, date);
    
    // Calculate converted amount
    const convertedAmount = amount * exchangeRate;
    
    return {
      originalAmount: amount,
      convertedAmount,
      exchangeRate,
      fromCurrency: fromCurrencyCode,
      toCurrency: toCurrencyCode,
      date: date || new Date(),
    };
  }

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(
    fromCurrencyCode: string,
    toCurrencyCode: string,
    date?: Date,
  ): Promise<number> {
    const currentDate = date || new Date();
    
    // Try to find direct exchange rate
    const directRate = await this.findExchangeRate(fromCurrencyCode, toCurrencyCode, currentDate);
    if (directRate) {
      return directRate.rate;
    }
    
    // Try to find inverse exchange rate
    const inverseRate = await this.findExchangeRate(toCurrencyCode, fromCurrencyCode, currentDate);
    if (inverseRate) {
      return 1 / inverseRate.rate;
    }
    
    // Try to calculate using base currency as intermediate
    if (fromCurrencyCode !== this.baseCurrencyCode && toCurrencyCode !== this.baseCurrencyCode) {
      const fromBaseRate = await this.findExchangeRate(this.baseCurrencyCode, fromCurrencyCode, currentDate);
      const toBaseRate = await this.findExchangeRate(this.baseCurrencyCode, toCurrencyCode, currentDate);
      
      if (fromBaseRate && toBaseRate) {
        return toBaseRate.rate / fromBaseRate.rate;
      }
    }
    
    // If no rate found, try to fetch from external provider
    return this.fetchExchangeRateFromProvider(fromCurrencyCode, toCurrencyCode);
  }

  /**
   * Find exchange rate in database
   */
  private async findExchangeRate(
    baseCurrencyCode: string,
    targetCurrencyCode: string,
    date: Date,
  ): Promise<ExchangeRate | null> {
    // Find active exchange rate valid for the given date
    const exchangeRate = await this.exchangeRateRepository.findOne({
      where: [
        {
          baseCurrencyCode,
          targetCurrencyCode,
          isActive: true,
          validFrom: LessThan(date),
          validTo: MoreThan(date),
        },
        {
          baseCurrencyCode,
          targetCurrencyCode,
          isActive: true,
          validFrom: LessThan(date),
          validTo: null,
        },
      ],
      order: {
        updatedAt: 'DESC',
      },
    });
    
    return exchangeRate;
  }

  /**
   * Fetch exchange rate from external provider
   */
  private async fetchExchangeRateFromProvider(
    fromCurrencyCode: string,
    toCurrencyCode: string,
  ): Promise<number> {
    try {
      const provider = this.configService.get<string>('EXCHANGE_RATE_PROVIDER', 'exchange_rate_api');
      const apiKey = this.configService.get<string>('EXCHANGE_RATE_API_KEY');
      
      if (!apiKey) {
        throw new Error('Exchange rate API key not configured');
      }
      
      let rate: number;
      
      switch (provider) {
        case 'exchange_rate_api':
          rate = await this.fetchFromExchangeRateApi(fromCurrencyCode, toCurrencyCode, apiKey);
          break;
        case 'open_exchange_rates':
          rate = await this.fetchFromOpenExchangeRates(fromCurrencyCode, toCurrencyCode, apiKey);
          break;
        case 'fixer':
          rate = await this.fetchFromFixer(fromCurrencyCode, toCurrencyCode, apiKey);
          break;
        default:
          throw new Error(`Unsupported exchange rate provider: ${provider}`);
      }
      
      // Save the fetched rate to database
      await this.saveExchangeRate(fromCurrencyCode, toCurrencyCode, rate, provider);
      
      return rate;
    } catch (error) {
      this.logger.error(`Error fetching exchange rate: ${error.message}`, error.stack);
      throw new Error(`Failed to get exchange rate from ${fromCurrencyCode} to ${toCurrencyCode}: ${error.message}`);
    }
  }

  /**
   * Fetch from Exchange Rate API
   */
  private async fetchFromExchangeRateApi(
    fromCurrencyCode: string,
    toCurrencyCode: string,
    apiKey: string,
  ): Promise<number> {
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${fromCurrencyCode}/${toCurrencyCode}`;
    
    const response = await lastValueFrom(this.httpService.get(url));
    
    if (response.data.result !== 'success') {
      throw new Error(`API Error: ${response.data.error}`);
    }
    
    return response.data.conversion_rate;
  }

  /**
   * Fetch from Open Exchange Rates
   */
  private async fetchFromOpenExchangeRates(
    fromCurrencyCode: string,
    toCurrencyCode: string,
    apiKey: string,
  ): Promise<number> {
    // Open Exchange Rates uses USD as base currency in free plan
    const url = `https://openexchangerates.org/api/latest.json?app_id=${apiKey}&base=USD&symbols=${fromCurrencyCode},${toCurrencyCode}`;
    
    const response = await lastValueFrom(this.httpService.get(url));
    
    if (!response.data.rates[fromCurrencyCode] || !response.data.rates[toCurrencyCode]) {
      throw new Error('Currency not supported by API');
    }
    
    // Calculate cross rate
    return response.data.rates[toCurrencyCode] / response.data.rates[fromCurrencyCode];
  }

  /**
   * Fetch from Fixer
   */
  private async fetchFromFixer(
    fromCurrencyCode: string,
    toCurrencyCode: string,
    apiKey: string,
  ): Promise<number> {
    const url = `http://data.fixer.io/api/latest?access_key=${apiKey}&base=${fromCurrencyCode}&symbols=${toCurrencyCode}`;
    
    const response = await lastValueFrom(this.httpService.get(url));
    
    if (!response.data.success) {
      throw new Error(`API Error: ${response.data.error.info}`);
    }
    
    return response.data.rates[toCurrencyCode];
  }

  /**
   * Save exchange rate to database
   */
  private async saveExchangeRate(
    fromCurrencyCode: string,
    toCurrencyCode: string,
    rate: number,
    provider: string,
  ): Promise<ExchangeRate> {
    // Find existing rate
    let exchangeRate = await this.exchangeRateRepository.findOne({
      where: {
        baseCurrencyCode: fromCurrencyCode,
        targetCurrencyCode: toCurrencyCode,
        isActive: true,
      },
    });
    
    const providerEnum = provider === 'exchange_rate_api' 
      ? ExchangeRateProvider.EXCHANGE_RATE_API 
      : provider === 'open_exchange_rates'
        ? ExchangeRateProvider.OPEN_EXCHANGE_RATES
        : provider === 'fixer'
          ? ExchangeRateProvider.FIXER
          : ExchangeRateProvider.CUSTOM;
    
    if (exchangeRate) {
      // Update existing rate
      exchangeRate.rate = rate;
      exchangeRate.providerLastUpdated = new Date();
      exchangeRate.provider = providerEnum;
      exchangeRate.rateType = ExchangeRateType.API;
    } else {
      // Create new rate
      exchangeRate = this.exchangeRateRepository.create({
        baseCurrencyCode: fromCurrencyCode,
        targetCurrencyCode: toCurrencyCode,
        rate,
        rateType: ExchangeRateType.API,
        provider: providerEnum,
        providerLastUpdated: new Date(),
        isActive: true,
        validFrom: new Date(),
      });
    }
    
    await this.exchangeRateRepository.save(exchangeRate);
    
    // Emit event for rate update
    this.eventEmitter.emit('currency.rate_updated', {
      fromCurrency: fromCurrencyCode,
      toCurrency: toCurrencyCode,
      rate,
      provider,
    });
    
    return exchangeRate;
  }

  /**
   * Create or update currency
   */
  async createOrUpdateCurrency(currencyData: Partial<Currency>): Promise<Currency> {
    if (!currencyData.code) {
      throw new Error('Currency code is required');
    }
    
    // Check if currency exists
    let currency = await this.currencyRepository.findOne({
      where: { code: currencyData.code },
    });
    
    if (currency) {
      // Update existing currency
      await this.currencyRepository.update(currency.id, currencyData);
      currency = await this.currencyRepository.findOne({
        where: { id: currency.id },
      });
    } else {
      // Create new currency
      currency = this.currencyRepository.create(currencyData);
      await this.currencyRepository.save(currency);
    }
    
    // If this is set as base currency, update other currencies
    if (currencyData.isBaseCurrency) {
      await this.currencyRepository.update(
        { code: Not(currencyData.code) },
        { isBaseCurrency: false },
      );
      
      // Update service base currency
      this.baseCurrencyCode = currencyData.code;
    }
    
    return currency;
  }

  /**
   * Create or update exchange rate
   */
  async createOrUpdateExchangeRate(rateData: Partial<ExchangeRate>): Promise<ExchangeRate> {
    if (!rateData.baseCurrencyCode || !rateData.targetCurrencyCode || rateData.rate === undefined) {
      throw new Error('Base currency, target currency, and rate are required');
    }
    
    // Check if rate exists
    let exchangeRate = await this.exchangeRateRepository.findOne({
      where: {
        baseCurrencyCode: rateData.baseCurrencyCode,
        targetCurrencyCode: rateData.targetCurrencyCode,
        isActive: true,
      },
    });
    
    if (exchangeRate) {
      // Update existing rate
      await this.exchangeRateRepository.update(exchangeRate.id, {
        ...rateData,
        rateType: rateData.rateType || ExchangeRateType.MANUAL,
        provider: rateData.provider || ExchangeRateProvider.MANUAL,
      });
      
      exchangeRate = await this.exchangeRateRepository.findOne({
        where: { id: exchangeRate.id },
      });
    } else {
      // Create new rate
      exchangeRate = this.exchangeRateRepository.create({
        ...rateData,
        rateType: rateData.rateType || ExchangeRateType.MANUAL,
        provider: rateData.provider || ExchangeRateProvider.MANUAL,
        isActive: true,
        validFrom: rateData.validFrom || new Date(),
      });
      
      await this.exchangeRateRepository.save(exchangeRate);
    }
    
    // Emit event for rate update
    this.eventEmitter.emit('currency.rate_updated', {
      fromCurrency: exchangeRate.baseCurrencyCode,
      toCurrency: exchangeRate.targetCurrencyCode,
      rate: exchangeRate.rate,
      provider: exchangeRate.provider,
    });
    
    return exchangeRate;
  }

  /**
   * Get all active currencies
   */
  async getAllActiveCurrencies(): Promise<Currency[]> {
    return this.currencyRepository.find({
      where: { isActive: true },
      order: {
        isBaseCurrency: 'DESC',
        code: 'ASC',
      },
    });
  }

  /**
   * Get all exchange rates
   */
  async getAllExchangeRates(baseCurrencyCode?: string): Promise<ExchangeRate[]> {
    const whereClause: any = { isActive: true };
    
    if (baseCurrencyCode) {
      whereClause.baseCurrencyCode = baseCurrencyCode;
    }
    
    return this.exchangeRateRepository.find({
      where: whereClause,
      order: {
        baseCurrencyCode: 'ASC',
        targetCurrencyCode: 'ASC',
      },
    });
  }

  /**
   * Format amount according to currency
   */
  formatAmountForCurrency(
    amount: number,
    currencyCode: string,
    options?: {
      includeSymbol?: boolean;
      locale?: string;
    },
  ): string {
    return new Intl.NumberFormat(options?.locale || 'en-IN', {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: options?.includeSymbol ? 'symbol' : 'code',
    }).format(amount);
  }
}
