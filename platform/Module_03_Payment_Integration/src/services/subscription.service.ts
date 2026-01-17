import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { RecurringSubscription, SubscriptionStatus, SubscriptionBillingFrequency } from '../entities/recurring-subscription.entity';
import { SubscriptionPayment, SubscriptionPaymentStatus } from '../entities/subscription-payment.entity';
import { Invoice } from '../../../invoices/entities/invoice.entity';
import { PaymentTransaction } from '../../entities/payment-transaction.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(RecurringSubscription)
    private readonly subscriptionRepository: Repository<RecurringSubscription>,
    @InjectRepository(SubscriptionPayment)
    private readonly subscriptionPaymentRepository: Repository<SubscriptionPayment>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepository: Repository<PaymentTransaction>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new subscription
   */
  async createSubscription(
    organizationId: string,
    subscriptionData: Partial<RecurringSubscription>,
  ): Promise<RecurringSubscription> {
    // Validate subscription data
    this.validateSubscriptionData(subscriptionData);

    // Create the subscription
    const subscription = this.subscriptionRepository.create({
      ...subscriptionData,
      organizationId,
      nextBillingDate: subscriptionData.startDate,
      status: subscriptionData.trialEndDate && new Date(subscriptionData.trialEndDate) > new Date() 
        ? SubscriptionStatus.TRIAL 
        : SubscriptionStatus.ACTIVE,
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
  async generateNextBillingCycle(
    subscriptionId: string,
  ): Promise<SubscriptionPayment> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE && 
        subscription.status !== SubscriptionStatus.TRIAL) {
      throw new Error('Cannot generate billing cycle for inactive subscription');
    }

    // Check if max billing cycles reached
    if (subscription.maxBillingCycles && 
        subscription.completedBillingCycles >= subscription.maxBillingCycles) {
      subscription.status = SubscriptionStatus.EXPIRED;
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
      status: SubscriptionPaymentStatus.SCHEDULED,
      currencyCode: subscription.currencyCode,
    });

    const savedPayment = await this.subscriptionPaymentRepository.save(payment);

    // Update subscription
    subscription.lastBillingDate = subscription.nextBillingDate;
    subscription.nextBillingDate = this.calculateNextBillingDate(
      subscription.nextBillingDate || new Date(),
      subscription.billingFrequency,
      subscription.customFrequencyDays,
    );
    
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
  async processSubscriptionPayment(
    paymentId: string,
    transactionId: string,
    amount: number,
  ): Promise<SubscriptionPayment> {
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
    payment.status = SubscriptionPaymentStatus.PAID;
    
    await this.subscriptionPaymentRepository.save(payment);

    // Update subscription
    const subscription = payment.subscription;
    subscription.completedBillingCycles += 1;
    
    // If subscription was past due, restore to active
    if (subscription.status === SubscriptionStatus.PAST_DUE || 
        subscription.status === SubscriptionStatus.UNPAID) {
      subscription.status = SubscriptionStatus.ACTIVE;
    }
    
    // If this was a trial payment, move to active
    if (subscription.status === SubscriptionStatus.TRIAL) {
      subscription.status = SubscriptionStatus.ACTIVE;
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
  async createInvoiceForSubscriptionPayment(
    paymentId: string,
  ): Promise<Invoice> {
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
  async cancelSubscription(
    subscriptionId: string,
    reason: string,
  ): Promise<RecurringSubscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Update subscription status
    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.metadata = {
      ...subscription.metadata,
      cancellationReason: reason,
      cancelledAt: new Date(),
    };
    
    await this.subscriptionRepository.save(subscription);

    // Cancel any scheduled payments
    await this.subscriptionPaymentRepository.update(
      {
        subscriptionId,
        status: SubscriptionPaymentStatus.SCHEDULED,
      },
      {
        status: SubscriptionPaymentStatus.CANCELLED,
      },
    );

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
  async pauseSubscription(
    subscriptionId: string,
    resumeDate?: Date,
  ): Promise<RecurringSubscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE && 
        subscription.status !== SubscriptionStatus.TRIAL) {
      throw new Error('Only active or trial subscriptions can be paused');
    }

    // Update subscription status
    subscription.status = SubscriptionStatus.PAUSED;
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
  async resumeSubscription(
    subscriptionId: string,
  ): Promise<RecurringSubscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.PAUSED) {
      throw new Error('Only paused subscriptions can be resumed');
    }

    // Update subscription status
    subscription.status = SubscriptionStatus.ACTIVE;
    
    // Recalculate next billing date
    const currentDate = new Date();
    subscription.nextBillingDate = this.calculateNextBillingDate(
      currentDate,
      subscription.billingFrequency,
      subscription.customFrequencyDays,
    );
    
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
  async getUpcomingSubscriptionPayments(
    organizationId: string,
    daysAhead: number = 30,
  ): Promise<SubscriptionPayment[]> {
    const currentDate = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    return this.subscriptionPaymentRepository.find({
      where: {
        subscription: {
          organizationId,
          status: SubscriptionStatus.ACTIVE,
        },
        status: SubscriptionPaymentStatus.SCHEDULED,
        dueDate: Between(currentDate, futureDate),
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
  async getOverdueSubscriptionPayments(
    organizationId: string,
  ): Promise<SubscriptionPayment[]> {
    const currentDate = new Date();
    
    return this.subscriptionPaymentRepository.find({
      where: {
        subscription: {
          organizationId,
          status: In([SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE]),
        },
        status: SubscriptionPaymentStatus.SCHEDULED,
        dueDate: LessThan(currentDate),
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
  async markPaymentAsFailed(
    paymentId: string,
    reason: string,
  ): Promise<SubscriptionPayment> {
    const payment = await this.subscriptionPaymentRepository.findOne({
      where: { id: paymentId },
      relations: ['subscription'],
    });

    if (!payment) {
      throw new Error('Subscription payment not found');
    }

    // Update payment status
    payment.status = SubscriptionPaymentStatus.FAILED;
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
    if (subscription.status === SubscriptionStatus.ACTIVE) {
      subscription.status = SubscriptionStatus.PAST_DUE;
      await this.subscriptionRepository.save(subscription);
    }

    // If max retries reached, mark subscription as unpaid
    if (payment.retryAttempts >= subscription.maxRetryAttempts) {
      subscription.status = SubscriptionStatus.UNPAID;
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
  async retryFailedPayment(
    paymentId: string,
  ): Promise<SubscriptionPayment> {
    const payment = await this.subscriptionPaymentRepository.findOne({
      where: { id: paymentId },
      relations: ['subscription'],
    });

    if (!payment) {
      throw new Error('Subscription payment not found');
    }

    if (payment.status !== SubscriptionPaymentStatus.FAILED) {
      throw new Error('Only failed payments can be retried');
    }

    // Reset payment for retry
    payment.status = SubscriptionPaymentStatus.PENDING;
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

  /**
   * Get subscription by ID
   */
  async getSubscriptionById(id: string): Promise<RecurringSubscriptio
(Content truncated due to size limit. Use line ranges to read in chunks)