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
var InvoicePaymentIntegrationService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicePaymentIntegrationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const invoice_entity_1 = require("../../invoices/entities/invoice.entity");
const payment_transaction_entity_1 = require("../entities/payment-transaction.entity");
const payment_processing_service_1 = require("./payment-processing.service");
const event_emitter_1 = require("@nestjs/event-emitter");
let InvoicePaymentIntegrationService = InvoicePaymentIntegrationService_1 = class InvoicePaymentIntegrationService {
    constructor(invoiceRepository, transactionRepository, paymentProcessingService, eventEmitter) {
        this.invoiceRepository = invoiceRepository;
        this.transactionRepository = transactionRepository;
        this.paymentProcessingService = paymentProcessingService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(InvoicePaymentIntegrationService_1.name);
    }
    async generatePaymentLink(invoiceId, paymentMethodId, expiryHours = 72) {
        // Find the invoice
        const invoice = await this.invoiceRepository.findOne({
            where: { id: invoiceId },
        });
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        // Check if invoice is already paid
        if (invoice.status === 'paid') {
            throw new Error('Invoice is already paid');
        }
        // Get customer information from invoice
        const customerInfo = {
            name: invoice.customerName,
            email: invoice.customerEmail,
            phone: invoice.customerPhone,
        };
        // Initiate payment
        const result = await this.paymentProcessingService.initiatePayment(invoice.organizationId, paymentMethodId, invoice.totalAmount, invoice.currency, invoiceId, customerInfo, {
            invoiceNumber: invoice.invoiceNumber,
            dueDate: invoice.dueDate,
        });
        // Calculate expiry date
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expiryHours);
        // Return payment link details
        return {
            paymentUrl: result.paymentUrl,
            transactionId: result.transaction.id,
            expiresAt,
        };
    }
    async updateInvoicePaymentStatus(transactionId) {
        // Get the transaction with invoice relation
        const transaction = await this.transactionRepository.findOne({
            where: { id: transactionId },
            relations: ['invoice'],
        });
        if (!transaction || !transaction.invoiceId) {
            this.logger.warn(`No invoice associated with transaction ${transactionId}`);
            return;
        }
        // Get the invoice
        const invoice = await this.invoiceRepository.findOne({
            where: { id: transaction.invoiceId },
        });
        if (!invoice) {
            this.logger.warn(`Invoice ${transaction.invoiceId} not found`);
            return;
        }
        // Update invoice status based on transaction status
        if (transaction.status === payment_transaction_entity_1.TransactionStatus.COMPLETED) {
            invoice.status = 'paid';
            invoice.paidAmount = transaction.amount;
            invoice.paidDate = transaction.completedAt;
            invoice.paymentReference = transaction.transactionReference;
            // Emit invoice paid event for other modules to react
            this.eventEmitter.emit('invoice.paid', {
                invoiceId: invoice.id,
                transactionId: transaction.id,
                amount: transaction.amount,
                paidDate: transaction.completedAt,
            });
        }
        else if (transaction.status === payment_transaction_entity_1.TransactionStatus.FAILED) {
            // If payment failed, update invoice status if needed
            if (invoice.status === 'pending_payment') {
                invoice.status = 'unpaid';
            }
            // Emit payment failed event
            this.eventEmitter.emit('invoice.payment.failed', {
                invoiceId: invoice.id,
                transactionId: transaction.id,
                failureReason: transaction.failureReason,
            });
        }
        // Save the updated invoice
        await this.invoiceRepository.save(invoice);
    }
    async getInvoicePaymentHistory(invoiceId) {
        return this.transactionRepository.find({
            where: { invoiceId },
            order: { createdAt: 'DESC' },
        });
    }
    async getInvoicePaymentStatus(invoiceId) {
        // Get the invoice
        const invoice = await this.invoiceRepository.findOne({
            where: { id: invoiceId },
        });
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        // Get all transactions for this invoice
        const transactions = await this.transactionRepository.find({
            where: { invoiceId },
            order: { createdAt: 'DESC' },
        });
        // Calculate total paid amount from completed transactions
        const paidAmount = transactions
            .filter(t => t.status === payment_transaction_entity_1.TransactionStatus.COMPLETED && t.type === 'payment')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        // Calculate total refunded amount
        const refundedAmount = transactions
            .filter(t => (t.status === payment_transaction_entity_1.TransactionStatus.COMPLETED && t.type === 'refund') ||
            (t.status === payment_transaction_entity_1.TransactionStatus.REFUNDED))
            .reduce((sum, t) => sum + Number(t.amount), 0);
        // Calculate net paid amount
        const netPaidAmount = paidAmount - refundedAmount;
        // Calculate pending amount
        const pendingAmount = Math.max(0, Number(invoice.totalAmount) - netPaidAmount);
        // Determine if invoice is fully paid
        const isPaid = netPaidAmount >= Number(invoice.totalAmount);
        // Get the latest successful payment date
        const latestPayment = transactions
            .filter(t => t.status === payment_transaction_entity_1.TransactionStatus.COMPLETED && t.type === 'payment')
            .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0];
        return {
            isPaid,
            paidAmount: netPaidAmount,
            paidDate: latestPayment?.completedAt || null,
            pendingAmount,
            transactions,
        };
    }
};
exports.InvoicePaymentIntegrationService = InvoicePaymentIntegrationService;
exports.InvoicePaymentIntegrationService = InvoicePaymentIntegrationService = InvoicePaymentIntegrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(invoice_entity_1.Invoice)),
    __param(1, (0, typeorm_1.InjectRepository)(payment_transaction_entity_1.PaymentTransaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        payment_processing_service_1.PaymentProcessingService, typeof (_a = typeof event_emitter_1.EventEmitter2 !== "undefined" && event_emitter_1.EventEmitter2) === "function" ? _a : Object])
], InvoicePaymentIntegrationService);
//# sourceMappingURL=invoice-payment-integration.service.js.map