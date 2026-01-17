import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FinancialInsight } from '../entities/financial-insight.entity';
import { Invoice } from '../../../invoices/entities/invoice.entity';
import { PaymentTransaction } from '../../entities/payment-transaction.entity';
import { FinancingRequest } from '../../financing/entities/financing-request.entity';
import { Organization } from '../../../organizations/entities/organization.entity';

/**
 * Service for generating real-time financial intelligence
 */
@Injectable()
export class FinancialIntelligenceService {
  private readonly logger = new Logger(FinancialIntelligenceService.name);

  constructor(
    @InjectRepository(FinancialInsight)
    private readonly insightRepository: Repository<FinancialInsight>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(FinancingRequest)
    private readonly financingRequestRepository: Repository<FinancingRequest>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Subscribe to relevant events
    this.subscribeToEvents();
  }

  /**
   * Subscribe to relevant events from other modules
   */
  private subscribeToEvents(): void {
    // Listen for invoice creation events
    this.eventEmitter.on('invoice.created', (payload) => {
      this.handleInvoiceCreated(payload);
    });

    // Listen for invoice status change events
    this.eventEmitter.on('invoice.status_changed', (payload) => {
      this.handleInvoiceStatusChanged(payload);
    });

    // Listen for payment transaction events
    this.eventEmitter.on('payment.transaction_completed', (payload) => {
      this.handlePaymentTransactionCompleted(payload);
    });

    // Listen for financing events
    this.eventEmitter.on('financing.request_created', (payload) => {
      this.handleFinancingRequestCreated(payload);
    });

    this.eventEmitter.on('financing.disbursed', (payload) => {
      this.handleFinancingDisbursed(payload);
    });
  }

  /**
   * Handle invoice created event
   */
  private async handleInvoiceCreated(payload: any): Promise<void> {
    try {
      const { invoiceId, organizationId, amount } = payload;
      
      this.logger.log(`Processing invoice creation for insights: ${invoiceId}`);
      
      // Get organization
      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
      });
      
      if (!organization) {
        return;
      }
      
      // Get recent invoices to analyze trends
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentInvoices = await this.invoiceRepository.find({
        where: {
          organizationId,
          createdAt: MoreThan(thirtyDaysAgo),
        },
        order: {
          createdAt: 'DESC',
        },
      });
      
      // Calculate average invoice amount
      const totalAmount = recentInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
      const averageAmount = recentInvoices.length > 0 ? totalAmount / recentInvoices.length : 0;
      
      // Check if this invoice is significantly larger than average
      if (amount > averageAmount * 1.5 && recentInvoices.length >= 5) {
        // Create insight for large invoice
        await this.createInsight(
          organizationId,
          'large_invoice',
          'Large Invoice Detected',
          `Invoice #${invoiceId} is ${Math.round((amount / averageAmount - 1) * 100)}% larger than your 30-day average. Consider offering installment payment options to improve collection likelihood.`,
          {
            invoiceId,
            invoiceAmount: amount,
            averageAmount,
            percentAboveAverage: Math.round((amount / averageAmount - 1) * 100),
          },
          'info',
          'invoice_analysis',
          true,
          'Configure installment payment options for this invoice'
        );
      }
      
      // Check invoice velocity (rate of creation)
      const invoiceVelocity = recentInvoices.length / 30; // invoices per day
      
      // Get historical velocity (from previous 30-60 days)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const previousPeriodInvoices = await this.invoiceRepository.find({
        where: {
          organizationId,
          createdAt: Between(sixtyDaysAgo, thirtyDaysAgo),
        },
      });
      
      const previousVelocity = previousPeriodInvoices.length / 30; // invoices per day
      
      // Check if velocity has changed significantly
      if (recentInvoices.length >= 10 && previousPeriodInvoices.length >= 10) {
        const velocityChange = (invoiceVelocity / previousVelocity - 1) * 100;
        
        if (Math.abs(velocityChange) >= 30) { // 30% change threshold
          const direction = velocityChange > 0 ? 'increased' : 'decreased';
          const actionRecommendation = velocityChange > 0 
            ? 'Consider reviewing your working capital needs to support this growth'
            : 'Review your sales pipeline and customer acquisition strategy';
          
          await this.createInsight(
            organizationId,
            'invoice_velocity_change',
            `Invoice Creation Rate Has ${direction.charAt(0).toUpperCase() + direction.slice(1)}`,
            `Your invoice creation rate has ${direction} by ${Math.abs(Math.round(velocityChange))}% compared to the previous period. ${actionRecommendation}.`,
            {
              currentVelocity: invoiceVelocity,
              previousVelocity,
              percentChange: Math.round(velocityChange),
              direction,
            },
            velocityChange > 0 ? 'info' : 'warning',
            'business_trend',
            true,
            actionRecommendation
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error handling invoice creation for insights: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle invoice status changed event
   */
  private async handleInvoiceStatusChanged(payload: any): Promise<void> {
    try {
      const { invoiceId, organizationId, oldStatus, newStatus } = payload;
      
      this.logger.log(`Processing invoice status change for insights: ${invoiceId} (${oldStatus} -> ${newStatus})`);
      
      // Handle paid status
      if (newStatus === 'paid') {
        // Get the invoice
        const invoice = await this.invoiceRepository.findOne({
          where: { id: invoiceId },
        });
        
        if (!invoice) {
          return;
        }
        
        // Calculate days to payment
        const createdDate = new Date(invoice.createdAt);
        const paidDate = new Date();
        const daysToPayment = Math.round((paidDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Get average days to payment for this customer
        const customerInvoices = await this.invoiceRepository.find({
          where: {
            organizationId,
            customerId: invoice.customerId,
            status: 'paid',
          },
        });
        
        let totalDays = 0;
        let count = 0;
        
        for (const inv of customerInvoices) {
          if (inv.paidDate && inv.createdAt) {
            const days = Math.round((new Date(inv.paidDate).getTime() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            totalDays += days;
            count++;
          }
        }
        
        const averageDaysToPayment = count > 0 ? totalDays / count : 0;
        
        // Create insight if payment was significantly faster or slower
        if (count >= 3 && Math.abs(daysToPayment - averageDaysToPayment) > 5) {
          const direction = daysToPayment < averageDaysToPayment ? 'faster' : 'slower';
          const sentiment = daysToPayment < averageDaysToPayment ? 'positive' : 'warning';
          const dayDifference = Math.abs(Math.round(daysToPayment - averageDaysToPayment));
          
          await this.createInsight(
            organizationId,
            'payment_timing_anomaly',
            `Payment Received ${direction.charAt(0).toUpperCase() + direction.slice(1)} Than Average`,
            `Invoice #${invoice.invoiceNumber} was paid ${dayDifference} days ${direction} than this customer's average. ${direction === 'faster' ? 'Your recent changes may be improving payment behavior.' : 'Consider reviewing your payment terms or follow-up strategy with this customer.'}`,
            {
              invoiceId,
              invoiceNumber: invoice.invoiceNumber,
              customerId: invoice.customerId,
              daysToPayment,
              averageDaysToPayment,
              difference: dayDifference,
              direction,
            },
            sentiment,
            'payment_behavior',
            true,
            direction === 'faster' ? 'Apply similar strategies to other customers' : 'Review payment terms and follow-up strategy'
          );
        }
        
        // Check if this was a large invoice
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentInvoices = await this.invoiceRepository.find({
          where: {
            organizationId,
            createdAt: MoreThan(thirtyDaysAgo),
          },
        });
        
        const totalAmount = recentInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
        const averageAmount = recentInvoices.length > 0 ? totalAmount / recentInvoices.length : 0;
        
        if (Number(invoice.totalAmount) > averageAmount * 2) {
          await this.createInsight(
            organizationId,
            'large_invoice_paid',
            'Large Invoice Payment Received',
            `A large invoice (#${invoice.invoiceNumber}) has been paid, which may significantly impact your cash flow. Consider strategic allocation of these funds.`,
            {
              invoiceId,
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.totalAmount,
              averageInvoiceAmount: averageAmount,
              ratio: Number(invoice.totalAmount) / averageAmount,
            },
            'positive',
            'cash_flow',
            true,
            'Review cash flow forecast and consider strategic allocation'
          );
        }
      }
      
      // Handle overdue status
      if (newStatus === 'overdue') {
        // Get the invoice
        const invoice = await this.invoiceRepository.findOne({
          where: { id: invoiceId },
        });
        
        if (!invoice) {
          return;
        }
        
        // Check customer payment history
        const customerInvoices = await this.invoiceRepository.find({
          where: {
            organizationId,
            customerId: invoice.customerId,
          },
        });
        
        const overdueCount = customerInvoices.filter(inv => inv.status === 'overdue' || inv.status === 'partially_paid').length;
        const totalCount = customerInvoices.length;
        
        // Create insight based on customer history
        if (totalCount >= 3) {
          const overdueRate = overdueCount / totalCount;
          
          if (overdueRate > 0.5) {
            await this.createInsight(
              organizationId,
              'high_risk_customer_overdue',
              'High-Risk Customer Invoice Overdue',
              `Invoice #${invoice.invoiceNumber} for a customer with a history of late payments (${Math.round(overdueRate * 100)}% overdue rate) is now overdue. Consider immediate follow-up and stricter payment terms for future invoices.`,
              {
                invoiceId,
                invoiceNumber: invoice.invoiceNumber,
                customerId: invoice.customerId,
                overdueRate,
                overdueCount,
                totalInvoices: totalCount,
              },
              'warning',
              'payment_risk',
              true,
              'Implement immediate follow-up and review credit terms'
            );
          } else if (overdueRate < 0.2) {
            await this.createInsight(
              organizationId,
              'reliable_customer_overdue',
              'Usually Reliable Customer Invoice Overdue',
              `Invoice #${invoice.invoiceNumber} for a typically reliable customer is now overdue. This is unusual based on their payment history and may indicate a problem.`,
              {
                invoiceId,
                invoiceNumber: invoice.invoiceNumber,
                customerId: invoice.customerId,
                overdueRate,
                overdueCount,
                totalInvoices: totalCount,
              },
              'warning',
              'payment_anomaly',
              true,
              'Contact customer to understand the situation'
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error handling invoice status change for insights: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle payment transaction completed event
   */
  private async handlePaymentTransactionCompleted(payload: any): Promise<void> {
    try {
      const { transactionId, invoiceId, organizationId, amount, paymentMethod } = payload;
      
      this.logger.log(`Processing payment transaction for insights: ${transactionId}`);
      
      if (!invoiceId || !organizationId) {
        return;
      }
      
      // Get recent payment transactions
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentTransactions = await this.paymentTransactionRepository.find({
        where: {
          organizationId,
          createdAt: MoreThan(thirtyDaysAgo),
          status: 'completed',
        },
      });
      
      // Analyze payment method distribution
      const methodCounts: Record<string, number> = {};
      let totalCount = 0;
      
      for (const transaction of recentTransactions) {
        const method = transaction.paymentMethod;
        methodCounts[method] = (methodCounts[method] || 0) + 1;
        totalCount++;
      }
      
      // Check if this payment method is rarely used
      if (totalCount >= 10) {
        const methodPercentage = ((methodCounts[paymentMethod] || 0) / totalCount) * 100;
        
        if (methodPercentage < 10) {
          await this.createInsight(
            organizationId,
            'uncommon_payment_method',
            `Uncommon Payment Method Used: ${paymentMethod}`,
            `A payment was received using ${paymentMethod}, which is only used in ${Math.round(methodPercentage)}% of your transactions. Consider promoting this payment method if it has lower processing fees or better terms.`,
            {
              transactionId,
              invoiceId,
              paymentMethod,
              methodPercentage,
              methodCount: methodCounts[paymentMethod] || 1,
              totalTransactions: totalCount,
            },
            'info',
            'payment_optimization',
            true,
            'Review payment method fees and consider promotion strategies'
          );
        }
      }
      
      // Check for payment timing patterns
      const now = new Date();
      const dayOfMonth = now.getDate();
      const dayOfWeek = now.getDay();
      
      // Group transactions by day of month
      const dayOfMonthCounts: Record<number, number
(Content truncated due to size limit. Use line ranges to read in chunks)