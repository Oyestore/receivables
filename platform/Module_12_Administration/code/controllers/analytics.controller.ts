import { Request, Response, NextFunction } from 'express';
import { advancedAnalyticsService } from '../services/advanced-analytics.service';
import { auditService } from '../services/audit.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError } from '../../../Module_11_Common/code/errors/app-error';

const logger = new Logger('AnalyticsController');

export class AnalyticsController {
    /**
     * GET /api/v1/analytics/metrics
     * Get all metrics
     */
    async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { activeOnly } = req.query;

            const metrics = await advancedAnalyticsService.getMetrics(
                activeOnly === 'false' ? false : true
            );

            res.status(200).json({
                data: metrics,
                total: metrics.length,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/analytics/kpis
     * Track KPI
     */
    async trackKPI(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { metricId, kpiDate, kpiValue, targetValue } = req.body;

            if (!req.user?.tenantId || !metricId || !kpiValue) {
                throw new ValidationError('Tenant ID, metric ID, and KPI value are required');
            }

            const kpi = await advancedAnalyticsService.trackKPI({
                tenantId: req.user.tenantId,
                metricId,
                kpiDate: kpiDate ? new Date(kpiDate) : new Date(),
                kpiValue,
                targetValue,
            });

            res.status(201).json({
                message: 'KPI tracked',
                data: kpi,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/analytics/kpis/:tenantId
     * Get KPIs
     */
    async getKPIs(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { tenantId } = req.params;
            const { metricId, startDate, endDate } = req.query;

            const kpis = await advancedAnalyticsService.getKPIs(
                tenantId,
                metricId as string,
                startDate ? new Date(startDate as string) : undefined,
                endDate ? new Date(endDate as string) : undefined
            );

            res.status(200).json({
                data: kpis,
                total: kpis.length,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/analytics/reports
     * Create report
     */
    async createReport(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { reportName, reportType, reportConfig, schedule, recipients, outputFormat } = req.body;

            if (!reportName || !reportType || !reportConfig) {
                throw new ValidationError('Report name, type, and config are required');
            }

            const report = await advancedAnalyticsService.createReport(
                {
                    reportName,
                    reportType,
                    tenantId: req.user?.tenantId,
                    reportConfig,
                    schedule,
                    recipients,
                    outputFormat,
                },
                req.user?.id
            );

            await auditService.log({
                tenantId: req.user?.tenantId,
                userId: req.user?.id,
                action: 'analytics.report_create',
                resourceType: 'analytics_report',
                resourceId: report.id,
                changes: { reportName, reportType },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(201).json({
                message: 'Report created',
                data: report,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/analytics/reports/:id/execute
     * Execute report
     */
    async executeReport(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { parameters } = req.body;

            const data = await advancedAnalyticsService.executeReport(id, parameters);

            res.status(200).json({
                message: 'Report executed',
                data,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/analytics/dashboards
     * Create dashboard
     */
    async createDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { dashboardName, layout, widgets, filters, refreshInterval, isDefault, isPublic } = req.body;

            if (!dashboardName || !widgets) {
                throw new ValidationError('Dashboard name and widgets are required');
            }

            const dashboard = await advancedAnalyticsService.createDashboard(
                {
                    dashboardName,
                    tenantId: req.user?.tenantId,
                    layout,
                    widgets,
                    filters,
                    refreshInterval,
                    isDefault,
                    isPublic,
                },
                req.user?.id
            );

            res.status(201).json({
                message: 'Dashboard created',
                data: dashboard,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/analytics/export
     * Export data
     */
    async exportData(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { exportName, exportType, queryConfig, outputFormat } = req.body;

            if (!exportName || !exportType || !queryConfig || !outputFormat) {
                throw new ValidationError('Export name, type, query config, and output format are required');
            }

            const exportRecord = await advancedAnalyticsService.exportData(
                {
                    tenantId: req.user?.tenantId,
                    exportName,
                    exportType,
                    queryConfig,
                    outputFormat,
                },
                req.user?.id
            );

            res.status(202).json({
                message: 'Export requested',
                data: exportRecord,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/analytics/aggregates
     * Calculate aggregates
     */
    async calculateAggregates(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { metricIds, startDate, endDate, aggregationType } = req.body;

            if (!req.user?.tenantId || !metricIds || !startDate || !endDate || !aggregationType) {
                throw new ValidationError('Missing required fields');
            }

            const aggregates = await advancedAnalyticsService.calculateAggregates(
                req.user.tenantId,
                metricIds,
                new Date(startDate),
                new Date(endDate),
                aggregationType
            );

            res.status(200).json({
                data: aggregates,
                total: aggregates.length,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const analyticsController = new AnalyticsController();
