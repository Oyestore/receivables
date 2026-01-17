import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../../Module_01_Invoice_Management/src/invoice.entity';
import { Lead } from './entities/lead.entity';

// ... (Contracts kept as is, they are fine) ...



@Injectable()
export class AdvancedReportingService {
    private readonly logger = new Logger(AdvancedReportingService.name);

    constructor(
        private eventEmitter: EventEmitter2,
        @InjectRepository(Invoice)
        private invoiceRepository: Repository<Invoice>,
        @InjectRepository(Lead)
        private leadRepository: Repository<Lead>,
    ) { }

    /**
     * Create custom report template
     */
    async createReportTemplate(
        userId: string,
        template: Omit<ReportTemplate, 'id' | 'createdBy' | 'createdAt'>,
    ): Promise<ReportTemplate> {
        const reportTemplate: ReportTemplate = {
            id: this.generateId(),
            ...template,
            createdBy: userId,
            createdAt: new Date(),
        };
        this.logger.log(`Report template created: ${reportTemplate.name}`);
        return reportTemplate;
    }

    /**
     * Generate report from template
     */
    async generateReport(templateId: string): Promise<Report> {
        const startTime = Date.now();
        let data = [];

        // Real implementation for specific categories, falling back to mock for complex dynamic builder
        // In a full implementation, we would parse 'template.metrics' and build a dynamic query.
        // For Phase 9.7, we support 'revenue' category with real data.

        // Simplify: We assume templateId maps to a known type for now or we just query revenue if category is revenue.
        // Since we don't store templates in DB in this snippet, we'll implement a default 'Standard Revenue Report' logic.

        const revenueData = await this.invoiceRepository.createQueryBuilder('invoice')
            .select("DATE_TRUNC('month', invoice.created_at)", 'date')
            .addSelect('SUM(invoice.grand_total)', 'revenue')
            .addSelect('COUNT(invoice.id)', 'count')
            .where("invoice.status = 'paid'")
            .groupBy('date')
            .orderBy('date', 'ASC')
            .limit(12)
            .getRawMany();

        data = revenueData.map(d => ({
            date: d.date,
            revenue: parseFloat(d.revenue),
            count: parseInt(d.count)
        }));

        const summary = this.calculateSummary(data);

        const report: Report = {
            id: this.generateId(),
            templateId,
            name: 'Revenue & Volume Report (Real Data)',
            data,
            summary,
            generatedAt: new Date(),
            executionTime: Date.now() - startTime,
            rowCount: data.length,
        };

        this.logger.log(`Report generated: ${report.id} (${report.executionTime}ms)`);
        return report;
    }

    /**
     * Get executive dashboard
     */
    async getExecutiveDashboard(
        tenantId: string,
    ): Promise<{
        overview: {
            totalRevenue: number;
            revenueGrowth: number;
            customersCount: number;
            customerGrowth: number;
            churnRate: number;
        };
        trends: Array<{
            metric: string;
            trend: '▲' | '▼' | '─';
            change: number;
        }>;
        topMetrics: Array<{
            title: string;
            value: string;
            subtitle: string;
        }>;
    }> {
        // Parallel queries for performance
        const [revenueStats, leadStats] = await Promise.all([
            this.invoiceRepository.createQueryBuilder('invoice')
                .select('SUM(invoice.grand_total)', 'totalRevenue')
                .addSelect('COUNT(DISTINCT invoice.customer_id)', 'customerCount')
                .where("invoice.status = 'paid'")
                .getRawOne(),
            this.leadRepository.count()
        ]);

        const totalRevenue = parseFloat(revenueStats.totalRevenue) || 0;
        const customersCount = parseInt(revenueStats.customerCount) || 0;

        // Growth calculation (Mock comparison for now as we need time-series storage for real Month-over-Month)
        const revenueGrowth = 0.15;
        const customerGrowth = 0.10;

        return {
            overview: {
                totalRevenue,
                revenueGrowth,
                customersCount,
                customerGrowth,
                churnRate: 0.05, // Default/Placeholder as churn needs Subscription Repo which is not injected here yet
            },
            trends: [
                { metric: 'Revenue', trend: '▲', change: revenueGrowth },
                { metric: 'Customers', trend: '▲', change: customerGrowth },
                { metric: 'Leads Pipeline', trend: '▲', change: 0.08 },
                { metric: 'Avg Ticket', trend: '─', change: 0.02 },
            ],
            topMetrics: [
                { title: 'Total Revenue', value: `₹${(totalRevenue / 1000000).toFixed(1)}M`, subtitle: 'Lifetime' },
                { title: 'Active Customers', value: customersCount.toString(), subtitle: 'Paying Clients' },
                { title: 'Total Leads', value: leadStats.toString(), subtitle: 'In Pipeline' },
            ],
        };
    }

    /**
     * Schedule recurring report
     */
    async scheduleReport(
        templateId: string,
        schedule: {
            frequency: 'daily' | 'weekly' | 'monthly';
            time: string;
            recipients: string[];
        },
    ): Promise<{ scheduleId: string }> {
        const scheduleId = this.generateId();
        this.logger.log(`Report scheduled: ${templateId}, frequency: ${schedule.frequency}`);
        // In production: Store in database and set up cron job
        return { scheduleId };
    }

    /**
     * Export report to various formats
     */
    async exportReport(
        reportId: string,
        format: 'pdf' | 'excel' | 'csv',
    ): Promise<{
        downloadUrl: string;
        expiresAt: Date;
    }> {
        const downloadUrl = `https://platform.com/reports/download/${reportId}.${format}`;
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        return {
            downloadUrl,
            expiresAt,
        };
    }

    // Private methods

    private calculateSummary(data: any[]): Record<string, any> {
        return {
            totalRevenue: data.reduce((sum, row) => sum + row.revenue, 0),
            avgRevenue: data.length > 0 ? data.reduce((sum, row) => sum + row.revenue, 0) / data.length : 0,
            totalVolume: data.reduce((sum, row) => sum + row.count, 0),
        };
    }

    private generateId(): string {
        return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}


export interface ReportTemplate {
    id: string;
    name: string;
    description: string;
    category: 'revenue' | 'customer' | 'marketing' | 'operations' | 'executive';

    // Configuration
    metrics: Array<{
        key: string;
        label: string;
        aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
        format: 'currency' | 'number' | 'percentage' | 'text';
    }>;

    dimensions: string[];              // Groupby fields
    filters: Array<{
        field: string;
        operator: 'eq' | 'gt' | 'lt' | 'in';
        value: any;
    }>;

    visualization: 'table' | 'line' | 'bar' | 'pie' | 'metric';

    // Scheduling
    schedule?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        dayOfWeek?: number;
        dayOfMonth?: number;
        time: string;
        recipients: string[];
    };

    createdBy: string;
    createdAt: Date;
}

export interface Report {
    id: string;
    templateId: string;
    name: string;

    // Data
    data: any[];
    summary: Record<string, any>;

    // Metadata
    generatedAt: Date;
    executionTime: number;            // milliseconds
    rowCount: number;
}

@Injectable()
export class AdvancedReportingService {
    private readonly logger = new Logger(AdvancedReportingService.name);

    constructor(
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Create custom report template
     */
    async createReportTemplate(
        userId: string,
        template: Omit<ReportTemplate, 'id' | 'createdBy' | 'createdAt'>,
    ): Promise<ReportTemplate> {
        const reportTemplate: ReportTemplate = {
            id: this.generateId(),
            ...template,
            createdBy: userId,
            createdAt: new Date(),
        };

        this.logger.log(`Report template created: ${reportTemplate.name}`);

        return reportTemplate;
    }

    /**
     * Generate report from template
     */
    async generateReport(templateId: string): Promise<Report> {
        const startTime = Date.now();

        // Mock report generation - in production, query actual data
        const data = this.mockReportData();
        const summary = this.calculateSummary(data);

        const report: Report = {
            id: this.generateId(),
            templateId,
            name: 'Generated Report',
            data,
            summary,
            generatedAt: new Date(),
            executionTime: Date.now() - startTime,
            rowCount: data.length,
        };

        this.logger.log(`Report generated: ${report.id} (${report.executionTime}ms)`);

        return report;
    }

    /**
     * Get executive dashboard
     */
    async getExecutiveDashboard(
        tenantId: string,
    ): Promise<{
        overview: {
            totalRevenue: number;
            revenueGrowth: number;
            customersCount: number;
            customerGrowth: number;
            churnRate: number;
        };
        trends: Array<{
            metric: string;
            trend: '▲' | '▼' | '─';
            change: number;
        }>;
        topMetrics: Array<{
            title: string;
            value: string;
            subtitle: string;
        }>;
    }> {
        return {
            overview: {
                totalRevenue: 2500000,
                revenueGrowth: 0.18,
                customersCount: 450,
                customerGrowth: 0.12,
                churnRate: 0.04,
            },
            trends: [
                { metric: 'MRR', trend: '▲', change: 0.15 },
                { metric: 'Customer LTV', trend: '▲', change: 0.22 },
                { metric: 'Churn Rate', trend: '▼', change: -0.08 },
                { metric: 'NPS', trend: '▲', change: 0.05 },
            ],
            topMetrics: [
                { title: 'ARR', value: '₹30M', subtitle: '+18% YoY' },
                { title: 'CAC Payback', value: '4.2 months', subtitle: 'Target: 6 months' },
                { title: 'Net Revenue Retention', value: '115%', subtitle: '+5pp from last quarter' },
            ],
        };
    }

    /**
     * Schedule recurring report
     */
    async scheduleReport(
        templateId: string,
        schedule: {
            frequency: 'daily' | 'weekly' | 'monthly';
            time: string;
            recipients: string[];
        },
    ): Promise<{ scheduleId: string }> {
        const scheduleId = this.generateId();

        this.logger.log(`Report scheduled: ${templateId}, frequency: ${schedule.frequency}`);

        // In production: Store in database and set up cron job
        return { scheduleId };
    }

    /**
     * Export report to various formats
     */
    async exportReport(
        reportId: string,
        format: 'pdf' | 'excel' | 'csv',
    ): Promise<{
        downloadUrl: string;
        expiresAt: Date;
    }> {
        const downloadUrl = `https://platform.com/reports/download/${reportId}.${format}`;
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        return {
            downloadUrl,
            expiresAt,
        };
    }

    // Private methods
    private mockReportData(): any[] {
        const data = [];
        for (let i = 0; i < 20; i++) {
            data.push({
                date: new Date(Date.now() - i * 24 * 3600000),
                revenue: 10000 + Math.random() * 5000,
                customers: 400 + Math.floor(Math.random() * 100),
                mrr: 200000 + Math.random() * 50000,
            });
        }
        return data;
    }

    private calculateSummary(data: any[]): Record<string, any> {
        return {
            totalRevenue: data.reduce((sum, row) => sum + row.revenue, 0),
            avgRevenue: data.reduce((sum, row) => sum + row.revenue, 0) / data.length,
            totalCustomers: Math.max(...data.map(row => row.customers)),
        };
    }

    private generateId(): string {
        return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
