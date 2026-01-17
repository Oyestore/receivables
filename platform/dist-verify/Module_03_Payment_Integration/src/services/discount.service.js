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
var DiscountService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscountService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_discount_rule_entity_1 = require("../entities/payment-discount-rule.entity");
const discount_application_entity_1 = require("../entities/discount-application.entity");
const invoice_entity_1 = require("../../../invoices/entities/invoice.entity");
let DiscountService = DiscountService_1 = class DiscountService {
    constructor(discountRuleRepository, discountApplicationRepository, invoiceRepository) {
        this.discountRuleRepository = discountRuleRepository;
        this.discountApplicationRepository = discountApplicationRepository;
        this.invoiceRepository = invoiceRepository;
        this.logger = new common_1.Logger(DiscountService_1.name);
    }
    /**
     * Find applicable discount rules for an organization
     */
    async findActiveDiscountRules(organizationId) {
        const currentDate = new Date();
        return this.discountRuleRepository.find({
            where: [
                {
                    organizationId,
                    isEnabled: true,
                    status: 'active',
                    validFrom: (0, typeorm_2.LessThan)(currentDate),
                    validUntil: (0, typeorm_2.MoreThan)(currentDate),
                },
                {
                    organizationId,
                    isEnabled: true,
                    status: 'active',
                    validFrom: (0, typeorm_2.LessThan)(currentDate),
                    validUntil: null,
                },
            ],
            order: {
                priority: 'DESC',
            },
        });
    }
    /**
     * Calculate early payment discount for an invoice
     */
    async calculateEarlyPaymentDiscount(invoiceId, paymentDate) {
        // Get the invoice
        const invoice = await this.invoiceRepository.findOne({
            where: { id: invoiceId },
        });
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        // Check if invoice is already paid
        if (invoice.status === 'paid') {
            return {
                isEligible: false,
                discountAmount: 0,
                discountedAmount: invoice.totalAmount,
                originalAmount: invoice.totalAmount,
            };
        }
        // Get active discount rules for the organization
        const discountRules = await this.findActiveDiscountRules(invoice.organizationId);
        // Filter for early payment rules
        const earlyPaymentRules = discountRules.filter(rule => rule.triggerType === payment_discount_rule_entity_1.DiscountTrigger.EARLY_PAYMENT);
        if (!earlyPaymentRules.length) {
            return {
                isEligible: false,
                discountAmount: 0,
                discountedAmount: invoice.totalAmount,
                originalAmount: invoice.totalAmount,
            };
        }
        // Find applicable rule based on conditions
        let applicableRule;
        for (const rule of earlyPaymentRules) {
            // Check currency match if specified
            if (rule.currencyCode && rule.currencyCode !== invoice.currency) {
                continue;
            }
            // Check amount constraints
            if ((rule.minimumAmount && invoice.totalAmount < rule.minimumAmount) ||
                (rule.maximumAmount && invoice.totalAmount > rule.maximumAmount)) {
                continue;
            }
            // Check early payment conditions
            const conditions = rule.triggerConditions;
            if (conditions.daysBeforeDueDate) {
                const dueDate = new Date(invoice.dueDate);
                const daysDifference = Math.ceil((dueDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
                if (daysDifference < conditions.daysBeforeDueDate) {
                    continue;
                }
            }
            // This rule is applicable
            applicableRule = rule;
            break;
        }
        if (!applicableRule) {
            return {
                isEligible: false,
                discountAmount: 0,
                discountedAmount: invoice.totalAmount,
                originalAmount: invoice.totalAmount,
            };
        }
        // Calculate discount amount
        let discountAmount = 0;
        if (applicableRule.discountType === payment_discount_rule_entity_1.DiscountType.PERCENTAGE) {
            discountAmount = (invoice.totalAmount * applicableRule.discountValue) / 100;
        }
        else {
            discountAmount = applicableRule.discountValue;
        }
        // Ensure discount doesn't exceed invoice amount
        discountAmount = Math.min(discountAmount, invoice.totalAmount);
        const discountedAmount = invoice.totalAmount - discountAmount;
        return {
            isEligible: true,
            discountAmount,
            discountedAmount,
            originalAmount: invoice.totalAmount,
            appliedRule: applicableRule,
        };
    }
    /**
     * Apply discount to an invoice
     */
    async applyDiscount(invoiceId, discountRuleId, paymentDate) {
        // Get the invoice
        const invoice = await this.invoiceRepository.findOne({
            where: { id: invoiceId },
        });
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        // Get the discount rule
        const discountRule = await this.discountRuleRepository.findOne({
            where: { id: discountRuleId },
        });
        if (!discountRule) {
            throw new Error('Discount rule not found');
        }
        // Calculate the discount
        const { isEligible, discountAmount, discountedAmount } = await this.calculateEarlyPaymentDiscount(invoiceId, paymentDate);
        if (!isEligible) {
            throw new Error('Invoice is not eligible for this discount');
        }
        // Create discount application record
        const discountApplication = this.discountApplicationRepository.create({
            discountRuleId,
            invoiceId,
            originalAmount: invoice.totalAmount,
            discountAmount,
            finalAmount: discountedAmount,
            status: discount_application_entity_1.DiscountApplicationStatus.APPLIED,
            appliedAt: new Date(),
            metadata: {
                appliedBy: 'system',
                paymentDate,
            },
        });
        // Save the discount application
        await this.discountApplicationRepository.save(discountApplication);
        // Update the invoice with discounted amount
        invoice.discountedAmount = discountAmount;
        invoice.amountDue = discountedAmount;
        await this.invoiceRepository.save(invoice);
        return discountApplication;
    }
    /**
     * Check if an invoice has any pending discount applications
     */
    async getActiveDiscountApplication(invoiceId) {
        return this.discountApplicationRepository.findOne({
            where: {
                invoiceId,
                status: discount_application_entity_1.DiscountApplicationStatus.APPLIED,
            },
            relations: ['discountRule'],
        });
    }
    /**
     * Expire a discount application
     */
    async expireDiscountApplication(applicationId) {
        const application = await this.discountApplicationRepository.findOne({
            where: { id: applicationId },
        });
        if (!application) {
            throw new Error('Discount application not found');
        }
        if (application.status !== discount_application_entity_1.DiscountApplicationStatus.PENDING) {
            throw new Error('Only pending discount applications can be expired');
        }
        application.status = discount_application_entity_1.DiscountApplicationStatus.EXPIRED;
        await this.discountApplicationRepository.save(application);
        // Revert invoice amount if needed
        const invoice = await this.invoiceRepository.findOne({
            where: { id: application.invoiceId },
        });
        if (invoice) {
            invoice.discountedAmount = 0;
            invoice.amountDue = invoice.totalAmount;
            await this.invoiceRepository.save(invoice);
        }
        return application;
    }
    /**
     * Create a new discount rule
     */
    async createDiscountRule(organizationId, discountRuleData) {
        const discountRule = this.discountRuleRepository.create({
            ...discountRuleData,
            organizationId,
        });
        return this.discountRuleRepository.save(discountRule);
    }
    /**
     * Update an existing discount rule
     */
    async updateDiscountRule(id, discountRuleData) {
        await this.discountRuleRepository.update(id, discountRuleData);
        return this.discountRuleRepository.findOne({
            where: { id },
        });
    }
    /**
     * Delete a discount rule
     */
    async deleteDiscountRule(id) {
        await this.discountRuleRepository.delete(id);
    }
    /**
     * Get discount rules for an organization
     */
    async getDiscountRules(organizationId, filters) {
        const whereClause = { organizationId };
        if (filters) {
            if (filters.status)
                whereClause.status = filters.status;
            if (filters.triggerType)
                whereClause.triggerType = filters.triggerType;
            if (filters.isEnabled !== undefined)
                whereClause.isEnabled = filters.isEnabled;
        }
        return this.discountRuleRepository.find({
            where: whereClause,
            order: {
                priority: 'DESC',
                createdAt: 'DESC',
            },
        });
    }
    /**
     * Get discount applications for an invoice
     */
    async getDiscountApplicationsForInvoice(invoiceId) {
        return this.discountApplicationRepository.find({
            where: { invoiceId },
            relations: ['discountRule'],
            order: {
                createdAt: 'DESC',
            },
        });
    }
};
exports.DiscountService = DiscountService;
exports.DiscountService = DiscountService = DiscountService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_discount_rule_entity_1.PaymentDiscountRule)),
    __param(1, (0, typeorm_1.InjectRepository)(discount_application_entity_1.DiscountApplication)),
    __param(2, (0, typeorm_1.InjectRepository)(invoice_entity_1.Invoice)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], DiscountService);
//# sourceMappingURL=discount.service.js.map