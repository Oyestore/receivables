import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { PaymentLateFeeRule, LateFeeType, LateFeeFrequency } from '../entities/payment-late-fee-rule.entity';
import { LateFeeApplication, LateFeeApplicationStatus } from '../entities/late-fee-application.entity';
import { Invoice } from '../../../invoices/entities/invoice.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class LateFeeService {
  private readonly logger = new Logger(LateFeeService.name);

  constructor(
    @InjectRepository(PaymentLateFeeRule)
    private readonly lateFeeRuleRepository: Repository<PaymentLateFeeRule>,
    @InjectRepository(LateFeeApplication)
    private readonly lateFeeApplicationRepository: Repository<LateFeeApplication>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Find applicable late fee rules for an organization
   */
  async findActiveLateFeeRules(organizationId: string): Promise<PaymentLateFeeRule[]> {
    const currentDate = new Date();
    
    return this.lateFeeRuleRepository.find({
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
    appliedRule?: PaymentLateFeeRule;
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
        isApplicable: false,
        feeAmount: 0,
        totalAmount: invoice.totalAmount,
        originalAmount: invoice.totalAmount,
        daysOverdue: 0,
      };
    }

    // Calculate days overdue
    const dueDate = new Date(invoice.dueDate);
    const daysOverdue = Math.floor(
      (currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

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
    let applicableRule: PaymentLateFeeRule | undefined;
    
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
    
    if (applicableRule.feeType === LateFeeType.FIXED_AMOUNT) {
      // Fixed amount fee
      feeAmount = applicableRule.feeValue;
      
      // Apply frequency multiplier if applicable
      if (applicableRule.frequency === LateFeeFrequency.DAILY) {
        feeAmount *= effectiveDaysOverdue;
      } else if (applicableRule.frequency === LateFeeFrequency.WEEKLY) {
        feeAmount *= Math.ceil(effectiveDaysOverdue / 7);
      } else if (applicableRule.frequency === LateFeeFrequency.MONTHLY) {
        feeAmount *= Math.ceil(effectiveDaysOverdue / 30);
      }
    } else if (applicableRule.feeType === LateFeeType.PERCENTAGE) {
      // Percentage-based fee
      feeAmount = (invoice.totalAmount * applicableRule.feeValue) / 100;
      
      // Apply frequency multiplier if applicable
      if (applicableRule.frequency === LateFeeFrequency.DAILY) {
        feeAmount *= effectiveDaysOverdue;
      } else if (applicableRule.frequency === LateFeeFrequency.WEEKLY) {
        feeAmount *= Math.ceil(effectiveDaysOverdue / 7);
      } else if (applicableRule.frequency === LateFeeFrequency.MONTHLY) {
        feeAmount *= Math.ceil(effectiveDaysOverdue / 30);
      }
    } else if (applicableRule.feeType === LateFeeType.COMPOUND_PERCENTAGE) {
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
  async applyLateFee(
    invoiceId: string,
    lateFeeRuleId?: string,
    currentDate: Date = new Date(),
  ): Promise<LateFeeApplication> {
    // Get the invoice
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Calculate the late fee
    const { isApplicable, feeAmount, totalAmount, daysOverdue, appliedRule } = 
      await this.calculateLateFee(invoiceId, currentDate);

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
      status: LateFeeApplicationStatus.APPLIED,
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
  async waiveLateFee(
    applicationId: string,
    reason: string,
    waivedBy: string,
  ): Promise<LateFeeApplication> {
    const application = await this.lateFeeApplicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new Error('Late fee application not found');
    }

    if (application.status !== LateFeeApplicationStatus.APPLIED && 
        application.status !== LateFeeApplicationStatus.PENDING) {
      throw new Error('Only applied or pending late fees can be waived');
    }

    application.status = LateFeeApplicationStatus.WAIVED;
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
  async createLateFeeRule(
    organizationId: string,
    lateFeeRuleData: Partial<PaymentLateFeeRule>,
  ): Promise<PaymentLateFeeRule> {
    const lateFeeRule = this.lateFeeRuleRepository.create({
      ...lateFeeRuleData,
      organizationId,
    });

    return this.lateFeeRuleRepository.save(lateFeeRule);
  }

  /**
   * Update an existing late fee rule
   */
  async updateLateFeeRule(
    id: string,
    lateFeeRuleData: Partial<PaymentLateFeeRule>,
  ): Promise<PaymentLateFeeRule> {
    await this.lateFeeRuleRepository.update(id, lateFeeRuleData);
    
    return this.lateFeeRuleRepository.findOne({
      where: { id },
    });
  }

  /**
   * Delete a late fee rule
   */
  async deleteLateFeeRule(id: string): Promise<void> {
    await this.lateFeeRuleRepository.delete(id);
  }

  /**
   * Get late fee rules for an organization
   */
  async getLateFeeRules(
    organizationId: string,
    filters?: {
      status?: string;
      isEnabled?: boolean;
    },
  ): Promise<PaymentLateFeeRule[]> {
    const whereClause: any = { organizationId };
    
    if (filters) {
      if (filters.status) whereClause.status = filters.status;
      if (filters.isEnabled !== undefined) whereClause.isEnabled = filters.isEnabled;
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
  async getLateFeeApplicationsForInvoice(invoiceId: string): Promise<LateFeeApplication[]> {
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
  async processLateFees(organizationId: string): Promise<{
    processed: number;
    applied: number;
    skipped: number;
  }> {
    // Find all overdue invoices
    const currentDate = new Date();
    const overdueInvoices = await this.invoiceRepository.find({
      where: {
        organizationId,
        status: 'unpaid',
        dueDate: LessThan(currentDate),
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
        } else {
          skipped++;
        }
      } catch (error) {
        this.logger.error(`Error processing late fee for invoice ${invoice.id}: ${error.message}`);
        skipped++;
      }
    }

    return { processed, applied, skipped };
  }
}
