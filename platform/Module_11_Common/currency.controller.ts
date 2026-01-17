import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrencyConversionService } from '../services/currency-conversion.service';
import { CurrencySettlementService } from '../services/currency-settlement.service';
import { Currency } from '../entities/currency.entity';
import { ExchangeRate } from '../entities/exchange-rate.entity';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../../auth/guards/organization.guard';

@ApiTags('Currency')
@Controller('currency')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class CurrencyController {
  constructor(
    private readonly currencyConversionService: CurrencyConversionService,
    private readonly currencySettlementService: CurrencySettlementService,
  ) {}

  @Get('currencies')
  @ApiOperation({ summary: 'Get all active currencies' })
  @ApiResponse({ status: 200, description: 'Returns all active currencies' })
  async getAllCurrencies(): Promise<Currency[]> {
    return this.currencyConversionService.getAllActiveCurrencies();
  }

  @Post('currencies')
  @ApiOperation({ summary: 'Create or update currency' })
  @ApiResponse({ status: 201, description: 'Currency created or updated' })
  async createOrUpdateCurrency(@Body() currencyData: Partial<Currency>): Promise<Currency> {
    return this.currencyConversionService.createOrUpdateCurrency(currencyData);
  }

  @Get('exchange-rates')
  @ApiOperation({ summary: 'Get all exchange rates' })
  @ApiResponse({ status: 200, description: 'Returns all exchange rates' })
  async getAllExchangeRates(
    @Query('baseCurrency') baseCurrency?: string,
  ): Promise<ExchangeRate[]> {
    return this.currencyConversionService.getAllExchangeRates(baseCurrency);
  }

  @Post('exchange-rates')
  @ApiOperation({ summary: 'Create or update exchange rate' })
  @ApiResponse({ status: 201, description: 'Exchange rate created or updated' })
  async createOrUpdateExchangeRate(@Body() rateData: Partial<ExchangeRate>): Promise<ExchangeRate> {
    return this.currencyConversionService.createOrUpdateExchangeRate(rateData);
  }

  @Post('convert')
  @ApiOperation({ summary: 'Convert amount between currencies' })
  @ApiResponse({ status: 200, description: 'Returns converted amount' })
  async convertAmount(
    @Body() conversionData: {
      amount: number;
      fromCurrency: string;
      toCurrency: string;
      date?: Date;
    },
  ): Promise<{
    originalAmount: number;
    convertedAmount: number;
    exchangeRate: number;
    fromCurrency: string;
    toCurrency: string;
    date: Date;
  }> {
    return this.currencyConversionService.convertAmount(
      conversionData.amount,
      conversionData.fromCurrency,
      conversionData.toCurrency,
      conversionData.date,
    );
  }

  @Post('payment/:transactionId/process')
  @ApiOperation({ summary: 'Process payment with currency conversion' })
  @ApiResponse({ status: 200, description: 'Returns processed payment' })
  async processPaymentWithCurrency(
    @Param('transactionId') transactionId: string,
    @Body() options?: {
      settlementCurrency?: string;
      useRateAsOf?: Date;
    },
  ) {
    return this.currencySettlementService.processPaymentWithCurrency(
      transactionId,
      options,
    );
  }

  @Post('payment/:transactionId/apply-to-invoice/:invoiceId')
  @ApiOperation({ summary: 'Apply payment to invoice with currency handling' })
  @ApiResponse({ status: 200, description: 'Returns payment application result' })
  async applyPaymentToInvoice(
    @Param('transactionId') transactionId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() options?: {
      settlementCurrency?: string;
      useRateAsOf?: Date;
    },
  ) {
    return this.currencySettlementService.applyPaymentToInvoice(
      transactionId,
      invoiceId,
      options,
    );
  }

  @Post('payment/:transactionId/gain-loss')
  @ApiOperation({ summary: 'Calculate exchange gain/loss for transaction' })
  @ApiResponse({ status: 200, description: 'Returns gain/loss calculation' })
  async calculateExchangeGainLoss(
    @Param('transactionId') transactionId: string,
    @Body() data: { settlementDate: Date },
  ) {
    return this.currencySettlementService.calculateExchangeGainLoss(
      transactionId,
      data.settlementDate,
    );
  }

  @Get('settlement-summary')
  @ApiOperation({ summary: 'Get settlement summary for organization' })
  @ApiResponse({ status: 200, description: 'Returns settlement summary' })
  async getSettlementSummary(
    @Query('organizationId') organizationId: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('groupByCurrency') groupByCurrency?: boolean,
  ) {
    return this.currencySettlementService.getSettlementSummary(
      organizationId,
      {
        startDate,
        endDate,
        groupByCurrency,
      },
    );
  }
}
