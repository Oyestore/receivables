import { Injectable, Logger } from '@nestjs/common';
import { ClickHouseService } from './clickhouse.service';
import { DateRangeDto, RevenueMetricsDto, AgingReportDto, CashFlowProjectionDto, AnomalyDetectionDto, AIInsightsDto, PerformanceMetricsDto } from '../dto/analytics.dto';
import { AnomalyDetection, AnomalySeverity } from '../entities/anomaly-detection.entity';
import { AIInsight, InsightType } from '../entities/ai-insight.entity';
import { PerformanceMetric } from '../entities/performance-metric.entity';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly clickhouse: ClickHouseService) {}

  async getRevenueMetrics(tenantId: string, range: DateRangeDto): Promise<any> {
    this.logger.log(`Getting revenue metrics for tenant: ${tenantId}`);

    const sql = `
      SELECT 
        toStartOfDay(transactionDate) as date,
        sum(amount) as revenue,
        count() as transactionCount,
        avg(amount) as avgTransactionValue
      FROM payment_transactions
      WHERE 
        tenantId = {tenantId:String} 
        AND transactionDate >= {startDate:DateTime}
        AND transactionDate <= {endDate:DateTime}
        AND status = 'SUCCESS'
      GROUP BY date
      ORDER BY date
    `;

    try {
      const result = await this.clickhouse.query(sql, {
        tenantId,
        startDate: range.startDate,
        endDate: range.endDate,
      });

      this.logger.log(`Revenue metrics fetched successfully: ${result.length} records`);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch revenue metrics:', error);
      throw error;
    }
  }

  async getAgingReport(tenantId: string, asOfDate?: string): Promise<any> {
    this.logger.log(`Getting aging report for tenant: ${tenantId}`);

    const sql = `
      SELECT 
        CASE
          WHEN dateDiff('day', dueDate, {asOfDate:DateTime}) <= 30 THEN '0-30 Days'
          WHEN dateDiff('day', dueDate, {asOfDate:DateTime}) <= 60 THEN '31-60 Days'
          WHEN dateDiff('day', dueDate, {asOfDate:DateTime}) <= 90 THEN '61-90 Days'
          ELSE '90+ Days'
        END as age_bucket,
        sum(balanceAmount) as totalOutstanding,
        count() as invoiceCount,
        avg(balanceAmount) as avgBalance
      FROM invoices
      WHERE 
        tenantId = {tenantId:String} 
        AND status IN ('SENT', 'OVERDUE', 'PARTIAL')
        AND dueDate <= {asOfDate:DateTime}
      GROUP BY age_bucket
      ORDER BY age_bucket
    `;

    try {
      const result = await this.clickhouse.query(sql, {
        tenantId,
        asOfDate: asOfDate || new Date().toISOString().split('T')[0],
      });

      this.logger.log(`Aging report fetched successfully: ${result.length} buckets`);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch aging report:', error);
      throw error;
    }
  }

  async getCashFlowProjection(tenantId: string, days: number = 30): Promise<any> {
    this.logger.log(`Getting cash flow projection for tenant: ${tenantId}`);

    const sql = `
      SELECT 
        predictionDate,
        predictedInflow,
        predictedOutflow,
        netCashFlow,
        confidenceScore,
        lowerBound,
        upperBound
      FROM cash_flow_predictions
      WHERE 
        tenantId = {tenantId:String}
        AND predictionDate >= today()
        AND predictionDate <= today() + {days:Int}
      ORDER BY predictionDate ASC
    `;

    try {
      const result = await this.clickhouse.query(sql, {
        tenantId,
        days,
      });

      this.logger.log(`Cash flow projection fetched successfully: ${result.length} days`);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch cash flow projection:', error);
      throw error;
    }
  }

  async detectAnomalies(tenantId: string, metricName: string, range: DateRangeDto): Promise<AnomalyDetection[]> {
    this.logger.log(`Detecting anomalies for metric: ${metricName}`);

    const sql = `
      SELECT 
        toStartOfDay(recordedAt) as date,
        avg(value) as dailyAvg,
        min(value) as dailyMin,
        max(value) as dailyMax,
        count() as dataPoints
      FROM performance_metrics
      WHERE 
        tenantId = {tenantId:String} 
        AND metricName = {metricName:String}
        AND recordedAt >= {startDate:DateTime}
        AND recordedAt <= {endDate:DateTime}
      GROUP BY date
      ORDER BY date
    `;

    try {
      const dailyData = await this.clickhouse.query(sql, {
        tenantId,
        metricName,
        startDate: range.startDate,
        endDate: range.endDate,
      });

      const anomalies = this.detectStatisticalAnomalies(dailyData, metricName, tenantId);

      this.logger.log(`Anomalies detected: ${anomalies.length}`);
      return anomalies;
    } catch (error) {
      this.logger.error('Failed to detect anomalies:', error);
      throw error;
    }
  }

  async generateInsights(tenantId: string, range: DateRangeDto): Promise<AIInsight[]> {
    this.logger.log(`Generating AI insights for tenant: ${tenantId}`);

    const insights: AIInsight[] = [];

    try {
      const revenueTrend = await this.getRevenueMetrics(tenantId, range);
      const revenueInsight = this.generateRevenueInsight(revenueTrend, tenantId);
      if (revenueInsight) {
        insights.push(revenueInsight);
      }

      this.logger.log(`AI insights generated: ${insights.length}`);
      return insights;
    } catch (error) {
      this.logger.error('Failed to generate insights:', error);
      throw error;
    }
  }

  private detectStatisticalAnomalies(dailyData: any[], metricName: string, tenantId: string): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    
    if (dailyData.length < 7) {
      return anomalies;
    }

    const values = dailyData.map(d => d.dailyAvg);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    dailyData.forEach(day => {
      const zScore = Math.abs((day.dailyAvg - mean) / stdDev);
      
      if (zScore > 2) {
        const severity = zScore > 3 ? AnomalySeverity.HIGH : AnomalySeverity.MEDIUM;
        
        anomalies.push({
          id: '',
          title: `Anomaly detected in ${metricName}`,
          description: `Value ${day.dailyAvg.toFixed(2)} is ${zScore.toFixed(2)} standard deviations from mean`,
          severity,
          metricName,
          metricValue: day.dailyAvg,
          expectedValue: mean,
          deviationPercentage: ((day.dailyAvg - mean) / mean) * 100,
          confidenceScore: Math.min(zScore / 3, 1),
          dataSource: 'performance_metrics',
          detectionConfig: { method: 'statistical', threshold: 2 },
          status: 'active',
          detectedAt: new Date(),
          metadata: { date: day.date, zScore },
        } as AnomalyDetection);
      }
    });

    return anomalies;
  }

  private generateRevenueInsight(revenueData: any[], tenantId: string): AIInsight | null {
    if (revenueData.length < 2) return null;

    const totalRevenue = revenueData.reduce((sum, day) => sum + parseFloat(day.revenue), 0);
    const avgDailyRevenue = totalRevenue / revenueData.length;
    const recentRevenue = parseFloat(revenueData[revenueData.length - 1].revenue);
    const trend = recentRevenue > avgDailyRevenue ? 'up' : 'down';

    return {
      id: '',
      title: 'Revenue Trend Analysis',
      description: `Revenue is trending ${trend} with recent daily revenue of $${recentRevenue.toFixed(2)}`,
      type: InsightType.TREND,
      confidenceScore: 0.85,
      dataSources: ['payment_transactions'],
      insightData: { totalRevenue, avgDailyRevenue, recentRevenue, trend },
      recommendations: trend === 'up' 
        ? ['Continue current marketing strategies', 'Analyze successful campaigns']
        : ['Review recent changes', 'Investigate revenue decline'],
      isActionable: true,
      status: 'new',
      tags: ['revenue', 'trend', 'financial'],
    } as AIInsight;
  }
}
