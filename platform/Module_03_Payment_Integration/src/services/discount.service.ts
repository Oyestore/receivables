import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { PaymentDiscountRule, DiscountType, DiscountTrigger } from '../entities/payment-discount-rule.entity';
import { DiscountApplication, DiscountApplicationStatus } from '../entities/discount-application.entity';
import { Invoice } from '../../../invoices/entities/invoice.entity';

@Injectable()
export class DiscountService {
  private readonly logger = new Logger(DiscountService.name);

  constructor(
    @InjectRepository(PaymentDiscountRule)
    private readonly discountRuleRepository: Repository<PaymentDiscountRule>,
    @InjectRepository(DiscountApplication)
    private readonly discountApplicationRepository: Repository<DiscountApplication>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  /**
   * Find applicable discount rules for an organization
   */
  async findActiveDiscountRules(organizationId: string): Promise<PaymentDiscountRule[]> {
    const currentDate = new Date();
    
    return this.discountRuleRepository.find({
      where: [
        {
          organizationId,
          isEnabled: true,
          status: 'active',
          validFrom: LessThan(currentDate),
          validUntil: MoreThan(currentDate),
        },
        {
          organizationId,
          isEnabled: true,
          status: 'active',
          validFrom: LessThan(currentDate),
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
  async calculateEarlyPaymentDiscount(
    invoiceId: string,
    paymentDate: Date,
  ): Promise<{
    isEligible: boolean;
    discountAmount: number;
    discountedAmount: number;
    originalAmount: number;
    appliedRule?: PaymentDiscountRule;
  }> {
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
    const earlyPaymentRules = discountRules.filter(
      rule => rule.triggerType === DiscountTrigger.EARLY_PAYMENT,
    );

    if (!earlyPaymentRules.length) {
      return {
        isEligible: false,
        discountAmount: 0,
        discountedAmount: invoice.totalAmount,
        originalAmount: invoice.totalAmount,
      };
    }

    // Find applicable rule based on conditions
    let applicableRule: PaymentDiscountRule | undefined;
    
    for (const rule of earlyPaymentRules) {
      // Check currency match if specified
      if (rule.currencyCode && rule.currencyCode !== invoice.currency) {
        continue;
      }
      
      // Check amount constraints
      if (
        (rule.minimumAmount && invoice.totalAmount < rule.minimumAmount) ||
        (rule.maximumAmount && invoice.totalAmount > rule.maximumAmount)
      ) {
        continue;
      }
      
      // Check early payment conditions
      const conditions = rule.triggerConditions;
      
      if (conditions.daysBeforeDueDate) {
        const dueDate = new Date(invoice.dueDate);
        const daysDifference = Math.ceil(
          (dueDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        
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
    
    if (applicableRule.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (invoice.totalAmount * applicableRule.discountValue) / 100;
    } else {
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
  async applyDiscount(
    invoiceId: string,
    discountRuleId: string,
    paymentDate: Date,
  ): Promise<DiscountApplication> {
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
    const { isEligible, discountAmount, discountedAmount } = 
      await this.calculateEarlyPaymentDiscount(invoiceId, paymentDate);

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
      status: DiscountApplicationStatus.APPLIED,
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
  async getActiveDiscountApplication(invoiceId: string): Promise<DiscountApplication | null> {
    return this.discountApplicationRepository.findOne({
      where: {
        invoiceId,
        status: DiscountApplicationStatus.APPLIED,
      },
      relations: ['discountRule'],
    });
  }

  /**
   * Expire a discount application
   */
  async expireDiscountApplication(applicationId: string): Promise<DiscountApplication> {
    const application = await this.discountApplicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new Error('Discount application not found');
    }

    if (application.status !== DiscountApplicationStatus.PENDING) {
      throw new Error('Only pending discount applications can be expired');
    }

    application.status = DiscountApplicationStatus.EXPIRED;
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
  async createDiscountRule(
    organizationId: string,
    discountRuleData: Partial<PaymentDiscountRule>,
  ): Promise<PaymentDiscountRule> {
    const discountRule = this.discountRuleRepository.create({
      ...discountRuleData,
      organizationId,
    });

    return this.discountRuleRepository.save(discountRule);
  }

  /**
   * Update an existing discount rule
   */
  async updateDiscountRule(
    id: string,
    discountRuleData: Partial<PaymentDiscountRule>,
  ): Promise<PaymentDiscountRule> {
    await this.discountRuleRepository.update(id, discountRuleData);
    
    return this.discountRuleRepository.findOne({
      where: { id },
    });
  }

  /**
   * Delete a discount rule
   */
  async deleteDiscountRule(id: string): Promise<void> {
    await this.discountRuleRepository.delete(id);
  }

  /**
   * Get discount rules for an organization
   */
  async getDiscountRules(
    organizationId: string,
    filters?: {
      status?: string;
      triggerType?: DiscountTrigger;
      isEnabled?: boolean;
    },
  ): Promise<PaymentDiscountRule[]> {
    const whereClause: any = { organizationId };
    
    if (filters) {
      if (filters.status) whereClause.status = filters.status;
      if (filters.triggerType) whereClause.triggerType = filters.triggerType;
      if (filters.isEnabled !== undefined) whereClause.isEnabled = filters.isEnabled;
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
  async getDiscountApplicationsForInvoice(invoiceId: string): Promise<DiscountApplication[]> {
    return this.discountApplicationRepository.find({
      where: { invoiceId },
      relations: ['discountRule'],
      order: {
        createdAt: 'DESC',
      },
    });
  }
}
