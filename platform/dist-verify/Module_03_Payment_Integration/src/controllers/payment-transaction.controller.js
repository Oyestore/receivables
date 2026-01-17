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
var PaymentTransactionController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentTransactionController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const payment_processing_service_1 = require("../services/payment-processing.service");
const invoice_payment_integration_service_1 = require("../services/invoice-payment-integration.service");
const payment_transaction_entity_1 = require("../entities/payment-transaction.entity");
const swagger_1 = require("@nestjs/swagger");
let PaymentTransactionController = PaymentTransactionController_1 = class PaymentTransactionController {
    constructor(paymentProcessingService, invoicePaymentIntegrationService) {
        this.paymentProcessingService = paymentProcessingService;
        this.invoicePaymentIntegrationService = invoicePaymentIntegrationService;
        this.logger = new common_1.Logger(PaymentTransactionController_1.name);
    }
    async getTransactionsByOrganization(organizationId, status, type, startDate, endDate, page, limit) {
        try {
            const filters = { status, type, startDate, endDate };
            const pagination = page && limit ? { page: +page, limit: +limit } : undefined;
            return this.paymentProcessingService.getTransactionsByOrganization(organizationId, filters, pagination);
        }
        catch (error) {
            this.logger.error(`Failed to get transactions: ${error.message}`, error.stack);
            throw new common_1.HttpException('Failed to retrieve transactions', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getTransactionById(id) {
        try {
            return this.paymentProcessingService.getTransactionById(id);
        }
        catch (error) {
            this.logger.error(`Failed to get transaction ${id}: ${error.message}`, error.stack);
            throw new common_1.HttpException(error.message || 'Failed to retrieve transaction', common_1.HttpStatus.NOT_FOUND);
        }
    }
    async getTransactionsByInvoiceId(invoiceId) {
        try {
            return this.paymentProcessingService.getTransactionsByInvoiceId(invoiceId);
        }
        catch (error) {
            this.logger.error(`Failed to get transactions for invoice ${invoiceId}: ${error.message}`, error.stack);
            throw new common_1.HttpException('Failed to retrieve transactions for invoice', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async initiatePayment(paymentData) {
        try {
            const result = await this.paymentProcessingService.initiatePayment(paymentData.organizationId, paymentData.paymentMethodId, paymentData.amount, paymentData.currency, paymentData.invoiceId, paymentData.customerInfo, paymentData.metadata);
            return {
                success: true,
                transactionId: result.transaction.id,
                transactionReference: result.transaction.transactionReference,
                paymentUrl: result.paymentUrl,
                paymentToken: result.paymentToken,
                qrCode: result.qrCode,
            };
        }
        catch (error) {
            this.logger.error(`Failed to initiate payment: ${error.message}`, error.stack);
            throw new common_1.HttpException(error.message || 'Failed to initiate payment', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async verifyPayment(id) {
        try {
            const transaction = await this.paymentProcessingService.verifyPayment(id);
            // If transaction is associated with an invoice, update invoice payment status
            if (transaction.invoiceId) {
                await this.invoicePaymentIntegrationService.updateInvoicePaymentStatus(transaction.id);
            }
            return {
                success: transaction.status === payment_transaction_entity_1.TransactionStatus.COMPLETED,
                status: transaction.status,
                transactionId: transaction.id,
                transactionReference: transaction.transactionReference,
            };
        }
        catch (error) {
            this.logger.error(`Failed to verify payment ${id}: ${error.message}`, error.stack);
            throw new common_1.HttpException(error.message || 'Failed to verify payment', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async processRefund(id, refundData) {
        try {
            const refundTransaction = await this.paymentProcessingService.processRefund(id, refundData.amount, refundData.reason);
            // If transaction is associated with an invoice, update invoice payment status
            if (refundTransaction.invoiceId) {
                await this.invoicePaymentIntegrationService.updateInvoicePaymentStatus(refundTransaction.id);
            }
            return {
                success: true,
                refundTransactionId: refundTransaction.id,
                refundTransactionReference: refundTransaction.transactionReference,
                status: refundTransaction.status,
            };
        }
        catch (error) {
            this.logger.error(`Failed to process refund for ${id}: ${error.message}`, error.stack);
            throw new common_1.HttpException(error.message || 'Failed to process refund', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async generateInvoicePaymentLink(invoiceId, linkData) {
        try {
            const result = await this.invoicePaymentIntegrationService.generatePaymentLink(invoiceId, linkData.paymentMethodId, linkData.expiryHours);
            return {
                success: true,
                paymentUrl: result.paymentUrl,
                transactionId: result.transactionId,
                expiresAt: result.expiresAt,
            };
        }
        catch (error) {
            this.logger.error(`Failed to generate payment link for invoice ${invoiceId}: ${error.message}`, error.stack);
            throw new common_1.HttpException(error.message || 'Failed to generate payment link', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getInvoicePaymentStatus(invoiceId) {
        try {
            return this.invoicePaymentIntegrationService.getInvoicePaymentStatus(invoiceId);
        }
        catch (error) {
            this.logger.error(`Failed to get payment status for invoice ${invoiceId}: ${error.message}`, error.stack);
            throw new common_1.HttpException(error.message || 'Failed to retrieve payment status', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.PaymentTransactionController = PaymentTransactionController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get transactions by organization' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns transactions for the organization' }),
    __param(0, (0, common_1.Query)('organizationId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('page')),
    __param(6, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Date,
        Date, Number, Number]),
    __metadata("design:returntype", Promise)
], PaymentTransactionController.prototype, "getTransactionsByOrganization", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get transaction by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the transaction details' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentTransactionController.prototype, "getTransactionById", null);
__decorate([
    (0, common_1.Get)('invoice/:invoiceId'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get transactions by invoice ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns transactions for the invoice' }),
    __param(0, (0, common_1.Param)('invoiceId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentTransactionController.prototype, "getTransactionsByInvoiceId", null);
__decorate([
    (0, common_1.Post)('initiate'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate a payment' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Payment initiated successfully' }),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentTransactionController.prototype, "initiatePayment", null);
__decorate([
    (0, common_1.Post)(':id/verify'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Verify a payment' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payment verification result' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentTransactionController.prototype, "verifyPayment", null);
__decorate([
    (0, common_1.Post)(':id/refund'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Process a refund' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Refund processed successfully' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentTransactionController.prototype, "processRefund", null);
__decorate([
    (0, common_1.Post)('invoice/:invoiceId/payment-link'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Generate payment link for invoice' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Payment link generated successfully' }),
    __param(0, (0, common_1.Param)('invoiceId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentTransactionController.prototype, "generateInvoicePaymentLink", null);
__decorate([
    (0, common_1.Get)('invoice/:invoiceId/payment-status'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get payment status for invoice' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns payment status for the invoice' }),
    __param(0, (0, common_1.Param)('invoiceId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentTransactionController.prototype, "getInvoicePaymentStatus", null);
exports.PaymentTransactionController = PaymentTransactionController = PaymentTransactionController_1 = __decorate([
    (0, swagger_1.ApiTags)('payment-transactions'),
    (0, common_1.Controller)('payment/transactions'),
    __metadata("design:paramtypes", [payment_processing_service_1.PaymentProcessingService,
        invoice_payment_integration_service_1.InvoicePaymentIntegrationService])
], PaymentTransactionController);
//# sourceMappingURL=payment-transaction.controller.js.map