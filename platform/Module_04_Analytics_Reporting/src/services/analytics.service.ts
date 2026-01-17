import { Injectable, Logger } from '@nestjs/common';
import { ClickHouseService } from './clickhouse.service';

export interface DateRangeDto {
    startDate: string;
    endDate: string;
}

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);

    constructor(private readonly clickhouse: ClickHouseService) { }

    /**
     * Get Total Revenue within a date range
     */
    async getRevenueMetrics(tenantId: string, range: DateRangeDto) {
        const sql = `
            SELECT 
                toStartOfDay(transactionDate) as date,
                sum(amount) as revenue,
                count() as transactionCount
            FROM payment_transactions
            WHERE 
                tenantId = {tenantId:String} 
                AND transactionDate >= {startDate:DateTime}
                AND transactionDate <= {endDate:DateTime}
                AND status = 'SUCCESS'
            GROUP BY date
            ORDER BY date
        `;

        return await this.clickhouse.query(sql, {
            tenantId,
            startDate: range.startDate,
            endDate: range.endDate
        });
    }

    /**
     * Get Outstanding Invoices (Aging Report)
     */
    async getAgingReport(tenantId: string) {
        const sql = `
            SELECT 
                CASE
                    WHEN dateDiff('day', dueDate, now()) <= 30 THEN '0-30 Days'
                    WHEN dateDiff('day', dueDate, now()) <= 60 THEN '31-60 Days'
                    WHEN dateDiff('day', dueDate, now()) <= 90 THEN '61-90 Days'
                    ELSE '90+ Days'
                END as age_bucket,
                sum(balanceAmount) as totalOutstanding,
                count() as invoiceCount
            FROM invoices
            WHERE 
                tenantId = {tenantId:String} 
                AND status IN ('SENT', 'OVERDUE', 'PARTIAL')
            GROUP BY age_bucket
        `;

        return await this.clickhouse.query(sql, { tenantId });
    }

    /**
     * Get Cash Flow Projection (AI/ML Output integration)
     */
    async getCashFlowProjection(tenantId: string) {
        // This would query a table populated by the ML Forecasting Service
        const sql = `
            SELECT 
                predictionDate,
                predictedInflow,
                confidenceScore
            FROM cash_flow_predictions
            WHERE 
                tenantId = {tenantId:String}
                AND predictionDate > now()
            ORDER BY predictionDate ASC
            LIMIT 30
        `;

        return await this.clickhouse.query(sql, { tenantId });
    }
}
