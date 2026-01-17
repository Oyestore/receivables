export interface IAnalyticsMetric {
    id: string;
    metricName: string;
    metricCategory?: string;
    metricType?: 'count' | 'sum' | 'average' | 'percentage' | 'ratio' | 'custom';
    calculationFormula?: string;
    unitType?: string;
    aggregationPeriod?: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
    description?: string;
    isActive: boolean;
}

export interface IAnalyticsKPI {
    id: string;
    tenantId: string;
    metricId: string;
    kpiDate: Date;
    kpiValue?: number;
    targetValue?: number;
    variance?: number;
    variancePercentage?: number;
    trend?: 'up' | 'down' | 'stable';
    status?: 'on_track' | 'at_risk' | 'off_track' | 'exceeded';
    metadata?: any;
}

export interface IAnalyticsReport {
    id: string;
    reportName: string;
    reportType: 'standard' | 'custom' | 'scheduled' | 'ad_hoc';
    tenantId?: string;
    reportConfig: any;
    schedule?: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
    nextRunDate?: Date;
    recipients?: any;
    outputFormat?: 'pdf' | 'excel' | 'csv' | 'json' | 'html';
    isActive: boolean;
    createdBy?: string;
}

export interface IAnalyticsDashboard {
    id: string;
    dashboardName: string;
    tenantId?: string;
    layout?: any;
    widgets: any;
    filters?: any;
    refreshInterval: number;
    isDefault: boolean;
    isPublic: boolean;
    createdBy?: string;
}

export interface IReportExecution {
    id: string;
    reportId: string;
    executionDate: Date;
    executionStatus: 'running' | 'completed' | 'failed' | 'cancelled';
    outputFilePath?: string;
    fileSize?: number;
    executionTimeMs?: number;
    errorMessage?: string;
    parameters?: any;
}

export interface IDataExport {
    id: string;
    tenantId?: string;
    exportName: string;
    exportType: 'metrics' | 'kpis' | 'custom_query' | 'dashboard';
    queryConfig: any;
    outputFormat: 'pdf' | 'excel' | 'csv' | 'json';
    filePath?: string;
    fileSize?: number;
    rowCount?: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    requestedBy?: string;
    requestedAt: Date;
    completedAt?: Date;
    expiresAt?: Date;
}
