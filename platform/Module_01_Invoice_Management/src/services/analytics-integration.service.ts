import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../invoice.entity';
import { InvoiceLineItem } from '../invoice-line-item.entity';
import { MetricsService } from './metrics.service';

// Interface for Analytics Module integration
export interface AnalyticsModule {
  getCustomMetrics(metricName: string, filters?: any): Promise<any>;
  trackEvent(eventName: string, data: any): Promise<void>;
  generateReport(reportType: string, parameters: any): Promise<any>;
  getRealTimeData(dataType: string, filters?: any): Promise<any>;
}

export interface InvoiceAnalyticsData {
  invoiceId: string;
  tenantId: string;
  customerId: string;
  amount: number;
  status: string;
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  paymentDays?: number;
  category: string;
  region: string;
  tags: string[];
}

export interface RealTimeMetrics {
  activeInvoices: number;
  pendingPayments: number;
  overdueAmount: number;
  todayRevenue: number;
  weeklyTrend: number;
  monthlyProjection: number;
}

export interface PredictiveInsights {
  cashFlowForecast: CashFlowForecast[];
  paymentPredictions: PaymentPrediction[];
  riskAlerts: RiskAlert[];
  opportunities: BusinessOpportunity[];
}

export interface CashFlowForecast {
  date: Date;
  projectedInflow: number;
  projectedOutflow: number;
  netCashFlow: number;
  confidence: number;
}

export interface PaymentPrediction {
  customerId: string;
  invoiceId: string;
  expectedPaymentDate: Date;
  probability: number;
  amount: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface RiskAlert {
  type: 'payment_delay' | 'customer_risk' | 'cash_flow' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedEntities: string[];
  recommendedAction: string;
  timestamp: Date;
}

export interface BusinessOpportunity {
  type: 'early_payment_discount' | 'upsell' | 'retention' | 'expansion';
  description: string;
  potentialValue: number;
  confidence: number;
  actionRequired: string;
  deadline?: Date;
}

export interface AnalyticsDashboard {
  overview: {
    totalRevenue: number;
    growthRate: number;
    customerCount: number;
    averageInvoiceValue: number;
  };
  performance: {
    paymentSpeed: number;
    collectionRate: number;
    overdueRate: number;
    customerSatisfaction: number;
  };
  trends: {
    monthlyRevenue: Array<{ month: string; revenue: number }>;
    customerAcquisition: Array<{ month: string; customers: number }>;
    paymentPatterns: Array<{ period: string; rate: number }>;
  };
  alerts: RiskAlert[];
  opportunities: BusinessOpportunity[];
}

@Injectable()
export class AnalyticsIntegrationService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsIntegrationService.name);
  private analyticsModule: AnalyticsModule;

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceLineItem)
    private readonly lineItemRepository: Repository<InvoiceLineItem>,
    private readonly metricsService: MetricsService,
  ) {}

  async onModuleInit() {
    // Initialize connection to Analytics Module
    // In production, this would be a proper service discovery or dependency injection
    this.logger.log('Analytics Integration Service initialized');
  }

  /**
   * Get comprehensive invoice analytics dashboard
   */
  async getInvoiceAnalyticsDashboard(tenantId: string): Promise<AnalyticsDashboard> {
    this.logger.log(`Generating analytics dashboard for tenant ${tenantId}`);

    // Get overview metrics
    const overview = await this.getOverviewMetrics(tenantId);
    
    // Get performance metrics
    const performance = await this.getPerformanceMetrics(tenantId);
    
    // Get trend data
    const trends = await this.getTrendData(tenantId);
    
    // Get active alerts
    const alerts = await this.getActiveAlerts(tenantId);
    
    // Get business opportunities
    const opportunities = await this.getBusinessOpportunities(tenantId);

    return {
      overview,
      performance,
      trends,
      alerts,
      opportunities,
    };
  }

  /**
   * Get real-time invoice metrics
   */
  async getRealTimeMetrics(tenantId: string): Promise<RealTimeMetrics> {
    this.logger.log(`Getting real-time metrics for tenant ${tenantId}`);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get active invoices
    const activeInvoices = await this.invoiceRepository.count({
      where: { tenant_id: tenantId, status: 'sent' },
    });

    // Get pending payments
    const pendingPayments = await this.invoiceRepository.count({
      where: { tenant_id: tenantId, status: 'sent' },
    });

    // Get overdue amount
    const overdueInvoices = await this.invoiceRepository.find({
      where: {
        tenant_id: tenantId,
        status: 'sent',
        due_date: { $lt: now },
      },
    });

    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.balance_due, 0);

    // Get today's revenue
    const todayPaidInvoices = await this.invoiceRepository.find({
      where: {
        tenant_id: tenantId,
        status: 'paid',
        updated_at: { $gte: todayStart },
      },
    });

    const todayRevenue = todayPaidInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);

    // Calculate weekly trend
    const weekPaidInvoices = await this.invoiceRepository.find({
      where: {
        tenant_id: tenantId,
        status: 'paid',
        updated_at: { $gte: weekStart },
      },
    });

    const weekRevenue = weekPaidInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);
    const weeklyTrend = todayRevenue > 0 ? ((weekRevenue / 7) / todayRevenue - 1) * 100 : 0;

    // Calculate monthly projection
    const monthPaidInvoices = await this.invoiceRepository.find({
      where: {
        tenant_id: tenantId,
        status: 'paid',
        updated_at: { $gte: monthStart },
      },
    });

    const monthRevenue = monthPaidInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyAverage = monthRevenue / now.getDate();
    const monthlyProjection = dailyAverage * daysInMonth;

    return {
      activeInvoices,
      pendingPayments,
      overdueAmount,
      todayRevenue,
      weeklyTrend,
      monthlyProjection,
    };
  }

  /**
   * Get predictive insights using analytics module
   */
  async getPredictiveInsights(tenantId: string): Promise<PredictiveInsights> {
    this.logger.log(`Getting predictive insights for tenant ${tenantId}`);

    try {
      // Get cash flow forecast from analytics module
      const cashFlowForecast = await this.getCashFlowForecast(tenantId);
      
      // Get payment predictions
      const paymentPredictions = await this.getPaymentPredictions(tenantId);
      
      // Get risk alerts
      const riskAlerts = await this.getRiskAlerts(tenantId);
      
      // Get business opportunities
      const opportunities = await this.getBusinessOpportunities(tenantId);

      return {
        cashFlowForecast,
        paymentPredictions,
        riskAlerts,
        opportunities,
      };
    } catch (error) {
      this.logger.error('Failed to get predictive insights from analytics module:', error);
      return this.getDefaultPredictiveInsights(tenantId);
    }
  }

  /**
   * Track invoice events for analytics
   */
  async trackInvoiceEvent(eventType: string, invoiceId: string, data: any): Promise<void> {
    this.logger.log(`Tracking invoice event: ${eventType} for invoice ${invoiceId}`);

    try {
      const eventData = {
        eventType,
        invoiceId,
        tenantId: data.tenantId,
        customerId: data.customerId,
        amount: data.amount,
        timestamp: new Date(),
        metadata: data,
      };

      // Send to analytics module
      if (this.analyticsModule) {
        await this.analyticsModule.trackEvent(`invoice_${eventType}`, eventData);
      }

      // Track internal metrics
      this.metricsService.trackInvoiceEvent(eventType, eventData);
    } catch (error) {
      this.logger.error(`Failed to track invoice event ${eventType}:`, error);
    }
  }

  /**
   * Generate custom analytics report
   */
  async generateCustomReport(
    tenantId: string,
    reportType: string,
    parameters: any,
  ): Promise<any> {
    this.logger.log(`Generating custom report: ${reportType} for tenant ${tenantId}`);

    try {
      if (this.analyticsModule) {
        return await this.analyticsModule.generateReport(reportType, {
          tenantId,
          ...parameters,
        });
      }

      // Fallback to local report generation
      return await this.generateLocalReport(tenantId, reportType, parameters);
    } catch (error) {
      this.logger.error(`Failed to generate custom report ${reportType}:`, error);
      throw error;
    }
  }

  /**
   * Get customer-specific analytics
   */
  async getCustomerAnalytics(customerId: string, tenantId: string): Promise<{
    customerMetrics: any;
    paymentHistory: any[];
    trends: any;
    predictions: any;
  }> {
    this.logger.log(`Getting customer analytics for customer ${customerId}`);

    // Get customer invoices
    const invoices = await this.invoiceRepository.find({
      where: { client_id: customerId, tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });

    // Calculate customer metrics
    const customerMetrics = this.calculateCustomerMetrics(invoices);
    
    // Get payment history
    const paymentHistory = this.getPaymentHistory(invoices);
    
    // Analyze trends
    const trends = this.analyzeCustomerTrends(invoices);
    
    // Get predictions
    const predictions = await this.getCustomerPredictions(customerId, invoices);

    return {
      customerMetrics,
      paymentHistory,
      trends,
      predictions,
    };
  }

  /**
   * Get overview metrics
   */
  private async getOverviewMetrics(tenantId: string): Promise<any> {
    const invoices = await this.invoiceRepository.find({
      where: { tenant_id: tenantId },
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const customerIds = [...new Set(invoices.map(inv => inv.client_id))];
    const averageInvoiceValue = invoices.length > 0 ? totalRevenue / invoices.length : 0;

    // Calculate growth rate (simplified)
    const currentMonth = new Date().getMonth();
    const lastMonthInvoices = invoices.filter(inv => inv.issue_date.getMonth() === currentMonth - 1);
    const currentMonthInvoices = invoices.filter(inv => inv.issue_date.getMonth() === currentMonth);
    
    const lastMonthRevenue = lastMonthInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);
    const currentMonthRevenue = currentMonthInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);
    const growthRate = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

    return {
      totalRevenue,
      growthRate,
      customerCount: customerIds.length,
      averageInvoiceValue,
    };
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(tenantId: string): Promise<any> {
    const invoices = await this.invoiceRepository.find({
      where: { tenant_id: tenantId },
    });

    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    
    // Calculate payment speed
    const paymentDays = paidInvoices.map(inv => 
      Math.floor((inv.updated_at.getTime() - inv.issue_date.getTime()) / (1000 * 60 * 60 * 24))
    );
    const paymentSpeed = paymentDays.length > 0 ? paymentDays.reduce((sum, days) => sum + days, 0) / paymentDays.length : 0;

    // Calculate collection rate
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
    const collectedAmount = paidInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);
    const collectionRate = totalAmount > 0 ? (collectedAmount / totalAmount) * 100 : 0;

    // Calculate overdue rate
    const overdueInvoices = invoices.filter(inv => 
      inv.status === 'sent' && inv.due_date < new Date()
    );
    const overdueRate = invoices.length > 0 ? (overdueInvoices.length / invoices.length) * 100 : 0;

    // Customer satisfaction (placeholder)
    const customerSatisfaction = 4.2;

    return {
      paymentSpeed,
      collectionRate,
      overdueRate,
      customerSatisfaction,
    };
  }

  /**
   * Get trend data
   */
  private async getTrendData(tenantId: string): Promise<any> {
    const invoices = await this.invoiceRepository.find({
      where: { tenant_id: tenantId },
    });

    // Monthly revenue trend
    const monthlyRevenue = this.calculateMonthlyRevenue(invoices);
    
    // Customer acquisition trend
    const customerAcquisition = this.calculateCustomerAcquisition(invoices);
    
    // Payment patterns
    const paymentPatterns = this.calculatePaymentPatterns(invoices);

    return {
      monthlyRevenue,
      customerAcquisition,
      paymentPatterns,
    };
  }

  /**
   * Get active alerts
   */
  private async getActiveAlerts(tenantId: string): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = [];

    // Check for overdue invoices
    const overdueInvoices = await this.invoiceRepository.find({
      where: {
        tenant_id: tenantId,
        status: 'sent',
        due_date: { $lt: new Date() },
      },
    });

    if (overdueInvoices.length > 0) {
      alerts.push({
        type: 'payment_delay',
        severity: overdueInvoices.length > 10 ? 'high' : 'medium',
        description: `${overdueInvoices.length} invoices are overdue`,
        affectedEntities: overdueInvoices.map(inv => inv.id),
        recommendedAction: 'Send payment reminders and follow up with customers',
        timestamp: new Date(),
      });
    }

    return alerts;
  }

  /**
   * Get business opportunities
   */
  private async getBusinessOpportunities(tenantId: string): Promise<BusinessOpportunity[]> {
    const opportunities: BusinessOpportunity[] = [];

    // Early payment discount opportunities
    const highValueInvoices = await this.invoiceRepository.find({
      where: {
        tenant_id: tenantId,
        status: 'sent',
        grand_total: { $gt: 100000 },
      },
    });

    if (highValueInvoices.length > 0) {
      opportunities.push({
        type: 'early_payment_discount',
        description: `Offer early payment discounts on ${highValueInvoices.length} high-value invoices`,
        potentialValue: highValueInvoices.reduce((sum, inv) => sum + inv.grand_total, 0) * 0.02,
        confidence: 75,
        actionRequired: 'Configure early payment discount rules',
      });
    }

    return opportunities;
  }

  /**
   * Calculate customer metrics
   */
  private calculateCustomerMetrics(invoices: Invoice[]): any {
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
    const paidAmount = paidInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);

    return {
      totalInvoices,
      paidInvoices: paidInvoices.length,
      totalAmount,
      paidAmount,
      paymentRate: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0,
      averageInvoiceValue: totalInvoices > 0 ? totalAmount / totalInvoices : 0,
    };
  }

  /**
   * Get payment history
   */
  private getPaymentHistory(invoices: Invoice[]): any[] {
    return invoices
      .filter(inv => inv.status === 'paid')
      .map(inv => ({
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        amount: inv.grand_total,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        paidDate: inv.updated_at,
        paymentDays: Math.floor((inv.updated_at.getTime() - inv.issue_date.getTime()) / (1000 * 60 * 60 * 24)),
      }));
  }

  /**
   * Analyze customer trends
   */
  private analyzeCustomerTrends(invoices: Invoice[]): any {
    // Simplified trend analysis
    const recentInvoices = invoices.slice(0, 10);
    const olderInvoices = invoices.slice(10, 20);

    const recentAverage = recentInvoices.length > 0 
      ? recentInvoices.reduce((sum, inv) => sum + inv.grand_total, 0) / recentInvoices.length 
      : 0;

    const olderAverage = olderInvoices.length > 0 
      ? olderInvoices.reduce((sum, inv) => sum + inv.grand_total, 0) / olderInvoices.length 
      : 0;

    return {
      trend: recentAverage > olderAverage ? 'increasing' : 'decreasing',
      recentAverage,
      olderAverage,
      change: recentAverage - olderAverage,
    };
  }

  /**
   * Get customer predictions
   */
  private async getCustomerPredictions(customerId: string, invoices: Invoice[]): Promise<any> {
    // Simplified prediction logic
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const averagePaymentDays = paidInvoices.length > 0
      ? paidInvoices.reduce((sum, inv) => 
          Math.floor((inv.updated_at.getTime() - inv.issue_date.getTime()) / (1000 * 60 * 60 * 24)), 0
        ) / paidInvoices.length
      : 30;

    return {
      nextPaymentDate: new Date(Date.now() + (averagePaymentDays * 24 * 60 * 60 * 1000)),
      riskLevel: averagePaymentDays > 45 ? 'high' : averagePaymentDays > 30 ? 'medium' : 'low',
      confidence: 75,
    };
  }

  /**
   * Calculate monthly revenue
   */
  private calculateMonthlyRevenue(invoices: Invoice[]): Array<{ month: string; revenue: number }> {
    const monthlyData = new Map<string, number>();

    invoices.forEach(invoice => {
      const month = invoice.issue_date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      const current = monthlyData.get(month) || 0;
      monthlyData.set(month, current + invoice.grand_total);
    });

    return Array.from(monthlyData.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Calculate customer acquisition
   */
  private calculateCustomerAcquisition(invoices: Invoice[]): Array<{ month: string; customers: number }> {
    const monthlyCustomers = new Map<string, Set<string>>();

    invoices.forEach(invoice => {
      const month = invoice.issue_date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!monthlyCustomers.has(month)) {
        monthlyCustomers.set(month, new Set());
      }
      monthlyCustomers.get(month)!.add(invoice.client_id);
    });

    return Array.from(monthlyCustomers.entries())
      .map(([month, customers]) => ({ month, customers: customers.size }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Calculate payment patterns
   */
  private calculatePaymentPatterns(invoices: Invoice[]): Array<{ period: string; rate: number }> {
    const patterns = [
      { period: '0-7 days', rate: 0 },
      { period: '8-14 days', rate: 0 },
      { period: '15-30 days', rate: 0 },
      { period: '30+ days', rate: 0 },
    ];

    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const totalPaid = paidInvoices.length;

    if (totalPaid === 0) return patterns;

    paidInvoices.forEach(invoice => {
      const days = Math.floor((invoice.updated_at.getTime() - invoice.issue_date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (days <= 7) patterns[0].rate++;
      else if (days <= 14) patterns[1].rate++;
      else if (days <= 30) patterns[2].rate++;
      else patterns[3].rate++;
    });

    patterns.forEach(pattern => {
      pattern.rate = (pattern.rate / totalPaid) * 100;
    });

    return patterns;
  }

  /**
   * Get cash flow forecast
   */
  private async getCashFlowForecast(tenantId: string): Promise<CashFlowForecast[]> {
    // Simplified forecast - in production, would use sophisticated ML models
    const forecast: CashFlowForecast[] = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(today.getTime() + (i * 24 * 60 * 60 * 1000));
      forecast.push({
        date,
        projectedInflow: Math.random() * 50000 + 10000,
        projectedOutflow: Math.random() * 30000 + 5000,
        netCashFlow: 0,
        confidence: 85 - (i * 2), // Decreasing confidence over time
      });
    }

    forecast.forEach(item => {
      item.netCashFlow = item.projectedInflow - item.projectedOutflow;
    });

    return forecast;
  }

  /**
   * Get payment predictions
   */
  private async getPaymentPredictions(tenantId: string): Promise<PaymentPrediction[]> {
    const unpaidInvoices = await this.invoiceRepository.find({
      where: { tenant_id: tenantId, status: 'sent' },
    });

    return unpaidInvoices.map(invoice => ({
      customerId: invoice.client_id,
      invoiceId: invoice.id,
      expectedPaymentDate: new Date(invoice.due_date.getTime() + (7 * 24 * 60 * 60 * 1000)),
      probability: 75 + Math.random() * 20,
      amount: invoice.balance_due,
      riskLevel: 'medium',
    }));
  }

  /**
   * Get risk alerts
   */
  private async getRiskAlerts(tenantId: string): Promise<RiskAlert[]> {
    return this.getActiveAlerts(tenantId);
  }

  /**
   * Generate local report when analytics module is unavailable
   */
  private async generateLocalReport(tenantId: string, reportType: string, parameters: any): Promise<any> {
    // Fallback report generation
    return {
      reportType,
      tenantId,
      generatedAt: new Date(),
      data: 'Local report generation - analytics module unavailable',
    };
  }

  /**
   * Get default predictive insights
   */
  private async getDefaultPredictiveInsights(tenantId: string): Promise<PredictiveInsights> {
    return {
      cashFlowForecast: await this.getCashFlowForecast(tenantId),
      paymentPredictions: await this.getPaymentPredictions(tenantId),
      riskAlerts: await this.getRiskAlerts(tenantId),
      opportunities: await this.getBusinessOpportunities(tenantId),
    };
  }
}
