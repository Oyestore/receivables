import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { FinancingRequest, FinancingType, FinancingStatus } from '../entities/financing-request.entity';
import { Invoice } from '../../../invoices/entities/invoice.entity';
import { PaymentTransaction } from '../../entities/payment-transaction.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface CashFlowForecast {
  startDate: Date;
  endDate: Date;
  initialBalance: number;
  projectedBalance: number;
  inflows: CashFlowItem[];
  outflows: CashFlowItem[];
  weeklyProjections: WeeklyProjection[];
  financingGap?: FinancingGap;
}

interface CashFlowItem {
  date: Date;
  amount: number;
  description: string;
  category: string;
  probability?: number;
  source?: string;
}

interface WeeklyProjection {
  weekStarting: Date;
  openingBalance: number;
  inflows: number;
  outflows: number;
  closingBalance: number;
}

interface FinancingGap {
  startDate: Date;
  endDate: Date;
  amount: number;
  duration: number;
  suggestedFinancingType: FinancingType;
  suggestedAmount: number;
  suggestedTenor: number;
}

interface WorkingCapitalMetrics {
  dso: number; // Days Sales Outstanding
  dpo: number; // Days Payable Outstanding
  dio: number; // Days Inventory Outstanding
  ccc: number; // Cash Conversion Cycle
  currentRatio: number;
  quickRatio: number;
  workingCapitalRatio: number;
  workingCapitalAmount: number;
  recommendations: string[];
}

@Injectable()
export class WorkingCapitalService {
  private readonly logger = new Logger(WorkingCapitalService.name);

  constructor(
    @InjectRepository(FinancingRequest)
    private readonly financingRequestRepository: Repository<FinancingRequest>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Generate cash flow forecast for an organization
   */
  async generateCashFlowForecast(
    organizationId: string,
    options?: {
      startDate?: Date;
      forecastDays?: number;
      includeFinancingGap?: boolean;
      initialBalance?: number;
    }
  ): Promise<CashFlowForecast> {
    // Set default options
    const startDate = options?.startDate || new Date();
    const forecastDays = options?.forecastDays || 90;
    const includeFinancingGap = options?.includeFinancingGap !== false;
    
    // Calculate end date
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + forecastDays);
    
    // Get organization
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    
    if (!organization) {
      throw new Error('Organization not found');
    }
    
    // Get initial balance
    const initialBalance = options?.initialBalance !== undefined 
      ? options.initialBalance 
      : (organization.metadata?.financials?.currentBalance || 0);
    
    // Collect inflows and outflows
    const inflows = await this.collectProjectedInflows(organizationId, startDate, endDate);
    const outflows = await this.collectProjectedOutflows(organizationId, startDate, endDate);
    
    // Generate weekly projections
    const weeklyProjections = this.generateWeeklyProjections(
      startDate,
      endDate,
      initialBalance,
      inflows,
      outflows,
    );
    
    // Calculate projected final balance
    const projectedBalance = weeklyProjections.length > 0
      ? weeklyProjections[weeklyProjections.length - 1].closingBalance
      : initialBalance;
    
    // Identify financing gap if requested
    let financingGap = undefined;
    if (includeFinancingGap) {
      financingGap = this.identifyFinancingGap(weeklyProjections);
    }
    
    // Create forecast result
    const forecast: CashFlowForecast = {
      startDate,
      endDate,
      initialBalance,
      projectedBalance,
      inflows,
      outflows,
      weeklyProjections,
      financingGap,
    };
    
    // Emit event for forecast generation
    this.eventEmitter.emit('working_capital.forecast_generated', {
      organizationId,
      forecastStartDate: startDate,
      forecastEndDate: endDate,
      projectedBalance,
      hasFinancingGap: !!financingGap,
    });
    
    return forecast;
  }

  /**
   * Collect projected inflows
   */
  private async collectProjectedInflows(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CashFlowItem[]> {
    const inflows: CashFlowItem[] = [];
    
    // Get outstanding invoices
    const outstandingInvoices = await this.invoiceRepository.find({
      where: {
        organizationId,
        status: 'sent',
        dueDate: Between(startDate, endDate),
      },
    });
    
    // Add expected payments from outstanding invoices
    for (const invoice of outstandingInvoices) {
      // Calculate probability based on customer payment history and invoice age
      const probability = await this.calculatePaymentProbability(invoice);
      
      inflows.push({
        date: new Date(invoice.dueDate),
        amount: Number(invoice.totalAmount),
        description: `Expected payment for invoice #${invoice.invoiceNumber}`,
        category: 'accounts_receivable',
        probability,
        source: 'invoice',
      });
    }
    
    // Get recurring invoices (based on patterns)
    const recurringInflows = await this.predictRecurringInflows(
      organizationId,
      startDate,
      endDate,
    );
    
    // Add recurring inflows
    inflows.push(...recurringInflows);
    
    // Sort by date
    return inflows.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Collect projected outflows
   */
  private async collectProjectedOutflows(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CashFlowItem[]> {
    const outflows: CashFlowItem[] = [];
    
    // Get upcoming financing repayments
    const upcomingRepayments = await this.financingRequestRepository.find({
      where: {
        organizationId,
        status: FinancingStatus.FUNDED,
        repaymentDueDate: Between(startDate, endDate),
      },
    });
    
    // Add financing repayments
    for (const repayment of upcomingRepayments) {
      outflows.push({
        date: new Date(repayment.repaymentDueDate),
        amount: Number(repayment.outstandingAmount),
        description: `Financing repayment for ${repayment.nbfcPartnerName}`,
        category: 'financing_repayment',
        probability: 1, // Certain
        source: 'financing',
      });
    }
    
    // Get recurring outflows (based on patterns)
    const recurringOutflows = await this.predictRecurringOutflows(
      organizationId,
      startDate,
      endDate,
    );
    
    // Add recurring outflows
    outflows.push(...recurringOutflows);
    
    // Sort by date
    return outflows.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Calculate payment probability based on customer history
   */
  private async calculatePaymentProbability(invoice: Invoice): Promise<number> {
    if (!invoice.customerId) {
      return 0.5; // Default probability for unknown customer
    }
    
    // Get customer payment history
    const customerInvoices = await this.invoiceRepository.find({
      where: {
        organizationId: invoice.organizationId,
        customerId: invoice.customerId,
        status: 'paid',
      },
    });
    
    if (customerInvoices.length === 0) {
      return 0.5; // No history
    }
    
    // Calculate average days to payment
    let totalDaysToPayment = 0;
    let totalDaysLate = 0;
    let invoicesWithPaymentData = 0;
    
    for (const inv of customerInvoices) {
      if (inv.invoiceDate && inv.paidDate && inv.dueDate) {
        const invoiceDate = new Date(inv.invoiceDate);
        const paidDate = new Date(inv.paidDate);
        const dueDate = new Date(inv.dueDate);
        
        const daysToPayment = Math.floor(
          (paidDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        const daysLate = Math.max(
          0,
          Math.floor((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        );
        
        totalDaysToPayment += daysToPayment;
        totalDaysLate += daysLate;
        invoicesWithPaymentData++;
      }
    }
    
    if (invoicesWithPaymentData === 0) {
      return 0.5; // No usable payment data
    }
    
    const avgDaysToPayment = totalDaysToPayment / invoicesWithPaymentData;
    const avgDaysLate = totalDaysLate / invoicesWithPaymentData;
    
    // Calculate on-time payment ratio
    const onTimePayments = customerInvoices.filter(inv => {
      if (!inv.paidDate || !inv.dueDate) return false;
      return new Date(inv.paidDate) <= new Date(inv.dueDate);
    }).length;
    
    const onTimeRatio = onTimePayments / customerInvoices.length;
    
    // Calculate probability based on payment history
    // Higher on-time ratio and lower average days late = higher probability
    let probability = onTimeRatio * 0.7 + (1 - Math.min(1, avgDaysLate / 30)) * 0.3;
    
    // Adjust for invoice age
    if (invoice.invoiceDate) {
      const invoiceAge = Math.floor(
        (new Date().getTime() - new Date(invoice.invoiceDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Older invoices have lower probability
      if (invoiceAge > 60) {
        probability *= 0.7;
      } else if (invoiceAge > 30) {
        probability *= 0.9;
      }
    }
    
    return Math.min(1, Math.max(0.1, probability));
  }

  /**
   * Predict recurring inflows based on historical patterns
   */
  private async predictRecurringInflows(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CashFlowItem[]> {
    const recurringInflows: CashFlowItem[] = [];
    
    // Get historical invoices for pattern recognition
    const historicalInvoices = await this.invoiceRepository.find({
      where: {
        organizationId,
        invoiceDate: LessThan(startDate),
      },
      order: { invoiceDate: 'DESC' },
      take: 100, // Limit to recent invoices
    });
    
    // Group by customer to identify recurring patterns
    const customerGroups: Record<string, Invoice[]> = {};
    
    for (const invoice of historicalInvoices) {
      if (invoice.customerId) {
        if (!customerGroups[invoice.customerId]) {
          customerGroups[invoice.customerId] = [];
        }
        customerGroups[invoice.customerId].push(invoice);
      }
    }
    
    // Analyze each customer for recurring patterns
    for (const customerId in customerGroups) {
      const invoices = customerGroups[customerId];
      
      if (invoices.length < 3) {
        continue; // Need at least 3 invoices to identify pattern
      }
      
      // Sort by date
      invoices.sort((a, b) => 
        new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()
      );
      
      // Check for monthly pattern
      const monthlyPattern = this.detectMonthlyPattern(invoices);
      
      if (monthlyPattern) {
        // Generate projected invoices based on pattern
        const projectedInvoices = this.generateProjectedInvoices(
          invoices,
          monthlyPattern,
          startDate,
          endDate,
        );
        
        // Add to recurring inflows
        for (const projection of projectedInvoices) {
          recurringInflows.push({
            date: new Date(projection.dueDate),
            amount: Number(projection.amount),
            description: `Projected payment from ${projection.customerName}`,
            category: 'recurring_receivable',
            probability: 0.8, // High probability for recurring customers
            source: 'pattern',
          });
        }
      }
    }
    
    return recurringInflows;
  }

  /**
   * Detect monthly pattern in invoices
   */
  private detectMonthlyPattern(invoices: Invoice[]): { 
    intervalDays: number;
    averageAmount: number;
    dayOfMonth?: number;
    reliability: number;
  } | null {
    if (invoices.length < 3) {
      return null;
    }
    
    // Calculate intervals between invoices
    const intervals: number[] = [];
    for (let i = 1; i < invoices.length; i++) {
      if (invoices[i].invoiceDate && invoices[i-1].invoiceDate) {
        const current = new Date(invoices[i].invoiceDate);
        const previous = new Date(invoices[i-1].invoiceDate);
        const days = Math.floor((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));
        intervals.push(days);
      }
    }
    
    if (intervals.length < 2) {
      return null;
    }
    
    // Calculate average interval
    const avgInterval = intervals.reduce((sum, days) => sum + days, 0) / intervals.length;
    
    // Check if it's close to monthly (30 days +/- 5)
    const isMonthly = avgInterval >= 25 && avgInterval <= 35;
    
    if (!isMonthly) {
      return null;
    }
    
    // Calculate standard deviation to check consistency
    const stdDev = Math.sqrt(
      intervals.reduce((sum, days) => sum + Math.pow(days - avgInterval, 2), 0) / intervals.length
    );
    
    // Calculate reliability (0-1)
    const reliability = Math.max(0, Math.min(1, 1 - (stdDev / avgInterval)));
    
    // Only consider reliable patterns
    if (reliability < 0.7) {
      return null;
    }
    
    // Check if invoices tend to be on same day of month
    const daysOfMonth = invoices
      .filter(inv => inv.invoiceDate)
      .map(inv => new Date(inv.invoiceDate).getDate());
    
    // Count occurrences of each day
    const dayCount: Record<number, number> = {};
    for (const day of daysOfMonth) {
      dayCount[day] = (dayCount[day] || 0) + 1;
    }
    
    // Find most common day
    let mostCommonDay = 0;
    let maxCount = 0;
    
    for (const day in dayCount) {
      if (dayCount[day] > maxCount) {
        maxCount = dayCount[day];
        mostCommonDay = parseInt(day);
      }
    }
    
    // Check if most common day is significant
    const dayReliability = maxCount / daysOfMonth.length;
    
    // Calculate average amount
    const amounts = invoices
      .filter(inv => inv.totalAmount)
      .map(inv => Number(inv.totalAmount));
    
    const avgAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    
    return {
      intervalDays: Math.round(avgInterval),
      averageAmount: avgAmount,
      dayOfMonth: dayReliability > 0.6 ? mostCommonDay : undefined,
      reliability,
    };
  }

  /**
   * Generate projected invoices based on pattern
   */
  private generateProjectedInvoices(
    historicalInvoices: Invoice[],
    pattern: { 
      intervalDays: number;
      averageAmount: number;
      dayOfMonth?: number;
      reliability: number;
    },
    startDate: Date,
    endDate: Date,
  ): Array<{
    dueDate: Date;
    amount: number;
    customerName: string;
  }> {
    const projections = [];
    
    // Get most recent invoice
    const latestInvoice = historicalInvoices[historicalInvoices.length - 1];
    const latestDate = new Date(latestInvoice.invoiceDate);
    const customerName = latestInvoice.customerName || 'Unknown Customer';
    
    // Calculate payment terms (days between invoice and due date)
    let paymentTerms = 30; // Default
    if (latestInvoice.invoiceDate && latestInvoice.dueDate) {
      const invoiceDate = new Date(latestInvoice.invoiceDate);
      const dueDate = new Date(latestInvoice.dueDate);
      paymentTerms = Math.floor(
        (dueDate.getTime() - invoiceDate.getTime()) / (1000 * 60
(Content truncated due to size limit. Use line ranges to read in chunks)