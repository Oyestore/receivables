import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FinancialInsight } from '../entities/financial-insight.entity';
import { Invoice } from '../../../invoices/entities/invoice.entity';
import { PaymentTransaction } from '../../entities/payment-transaction.entity';
import { FinancingRequest } from '../../financing/entities/financing-request.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { FinancialIntelligenceService } from './financial-intelligence.service';

/**
 * Interface for cash flow optimization recommendation
 */
interface CashFlowRecommendation {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  timeframe: 'immediate' | 'short_term' | 'long_term';
  category: string;
  actionSteps: string[];
  expectedBenefit: string;
  metrics: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Service for generating data-driven cash flow optimization recommendations
 */
@Injectable()
export class CashFlowOptimizationService {
  private readonly logger = new Logger(CashFlowOptimizationService.name);

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
    private readonly financialIntelligenceService: FinancialIntelligenceService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Generate cash flow optimization recommendations
   */
  async generateRecommendations(
    organizationId: string,
  ): Promise<CashFlowRecommendation[]> {
    try {
      this.logger.log(`Generating cash flow optimization recommendations for organization: ${organizationId}`);
      
      // Get organization
      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
      });
      
      if (!organization) {
        throw new Error('Organization not found');
      }
      
      // Get real-time financial intelligence
      const intelligence = await this.financialIntelligenceService.generateRealTimeIntelligence(organizationId);
      
      // Initialize recommendations array
      const recommendations: CashFlowRecommendation[] = [];
      
      // Generate recommendations based on financial intelligence
      await this.analyzeReceivablesHealth(organizationId, intelligence, recommendations);
      await this.analyzePaymentTerms(organizationId, intelligence, recommendations);
      await this.analyzeFinancingOptions(organizationId, intelligence, recommendations);
      await this.analyzeInvoicingStrategies(organizationId, intelligence, recommendations);
      await this.analyzeCustomerSegmentation(organizationId, intelligence, recommendations);
      
      // Sort recommendations by impact (high to low)
      recommendations.sort((a, b) => {
        const impactOrder = { high: 0, medium: 1, low: 2 };
        return impactOrder[a.impact] - impactOrder[b.impact];
      });
      
      return recommendations;
    } catch (error) {
      this.logger.error(`Error generating cash flow optimization recommendations: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Analyze receivables health and generate recommendations
   */
  private async analyzeReceivablesHealth(
    organizationId: string,
    intelligence: any,
    recommendations: CashFlowRecommendation[],
  ): Promise<void> {
    try {
      const { receivablesHealth } = intelligence;
      
      // Check DSO (Days Sales Outstanding)
      if (receivablesHealth.averageDSO > 45) {
        recommendations.push({
          id: this.generateUniqueId(),
          title: 'Reduce Days Sales Outstanding (DSO)',
          description: `Your average DSO of ${Math.round(receivablesHealth.averageDSO)} days is higher than the recommended 30-45 days. Reducing DSO can significantly improve your cash flow.`,
          impact: receivablesHealth.averageDSO > 60 ? 'high' : 'medium',
          timeframe: 'short_term',
          category: 'receivables_management',
          actionSteps: [
            'Implement early payment incentives (1-2% discount for payments within 10 days)',
            'Review and optimize your invoicing process to eliminate delays',
            'Set up automated payment reminders at 7, 3, and 1 days before due date',
            'Consider offering multiple payment methods to make it easier for customers to pay',
          ],
          expectedBenefit: `Reducing DSO by 15 days could free up approximately ₹${this.formatCurrency(this.calculateDSOImpact(receivablesHealth))} in cash flow.`,
          metrics: {
            currentDSO: receivablesHealth.averageDSO,
            targetDSO: Math.min(30, receivablesHealth.averageDSO * 0.7),
            potentialCashFlowImprovement: this.calculateDSOImpact(receivablesHealth),
          },
        });
      }
      
      // Check overdue percentage
      if (receivablesHealth.overduePercentage > 20) {
        recommendations.push({
          id: this.generateUniqueId(),
          title: 'Reduce Overdue Receivables',
          description: `${Math.round(receivablesHealth.overduePercentage)}% of your receivables are currently overdue. Reducing this percentage can improve cash flow predictability and reduce bad debt risk.`,
          impact: receivablesHealth.overduePercentage > 30 ? 'high' : 'medium',
          timeframe: 'immediate',
          category: 'collections_management',
          actionSteps: [
            'Implement a structured follow-up process for overdue invoices',
            'Prioritize collection efforts on oldest and largest overdue invoices',
            'Consider offering payment plans for customers with large overdue balances',
            'Review credit terms for customers with consistent late payment history',
          ],
          expectedBenefit: `Converting half of your overdue receivables to on-time payments could provide immediate access to ₹${this.formatCurrency(receivablesHealth.overdueAmount / 2)}.`,
          metrics: {
            currentOverduePercentage: receivablesHealth.overduePercentage,
            targetOverduePercentage: 15,
            currentOverdueAmount: receivablesHealth.overdueAmount,
            potentialCashFlowImprovement: receivablesHealth.overdueAmount / 2,
          },
        });
      }
      
      // Check if there are enough invoices to implement a structured approach
      if (receivablesHealth.invoiceCount > 20) {
        recommendations.push({
          id: this.generateUniqueId(),
          title: 'Implement Structured Receivables Management',
          description: 'With your invoice volume, a structured approach to receivables management could significantly improve cash flow predictability and reduce collection efforts.',
          impact: 'medium',
          timeframe: 'short_term',
          category: 'process_optimization',
          actionSteps: [
            'Segment customers based on payment behavior and invoice size',
            'Implement differentiated collection strategies for each segment',
            'Set up automated workflows for invoice delivery, reminders, and follow-ups',
            'Establish clear escalation procedures for severely overdue accounts',
          ],
          expectedBenefit: 'A structured approach typically reduces DSO by 20% and overdue receivables by 30% within 3 months.',
          metrics: {
            currentInvoiceCount: receivablesHealth.invoiceCount,
            currentOverdueCount: receivablesHealth.overdueInvoiceCount,
            potentialDSOReduction: receivablesHealth.averageDSO * 0.2,
            potentialOverdueReduction: receivablesHealth.overdueAmount * 0.3,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Error analyzing receivables health: ${error.message}`, error.stack);
    }
  }

  /**
   * Analyze payment terms and generate recommendations
   */
  private async analyzePaymentTerms(
    organizationId: string,
    intelligence: any,
    recommendations: CashFlowRecommendation[],
  ): Promise<void> {
    try {
      // Get recent invoices
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentInvoices = await this.invoiceRepository.find({
        where: {
          organizationId,
          createdAt: MoreThan(thirtyDaysAgo),
        },
      });
      
      // Analyze payment terms
      const paymentTermsMap: Record<number, number> = {};
      let totalInvoices = 0;
      
      for (const invoice of recentInvoices) {
        if (invoice.paymentTerms) {
          const days = invoice.paymentTerms;
          paymentTermsMap[days] = (paymentTermsMap[days] || 0) + 1;
          totalInvoices++;
        }
      }
      
      // Check if payment terms are too long
      const longTermsCount = Object.entries(paymentTermsMap)
        .filter(([days, count]) => Number(days) > 30)
        .reduce((sum, [days, count]) => sum + count, 0);
      
      const longTermsPercentage = totalInvoices > 0 ? (longTermsCount / totalInvoices) * 100 : 0;
      
      if (longTermsPercentage > 50) {
        recommendations.push({
          id: this.generateUniqueId(),
          title: 'Optimize Payment Terms',
          description: `${Math.round(longTermsPercentage)}% of your invoices have payment terms longer than 30 days. Shortening payment terms can significantly improve cash flow.`,
          impact: 'high',
          timeframe: 'short_term',
          category: 'payment_terms',
          actionSteps: [
            'Gradually reduce payment terms for new customers to 30 days or less',
            'Negotiate shorter payment terms with existing customers',
            'Offer early payment incentives to encourage faster payments',
            'Consider differentiated payment terms based on customer segments',
          ],
          expectedBenefit: 'Reducing payment terms by 15 days across your customer base could improve cash flow cycle by two weeks.',
          metrics: {
            currentLongTermsPercentage: longTermsPercentage,
            targetLongTermsPercentage: 20,
            averageCurrentTerms: this.calculateAveragePaymentTerms(paymentTermsMap, totalInvoices),
            recommendedTerms: 30,
          },
        });
      }
      
      // Check if payment terms are inconsistent
      if (Object.keys(paymentTermsMap).length > 3 && totalInvoices > 10) {
        recommendations.push({
          id: this.generateUniqueId(),
          title: 'Standardize Payment Terms',
          description: `You're currently using ${Object.keys(paymentTermsMap).length} different payment terms across your invoices. Standardizing terms can simplify receivables management and improve cash flow predictability.`,
          impact: 'medium',
          timeframe: 'immediate',
          category: 'payment_terms',
          actionSteps: [
            'Define 2-3 standard payment terms for different customer segments',
            'Update your invoicing templates to use standardized terms',
            'Communicate changes to customers with sufficient notice',
            'Monitor the impact on payment behavior after standardization',
          ],
          expectedBenefit: 'Standardized payment terms typically improve payment compliance by 15-20% and reduce administrative overhead.',
          metrics: {
            currentTermsVariations: Object.keys(paymentTermsMap).length,
            recommendedVariations: 3,
            mostCommonTerms: this.findMostCommonPaymentTerms(paymentTermsMap),
          },
        });
      }
      
      // Check if early payment discounts are being used
      const discountedInvoices = recentInvoices.filter(invoice => 
        invoice.metadata && 
        invoice.metadata.earlyPaymentDiscount && 
        invoice.metadata.earlyPaymentDiscount.percentage > 0
      );
      
      const discountPercentage = totalInvoices > 0 ? (discountedInvoices.length / totalInvoices) * 100 : 0;
      
      if (discountPercentage < 20 && intelligence.receivablesHealth.averageDSO > 40) {
        recommendations.push({
          id: this.generateUniqueId(),
          title: 'Implement Early Payment Discounts',
          description: 'Only a small percentage of your invoices include early payment incentives. Implementing strategic discounts can accelerate collections and improve cash flow.',
          impact: 'medium',
          timeframe: 'immediate',
          category: 'payment_incentives',
          actionSteps: [
            'Implement a standard early payment discount (e.g., 2% if paid within 10 days)',
            'Clearly communicate discount terms on invoices',
            'Track the adoption rate and impact on payment timing',
            'Adjust discount percentages based on results',
          ],
          expectedBenefit: `If 30% of customers take advantage of early payment discounts, you could reduce DSO by approximately ${Math.round(intelligence.receivablesHealth.averageDSO * 0.3)} days.`,
          metrics: {
            currentDiscountedPercentage: discountPercentage,
            recommendedDiscountedPercentage: 50,
            suggestedDiscountRate: '2%',
            suggestedDiscountWindow: '10 days',
            potentialDSOReduction: intelligence.receivablesHealth.averageDSO * 0.3,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Error analyzing payment terms: ${error.message}`, error.stack);
    }
  }

  /**
   * Analyze financing options and generate recommendations
   */
  private async analyzeFinancingOptions(
    organizationId: string,
    intelligence: any,
    recommendations: CashFlowRecommendation[],
  ): Promise<void> {
    try {
      const { receivablesHealth, financingStatus } = intelligence;
      
      // Check if organization is using financing
      const isUsingFinancing = financingStatus.activeFinancingCount > 0;
      
      // Check if organization has significant overdue receivables
      if (receivablesHealth.overdueAmount > 100000 && !isUsingFinancing) {
        recommendations.push({
          id: this.generateUniqueId(),
          title: 'Consider Invoice Financing for Overdue Receivables',
          description: `You have ₹${this.formatCurrency(receivablesHealth.overdueAmount)} in overdue receivables that could be converted to immediate cash flow through invoice financing.`,
          impact: 'high',
          timeframe: 'immediate',
          category: 'financing_strategy',
          actionSteps: [
            'Identify high-value, overdue invoices from creditworthy customers',
            'Explore invoice financing options through the platform',
            'Compare financing costs against the benefits of immediate cash flow',
            'Implement a selective financing strategy for suitable invoices',
          ],
          expectedBenefit: `Converting 70% of overdue receivables to cash could provide immediate access to approximately ₹${this.formatCurrency(receivablesHealth.overdueAmount * 0.7)}.`,
          metrics: {
            eligibleOverdueAmount: receivablesHealth.overdueAmount,
            potentialFinancingAmount: receivablesHealth.overdueAmount * 0.7,
            estimatedFinancingCost: receivablesHealth.overdueAmount * 0.7 * 0.015, // Assuming 1.5% fee
            netBenefit: receivablesHealth.overdueAmount * 0.7 * 0.985,
          },
     
(Content truncated due to size limit. Use line ranges to read in chunks)