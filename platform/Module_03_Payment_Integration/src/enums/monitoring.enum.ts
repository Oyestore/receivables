/**
 * Module 3 Phase 3.1: Advanced Automation Foundation
 * Monitoring and Observability Enums
 * 
 * Comprehensive enums for monitoring, alerting, metrics collection,
 * and observability infrastructure
 */

/**
 * Monitoring metric types
 */
export enum MetricType {
  // Performance Metrics
  RESPONSE_TIME = 'response_time',
  THROUGHPUT = 'throughput',
  LATENCY = 'latency',
  CPU_USAGE = 'cpu_usage',
  MEMORY_USAGE = 'memory_usage',
  DISK_USAGE = 'disk_usage',
  NETWORK_IO = 'network_io',
  
  // Business Metrics
  TRANSACTION_COUNT = 'transaction_count',
  SUCCESS_RATE = 'success_rate',
  ERROR_RATE = 'error_rate',
  CONVERSION_RATE = 'conversion_rate',
  REVENUE = 'revenue',
  CUSTOMER_SATISFACTION = 'customer_satisfaction',
  
  // System Health Metrics
  UPTIME = 'uptime',
  AVAILABILITY = 'availability',
  RELIABILITY = 'reliability',
  SCALABILITY = 'scalability',
  
  // Security Metrics
  FAILED_LOGINS = 'failed_logins',
  SECURITY_INCIDENTS = 'security_incidents',
  VULNERABILITY_COUNT = 'vulnerability_count',
  COMPLIANCE_SCORE = 'compliance_score',
  
  // Quality Metrics
  CODE_COVERAGE = 'code_coverage',
  BUG_COUNT = 'bug_count',
  TECHNICAL_DEBT = 'technical_debt',
  PERFORMANCE_SCORE = 'performance_score'
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

/**
 * Alert status enumeration
 */
export enum AlertStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  SUPPRESSED = 'suppressed',
  ESCALATED = 'escalated'
}

/**
 * Monitoring data sources
 */
export enum DataSource {
  APPLICATION_LOGS = 'application_logs',
  SYSTEM_METRICS = 'system_metrics',
  DATABASE_METRICS = 'database_metrics',
  NETWORK_METRICS = 'network_metrics',
  BUSINESS_METRICS = 'business_metrics',
  SECURITY_LOGS = 'security_logs',
  AUDIT_LOGS = 'audit_logs',
  PERFORMANCE_COUNTERS = 'performance_counters',
  CUSTOM_METRICS = 'custom_metrics',
  THIRD_PARTY_APIS = 'third_party_apis'
}

/**
 * Health check status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
  MAINTENANCE = 'maintenance'
}

/**
 * Monitoring frequency intervals
 */
export enum MonitoringInterval {
  REAL_TIME = 'real_time',
  EVERY_SECOND = 'every_second',
  EVERY_5_SECONDS = 'every_5_seconds',
  EVERY_10_SECONDS = 'every_10_seconds',
  EVERY_30_SECONDS = 'every_30_seconds',
  EVERY_MINUTE = 'every_minute',
  EVERY_5_MINUTES = 'every_5_minutes',
  EVERY_15_MINUTES = 'every_15_minutes',
  EVERY_30_MINUTES = 'every_30_minutes',
  HOURLY = 'hourly',
  DAILY = 'daily'
}

/**
 * Dashboard types
 */
export enum DashboardType {
  EXECUTIVE = 'executive',
  OPERATIONAL = 'operational',
  TECHNICAL = 'technical',
  BUSINESS = 'business',
  SECURITY = 'security',
  COMPLIANCE = 'compliance',
  PERFORMANCE = 'performance',
  CUSTOM = 'custom'
}

/**
 * Chart and visualization types
 */
export enum ChartType {
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  AREA_CHART = 'area_chart',
  SCATTER_PLOT = 'scatter_plot',
  HISTOGRAM = 'histogram',
  HEATMAP = 'heatmap',
  GAUGE = 'gauge',
  TABLE = 'table',
  SINGLE_STAT = 'single_stat',
  WORLD_MAP = 'world_map',
  GRAPH = 'graph'
}

/**
 * Log levels for structured logging
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Event types for system events
 */
export enum EventType {
  // System Events
  SYSTEM_START = 'system_start',
  SYSTEM_STOP = 'system_stop',
  SYSTEM_ERROR = 'system_error',
  SYSTEM_WARNING = 'system_warning',
  
  // Application Events
  APPLICATION_DEPLOY = 'application_deploy',
  APPLICATION_ERROR = 'application_error',
  APPLICATION_PERFORMANCE = 'application_performance',
  
  // Business Events
  TRANSACTION_COMPLETED = 'transaction_completed',
  TRANSACTION_FAILED = 'transaction_failed',
  CUSTOMER_ACTION = 'customer_action',
  PAYMENT_PROCESSED = 'payment_processed',
  
  // Security Events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  SECURITY_BREACH = 'security_breach',
  
  // Infrastructure Events
  SERVER_DOWN = 'server_down',
  SERVER_UP = 'server_up',
  DATABASE_CONNECTION_LOST = 'database_connection_lost',
  NETWORK_ISSUE = 'network_issue'
}

/**
 * Notification channels for alerts
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  SLACK = 'slack',
  TEAMS = 'teams',
  WEBHOOK = 'webhook',
  PAGERDUTY = 'pagerduty',
  OPSGENIE = 'opsgenie',
  PUSH_NOTIFICATION = 'push_notification',
  IN_APP = 'in_app'
}

/**
 * Aggregation methods for metrics
 */
export enum AggregationMethod {
  SUM = 'sum',
  AVERAGE = 'average',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
  MEDIAN = 'median',
  PERCENTILE_95 = 'percentile_95',
  PERCENTILE_99 = 'percentile_99',
  STANDARD_DEVIATION = 'standard_deviation',
  RATE = 'rate'
}

/**
 * Time window periods for metrics aggregation
 */
export enum TimeWindow {
  LAST_5_MINUTES = 'last_5_minutes',
  LAST_15_MINUTES = 'last_15_minutes',
  LAST_30_MINUTES = 'last_30_minutes',
  LAST_HOUR = 'last_hour',
  LAST_4_HOURS = 'last_4_hours',
  LAST_12_HOURS = 'last_12_hours',
  LAST_24_HOURS = 'last_24_hours',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  CUSTOM = 'custom'
}

/**
 * Monitoring tool types
 */
export enum MonitoringTool {
  PROMETHEUS = 'prometheus',
  GRAFANA = 'grafana',
  ELASTICSEARCH = 'elasticsearch',
  KIBANA = 'kibana',
  DATADOG = 'datadog',
  NEW_RELIC = 'new_relic',
  SPLUNK = 'splunk',
  NAGIOS = 'nagios',
  ZABBIX = 'zabbix',
  CUSTOM = 'custom'
}

/**
 * Performance threshold types
 */
export enum ThresholdType {
  STATIC = 'static',
  DYNAMIC = 'dynamic',
  BASELINE = 'baseline',
  SEASONAL = 'seasonal',
  PREDICTIVE = 'predictive',
  ANOMALY_DETECTION = 'anomaly_detection'
}

/**
 * Monitoring scope levels
 */
export enum MonitoringScope {
  GLOBAL = 'global',
  REGIONAL = 'regional',
  DATACENTER = 'datacenter',
  CLUSTER = 'cluster',
  NODE = 'node',
  SERVICE = 'service',
  INSTANCE = 'instance',
  COMPONENT = 'component'
}

/**
 * Data retention policies
 */
export enum RetentionPolicy {
  REAL_TIME = 'real_time',
  SHORT_TERM = 'short_term',
  MEDIUM_TERM = 'medium_term',
  LONG_TERM = 'long_term',
  ARCHIVAL = 'archival',
  PERMANENT = 'permanent'
}

/**
 * Monitoring configuration states
 */
export enum ConfigurationState {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  TESTING = 'testing',
  DEPRECATED = 'deprecated',
  ARCHIVED = 'archived'
}

/**
 * Alert escalation levels
 */
export enum EscalationLevel {
  LEVEL_1 = 'level_1',
  LEVEL_2 = 'level_2',
  LEVEL_3 = 'level_3',
  LEVEL_4 = 'level_4',
  EXECUTIVE = 'executive'
}

/**
 * Monitoring data quality levels
 */
export enum DataQuality {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  UNRELIABLE = 'unreliable',
  MISSING = 'missing'
}

/**
 * Observability pillars
 */
export enum ObservabilityPillar {
  METRICS = 'metrics',
  LOGS = 'logs',
  TRACES = 'traces',
  EVENTS = 'events'
}

/**
 * Monitoring automation levels
 */
export enum AutomationLevel {
  MANUAL = 'manual',
  SEMI_AUTOMATED = 'semi_automated',
  FULLY_AUTOMATED = 'fully_automated',
  AI_POWERED = 'ai_powered',
  SELF_HEALING = 'self_healing'
}

