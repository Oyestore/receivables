"use strict";
/**
 * Module 3 Phase 3.1: Advanced Automation Foundation
 * Monitoring and Observability Enums
 *
 * Comprehensive enums for monitoring, alerting, metrics collection,
 * and observability infrastructure
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationLevel = exports.ObservabilityPillar = exports.DataQuality = exports.EscalationLevel = exports.ConfigurationState = exports.RetentionPolicy = exports.MonitoringScope = exports.ThresholdType = exports.MonitoringTool = exports.TimeWindow = exports.AggregationMethod = exports.NotificationChannel = exports.EventType = exports.LogLevel = exports.ChartType = exports.DashboardType = exports.MonitoringInterval = exports.HealthStatus = exports.DataSource = exports.AlertStatus = exports.AlertSeverity = exports.MetricType = void 0;
/**
 * Monitoring metric types
 */
var MetricType;
(function (MetricType) {
    // Performance Metrics
    MetricType["RESPONSE_TIME"] = "response_time";
    MetricType["THROUGHPUT"] = "throughput";
    MetricType["LATENCY"] = "latency";
    MetricType["CPU_USAGE"] = "cpu_usage";
    MetricType["MEMORY_USAGE"] = "memory_usage";
    MetricType["DISK_USAGE"] = "disk_usage";
    MetricType["NETWORK_IO"] = "network_io";
    // Business Metrics
    MetricType["TRANSACTION_COUNT"] = "transaction_count";
    MetricType["SUCCESS_RATE"] = "success_rate";
    MetricType["ERROR_RATE"] = "error_rate";
    MetricType["CONVERSION_RATE"] = "conversion_rate";
    MetricType["REVENUE"] = "revenue";
    MetricType["CUSTOMER_SATISFACTION"] = "customer_satisfaction";
    // System Health Metrics
    MetricType["UPTIME"] = "uptime";
    MetricType["AVAILABILITY"] = "availability";
    MetricType["RELIABILITY"] = "reliability";
    MetricType["SCALABILITY"] = "scalability";
    // Security Metrics
    MetricType["FAILED_LOGINS"] = "failed_logins";
    MetricType["SECURITY_INCIDENTS"] = "security_incidents";
    MetricType["VULNERABILITY_COUNT"] = "vulnerability_count";
    MetricType["COMPLIANCE_SCORE"] = "compliance_score";
    // Quality Metrics
    MetricType["CODE_COVERAGE"] = "code_coverage";
    MetricType["BUG_COUNT"] = "bug_count";
    MetricType["TECHNICAL_DEBT"] = "technical_debt";
    MetricType["PERFORMANCE_SCORE"] = "performance_score";
})(MetricType || (exports.MetricType = MetricType = {}));
/**
 * Alert severity levels
 */
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["CRITICAL"] = "critical";
    AlertSeverity["HIGH"] = "high";
    AlertSeverity["MEDIUM"] = "medium";
    AlertSeverity["LOW"] = "low";
    AlertSeverity["INFO"] = "info";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
/**
 * Alert status enumeration
 */
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["OPEN"] = "open";
    AlertStatus["ACKNOWLEDGED"] = "acknowledged";
    AlertStatus["IN_PROGRESS"] = "in_progress";
    AlertStatus["RESOLVED"] = "resolved";
    AlertStatus["CLOSED"] = "closed";
    AlertStatus["SUPPRESSED"] = "suppressed";
    AlertStatus["ESCALATED"] = "escalated";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
/**
 * Monitoring data sources
 */
var DataSource;
(function (DataSource) {
    DataSource["APPLICATION_LOGS"] = "application_logs";
    DataSource["SYSTEM_METRICS"] = "system_metrics";
    DataSource["DATABASE_METRICS"] = "database_metrics";
    DataSource["NETWORK_METRICS"] = "network_metrics";
    DataSource["BUSINESS_METRICS"] = "business_metrics";
    DataSource["SECURITY_LOGS"] = "security_logs";
    DataSource["AUDIT_LOGS"] = "audit_logs";
    DataSource["PERFORMANCE_COUNTERS"] = "performance_counters";
    DataSource["CUSTOM_METRICS"] = "custom_metrics";
    DataSource["THIRD_PARTY_APIS"] = "third_party_apis";
})(DataSource || (exports.DataSource = DataSource = {}));
/**
 * Health check status
 */
var HealthStatus;
(function (HealthStatus) {
    HealthStatus["HEALTHY"] = "healthy";
    HealthStatus["DEGRADED"] = "degraded";
    HealthStatus["UNHEALTHY"] = "unhealthy";
    HealthStatus["UNKNOWN"] = "unknown";
    HealthStatus["MAINTENANCE"] = "maintenance";
})(HealthStatus || (exports.HealthStatus = HealthStatus = {}));
/**
 * Monitoring frequency intervals
 */
var MonitoringInterval;
(function (MonitoringInterval) {
    MonitoringInterval["REAL_TIME"] = "real_time";
    MonitoringInterval["EVERY_SECOND"] = "every_second";
    MonitoringInterval["EVERY_5_SECONDS"] = "every_5_seconds";
    MonitoringInterval["EVERY_10_SECONDS"] = "every_10_seconds";
    MonitoringInterval["EVERY_30_SECONDS"] = "every_30_seconds";
    MonitoringInterval["EVERY_MINUTE"] = "every_minute";
    MonitoringInterval["EVERY_5_MINUTES"] = "every_5_minutes";
    MonitoringInterval["EVERY_15_MINUTES"] = "every_15_minutes";
    MonitoringInterval["EVERY_30_MINUTES"] = "every_30_minutes";
    MonitoringInterval["HOURLY"] = "hourly";
    MonitoringInterval["DAILY"] = "daily";
})(MonitoringInterval || (exports.MonitoringInterval = MonitoringInterval = {}));
/**
 * Dashboard types
 */
var DashboardType;
(function (DashboardType) {
    DashboardType["EXECUTIVE"] = "executive";
    DashboardType["OPERATIONAL"] = "operational";
    DashboardType["TECHNICAL"] = "technical";
    DashboardType["BUSINESS"] = "business";
    DashboardType["SECURITY"] = "security";
    DashboardType["COMPLIANCE"] = "compliance";
    DashboardType["PERFORMANCE"] = "performance";
    DashboardType["CUSTOM"] = "custom";
})(DashboardType || (exports.DashboardType = DashboardType = {}));
/**
 * Chart and visualization types
 */
var ChartType;
(function (ChartType) {
    ChartType["LINE_CHART"] = "line_chart";
    ChartType["BAR_CHART"] = "bar_chart";
    ChartType["PIE_CHART"] = "pie_chart";
    ChartType["AREA_CHART"] = "area_chart";
    ChartType["SCATTER_PLOT"] = "scatter_plot";
    ChartType["HISTOGRAM"] = "histogram";
    ChartType["HEATMAP"] = "heatmap";
    ChartType["GAUGE"] = "gauge";
    ChartType["TABLE"] = "table";
    ChartType["SINGLE_STAT"] = "single_stat";
    ChartType["WORLD_MAP"] = "world_map";
    ChartType["GRAPH"] = "graph";
})(ChartType || (exports.ChartType = ChartType = {}));
/**
 * Log levels for structured logging
 */
var LogLevel;
(function (LogLevel) {
    LogLevel["TRACE"] = "trace";
    LogLevel["DEBUG"] = "debug";
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
    LogLevel["FATAL"] = "fatal";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * Event types for system events
 */
var EventType;
(function (EventType) {
    // System Events
    EventType["SYSTEM_START"] = "system_start";
    EventType["SYSTEM_STOP"] = "system_stop";
    EventType["SYSTEM_ERROR"] = "system_error";
    EventType["SYSTEM_WARNING"] = "system_warning";
    // Application Events
    EventType["APPLICATION_DEPLOY"] = "application_deploy";
    EventType["APPLICATION_ERROR"] = "application_error";
    EventType["APPLICATION_PERFORMANCE"] = "application_performance";
    // Business Events
    EventType["TRANSACTION_COMPLETED"] = "transaction_completed";
    EventType["TRANSACTION_FAILED"] = "transaction_failed";
    EventType["CUSTOMER_ACTION"] = "customer_action";
    EventType["PAYMENT_PROCESSED"] = "payment_processed";
    // Security Events
    EventType["LOGIN_SUCCESS"] = "login_success";
    EventType["LOGIN_FAILURE"] = "login_failure";
    EventType["UNAUTHORIZED_ACCESS"] = "unauthorized_access";
    EventType["SECURITY_BREACH"] = "security_breach";
    // Infrastructure Events
    EventType["SERVER_DOWN"] = "server_down";
    EventType["SERVER_UP"] = "server_up";
    EventType["DATABASE_CONNECTION_LOST"] = "database_connection_lost";
    EventType["NETWORK_ISSUE"] = "network_issue";
})(EventType || (exports.EventType = EventType = {}));
/**
 * Notification channels for alerts
 */
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["EMAIL"] = "email";
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["SLACK"] = "slack";
    NotificationChannel["TEAMS"] = "teams";
    NotificationChannel["WEBHOOK"] = "webhook";
    NotificationChannel["PAGERDUTY"] = "pagerduty";
    NotificationChannel["OPSGENIE"] = "opsgenie";
    NotificationChannel["PUSH_NOTIFICATION"] = "push_notification";
    NotificationChannel["IN_APP"] = "in_app";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
/**
 * Aggregation methods for metrics
 */
var AggregationMethod;
(function (AggregationMethod) {
    AggregationMethod["SUM"] = "sum";
    AggregationMethod["AVERAGE"] = "average";
    AggregationMethod["MIN"] = "min";
    AggregationMethod["MAX"] = "max";
    AggregationMethod["COUNT"] = "count";
    AggregationMethod["MEDIAN"] = "median";
    AggregationMethod["PERCENTILE_95"] = "percentile_95";
    AggregationMethod["PERCENTILE_99"] = "percentile_99";
    AggregationMethod["STANDARD_DEVIATION"] = "standard_deviation";
    AggregationMethod["RATE"] = "rate";
})(AggregationMethod || (exports.AggregationMethod = AggregationMethod = {}));
/**
 * Time window periods for metrics aggregation
 */
var TimeWindow;
(function (TimeWindow) {
    TimeWindow["LAST_5_MINUTES"] = "last_5_minutes";
    TimeWindow["LAST_15_MINUTES"] = "last_15_minutes";
    TimeWindow["LAST_30_MINUTES"] = "last_30_minutes";
    TimeWindow["LAST_HOUR"] = "last_hour";
    TimeWindow["LAST_4_HOURS"] = "last_4_hours";
    TimeWindow["LAST_12_HOURS"] = "last_12_hours";
    TimeWindow["LAST_24_HOURS"] = "last_24_hours";
    TimeWindow["LAST_7_DAYS"] = "last_7_days";
    TimeWindow["LAST_30_DAYS"] = "last_30_days";
    TimeWindow["CUSTOM"] = "custom";
})(TimeWindow || (exports.TimeWindow = TimeWindow = {}));
/**
 * Monitoring tool types
 */
var MonitoringTool;
(function (MonitoringTool) {
    MonitoringTool["PROMETHEUS"] = "prometheus";
    MonitoringTool["GRAFANA"] = "grafana";
    MonitoringTool["ELASTICSEARCH"] = "elasticsearch";
    MonitoringTool["KIBANA"] = "kibana";
    MonitoringTool["DATADOG"] = "datadog";
    MonitoringTool["NEW_RELIC"] = "new_relic";
    MonitoringTool["SPLUNK"] = "splunk";
    MonitoringTool["NAGIOS"] = "nagios";
    MonitoringTool["ZABBIX"] = "zabbix";
    MonitoringTool["CUSTOM"] = "custom";
})(MonitoringTool || (exports.MonitoringTool = MonitoringTool = {}));
/**
 * Performance threshold types
 */
var ThresholdType;
(function (ThresholdType) {
    ThresholdType["STATIC"] = "static";
    ThresholdType["DYNAMIC"] = "dynamic";
    ThresholdType["BASELINE"] = "baseline";
    ThresholdType["SEASONAL"] = "seasonal";
    ThresholdType["PREDICTIVE"] = "predictive";
    ThresholdType["ANOMALY_DETECTION"] = "anomaly_detection";
})(ThresholdType || (exports.ThresholdType = ThresholdType = {}));
/**
 * Monitoring scope levels
 */
var MonitoringScope;
(function (MonitoringScope) {
    MonitoringScope["GLOBAL"] = "global";
    MonitoringScope["REGIONAL"] = "regional";
    MonitoringScope["DATACENTER"] = "datacenter";
    MonitoringScope["CLUSTER"] = "cluster";
    MonitoringScope["NODE"] = "node";
    MonitoringScope["SERVICE"] = "service";
    MonitoringScope["INSTANCE"] = "instance";
    MonitoringScope["COMPONENT"] = "component";
})(MonitoringScope || (exports.MonitoringScope = MonitoringScope = {}));
/**
 * Data retention policies
 */
var RetentionPolicy;
(function (RetentionPolicy) {
    RetentionPolicy["REAL_TIME"] = "real_time";
    RetentionPolicy["SHORT_TERM"] = "short_term";
    RetentionPolicy["MEDIUM_TERM"] = "medium_term";
    RetentionPolicy["LONG_TERM"] = "long_term";
    RetentionPolicy["ARCHIVAL"] = "archival";
    RetentionPolicy["PERMANENT"] = "permanent";
})(RetentionPolicy || (exports.RetentionPolicy = RetentionPolicy = {}));
/**
 * Monitoring configuration states
 */
var ConfigurationState;
(function (ConfigurationState) {
    ConfigurationState["ACTIVE"] = "active";
    ConfigurationState["INACTIVE"] = "inactive";
    ConfigurationState["DRAFT"] = "draft";
    ConfigurationState["TESTING"] = "testing";
    ConfigurationState["DEPRECATED"] = "deprecated";
    ConfigurationState["ARCHIVED"] = "archived";
})(ConfigurationState || (exports.ConfigurationState = ConfigurationState = {}));
/**
 * Alert escalation levels
 */
var EscalationLevel;
(function (EscalationLevel) {
    EscalationLevel["LEVEL_1"] = "level_1";
    EscalationLevel["LEVEL_2"] = "level_2";
    EscalationLevel["LEVEL_3"] = "level_3";
    EscalationLevel["LEVEL_4"] = "level_4";
    EscalationLevel["EXECUTIVE"] = "executive";
})(EscalationLevel || (exports.EscalationLevel = EscalationLevel = {}));
/**
 * Monitoring data quality levels
 */
var DataQuality;
(function (DataQuality) {
    DataQuality["HIGH"] = "high";
    DataQuality["MEDIUM"] = "medium";
    DataQuality["LOW"] = "low";
    DataQuality["UNRELIABLE"] = "unreliable";
    DataQuality["MISSING"] = "missing";
})(DataQuality || (exports.DataQuality = DataQuality = {}));
/**
 * Observability pillars
 */
var ObservabilityPillar;
(function (ObservabilityPillar) {
    ObservabilityPillar["METRICS"] = "metrics";
    ObservabilityPillar["LOGS"] = "logs";
    ObservabilityPillar["TRACES"] = "traces";
    ObservabilityPillar["EVENTS"] = "events";
})(ObservabilityPillar || (exports.ObservabilityPillar = ObservabilityPillar = {}));
/**
 * Monitoring automation levels
 */
var AutomationLevel;
(function (AutomationLevel) {
    AutomationLevel["MANUAL"] = "manual";
    AutomationLevel["SEMI_AUTOMATED"] = "semi_automated";
    AutomationLevel["FULLY_AUTOMATED"] = "fully_automated";
    AutomationLevel["AI_POWERED"] = "ai_powered";
    AutomationLevel["SELF_HEALING"] = "self_healing";
})(AutomationLevel || (exports.AutomationLevel = AutomationLevel = {}));
//# sourceMappingURL=monitoring.enum.js.map