export interface IMonitoringConfig {
    enabled: boolean;
    interval?: number;
    [key: string]: any;
}

export interface IMetric {
    name: string;
    value: number;
    timestamp: Date;
    [key: string]: any;
}

export interface IAlert {
    id: string;
    severity: string;
    message: string;
    [key: string]: any;
}

export interface IEvent {
    id: string;
    type: string;
    timestamp: Date;
    data?: any;
    [key: string]: any;
}

export interface IHealthCheck {
    status: string;
    timestamp: Date;
    checks: Record<string, any>;
}

export interface IPerformanceMetric {
    name: string;
    value: number;
    unit: string;
    timestamp: Date;
}

export interface IMetricDefinition {
    name: string;
    type: string;
    unit?: string;
    description?: string;
}

export interface IMetricValue {
    metricId: string;
    value: number;
    timestamp: Date;
    labels?: Record<string, string>;
}

export interface IAlertConfiguration {
    name: string;
    condition: string;
    threshold: number;
    severity: string;
    enabled: boolean;
}

export interface IAlertAction {
    type: string;
    config: Record<string, any>;
}

export interface IHealthCheckConfiguration {
    endpoint: string;
    interval: number;
    timeout: number;
    retries?: number;
}

export interface IDashboardConfiguration {
    name: string;
    layout: Record<string, any>;
    widgets: any[];
}

export interface IHealthCheckResult {
    status: string;
    timestamp: Date;
    details: Record<string, any>;
}

export interface IDashboardWidget {
    id: string;
    type: string;
    config: Record<string, any>;
}

export interface ILogConfiguration {
    level: string;
    retention: number;
    format?: string;
}

export interface ILogEntry {
    level: string;
    message: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface IEventConfiguration {
    type: string;
    enabled: boolean;
    handlers: string[];
}

export interface IDataQualityConfiguration {
    checks: string[];
    threshold: number;
    schedule?: string;
}

export interface IDataQualityResult {
    status: string;
    score: number;
    issues: string[];
    timestamp: Date;
}

export interface IResourceUtilization {
    resourceType: string;
    current: number;
    max: number;
    percentage: number;
}
