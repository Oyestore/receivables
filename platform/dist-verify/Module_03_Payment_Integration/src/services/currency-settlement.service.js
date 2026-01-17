"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CurrencySettlementService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencySettlementService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const currency_conversion_service_1 = require("./currency-conversion.service");
const payment_transaction_entity_1 = require("../../entities/payment-transaction.entity");
const invoice_entity_1 = require("../../../invoices/entities/invoice.entity");
const event_emitter_1 = require("@nestjs/event-emitter");
let CurrencySettlementService = CurrencySettlementService_1 = class CurrencySettlementService {
    constructor(transactionRepository, invoiceRepository, currencyConversionService, eventEmitter) {
        this.transactionRepository = transactionRepository;
        this.invoiceRepository = invoiceRepository;
        this.currencyConversionService = currencyConversionService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(CurrencySettlementService_1.name);
    }
    /**
     * Process payment with currency conversion if needed
     */
    async processPaymentWithCurrency(transactionId, options) {
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
            const conversion = await this.currencyConversionService.convertAmount(transaction.amount, transaction.currencyCode, settlementCurrency, options?.useRateAsOf);
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
    async applyPaymentToInvoice(transactionId, invoiceId, options) {
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
        const paymentResult = await this.processPaymentWithCurrency(transactionId, {
            settlementCurrency: options?.settlementCurrency || invoice.currency,
            useRateAsOf: options?.useRateAsOf,
        });
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
        }
        else if (invoice.amountPaid > 0) {
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
    async calculateExchangeGainLoss(transactionId, settlementDate) {
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
        const currentConversion = await this.currencyConversionService.convertAmount(transaction.amount, transaction.currencyCode, transaction.settlementCurrencyCode, settlementDate);
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
    async getSettlementSummary(organizationId, options) {
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
        const currencyBreakdown = {};
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
};
exports.CurrencySettlementService = CurrencySettlementService;
exports.CurrencySettlementService = CurrencySettlementService = CurrencySettlementService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_transaction_entity_1.PaymentTransaction)),
    __param(1, (0, typeorm_1.InjectRepository)(invoice_entity_1.Invoice)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository, typeof (_a = typeof currency_conversion_service_1.CurrencyConversionService !== "undefined" && currency_conversion_service_1.CurrencyConversionService) === "function" ? _a : Object, typeof (_b = typeof event_emitter_1.EventEmitter2 !== "undefined" && event_emitter_1.EventEmitter2) === "function" ? _b : Object])
], CurrencySettlementService);
//# sourceMappingURL=currency-settlement.service.js.map