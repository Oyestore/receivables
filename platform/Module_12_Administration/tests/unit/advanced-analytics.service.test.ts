import { AdvancedAnalyticsService } from '../code/services/advanced-analytics.service';

describe('AdvancedAnalyticsService', () => {
    let analyticsService: AdvancedAnalyticsService;
    let mockPool: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPool = {
            query: jest.fn(),
        };

        jest.spyOn(require('../../../Module_11_Common/code/database/database.service'), 'databaseService').mockReturnValue({
            getPool: () => mockPool,
        });

        analyticsService = new AdvancedAnalyticsService();
    });

    describe('getMetrics', () => {
        it('should return all active metrics', async () => {
            mockPool.query.mockResolvedValue({
                rows: [
                    {
                        id: 'metric-1',
                        metric_name: 'Total Revenue',
                        metric_category: 'Financial',
                        metric_type: 'sum',
                        is_active: true,
                    },
                    {
                        id: 'metric-2',
                        metric_name: 'Active Users',
                        metric_category: 'User Engagement',
                        metric_type: 'count',
                        is_active: true,
                    },
                ],
            });

            const result = await analyticsService.getMetrics(true);

            expect(result).toHaveLength(2);
            expect(result[0].metricName).toBe('Total Revenue');
            expect(result[1].metricType).toBe('count');
        });
    });

    describe('trackKPI', () => {
        it('should track KPI with calculated variance and status', async () => {
            const kpiData = {
                tenantId: 'tenant-123',
                metricId: 'metric-revenue',
                kpiDate: new Date('2024-06-01'),
                kpiValue: 95000,
                targetValue: 100000,
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [] }) // No previous value
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'kpi-123',
                        tenant_id: kpiData.tenantId,
                        metric_id: kpiData.metricId,
                        kpi_date: kpiData.kpiDate,
                        kpi_value: kpiData.kpiValue,
                        target_value: kpiData.targetValue,
                        variance: -5000,
                        variance_percentage: -5,
                        trend: 'stable',
                        status: 'on_track',
                    }],
                });

            const result = await analyticsService.trackKPI(kpiData);

            expect(result.kpiValue).toBe(95000);
            expect(result.variance).toBe(-5000);
            expect(result.status).toBe('on_track');
        });

        it('should determine trend based on previous value', async () => {
            const kpiData = {
                tenantId: 'tenant-123',
                metricId: 'metric-users',
                kpiDate: new Date('2024-06-01'),
                kpiValue: 1100,
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ kpi_value: '1000' }] }) // Previous value
                .mockResolvedValueOnce({
                    rows: [{
                        trend: 'up',
                    }],
                });

            const result = await analyticsService.trackKPI(kpiData);

            expect(result.trend).toBe('up');
        });
    });

    describe('getKPIs', () => {
        it('should return KPIs for tenant', async () => {
            const tenantId = 'tenant-123';

            mockPool.query.mockResolvedValue({
                rows: [
                    {
                        id: 'kpi-1',
                        tenant_id: tenantId,
                        metric_id: 'metric-1',
                        kpi_date: new Date(),
                        kpi_value: 50000,
                        status: 'on_track',
                    },
                ],
            });

            const result = await analyticsService.getKPIs(tenantId);

            expect(result).toHaveLength(1);
            expect(result[0].tenantId).toBe(tenantId);
        });

        it('should filter KPIs by date range', async () => {
            const startDate = new Date('2024-05-01');
            const endDate = new Date('2024-05-31');

            mockPool.query.mockResolvedValue({ rows: [] });

            await analyticsService.getKPIs('tenant-123', undefined, startDate, endDate);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('kpi_date >='),
                expect.arrayContaining([startDate, endDate])
            );
        });
    });

    describe('createReport', () => {
        it('should create analytics report', async () => {
            const reportData = {
                reportName: 'Monthly Revenue Report',
                reportType: 'standard' as const,
                reportConfig: { dataSource: 'kpis', metricIds: ['metric-1'] },
                schedule: 'monthly' as const,
            };

            mockPool.query.mockResolvedValue({
                rows: [{
                    id: 'report-123',
                    report_name: reportData.reportName,
                    report_type: reportData.reportType,
                    schedule: reportData.schedule,
                    is_active: true,
                }],
            });

            const result = await analyticsService.createReport(reportData, 'user-123');

            expect(result.reportName).toBe('Monthly Revenue Report');
            expect(result.schedule).toBe('monthly');
        });
    });

    describe('executeReport', () => {
        it('should execute report and return data', async () => {
            const reportId = 'report-123';

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: reportId,
                        report_config: JSON.stringify({ dataSource: 'kpis', tenantId: 'tenant-123' }),
                        schedule: 'monthly',
                    }],
                })
                .mockResolvedValueOnce({
                    rows: [
                        { kpi_value: 50000, metric_name: 'Revenue' },
                        { kpi_value: 1000, metric_name: 'Users' },
                    ],
                })
                .mockResolvedValueOnce({ rows: [] }) // Record execution
                .mockResolvedValueOnce({ rows: [] }); // Update next run date

            const result = await analyticsService.executeReport(reportId);

            expect(result).toHaveLength(2);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('report_executions'),
                expect.any(Array)
            );
        });
    });

    describe('createDashboard', () => {
        it('should create analytics dashboard', async () => {
            const dashboardData = {
                dashboardName: 'Executive Dashboard',
                widgets: [
                    { type: 'chart', metricId: 'metric-1' },
                    { type: 'kpi', metricId: 'metric-2' },
                ],
                refreshInterval: 60,
            };

            mockPool.query.mockResolvedValue({
                rows: [{
                    id: 'dash-123',
                    dashboard_name: dashboardData.dashboardName,
                    widgets: JSON.stringify(dashboardData.widgets),
                    refresh_interval: dashboardData.refreshInterval,
                    is_default: false,
                    is_public: false,
                }],
            });

            const result = await analyticsService.createDashboard(dashboardData, 'user-123');

            expect(result.dashboardName).toBe('Executive Dashboard');
            expect(result.refreshInterval).toBe(60);
        });
    });

    describe('exportData', () => {
        it('should create data export request', async () => {
            const exportData = {
                exportName: 'Q2 Analytics',
                exportType: 'metrics' as const,
                queryConfig: { metricIds: ['metric-1', 'metric-2'] },
                outputFormat: 'excel' as const,
            };

            mockPool.query.mockResolvedValue({
                rows: [{
                    id: 'export-123',
                    export_name: exportData.exportName,
                    export_type: exportData.exportType,
                    output_format: exportData.outputFormat,
                    status: 'pending',
                }],
            });

            const result = await analyticsService.exportData(exportData, 'user-123');

            expect(result.exportName).toBe('Q2 Analytics');
            expect(result.status).toBe('pending');
        });
    });

    describe('calculateAggregates', () => {
        it('should calculate aggregates for metrics', async () => {
            const tenantId = 'tenant-123';
            const metricIds = ['metric-1', 'metric-2'];
            const startDate = new Date('2024-05-01');
            const endDate = new Date('2024-05-31');

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{
                        metric_id: 'metric-1',
                        aggregate_value: '150000',
                        data_points: '31',
                    }],
                })
                .mockResolvedValueOnce({
                    rows: [{
                        metric_id: 'metric-2',
                        aggregate_value: '5000',
                        data_points: '31',
                    }],
                });

            const result = await analyticsService.calculateAggregates(
                tenantId,
                metricIds,
                startDate,
                endDate,
                'sum'
            );

            expect(result).toHaveLength(2);
            expect(result[0].value).toBe(150000);
            expect(result[1].dataPoints).toBe(31);
        });
    });
});
