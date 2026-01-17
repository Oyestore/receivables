// TypeScript Type Definitions for Dashboard Framework
// frontend/src/types/dashboard.types.ts

export enum DashboardLayout {
    GRID = 'GRID',
    FLEX = 'FLEX',
    CUSTOM = 'CUSTOM',
}

export enum DashboardVisibility {
    PRIVATE = 'PRIVATE',
    SHARED = 'SHARED',
    PUBLIC = 'PUBLIC',
}

export enum DashboardStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    ARCHIVED = 'ARCHIVED',
}

export enum WidgetType {
    // Charts
    LINE_CHART = 'LINE_CHART',
    BAR_CHART = 'BAR_CHART',
    PIE_CHART = 'PIE_CHART',
    SCATTER_PLOT = 'SCATTER_PLOT',
    HEATMAP = 'HEATMAP',
    GAUGE_CHART = 'GAUGE_CHART',
    AREA_CHART = 'AREA_CHART',

    // Data
    KPI_CARD = 'KPI_CARD',
    DATA_TABLE = 'DATA_TABLE',
    PROGRESS_BAR = 'PROGRESS_BAR',
    METRIC_COMPARISON = 'METRIC_COMPARISON',
    ALERT_PANEL = 'ALERT_PANEL',

    // Interactive
    FILTER_CONTROL = 'FILTER_CONTROL',
    DATE_RANGE_SELECTOR = 'DATE_RANGE_SELECTOR',
    PARAMETER_INPUT = 'PARAMETER_INPUT',
    CUSTOM = 'CUSTOM',
}

export interface Dashboard {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    layout: DashboardLayout;
    visibility: DashboardVisibility;
    status: DashboardStatus;
    layoutConfig: LayoutConfig;
    refreshSettings: RefreshSettings;
    sharedWith: ShareConfig[];
    metadata?: DashboardMetadata;
    globalFilters?: Record<string, any>;
    widgets?: Widget[];
    createdBy: string;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
    viewCount: number;
    lastViewedAt?: string;
}

export interface LayoutConfig {
    columns?: number;
    rows?: number | 'auto';
    gap?: number;
    padding?: number;
    backgroundColor?: string;
    customCss?: string;
}

export interface RefreshSettings {
    autoRefresh: boolean;
    refreshInterval: number;
    lastRefreshed?: string;
}

export interface ShareConfig {
    userId?: string;
    roleId?: string;
    permissions: ('view' | 'edit' | 'admin')[];
}

export interface DashboardMetadata {
    category?: string;
    tags?: string[];
    thumbnail?: string;
    isTemplate?: boolean;
    templateOf?: string;
}

export interface Widget {
    id: string;
    dashboardId: string;
    title: string;
    description?: string;
    type: WidgetType;
    position: WidgetPosition;
    dataSourceType: DataSourceType;
    dataSourceConfig: DataSourceConfig;
    widgetConfig: WidgetConfig;
    styling?: WidgetStyling;
    interactions?: WidgetInteractions;
    dataTransform?: DataTransform;
    cacheInfo?: CacheInfo;
    lastError?: string;
    lastErrorAt?: string;
    errorCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface WidgetPosition {
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
}

export enum DataSourceType {
    SQL_QUERY = 'SQL_QUERY',
    REST_API = 'REST_API',
    GRAPHQL = 'GRAPHQL',
    STATIC_DATA = 'STATIC_DATA',
    REAL_TIME_STREAM = 'REAL_TIME_STREAM',
}

export interface DataSourceConfig {
    query?: string;
    database?: string;
    endpoint?: string;
    method?: string;
    headers?: Record<string, string>;
    graphqlQuery?: string;
    variables?: Record<string, any>;
    data?: any[];
    streamTopic?: string;
    refreshInterval?: number;
    cacheEnabled?: boolean;
    cacheTTL?: number;
}

export interface WidgetConfig {
    chartOptions?: ChartOptions;
    kpiOptions?: KPIOptions;
    tableOptions?: TableOptions;
    filterOptions?: FilterOptions;
    customConfig?: Record<string, any>;
}

export interface ChartOptions {
    xAxis?: any;
    yAxis?: any;
    legend?: any;
    colors?: string[];
    animations?: boolean;
    tooltip?: any;
}

export interface KPIOptions {
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: number;
    target?: number;
    unit?: string;
    icon?: string;
}

export interface TableOptions {
    columns: TableColumn[];
    pagination?: boolean;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface TableColumn {
    field: string;
    header: string;
    sortable?: boolean;
    filterable?: boolean;
    width?: string;
}

export interface FilterOptions {
    filterType: 'text' | 'number' | 'date' | 'select' | 'multiselect';
    options?: any[];
    defaultValue?: any;
    targetWidgets?: string[];
}

export interface WidgetStyling {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    padding?: number;
    textColor?: string;
    fontFamily?: string;
    fontSize?: number;
    customCss?: string;
}

export interface WidgetInteractions {
    clickThrough?: {
        enabled: boolean;
        targetUrl?: string;
        targetDashboard?: string;
        targetWidget?: string;
    };
    drillDown?: {
        enabled: boolean;
        levels?: Array<{ field: string; label: string }>;
    };
    crossFilter?: {
        enabled: boolean;
        targetWidgets?: string[];
    };
}

export interface DataTransform {
    aggregations?: Aggregation[];
    filters?: Filter[];
    groupBy?: string[];
    sortBy?: SortConfig[];
    limit?: number;
}

export interface Aggregation {
    field: string;
    function: 'sum' | 'avg' | 'count' | 'min' | 'max';
    alias?: string;
}

export interface Filter {
    field: string;
    operator: string;
    value: any;
}

export interface SortConfig {
    field: string;
    order: 'asc' | 'desc';
}

export interface CacheInfo {
    lastFetched?: string;
    cachedData?: any;
    cacheKey?: string;
}

// API Response Types
export interface DashboardListResponse {
    dashboards: Dashboard[];
    total: number;
    limit: number;
    offset: number;
}

export interface WidgetDataResponse {
    widgetId: string;
    data: any;
    fetchedAt: string;
    cached: boolean;
    executionTime: number;
}

// WebSocket Event Types
export interface WidgetDataUpdate {
    widgetId: string;
    data: any;
    timestamp: string;
}

export interface WidgetError {
    widgetId: string;
    error: {
        message: string;
        code?: string;
    };
    timestamp: string;
}

export interface FilterChange {
    dashboardId: string;
    filters: Record<string, any>;
    changedBy: string;
}
