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
var InstallmentService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstallmentService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const installment_plan_entity_1 = require("../entities/installment-plan.entity");
const installment_payment_entity_1 = require("../entities/installment-payment.entity");
const invoice_entity_1 = require("../../../invoices/entities/invoice.entity");
const payment_transaction_entity_1 = require("../../entities/payment-transaction.entity");
const event_emitter_1 = require("@nestjs/event-emitter");
let InstallmentService = InstallmentService_1 = class InstallmentService {
    constructor(installmentPlanRepository, installmentPaymentRepository, invoiceRepository, transactionRepository, eventEmitter) {
        this.installmentPlanRepository = installmentPlanRepository;
        this.installmentPaymentRepository = installmentPaymentRepository;
        this.invoiceRepository = invoiceRepository;
        this.transactionRepository = transactionRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(InstallmentService_1.name);
    }
    /**
     * Create a new installment plan
     */
    async createInstallmentPlan(organizationId, planData) {
        // Validate plan data
        this.validateInstallmentPlanData(planData);
        // Create the plan
        const plan = this.installmentPlanRepository.create({
            ...planData,
            organizationId,
            remainingAmount: planData.totalAmount - (planData.downPaymentAmount || 0),
            status: installment_plan_entity_1.InstallmentPlanStatus.DRAFT,
        });
        // Save the plan
        const savedPlan = await this.installmentPlanRepository.save(plan);
        // If invoice ID is provided, link the plan to the invoice
        if (planData.invoiceId) {
            const invoice = await this.invoiceRepository.findOne({
                where: { id: planData.invoiceId },
            });
            if (invoice) {
                // Update invoice to reflect installment plan
                invoice.hasInstallmentPlan = true;
                invoice.installmentPlanId = savedPlan.id;
                await this.invoiceRepository.save(invoice);
            }
        }
        return savedPlan;
    }
    /**
     * Generate installment schedule
     */
    async generateInstallmentSchedule(planId) {
        const plan = await this.installmentPlanRepository.findOne({
            where: { id: planId },
        });
        if (!plan) {
            throw new Error('Installment plan not found');
        }
        // Calculate installment amount (excluding down payment)
        const remainingAmount = plan.totalAmount - (plan.downPaymentAmount || 0);
        const baseInstallmentAmount = remainingAmount / plan.numberOfInstallments;
        // Calculate interest if applicable
        let totalInterest = 0;
        if (plan.isInterestBearing && plan.interestRate > 0) {
            // Simple interest calculation for demonstration
            // In production, this would use more sophisticated amortization
            totalInterest = (remainingAmount * plan.interestRate * plan.numberOfInstallments) / (100 * 12);
        }
        const interestPerInstallment = totalInterest / plan.numberOfInstallments;
        const installmentAmount = baseInstallmentAmount + interestPerInstallment;
        // Generate schedule
        const installments = [];
        let currentDate = new Date(plan.startDate);
        for (let i = 0; i < plan.numberOfInstallments; i++) {
            // Calculate due date based on frequency
            if (i > 0) {
                currentDate = this.calculateNextDueDate(currentDate, plan.frequency, plan.customFrequencyDays);
            }
            // Create installment payment
            const installment = this.installmentPaymentRepository.create({
                installmentPlanId: plan.id,
                installmentNumber: i + 1,
                amount: installmentAmount,
                principalAmount: baseInstallmentAmount,
                interestAmount: interestPerInstallment,
                remainingAmount: installmentAmount,
                dueDate: new Date(currentDate),
                status: installment_payment_entity_1.InstallmentPaymentStatus.SCHEDULED,
                currencyCode: plan.currencyCode,
            });
            installments.push(await this.installmentPaymentRepository.save(installment));
        }
        // Update plan status
        plan.status = installment_plan_entity_1.InstallmentPlanStatus.ACTIVE;
        await this.installmentPlanRepository.save(plan);
        // Emit event for installment schedule creation
        this.eventEmitter.emit('installment.schedule_created', {
            planId: plan.id,
            numberOfInstallments: plan.numberOfInstallments,
            totalAmount: plan.totalAmount,
        });
        return installments;
    }
    /**
     * Process installment payment
     */
    async processInstallmentPayment(installmentId, transactionId, amount) {
        const installment = await this.installmentPaymentRepository.findOne({
            where: { id: installmentId },
            relations: ['installmentPlan'],
        });
        if (!installment) {
            throw new Error('Installment payment not found');
        }
        const transaction = await this.transactionRepository.findOne({
            where: { id: transactionId },
        });
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        // Update installment payment
        installment.paidAmount = amount;
        installment.remainingAmount = Math.max(0, installment.amount - amount);
        installment.paidDate = new Date();
        installment.transactionId = transactionId;
        // Update status based on payment amount
        if (installment.remainingAmount <= 0) {
            installment.status = installment_payment_entity_1.InstallmentPaymentStatus.PAID;
        }
        else {
            installment.status = installment_payment_entity_1.InstallmentPaymentStatus.PARTIALLY_PAID;
        }
        await this.installmentPaymentRepository.save(installment);
        // Update installment plan
        const plan = installment.installmentPlan;
        plan.paidAmount += amount;
        plan.remainingAmount = Math.max(0, plan.totalAmount - plan.paidAmount);
        // Check if plan is completed
        const remainingInstallments = await this.installmentPaymentRepository.count({
            where: {
                installmentPlanId: plan.id,
                status: installment_payment_entity_1.InstallmentPaymentStatus.SCHEDULED,
            },
        });
        if (remainingInstallments === 0 && plan.remainingAmount <= 0) {
            plan.status = installment_plan_entity_1.InstallmentPlanStatus.COMPLETED;
            plan.endDate = new Date();
        }
        await this.installmentPlanRepository.save(plan);
        // Emit event for installment payment
        this.eventEmitter.emit('installment.payment_processed', {
            planId: plan.id,
            installmentId: installment.id,
            transactionId,
            amount,
            remainingPlanAmount: plan.remainingAmount,
        });
        return installment;
    }
    /**
     * Process down payment
     */
    async processDownPayment(planId, transactionId) {
        const plan = await this.installmentPlanRepository.findOne({
            where: { id: planId },
        });
        if (!plan) {
            throw new Error('Installment plan not found');
        }
        if (!plan.downPaymentAmount || plan.downPaymentAmount <= 0) {
            throw new Error('No down payment required for this plan');
        }
        const transaction = await this.transactionRepository.findOne({
            where: { id: transactionId },
        });
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        // Update plan with down payment information
        plan.downPaymentTransactionId = transactionId;
        plan.downPaymentDate = new Date();
        plan.paidAmount += plan.downPaymentAmount;
        await this.installmentPlanRepository.save(plan);
        // Emit event for down payment
        this.eventEmitter.emit('installment.down_payment_processed', {
            planId: plan.id,
            transactionId,
            amount: plan.downPaymentAmount,
        });
        return plan;
    }
    /**
     * Get upcoming installment payments
     */
    async getUpcomingInstallments(organizationId, daysAhead = 30) {
        const currentDate = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);
        return this.installmentPaymentRepository.find({
            where: {
                installmentPlan: {
                    organizationId,
                    status: installment_plan_entity_1.InstallmentPlanStatus.ACTIVE,
                },
                status: installment_payment_entity_1.InstallmentPaymentStatus.SCHEDULED,
                dueDate: (0, typeorm_2.Between)(currentDate, futureDate),
            },
            relations: ['installmentPlan'],
            order: {
                dueDate: 'ASC',
            },
        });
    }
    /**
     * Get overdue installment payments
     */
    async getOverdueInstallments(organizationId) {
        const currentDate = new Date();
        return this.installmentPaymentRepository.find({
            where: {
                installmentPlan: {
                    organizationId,
                    status: installment_plan_entity_1.InstallmentPlanStatus.ACTIVE,
                },
                status: installment_payment_entity_1.InstallmentPaymentStatus.SCHEDULED,
                dueDate: (0, typeorm_2.LessThan)(currentDate),
            },
            relations: ['installmentPlan'],
            order: {
                dueDate: 'ASC',
            },
        });
    }
    /**
     * Mark installment as overdue
     */
    async markInstallmentAsOverdue(installmentId) {
        const installment = await this.installmentPaymentRepository.findOne({
            where: { id: installmentId },
            relations: ['installmentPlan'],
        });
        if (!installment) {
            throw new Error('Installment payment not found');
        }
        if (installment.status !== installment_payment_entity_1.InstallmentPaymentStatus.SCHEDULED) {
            throw new Error('Only scheduled installments can be marked as overdue');
        }
        const currentDate = new Date();
        if (installment.dueDate > currentDate) {
            throw new Error('Installment is not yet due');
        }
        // Calculate late fee if applicable
        const plan = installment.installmentPlan;
        let lateFeeAmount = 0;
        if (plan.latePaymentFeePercentage > 0) {
            lateFeeAmount += (installment.amount * plan.latePaymentFeePercentage) / 100;
        }
        if (plan.latePaymentFeeFixed > 0) {
            lateFeeAmount += plan.latePaymentFeeFixed;
        }
        // Update installment
        installment.status = installment_payment_entity_1.InstallmentPaymentStatus.OVERDUE;
        installment.lateFeeAmount = lateFeeAmount;
        installment.remainingAmount = installment.amount + lateFeeAmount;
        await this.installmentPaymentRepository.save(installment);
        // Emit event for overdue installment
        this.eventEmitter.emit('installment.marked_overdue', {
            planId: plan.id,
            installmentId: installment.id,
            daysOverdue: Math.floor((currentDate.getTime() - installment.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
            lateFeeAmount,
        });
        return installment;
    }
    /**
     * Cancel installment plan
     */
    async cancelInstallmentPlan(planId, reason) {
        const plan = await this.installmentPlanRepository.findOne({
            where: { id: planId },
        });
        if (!plan) {
            throw new Error('Installment plan not found');
        }
        if (plan.status === installment_plan_entity_1.InstallmentPlanStatus.COMPLETED ||
            plan.status === installment_plan_entity_1.InstallmentPlanStatus.CANCELLED) {
            throw new Error('Cannot cancel completed or already cancelled plan');
        }
        // Update plan status
        plan.status = installment_plan_entity_1.InstallmentPlanStatus.CANCELLED;
        plan.metadata = {
            ...plan.metadata,
            cancellationReason: reason,
            cancelledAt: new Date(),
        };
        await this.installmentPlanRepository.save(plan);
        // Update remaining installments
        await this.installmentPaymentRepository.update({
            installmentPlanId: plan.id,
            status: installment_payment_entity_1.InstallmentPaymentStatus.SCHEDULED,
        }, {
            status: installment_payment_entity_1.InstallmentPaymentStatus.CANCELLED,
        });
        // If linked to invoice, update invoice
        if (plan.invoiceId) {
            const invoice = await this.invoiceRepository.findOne({
                where: { id: plan.invoiceId },
            });
            if (invoice) {
                // Revert invoice to standard payment
                invoice.hasInstallmentPlan = false;
                await this.invoiceRepository.save(invoice);
            }
        }
        // Emit event for plan cancellation
        this.eventEmitter.emit('installment.plan_cancelled', {
            planId: plan.id,
            reason,
            paidAmount: plan.paidAmount,
            remainingAmount: plan.remainingAmount,
        });
        return plan;
    }
    /**
     * Get installment plan by ID
     */
    async getInstallmentPlanById(id) {
        const plan = await this.installmentPlanRepository.findOne({
            where: { id },
            relations: ['payments'],
        });
        if (!plan) {
            throw new Error('Installment plan not found');
        }
        return plan;
    }
    /**
     * Get installment plans for organization
     */
    async getInstallmentPlans(organizationId, filters) {
        const whereClause = { organizationId };
        if (filters) {
            if (filters.status)
                whereClause.status = filters.status;
            if (filters.invoiceId)
                whereClause.invoiceId = filters.invoiceId;
        }
        return this.installmentPlanRepository.find({
            where: whereClause,
            order: {
                createdAt: 'DESC',
            },
        });
    }
    /**
     * Private helper methods
     */
    validateInstallmentPlanData(planData) {
        if (!planData.totalAmount || planData.totalAmount <= 0) {
            throw new Error('Total amount must be greater than zero');
        }
        if (!planData.numberOfInstallments || planData.numberOfInstallments <= 0) {
            throw new Error('Number of installments must be greater than zero');
        }
        if (planData.downPaymentAmount && planData.downPaymentAmount < 0) {
            throw new Error('Down payment amount cannot be negative');
        }
        if (planData.downPaymentAmount && planData.downPaymentAmount >= planData.totalAmount) {
            throw new Error('Down payment amount cannot be greater than or equal to total amount');
        }
        if (!planData.startDate) {
            throw new Error('Start date is required');
        }
        if (planData.frequency === installment_plan_entity_1.InstallmentFrequency.CUSTOM && !planData.customFrequencyDays) {
            throw new Error('Custom frequency days is required for custom frequency');
        }
    }
    calculateNextDueDate(currentDate, frequency, customDays) {
        const nextDate = new Date(currentDate);
        switch (frequency) {
            case installment_plan_entity_1.InstallmentFrequency.WEEKLY:
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case installment_plan_entity_1.InstallmentFrequency.BI_WEEKLY:
                nextDate.setDate(nextDate.getDate() + 14);
                break;
            case installment_plan_entity_1.InstallmentFrequency.MONTHLY:
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case installment_plan_entity_1.InstallmentFrequency.QUARTERLY:
                nextDate.setMonth(nextDate.getMonth() + 3);
                break;
            case installment_plan_entity_1.InstallmentFrequency.CUSTOM:
                if (customDays) {
                    nextDate.setDate(nextDate.getDate() + customDays);
                }
                else {
                    nextDate.setMonth(nextDate.getMonth() + 1); // Default to monthly if custom days not specified
                }
                break;
        }
        return nextDate;
    }
};
exports.InstallmentService = InstallmentService;
exports.InstallmentService = InstallmentService = InstallmentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(installment_plan_entity_1.InstallmentPlan)),
    __param(1, (0, typeorm_1.InjectRepository)(installment_payment_entity_1.InstallmentPayment)),
    __param(2, (0, typeorm_1.InjectRepository)(invoice_entity_1.Invoice)),
    __param(3, (0, typeorm_1.InjectRepository)(payment_transaction_entity_1.PaymentTransaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, typeof (_a = typeof event_emitter_1.EventEmitter2 !== "undefined" && event_emitter_1.EventEmitter2) === "function" ? _a : Object])
], InstallmentService);
//# sourceMappingURL=installment.service.js.map