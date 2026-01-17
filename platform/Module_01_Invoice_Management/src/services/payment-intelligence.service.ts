import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Invoice } from '../invoice.entity';
import { DeepSeekR1Service } from './deepseek-r1.service';
import { MetricsService } from './metrics.service';

export interface PaymentPrediction {
  invoiceId: string;
  paymentProbability: number; // 0-100
  expectedPaymentDate: Date;
  confidenceLevel: number; // 0-100
  riskFactors: RiskFactor[];
  recommendedActions: Action[];
}

export interface RiskFactor {
  type: 'payment_history' | 'amount' | 'seasonal' | 'customer' | 'economic';
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: number; // -100 to 100
}

export interface Action {
  type: 'reminder' | 'discount' | 'escalation' | 'payment_plan' | 'follow_up';
  priority: 'high' | 'medium' | 'low';
  timing: 'immediate' | '3_days' | '7_days' | '14_days';
  description: string;
  expectedImpact: string;
}

export interface CustomerPaymentProfile {
  customerId: string;
  averagePaymentDays: number;
  paymentVariance: number;
  seasonalPattern: SeasonalPattern;
  preferredPaymentMethods: string[];
  riskCategory: 'low' | 'medium' | 'high';
  communicationPreferences: {
    preferredChannel: 'email' | 'sms' | 'whatsapp';
    optimalTiming: string;
    frequency: 'daily' | 'weekly' | 'biweekly';
  };
}

export interface SeasonalPattern {
  peakPaymentMonths: number[];
  slowPaymentMonths: number[];
  holidayImpact: boolean;
  festivalConsiderations: string[];
}

export interface PaymentTrendAnalysis {
  customerId: string;
  trendDirection: 'improving' | 'declining' | 'stable';
  trendStrength: number; // 0-100
  recentChange: number; // days change
  predictionAccuracy: number; // 0-100
}

@Injectable()
export class PaymentIntelligenceService {
  private readonly logger = new Logger(PaymentIntelligenceService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly deepSeekService: DeepSeekR1Service,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Predict payment behavior for a specific invoice
   */
  async predictPaymentBehavior(invoiceId: string): Promise<PaymentPrediction> {
    this.logger.log(`Predicting payment behavior for invoice ${invoiceId}`);

    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // Get customer payment history
    const customerProfile = await this.buildCustomerPaymentProfile(invoice.client_id);
    
    // Analyze current invoice context
    const invoiceContext = this.analyzeInvoiceContext(invoice);
    
    // Use AI for prediction
    const prediction = await this.generateAIPrediction(invoice, customerProfile, invoiceContext);
    
    // Calculate confidence level
    const confidenceLevel = this.calculateConfidenceLevel(customerProfile, invoiceContext);
    
    // Generate recommended actions
    const recommendedActions = this.generateRecommendedActions(prediction, customerProfile);

    this.metricsService.recordPaymentPrediction(invoiceId, prediction.paymentProbability);

    return {
      invoiceId,
      paymentProbability: prediction.paymentProbability,
      expectedPaymentDate: prediction.expectedPaymentDate,
      confidenceLevel,
      riskFactors: prediction.riskFactors,
      recommendedActions,
    };
  }

  /**
   * Build comprehensive customer payment profile
   */
  async buildCustomerPaymentProfile(customerId: string): Promise<CustomerPaymentProfile> {
    this.logger.log(`Building payment profile for customer ${customerId}`);

    const invoices = await this.invoiceRepository.find({
      where: { client_id: customerId },
      order: { created_at: 'DESC' },
    });

    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    
    // Calculate average payment days
    const paymentDays = paidInvoices.map(inv => {
      return Math.floor(
        (inv.updated_at.getTime() - inv.issue_date.getTime()) / (1000 * 60 * 60 * 24)
      );
    });

    const averagePaymentDays = paymentDays.length > 0 
      ? paymentDays.reduce((sum, days) => sum + days, 0) / paymentDays.length 
      : 30;

    // Calculate payment variance
    const paymentVariance = this.calculateVariance(paymentDays);

    // Analyze seasonal patterns
    const seasonalPattern = this.analyzeSeasonalPatterns(paidInvoices);

    // Determine risk category
    const riskCategory = this.determineRiskCategory(averagePaymentDays, paymentVariance);

    // Get communication preferences (would integrate with customer service)
    const communicationPreferences = {
      preferredChannel: 'email' as const,
      optimalTiming: '10:00 AM',
      frequency: 'weekly' as const,
    };

    return {
      customerId,
      averagePaymentDays,
      paymentVariance,
      seasonalPattern,
      preferredPaymentMethods: ['upi', 'card', 'netbanking'],
      riskCategory,
      communicationPreferences,
    };
  }

  /**
   * Analyze payment trends for a customer
   */
  async analyzePaymentTrends(customerId: string): Promise<PaymentTrendAnalysis> {
    this.logger.log(`Analyzing payment trends for customer ${customerId}`);

    const invoices = await this.invoiceRepository.find({
      where: { client_id: customerId, status: 'paid' },
      order: { updated_at: 'DESC' },
      take: 20, // Last 20 paid invoices
    });

    if (invoices.length < 3) {
      return {
        customerId,
        trendDirection: 'stable',
        trendStrength: 0,
        recentChange: 0,
        predictionAccuracy: 0,
      };
    }

    // Calculate payment days for recent invoices
    const recentPaymentDays = invoices.slice(0, 10).map(inv => 
      Math.floor((inv.updated_at.getTime() - inv.issue_date.getTime()) / (1000 * 60 * 60 * 24))
    );

    const olderPaymentDays = invoices.slice(10, 20).map(inv => 
      Math.floor((inv.updated_at.getTime() - inv.issue_date.getTime()) / (1000 * 60 * 60 * 24))
    );

    const recentAverage = recentPaymentDays.reduce((sum, days) => sum + days, 0) / recentPaymentDays.length;
    const olderAverage = olderPaymentDays.reduce((sum, days) => sum + days, 0) / olderPaymentDays.length;

    // Determine trend
    const change = recentAverage - olderAverage;
    let trendDirection: 'improving' | 'declining' | 'stable';
    
    if (Math.abs(change) < 2) {
      trendDirection = 'stable';
    } else if (change < 0) {
      trendDirection = 'improving';
    } else {
      trendDirection = 'declining';
    }

    // Calculate trend strength
    const trendStrength = Math.min(100, Math.abs(change) * 10);

    // Calculate prediction accuracy based on data consistency
    const allPaymentDays = [...recentPaymentDays, ...olderPaymentDays];
    const variance = this.calculateVariance(allPaymentDays);
    const predictionAccuracy = Math.max(0, 100 - variance);

    return {
      customerId,
      trendDirection,
      trendStrength,
      recentChange: change,
      predictionAccuracy,
    };
  }

  /**
   * Get payment insights for multiple invoices
   */
  async getBatchPaymentPredictions(invoiceIds: string[]): Promise<PaymentPrediction[]> {
    this.logger.log(`Getting batch payment predictions for ${invoiceIds.length} invoices`);

    const predictions: PaymentPrediction[] = [];

    for (const invoiceId of invoiceIds) {
      try {
        const prediction = await this.predictPaymentBehavior(invoiceId);
        predictions.push(prediction);
      } catch (error) {
        this.logger.error(`Failed to predict payment for invoice ${invoiceId}:`, error);
      }
    }

    return predictions;
  }

  /**
   * Optimize payment reminders based on intelligence
   */
  async optimizePaymentReminders(tenantId: string): Promise<{
    optimizedReminders: Array<{
      invoiceId: string;
      customerId: string;
      optimalTiming: Date;
      channel: string;
      message: string;
      expectedImpact: number;
    }>;
  }> {
    this.logger.log(`Optimizing payment reminders for tenant ${tenantId}`);

    // Get unpaid invoices
    const unpaidInvoices = await this.invoiceRepository.find({
      where: { tenant_id: tenantId, status: 'sent' },
    });

    const optimizedReminders = [];

    for (const invoice of unpaidInvoices) {
      const prediction = await this.predictPaymentBehavior(invoice.id);
      const customerProfile = await this.buildCustomerPaymentProfile(invoice.client_id);

      // Calculate optimal timing
      const optimalTiming = this.calculateOptimalReminderTiming(
        invoice.due_date,
        prediction,
        customerProfile
      );

      // Generate personalized message
      const message = this.generatePersonalizedReminder(invoice, prediction, customerProfile);

      optimizedReminders.push({
        invoiceId: invoice.id,
        customerId: invoice.client_id,
        optimalTiming,
        channel: customerProfile.communicationPreferences.preferredChannel,
        message,
        expectedImpact: prediction.paymentProbability < 70 ? 25 : 10,
      });
    }

    return { optimizedReminders };
  }

  /**
   * Analyze invoice context for payment prediction
   */
  private analyzeInvoiceContext(invoice: Invoice): any {
    const daysUntilDue = Math.floor(
      (invoice.due_date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    const isOverdue = daysUntilDue < 0;
    const isUrgent = daysUntilDue < 7;
    const isHighValue = invoice.grand_total > 100000;

    return {
      daysUntilDue,
      isOverdue,
      isUrgent,
      isHighValue,
      season: new Date().getMonth() + 1,
      weekday: new Date().getDay(),
    };
  }

  /**
   * Generate AI-powered payment prediction
   */
  private async generateAIPrediction(
    invoice: Invoice,
    customerProfile: CustomerPaymentProfile,
    invoiceContext: any,
  ): Promise<Omit<PaymentPrediction, 'invoiceId' | 'confidenceLevel' | 'recommendedActions'>> {
    const prompt = `
    Predict payment behavior for this invoice:
    
    Invoice Data:
    ${JSON.stringify(invoice, null, 2)}
    
    Customer Profile:
    ${JSON.stringify(customerProfile, null, 2)}
    
    Invoice Context:
    ${JSON.stringify(invoiceContext, null, 2)}
    
    Provide prediction in JSON format:
    {
      "paymentProbability": 0-100,
      "expectedPaymentDate": "YYYY-MM-DD",
      "riskFactors": [
        {
          "type": "payment_history|amount|seasonal|customer|economic",
          "severity": "low|medium|high",
          "description": "description",
          "impact": -100 to 100
        }
      ]
    }
    
    Consider:
    1. Customer payment history
    2. Invoice amount and urgency
    3. Seasonal patterns
    4. Current economic conditions
    5. Industry-specific factors
    `;

    const response = await this.deepSeekService.generate({
      systemPrompt: "You are an expert in payment behavior prediction and credit risk analysis.",
      prompt,
      temperature: 0.3,
    });

    try {
      return JSON.parse(response.text);
    } catch (error) {
      this.logger.warn('Failed to parse AI payment prediction', response.text);
      return this.getDefaultPrediction(invoice, customerProfile);
    }
  }

  /**
   * Calculate confidence level for prediction
   */
  private calculateConfidenceLevel(
    customerProfile: CustomerPaymentProfile,
    invoiceContext: any,
  ): number {
    let confidence = 50; // Base confidence

    // Increase confidence based on customer data
    if (customerProfile.averagePaymentDays > 0) confidence += 20;
    if (customerProfile.paymentVariance < 10) confidence += 15;
    if (customerProfile.seasonalPattern.peakPaymentMonths.length > 0) confidence += 10;

    // Adjust based on invoice context
    if (!invoiceContext.isOverdue) confidence += 5;
    if (invoiceContext.isHighValue) confidence -= 5;

    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Generate recommended actions based on prediction
   */
  private generateRecommendedActions(
    prediction: Omit<PaymentPrediction, 'invoiceId' | 'confidenceLevel' | 'recommendedActions'>,
    customerProfile: CustomerPaymentProfile,
  ): Action[] {
    const actions: Action[] = [];

    if (prediction.paymentProbability < 50) {
      actions.push({
        type: 'escalation',
        priority: 'high',
        timing: 'immediate',
        description: 'Escalate to senior account manager',
        expectedImpact: 'High - Direct intervention improves payment likelihood',
      });
    }

    if (prediction.paymentProbability < 70) {
      actions.push({
        type: 'reminder',
        priority: 'medium',
        timing: '3_days',
        description: 'Send friendly payment reminder',
        expectedImpact: 'Medium - Gentle reminder improves compliance',
      });
    }

    if (prediction.paymentProbability < 60) {
      actions.push({
        type: 'discount',
        priority: 'medium',
        timing: '7_days',
        description: 'Offer early payment discount',
        expectedImpact: 'Medium - Financial incentive accelerates payment',
      });
    }

    if (customerProfile.riskCategory === 'high') {
      actions.push({
        type: 'payment_plan',
        priority: 'low',
        timing: '14_days',
        description: 'Offer flexible payment plan',
        expectedImpact: 'Low - Reduces barrier to payment',
      });
    }

    return actions;
  }

  /**
   * Calculate variance for payment days
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Analyze seasonal payment patterns
   */
  private analyzeSeasonalPatterns(paidInvoices: Invoice[]): SeasonalPattern {
    const monthPayments = new Array(12).fill(0);
    const monthCounts = new Array(12).fill(0);

    paidInvoices.forEach(invoice => {
      const month = invoice.updated_at.getMonth();
      const paymentDays = Math.floor(
        (invoice.updated_at.getTime() - invoice.issue_date.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      monthPayments[month] += paymentDays;
      monthCounts[month]++;
    });

    // Calculate average payment days by month
    const avgPaymentDays = monthPayments.map((total, index) => 
      monthCounts[index] > 0 ? total / monthCounts[index] : 0
    );

    // Find peak and slow months
    const overallAvg = avgPaymentDays.reduce((sum, days) => sum + days, 0) / avgPaymentDays.filter(d => d > 0).length;
    
    const peakMonths = avgPaymentDays
      .map((days, index) => ({ days, index }))
      .filter(item => days > 0 && days < overallAvg - 2)
      .map(item => item.index);

    const slowMonths = avgPaymentDays
      .map((days, index) => ({ days, index }))
      .filter(item => days > 0 && days > overallAvg + 2)
      .map(item => item.index);

    return {
      peakPaymentMonths: peakMonths,
      slowPaymentMonths: slowMonths,
      holidayImpact: slowMonths.includes(11) || slowMonths.includes(12), // Nov, Dec
      festivalConsiderations: ['Diwali', 'Holi', 'Eid', 'Christmas'], // Indian festivals
    };
  }

  /**
   * Determine customer risk category
   */
  private determineRiskCategory(averagePaymentDays: number, paymentVariance: number): 'low' | 'medium' | 'high' {
    if (averagePaymentDays <= 15 && paymentVariance <= 5) return 'low';
    if (averagePaymentDays <= 30 && paymentVariance <= 15) return 'medium';
    return 'high';
  }

  /**
   * Calculate optimal reminder timing
   */
  private calculateOptimalReminderTiming(
    dueDate: Date,
    prediction: PaymentPrediction,
    customerProfile: CustomerPaymentProfile,
  ): Date {
    const now = new Date();
    const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Base timing on prediction probability
    let daysToAdd = 7; // Default

    if (prediction.paymentProbability < 50) {
      daysToAdd = 3; // Earlier reminder for high risk
    } else if (prediction.paymentProbability > 80) {
      daysToAdd = 14; // Later reminder for low risk
    }

    // Adjust based on customer preferences
    const optimalHour = 10; // 10 AM
    const reminderDate = new Date(now.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
    reminderDate.setHours(optimalHour, 0, 0, 0);

    return reminderDate;
  }

  /**
   * Generate personalized reminder message
   */
  private generatePersonalizedReminder(
    invoice: Invoice,
    prediction: PaymentPrediction,
    customerProfile: CustomerPaymentProfile,
  ): string {
    const customerName = `Customer ${customerProfile.customerId}`;
    const amount = invoice.grand_total.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
    });

    let message = `Hi ${customerName},\n\n`;
    message += `This is a friendly reminder about invoice ${invoice.invoice_number} for ${amount}.\n`;
    message += `Due date: ${invoice.due_date.toLocaleDateString()}.\n\n`;

    if (prediction.paymentProbability < 50) {
      message += `We understand you might need assistance. Please let us know if you'd like to discuss payment options.\n`;
    } else {
      message += `Thank you for your business. We appreciate your prompt payment.\n`;
    }

    message += `\nBest regards,\nYour Business Team`;

    return message;
  }

  /**
   * Get default prediction when AI fails
   */
  private getDefaultPrediction(
    invoice: Invoice,
    customerProfile: CustomerPaymentProfile,
  ): Omit<PaymentPrediction, 'invoiceId' | 'confidenceLevel' | 'recommendedActions'> {
    const baseProbability = customerProfile.riskCategory === 'low' ? 85 : 
                           customerProfile.riskCategory === 'medium' ? 70 : 50;

    const expectedPaymentDate = new Date(
      invoice.issue_date.getTime() + (customerProfile.averagePaymentDays * 24 * 60 * 60 * 1000)
    );

    return {
      paymentProbability: baseProbability,
      expectedPaymentDate,
      riskFactors: [
        {
          type: 'customer',
          severity: customerProfile.riskCategory === 'high' ? 'high' : 'medium',
          description: `Customer has ${customerProfile.riskCategory} payment risk`,
          impact: customerProfile.riskCategory === 'high' ? -30 : -10,
        },
      ],
    };
  }
}
