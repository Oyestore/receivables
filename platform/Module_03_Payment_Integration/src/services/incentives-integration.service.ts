import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Invoice } from '../../../invoices/entities/invoice.entity';
import { PaymentTransaction, TransactionStatus } from '../../entities/payment-transaction.entity';
import { DiscountService } from './discount.service';
import { LateFeeService } from './late-fee.service';
import { ABTestingService } from './ab-testing.service';
import { ExperimentType } from '../entities/ab-test-experiment.entity';
import { DiscountApplication, DiscountApplicationStatus } from '../entities/discount-application.entity';
import { LateFeeApplication } from '../entities/late-fee-application.entity';

@Injectable()
export class IncentivesIntegrationService {
  private readonly logger = new Logger(IncentivesIntegrationService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(DiscountApplication)
    private readonly discountApplicationRepository: Repository<DiscountApplication>,
    @InjectRepository(LateFeeApplication)
    private readonly lateFeeApplicationRepository: Repository<LateFeeApplication>,
    private readonly discountService: DiscountService,
    private readonly lateFeeService: LateFeeService,
    private readonly abTestingService: ABTestingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Calculate applicable early payment discount for an invoice
   * This is called during payment initiation to show potential discount
   */
  async calculateEarlyPaymentDiscount(
    invoiceId: string,
    paymentDate: Date = new Date(),
  ): Promise<{
    isEligible: boolean;
    discountAmount: number;
    discountedAmount: number;
    originalAmount: number;
  }> {
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
    } catch (error) {
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
  @OnEvent('payment.processing')
  async handlePaymentProcessing(payload: { 
    invoiceId: string; 
    transactionId: string;
    amount: number;
    paymentDate: Date;
  }): Promise<void> {
    try {
      const { invoiceId, transactionId, paymentDate } = payload;
      
      // Calculate discount
      const { isEligible, discountAmount, appliedRule } = 
        await this.discountService.calculateEarlyPaymentDiscount(invoiceId, paymentDate);
      
      if (isEligible && appliedRule) {
        // Apply discount
        const discountApplication = await this.discountService.applyDiscount(
          invoiceId,
          appliedRule.id,
          paymentDate,
        );
        
        // Link discount application to transaction
        discountApplication.transactionId = transactionId;
        await this.discountApplicationRepository.save(discountApplication);
        
        // Record experiment conversion if applicable
        await this.abTestingService.recordPaymentConversion(
          invoiceId,
          ExperimentType.DISCOUNT_STRATEGY,
          {
            amount: payload.amount,
            daysBeforeDueDate: this.calculateDaysBeforeDueDate(invoiceId, paymentDate),
          },
        );
        
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
    } catch (error) {
      this.logger.error(`Error applying early payment discount: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle payment completion to update discount application status
   */
  @OnEvent('payment.completed')
  async handlePaymentCompleted(payload: { 
    invoiceId: string; 
    transactionId: string;
  }): Promise<void> {
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
        discountApplication.status = DiscountApplicationStatus.APPLIED;
        await this.discountApplicationRepository.save(discountApplication);
        
        this.logger.log(`Updated discount application status for invoice ${invoiceId}`);
      }
    } catch (error) {
      this.logger.error(`Error updating discount application: ${error.message}`, error.stack);
    }
  }

  /**
   * Process late fees for overdue invoices
   * This would typically be called by a scheduled job
   */
  async processLateFees(organizationId: string): Promise<{
    processed: number;
    applied: number;
    skipped: number;
  }> {
    try {
      // Process standard late fees
      const result = await this.lateFeeService.processLateFees(organizationId);
      
      // TODO: Handle experimental late fee rules
      
      return result;
    } catch (error) {
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
  async calculateLateFee(
    invoiceId: string,
    currentDate: Date = new Date(),
  ): Promise<{
    isApplicable: boolean;
    feeAmount: number;
    totalAmount: number;
    originalAmount: number;
    daysOverdue: number;
  }> {
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
    } catch (error) {
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
  async applyLateFee(
    invoiceId: string,
    currentDate: Date = new Date(),
  ): Promise<LateFeeApplication> {
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
    } catch (error) {
      this.logger.error(`Error applying late fee: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handle payment for invoice with late fee
   */
  @OnEvent('payment.processing')
  async handleLateFeePayment(payload: { 
    invoiceId: string; 
    transactionId: string;
    amount: number;
  }): Promise<void> {
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
        await this.abTestingService.recordPaymentConversion(
          invoiceId,
          ExperimentType.LATE_FEE_STRATEGY,
          {
            amount: payload.amount,
          },
        );
        
        this.logger.log(`Updated late fee applications for invoice ${invoiceId}`);
      }
    } catch (error) {
      this.logger.error(`Error handling late fee payment: ${error.message}`, error.stack);
    }
  }

  /**
   * Helper method to calculate days before due date
   */
  private async calculateDaysBeforeDueDate(
    invoiceId: string,
    paymentDate: Date,
  ): Promise<number> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
    });
    
    if (!invoice || !invoice.dueDate) {
      return 0;
    }
    
    const dueDate = new Date(invoice.dueDate);
    const daysDifference = Math.ceil(
      (dueDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    
    return Math.max(0, daysDifference);
  }
}
