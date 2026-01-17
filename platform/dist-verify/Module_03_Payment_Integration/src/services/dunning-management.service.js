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
var DunningManagementService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DunningManagementService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const installment_payment_entity_1 = require("../entities/installment-payment.entity");
const installment_plan_entity_1 = require("../entities/installment-plan.entity");
const subscription_payment_entity_1 = require("../entities/subscription-payment.entity");
const recurring_subscription_entity_1 = require("../entities/recurring-subscription.entity");
const event_emitter_1 = require("@nestjs/event-emitter");
const schedule_1 = require("@nestjs/schedule");
let DunningManagementService = DunningManagementService_1 = class DunningManagementService {
    constructor(installmentPaymentRepository, installmentPlanRepository, subscriptionPaymentRepository, subscriptionRepository, eventEmitter, schedulerRegistry) {
        this.installmentPaymentRepository = installmentPaymentRepository;
        this.installmentPlanRepository = installmentPlanRepository;
        this.subscriptionPaymentRepository = subscriptionPaymentRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.eventEmitter = eventEmitter;
        this.schedulerRegistry = schedulerRegistry;
        this.logger = new common_1.Logger(DunningManagementService_1.name);
    }
    /**
     * Process dunning for overdue installment payments
     */
    async processInstallmentDunning(organizationId) {
        const currentDate = new Date();
        // Find overdue installment payments
        const overduePayments = await this.installmentPaymentRepository.find({
            where: {
                installmentPlan: {
                    organizationId,
                    status: installment_plan_entity_1.InstallmentPlanStatus.ACTIVE,
                },
                status: (0, typeorm_2.In)([installment_payment_entity_1.InstallmentPaymentStatus.SCHEDULED, installment_payment_entity_1.InstallmentPaymentStatus.OVERDUE]),
                dueDate: (0, typeorm_2.LessThan)(currentDate),
            },
            relations: ['installmentPlan'],
        });
        let processed = 0;
        let reminded = 0;
        let escalated = 0;
        for (const payment of overduePayments) {
            processed++;
            try {
                // Calculate days overdue
                const daysOverdue = Math.floor((currentDate.getTime() - payment.dueDate.getTime()) / (1000 * 60 * 60 * 24));
                // Mark as overdue if not already
                if (payment.status === installment_payment_entity_1.InstallmentPaymentStatus.SCHEDULED) {
                    payment.status = installment_payment_entity_1.InstallmentPaymentStatus.OVERDUE;
                    // Calculate late fee if applicable
                    const plan = payment.installmentPlan;
                    let lateFeeAmount = 0;
                    if (plan.latePaymentFeePercentage > 0) {
                        lateFeeAmount += (payment.amount * plan.latePaymentFeePercentage) / 100;
                    }
                    if (plan.latePaymentFeeFixed > 0) {
                        lateFeeAmount += plan.latePaymentFeeFixed;
                    }
                    payment.lateFeeAmount = lateFeeAmount;
                    payment.remainingAmount = payment.amount + lateFeeAmount;
                    await this.installmentPaymentRepository.save(payment);
                    // Emit event for overdue installment
                    this.eventEmitter.emit('dunning.installment_overdue', {
                        planId: plan.id,
                        installmentId: payment.id,
                        daysOverdue,
                        lateFeeAmount,
                    });
                }
                // Determine dunning action based on days overdue and reminder count
                const dunningAction = this.determineInstallmentDunningAction(daysOverdue, payment.remindersSent);
                if (dunningAction.sendReminder) {
                    // Send reminder
                    payment.remindersSent += 1;
                    payment.reminderSentDate = currentDate;
                    await this.installmentPaymentRepository.save(payment);
                    // Emit event for reminder
                    this.eventEmitter.emit('dunning.installment_reminder', {
                        planId: payment.installmentPlan.id,
                        installmentId: payment.id,
                        reminderLevel: payment.remindersSent,
                        daysOverdue,
                        message: dunningAction.message,
                    });
                    reminded++;
                }
                if (dunningAction.escalate) {
                    // Escalate
                    this.eventEmitter.emit('dunning.installment_escalated', {
                        planId: payment.installmentPlan.id,
                        installmentId: payment.id,
                        daysOverdue,
                        remindersSent: payment.remindersSent,
                    });
                    escalated++;
                }
                // Check if payment should be marked as defaulted
                if (dunningAction.markAsDefaulted) {
                    payment.status = installment_payment_entity_1.InstallmentPaymentStatus.DEFAULTED;
                    await this.installmentPaymentRepository.save(payment);
                    // Check if plan should be marked as defaulted
                    const remainingPayments = await this.installmentPaymentRepository.count({
                        where: {
                            installmentPlanId: payment.installmentPlan.id,
                            status: (0, typeorm_2.In)([installment_payment_entity_1.InstallmentPaymentStatus.SCHEDULED, installment_payment_entity_1.InstallmentPaymentStatus.OVERDUE]),
                        },
                    });
                    if (remainingPayments === 0) {
                        payment.installmentPlan.status = installment_plan_entity_1.InstallmentPlanStatus.DEFAULTED;
                        await this.installmentPlanRepository.save(payment.installmentPlan);
                        // Emit event for defaulted plan
                        this.eventEmitter.emit('dunning.installment_plan_defaulted', {
                            planId: payment.installmentPlan.id,
                        });
                    }
                    // Emit event for defaulted payment
                    this.eventEmitter.emit('dunning.installment_defaulted', {
                        planId: payment.installmentPlan.id,
                        installmentId: payment.id,
                        daysOverdue,
                    });
                }
            }
            catch (error) {
                this.logger.error(`Error processing dunning for installment ${payment.id}: ${error.message}`, error.stack);
            }
        }
        return { processed, reminded, escalated };
    }
    /**
     * Process dunning for subscription payments
     */
    async processSubscriptionDunning(organizationId) {
        const currentDate = new Date();
        // Find overdue subscription payments
        const overduePayments = await this.subscriptionPaymentRepository.find({
            where: {
                subscription: {
                    organizationId,
                    status: (0, typeorm_2.In)([recurring_subscription_entity_1.SubscriptionStatus.ACTIVE, recurring_subscription_entity_1.SubscriptionStatus.PAST_DUE]),
                },
                status: (0, typeorm_2.In)([subscription_payment_entity_1.SubscriptionPaymentStatus.SCHEDULED, subscription_payment_entity_1.SubscriptionPaymentStatus.FAILED]),
                dueDate: (0, typeorm_2.LessThan)(currentDate),
            },
            relations: ['subscription'],
        });
        let processed = 0;
        let reminded = 0;
        let retried = 0;
        for (const payment of overduePayments) {
            processed++;
            try {
                // Calculate days overdue
                const daysOverdue = Math.floor((currentDate.getTime() - payment.dueDate.getTime()) / (1000 * 60 * 60 * 24));
                // Handle failed payments due for retry
                if (payment.status === subscription_payment_entity_1.SubscriptionPaymentStatus.FAILED &&
                    payment.nextRetryDate &&
                    payment.nextRetryDate <= currentDate) {
                    // Retry payment
                    payment.status = subscription_payment_entity_1.SubscriptionPaymentStatus.PENDING;
                    payment.lastRetryDate = currentDate;
                    await this.subscriptionPaymentRepository.save(payment);
                    // Emit event for payment retry
                    this.eventEmitter.emit('dunning.subscription_payment_retry', {
                        subscriptionId: payment.subscription.id,
                        paymentId: payment.id,
                        retryAttempts: payment.retryAttempts,
                    });
                    retried++;
                    continue;
                }
                // Handle overdue scheduled payments
                if (payment.status === subscription_payment_entity_1.SubscriptionPaymentStatus.SCHEDULED) {
                    // Mark subscription as past due if not already
                    if (payment.subscription.status === recurring_subscription_entity_1.SubscriptionStatus.ACTIVE) {
                        payment.subscription.status = recurring_subscription_entity_1.SubscriptionStatus.PAST_DUE;
                        await this.subscriptionRepository.save(payment.subscription);
                        // Emit event for past due subscription
                        this.eventEmitter.emit('dunning.subscription_past_due', {
                            subscriptionId: payment.subscription.id,
                            paymentId: payment.id,
                            daysOverdue,
                        });
                    }
                    // Determine dunning action
                    const dunningAction = this.determineSubscriptionDunningAction(daysOverdue, payment.remindersSent, payment.subscription.maxRetryAttempts);
                    if (dunningAction.sendReminder) {
                        // Send reminder
                        payment.remindersSent += 1;
                        payment.reminderSentDate = currentDate;
                        await this.subscriptionPaymentRepository.save(payment);
                        // Emit event for reminder
                        this.eventEmitter.emit('dunning.subscription_reminder', {
                            subscriptionId: payment.subscription.id,
                            paymentId: payment.id,
                            reminderLevel: payment.remindersSent,
                            daysOverdue,
                            message: dunningAction.message,
                        });
                        reminded++;
                    }
                    // Check if subscription should be marked as unpaid
                    if (dunningAction.markAsUnpaid) {
                        payment.subscription.status = recurring_subscription_entity_1.SubscriptionStatus.UNPAID;
                        await this.subscriptionRepository.save(payment.subscription);
                        // Emit event for unpaid subscription
                        this.eventEmitter.emit('dunning.subscription_unpaid', {
                            subscriptionId: payment.subscription.id,
                            paymentId: payment.id,
                            daysOverdue,
                        });
                    }
                }
            }
            catch (error) {
                this.logger.error(`Error processing dunning for subscription payment ${payment.id}: ${error.message}`, error.stack);
            }
        }
        return { processed, reminded, retried };
    }
    /**
     * Schedule automatic payment retry
     */
    async schedulePaymentRetry(paymentId, paymentType, retryDate) {
        const jobName = `retry_${paymentType}_${paymentId}`;
        // Create timeout for retry
        const timeout = setTimeout(async () => {
            try {
                if (paymentType === 'installment') {
                    // Retry installment payment
                    this.eventEmitter.emit('dunning.retry_installment_payment', {
                        installmentId: paymentId,
                    });
                }
                else {
                    // Retry subscription payment
                    this.eventEmitter.emit('dunning.retry_subscription_payment', {
                        paymentId,
                    });
                }
            }
            catch (error) {
                this.logger.error(`Error in scheduled payment retry for ${paymentId}: ${error.message}`, error.stack);
            }
        }, retryDate.getTime() - Date.now());
        // Register the timeout with the scheduler
        this.schedulerRegistry.addTimeout(jobName, timeout);
        this.logger.log(`Scheduled payment retry for ${paymentType} ${paymentId} at ${retryDate}`);
    }
    /**
     * Send payment reminder
     */
    async sendPaymentReminder(paymentId, paymentType, reminderLevel) {
        try {
            if (paymentType === 'installment') {
                const payment = await this.installmentPaymentRepository.findOne({
                    where: { id: paymentId },
                    relations: ['installmentPlan'],
                });
                if (!payment) {
                    throw new Error('Installment payment not found');
                }
                // Emit event for reminder
                this.eventEmitter.emit('notification.send_installment_reminder', {
                    installmentId: payment.id,
                    planId: payment.installmentPlan.id,
                    reminderLevel,
                    amount: payment.amount + payment.lateFeeAmount,
                    dueDate: payment.dueDate,
                });
            }
            else {
                const payment = await this.subscriptionPaymentRepository.findOne({
                    where: { id: paymentId },
                    relations: ['subscription'],
                });
                if (!payment) {
                    throw new Error('Subscription payment not found');
                }
                // Emit event for reminder
                this.eventEmitter.emit('notification.send_subscription_reminder', {
                    paymentId: payment.id,
                    subscriptionId: payment.subscription.id,
                    reminderLevel,
                    amount: payment.amount + payment.lateFeeAmount,
                    dueDate: payment.dueDate,
                });
            }
        }
        catch (error) {
            this.logger.error(`Error sending payment reminder for ${paymentId}: ${error.message}`, error.stack);
        }
    }
    /**
     * Private helper methods
     */
    determineInstallmentDunningAction(daysOverdue, remindersSent) {
        // Default response
        const result = {
            sendReminder: false,
            escalate: false,
            markAsDefaulted: false,
            message: '',
        };
        // Dunning strategy based on days overdue and previous reminders
        if (daysOverdue >= 90) {
            // 90+ days overdue - mark as defaulted
            result.markAsDefaulted = true;
            result.escalate = true;
            result.message = 'Your installment payment is severely overdue. Please contact us immediately.';
        }
        else if (daysOverdue >= 60 && remindersSent < 4) {
            // 60-89 days overdue - final notice
            result.sendReminder = true;
            result.escalate = true;
            result.message = 'FINAL NOTICE: Your installment payment is seriously overdue. Immediate action required.';
        }
        else if (daysOverdue >= 30 && remindersSent < 3) {
            // 30-59 days overdue - urgent reminder
            result.sendReminder = true;
            result.message = 'URGENT: Your installment payment is significantly overdue. Please make payment immediately.';
        }
        else if (daysOverdue >= 15 && remindersSent < 2) {
            // 15-29 days overdue - second reminder
            result.sendReminder = true;
            result.message = 'REMINDER: Your installment payment is overdue. Please make payment as soon as possible.';
        }
        else if (daysOverdue >= 3 && remindersSent < 1) {
            // 3-14 days overdue - first reminder
            result.sendReminder = true;
            result.message = 'Your installment payment is now overdue. Please make payment at your earliest convenience.';
        }
        return result;
    }
    determineSubscriptionDunningAction(daysOverdue, remindersSent, maxRetryAttempts) {
        // Default response
        const result = {
            sendReminder: false,
            markAsUnpaid: false,
            message: '',
        };
        // Dunning strategy based on days overdue and previous reminders
        if (daysOverdue >= 30) {
            // 30+ days overdue - mark as unpaid
            result.markAsUnpaid = true;
            result.message = 'Your subscription payment is severely overdue. Your subscription has been suspended.';
        }
        else if (daysOverdue >= 21 && remindersSent < 4) {
            // 21-29 days overdue - final notice
            result.sendReminder = true;
            result.message = 'FINAL NOTICE: Your subscription payment is seriously overdue. Your service may be suspended.';
        }
        else if (daysOverdue >= 14 && remindersSent < 3) {
            // 14-20 days overdue - urgent reminder
            result.sendReminder = true;
            result.message = 'URGENT: Your subscription payment is significantly overdue. Please make payment immediately.';
        }
        else if (daysOverdue >= 7 && remin(Content, truncated, due, to, size, limit.Use, line, ranges, to, read in chunks))
            ;
    }
};
exports.DunningManagementService = DunningManagementService;
exports.DunningManagementService = DunningManagementService = DunningManagementService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(installment_payment_entity_1.InstallmentPayment)),
    __param(1, (0, typeorm_1.InjectRepository)(installment_plan_entity_1.InstallmentPlan)),
    __param(2, (0, typeorm_1.InjectRepository)(subscription_payment_entity_1.SubscriptionPayment)),
    __param(3, (0, typeorm_1.InjectRepository)(recurring_subscription_entity_1.RecurringSubscription)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, typeof (_a = typeof event_emitter_1.EventEmitter2 !== "undefined" && event_emitter_1.EventEmitter2) === "function" ? _a : Object, typeof (_b = typeof schedule_1.SchedulerRegistry !== "undefined" && schedule_1.SchedulerRegistry) === "function" ? _b : Object])
], DunningManagementService);
//# sourceMappingURL=dunning-management.service.js.map