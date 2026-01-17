import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrencyConversionService } from './currency-conversion.service';
import { PaymentTransaction } from '../../entities/payment-transaction.entity';
import { Invoice } from '../../../invoices/entities/invoice.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CurrencySettlementService {
  private readonly logger = new Logger(CurrencySettlementService.name);

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly currencyConversionService: CurrencyConversionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Process payment with currency conversion if needed
   */
  async processPaymentWithCurrency(
    transactionId: string,
    options?: {
      settlementCurrency?: string;
      useRateAsOf?: Date;
    }
  ): Promise<{
    transaction: PaymentTransaction;
    conversionApplied: boolean;
    originalAmount: number;
    convertedAmount: number;
    exchangeRate: number;
  }> {
    // Get transaction
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['invoice'],
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // If no invoice or currencies match, no conversion needed
    if (!transaction.invoice || 
        transaction.currencyCode === transaction.invoice.currency ||
        !options?.settlementCurrency) {
      
      return {
        transaction,
        conversionApplied: false,
        originalAmount: transaction.amount,
        convertedAmount: transaction.amount,
        exchangeRate: 1,
      };
    }

    // Determine settlement currency
    const settlementCurrency = options?.settlementCurrency || transaction.invoice.currency;
    
    // Convert amount if transaction currency differs from settlement currency
    if (transaction.currencyCode !== settlementCurrency) {
      const conversion = await this.currencyConversionService.convertAmount(
        transaction.amount,
        transaction.currencyCode,
        settlementCurrency,
        options?.useRateAsOf,
      );
      
      // Update transaction with conversion details
      transaction.settlementAmount = conversion.convertedAmount;
      transaction.settlementCurrencyCode = settlementCurrency;
      transaction.exchangeRate = conversion.exchangeRate;
      transaction.exchangeRateDate = conversion.date;
      transaction.metadata = {
        ...transaction.metadata,
        currencyConversion: {
          originalAmount: conversion.originalAmount,
          originalCurrency: conversion.fromCurrency,
          convertedAmount: conversion.convertedAmount,
          convertedCurrency: conversion.toCurrency,
          exchangeRate: conversion.exchangeRate,
          conversionDate: conversion.date,
        },
      };
      
      await this.transactionRepository.save(transaction);
      
      // Emit event for currency conversion
      this.eventEmitter.emit('payment.currency_converted', {
        transactionId: transaction.id,
        originalAmount: conversion.originalAmount,
        originalCurrency: conversion.fromCurrency,
        convertedAmount: conversion.convertedAmount,
        convertedCurrency: conversion.toCurrency,
        exchangeRate: conversion.exchangeRate,
      });
      
      return {
        transaction,
        conversionApplied: true,
        originalAmount: conversion.originalAmount,
        convertedAmount: conversion.convertedAmount,
        exchangeRate: conversion.exchangeRate,
      };
    }
    
    // No conversion needed
    return {
      transaction,
      conversionApplied: false,
      originalAmount: transaction.amount,
      convertedAmount: transaction.amount,
      exchangeRate: 1,
    };
  }

  /**
   * Apply payment to invoice with currency handling
   */
  async applyPaymentToInvoice(
    transactionId: string,
    invoiceId: string,
    options?: {
      settlementCurrency?: string;
      useRateAsOf?: Date;
    }
  ): Promise<{
    invoice: Invoice;
    transaction: PaymentTransaction;
    amountApplied: number;
    conversionApplied: boolean;
    remainingInvoiceBalance: number;
  }> {
    // Get transaction and invoice
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Process payment with currency conversion if needed
    const paymentResult = await this.processPaymentWithCurrency(
      transactionId,
      {
        settlementCurrency: options?.settlementCurrency || invoice.currency,
        useRateAsOf: options?.useRateAsOf,
      },
    );

    // Link transaction to invoice
    transaction.invoiceId = invoice.id;
    await this.transactionRepository.save(transaction);

    // Calculate amount to apply (in invoice currency)
    const amountToApply = paymentResult.conversionApplied 
      ? paymentResult.convertedAmount 
      : paymentResult.originalAmount;

    // Update invoice
    invoice.amountPaid = (invoice.amountPaid || 0) + amountToApply;
    invoice.amountDue = Math.max(0, invoice.totalAmount - invoice.amountPaid);
    
    // Update invoice status if fully paid
    if (invoice.amountDue <= 0) {
      invoice.status = 'paid';
      invoice.paidDate = new Date();
    } else if (invoice.amountPaid > 0) {
      invoice.status = 'partially_paid';
    }
    
    await this.invoiceRepository.save(invoice);

    // Emit event for payment application
    this.eventEmitter.emit('payment.applied_to_invoice', {
      transactionId: transaction.id,
      invoiceId: invoice.id,
      amountApplied: amountToApply,
      conversionApplied: paymentResult.conversionApplied,
      remainingBalance: invoice.amountDue,
    });

    return {
      invoice,
      transaction,
      amountApplied: amountToApply,
      conversionApplied: paymentResult.conversionApplied,
      remainingInvoiceBalance: invoice.amountDue,
    };
  }

  /**
   * Calculate exchange gain/loss for settled transactions
   */
  async calculateExchangeGainLoss(
    transactionId: string,
    settlementDate: Date,
  ): Promise<{
    transaction: PaymentTransaction;
    originalSettlementAmount: number;
    currentSettlementAmount: number;
    gainLossAmount: number;
    gainLossPercentage: number;
    isGain: boolean;
  }> {
    // Get transaction
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // If no currency conversion was applied, no gain/loss
    if (!transaction.settlementCurrencyCode || !transaction.exchangeRate) {
      return {
        transaction,
        originalSettlementAmount: transaction.amount,
        currentSettlementAmount: transaction.amount,
        gainLossAmount: 0,
        gainLossPercentage: 0,
        isGain: false,
      };
    }

    // Get current exchange rate
    const currentConversion = await this.currencyConversionService.convertAmount(
      transaction.amount,
      transaction.currencyCode,
      transaction.settlementCurrencyCode,
      settlementDate,
    );

    // Calculate gain/loss
    const originalSettlementAmount = transaction.settlementAmount;
    const currentSettlementAmount = currentConversion.convertedAmount;
    const gainLossAmount = currentSettlementAmount - originalSettlementAmount;
    const gainLossPercentage = (gainLossAmount / originalSettlementAmount) * 100;
    const isGain = gainLossAmount > 0;

    // Update transaction with gain/loss information
    transaction.metadata = {
      ...transaction.metadata,
      exchangeGainLoss: {
        calculatedAt: settlementDate,
        originalSettlementAmount,
        currentSettlementAmount,
        gainLossAmount,
        gainLossPercentage,
        isGain,
      },
    };
    
    await this.transactionRepository.save(transaction);

    // Emit event for exchange gain/loss calculation
    this.eventEmitter.emit('payment.exchange_gain_loss_calculated', {
      transactionId: transaction.id,
      originalSettlementAmount,
      currentSettlementAmount,
      gainLossAmount,
      gainLossPercentage,
      isGain,
      calculatedAt: settlementDate,
    });

    return {
      transaction,
      originalSettlementAmount,
      currentSettlementAmount,
      gainLossAmount,
      gainLossPercentage,
      isGain,
    };
  }

  /**
   * Get settlement summary for organization
   */
  async getSettlementSummary(
    organizationId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      groupByCurrency?: boolean;
    }
  ): Promise<{
    totalTransactions: number;
    totalSettlementAmount: number;
    settlementCurrency: string;
    currencyBreakdown?: Record<string, {
      transactions: number;
      originalAmount: number;
      settlementAmount: number;
      averageExchangeRate: number;
    }>;
  }> {
    const startDate = options?.startDate || new Date(0);
    const endDate = options?.endDate || new Date();
    
    // Get all settled transactions for organization
    const transactions = await this.transactionRepository.find({
      where: {
        organizationId,
        createdAt: Between(startDate, endDate),
        status: 'completed',
      },
    });

    // Calculate summary
    let totalTransactions = 0;
    let totalSettlementAmount = 0;
    const currencyBreakdown: Record<string, {
      transactions: number;
      originalAmount: number;
      settlementAmount: number;
      totalExchangeRate: number;
      averageExchangeRate: number;
    }> = {};

    for (const transaction of transactions) {
      totalTransactions++;
      
      const settlementAmount = transaction.settlementAmount || transaction.amount;
      const settlementCurrency = transaction.settlementCurrencyCode || transaction.currencyCode;
      
      totalSettlementAmount += settlementAmount;
      
      if (options?.groupByCurrency) {
        if (!currencyBreakdown[transaction.currencyCode]) {
          currencyBreakdown[transaction.currencyCode] = {
            transactions: 0,
            originalAmount: 0,
            settlementAmount: 0,
            totalExchangeRate: 0,
            averageExchangeRate: 0,
          };
        }
        
        currencyBreakdown[transaction.currencyCode].transactions++;
        currencyBreakdown[transaction.currencyCode].originalAmount += transaction.amount;
        currencyBreakdown[transaction.currencyCode].settlementAmount += settlementAmount;
        
        if (transaction.exchangeRate) {
          currencyBreakdown[transaction.currencyCode].totalExchangeRate += transaction.exchangeRate;
        }
      }
    }

    // Calculate average exchange rates
    if (options?.groupByCurrency) {
      for (const currency in currencyBreakdown) {
        const breakdown = currencyBreakdown[currency];
        breakdown.averageExchangeRate = breakdown.totalExchangeRate / breakdown.transactions;
        delete breakdown.totalExchangeRate;
      }
    }

    // Determine primary settlement currency
    const settlementCurrency = transactions.length > 0 && transactions[0].settlementCurrencyCode
      ? transactions[0].settlementCurrencyCode
      : 'INR'; // Default to INR if no transactions

    return {
      totalTransactions,
      totalSettlementAmount,
      settlementCurrency,
      currencyBreakdown: options?.groupByCurrency ? currencyBreakdown : undefined,
    };
  }
}
