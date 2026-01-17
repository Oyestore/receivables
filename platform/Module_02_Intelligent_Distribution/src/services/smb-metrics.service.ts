import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { DistributionRecord } from '../../distribution/entities/distribution-record.entity';
import { MessageHistory } from '../../personalization/entities/message-history.entity';
import { FollowUpStep } from '../../follow-up/entities/follow-up-step.entity';

/**
 * Service for SMB-focused analytics metrics
 * Provides specialized metrics for small and medium businesses to improve receivables management
 */
@Injectable()
export class SmbMetricsService {
  private readonly logger = new Logger(SmbMetricsService.name);

  constructor(
    @InjectRepository(DistributionRecord)
    private distributionRecordRepository: Repository<DistributionRecord>,
    @InjectRepository(MessageHistory)
    private messageHistoryRepository: Repository<MessageHistory>,
    @InjectRepository(FollowUpStep)
    private followUpStepRepository: Repository<FollowUpStep>,
  ) {}

  /**
   * Calculate Days Sales Outstanding (DSO)
   * Measures the average number of days it takes to collect payment after invoice issuance
   * @param timeRange Optional time range filter
   * @returns DSO metrics
   */
  async calculateDSO(timeRange?: { startDate: Date; endDate: Date }) {
    this.logger.log('Calculating DSO metrics');
    
    try {
      const query = this.distributionRecordRepository.createQueryBuilder('distribution')
        .select('AVG(EXTRACT(EPOCH FROM (distribution.paymentDate - distribution.invoiceDate)) / 86400)', 'dso')
        .where('distribution.paymentDate IS NOT NULL');
      
      if (timeRange) {
        query.andWhere('distribution.invoiceDate BETWEEN :startDate AND :endDate', {
          startDate: timeRange.startDate,
          endDate: timeRange.endDate,
        });
      }
      
      const result = await query.getRawOne();
      
      // Calculate DSO by invoice size
      const dsoBySize = await this.calculateDSOByInvoiceSize(timeRange);
      
      // Calculate DSO trend
      const dsoTrend = await this.calculateDSOTrend(timeRange);
      
      return {
        overall: parseFloat(result.dso) || 0,
        byInvoiceSize: dsoBySize,
        trend: dsoTrend,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error calculating DSO metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate Collection Effectiveness Index (CEI)
   * Measures the effectiveness of collection efforts
   * @param timeRange Optional time range filter
   * @returns CEI metrics
   */
  async calculateCEI(timeRange?: { startDate: Date; endDate: Date }) {
    this.logger.log('Calculating CEI metrics');
    
    try {
      // Get beginning receivables
      const beginningReceivables = await this.getBeginningReceivables(timeRange);
      
      // Get ending receivables
      const endingReceivables = await this.getEndingReceivables(timeRange);
      
      // Get total credit sales
      const totalCreditSales = await this.getTotalCreditSales(timeRange);
      
      // Calculate CEI
      const cei = beginningReceivables > 0 
        ? ((beginningReceivables + totalCreditSales - endingReceivables) / (beginningReceivables + totalCreditSales)) * 100
        : 0;
      
      // Calculate CEI by customer segment
      const ceiBySegment = await this.calculateCEIByCustomerSegment(timeRange);
      
      // Calculate CEI trend
      const ceiTrend = await this.calculateCEITrend(timeRange);
      
      return {
        overall: cei,
        byCustomerSegment: ceiBySegment,
        trend: ceiTrend,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error calculating CEI metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate Invoice Aging Analysis
   * Categorizes invoices by age and provides aging metrics
   * @param asOfDate Date to calculate aging as of (defaults to current date)
   * @returns Aging analysis metrics
   */
  async calculateAgingAnalysis(asOfDate: Date = new Date()) {
    this.logger.log('Calculating invoice aging analysis');
    
    try {
      const today = asOfDate;
      
      // Define aging buckets
      const agingBuckets = {
        current: { count: 0, amount: 0 },
        '1-30': { count: 0, amount: 0 },
        '31-60': { count: 0, amount: 0 },
        '61-90': { count: 0, amount: 0 },
        '90+': { count: 0, amount: 0 },
      };
      
      // Get all unpaid invoices
      const unpaidInvoices = await this.distributionRecordRepository.find({
        where: { paymentDate: null },
      });
      
      // Categorize invoices by age
      for (const invoice of unpaidInvoices) {
        const dueDate = invoice.dueDate;
        const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysPastDue <= 0) {
          agingBuckets.current.count++;
          agingBuckets.current.amount += invoice.amount;
        } else if (daysPastDue <= 30) {
          agingBuckets['1-30'].count++;
          agingBuckets['1-30'].amount += invoice.amount;
        } else if (daysPastDue <= 60) {
          agingBuckets['31-60'].count++;
          agingBuckets['31-60'].amount += invoice.amount;
        } else if (daysPastDue <= 90) {
          agingBuckets['61-90'].count++;
          agingBuckets['61-90'].amount += invoice.amount;
        } else {
          agingBuckets['90+'].count++;
          agingBuckets['90+'].amount += invoice.amount;
        }
      }
      
      // Calculate aging trends
      const agingTrends = await this.calculateAgingTrends();
      
      // Calculate risk assessment
      const riskAssessment = await this.calculateRiskAssessment(agingBuckets);
      
      return {
        agingBuckets,
        totalUnpaid: unpaidInvoices.length,
        totalUnpaidAmount: unpaidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0),
        agingTrends,
        riskAssessment,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error calculating aging analysis: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate Customer Payment Behavior metrics
   * Analyzes customer payment patterns and reliability
   * @returns Customer payment behavior metrics
   */
  async calculateCustomerPaymentBehavior() {
    this.logger.log('Calculating customer payment behavior metrics');
    
    try {
      // Get all customers with their payment history
      const customers = await this.getCustomersWithPaymentHistory();
      
      // Calculate payment scores
      const paymentScores = this.calculatePaymentScores(customers);
      
      // Calculate payment consistency
      const paymentConsistency = this.calculatePaymentConsistency(customers);
      
      // Calculate relationship impact
      const relationshipImpact = await this.calculateRelationshipImpact();
      
      return {
        paymentScores,
        paymentConsistency,
        relationshipImpact,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error calculating customer payment behavior: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate Cash Flow Forecasting
   * Projects incoming payments based on invoice due dates and historical payment patterns
   * @param forecastPeriod Number of days to forecast (default: 90)
   * @returns Cash flow forecast metrics
   */
  async calculateCashFlowForecast(forecastPeriod: number = 90) {
    this.logger.log(`Calculating cash flow forecast for ${forecastPeriod} days`);
    
    try {
      const today = new Date();
      const forecastEndDate = new Date(today);
      forecastEndDate.setDate(today.getDate() + forecastPeriod);
      
      // Get all unpaid invoices due within the forecast period
      const unpaidInvoices = await this.distributionRecordRepository.find({
        where: {
          paymentDate: null,
          dueDate: Between(today, forecastEndDate),
        },
      });
      
      // Get historical payment patterns
      const paymentPatterns = await this.getHistoricalPaymentPatterns();
      
      // Generate daily forecast
      const dailyForecast = [];
      for (let i = 0; i < forecastPeriod; i++) {
        const forecastDate = new Date(today);
        forecastDate.setDate(today.getDate() + i);
        
        // Get invoices due on this date
        const dueInvoices = unpaidInvoices.filter(invoice => {
          const invoiceDueDate = new Date(invoice.dueDate);
          return (
            invoiceDueDate.getDate() === forecastDate.getDate() &&
            invoiceDueDate.getMonth() === forecastDate.getMonth() &&
            invoiceDueDate.getFullYear() === forecastDate.getFullYear()
          );
        });
        
        // Calculate expected payment amount based on historical patterns
        const expectedAmount = dueInvoices.reduce((sum, invoice) => {
          const customerPattern = paymentPatterns[invoice.recipientId] || paymentPatterns.default;
          return sum + (invoice.amount * customerPattern.paymentProbability);
        }, 0);
        
        dailyForecast.push({
          date: forecastDate,
          dueInvoices: dueInvoices.length,
          dueAmount: dueInvoices.reduce((sum, invoice) => sum + invoice.amount, 0),
          expectedPaymentAmount: expectedAmount,
        });
      }
      
      // Calculate weekly and monthly aggregates
      const weeklyForecast = this.aggregateForecastByPeriod(dailyForecast, 7);
      const monthlyForecast = this.aggregateForecastByPeriod(dailyForecast, 30);
      
      return {
        dailyForecast,
        weeklyForecast,
        monthlyForecast,
        totalForecastAmount: dailyForecast.reduce((sum, day) => sum + day.expectedPaymentAmount, 0),
        forecastConfidence: this.calculateForecastConfidence(paymentPatterns),
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error calculating cash flow forecast: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate Channel Effectiveness metrics
   * Analyzes the effectiveness and ROI of different communication channels
   * @returns Channel effectiveness metrics
   */
  async calculateChannelEffectiveness() {
    this.logger.log('Calculating channel effectiveness metrics');
    
    try {
      // Calculate channel ROI
      const channelROI = await this.calculateChannelROI();
      
      // Calculate response time analysis
      const responseTimeAnalysis = await this.calculateResponseTimeAnalysis();
      
      // Calculate channel preference
      const channelPreference = await this.calculateChannelPreference();
      
      return {
        channelROI,
        responseTimeAnalysis,
        channelPreference,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error calculating channel effectiveness: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate Follow-up Effectiveness metrics
   * Analyzes the impact of follow-ups on payment timing and behavior
   * @returns Follow-up effectiveness metrics
   */
  async calculateFollowUpEffectiveness() {
    this.logger.log('Calculating follow-up effectiveness metrics');
    
    try {
      // Calculate follow-up to payment correlation
      const followUpToPaymentCorrelation = await this.calculateFollowUpToPaymentCorrelation();
      
      // Calculate optimal follow-up timing
      const optimalFollowUpTiming = await this.calculateOptimalFollowUpTiming();
      
      // Calculate message style impact
      const messageStyleImpact = await this.calculateMessageStyleImpact();
      
      return {
        followUpToPaymentCorrelation,
        optimalFollowUpTiming,
        messageStyleImpact,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error calculating follow-up effectiveness: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Helper methods for DSO calculations
  private async calculateDSOByInvoiceSize(timeRange?: { startDate: Date; endDate: Date }) {
    // Implementation would calculate DSO for different invoice size categories
    return {
      small: 15.3, // Invoices < $1,000
      medium: 22.7, // Invoices $1,000 - $10,000
      large: 35.2, // Invoices > $10,000
    };
  }

  private async calculateDSOTrend(timeRange?: { startDate: Date; endDate: Date }) {
    // Implementation would calculate DSO trend over time
    return {
      weekly: [
        { date: '2025-05-14', value: 24.3 },
        { date: '2025-05-07', value: 25.1 },
        { date: '2025-04-30', value: 26.8 },
        { date: '2025-04-23', value: 27.5 },
      ],
      monthly: [
        { date: '2025-05', value: 24.7 },
        { date: '2025-04', value: 27.2 },
        { date: '2025-03', value: 29.5 },
        { date: '2025-02', value: 31.8 },
      ],
    };
  }

  // Helper methods for CEI calculations
  private async getBeginningReceivables(timeRange?: { startDate: Date; endDate: Date }) {
    // Implementation would calculate beginning receivables
    return 250000;
  }

  private async getEndingReceivables(timeRange?: { startDate: Date; endDate: Date }) {
    // Implementation would calculate ending receivables
    return 175000;
  }

  private async getTotalCreditSales(timeRange?: { startDate: Date; endDate: Date }) {
    // Implementation would calculate total credit sales
    return 300000;
  }

  private async calculateCEIByCustomerSegment(timeRange?: { startDate: Date; endDate: Date }) {
    // Implementation would calculate CEI by customer segment
    return {
      'new-customers': 72.5,
      'repeat-customers': 85.3,
      'vip-customers': 92.1,
    };
  }

  private async calculateCEITrend(timeRange?: { startDate: Date; endDate: Date }) {
    // Implementation would calculate CEI trend over time
    return {
      weekly: [
        { date: '2025-05-14', value: 83.2 },
        { date: '2025-05-07', value: 81.5 },
        { date: '2025-04-30', value: 79.8 },
        { date: '2025-04-23', value: 78.3 },
      ],
      monthly: [
        { date: '2025-05', value: 82.4 },
        { date: '2025-04', value: 79.1 },
        { date: '2025-03', value: 76.5 },
        { date: '2025-02', value: 74.2 },
      ],
    };
  }

  // Helper methods for Aging Analysis
  private async calculateAgingTrends() {
    // Implementation would calculate aging trends over time
    return {
      weekly: [
        {
          date: '2025-05-14',
          current: 45,
          '1-30': 30,
          '31-60': 15,
          '61-90': 7,
          '90+': 3,
        },
        {
          date: '2025-05-07',
          current: 42,
          '1-30': 32,
          '31-60': 16,
          '61-90': 8,
          '90+': 2,
        },
        // Additional weeks...
      ],
      monthly: [
        {
          date: '2025-05',
          current: 44,
          '1-30': 31,
          '31-60': 15,
          '61-90': 7,
          '90+': 3,
        },
        {
          date: '2025-04',
          current: 40,
          '1-30': 33,
          '31-60': 17,
          '61-90': 8,
          '90+': 2,
        },
        // Additional months...
      ],
    };
  }

  private async calculateRiskAssessment(agingBuckets: any) {
    // Implementation would calculate risk assessment based on aging buckets
    const highRiskAmount = agingBuckets['61-90'].amount + agingBuckets['90+'].amount;
    const totalAmount = Object.values(agingBuckets).reduce((sum: number, bucket: any) => sum + bucket.amount, 0);
    
    return {
      highRiskPercentage: totalAmount > 0 ? (highRiskAmount / totalAmount) * 100 : 0,
      highRiskInvoices: agingBuckets['61-90'].count + agingBuckets['90+'].count,
      riskByCustomer: [
        { customerId: 'C1001', name: 'Acme Corp', riskScore: 85, overdueAmount: 125
(Content truncated due to size limit. Use line ranges to read in chunks)