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
var SubscriptionService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const recurring_subscription_entity_1 = require("../entities/recurring-subscription.entity");
const subscription_payment_entity_1 = require("../entities/subscription-payment.entity");
const invoice_entity_1 = require("../../../invoices/entities/invoice.entity");
const payment_transaction_entity_1 = require("../../entities/payment-transaction.entity");
const event_emitter_1 = require("@nestjs/event-emitter");
let SubscriptionService = SubscriptionService_1 = class SubscriptionService {
    constructor(subscriptionRepository, subscriptionPaymentRepository, invoiceRepository, transactionRepository, eventEmitter) {
        this.subscriptionRepository = subscriptionRepository;
        this.subscriptionPaymentRepository = subscriptionPaymentRepository;
        this.invoiceRepository = invoiceRepository;
        this.transactionRepository = transactionRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(SubscriptionService_1.name);
    }
    /**
     * Create a new subscription
     */
    async createSubscription(organizationId, subscriptionData) {
        // Validate subscription data
        this.validateSubscriptionData(subscriptionData);
        // Create the subscription
        const subscription = this.subscriptionRepository.create({
            ...subscriptionData,
            organizationId,
            nextBillingDate: subscriptionData.startDate,
            status: subscriptionData.trialEndDate && new Date(subscriptionData.trialEndDate) > new Date()
                ? recurring_subscription_entity_1.SubscriptionStatus.TRIAL
                : recurring_subscription_entity_1.SubscriptionStatus.ACTIVE,
        });
        // Save the subscription
        const savedSubscription = await this.subscriptionRepository.save(subscription);
        // Emit event for subscription creation
        this.eventEmitter.emit('subscription.created', {
            subscriptionId: savedSubscription.id,
            customerId: savedSubscription.customerId,
            amount: savedSubscription.amount,
            billingFrequency: savedSubscription.billingFrequency,
            startDate: savedSubscription.startDate,
        });
        return savedSubscription;
    }
    /**
     * Generate next billing cycle
     */
    async generateNextBillingCycle(subscriptionId) {
        const subscription = await this.subscriptionRepository.findOne({
            where: { id: subscriptionId },
        });
        if (!subscription) {
            throw new Error('Subscription not found');
        }
        if (subscription.status !== recurring_subscription_entity_1.SubscriptionStatus.ACTIVE &&
            subscription.status !== recurring_subscription_entity_1.SubscriptionStatus.TRIAL) {
            throw new Error('Cannot generate billing cycle for inactive subscription');
        }
        // Check if max billing cycles reached
        if (subscription.maxBillingCycles &&
            subscription.completedBillingCycles >= subscription.maxBillingCycles) {
            subscription.status = recurring_subscription_entity_1.SubscriptionStatus.EXPIRED;
            await this.subscriptionRepository.save(subscription);
            throw new Error('Maximum billing cycles reached');
        }
        // Calculate next billing cycle number
        const nextBillingCycle = subscription.completedBillingCycles + 1;
        // Create subscription payment
        const payment = this.subscriptionPaymentRepository.create({
            subscriptionId: subscription.id,
            billingCycle: nextBillingCycle,
            amount: subscription.amount,
            dueDate: subscription.nextBillingDate || new Date(),
            status: subscription_payment_entity_1.SubscriptionPaymentStatus.SCHEDULED,
            currencyCode: subscription.currencyCode,
        });
        const savedPayment = await this.subscriptionPaymentRepository.save(payment);
        // Update subscription
        subscription.lastBillingDate = subscription.nextBillingDate;
        subscription.nextBillingDate = this.calculateNextBillingDate(subscription.nextBillingDate || new Date(), subscription.billingFrequency, subscription.customFrequencyDays);
        await this.subscriptionRepository.save(subscription);
        // Emit event for billing cycle generation
        this.eventEmitter.emit('subscription.billing_cycle_generated', {
            subscriptionId: subscription.id,
            paymentId: savedPayment.id,
            billingCycle: nextBillingCycle,
            amount: subscription.amount,
            dueDate: savedPayment.dueDate,
        });
        return savedPayment;
    }
    /**
     * Process subscription payment
     */
    async processSubscriptionPayment(paymentId, transactionId, amount) {
        const payment = await this.subscriptionPaymentRepository.findOne({
            where: { id: paymentId },
            relations: ['subscription'],
        });
        if (!payment) {
            throw new Error('Subscription payment not found');
        }
        const transaction = await this.transactionRepository.findOne({
            where: { id: transactionId },
        });
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        // Update payment
        payment.paidAmount = amount;
        payment.paidDate = new Date();
        payment.transactionId = transactionId;
        payment.status = subscription_payment_entity_1.SubscriptionPaymentStatus.PAID;
        await this.subscriptionPaymentRepository.save(payment);
        // Update subscription
        const subscription = payment.subscription;
        subscription.completedBillingCycles += 1;
        // If subscription was past due, restore to active
        if (subscription.status === recurring_subscription_entity_1.SubscriptionStatus.PAST_DUE ||
            subscription.status === recurring_subscription_entity_1.SubscriptionStatus.UNPAID) {
            subscription.status = recurring_subscription_entity_1.SubscriptionStatus.ACTIVE;
        }
        // If this was a trial payment, move to active
        if (subscription.status === recurring_subscription_entity_1.SubscriptionStatus.TRIAL) {
            subscription.status = recurring_subscription_entity_1.SubscriptionStatus.ACTIVE;
        }
        await this.subscriptionRepository.save(subscription);
        // Emit event for payment processing
        this.eventEmitter.emit('subscription.payment_processed', {
            subscriptionId: subscription.id,
            paymentId: payment.id,
            transactionId,
            amount,
            billingCycle: payment.billingCycle,
        });
        return payment;
    }
    /**
     * Create invoice for subscription payment
     */
    async createInvoiceForSubscriptionPayment(paymentId) {
        const payment = await this.subscriptionPaymentRepository.findOne({
            where: { id: paymentId },
            relations: ['subscription'],
        });
        if (!payment) {
            throw new Error('Subscription payment not found');
        }
        const subscription = payment.subscription;
        // Create invoice
        const invoice = this.invoiceRepository.create({
            organizationId: subscription.organizationId,
            customerId: subscription.customerId,
            customerName: subscription.customerName,
            customerEmail: subscription.customerEmail,
            totalAmount: payment.amount,
            amountDue: payment.amount,
            currency: subscription.currencyCode,
            dueDate: payment.dueDate,
            issueDate: new Date(),
            status: 'unpaid',
            items: [
                {
                    description: `Subscription: ${subscription.name} - Billing Cycle ${payment.billingCycle}`,
                    quantity: 1,
                    unitPrice: payment.amount,
                    amount: payment.amount,
                },
            ],
            metadata: {
                subscriptionId: subscription.id,
                subscriptionPaymentId: payment.id,
                billingCycle: payment.billingCycle,
            },
        });
        const savedInvoice = await this.invoiceRepository.save(invoice);
        // Link invoice to subscription payment
        payment.invoiceId = savedInvoice.id;
        await this.subscriptionPaymentRepository.save(payment);
        // Emit event for invoice creation
        this.eventEmitter.emit('subscription.invoice_created', {
            subscriptionId: subscription.id,
            paymentId: payment.id,
            invoiceId: savedInvoice.id,
            amount: payment.amount,
        });
        return savedInvoice;
    }
    /**
     * Cancel subscription
     */
    async cancelSubscription(subscriptionId, reason) {
        const subscription = await this.subscriptionRepository.findOne({
            where: { id: subscriptionId },
        });
        if (!subscription) {
            throw new Error('Subscription not found');
        }
        // Update subscription status
        subscription.status = recurring_subscription_entity_1.SubscriptionStatus.CANCELLED;
        subscription.metadata = {
            ...subscription.metadata,
            cancellationReason: reason,
            cancelledAt: new Date(),
        };
        await this.subscriptionRepository.save(subscription);
        // Cancel any scheduled payments
        await this.subscriptionPaymentRepository.update({
            subscriptionId,
            status: subscription_payment_entity_1.SubscriptionPaymentStatus.SCHEDULED,
        }, {
            status: subscription_payment_entity_1.SubscriptionPaymentStatus.CANCELLED,
        });
        // Emit event for subscription cancellation
        this.eventEmitter.emit('subscription.cancelled', {
            subscriptionId,
            reason,
            completedBillingCycles: subscription.completedBillingCycles,
        });
        return subscription;
    }
    /**
     * Pause subscription
     */
    async pauseSubscription(subscriptionId, resumeDate) {
        const subscription = await this.subscriptionRepository.findOne({
            where: { id: subscriptionId },
        });
        if (!subscription) {
            throw new Error('Subscription not found');
        }
        if (subscription.status !== recurring_subscription_entity_1.SubscriptionStatus.ACTIVE &&
            subscription.status !== recurring_subscription_entity_1.SubscriptionStatus.TRIAL) {
            throw new Error('Only active or trial subscriptions can be paused');
        }
        // Update subscription status
        subscription.status = recurring_subscription_entity_1.SubscriptionStatus.PAUSED;
        subscription.metadata = {
            ...subscription.metadata,
            pausedAt: new Date(),
            scheduledResumeDate: resumeDate,
        };
        await this.subscriptionRepository.save(subscription);
        // Emit event for subscription pause
        this.eventEmitter.emit('subscription.paused', {
            subscriptionId,
            pausedAt: new Date(),
            scheduledResumeDate: resumeDate,
        });
        return subscription;
    }
    /**
     * Resume subscription
     */
    async resumeSubscription(subscriptionId) {
        const subscription = await this.subscriptionRepository.findOne({
            where: { id: subscriptionId },
        });
        if (!subscription) {
            throw new Error('Subscription not found');
        }
        if (subscription.status !== recurring_subscription_entity_1.SubscriptionStatus.PAUSED) {
            throw new Error('Only paused subscriptions can be resumed');
        }
        // Update subscription status
        subscription.status = recurring_subscription_entity_1.SubscriptionStatus.ACTIVE;
        // Recalculate next billing date
        const currentDate = new Date();
        subscription.nextBillingDate = this.calculateNextBillingDate(currentDate, subscription.billingFrequency, subscription.customFrequencyDays);
        await this.subscriptionRepository.save(subscription);
        // Emit event for subscription resume
        this.eventEmitter.emit('subscription.resumed', {
            subscriptionId,
            resumedAt: new Date(),
            nextBillingDate: subscription.nextBillingDate,
        });
        return subscription;
    }
    /**
     * Get upcoming subscription payments
     */
    async getUpcomingSubscriptionPayments(organizationId, daysAhead = 30) {
        const currentDate = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);
        return this.subscriptionPaymentRepository.find({
            where: {
                subscription: {
                    organizationId,
                    status: recurring_subscription_entity_1.SubscriptionStatus.ACTIVE,
                },
                status: subscription_payment_entity_1.SubscriptionPaymentStatus.SCHEDULED,
                dueDate: (0, typeorm_2.Between)(currentDate, futureDate),
            },
            relations: ['subscription'],
            order: {
                dueDate: 'ASC',
            },
        });
    }
    /**
     * Get overdue subscription payments
     */
    async getOverdueSubscriptionPayments(organizationId) {
        const currentDate = new Date();
        return this.subscriptionPaymentRepository.find({
            where: {
                subscription: {
                    organizationId,
                    status: In([recurring_subscription_entity_1.SubscriptionStatus.ACTIVE, recurring_subscription_entity_1.SubscriptionStatus.PAST_DUE]),
                },
                status: subscription_payment_entity_1.SubscriptionPaymentStatus.SCHEDULED,
                dueDate: (0, typeorm_2.LessThan)(currentDate),
            },
            relations: ['subscription'],
            order: {
                dueDate: 'ASC',
            },
        });
    }
    /**
     * Mark subscription payment as failed
     */
    async markPaymentAsFailed(paymentId, reason) {
        const payment = await this.subscriptionPaymentRepository.findOne({
            where: { id: paymentId },
            relations: ['subscription'],
        });
        if (!payment) {
            throw new Error('Subscription payment not found');
        }
        // Update payment status
        payment.status = subscription_payment_entity_1.SubscriptionPaymentStatus.FAILED;
        payment.retryAttempts += 1;
        payment.lastRetryDate = new Date();
        payment.metadata = {
            ...payment.metadata,
            failureReason: reason,
            failedAt: new Date(),
        };
        // Calculate next retry date if within max attempts
        const subscription = payment.subscription;
        if (payment.retryAttempts < subscription.maxRetryAttempts) {
            // Exponential backoff for retry (1 day, 3 days, 7 days)
            const retryDays = Math.pow(2, payment.retryAttempts) - 1;
            const nextRetryDate = new Date();
            nextRetryDate.setDate(nextRetryDate.getDate() + retryDays);
            payment.nextRetryDate = nextRetryDate;
        }
        await this.subscriptionPaymentRepository.save(payment);
        // Update subscription status if needed
        if (subscription.status === recurring_subscription_entity_1.SubscriptionStatus.ACTIVE) {
            subscription.status = recurring_subscription_entity_1.SubscriptionStatus.PAST_DUE;
            await this.subscriptionRepository.save(subscription);
        }
        // If max retries reached, mark subscription as unpaid
        if (payment.retryAttempts >= subscription.maxRetryAttempts) {
            subscription.status = recurring_subscription_entity_1.SubscriptionStatus.UNPAID;
            await this.subscriptionRepository.save(subscription);
            // Emit event for max retries reached
            this.eventEmitter.emit('subscription.max_retries_reached', {
                subscriptionId: subscription.id,
                paymentId: payment.id,
                retryAttempts: payment.retryAttempts,
            });
        }
        // Emit event for payment failure
        this.eventEmitter.emit('subscription.payment_failed', {
            subscriptionId: subscription.id,
            paymentId: payment.id,
            reason,
            retryAttempts: payment.retryAttempts,
            nextRetryDate: payment.nextRetryDate,
        });
        return payment;
    }
    /**
     * Retry failed payment
     */
    async retryFailedPayment(paymentId) {
        const payment = await this.subscriptionPaymentRepository.findOne({
            where: { id: paymentId },
            relations: ['subscription'],
        });
        if (!payment) {
            throw new Error('Subscription payment not found');
        }
        if (payment.status !== subscription_payment_entity_1.SubscriptionPaymentStatus.FAILED) {
            throw new Error('Only failed payments can be retried');
        }
        // Reset payment for retry
        payment.status = subscription_payment_entity_1.SubscriptionPaymentStatus.PENDING;
        payment.lastRetryDate = new Date();
        payment.retryAttempts += 1;
        await this.subscriptionPaymentRepository.save(payment);
        // Emit event for payment retry
        this.eventEmitter.emit('subscription.payment_retry', {
            subscriptionId: payment.subscription.id,
            paymentId: payment.id,
            retryAttempts: payment.retryAttempts,
        });
        return payment;
    }
};
exports.SubscriptionService = SubscriptionService;
exports.SubscriptionService = SubscriptionService = SubscriptionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(recurring_subscription_entity_1.RecurringSubscription)),
    __param(1, (0, typeorm_1.InjectRepository)(subscription_payment_entity_1.SubscriptionPayment)),
    __param(2, (0, typeorm_1.InjectRepository)(invoice_entity_1.Invoice)),
    __param(3, (0, typeorm_1.InjectRepository)(payment_transaction_entity_1.PaymentTransaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, typeof (_a = typeof event_emitter_1.EventEmitter2 !== "undefined" && event_emitter_1.EventEmitter2) === "function" ? _a : Object])
], SubscriptionService);
(Content);
truncated;
due;
to;
size;
limit.Use;
line;
ranges;
to;
read in chunks;
//# sourceMappingURL=subscription.service.js.map