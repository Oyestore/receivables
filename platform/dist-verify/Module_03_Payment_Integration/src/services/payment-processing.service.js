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
var PaymentProcessingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentProcessingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_transaction_entity_1 = require("../entities/payment-transaction.entity");
const payment_method_entity_1 = require("../entities/payment-method.entity");
const payment_gateway_factory_service_1 = require("./payment-gateway-factory.service");
const uuid_1 = require("uuid");
let PaymentProcessingService = PaymentProcessingService_1 = class PaymentProcessingService {
    constructor(transactionRepository, paymentMethodRepository, gatewayFactory) {
        this.transactionRepository = transactionRepository;
        this.paymentMethodRepository = paymentMethodRepository;
        this.gatewayFactory = gatewayFactory;
        this.logger = new common_1.Logger(PaymentProcessingService_1.name);
    }
    async initiatePayment(organizationId, paymentMethodId, amount, currency, invoiceId, customerInfo, metadata) {
        // Find the payment method
        const paymentMethod = await this.paymentMethodRepository.findOne({
            where: { id: paymentMethodId, organizationId, isEnabled: true },
            relations: ['gateway'],
        });
        if (!paymentMethod) {
            throw new Error('Payment method not found or not enabled');
        }
        // Get the gateway service
        const gatewayService = await this.gatewayFactory.getGatewayService(paymentMethod.gateway.id);
        if (!gatewayService) {
            throw new Error('Payment gateway not available');
        }
        // Calculate transaction fee
        const { percentage, fixed } = gatewayService.getTransactionFees(amount, currency, paymentMethod.type);
        const transactionFee = (amount * percentage / 100) + fixed;
        // Create a new transaction record
        const transaction = new payment_transaction_entity_1.PaymentTransaction();
        transaction.transactionReference = `TXN-${(0, uuid_1.v4)().substring(0, 8)}-${Date.now()}`;
        transaction.organizationId = organizationId;
        transaction.paymentMethodId = paymentMethodId;
        transaction.invoiceId = invoiceId;
        transaction.amount = amount;
        transaction.currency = currency;
        transaction.transactionFee = transactionFee;
        transaction.isCustomerPaidFee = paymentMethod.isCustomerBearsFee;
        transaction.status = payment_transaction_entity_1.TransactionStatus.INITIATED;
        transaction.type = payment_transaction_entity_1.TransactionType.PAYMENT;
        transaction.customerName = customerInfo?.name;
        transaction.customerEmail = customerInfo?.email;
        transaction.customerPhone = customerInfo?.phone;
        transaction.paymentDetails = metadata || {};
        // Save the transaction
        await this.transactionRepository.save(transaction);
        // Initiate payment with the gateway
        const paymentRequest = {
            amount,
            currency,
            description: `Payment for ${invoiceId ? `Invoice #${invoiceId}` : 'services'}`,
            customerName: customerInfo?.name,
            customerEmail: customerInfo?.email,
            customerPhone: customerInfo?.phone,
            invoiceId,
            metadata: {
                transactionId: transaction.id,
                transactionReference: transaction.transactionReference,
                ...metadata,
            },
            returnUrl: `${process.env.PAYMENT_RETURN_URL}?transactionId=${transaction.id}`,
            callbackUrl: `${process.env.PAYMENT_CALLBACK_URL}?transactionId=${transaction.id}`,
        };
        try {
            const response = await gatewayService.initiatePayment(paymentRequest);
            if (!response.success) {
                transaction.status = payment_transaction_entity_1.TransactionStatus.FAILED;
                transaction.failureReason = response.error;
                await this.transactionRepository.save(transaction);
                throw new Error(response.error || 'Payment initiation failed');
            }
            // Update transaction with gateway response
            transaction.gatewayTransactionId = response.gatewayTransactionId;
            transaction.paymentLink = response.paymentUrl;
            transaction.paymentLinkExpiresAt = response.expiresAt;
            transaction.gatewayResponse = response.metadata || {};
            await this.transactionRepository.save(transaction);
            return {
                transaction,
                paymentUrl: response.paymentUrl,
                paymentToken: response.paymentToken,
                qrCode: response.qrCode,
            };
        }
        catch (error) {
            transaction.status = payment_transaction_entity_1.TransactionStatus.FAILED;
            transaction.failureReason = error.message || 'Unknown error';
            await this.transactionRepository.save(transaction);
            throw error;
        }
    }
    async verifyPayment(transactionId) {
        const transaction = await this.transactionRepository.findOne({
            where: { id: transactionId },
            relations: ['paymentMethod', 'paymentMethod.gateway'],
        });
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        // Skip verification if transaction is already completed or failed
        if (transaction.status === payment_transaction_entity_1.TransactionStatus.COMPLETED ||
            transaction.status === payment_transaction_entity_1.TransactionStatus.FAILED) {
            return transaction;
        }
        // Get the gateway service
        const gatewayService = await this.gatewayFactory.getGatewayService(transaction.paymentMethod.gateway.id);
        if (!gatewayService) {
            throw new Error('Payment gateway not available');
        }
        const verifyRequest = {
            transactionId: transaction.id,
            gatewayTransactionId: transaction.gatewayTransactionId,
        };
        try {
            const response = await gatewayService.verifyPayment(verifyRequest);
            // Update transaction based on verification response
            if (response.success) {
                transaction.status = payment_transaction_entity_1.TransactionStatus.COMPLETED;
                transaction.completedAt = new Date();
            }
            else {
                transaction.status = payment_transaction_entity_1.TransactionStatus.FAILED;
                transaction.failureReason = response.error;
            }
            transaction.gatewayResponse = {
                ...transaction.gatewayResponse,
                verificationResponse: response,
            };
            await this.transactionRepository.save(transaction);
            return transaction;
        }
        catch (error) {
            this.logger.error(`Payment verification failed: ${error.message}`, error.stack);
            throw error;
        }
    }
    async processRefund(transactionId, amount, reason) {
        const transaction = await this.transactionRepository.findOne({
            where: { id: transactionId },
            relations: ['paymentMethod', 'paymentMethod.gateway'],
        });
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        if (transaction.status !== payment_transaction_entity_1.TransactionStatus.COMPLETED) {
            throw new Error('Only completed transactions can be refunded');
        }
        // Get the gateway service
        const gatewayService = await this.gatewayFactory.getGatewayService(transaction.paymentMethod.gateway.id);
        if (!gatewayService) {
            throw new Error('Payment gateway not available');
        }
        // Create refund transaction
        const refundTransaction = new payment_transaction_entity_1.PaymentTransaction();
        refundTransaction.transactionReference = `REF-${(0, uuid_1.v4)().substring(0, 8)}-${Date.now()}`;
        refundTransaction.organizationId = transaction.organizationId;
        refundTransaction.paymentMethodId = transaction.paymentMethodId;
        refundTransaction.invoiceId = transaction.invoiceId;
        refundTransaction.amount = amount || transaction.amount;
        refundTransaction.currency = transaction.currency;
        refundTransaction.status = payment_transaction_entity_1.TransactionStatus.INITIATED;
        refundTransaction.type = payment_transaction_entity_1.TransactionType.REFUND;
        refundTransaction.parentTransactionId = transaction.id;
        refundTransaction.customerName = transaction.customerName;
        refundTransaction.customerEmail = transaction.customerEmail;
        refundTransaction.customerPhone = transaction.customerPhone;
        refundTransaction.paymentDetails = {
            reason,
            originalTransaction: transaction.id,
        };
        await this.transactionRepository.save(refundTransaction);
        // Process refund with the gateway
        const refundRequest = {
            transactionId: transaction.id,
            gatewayTransactionId: transaction.gatewayTransactionId,
            amount: refundTransaction.amount,
            reason,
            metadata: {
                refundTransactionId: refundTransaction.id,
                refundTransactionReference: refundTransaction.transactionReference,
            },
        };
        try {
            const response = await gatewayService.processRefund(refundRequest);
            if (!response.success) {
                refundTransaction.status = payment_transaction_entity_1.TransactionStatus.FAILED;
                refundTransaction.failureReason = response.error;
                await this.transactionRepository.save(refundTransaction);
                throw new Error(response.error || 'Refund processing failed');
            }
            // Update refund transaction with gateway response
            refundTransaction.gatewayTransactionId = response.gatewayRefundId;
            refundTransaction.status = payment_transaction_entity_1.TransactionStatus.COMPLETED;
            refundTransaction.completedAt = new Date();
            refundTransaction.gatewayResponse = response.metadata || {};
            await this.transactionRepository.save(refundTransaction);
            // Update original transaction status
            if (amount && amount < transaction.amount) {
                transaction.status = payment_transaction_entity_1.TransactionStatus.PARTIALLY_REFUNDED;
            }
            else {
                transaction.status = payment_transaction_entity_1.TransactionStatus.REFUNDED;
            }
            await this.transactionRepository.save(transaction);
            return refundTransaction;
        }
        catch (error) {
            refundTransaction.status = payment_transaction_entity_1.TransactionStatus.FAILED;
            refundTransaction.failureReason = error.message || 'Unknown error';
            await this.transactionRepository.save(refundTransaction);
            throw error;
        }
    }
    async getTransactionById(transactionId) {
        const transaction = await this.transactionRepository.findOne({
            where: { id: transactionId },
            relations: ['paymentMethod', 'invoice'],
        });
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        return transaction;
    }
    async getTransactionsByInvoiceId(invoiceId) {
        return this.transactionRepository.find({
            where: { invoiceId },
            relations: ['paymentMethod'],
            order: { createdAt: 'DESC' },
        });
    }
    async getTransactionsByOrganization(organizationId, filters, pagination) {
        const query = this.transactionRepository.createQueryBuilder('transaction')
            .where('transaction.organizationId = :organizationId', { organizationId })
            .leftJoinAndSelect('transaction.paymentMethod', 'paymentMethod')
            .leftJoinAndSelect('transaction.invoice', 'invoice');
        if (filters?.status) {
            query.andWhere('transaction.status = :status', { status: filters.status });
        }
        if (filters?.type) {
            query.andWhere('transaction.type = :type', { type: filters.type });
        }
        if (filters?.startDate) {
            query.andWhere('transaction.createdAt >= :startDate', { startDate: filters.startDate });
        }
        if (filters?.endDate) {
            query.andWhere('transaction.createdAt <= :endDate', { endDate: filters.endDate });
        }
        const total = await query.getCount();
        if (pagination) {
            const { page, limit } = pagination;
            query.skip((page - 1) * limit).take(limit);
        }
        query.orderBy('transaction.createdAt', 'DESC');
        const transactions = await query.getMany();
        return { transactions, total };
    }
};
exports.PaymentProcessingService = PaymentProcessingService;
exports.PaymentProcessingService = PaymentProcessingService = PaymentProcessingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_transaction_entity_1.PaymentTransaction)),
    __param(1, (0, typeorm_1.InjectRepository)(payment_method_entity_1.PaymentMethod)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        payment_gateway_factory_service_1.PaymentGatewayFactory])
], PaymentProcessingService);
//# sourceMappingURL=payment-processing.service.js.map