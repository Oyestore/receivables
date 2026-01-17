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
var IncentivesIntegrationService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncentivesIntegrationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const invoice_entity_1 = require("../../../invoices/entities/invoice.entity");
const payment_transaction_entity_1 = require("../../entities/payment-transaction.entity");
const discount_service_1 = require("./discount.service");
const late_fee_service_1 = require("./late-fee.service");
const ab_testing_service_1 = require("./ab-testing.service");
const ab_test_experiment_entity_1 = require("../entities/ab-test-experiment.entity");
const discount_application_entity_1 = require("../entities/discount-application.entity");
const late_fee_application_entity_1 = require("../entities/late-fee-application.entity");
let IncentivesIntegrationService = IncentivesIntegrationService_1 = class IncentivesIntegrationService {
    constructor(invoiceRepository, transactionRepository, discountApplicationRepository, lateFeeApplicationRepository, discountService, lateFeeService, abTestingService, eventEmitter) {
        this.invoiceRepository = invoiceRepository;
        this.transactionRepository = transactionRepository;
        this.discountApplicationRepository = discountApplicationRepository;
        this.lateFeeApplicationRepository = lateFeeApplicationRepository;
        this.discountService = discountService;
        this.lateFeeService = lateFeeService;
        this.abTestingService = abTestingService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(IncentivesIntegrationService_1.name);
    }
    /**
     * Calculate applicable early payment discount for an invoice
     * This is called during payment initiation to show potential discount
     */
    async calculateEarlyPaymentDiscount(invoiceId, paymentDate = new Date()) {
        try {
            // Check if there's an active experiment for this invoice
            const experimentalRule = await this.abTestingService.applyDiscountExperimentVariant(invoiceId);
            if (experimentalRule) {
                // Use experimental rule for calculation
                this.logger.log(`Using experimental discount rule for invoice ${invoiceId}`);
                // TODO: Implement calculation using experimental rule
                // For now, fall back to standard calculation
            }
            // Use standard discount calculation
            return this.discountService.calculateEarlyPaymentDiscount(invoiceId, paymentDate);
        }
        catch (error) {
            this.logger.error(`Error calculating early payment discount: ${error.message}`, error.stack);
            return {
                isEligible: false,
                discountAmount: 0,
                discountedAmount: 0,
                originalAmount: 0,
            };
        }
    }
    /**
     * Apply early payment discount during payment processing
     */
    async handlePaymentProcessing(payload) {
        try {
            const { invoiceId, transactionId, paymentDate } = payload;
            // Calculate discount
            const { isEligible, discountAmount, appliedRule } = await this.discountService.calculateEarlyPaymentDiscount(invoiceId, paymentDate);
            if (isEligible && appliedRule) {
                // Apply discount
                const discountApplication = await this.discountService.applyDiscount(invoiceId, appliedRule.id, paymentDate);
                // Link discount application to transaction
                discountApplication.transactionId = transactionId;
                await this.discountApplicationRepository.save(discountApplication);
                // Record experiment conversion if applicable
                await this.abTestingService.recordPaymentConversion(invoiceId, ab_test_experiment_entity_1.ExperimentType.DISCOUNT_STRATEGY, {
                    amount: payload.amount,
                    daysBeforeDueDate: this.calculateDaysBeforeDueDate(invoiceId, paymentDate),
                });
                this.logger.log(`Applied early payment discount of ${discountAmount} to invoice ${invoiceId}`);
                // Emit event for discount application
                this.eventEmitter.emit('invoice.discount.applied', {
                    invoiceId,
                    transactionId,
                    discountAmount,
                    discountRuleId: appliedRule.id,
                    discountApplicationId: discountApplication.id,
                });
            }
        }
        catch (error) {
            this.logger.error(`Error applying early payment discount: ${error.message}`, error.stack);
        }
    }
    /**
     * Handle payment completion to update discount application status
     */
    async handlePaymentCompleted(payload) {
        try {
            const { invoiceId, transactionId } = payload;
            // Find discount application for this transaction
            const discountApplication = await this.discountApplicationRepository.findOne({
                where: {
                    invoiceId,
                    transactionId,
                },
            });
            if (discountApplication) {
                // Update discount application status
                discountApplication.status = discount_application_entity_1.DiscountApplicationStatus.APPLIED;
                await this.discountApplicationRepository.save(discountApplication);
                this.logger.log(`Updated discount application status for invoice ${invoiceId}`);
            }
        }
        catch (error) {
            this.logger.error(`Error updating discount application: ${error.message}`, error.stack);
        }
    }
    /**
     * Process late fees for overdue invoices
     * This would typically be called by a scheduled job
     */
    async processLateFees(organizationId) {
        try {
            // Process standard late fees
            const result = await this.lateFeeService.processLateFees(organizationId);
            // TODO: Handle experimental late fee rules
            return result;
        }
        catch (error) {
            this.logger.error(`Error processing late fees: ${error.message}`, error.stack);
            return {
                processed: 0,
                applied: 0,
                skipped: 0,
            };
        }
    }
    /**
     * Calculate late fee for an invoice
     */
    async calculateLateFee(invoiceId, currentDate = new Date()) {
        try {
            // Check if there's an active experiment for this invoice
            const experimentalRule = await this.abTestingService.applyLateFeeExperimentVariant(invoiceId);
            if (experimentalRule) {
                // Use experimental rule for calculation
                this.logger.log(`Using experimental late fee rule for invoice ${invoiceId}`);
                // TODO: Implement calculation using experimental rule
                // For now, fall back to standard calculation
            }
            // Use standard late fee calculation
            return this.lateFeeService.calculateLateFee(invoiceId, currentDate);
        }
        catch (error) {
            this.logger.error(`Error calculating late fee: ${error.message}`, error.stack);
            return {
                isApplicable: false,
                feeAmount: 0,
                totalAmount: 0,
                originalAmount: 0,
                daysOverdue: 0,
            };
        }
    }
    /**
     * Apply late fee to an invoice
     */
    async applyLateFee(invoiceId, currentDate = new Date()) {
        try {
            // Check if there's an active experiment for this invoice
            const experimentalRule = await this.abTestingService.applyLateFeeExperimentVariant(invoiceId);
            if (experimentalRule) {
                // Apply late fee using experimental rule
                this.logger.log(`Using experimental late fee rule for invoice ${invoiceId}`);
                return this.lateFeeService.applyLateFee(invoiceId, experimentalRule.id, currentDate);
            }
            // Apply standard late fee
            return this.lateFeeService.applyLateFee(invoiceId, undefined, currentDate);
        }
        catch (error) {
            this.logger.error(`Error applying late fee: ${error.message}`, error.stack);
            throw error;
        }
    }
    /**
     * Handle payment for invoice with late fee
     */
    async handleLateFeePayment(payload) {
        try {
            const { invoiceId, transactionId } = payload;
            // Find active late fee applications for this invoice
            const lateFeeApplications = await this.lateFeeApplicationRepository.find({
                where: {
                    invoiceId,
                    status: 'applied',
                },
            });
            if (lateFeeApplications.length > 0) {
                // Update late fee applications with transaction ID
                for (const application of lateFeeApplications) {
                    application.transactionId = transactionId;
                    await this.lateFeeApplicationRepository.save(application);
                }
                // Record experiment conversion if applicable
                await this.abTestingService.recordPaymentConversion(invoiceId, ab_test_experiment_entity_1.ExperimentType.LATE_FEE_STRATEGY, {
                    amount: payload.amount,
                });
                this.logger.log(`Updated late fee applications for invoice ${invoiceId}`);
            }
        }
        catch (error) {
            this.logger.error(`Error handling late fee payment: ${error.message}`, error.stack);
        }
    }
    /**
     * Helper method to calculate days before due date
     */
    async calculateDaysBeforeDueDate(invoiceId, paymentDate) {
        const invoice = await this.invoiceRepository.findOne({
            where: { id: invoiceId },
        });
        if (!invoice || !invoice.dueDate) {
            return 0;
        }
        const dueDate = new Date(invoice.dueDate);
        const daysDifference = Math.ceil((dueDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(0, daysDifference);
    }
};
exports.IncentivesIntegrationService = IncentivesIntegrationService;
__decorate([
    (0, event_emitter_1.OnEvent)('payment.processing'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IncentivesIntegrationService.prototype, "handlePaymentProcessing", null);
__decorate([
    (0, event_emitter_1.OnEvent)('payment.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IncentivesIntegrationService.prototype, "handlePaymentCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('payment.processing'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IncentivesIntegrationService.prototype, "handleLateFeePayment", null);
exports.IncentivesIntegrationService = IncentivesIntegrationService = IncentivesIntegrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(invoice_entity_1.Invoice)),
    __param(1, (0, typeorm_1.InjectRepository)(payment_transaction_entity_1.PaymentTransaction)),
    __param(2, (0, typeorm_1.InjectRepository)(discount_application_entity_1.DiscountApplication)),
    __param(3, (0, typeorm_1.InjectRepository)(late_fee_application_entity_1.LateFeeApplication)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        discount_service_1.DiscountService,
        late_fee_service_1.LateFeeService,
        ab_testing_service_1.ABTestingService, typeof (_a = typeof event_emitter_1.EventEmitter2 !== "undefined" && event_emitter_1.EventEmitter2) === "function" ? _a : Object])
], IncentivesIntegrationService);
//# sourceMappingURL=incentives-integration.service.js.map