import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CreditAssessment } from '../entities/credit-assessment.entity';
import { RiskIndicator } from '../entities/risk-indicator.entity';
import { PaymentHistory } from '../entities/payment-history.entity';
import { RiskLevel } from '../enums/risk-level.enum';

/**
 * Service for generating advanced visualizations of credit risk profiles
 * Provides data transformation and formatting for various visualization types
 */
@Injectable()
export class CreditRiskVisualizationService {
  private readonly logger = new Logger(CreditRiskVisualizationService.name);
  private readonly isPremiumVisualizationEnabled: boolean;

  constructor(
    @InjectRepository(CreditAssessment)
    private creditAssessmentRepository: Repository<CreditAssessment>,
    @InjectRepository(RiskIndicator)
    private riskIndicatorRepository: Repository<RiskIndicator>,
    @InjectRepository(PaymentHistory)
    private paymentHistoryRepository: Repository<PaymentHistory>,
    private readonly configService: ConfigService,
  ) {
    // Load configuration
    this.isPremiumVisualizationEnabled = this.configService.get<boolean>('features.premiumVisualization', false);
    this.logger.log(`Credit Risk Visualization Service initialized. Premium visualization enabled: ${this.isPremiumVisualizationEnabled}`);
  }

  /**
   * Generate a comprehensive credit risk dashboard for a buyer
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID for multi-tenancy support
   * @returns Dashboard data for visualization
   */
  async generateCreditRiskDashboard(buyerId: string, tenantId: string): Promise<any> {
    this.logger.log(`Generating credit risk dashboard for buyer ${buyerId} in tenant ${tenantId}`);
    
    try {
      // Gather all required data
      const [
        creditScoreHistory,
        riskIndicators,
        paymentPerformance,
        creditUtilization,
        industryComparison,
      ] = await Promise.all([
        this.getCreditScoreHistory(buyerId, tenantId),
        this.getRiskIndicators(buyerId, tenantId),
        this.getPaymentPerformance(buyerId, tenantId),
        this.getCreditUtilization(buyerId, tenantId),
        this.getIndustryComparison(buyerId, tenantId),
      ]);
      
      // Add premium visualizations if enabled
      let premiumVisualizations = {};
      if (this.isPremiumVisualizationEnabled) {
        premiumVisualizations = await this.generatePremiumVisualizations(buyerId, tenantId);
      }
      
      // Combine all data into dashboard
      const dashboard = {
        buyerId,
        tenantId,
        timestamp: new Date(),
        creditScoreHistory,
        riskIndicators,
        paymentPerformance,
        creditUtilization,
        industryComparison,
        ...premiumVisualizations,
      };
      
      return dashboard;
    } catch (error) {
      this.logger.error(`Error generating credit risk dashboard: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get credit score history for a buyer
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID
   * @returns Credit score history data
   */
  async getCreditScoreHistory(buyerId: string, tenantId: string): Promise<any> {
    this.logger.debug(`Getting credit score history for buyer ${buyerId}`);
    
    try {
      // Get credit assessments for the buyer
      const assessments = await this.creditAssessmentRepository.find({
        where: { buyerId, tenantId },
        order: { assessmentDate: 'ASC' },
      });
      
      // Transform data for visualization
      const scoreHistory = assessments.map(assessment => ({
        date: assessment.assessmentDate,
        score: assessment.score,
        confidence: assessment.confidence,
        riskLevel: assessment.riskLevel,
      }));
      
      // Calculate trend indicators
      const trend = this.calculateTrend(scoreHistory.map(item => item.score));
      const latestScore = scoreHistory.length > 0 ? scoreHistory[scoreHistory.length - 1].score : null;
      const previousScore = scoreHistory.length > 1 ? scoreHistory[scoreHistory.length - 2].score : null;
      const scoreChange = latestScore !== null && previousScore !== null ? latestScore - previousScore : 0;
      const scoreChangePercent = previousScore ? (scoreChange / previousScore) * 100 : 0;
      
      return {
        history: scoreHistory,
        trend,
        latestScore,
        previousScore,
        scoreChange,
        scoreChangePercent,
        dataPoints: scoreHistory.length,
      };
    } catch (error) {
      this.logger.error(`Error getting credit score history: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get risk indicators for a buyer
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID
   * @returns Risk indicators data
   */
  async getRiskIndicators(buyerId: string, tenantId: string): Promise<any> {
    this.logger.debug(`Getting risk indicators for buyer ${buyerId}`);
    
    try {
      // Get risk indicators for the buyer
      const indicators = await this.riskIndicatorRepository.find({
        where: { buyerId, tenantId },
        order: { detectedAt: 'DESC' },
      });
      
      // Group by risk level
      const byRiskLevel = this.groupByRiskLevel(indicators);
      
      // Group by detection method
      const byDetectionMethod = this.groupByProperty(indicators, 'detectionMethod');
      
      // Group by type
      const byType = this.groupByProperty(indicators, 'type');
      
      // Calculate time-based metrics
      const timeBasedMetrics = this.calculateTimeBasedMetrics(indicators);
      
      return {
        total: indicators.length,
        byRiskLevel,
        byDetectionMethod,
        byType,
        timeBasedMetrics,
        latest: indicators.slice(0, 5).map(indicator => ({
          id: indicator.id,
          type: indicator.type,
          description: indicator.description,
          riskLevel: indicator.riskLevel,
          detectedAt: indicator.detectedAt,
          detectionMethod: indicator.detectionMethod,
        })),
      };
    } catch (error) {
      this.logger.error(`Error getting risk indicators: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get payment performance data for a buyer
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID
   * @returns Payment performance data
   */
  async getPaymentPerformance(buyerId: string, tenantId: string): Promise<any> {
    this.logger.debug(`Getting payment performance for buyer ${buyerId}`);
    
    try {
      // Get payment history for the buyer
      const payments = await this.paymentHistoryRepository.find({
        where: { buyerId, tenantId },
        order: { dueDate: 'ASC' },
      });
      
      // Calculate payment metrics
      const onTimeCount = payments.filter(p => p.daysLate <= 0).length;
      const late1To30Count = payments.filter(p => p.daysLate > 0 && p.daysLate <= 30).length;
      const late31To60Count = payments.filter(p => p.daysLate > 30 && p.daysLate <= 60).length;
      const late61To90Count = payments.filter(p => p.daysLate > 60 && p.daysLate <= 90).length;
      const late90PlusCount = payments.filter(p => p.daysLate > 90).length;
      
      const totalPayments = payments.length;
      const onTimePercent = totalPayments > 0 ? (onTimeCount / totalPayments) * 100 : 0;
      
      // Calculate average days late
      const totalDaysLate = payments.reduce((sum, p) => sum + Math.max(0, p.daysLate), 0);
      const averageDaysLate = totalPayments > 0 ? totalDaysLate / totalPayments : 0;
      
      // Calculate trend
      const monthlyData = this.calculateMonthlyPaymentMetrics(payments);
      
      return {
        summary: {
          totalPayments,
          onTimeCount,
          onTimePercent,
          late1To30Count,
          late31To60Count,
          late61To90Count,
          late90PlusCount,
          averageDaysLate,
        },
        distribution: [
          { category: 'On Time', count: onTimeCount },
          { category: '1-30 Days Late', count: late1To30Count },
          { category: '31-60 Days Late', count: late31To60Count },
          { category: '61-90 Days Late', count: late61To90Count },
          { category: '90+ Days Late', count: late90PlusCount },
        ],
        trend: monthlyData,
      };
    } catch (error) {
      this.logger.error(`Error getting payment performance: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get credit utilization data for a buyer
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID
   * @returns Credit utilization data
   */
  async getCreditUtilization(buyerId: string, tenantId: string): Promise<any> {
    this.logger.debug(`Getting credit utilization for buyer ${buyerId}`);
    
    try {
      // This would be implemented to fetch from credit limit repository
      // For now, return mock data
      const utilizationHistory = [];
      const now = new Date();
      
      // Generate 12 months of mock data
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const utilization = 0.4 + (Math.random() * 0.4); // Random between 40% and 80%
        
        utilizationHistory.push({
          date,
          utilization,
          limit: 100000,
          used: Math.round(100000 * utilization),
        });
      }
      
      // Calculate current utilization
      const current = utilizationHistory[utilizationHistory.length - 1];
      
      // Calculate trend
      const trend = this.calculateTrend(utilizationHistory.map(item => item.utilization));
      
      return {
        current: {
          utilization: current.utilization,
          limit: current.limit,
          used: current.used,
          available: current.limit - current.used,
        },
        history: utilizationHistory,
        trend,
      };
    } catch (error) {
      this.logger.error(`Error getting credit utilization: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get industry comparison data for a buyer
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID
   * @returns Industry comparison data
   */
  async getIndustryComparison(buyerId: string, tenantId: string): Promise<any> {
    this.logger.debug(`Getting industry comparison for buyer ${buyerId}`);
    
    try {
      // This would be implemented to fetch from industry benchmark repository
      // For now, return mock data
      
      // Get buyer's metrics
      const buyerScore = 75;
      const buyerPaymentDays = 12;
      const buyerUtilization = 0.65;
      
      // Mock industry averages
      const industryScore = 70;
      const industryPaymentDays = 15;
      const industryUtilization = 0.60;
      
      return {
        creditScore: {
          buyer: buyerScore,
          industry: industryScore,
          difference: buyerScore - industryScore,
          percentile: 65, // Mock percentile
        },
        paymentDays: {
          buyer: buyerPaymentDays,
          industry: industryPaymentDays,
          difference: industryPaymentDays - buyerPaymentDays, // Positive is good here (fewer days)
          percentile: 70, // Mock percentile
        },
        utilization: {
          buyer: buyerUtilization,
          industry: industryUtilization,
          difference: industryUtilization - buyerUtilization, // Positive is good here (lower utilization)
          percentile: 45, // Mock percentile
        },
      };
    } catch (error) {
      this.logger.error(`Error getting industry comparison: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate premium visualizations
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID
   * @returns Premium visualization data
   */
  private async generatePremiumVisualizations(buyerId: string, tenantId: string): Promise<any> {
    this.logger.debug(`Generating premium visualizations for buyer ${buyerId}`);
    
    try {
      // Generate advanced visualizations only available in premium tier
      const [
        riskHeatmap,
        paymentPrediction,
        financialRatios,
        geospatialRisk,
      ] = await Promise.all([
        this.generateRiskHeatmap(buyerId, tenantId),
        this.generatePaymentPrediction(buyerId, tenantId),
        this.generateFinancialRatios(buyerId, tenantId),
        this.generateGeospatialRisk(buyerId, tenantId),
      ]);
      
      return {
        riskHeatmap,
        paymentPrediction,
        financialRatios,
        geospatialRisk,
      };
    } catch (error) {
      this.logger.error(`Error generating premium visualizations: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate risk heatmap
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID
   * @returns Risk heatmap data
   */
  private async generateRiskHeatmap(buyerId: string, tenantId: string): Promise<any> {
    // This would be implemented to generate actual heatmap data
    // For now, return mock data
    return {
      dimensions: ['Payment Behavior', 'Financial Stability', 'Industry Risk', 'Credit History', 'External Factors'],
      data: [
        { dimension: 'Payment Behavior', risk: 0.3 },
        { dimension: 'Financial Stability', risk: 0.5 },
        { dimension: 'Industry Risk', risk: 0.7 },
        { dimension: 'Credit History', risk: 0.2 },
        { dimension: 'External Factors', risk: 0.4 },
      ],
    };
  }

  /**
   * Generate payment prediction
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID
   * @returns Payment prediction data
   */
  private async generatePaymentPrediction(buyerId: string, tenantId: string): Promise<any> {
    // This would be implemented to generate actual prediction data
    // For now, return mock data
    return {
      nextPayment: {
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        amount: 25000,
        onTimeProbability: 0.75,
        lateProbability: 0.20,
        defaultProbability: 0.05,
      },
      predictions: [
        { days: 0, probability: 0.75 },
        { days: 7, probability: 0.15 },
        { days: 14, probability: 0.05 },
        { days: 30, probability: 0.03 },
        { days: 60, probability: 0.02 },
      ],
    };
  }

  /**
   * Generate financial ratios
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID
   * @returns Financial ratios data
   */
  private async generateFinancialRatios(buyerId: string, tenantId: string): Promise<any> {
    // This would be implemented to generate actual financial ratio data
    // For now, return mock data
    return {
      currentRatio: {
        value: 1.8,
        industry: 1.5,
        trend: 'IMPROVING',
      },
      quickRatio: {
        value: 1.2,
        industry: 1.0,
        trend: 'STABLE',
      },
      debtToEquity: {
        value: 1.5,
        industry: 1.7,
        trend: 'IMPROVING',
      },
      returnOnAssets: {
        value: 0.12,
        industry: 0.10,
        trend: 'STABLE',
      },
      returnOnEquity: {
        value: 0.18,
        industry: 0.15,
        trend: 'IMPROVING',
      },
    };
  }

  /**
   * Generate geospatial risk
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID
   * @returns Geospatial risk data
   */
  private async generateGeospatialRisk(buyerId: string, tenantId: string): Promise<any> {
    // This would be implemented to generate actual geospatial risk data
    // For now, return mock data
    return {
      location: {
        state: 'Maharashtra',
        city: 'Mumbai',
        coordinates: {
          latitude: 19.076,
          longitude: 72.8777,
        },
      },
      regionalRisk: {
        overall: 'MEDIUM',
        economicGrowth: 'HIGH',
        politicalStability: 'MEDIUM',
        naturalDisasters: 'LOW',
        infrastructure: 'MEDIUM',
      },
      nearbyBuyers: [
        { distance: 5, riskLevel: 'LOW', count: 12 },
        { distance: 10, riskLevel: 'MEDIUM', count: 8 },
        { distance: 15, riskLevel: 'HIGH', count: 3 },
      ],
    };
  }

  /**
   * Calculate trend from a series of values
   * @param values Array of numeric values
   * @returns Trend indicator
   */
  private calculateTrend(values: number[]): string {
    if (values.length < 2) {
      return 'STABLE';
    }
    
    // Simple linear regression
    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    const sumX = indices.reduce((sum, x) => sum + x, 0);
    const sumY = values.reduce((sum, y) => sum + y, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = indices.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Determine trend based on slope
    if (Math.abs(slope) < 0.01) {
      return 'STABLE';
    } else if (slope > 0) {
      return 'IMPROVING';
    } else {
      return 'DECLINING';
    }
  }

  /**
   * Group risk indicators by risk level
   * @param indicators Array of risk indicators
   * @returns Grouped indicators
   */
  private groupByRiskLevel(indicators: RiskIndicator[]): any {
    const result = {};
    
    // Initialize with all risk levels
    Object.values(RiskLevel).forEach(level => {
      result[level] = 0;
    });
    
    // Count indicators by risk level
    indicators.forEach(indicator => {
      result[indicator.riskLevel] = (result[indicator.riskLevel] || 0) + 1;
    });
    
    return result;
  }

  /**
   * Group items by a property
   * @param items Array of items
   * @param property Property to group by
   * @returns Grouped items
   */
  private groupByProperty(items: any[], property: string): any {
    const result = {};
    
    items.forEach(item => {
      const value = item[property];
      result[value] = (result[value] || 0) + 1;
    });
    
    return result;
  }

  /**
   * Calculate time-based metrics for risk indicators
   * @param indicators Array of risk indicators
   * @returns Time-based metrics
   */
  private calculateTimeBasedMetrics(indicators: RiskIndicator[]): any {
    // Group by month
    const byMonth = {};
    
    indicators.forEach(indicator => {
      const date = new Date(indicator.detectedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = {
          month: monthKey,
          total: 0,
          byRiskLevel: {},
        };
        
        // Initialize with all risk levels
        Object.values(RiskLevel).forEach(level => {
          byMonth[monthKey].byRiskLevel[level] = 0;
        });
      }
      
      byMonth[monthKey].total += 1;
      byMonth[monthKey].byRiskLevel[indicator.riskLevel] += 1;
    });
    
    // Convert to array and sort by month
    const monthlyData = Object.values(byMonth).sort((a: any, b: any) => a.month.localeCompare(b.month));
    
    return {
      monthly: monthlyData,
    };
  }

  /**
   * Calculate monthly payment metrics
   * @param payments Array of payments
   * @returns Monthly payment metrics
   */
  private calculateMonthlyPaymentMetrics(payments: PaymentHistory[]): any[] {
    // Group by month
    const byMonth = {};
    
    payments.forEach(payment => {
      const date = new Date(payment.dueDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = {
          month: monthKey,
          total: 0,
          onTime: 0,
          late: 0,
          averageDaysLate: 0,
          totalAmount: 0,
        };
      }
      
      byMonth[monthKey].total += 1;
      byMonth[monthKey].totalAmount += payment.amount;
      
      if (payment.daysLate <= 0) {
        byMonth[monthKey].onTime += 1;
      } else {
        byMonth[monthKey].late += 1;
        byMonth[monthKey].averageDaysLate += payment.daysLate;
      }
    });
    
    // Calculate averages and convert to array
    Object.values(byMonth).forEach((month: any) => {
      if (month.late > 0) {
        month.averageDaysLate /= month.late;
      }
      month.onTimePercent = month.total > 0 ? (month.onTime / month.total) * 100 : 0;
    });
    
    // Sort by month
    return Object.values(byMonth).sort((a: any, b: any) => a.month.localeCompare(b.month));
  }

  /**
   * Generate a PDF report of the credit risk profile
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID
   * @returns PDF report data
   */
  async generatePdfReport(buyerId: string, tenantId: string): Promise<any> {
    this.logger.log(`Generating PDF report for buyer ${buyerId} in tenant ${tenantId}`);
    
    try {
      // Get dashboard data
      const dashboard = await this.generateCreditRiskDashboard(buyerId, tenantId);
      
      // This would be implemented to generate an actual PDF
      // For now, return the dashboard data
      return {
        format: 'pdf',
        data: dashboard,
        generatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error generating PDF report: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate an Excel report of the credit risk profile
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID
   * @returns Excel report data
   */
  async generateExcelReport(buyerId: string, tenantId: string): Promise<any> {
    this.logger.log(`Generating Excel report for buyer ${buyerId} in tenant ${tenantId}`);
    
    try {
      // Get dashboard data
      const dashboard = await this.generateCreditRiskDashboard(buyerId, tenantId);
      
      // This would be implemented to generate an actual Excel file
      // For now, return the dashboard data
      return {
        format: 'excel',
        data: dashboard,
        generatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error generating Excel report: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get visualization configuration options
   * @param tenantId The tenant ID
   * @returns Visualization configuration options
   */
  async getVisualizationOptions(tenantId: string): Promise<any> {
    this.logger.debug(`Getting visualization options for tenant ${tenantId}`);
    
    try {
      // This would be implemented to fetch from configuration repository
      // For now, return default options
      return {
        colorSchemes: [
          {
            id: 'default',
            name: 'Default',
            colors: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'],
          },
          {
            id: 'monochrome',
            name: 'Monochrome',
            colors: ['#000000', '#252525', '#525252', '#737373', '#969696', '#bdbdbd', '#d9d9d9', '#f0f0f0'],
          },
          {
            id: 'colorblind',
            name: 'Colorblind Safe',
            colors: ['#1170aa', '#fc7d0b', '#a3acb9', '#57606c', '#5fa2ce', '#c85200', '#7b848f', '#a3cce9', '#ffbc79', '#c8d0d9'],
          },
        ],
        chartTypes: [
          {
            id: 'line',
            name: 'Line Chart',
            supportedDataTypes: ['time-series', 'numeric'],
          },
          {
            id: 'bar',
            name: 'Bar Chart',
            supportedDataTypes: ['categorical', 'numeric'],
          },
          {
            id: 'pie',
            name: 'Pie Chart',
            supportedDataTypes: ['categorical'],
          },
          {
            id: 'scatter',
            name: 'Scatter Plot',
            supportedDataTypes: ['numeric'],
            premium: true,
          },
          {
            id: 'heatmap',
            name: 'Heat Map',
            supportedDataTypes: ['matrix'],
            premium: true,
          },
          {
            id: 'radar',
            name: 'Radar Chart',
            supportedDataTypes: ['multi-dimensional'],
            premium: true,
          },
        ],
        defaultOptions: {
          colorScheme: 'default',
          showLegend: true,
          showTooltips: true,
          showDataLabels: false,
          animationDuration: 500,
        },
        premiumFeaturesEnabled: this.isPremiumVisualizationEnabled,
      };
    } catch (error) {
      this.logger.error(`Error getting visualization options: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Save user visualization preferences
   * @param tenantId The tenant ID
   * @param userId The user ID
   * @param preferences The visualization preferences
   * @returns The saved preferences
   */
  async saveVisualizationPreferences(tenantId: string, userId: string, preferences: any): Promise<any> {
    this.logger.log(`Saving visualization preferences for user ${userId} in tenant ${tenantId}`);
    
    try {
      // This would be implemented to save to preferences repository
      // For now, return the preferences
      return {
        tenantId,
        userId,
        preferences,
        savedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error saving visualization preferences: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get user visualization preferences
   * @param tenantId The tenant ID
   * @param userId The user ID
   * @returns The user's visualization preferences
   */
  async getVisualizationPreferences(tenantId: string, userId: string): Promise<any> {
    this.logger.debug(`Getting visualization preferences for user ${userId} in tenant ${tenantId}`);
    
    try {
      // This would be implemented to fetch from preferences repository
      // For now, return default preferences
      return {
        tenantId,
        userId,
        preferences: {
          colorScheme: 'default',
          showLegend: true,
          showTooltips: true,
          showDataLabels: false,
          animationDuration: 500,
          defaultChartType: 'line',
        },
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error getting visualization preferences: ${error.message}`, error.stack);
      throw error;
    }
  }
}
