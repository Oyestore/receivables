import { Pool } from 'pg';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError, NotFoundError } from '../../../Module_11_Common/code/errors/app-error';
import {
    IAnalyticsMetric,
    IAnalyticsKPI,
    IAnalyticsReport,
    IAnalyticsDashboard,
    IDataExport,
} from '../interfaces/analytics.interface';

const logger = new Logger('AdvancedAnalyticsService');

/**
 * Advanced Analytics Service
 * Real-time metrics, KPI tracking, custom reporting, and data visualization
 */
export class AdvancedAnalyticsService {
    private pool: Pool;

    constructor() {
        this.pool = databaseService.getPool();
    }

    /**
     * Get all analytics metrics
     */
    async getMetrics(activeOnly: boolean = true): Promise<IAnalyticsMetric[]> {
        try {
            let query = 'SELECT * FROM analytics_metrics';

            if (activeOnly) {
                query += ' WHERE is_active = true';
            }

            query += ' ORDER BY metric_category, metric_name';

            const result = await this.pool.query(query);

            return result.rows.map(row => this.mapMetricFromDb(row));
        } catch (error) {
            logger.error('Failed to get analytics metrics', { error });
            throw error;
        }
    }

    /**
     * Track KPI value
     */
    async trackKPI(kpiData: {
        tenantId: string;
        metricId: string;
        kpiDate: Date;
        kpiValue: number;
        targetValue?: number;
    }): Promise<IAnalyticsKPI> {
        try {
            // Calculate variance
            const variance = kpiData.targetValue !== undefined
                ? kpiData.kpiValue - kpiData.targetValue
                : 0;

            const variancePercentage = kpiData.targetValue && kpiData.targetValue !== 0
                ? (variance / kpiData.targetValue) * 100
                : 0;

            // Determine status
            let status: 'on_track' | 'at_risk' | 'off_track' | 'exceeded' = 'on_track';

            if (kpiData.targetValue !== undefined) {
                if (kpiValue >= kpiData.targetValue) {
                    status = 'exceeded';
                } else if (variancePercentage > -10) {
                    status = 'on_track';
                } else if (variancePercentage > -25) {
                    status = 'at_risk';
                } else {
                    status = 'off_track';
                }
            }

            // Get previous value for trend
            const previousResult = await this.pool.query(
                `SELECT kpi_value FROM analytics_kpis
         WHERE tenant_id = $1 AND metric_id = $2 AND kpi_date < $3
         ORDER BY kpi_date DESC LIMIT 1`,
                [kpiData.tenantId, kpiData.metricId, kpiData.kpiDate]
            );

            let trend: 'up' | 'down' | 'stable' = 'stable';

            if (previousResult.rows.length > 0) {
                const previousValue = parseFloat(previousResult.rows[0].kpi_value);
                const diff = kpiData.kpiValue - previousValue;
                const percentDiff = Math.abs((diff / previousValue) * 100);

                if (percentDiff > 5) {
                    trend = diff > 0 ? 'up' : 'down';
                }
            }

            // Upsert KPI
            const result = await this.pool.query(
                `INSERT INTO analytics_kpis (
          tenant_id, metric_id, kpi_date, kpi_value, target_value,
          variance, variance_percentage, trend, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (tenant_id, metric_id, kpi_date)
        DO UPDATE SET
          kpi_value = EXCLUDED.kpi_value,
          target_value = EXCLUDED.target_value,
          variance = EXCLUDED.variance,
          variance_percentage = EXCLUDED.variance_percentage,
          trend = EXCLUDED.trend,
          status = EXCLUDED.status
        RETURNING *`,
                [
                    kpiData.tenantId,
                    kpiData.metricId,
                    kpiData.kpiDate,
                    kpiData.kpiValue,
                    kpiData.targetValue || null,
                    variance,
                    variancePercentage,
                    trend,
                    status,
                ]
            );

            logger.info('KPI tracked', {
                tenantId: kpiData.tenantId,
                metricId: kpiData.metricId,
                value: kpiData.kpiValue,
                status,
            });

            return this.mapKPIFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to track KPI', { error, kpiData });
            throw error;
        }
    }

    /**
     * Get KPIs for tenant
     */
    async getKPIs(
        tenantId: string,
        metricId?: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticsKPI[]> {
        try {
            let query = 'SELECT * FROM analytics_kpis WHERE tenant_id = $1';
            const params: any[] = [tenantId];

            if (metricId) {
                params.push(metricId);
                query += ` AND metric_id = $${params.length}`;
            }

            if (startDate) {
                params.push(startDate);
                query += ` AND kpi_date >= $${params.length}`;
            }

            if (endDate) {
                params.push(endDate);
                query += ` AND kpi_date <= $${params.length}`;
            }

            query += ' ORDER BY kpi_date DESC';

            const result = await this.pool.query(query, params);

            return result.rows.map(row => this.mapKPIFromDb(row));
        } catch (error) {
            logger.error('Failed to get KPIs', { error, tenantId });
            throw error;
        }
    }

    /**
     * Create analytics report
     */
    async createReport(reportData: {
        reportName: string;
        reportType: 'standard' | 'custom' | 'scheduled' | 'ad_hoc';
        tenantId?: string;
        reportConfig: any;
        schedule?: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
        recipients?: any;
        outputFormat?: 'pdf' | 'excel' | 'csv' | 'json' | 'html';
    }, createdBy: string): Promise<IAnalyticsReport> {
        try {
            const nextRunDate = reportData.schedule && reportData.schedule !== 'once'
                ? this.calculateNextRunDate(reportData.schedule)
                : null;

            const result = await this.pool.query(
                `INSERT INTO analytics_reports (
          report_name, report_type, tenant_id, report_config, schedule,
          next_run_date, recipients, output_format, created_by, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        RETURNING *`,
                [
                    reportData.reportName,
                    reportData.reportType,
                    reportData.tenantId || null,
                    JSON.stringify(reportData.reportConfig),
                    reportData.schedule || 'once',
                    nextRunDate,
                    reportData.recipients ? JSON.stringify(reportData.recipients) : null,
                    reportData.outputFormat || 'pdf',
                    createdBy,
                ]
            );

            logger.info('Analytics report created', {
                reportId: result.rows[0].id,
                reportName: reportData.reportName,
            });

            return this.mapReportFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to create report', { error, reportData });
            throw error;
        }
    }

    /**
     * Execute report
     */
    async executeReport(reportId: string, parameters?: any): Promise<any> {
        const startTime = Date.now();

        try {
            // Get report configuration
            const reportResult = await this.pool.query(
                'SELECT * FROM analytics_reports WHERE id = $1',
                [reportId]
            );

            if (reportResult.rows.length === 0) {
                throw new NotFoundError('Report not found');
            }

            const report = reportResult.rows[0];

            // Execute report query based on configuration
            const reportData = await this.generateReportData(report.report_config, parameters);

            // Record execution
            const executionTime = Date.now() - startTime;

            await this.pool.query(
                `INSERT INTO report_executions (
          report_id, execution_status, execution_time_ms, parameters
        ) VALUES ($1, 'completed', $2, $3)`,
                [reportId, executionTime, parameters ? JSON.stringify(parameters) : null]
            );

            // Update next run date if scheduled
            if (report.schedule && report.schedule !== 'once') {
                const nextRunDate = this.calculateNextRunDate(report.schedule);
                await this.pool.query(
                    'UPDATE analytics_reports SET next_run_date = $1 WHERE id = $2',
                    [nextRunDate, reportId]
                );
            }

            logger.info('Report executed', {
                reportId,
                executionTime,
                dataPoints: reportData.length,
            });

            return reportData;
        } catch (error) {
            // Record failed execution
            await this.pool.query(
                `INSERT INTO report_executions (
          report_id, execution_status, error_message
        ) VALUES ($1, 'failed', $2)`,
                [reportId, error.message]
            );

            logger.error('Failed to execute report', { error, reportId });
            throw error;
        }
    }

    /**
     * Create dashboard
     */
    async createDashboard(dashboardData: {
        dashboardName: string;
        tenantId?: string;
        layout?: any;
        widgets: any;
        filters?: any;
        refreshInterval?: number;
        isDefault?: boolean;
        isPublic?: boolean;
    }, createdBy: string): Promise<IAnalyticsDashboard> {
        try {
            const result = await this.pool.query(
                `INSERT INTO analytics_dashboards (
          dashboard_name, tenant_id, layout, widgets, filters,
          refresh_interval, is_default, is_public, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
                [
                    dashboardData.dashboardName,
                    dashboardData.tenantId || null,
                    dashboardData.layout ? JSON.stringify(dashboardData.layout) : null,
                    JSON.stringify(dashboardData.widgets),
                    dashboardData.filters ? JSON.stringify(dashboardData.filters) : null,
                    dashboardData.refreshInterval || 300,
                    dashboardData.isDefault || false,
                    dashboardData.isPublic || false,
                    createdBy,
                ]
            );

            logger.info('Dashboard created', {
                dashboardId: result.rows[0].id,
                dashboardName: dashboardData.dashboardName,
            });

            return this.mapDashboardFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to create dashboard', { error, dashboardData });
            throw error;
        }
    }

    /**
     * Export data
     */
    async exportData(exportData: {
        tenantId?: string;
        exportName: string;
        exportType: 'metrics' | 'kpis' | 'custom_query' | 'dashboard';
        queryConfig: any;
        outputFormat: 'pdf' | 'excel' | 'csv' | 'json';
    }, requestedBy: string): Promise<IDataExport> {
        try {
            // Calculate expiration (30 days from now)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            const result = await this.pool.query(
                `INSERT INTO data_exports (
          tenant_id, export_name, export_type, query_config,
          output_format, status, requested_by, expires_at
        ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
        RETURNING *`,
                [
                    exportData.tenantId || null,
                    exportData.exportName,
                    exportData.exportType,
                    JSON.stringify(exportData.queryConfig),
                    exportData.outputFormat,
                    requestedBy,
                    expiresAt,
                ]
            );

            // Asynchronously process export (in production, this would be a background job)
            setTimeout(() => this.processExport(result.rows[0].id), 100);

            logger.info('Data export requested', {
                exportId: result.rows[0].id,
                exportType: exportData.exportType,
            });

            return this.mapExportFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to export data', { error, exportData });
            throw error;
        }
    }

    /**
     * Calculate aggregate metrics
     */
    async calculateAggregates(
        tenantId: string,
        metricIds: string[],
        startDate: Date,
        endDate: Date,
        aggregationType: 'sum' | 'avg' | 'min' | 'max' | 'count'
    ): Promise<any[]> {
        try {
            const results = [];

            for (const metricId of metricIds) {
                const query = `
          SELECT
            metric_id,
            ${aggregationType}(kpi_value) as aggregate_value,
            COUNT(*) as data_points
          FROM analytics_kpis
          WHERE tenant_id = $1
            AND metric_id = $2
            AND kpi_date >= $3
            AND kpi_date <= $4
          GROUP BY metric_id
        `;

                const result = await this.pool.query(query, [tenantId, metricId, startDate, endDate]);

                if (result.rows.length > 0) {
                    results.push({
                        metricId,
                        aggregationType,
                        value: parseFloat(result.rows[0].aggregate_value),
                        dataPoints: parseInt(result.rows[0].data_points, 10),
                        period: { startDate, endDate },
                    });
                }
            }

            return results;
        } catch (error) {
            logger.error('Failed to calculate aggregates', { error, tenantId });
            throw error;
        }
    }

    /**
     * Process export (simplified - in production would generate actual files)
     */
    private async processExport(exportId: string): Promise<void> {
        try {
            // Simulate export processing
            await new Promise(resolve => setTimeout(resolve, 1000));

            const filePath = `/exports/${exportId}.csv`;
            const fileSize = Math.floor(Math.random() * 1000000) + 10000;
            const rowCount = Math.floor(Math.random() * 10000) + 100;

            await this.pool.query(
                `UPDATE data_exports
         SET status = 'completed',
             file_path = $1,
             file_size = $2,
             row_count = $3,
             completed_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
                [filePath, fileSize, rowCount, exportId]
            );

            logger.info('Export processed', { exportId, rowCount });
        } catch (error) {
            await this.pool.query(
                `UPDATE data_exports SET status = 'failed' WHERE id = $1`,
                [exportId]
            );

            logger.error('Failed to process export', { error, exportId });
        }
    }

    /**
     * Generate report data
     */
    private async generateReportData(reportConfig: any, parameters?: any): Promise<any[]> {
        // Simplified report generation
        // In production, this would build complex queries based on config

        const config = typeof reportConfig === 'string' ? JSON.parse(reportConfig) : reportConfig;

        if (config.dataSource === 'kpis') {
            const result = await this.pool.query(
                `SELECT ak.*, am.metric_name
         FROM analytics_kpis ak
         JOIN analytics_metrics am ON ak.metric_id = am.id
         WHERE ak.tenant_id = $1
         ORDER BY ak.kpi_date DESC
         LIMIT 100`,
                [config.tenantId]
            );

            return result.rows;
        }

        // Default: return empty array
        return [];
    }

    /**
     * Calculate next run date for scheduled reports
     */
    private calculateNextRunDate(schedule: string): Date {
        const now = new Date();
        const nextRun = new Date(now);

        switch (schedule) {
            case 'daily':
                nextRun.setDate(now.getDate() + 1);
                break;
            case 'weekly':
                nextRun.setDate(now.getDate() + 7);
                break;
            case 'monthly':
                nextRun.setMonth(now.getMonth() + 1);
                break;
            case 'quarterly':
                nextRun.setMonth(now.getMonth() + 3);
                break;
        }

        return nextRun;
    }

    /**
     * Map metric from database
     */
    private mapMetricFromDb(row: any): IAnalyticsMetric {
        return {
            id: row.id,
            metricName: row.metric_name,
            metricCategory: row.metric_category,
            metricType: row.metric_type,
            calculationFormula: row.calculation_formula,
            unitType: row.unit_type,
            aggregationPeriod: row.aggregation_period,
            description: row.description,
            isActive: row.is_active,
        };
    }

    /**
     * Map KPI from database
     */
    private mapKPIFromDb(row: any): IAnalyticsKPI {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            metricId: row.metric_id,
            kpiDate: row.kpi_date,
            kpiValue: row.kpi_value ? parseFloat(row.kpi_value) : undefined,
            targetValue: row.target_value ? parseFloat(row.target_value) : undefined,
            variance: row.variance ? parseFloat(row.variance) : undefined,
            variancePercentage: row.variance_percentage ? parseFloat(row.variance_percentage) : undefined,
            trend: row.trend,
            status: row.status,
            metadata: row.metadata,
        };
    }

    /**
     * Map report from database
     */
    private mapReportFromDb(row: any): IAnalyticsReport {
        return {
            id: row.id,
            reportName: row.report_name,
            reportType: row.report_type,
            tenantId: row.tenant_id,
            reportConfig: row.report_config,
            schedule: row.schedule,
            nextRunDate: row.next_run_date,
            recipients: row.recipients,
            outputFormat: row.output_format,
            isActive: row.is_active,
            createdBy: row.created_by,
        };
    }

    /**
     * Map dashboard from database
     */
    private mapDashboardFromDb(row: any): IAnalyticsDashboard {
        return {
            id: row.id,
            dashboardName: row.dashboard_name,
            tenantId: row.tenant_id,
            layout: row.layout,
            widgets: row.widgets,
            filters: row.filters,
            refreshInterval: row.refresh_interval,
            isDefault: row.is_default,
            isPublic: row.is_public,
            createdBy: row.created_by,
        };
    }

    /**
     * Map export from database
     */
    private mapExportFromDb(row: any): IDataExport {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            exportName: row.export_name,
            exportType: row.export_type,
            queryConfig: row.query_config,
            outputFormat: row.output_format,
            filePath: row.file_path,
            fileSize: row.file_size,
            rowCount: row.row_count,
            status: row.status,
            requestedBy: row.requested_by,
            requestedAt: row.requested_at,
            completedAt: row.completed_at,
            expiresAt: row.expires_at,
        };
    }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();
