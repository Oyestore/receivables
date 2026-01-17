import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ForexService } from '../services/forex.service';
import { ForexRateDto, CurrencyConversionRequest } from '../services/forex.service';

@Controller('forex')
export class ForexController {
  constructor(private readonly forexService: ForexService) {}

  @Post('convert')
  async convertCurrency(@Body() request: CurrencyConversionRequest) {
    return this.forexService.convertCurrency(request);
  }

  @Post('lock-rate')
  async lockRate(@Body() body: { fromCurrency: string; toCurrency: string; durationMinutes?: number }) {
    return this.forexService.lockRate(body.fromCurrency, body.toCurrency, body.durationMinutes);
  }

  @Get('rate/:fromCurrency/:toCurrency')
  async getCurrentRate(@Param('fromCurrency') fromCurrency: string, @Param('toCurrency') toCurrency: string) {
    return this.forexService.getCurrentRate(fromCurrency, toCurrency);
  }

  @Get('currencies')
  async getAvailableCurrencies() {
    return this.forexService.getAvailableCurrencies();
  }

  @Get('rates/:currency')
  async getRatesForCurrency(@Param('currency') currency: string) {
    return this.forexService.getRatesForCurrency(currency);
  }

  @Post('hedge-calculate')
  async calculateHedgeRequirements(@Body() body: {
    amount: number;
    fromCurrency: string;
    toCurrency: string;
    hedgePercentage?: number;
  }) {
    return this.forexService.calculateHedgeRequirements(body.amount, body.fromCurrency, body.toCurrency, body.hedgePercentage);
  }

  @Get('analytics')
  async getAnalytics(@Query() query: { startDate?: string; endDate?: string }) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.forexService.getFxAnalytics(startDate, endDate);
  }

  @Post('cleanup')
  async cleanupExpiredLocks() {
    return this.forexService.cleanupExpiredLocks();
  }
}
