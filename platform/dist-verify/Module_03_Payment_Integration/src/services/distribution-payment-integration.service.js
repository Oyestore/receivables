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
var DistributionPaymentIntegrationService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributionPaymentIntegrationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_transaction_entity_1 = require("../entities/payment-transaction.entity");
const distribution_record_entity_1 = require("../../distribution/entities/distribution-record.entity");
const event_emitter_1 = require("@nestjs/event-emitter");
let DistributionPaymentIntegrationService = DistributionPaymentIntegrationService_1 = class DistributionPaymentIntegrationService {
    constructor(transactionRepository, distributionRepository, eventEmitter) {
        this.transactionRepository = transactionRepository;
        this.distributionRepository = distributionRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(DistributionPaymentIntegrationService_1.name);
    }
    async handleInvoicePaid(payload) {
        this.logger.log(`Invoice ${payload.invoiceId} paid with transaction ${payload.transactionId}`);
        // Find all distribution records for this invoice
        const distributions = await this.distributionRepository.find({
            where: { invoiceId: payload.invoiceId },
        });
        if (!distributions.length) {
            this.logger.debug(`No distribution records found for invoice ${payload.invoiceId}`);
            return;
        }
        // Update distribution records with payment information
        for (const distribution of distributions) {
            distribution.paymentStatus = 'paid';
            distribution.paymentDate = payload.paidDate;
            distribution.paymentTransactionId = payload.transactionId;
            // Save the updated distribution record
            await this.distributionRepository.save(distribution);
            // Emit event for follow-up module to update its sequences
            this.eventEmitter.emit('distribution.payment.received', {
                distributionId: distribution.id,
                invoiceId: payload.invoiceId,
                recipientId: distribution.recipientContactId,
                amount: payload.amount,
                paymentDate: payload.paidDate,
            });
        }
    }
    async handlePaymentFailed(payload) {
        this.logger.log(`Payment failed for invoice ${payload.invoiceId}: ${payload.failureReason}`);
        // Find all distribution records for this invoice
        const distributions = await this.distributionRepository.find({
            where: { invoiceId: payload.invoiceId },
        });
        if (!distributions.length) {
            return;
        }
        // Update distribution records with payment failure information
        for (const distribution of distributions) {
            distribution.paymentStatus = 'failed';
            // Save the updated distribution record
            await this.distributionRepository.save(distribution);
            // Emit event for follow-up module to trigger payment failure follow-up
            this.eventEmitter.emit('distribution.payment.failed', {
                distributionId: distribution.id,
                invoiceId: payload.invoiceId,
                recipientId: distribution.recipientContactId,
                failureReason: payload.failureReason,
            });
        }
    }
    async getDistributionPaymentStatus(distributionId) {
        const distribution = await this.distributionRepository.findOne({
            where: { id: distributionId },
        });
        if (!distribution) {
            throw new Error('Distribution record not found');
        }
        return {
            isPaid: distribution.paymentStatus === 'paid',
            paymentDate: distribution.paymentDate || null,
            transactionId: distribution.paymentTransactionId || null,
        };
    }
};
exports.DistributionPaymentIntegrationService = DistributionPaymentIntegrationService;
__decorate([
    (0, event_emitter_1.OnEvent)('invoice.paid'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DistributionPaymentIntegrationService.prototype, "handleInvoicePaid", null);
__decorate([
    (0, event_emitter_1.OnEvent)('invoice.payment.failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DistributionPaymentIntegrationService.prototype, "handlePaymentFailed", null);
exports.DistributionPaymentIntegrationService = DistributionPaymentIntegrationService = DistributionPaymentIntegrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_transaction_entity_1.PaymentTransaction)),
    __param(1, (0, typeorm_1.InjectRepository)(distribution_record_entity_1.DistributionRecord)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository, typeof (_a = typeof event_emitter_1.EventEmitter2 !== "undefined" && event_emitter_1.EventEmitter2) === "function" ? _a : Object])
], DistributionPaymentIntegrationService);
//# sourceMappingURL=distribution-payment-integration.service.js.map