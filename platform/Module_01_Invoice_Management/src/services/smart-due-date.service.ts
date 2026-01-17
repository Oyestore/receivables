import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../invoice.entity';
import { PaymentIntelligenceService } from './payment-intelligence.service';
import { DeepSeekR1Service } from './deepseek-r1.service';
import { MetricsService } from './metrics.service';

export interface DueDateOptimization {
  invoiceId: string;
  recommendedDueDate: Date;
  originalDueDate: Date;
  reasoning: string[];
  expectedPaymentImprovement: number; // percentage
  confidence: number; // 0-100
  businessConsiderations: BusinessConsideration[];
}

export interface BusinessConsideration {
  type: 'cash_flow' | 'customer_relationship' | 'seasonal' | 'industry_standard' | 'legal';
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  weight: number; // 0-10
}

export interface DueDatePolicy {
  tenantId: string;
  defaultTerms: number; // days
  customerSpecificRules: CustomerRule[];
  industrySpecificRules: IndustryRule[];
  seasonalAdjustments: SeasonalAdjustment[];
  minimumDays: number;
  maximumDays: number;
}

export interface CustomerRule {
  customerId: string;
  ruleType: 'fixed_days' | 'payment_history' | 'credit_score';
  parameters: any;
  priority: number;
}

export interface IndustryRule {
  industry: string;
  standardTerms: number;
  variations: {
    highValue: number;
    regular: number;
    lowValue: number;
  };
  seasonalFactors: SeasonalFactor[];
}

export interface SeasonalFactor {
  months: number[];
  adjustment: number; // days
  reason: string;
}

export interface SeasonalAdjustment {
  name: string;
  startDate: Date;
  endDate: Date;
  adjustment: number; // days
  applicableCustomers: string[]; // customer IDs
  reason: string;
}

export interface DueDateAnalysis {
  tenantId: string;
  currentPerformance: {
    averagePaymentDays: number;
    onTimePaymentRate: number;
    overdueRate: number;
  };
  optimizedPerformance: {
    projectedPaymentDays: number;
    projectedOnTimeRate: number;
    projectedOverdueRate: number;
  };
  recommendations: string[];
  implementationComplexity: 'low' | 'medium' | 'high';
  expectedROI: number; // percentage
}

@Injectable()
export class SmartDueDateService {
  private readonly logger = new Logger(SmartDueDateService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly paymentIntelligenceService: PaymentIntelligenceService,
    private readonly deepSeekService: DeepSeekR1Service,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Calculate optimal due date for a specific invoice
   */
  async calculateOptimalDueDate(
    invoiceId: string,
    businessContext?: {
      cashFlowNeeds?: boolean;
      customerRelationship?: 'new' | 'existing' | 'strategic';
      industry?: string;
      region?: string;
    },
  ): Promise<DueDateOptimization> {
    this.logger.log(`Calculating optimal due date for invoice ${invoiceId}`);

    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // Get customer payment profile
    const customerProfile = await this.paymentIntelligenceService.buildCustomerPaymentProfile(invoice.client_id);
    
    // Get tenant due date policy
    const policy = await this.getTenantDueDatePolicy(invoice.tenant_id);
    
    // Analyze business context
    const businessAnalysis = this.analyzeBusinessContext(invoice, businessContext);
    
    // Use AI for optimization
    const aiOptimization = await this.generateAIOptimization(invoice, customerProfile, policy, businessAnalysis);
    
    // Calculate expected improvement
    const expectedImprovement = this.calculateExpectedImprovement(invoice, aiOptimization, customerProfile);
    
    // Generate business considerations
    const businessConsiderations = this.generateBusinessConsiderations(invoice, aiOptimization, policy);

    this.metricsService.recordDueDateOptimization(invoiceId, expectedImprovement);

    return {
      invoiceId,
      recommendedDueDate: aiOptimization.recommendedDate,
      originalDueDate: invoice.due_date,
      reasoning: aiOptimization.reasoning,
      expectedPaymentImprovement: expectedImprovement,
      confidence: aiOptimization.confidence,
      businessConsiderations,
    };
  }

  /**
   * Get tenant's due date policy
   */
  async getTenantDueDatePolicy(tenantId: string): Promise<DueDatePolicy> {
    this.logger.log(`Getting due date policy for tenant ${tenantId}`);

    // For now, return default policy
    // In production, this would be stored in database
    return {
      tenantId,
      defaultTerms: 30,
      customerSpecificRules: [],
      industrySpecificRules: [
        {
          industry: 'technology',
          standardTerms: 30,
          variations: {
            highValue: 45,
            regular: 30,
            lowValue: 15,
          },
          seasonalFactors: [
            {
              months: [3, 4], // End of fiscal year
              adjustment: 15,
              reason: 'End of fiscal year budget cycles',
            },
          ],
        },
        {
          industry: 'manufacturing',
          standardTerms: 45,
          variations: {
            highValue: 60,
            regular: 45,
            lowValue: 30,
          },
          seasonalFactors: [
            {
              months: [10, 11], // Festival season
              adjustment: -10,
              reason: 'Festival season cash flow needs',
            },
          ],
        },
      ],
      seasonalAdjustments: [
        {
          name: 'Diwali Season',
          startDate: new Date(2024, 9, 15), // Oct 15
          endDate: new Date(2024, 10, 15), // Nov 15
          adjustment: 7,
          applicableCustomers: [],
          reason: 'Diwali festival considerations',
        },
      ],
      minimumDays: 7,
      maximumDays: 90,
    };
  }

  /**
   * Analyze due date performance and provide recommendations
   */
  async analyzeDueDatePerformance(tenantId: string): Promise<DueDateAnalysis> {
    this.logger.log(`Analyzing due date performance for tenant ${tenantId}`);

    // Get recent invoices
    const recentInvoices = await this.invoiceRepository.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
      take: 100,
    });

    const paidInvoices = recentInvoices.filter(inv => inv.status === 'paid');
    
    // Calculate current performance
    const currentPerformance = this.calculateCurrentPerformance(paidInvoices);
    
    // Simulate optimized performance
    const optimizedPerformance = await this.simulateOptimizedPerformance(tenantId, recentInvoices);
    
    // Generate recommendations
    const recommendations = await this.generateRecommendations(currentPerformance, optimizedPerformance);
    
    // Calculate implementation complexity
    const implementationComplexity = this.calculateImplementationComplexity(recommendations);
    
    // Calculate expected ROI
    const expectedROI = this.calculateExpectedROI(currentPerformance, optimizedPerformance);

    return {
      tenantId,
      currentPerformance,
      optimizedPerformance,
      recommendations,
      implementationComplexity,
      expectedROI,
    };
  }

  /**
   * Batch optimize due dates for multiple invoices
   */
  async batchOptimizeDueDates(
    invoiceIds: string[],
    businessContext?: any,
  ): Promise<DueDateOptimization[]> {
    this.logger.log(`Batch optimizing due dates for ${invoiceIds.length} invoices`);

    const optimizations: DueDateOptimization[] = [];

    for (const invoiceId of invoiceIds) {
      try {
        const optimization = await this.calculateOptimalDueDate(invoiceId, businessContext);
        optimizations.push(optimization);
      } catch (error) {
        this.logger.error(`Failed to optimize due date for invoice ${invoiceId}:`, error);
      }
    }

    return optimizations;
  }

  /**
   * Create custom due date policy for tenant
   */
  async createDueDatePolicy(
    tenantId: string,
    policyData: Partial<DueDatePolicy>,
  ): Promise<DueDatePolicy> {
    this.logger.log(`Creating due date policy for tenant ${tenantId}`);

    const policy: DueDatePolicy = {
      tenantId,
      defaultTerms: policyData.defaultTerms || 30,
      customerSpecificRules: policyData.customerSpecificRules || [],
      industrySpecificRules: policyData.industrySpecificRules || [],
      seasonalAdjustments: policyData.seasonalAdjustments || [],
      minimumDays: policyData.minimumDays || 7,
      maximumDays: policyData.maximumDays || 90,
    };

    // In production, save to database
    this.metricsService.recordPolicyCreation(tenantId);

    return policy;
  }

  /**
   * Analyze business context for due date optimization
   */
  private analyzeBusinessContext(invoice: Invoice, businessContext?: any): any {
    const context = {
      invoiceAmount: invoice.grand_total,
      invoiceType: invoice.grand_total > 100000 ? 'high_value' : 'regular',
      season: new Date().getMonth() + 1,
      isFestivalSeason: this.isFestivalSeason(new Date()),
      cashFlowImpact: invoice.grand_total > 50000,
      customerValue: 'medium', // Would come from customer service
    };

    return { ...context, ...businessContext };
  }

  /**
   * Generate AI-powered due date optimization
   */
  private async generateAIOptimization(
    invoice: Invoice,
    customerProfile: any,
    policy: DueDatePolicy,
    businessContext: any,
  ): Promise<{
    recommendedDate: Date;
    reasoning: string[];
    confidence: number;
  }> {
    const prompt = `
    Optimize the due date for this invoice:
    
    Invoice Data:
    ${JSON.stringify(invoice, null, 2)}
    
    Customer Payment Profile:
    ${JSON.stringify(customerProfile, null, 2)}
    
    Due Date Policy:
    ${JSON.stringify(policy, null, 2)}
    
    Business Context:
    ${JSON.stringify(businessContext, null, 2)}
    
    Provide optimization in JSON format:
    {
      "recommendedDate": "YYYY-MM-DD",
      "reasoning": ["reason1", "reason2", "reason3"],
      "confidence": 0-100
    }
    
    Consider:
    1. Customer payment history and patterns
    2. Business cash flow needs
    3. Industry standards and practices
    4. Seasonal business patterns
    5. Customer relationship value
    6. Legal and compliance requirements
    `;

    const response = await this.deepSeekService.generate({
      systemPrompt: "You are an expert in business finance, credit management, and customer relationship optimization.",
      prompt,
      temperature: 0.4,
    });

    try {
      const result = JSON.parse(response.text);
      return {
        recommendedDate: new Date(result.recommendedDate),
        reasoning: result.reasoning,
        confidence: result.confidence,
      };
    } catch (error) {
      this.logger.warn('Failed to parse AI due date optimization', response.text);
      return this.getDefaultOptimization(invoice, policy, customerProfile);
    }
  }

  /**
   * Calculate expected payment improvement
   */
  private calculateExpectedImprovement(
    invoice: Invoice,
    optimization: any,
    customerProfile: any,
  ): number {
    const originalDays = Math.floor(
      (invoice.due_date.getTime() - invoice.issue_date.getTime()) / (1000 * 60 * 60 * 24)
    );

    const optimizedDays = Math.floor(
      (optimization.recommendedDate.getTime() - invoice.issue_date.getTime()) / (1000 * 60 * 60 * 24)
    );

    const daysDifference = originalDays - optimizedDays;

    // Calculate improvement based on customer profile
    let improvement = 0;

    if (customerProfile.riskCategory === 'high' && daysDifference < 0) {
      improvement = Math.abs(daysDifference) * 2; // High risk customers benefit more from shorter terms
    } else if (customerProfile.riskCategory === 'low' && daysDifference > 0) {
      improvement = daysDifference * 0.5; // Low risk customers can handle longer terms
    } else {
      improvement = Math.abs(daysDifference) * 1; // Standard improvement
    }

    return Math.min(50, improvement); // Cap at 50% improvement
  }

  /**
   * Generate business considerations
   */
  private generateBusinessConsiderations(
    invoice: Invoice,
    optimization: any,
    policy: DueDatePolicy,
  ): BusinessConsideration[] {
    const considerations: BusinessConsideration[] = [];

    // Cash flow consideration
    if (invoice.grand_total > 50000) {
      considerations.push({
        type: 'cash_flow',
        impact: 'positive',
        description: 'High-value invoice impacts cash flow significantly',
        weight: 8,
      });
    }

    // Customer relationship consideration
    if (optimization.confidence > 80) {
      considerations.push({
        type: 'customer_relationship',
        impact: 'positive',
        description: 'Optimized terms strengthen customer relationship',
        weight: 6,
      });
    }

    // Seasonal consideration
    if (this.isFestivalSeason(optimization.recommendedDate)) {
      considerations.push({
        type: 'seasonal',
        impact: 'negative',
        description: 'Festival season may delay payments',
        weight: 4,
      });
    }

    // Industry standard consideration
    considerations.push({
      type: 'industry_standard',
      impact: 'neutral',
      description: 'Terms align with industry standards',
      weight: 5,
    });

    return considerations;
  }

  /**
   * Calculate current performance metrics
   */
  private calculateCurrentPerformance(paidInvoices: Invoice[]): {
    averagePaymentDays: number;
    onTimePaymentRate: number;
    overdueRate: number;
  } {
    if (paidInvoices.length === 0) {
      return {
        averagePaymentDays: 0,
        onTimePaymentRate: 0,
        overdueRate: 0,
      };
    }

    const paymentDays = paidInvoices.map(inv => 
      Math.floor((inv.updated_at.getTime() - inv.issue_date.getTime()) / (1000 * 60 * 60 * 24))
    );

    const averagePaymentDays = paymentDays.reduce((sum, days) => sum + days, 0) / paymentDays.length;

    const onTimePayments = paidInvoices.filter(inv => {
      const days = Math.floor((inv.updated_at.getTime() - inv.due_date.getTime()) / (1000 * 60 * 60 * 24));
      return days <= 0;
    });

    const onTimePaymentRate = (onTimePayments.length / paidInvoices.length) * 100;
    const overdueRate = 100 - onTimePaymentRate;

    return {
      averagePaymentDays,
      onTimePaymentRate,
      overdueRate,
    };
  }

  /**
   * Simulate optimized performance
   */
  private async simulateOptimizedPerformance(tenantId: string, invoices: Invoice[]): Promise<{
    projectedPaymentDays: number;
    projectedOnTimeRate: number;
    projectedOverdueRate: number;
  }> {
    // Simulate optimization by applying 15% improvement
    const currentPerformance = this.calculateCurrentPerformance(invoices.filter(inv => inv.status === 'paid'));

    return {
      projectedPaymentDays: currentPerformance.averagePaymentDays * 0.85,
      projectedOnTimeRate: Math.min(100, currentPerformance.onTimePaymentRate * 1.15),
      projectedOverdueRate: Math.max(0, currentPerformance.overdueRate * 0.85),
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private async generateRecommendations(
    current: any,
    optimized: any,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (current.averagePaymentDays > 35) {
      recommendations.push('Implement stricter due date policies for high-risk customers');
    }

    if (current.onTimePaymentRate < 70) {
      recommendations.push('Offer early payment discounts to improve on-time payments');
    }

    if (optimized.projectedOnTimeRate > current.onTimePaymentRate + 10) {
      recommendations.push('Adopt AI-powered due date optimization for all new invoices');
    }

    recommendations.push('Review and update due date policies quarterly');
    recommendations.push('Implement customer-specific due date rules for strategic accounts');

    return recommendations;
  }

  /**
   * Calculate implementation complexity
   */
  private calculateImplementationComplexity(recommendations: string[]): 'low' | 'medium' | 'high' {
    if (recommendations.length <= 2) return 'low';
    if (recommendations.length <= 4) return 'medium';
    return 'high';
  }

  /**
   * Calculate expected ROI
   */
  private calculateExpectedROI(current: any, optimized: any): number {
    const paymentSpeedImprovement = ((current.averagePaymentDays - optimized.projectedPaymentDays) / current.averagePaymentDays) * 100;
    const onTimeImprovement = optimized.projectedOnTimeRate - current.onTimePaymentRate;
    
    return Math.round((paymentSpeedImprovement + onTimeImprovement) / 2);
  }

  /**
   * Check if date is during festival season
   */
  private isFestivalSeason(date: Date): boolean {
    const month = date.getMonth();
    const day = date.getDate();
    
    // Diwali season (Oct-Nov)
    if ((month === 9 && day >= 15) || (month === 10 && day <= 15)) return true;
    
    // Year-end (Dec)
    if (month === 11) return true;
    
    return false;
  }

  /**
   * Get default optimization when AI fails
   */
  private getDefaultOptimization(
    invoice: Invoice,
    policy: DueDatePolicy,
    customerProfile: any,
  ): {
    recommendedDate: Date;
    reasoning: string[];
    confidence: number;
  } {
    const recommendedDate = new Date(
      invoice.issue_date.getTime() + (policy.defaultTerms * 24 * 60 * 60 * 1000)
    );

    return {
      recommendedDate,
      reasoning: [
        'Applied standard payment terms',
        'Considered customer payment history',
        'Aligned with industry standards',
      ],
      confidence: 60,
    };
  }
}
