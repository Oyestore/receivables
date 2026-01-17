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
var LateFeeService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LateFeeService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_late_fee_rule_entity_1 = require("../entities/payment-late-fee-rule.entity");
const late_fee_application_entity_1 = require("../entities/late-fee-application.entity");
const invoice_entity_1 = require("../../../invoices/entities/invoice.entity");
const event_emitter_1 = require("@nestjs/event-emitter");
let LateFeeService = LateFeeService_1 = class LateFeeService {
    constructor(lateFeeRuleRepository, lateFeeApplicationRepository, invoiceRepository, eventEmitter) {
        this.lateFeeRuleRepository = lateFeeRuleRepository;
        this.lateFeeApplicationRepository = lateFeeApplicationRepository;
        this.invoiceRepository = invoiceRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(LateFeeService_1.name);
    }
    /**
     * Find applicable late fee rules for an organization
     */
    async findActiveLateFeeRules(organizationId) {
        const currentDate = new Date();
        return this.lateFeeRuleRepository.find({
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
     * Calculate late fee for an invoice
     */
    async calculateLateFee(invoiceId, currentDate = new Date()) {
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
                isApplicable: false,
                feeAmount: 0,
                totalAmount: invoice.totalAmount,
                originalAmount: invoice.totalAmount,
                daysOverdue: 0,
            };
        }
        // Calculate days overdue
        const dueDate = new Date(invoice.dueDate);
        const daysOverdue = Math.floor((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        // If not overdue, no late fee applies
        if (daysOverdue <= 0) {
            return {
                isApplicable: false,
                feeAmount: 0,
                totalAmount: invoice.totalAmount,
                originalAmount: invoice.totalAmount,
                daysOverdue: 0,
            };
        }
        // Get active late fee rules for the organization
        const lateFeeRules = await this.findActiveLateFeeRules(invoice.organizationId);
        if (!lateFeeRules.length) {
            return {
                isApplicable: false,
                feeAmount: 0,
                totalAmount: invoice.totalAmount,
                originalAmount: invoice.totalAmount,
                daysOverdue,
            };
        }
        // Find applicable rule based on conditions
        let applicableRule;
        for (const rule of lateFeeRules) {
            // Check currency match if specified
            if (rule.currencyCode && rule.currencyCode !== invoice.currency) {
                continue;
            }
            // Check minimum invoice amount
            if (rule.minimumInvoiceAmount && invoice.totalAmount < rule.minimumInvoiceAmount) {
                continue;
            }
            // Check grace period
            if (daysOverdue <= rule.gracePeriodDays) {
                continue;
            }
            // This rule is applicable
            applicableRule = rule;
            break;
        }
        if (!applicableRule) {
            return {
                isApplicable: false,
                feeAmount: 0,
                totalAmount: invoice.totalAmount,
                originalAmount: invoice.totalAmount,
                daysOverdue,
            };
        }
        // Calculate late fee amount
        let feeAmount = 0;
        const effectiveDaysOverdue = daysOverdue - applicableRule.gracePeriodDays;
        if (applicableRule.feeType === payment_late_fee_rule_entity_1.LateFeeType.FIXED_AMOUNT) {
            // Fixed amount fee
            feeAmount = applicableRule.feeValue;
            // Apply frequency multiplier if applicable
            if (applicableRule.frequency === payment_late_fee_rule_entity_1.LateFeeFrequency.DAILY) {
                feeAmount *= effectiveDaysOverdue;
            }
            else if (applicableRule.frequency === payment_late_fee_rule_entity_1.LateFeeFrequency.WEEKLY) {
                feeAmount *= Math.ceil(effectiveDaysOverdue / 7);
            }
            else if (applicableRule.frequency === payment_late_fee_rule_entity_1.LateFeeFrequency.MONTHLY) {
                feeAmount *= Math.ceil(effectiveDaysOverdue / 30);
            }
        }
        else if (applicableRule.feeType === payment_late_fee_rule_entity_1.LateFeeType.PERCENTAGE) {
            // Percentage-based fee
            feeAmount = (invoice.totalAmount * applicableRule.feeValue) / 100;
            // Apply frequency multiplier if applicable
            if (applicableRule.frequency === payment_late_fee_rule_entity_1.LateFeeFrequency.DAILY) {
                feeAmount *= effectiveDaysOverdue;
            }
            else if (applicableRule.frequency === payment_late_fee_rule_entity_1.LateFeeFrequency.WEEKLY) {
                feeAmount *= Math.ceil(effectiveDaysOverdue / 7);
            }
            else if (applicableRule.frequency === payment_late_fee_rule_entity_1.LateFeeFrequency.MONTHLY) {
                feeAmount *= Math.ceil(effectiveDaysOverdue / 30);
            }
        }
        else if (applicableRule.feeType === payment_late_fee_rule_entity_1.LateFeeType.COMPOUND_PERCENTAGE) {
            // Compound percentage fee (compounding daily)
            const dailyRate = applicableRule.feeValue / 100;
            let compoundAmount = invoice.totalAmount;
            for (let i = 0; i < effectiveDaysOverdue; i++) {
                compoundAmount += compoundAmount * dailyRate;
            }
            feeAmount = compoundAmount - invoice.totalAmount;
        }
        // Apply maximum fee constraints if specified
        if (applicableRule.maximumFeeAmount && feeAmount > applicableRule.maximumFeeAmount) {
            feeAmount = applicableRule.maximumFeeAmount;
        }
        if (applicableRule.maximumFeePercentage) {
            const maxFeeByPercentage = (invoice.totalAmount * applicableRule.maximumFeePercentage) / 100;
            if (feeAmount > maxFeeByPercentage) {
                feeAmount = maxFeeByPercentage;
            }
        }
        const totalAmount = invoice.totalAmount + feeAmount;
        return {
            isApplicable: true,
            feeAmount,
            totalAmount,
            originalAmount: invoice.totalAmount,
            daysOverdue,
            appliedRule: applicableRule,
        };
    }
    /**
     * Apply late fee to an invoice
     */
    async applyLateFee(invoiceId, lateFeeRuleId, currentDate = new Date()) {
        // Get the invoice
        const invoice = await this.invoiceRepository.findOne({
            where: { id: invoiceId },
        });
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        // Calculate the late fee
        const { isApplicable, feeAmount, totalAmount, daysOverdue, appliedRule } = await this.calculateLateFee(invoiceId, currentDate);
        if (!isApplicable) {
            throw new Error('Invoice is not eligible for late fee');
        }
        // If rule ID is provided, verify it matches the calculated rule
        if (lateFeeRuleId && appliedRule.id !== lateFeeRuleId) {
            throw new Error('Specified late fee rule is not applicable to this invoice');
        }
        // Create late fee application record
        const lateFeeApplication = this.lateFeeApplicationRepository.create({
            lateFeeRuleId: appliedRule.id,
            invoiceId,
            originalAmount: invoice.totalAmount,
            feeAmount,
            totalAmount,
            status: late_fee_application_entity_1.LateFeeApplicationStatus.APPLIED,
            daysOverdue,
            appliedAt: currentDate,
            metadata: {
                appliedBy: 'system',
                calculationDate: currentDate,
            },
        });
        // Save the late fee application
        await this.lateFeeApplicationRepository.save(lateFeeApplication);
        // Update the invoice with late fee amount
        invoice.lateFeeAmount = feeAmount;
        invoice.amountDue = totalAmount;
        await this.invoiceRepository.save(invoice);
        // Emit event for late fee application
        this.eventEmitter.emit('invoice.late_fee.applied', {
            invoiceId,
            lateFeeApplicationId: lateFeeApplication.id,
            feeAmount,
            totalAmount,
            daysOverdue,
        });
        return lateFeeApplication;
    }
    /**
     * Waive a late fee
     */
    async waiveLateFee(applicationId, reason, waivedBy) {
        const application = await this.lateFeeApplicationRepository.findOne({
            where: { id: applicationId },
        });
        if (!application) {
            throw new Error('Late fee application not found');
        }
        if (application.status !== late_fee_application_entity_1.LateFeeApplicationStatus.APPLIED &&
            application.status !== late_fee_application_entity_1.LateFeeApplicationStatus.PENDING) {
            throw new Error('Only applied or pending late fees can be waived');
        }
        application.status = late_fee_application_entity_1.LateFeeApplicationStatus.WAIVED;
        application.waivedAt = new Date();
        application.waivedReason = reason;
        application.waivedBy = waivedBy;
        await this.lateFeeApplicationRepository.save(application);
        // Revert invoice amount
        const invoice = await this.invoiceRepository.findOne({
            where: { id: application.invoiceId },
        });
        if (invoice) {
            invoice.lateFeeAmount = 0;
            invoice.amountDue = invoice.totalAmount;
            await this.invoiceRepository.save(invoice);
        }
        // Emit event for late fee waiver
        this.eventEmitter.emit('invoice.late_fee.waived', {
            invoiceId: application.invoiceId,
            lateFeeApplicationId: application.id,
            reason,
            waivedBy,
        });
        return application;
    }
    /**
     * Create a new late fee rule
     */
    async createLateFeeRule(organizationId, lateFeeRuleData) {
        const lateFeeRule = this.lateFeeRuleRepository.create({
            ...lateFeeRuleData,
            organizationId,
        });
        return this.lateFeeRuleRepository.save(lateFeeRule);
    }
    /**
     * Update an existing late fee rule
     */
    async updateLateFeeRule(id, lateFeeRuleData) {
        await this.lateFeeRuleRepository.update(id, lateFeeRuleData);
        return this.lateFeeRuleRepository.findOne({
            where: { id },
        });
    }
    /**
     * Delete a late fee rule
     */
    async deleteLateFeeRule(id) {
        await this.lateFeeRuleRepository.delete(id);
    }
    /**
     * Get late fee rules for an organization
     */
    async getLateFeeRules(organizationId, filters) {
        const whereClause = { organizationId };
        if (filters) {
            if (filters.status)
                whereClause.status = filters.status;
            if (filters.isEnabled !== undefined)
                whereClause.isEnabled = filters.isEnabled;
        }
        return this.lateFeeRuleRepository.find({
            where: whereClause,
            order: {
                priority: 'DESC',
                createdAt: 'DESC',
            },
        });
    }
    /**
     * Get late fee applications for an invoice
     */
    async getLateFeeApplicationsForInvoice(invoiceId) {
        return this.lateFeeApplicationRepository.find({
            where: { invoiceId },
            relations: ['lateFeeRule'],
            order: {
                createdAt: 'DESC',
            },
        });
    }
    /**
     * Process late fees for all overdue invoices
     * This method would typically be called by a scheduled job
     */
    async processLateFees(organizationId) {
        // Find all overdue invoices
        const currentDate = new Date();
        const overdueInvoices = await this.invoiceRepository.find({
            where: {
                organizationId,
                status: 'unpaid',
                dueDate: (0, typeorm_2.LessThan)(currentDate),
            },
        });
        let processed = 0;
        let applied = 0;
        let skipped = 0;
        for (const invoice of overdueInvoices) {
            processed++;
            try {
                // Check if late fee is applicable
                const { isApplicable } = await this.calculateLateFee(invoice.id, currentDate);
                if (isApplicable) {
                    // Apply late fee
                    await this.applyLateFee(invoice.id, undefined, currentDate);
                    applied++;
                }
                else {
                    skipped++;
                }
            }
            catch (error) {
                this.logger.error(`Error processing late fee for invoice ${invoice.id}: ${error.message}`);
                skipped++;
            }
        }
        return { processed, applied, skipped };
    }
};
exports.LateFeeService = LateFeeService;
exports.LateFeeService = LateFeeService = LateFeeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_late_fee_rule_entity_1.PaymentLateFeeRule)),
    __param(1, (0, typeorm_1.InjectRepository)(late_fee_application_entity_1.LateFeeApplication)),
    __param(2, (0, typeorm_1.InjectRepository)(invoice_entity_1.Invoice)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, typeof (_a = typeof event_emitter_1.EventEmitter2 !== "undefined" && event_emitter_1.EventEmitter2) === "function" ? _a : Object])
], LateFeeService);
//# sourceMappingURL=late-fee.service.js.map