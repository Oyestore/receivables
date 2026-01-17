import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { InvoiceLineItem } from '../entities/invoice-line-item.entity';
import { PdfGenerationService } from './pdf-generation.service';
import { MetricsService } from './metrics.service';

export interface ReportFilters {
  tenantId: string;
  startDate?: Date;
  endDate?: Date;
  status?: string[];
  customerId?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface InvoiceMetrics {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  overdueAmount: number;
  averageInvoiceValue: number;
  paymentRate: number;
  averagePaymentDays: number;
}

export interface CustomerMetrics {
  customerId: string;
  customerName: string;
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  averagePaymentDays: number;
  riskScore: number;
}

export interface ReportData {
  summary: InvoiceMetrics;
  customerMetrics: CustomerMetrics[];
  monthlyTrends: MonthlyTrend[];
  topCustomers: CustomerMetrics[];
  agingReport: AgingBucket[];
}

export interface MonthlyTrend {
  month: string;
  invoiceCount: number;
  invoiceAmount: number;
  paidAmount: number;
  paymentRate: number;
}

export interface AgingBucket {
  bucket: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface ReportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeCharts: boolean;
  includeDetails: boolean;
  language: 'en' | 'hi' | 'gu';
}

@Injectable()
export class ReportGenerationService {
  private readonly logger = new Logger(ReportGenerationService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceLineItem)
    private readonly lineItemRepository: Repository<InvoiceLineItem>,
    private readonly pdfService: PdfGenerationService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Generate comprehensive invoice report
   */
  async generateInvoiceReport(
    filters: ReportFilters,
    options: ReportOptions,
  ): Promise<{
    reportId: string;
    format: string;
    downloadUrl: string;
    generatedAt: Date;
  }> {
    this.logger.log(`Generating invoice report for tenant ${filters.tenantId}`);

    const reportData = await this.collectReportData(filters);
    const reportId = `report_${Date.now()}`;

    let reportBuffer: Buffer;
    let fileName: string;

    switch (options.format) {
      case 'pdf':
        reportBuffer = await this.generatePDFReport(reportData, options);
        fileName = `invoice_report_${reportId}.pdf`;
        break;
      case 'excel':
        reportBuffer = await this.generateExcelReport(reportData, options);
        fileName = `invoice_report_${reportId}.xlsx`;
        break;
      case 'csv':
        reportBuffer = await this.generateCSVReport(reportData, options);
        fileName = `invoice_report_${reportId}.csv`;
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }

    // Save report to storage (implementation would depend on your storage solution)
    const downloadUrl = await this.saveReport(reportId, fileName, reportBuffer);

    this.metricsService.recordReportGenerated(filters.tenantId, options.format);

    return {
      reportId,
      format: options.format,
      downloadUrl,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate aging report
   */
  async generateAgingReport(
    tenantId: string,
    asOfDate: Date = new Date(),
  ): Promise<AgingBucket[]> {
    this.logger.log(`Generating aging report for tenant ${tenantId}`);

    const unpaidInvoices = await this.invoiceRepository.find({
      where: {
        tenant_id: tenantId,
        status: 'sent',
      },
    });

    const agingBuckets: AgingBucket[] = [
      { bucket: 'Current', count: 0, amount: 0, percentage: 0 },
      { bucket: '1-30 Days', count: 0, amount: 0, percentage: 0 },
      { bucket: '31-60 Days', count: 0, amount: 0, percentage: 0 },
      { bucket: '61-90 Days', count: 0, amount: 0, percentage: 0 },
      { bucket: '90+ Days', count: 0, amount: 0, percentage: 0 },
    ];

    let totalAmount = 0;

    unpaidInvoices.forEach(invoice => {
      const daysOverdue = Math.floor(
        (asOfDate.getTime() - invoice.due_date.getTime()) / (1000 * 60 * 60 * 24)
      );

      let bucketIndex = 0;
      if (daysOverdue > 90) bucketIndex = 4;
      else if (daysOverdue > 60) bucketIndex = 3;
      else if (daysOverdue > 30) bucketIndex = 2;
      else if (daysOverdue > 0) bucketIndex = 1;

      agingBuckets[bucketIndex].count++;
      agingBuckets[bucketIndex].amount += invoice.balance_due;
      totalAmount += invoice.balance_due;
    });

    // Calculate percentages
    agingBuckets.forEach(bucket => {
      bucket.percentage = totalAmount > 0 ? (bucket.amount / totalAmount) * 100 : 0;
    });

    return agingBuckets;
  }

  /**
   * Generate customer performance report
   */
  async generateCustomerReport(
    tenantId: string,
    customerId?: string,
  ): Promise<CustomerMetrics[]> {
    this.logger.log(`Generating customer report for tenant ${tenantId}`);

    const whereClause: any = { tenant_id: tenantId };
    if (customerId) {
      whereClause.client_id = customerId;
    }

    const invoices = await this.invoiceRepository.find({
      where: whereClause,
      relations: ['line_items'],
    });

    // Group by customer
    const customerMap = new Map<string, CustomerMetrics>();

    invoices.forEach(invoice => {
      const customerId = invoice.client_id;
      
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customerId,
          customerName: `Customer ${customerId}`, // Would come from customer service
          totalInvoices: 0,
          totalAmount: 0,
          paidAmount: 0,
          unpaidAmount: 0,
          averagePaymentDays: 0,
          riskScore: 0,
        });
      }

      const metrics = customerMap.get(customerId)!;
      metrics.totalInvoices++;
      metrics.totalAmount += invoice.grand_total;
      
      if (invoice.status === 'paid') {
        metrics.paidAmount += invoice.grand_total;
        // Calculate payment days
        const paymentDays = Math.floor(
          (invoice.updated_at.getTime() - invoice.issue_date.getTime()) / (1000 * 60 * 60 * 24)
        );
        metrics.averagePaymentDays += paymentDays;
      } else {
        metrics.unpaidAmount += invoice.balance_due;
      }
    });

    // Calculate averages and risk scores
    const customerMetrics = Array.from(customerMap.values());
    
    customerMetrics.forEach(metrics => {
      if (metrics.totalInvoices > 0) {
        metrics.averagePaymentDays = metrics.averagePaymentDays / (metrics.totalInvoices - (metrics.unpaidAmount > 0 ? 1 : 0));
      }
      
      // Simple risk calculation
      metrics.riskScore = this.calculateRiskScore(metrics);
    });

    return customerMetrics.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /**
   * Generate monthly trends report
   */
  async generateMonthlyTrends(
    tenantId: string,
    months: number = 12,
  ): Promise<MonthlyTrend[]> {
    this.logger.log(`Generating monthly trends for tenant ${tenantId}`);

    const trends: MonthlyTrend[] = [];
    const currentDate = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const monthInvoices = await this.invoiceRepository.find({
        where: {
          tenant_id: tenantId,
          issue_date: Between(startDate, endDate),
        },
      });

      const invoiceCount = monthInvoices.length;
      const invoiceAmount = monthInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);
      const paidAmount = monthInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.grand_total, 0);
      const paymentRate = invoiceAmount > 0 ? (paidAmount / invoiceAmount) * 100 : 0;

      trends.push({
        month: monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        invoiceCount,
        invoiceAmount,
        paidAmount,
        paymentRate,
      });
    }

    return trends;
  }

  /**
   * Collect comprehensive report data
   */
  private async collectReportData(filters: ReportFilters): Promise<ReportData> {
    const whereClause: any = { tenant_id: filters.tenantId };

    if (filters.startDate && filters.endDate) {
      whereClause.issue_date = Between(filters.startDate, filters.endDate);
    }

    if (filters.status && filters.status.length > 0) {
      whereClause.status = filters.status;
    }

    if (filters.customerId) {
      whereClause.client_id = filters.customerId;
    }

    if (filters.minAmount || filters.maxAmount) {
      whereClause.grand_total = {};
      if (filters.minAmount) whereClause.grand_total.$gte = filters.minAmount;
      if (filters.maxAmount) whereClause.grand_total.$lte = filters.maxAmount;
    }

    const invoices = await this.invoiceRepository.find({
      where: whereClause,
      relations: ['line_items'],
    });

    // Calculate summary metrics
    const summary = this.calculateSummaryMetrics(invoices);

    // Get customer metrics
    const customerMetrics = await this.generateCustomerReport(filters.tenantId);

    // Get monthly trends
    const monthlyTrends = await this.generateMonthlyTrends(filters.tenantId);

    // Get top customers
    const topCustomers = customerMetrics.slice(0, 10);

    // Get aging report
    const agingReport = await this.generateAgingReport(filters.tenantId);

    return {
      summary,
      customerMetrics,
      monthlyTrends,
      topCustomers,
      agingReport,
    };
  }

  /**
   * Calculate summary metrics
   */
  private calculateSummaryMetrics(invoices: Invoice[]): InvoiceMetrics {
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
    const paidAmount = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.grand_total, 0);
    const unpaidAmount = invoices
      .filter(inv => inv.status === 'sent')
      .reduce((sum, inv) => sum + inv.balance_due, 0);
    const overdueAmount = invoices
      .filter(inv => inv.status === 'sent' && inv.due_date < new Date())
      .reduce((sum, inv) => sum + inv.balance_due, 0);

    const averageInvoiceValue = totalInvoices > 0 ? totalAmount / totalInvoices : 0;
    const paymentRate = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

    // Calculate average payment days
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const averagePaymentDays = paidInvoices.length > 0
      ? paidInvoices.reduce((sum, inv) => {
          const days = Math.floor(
            (inv.updated_at.getTime() - inv.issue_date.getTime()) / (1000 * 60 * 60 * 24)
          );
          return sum + days;
        }, 0) / paidInvoices.length
      : 0;

    return {
      totalInvoices,
      totalAmount,
      paidAmount,
      unpaidAmount,
      overdueAmount,
      averageInvoiceValue,
      paymentRate,
      averagePaymentDays,
    };
  }

  /**
   * Calculate customer risk score
   */
  private calculateRiskScore(metrics: CustomerMetrics): number {
    let riskScore = 50; // Base score

    // Payment history factor
    const paymentRatio = metrics.totalAmount > 0 ? metrics.paidAmount / metrics.totalAmount : 0;
    riskScore -= paymentRatio * 30;

    // Average payment days factor
    if (metrics.averagePaymentDays > 60) riskScore += 20;
    else if (metrics.averagePaymentDays > 30) riskScore += 10;

    // Unpaid amount factor
    const unpaidRatio = metrics.totalAmount > 0 ? metrics.unpaidAmount / metrics.totalAmount : 0;
    riskScore += unpaidRatio * 25;

    return Math.max(0, Math.min(100, riskScore));
  }

  /**
   * Generate PDF report
   */
  private async generatePDFReport(data: ReportData, options: ReportOptions): Promise<Buffer> {
    // Implementation would use PDF generation service
    // For now, return a placeholder
    const htmlContent = this.generateHTMLReport(data, options);
    return this.pdfService.generatePDF(htmlContent);
  }

  /**
   * Generate Excel report
   */
  private async generateExcelReport(data: ReportData, options: ReportOptions): Promise<Buffer> {
    // Implementation would use Excel generation library
    // For now, return a placeholder
    return Buffer.from('Excel report content');
  }

  /**
   * Generate CSV report
   */
  private async generateCSVReport(data: ReportData, options: ReportOptions): Promise<Buffer> {
    // Implementation would generate CSV content
    // For now, return a placeholder
    return Buffer.from('CSV report content');
  }

  /**
   * Generate HTML report content
   */
  private generateHTMLReport(data: ReportData, options: ReportOptions): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary { display: flex; justify-content: space-around; margin-bottom: 30px; }
          .metric { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Invoice Performance Report</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="summary">
          <div class="metric">
            <h3>Total Invoices</h3>
            <p>${data.summary.totalInvoices}</p>
          </div>
          <div class="metric">
            <h3>Total Amount</h3>
            <p>₹${data.summary.totalAmount.toLocaleString()}</p>
          </div>
          <div class="metric">
            <h3>Payment Rate</h3>
            <p>${data.summary.paymentRate.toFixed(1)}%</p>
          </div>
        </div>
        
        <h2>Customer Performance</h2>
        <table>
          <tr>
            <th>Customer</th>
            <th>Invoices</th>
            <th>Total Amount</th>
            <th>Paid Amount</th>
            <th>Avg Payment Days</th>
            <th>Risk Score</th>
          </tr>
          ${data.customerMetrics.slice(0, 10).map(customer => `
            <tr>
              <td>${customer.customerName}</td>
              <td>${customer.totalInvoices}</td>
              <td>₹${customer.totalAmount.toLocaleString()}</td>
              <td>₹${customer.paidAmount.toLocaleString()}</td>
              <td>${customer.averagePaymentDays.toFixed(1)}</td>
              <td>${customer.riskScore.toFixed(1)}</td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Save report to storage
   */
  private async saveReport(reportId: string, fileName: string, buffer: Buffer): Promise<string> {
    // Implementation would save to cloud storage or local storage
    // For now, return a placeholder URL
    return `https://storage.example.com/reports/${fileName}`;
  }
}
