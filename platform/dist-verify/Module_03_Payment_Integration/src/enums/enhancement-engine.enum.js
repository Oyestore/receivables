"use strict";
/**
 * Comprehensive Enhancement Engine Enums
 * Advanced AI-powered enhancement system with DeepSeek R1 integration
 * Designed for SME Receivables Management Platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QualityMetric = exports.ProcessingMode = exports.AIModelType = exports.EnhancementCategory = exports.EnhancementPriority = exports.EnhancementStatus = exports.NotificationChannel = exports.AlertSeverityLevel = exports.DashboardType = exports.MonitoringType = exports.CommunicationProtocol = exports.ServiceMeshType = exports.OrchestrationStrategy = exports.IntegrationPattern = exports.AutomationExecutionMode = exports.AutomationComplexityLevel = exports.AutomationStrategy = exports.AutomationType = exports.AnomalyDetectionType = exports.ForecastingHorizon = exports.AnalyticsDataType = exports.PredictionModelType = exports.PerformanceEnhancementTrigger = exports.ResourceOptimizationType = exports.PerformanceMetricType = exports.PerformanceOptimizationStrategy = void 0;
// ==================== PERFORMANCE ENHANCEMENT ENUMS ====================
/**
 * Performance optimization strategies
 */
var PerformanceOptimizationStrategy;
(function (PerformanceOptimizationStrategy) {
    PerformanceOptimizationStrategy["REAL_TIME_OPTIMIZATION"] = "real_time_optimization";
    PerformanceOptimizationStrategy["BATCH_OPTIMIZATION"] = "batch_optimization";
    PerformanceOptimizationStrategy["PREDICTIVE_OPTIMIZATION"] = "predictive_optimization";
    PerformanceOptimizationStrategy["ADAPTIVE_OPTIMIZATION"] = "adaptive_optimization";
    PerformanceOptimizationStrategy["HYBRID_OPTIMIZATION"] = "hybrid_optimization";
    PerformanceOptimizationStrategy["MACHINE_LEARNING_OPTIMIZATION"] = "machine_learning_optimization";
    PerformanceOptimizationStrategy["RULE_BASED_OPTIMIZATION"] = "rule_based_optimization";
    PerformanceOptimizationStrategy["GENETIC_ALGORITHM_OPTIMIZATION"] = "genetic_algorithm_optimization";
    PerformanceOptimizationStrategy["PARTICLE_SWARM_OPTIMIZATION"] = "particle_swarm_optimization";
    PerformanceOptimizationStrategy["SIMULATED_ANNEALING_OPTIMIZATION"] = "simulated_annealing_optimization";
    PerformanceOptimizationStrategy["GRADIENT_DESCENT_OPTIMIZATION"] = "gradient_descent_optimization";
    PerformanceOptimizationStrategy["BAYESIAN_OPTIMIZATION"] = "bayesian_optimization";
    PerformanceOptimizationStrategy["MULTI_OBJECTIVE_OPTIMIZATION"] = "multi_objective_optimization";
    PerformanceOptimizationStrategy["CONSTRAINT_OPTIMIZATION"] = "constraint_optimization";
    PerformanceOptimizationStrategy["DYNAMIC_OPTIMIZATION"] = "dynamic_optimization";
})(PerformanceOptimizationStrategy || (exports.PerformanceOptimizationStrategy = PerformanceOptimizationStrategy = {}));
/**
 * Performance metrics types
 */
var PerformanceMetricType;
(function (PerformanceMetricType) {
    PerformanceMetricType["LATENCY"] = "latency";
    PerformanceMetricType["THROUGHPUT"] = "throughput";
    PerformanceMetricType["CPU_UTILIZATION"] = "cpu_utilization";
    PerformanceMetricType["MEMORY_UTILIZATION"] = "memory_utilization";
    PerformanceMetricType["DISK_UTILIZATION"] = "disk_utilization";
    PerformanceMetricType["NETWORK_UTILIZATION"] = "network_utilization";
    PerformanceMetricType["ERROR_RATE"] = "error_rate";
    PerformanceMetricType["SUCCESS_RATE"] = "success_rate";
    PerformanceMetricType["RESPONSE_TIME"] = "response_time";
    PerformanceMetricType["QUEUE_LENGTH"] = "queue_length";
    PerformanceMetricType["CONCURRENT_USERS"] = "concurrent_users";
    PerformanceMetricType["TRANSACTION_RATE"] = "transaction_rate";
    PerformanceMetricType["CACHE_HIT_RATE"] = "cache_hit_rate";
    PerformanceMetricType["DATABASE_PERFORMANCE"] = "database_performance";
    PerformanceMetricType["API_PERFORMANCE"] = "api_performance";
    PerformanceMetricType["SYSTEM_LOAD"] = "system_load";
    PerformanceMetricType["AVAILABILITY"] = "availability";
    PerformanceMetricType["RELIABILITY"] = "reliability";
    PerformanceMetricType["SCALABILITY"] = "scalability";
    PerformanceMetricType["EFFICIENCY"] = "efficiency";
})(PerformanceMetricType || (exports.PerformanceMetricType = PerformanceMetricType = {}));
/**
 * Resource optimization types
 */
var ResourceOptimizationType;
(function (ResourceOptimizationType) {
    ResourceOptimizationType["CPU_OPTIMIZATION"] = "cpu_optimization";
    ResourceOptimizationType["MEMORY_OPTIMIZATION"] = "memory_optimization";
    ResourceOptimizationType["STORAGE_OPTIMIZATION"] = "storage_optimization";
    ResourceOptimizationType["NETWORK_OPTIMIZATION"] = "network_optimization";
    ResourceOptimizationType["DATABASE_OPTIMIZATION"] = "database_optimization";
    ResourceOptimizationType["CACHE_OPTIMIZATION"] = "cache_optimization";
    ResourceOptimizationType["LOAD_BALANCING"] = "load_balancing";
    ResourceOptimizationType["AUTO_SCALING"] = "auto_scaling";
    ResourceOptimizationType["RESOURCE_POOLING"] = "resource_pooling";
    ResourceOptimizationType["CONNECTION_POOLING"] = "connection_pooling";
    ResourceOptimizationType["THREAD_OPTIMIZATION"] = "thread_optimization";
    ResourceOptimizationType["PROCESS_OPTIMIZATION"] = "process_optimization";
    ResourceOptimizationType["CONTAINER_OPTIMIZATION"] = "container_optimization";
    ResourceOptimizationType["MICROSERVICE_OPTIMIZATION"] = "microservice_optimization";
    ResourceOptimizationType["API_OPTIMIZATION"] = "api_optimization";
})(ResourceOptimizationType || (exports.ResourceOptimizationType = ResourceOptimizationType = {}));
/**
 * Performance enhancement triggers
 */
var PerformanceEnhancementTrigger;
(function (PerformanceEnhancementTrigger) {
    PerformanceEnhancementTrigger["PERFORMANCE_DEGRADATION"] = "performance_degradation";
    PerformanceEnhancementTrigger["RESOURCE_EXHAUSTION"] = "resource_exhaustion";
    PerformanceEnhancementTrigger["HIGH_LATENCY"] = "high_latency";
    PerformanceEnhancementTrigger["LOW_THROUGHPUT"] = "low_throughput";
    PerformanceEnhancementTrigger["ERROR_SPIKE"] = "error_spike";
    PerformanceEnhancementTrigger["CAPACITY_THRESHOLD"] = "capacity_threshold";
    PerformanceEnhancementTrigger["SCHEDULED_OPTIMIZATION"] = "scheduled_optimization";
    PerformanceEnhancementTrigger["USER_COMPLAINT"] = "user_complaint";
    PerformanceEnhancementTrigger["SLA_VIOLATION"] = "sla_violation";
    PerformanceEnhancementTrigger["COST_OPTIMIZATION"] = "cost_optimization";
    PerformanceEnhancementTrigger["PREDICTIVE_ALERT"] = "predictive_alert";
    PerformanceEnhancementTrigger["ANOMALY_DETECTION"] = "anomaly_detection";
    PerformanceEnhancementTrigger["LOAD_SPIKE"] = "load_spike";
    PerformanceEnhancementTrigger["SYSTEM_BOTTLENECK"] = "system_bottleneck";
    PerformanceEnhancementTrigger["CONFIGURATION_CHANGE"] = "configuration_change";
})(PerformanceEnhancementTrigger || (exports.PerformanceEnhancementTrigger = PerformanceEnhancementTrigger = {}));
// ==================== PREDICTIVE ANALYTICS ENUMS ====================
/**
 * Prediction model types
 */
var PredictionModelType;
(function (PredictionModelType) {
    PredictionModelType["TIME_SERIES_FORECASTING"] = "time_series_forecasting";
    PredictionModelType["REGRESSION_ANALYSIS"] = "regression_analysis";
    PredictionModelType["CLASSIFICATION_MODEL"] = "classification_model";
    PredictionModelType["CLUSTERING_ANALYSIS"] = "clustering_analysis";
    PredictionModelType["ANOMALY_DETECTION"] = "anomaly_detection";
    PredictionModelType["PATTERN_RECOGNITION"] = "pattern_recognition";
    PredictionModelType["TREND_ANALYSIS"] = "trend_analysis";
    PredictionModelType["SEASONAL_DECOMPOSITION"] = "seasonal_decomposition";
    PredictionModelType["NEURAL_NETWORK"] = "neural_network";
    PredictionModelType["DEEP_LEARNING"] = "deep_learning";
    PredictionModelType["ENSEMBLE_MODEL"] = "ensemble_model";
    PredictionModelType["RANDOM_FOREST"] = "random_forest";
    PredictionModelType["SUPPORT_VECTOR_MACHINE"] = "support_vector_machine";
    PredictionModelType["DECISION_TREE"] = "decision_tree";
    PredictionModelType["NAIVE_BAYES"] = "naive_bayes";
    PredictionModelType["K_MEANS_CLUSTERING"] = "k_means_clustering";
    PredictionModelType["HIERARCHICAL_CLUSTERING"] = "hierarchical_clustering";
    PredictionModelType["ASSOCIATION_RULES"] = "association_rules";
    PredictionModelType["REINFORCEMENT_LEARNING"] = "reinforcement_learning";
    PredictionModelType["TRANSFER_LEARNING"] = "transfer_learning";
})(PredictionModelType || (exports.PredictionModelType = PredictionModelType = {}));
/**
 * Analytics data types
 */
var AnalyticsDataType;
(function (AnalyticsDataType) {
    AnalyticsDataType["PERFORMANCE_DATA"] = "performance_data";
    AnalyticsDataType["USER_BEHAVIOR_DATA"] = "user_behavior_data";
    AnalyticsDataType["TRANSACTION_DATA"] = "transaction_data";
    AnalyticsDataType["SYSTEM_METRICS"] = "system_metrics";
    AnalyticsDataType["BUSINESS_METRICS"] = "business_metrics";
    AnalyticsDataType["FINANCIAL_DATA"] = "financial_data";
    AnalyticsDataType["OPERATIONAL_DATA"] = "operational_data";
    AnalyticsDataType["SECURITY_DATA"] = "security_data";
    AnalyticsDataType["COMPLIANCE_DATA"] = "compliance_data";
    AnalyticsDataType["AUDIT_DATA"] = "audit_data";
    AnalyticsDataType["LOG_DATA"] = "log_data";
    AnalyticsDataType["EVENT_DATA"] = "event_data";
    AnalyticsDataType["SENSOR_DATA"] = "sensor_data";
    AnalyticsDataType["EXTERNAL_DATA"] = "external_data";
    AnalyticsDataType["MARKET_DATA"] = "market_data";
    AnalyticsDataType["CUSTOMER_DATA"] = "customer_data";
    AnalyticsDataType["PRODUCT_DATA"] = "product_data";
    AnalyticsDataType["INVENTORY_DATA"] = "inventory_data";
    AnalyticsDataType["SUPPLY_CHAIN_DATA"] = "supply_chain_data";
    AnalyticsDataType["SOCIAL_MEDIA_DATA"] = "social_media_data";
})(AnalyticsDataType || (exports.AnalyticsDataType = AnalyticsDataType = {}));
/**
 * Forecasting horizons
 */
var ForecastingHorizon;
(function (ForecastingHorizon) {
    ForecastingHorizon["SHORT_TERM"] = "short_term";
    ForecastingHorizon["MEDIUM_TERM"] = "medium_term";
    ForecastingHorizon["LONG_TERM"] = "long_term";
    ForecastingHorizon["ULTRA_LONG_TERM"] = "ultra_long_term";
    ForecastingHorizon["REAL_TIME"] = "real_time";
    ForecastingHorizon["INTRADAY"] = "intraday";
    ForecastingHorizon["DAILY"] = "daily";
    ForecastingHorizon["WEEKLY"] = "weekly";
    ForecastingHorizon["MONTHLY"] = "monthly";
    ForecastingHorizon["QUARTERLY"] = "quarterly";
    ForecastingHorizon["YEARLY"] = "yearly";
    ForecastingHorizon["SEASONAL"] = "seasonal";
    ForecastingHorizon["CYCLICAL"] = "cyclical";
    ForecastingHorizon["TREND_BASED"] = "trend_based";
    ForecastingHorizon["EVENT_DRIVEN"] = "event_driven"; // Event-based predictions
})(ForecastingHorizon || (exports.ForecastingHorizon = ForecastingHorizon = {}));
/**
 * Anomaly detection types
 */
var AnomalyDetectionType;
(function (AnomalyDetectionType) {
    AnomalyDetectionType["STATISTICAL_ANOMALY"] = "statistical_anomaly";
    AnomalyDetectionType["MACHINE_LEARNING_ANOMALY"] = "machine_learning_anomaly";
    AnomalyDetectionType["RULE_BASED_ANOMALY"] = "rule_based_anomaly";
    AnomalyDetectionType["THRESHOLD_BASED_ANOMALY"] = "threshold_based_anomaly";
    AnomalyDetectionType["PATTERN_BASED_ANOMALY"] = "pattern_based_anomaly";
    AnomalyDetectionType["BEHAVIORAL_ANOMALY"] = "behavioral_anomaly";
    AnomalyDetectionType["CONTEXTUAL_ANOMALY"] = "contextual_anomaly";
    AnomalyDetectionType["COLLECTIVE_ANOMALY"] = "collective_anomaly";
    AnomalyDetectionType["POINT_ANOMALY"] = "point_anomaly";
    AnomalyDetectionType["SEQUENCE_ANOMALY"] = "sequence_anomaly";
    AnomalyDetectionType["TIME_SERIES_ANOMALY"] = "time_series_anomaly";
    AnomalyDetectionType["MULTIVARIATE_ANOMALY"] = "multivariate_anomaly";
    AnomalyDetectionType["NETWORK_ANOMALY"] = "network_anomaly";
    AnomalyDetectionType["SECURITY_ANOMALY"] = "security_anomaly";
    AnomalyDetectionType["PERFORMANCE_ANOMALY"] = "performance_anomaly";
})(AnomalyDetectionType || (exports.AnomalyDetectionType = AnomalyDetectionType = {}));
// ==================== AUTOMATION FRAMEWORK ENUMS ====================
/**
 * Automation types
 */
var AutomationType;
(function (AutomationType) {
    AutomationType["PROCESS_AUTOMATION"] = "process_automation";
    AutomationType["WORKFLOW_AUTOMATION"] = "workflow_automation";
    AutomationType["TASK_AUTOMATION"] = "task_automation";
    AutomationType["DECISION_AUTOMATION"] = "decision_automation";
    AutomationType["RESPONSE_AUTOMATION"] = "response_automation";
    AutomationType["MONITORING_AUTOMATION"] = "monitoring_automation";
    AutomationType["DEPLOYMENT_AUTOMATION"] = "deployment_automation";
    AutomationType["TESTING_AUTOMATION"] = "testing_automation";
    AutomationType["SCALING_AUTOMATION"] = "scaling_automation";
    AutomationType["RECOVERY_AUTOMATION"] = "recovery_automation";
    AutomationType["OPTIMIZATION_AUTOMATION"] = "optimization_automation";
    AutomationType["MAINTENANCE_AUTOMATION"] = "maintenance_automation";
    AutomationType["BACKUP_AUTOMATION"] = "backup_automation";
    AutomationType["SECURITY_AUTOMATION"] = "security_automation";
    AutomationType["COMPLIANCE_AUTOMATION"] = "compliance_automation";
    AutomationType["REPORTING_AUTOMATION"] = "reporting_automation";
    AutomationType["NOTIFICATION_AUTOMATION"] = "notification_automation";
    AutomationType["DATA_PROCESSING_AUTOMATION"] = "data_processing_automation";
    AutomationType["INTEGRATION_AUTOMATION"] = "integration_automation";
    AutomationType["ORCHESTRATION_AUTOMATION"] = "orchestration_automation";
})(AutomationType || (exports.AutomationType = AutomationType = {}));
/**
 * Automation strategies
 */
var AutomationStrategy;
(function (AutomationStrategy) {
    AutomationStrategy["RULE_BASED_AUTOMATION"] = "rule_based_automation";
    AutomationStrategy["AI_DRIVEN_AUTOMATION"] = "ai_driven_automation";
    AutomationStrategy["MACHINE_LEARNING_AUTOMATION"] = "machine_learning_automation";
    AutomationStrategy["ADAPTIVE_AUTOMATION"] = "adaptive_automation";
    AutomationStrategy["PREDICTIVE_AUTOMATION"] = "predictive_automation";
    AutomationStrategy["REACTIVE_AUTOMATION"] = "reactive_automation";
    AutomationStrategy["PROACTIVE_AUTOMATION"] = "proactive_automation";
    AutomationStrategy["HYBRID_AUTOMATION"] = "hybrid_automation";
    AutomationStrategy["INTELLIGENT_AUTOMATION"] = "intelligent_automation";
    AutomationStrategy["COGNITIVE_AUTOMATION"] = "cognitive_automation";
    AutomationStrategy["ROBOTIC_PROCESS_AUTOMATION"] = "robotic_process_automation";
    AutomationStrategy["BUSINESS_PROCESS_AUTOMATION"] = "business_process_automation";
    AutomationStrategy["WORKFLOW_ORCHESTRATION"] = "workflow_orchestration";
    AutomationStrategy["EVENT_DRIVEN_AUTOMATION"] = "event_driven_automation";
    AutomationStrategy["SCHEDULED_AUTOMATION"] = "scheduled_automation";
})(AutomationStrategy || (exports.AutomationStrategy = AutomationStrategy = {}));
/**
 * Automation complexity levels
 */
var AutomationComplexityLevel;
(function (AutomationComplexityLevel) {
    AutomationComplexityLevel["SIMPLE"] = "simple";
    AutomationComplexityLevel["MODERATE"] = "moderate";
    AutomationComplexityLevel["COMPLEX"] = "complex";
    AutomationComplexityLevel["ADVANCED"] = "advanced";
    AutomationComplexityLevel["EXPERT"] = "expert";
    AutomationComplexityLevel["ENTERPRISE"] = "enterprise";
    AutomationComplexityLevel["BASIC_RULE_BASED"] = "basic_rule_based";
    AutomationComplexityLevel["MULTI_STEP_PROCESS"] = "multi_step_process";
    AutomationComplexityLevel["CONDITIONAL_LOGIC"] = "conditional_logic";
    AutomationComplexityLevel["MACHINE_LEARNING_ENHANCED"] = "machine_learning_enhanced";
    AutomationComplexityLevel["AI_POWERED"] = "ai_powered";
    AutomationComplexityLevel["COGNITIVE_PROCESSING"] = "cognitive_processing";
    AutomationComplexityLevel["MULTI_SYSTEM_INTEGRATION"] = "multi_system_integration";
    AutomationComplexityLevel["REAL_TIME_PROCESSING"] = "real_time_processing";
    AutomationComplexityLevel["DISTRIBUTED_AUTOMATION"] = "distributed_automation";
})(AutomationComplexityLevel || (exports.AutomationComplexityLevel = AutomationComplexityLevel = {}));
/**
 * Automation execution modes
 */
var AutomationExecutionMode;
(function (AutomationExecutionMode) {
    AutomationExecutionMode["SYNCHRONOUS"] = "synchronous";
    AutomationExecutionMode["ASYNCHRONOUS"] = "asynchronous";
    AutomationExecutionMode["BATCH"] = "batch";
    AutomationExecutionMode["REAL_TIME"] = "real_time";
    AutomationExecutionMode["SCHEDULED"] = "scheduled";
    AutomationExecutionMode["EVENT_TRIGGERED"] = "event_triggered";
    AutomationExecutionMode["MANUAL_TRIGGER"] = "manual_trigger";
    AutomationExecutionMode["AUTOMATIC_TRIGGER"] = "automatic_trigger";
    AutomationExecutionMode["CONDITIONAL_EXECUTION"] = "conditional_execution";
    AutomationExecutionMode["PARALLEL_EXECUTION"] = "parallel_execution";
    AutomationExecutionMode["SEQUENTIAL_EXECUTION"] = "sequential_execution";
    AutomationExecutionMode["PIPELINE_EXECUTION"] = "pipeline_execution";
    AutomationExecutionMode["DISTRIBUTED_EXECUTION"] = "distributed_execution";
    AutomationExecutionMode["CLOUD_EXECUTION"] = "cloud_execution";
    AutomationExecutionMode["EDGE_EXECUTION"] = "edge_execution";
})(AutomationExecutionMode || (exports.AutomationExecutionMode = AutomationExecutionMode = {}));
// ==================== INTEGRATION ORCHESTRATION ENUMS ====================
/**
 * Integration patterns
 */
var IntegrationPattern;
(function (IntegrationPattern) {
    IntegrationPattern["POINT_TO_POINT"] = "point_to_point";
    IntegrationPattern["HUB_AND_SPOKE"] = "hub_and_spoke";
    IntegrationPattern["ENTERPRISE_SERVICE_BUS"] = "enterprise_service_bus";
    IntegrationPattern["MICROSERVICES_ARCHITECTURE"] = "microservices_architecture";
    IntegrationPattern["EVENT_DRIVEN_ARCHITECTURE"] = "event_driven_architecture";
    IntegrationPattern["API_GATEWAY_PATTERN"] = "api_gateway_pattern";
    IntegrationPattern["MESSAGE_QUEUE_PATTERN"] = "message_queue_pattern";
    IntegrationPattern["PUBLISH_SUBSCRIBE_PATTERN"] = "publish_subscribe_pattern";
    IntegrationPattern["REQUEST_RESPONSE_PATTERN"] = "request_response_pattern";
    IntegrationPattern["SAGA_PATTERN"] = "saga_pattern";
    IntegrationPattern["CQRS_PATTERN"] = "cqrs_pattern";
    IntegrationPattern["EVENT_SOURCING_PATTERN"] = "event_sourcing_pattern";
    IntegrationPattern["CIRCUIT_BREAKER_PATTERN"] = "circuit_breaker_pattern";
    IntegrationPattern["BULKHEAD_PATTERN"] = "bulkhead_pattern";
    IntegrationPattern["RETRY_PATTERN"] = "retry_pattern";
})(IntegrationPattern || (exports.IntegrationPattern = IntegrationPattern = {}));
/**
 * Orchestration strategies
 */
var OrchestrationStrategy;
(function (OrchestrationStrategy) {
    OrchestrationStrategy["CENTRALIZED_ORCHESTRATION"] = "centralized_orchestration";
    OrchestrationStrategy["DECENTRALIZED_ORCHESTRATION"] = "decentralized_orchestration";
    OrchestrationStrategy["HYBRID_ORCHESTRATION"] = "hybrid_orchestration";
    OrchestrationStrategy["CHOREOGRAPHY_BASED"] = "choreography_based";
    OrchestrationStrategy["ORCHESTRATION_BASED"] = "orchestration_based";
    OrchestrationStrategy["EVENT_DRIVEN_ORCHESTRATION"] = "event_driven_orchestration";
    OrchestrationStrategy["WORKFLOW_ORCHESTRATION"] = "workflow_orchestration";
    OrchestrationStrategy["SERVICE_ORCHESTRATION"] = "service_orchestration";
    OrchestrationStrategy["DATA_ORCHESTRATION"] = "data_orchestration";
    OrchestrationStrategy["PROCESS_ORCHESTRATION"] = "process_orchestration";
    OrchestrationStrategy["API_ORCHESTRATION"] = "api_orchestration";
    OrchestrationStrategy["MICROSERVICE_ORCHESTRATION"] = "microservice_orchestration";
    OrchestrationStrategy["CONTAINER_ORCHESTRATION"] = "container_orchestration";
    OrchestrationStrategy["CLOUD_ORCHESTRATION"] = "cloud_orchestration";
    OrchestrationStrategy["MULTI_CLOUD_ORCHESTRATION"] = "multi_cloud_orchestration";
})(OrchestrationStrategy || (exports.OrchestrationStrategy = OrchestrationStrategy = {}));
/**
 * Service mesh types
 */
var ServiceMeshType;
(function (ServiceMeshType) {
    ServiceMeshType["ISTIO"] = "istio";
    ServiceMeshType["LINKERD"] = "linkerd";
    ServiceMeshType["CONSUL_CONNECT"] = "consul_connect";
    ServiceMeshType["ENVOY"] = "envoy";
    ServiceMeshType["NGINX_SERVICE_MESH"] = "nginx_service_mesh";
    ServiceMeshType["AWS_APP_MESH"] = "aws_app_mesh";
    ServiceMeshType["GOOGLE_TRAFFIC_DIRECTOR"] = "google_traffic_director";
    ServiceMeshType["AZURE_SERVICE_FABRIC_MESH"] = "azure_service_fabric_mesh";
    ServiceMeshType["OPEN_SERVICE_MESH"] = "open_service_mesh";
    ServiceMeshType["KUMA"] = "kuma";
    ServiceMeshType["MAESH"] = "maesh";
    ServiceMeshType["GLOO_MESH"] = "gloo_mesh";
    ServiceMeshType["TANZU_SERVICE_MESH"] = "tanzu_service_mesh";
    ServiceMeshType["CILIUM_SERVICE_MESH"] = "cilium_service_mesh";
    ServiceMeshType["CUSTOM_SERVICE_MESH"] = "custom_service_mesh";
})(ServiceMeshType || (exports.ServiceMeshType = ServiceMeshType = {}));
/**
 * Communication protocols
 */
var CommunicationProtocol;
(function (CommunicationProtocol) {
    CommunicationProtocol["HTTP"] = "http";
    CommunicationProtocol["HTTPS"] = "https";
    CommunicationProtocol["GRPC"] = "grpc";
    CommunicationProtocol["GRAPHQL"] = "graphql";
    CommunicationProtocol["REST"] = "rest";
    CommunicationProtocol["SOAP"] = "soap";
    CommunicationProtocol["WEBSOCKET"] = "websocket";
    CommunicationProtocol["TCP"] = "tcp";
    CommunicationProtocol["UDP"] = "udp";
    CommunicationProtocol["MQTT"] = "mqtt";
    CommunicationProtocol["AMQP"] = "amqp";
    CommunicationProtocol["KAFKA"] = "kafka";
    CommunicationProtocol["REDIS_PUBSUB"] = "redis_pubsub";
    CommunicationProtocol["RABBITMQ"] = "rabbitmq";
    CommunicationProtocol["APACHE_PULSAR"] = "apache_pulsar";
    CommunicationProtocol["NATS"] = "nats";
    CommunicationProtocol["ZEROMQ"] = "zeromq";
    CommunicationProtocol["WEBSOCKET_SECURE"] = "websocket_secure";
    CommunicationProtocol["HTTP2"] = "http2";
    CommunicationProtocol["HTTP3"] = "http3";
})(CommunicationProtocol || (exports.CommunicationProtocol = CommunicationProtocol = {}));
// ==================== MONITORING AND ANALYTICS ENUMS ====================
/**
 * Monitoring types
 */
var MonitoringType;
(function (MonitoringType) {
    MonitoringType["SYSTEM_MONITORING"] = "system_monitoring";
    MonitoringType["APPLICATION_MONITORING"] = "application_monitoring";
    MonitoringType["INFRASTRUCTURE_MONITORING"] = "infrastructure_monitoring";
    MonitoringType["NETWORK_MONITORING"] = "network_monitoring";
    MonitoringType["DATABASE_MONITORING"] = "database_monitoring";
    MonitoringType["SECURITY_MONITORING"] = "security_monitoring";
    MonitoringType["PERFORMANCE_MONITORING"] = "performance_monitoring";
    MonitoringType["BUSINESS_MONITORING"] = "business_monitoring";
    MonitoringType["USER_EXPERIENCE_MONITORING"] = "user_experience_monitoring";
    MonitoringType["API_MONITORING"] = "api_monitoring";
    MonitoringType["MICROSERVICE_MONITORING"] = "microservice_monitoring";
    MonitoringType["CONTAINER_MONITORING"] = "container_monitoring";
    MonitoringType["CLOUD_MONITORING"] = "cloud_monitoring";
    MonitoringType["LOG_MONITORING"] = "log_monitoring";
    MonitoringType["METRIC_MONITORING"] = "metric_monitoring";
    MonitoringType["TRACE_MONITORING"] = "trace_monitoring";
    MonitoringType["SYNTHETIC_MONITORING"] = "synthetic_monitoring";
    MonitoringType["REAL_USER_MONITORING"] = "real_user_monitoring";
    MonitoringType["COMPLIANCE_MONITORING"] = "compliance_monitoring";
    MonitoringType["COST_MONITORING"] = "cost_monitoring";
})(MonitoringType || (exports.MonitoringType = MonitoringType = {}));
/**
 * Dashboard types
 */
var DashboardType;
(function (DashboardType) {
    DashboardType["EXECUTIVE_DASHBOARD"] = "executive_dashboard";
    DashboardType["OPERATIONAL_DASHBOARD"] = "operational_dashboard";
    DashboardType["TECHNICAL_DASHBOARD"] = "technical_dashboard";
    DashboardType["BUSINESS_DASHBOARD"] = "business_dashboard";
    DashboardType["PERFORMANCE_DASHBOARD"] = "performance_dashboard";
    DashboardType["SECURITY_DASHBOARD"] = "security_dashboard";
    DashboardType["COMPLIANCE_DASHBOARD"] = "compliance_dashboard";
    DashboardType["FINANCIAL_DASHBOARD"] = "financial_dashboard";
    DashboardType["CUSTOMER_DASHBOARD"] = "customer_dashboard";
    DashboardType["PRODUCT_DASHBOARD"] = "product_dashboard";
    DashboardType["REAL_TIME_DASHBOARD"] = "real_time_dashboard";
    DashboardType["ANALYTICAL_DASHBOARD"] = "analytical_dashboard";
    DashboardType["STRATEGIC_DASHBOARD"] = "strategic_dashboard";
    DashboardType["TACTICAL_DASHBOARD"] = "tactical_dashboard";
    DashboardType["CUSTOM_DASHBOARD"] = "custom_dashboard";
})(DashboardType || (exports.DashboardType = DashboardType = {}));
/**
 * Alert severity levels
 */
var AlertSeverityLevel;
(function (AlertSeverityLevel) {
    AlertSeverityLevel["CRITICAL"] = "critical";
    AlertSeverityLevel["HIGH"] = "high";
    AlertSeverityLevel["MEDIUM"] = "medium";
    AlertSeverityLevel["LOW"] = "low";
    AlertSeverityLevel["INFO"] = "info";
    AlertSeverityLevel["WARNING"] = "warning";
    AlertSeverityLevel["ERROR"] = "error";
    AlertSeverityLevel["FATAL"] = "fatal";
    AlertSeverityLevel["DEBUG"] = "debug";
    AlertSeverityLevel["TRACE"] = "trace";
    AlertSeverityLevel["EMERGENCY"] = "emergency";
    AlertSeverityLevel["URGENT"] = "urgent";
    AlertSeverityLevel["NORMAL"] = "normal";
    AlertSeverityLevel["MINOR"] = "minor";
    AlertSeverityLevel["MAJOR"] = "major";
})(AlertSeverityLevel || (exports.AlertSeverityLevel = AlertSeverityLevel = {}));
/**
 * Notification channels
 */
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["EMAIL"] = "email";
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["SLACK"] = "slack";
    NotificationChannel["DISCORD"] = "discord";
    NotificationChannel["TEAMS"] = "teams";
    NotificationChannel["WEBHOOK"] = "webhook";
    NotificationChannel["PUSH_NOTIFICATION"] = "push_notification";
    NotificationChannel["IN_APP_NOTIFICATION"] = "in_app_notification";
    NotificationChannel["DASHBOARD_ALERT"] = "dashboard_alert";
    NotificationChannel["PHONE_CALL"] = "phone_call";
    NotificationChannel["PAGER_DUTY"] = "pager_duty";
    NotificationChannel["OPSGENIE"] = "opsgenie";
    NotificationChannel["VICTOROPS"] = "victorops";
    NotificationChannel["JIRA"] = "jira";
    NotificationChannel["SERVICENOW"] = "servicenow";
    NotificationChannel["CUSTOM_WEBHOOK"] = "custom_webhook";
    NotificationChannel["API_CALLBACK"] = "api_callback";
    NotificationChannel["MESSAGE_QUEUE"] = "message_queue";
    NotificationChannel["EVENT_STREAM"] = "event_stream";
    NotificationChannel["LOG_ENTRY"] = "log_entry";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
// ==================== GENERAL ENHANCEMENT ENUMS ====================
/**
 * Enhancement status
 */
var EnhancementStatus;
(function (EnhancementStatus) {
    EnhancementStatus["PENDING"] = "pending";
    EnhancementStatus["IN_PROGRESS"] = "in_progress";
    EnhancementStatus["COMPLETED"] = "completed";
    EnhancementStatus["FAILED"] = "failed";
    EnhancementStatus["CANCELLED"] = "cancelled";
    EnhancementStatus["PAUSED"] = "paused";
    EnhancementStatus["SCHEDULED"] = "scheduled";
    EnhancementStatus["QUEUED"] = "queued";
    EnhancementStatus["RUNNING"] = "running";
    EnhancementStatus["STOPPED"] = "stopped";
    EnhancementStatus["ERROR"] = "error";
    EnhancementStatus["SUCCESS"] = "success";
    EnhancementStatus["PARTIAL_SUCCESS"] = "partial_success";
    EnhancementStatus["TIMEOUT"] = "timeout";
    EnhancementStatus["RETRY"] = "retry";
})(EnhancementStatus || (exports.EnhancementStatus = EnhancementStatus = {}));
/**
 * Enhancement priority levels
 */
var EnhancementPriority;
(function (EnhancementPriority) {
    EnhancementPriority["CRITICAL"] = "critical";
    EnhancementPriority["HIGH"] = "high";
    EnhancementPriority["MEDIUM"] = "medium";
    EnhancementPriority["LOW"] = "low";
    EnhancementPriority["URGENT"] = "urgent";
    EnhancementPriority["NORMAL"] = "normal";
    EnhancementPriority["DEFERRED"] = "deferred";
    EnhancementPriority["IMMEDIATE"] = "immediate";
    EnhancementPriority["SCHEDULED"] = "scheduled";
    EnhancementPriority["BACKGROUND"] = "background";
    EnhancementPriority["REAL_TIME"] = "real_time";
    EnhancementPriority["BATCH"] = "batch";
    EnhancementPriority["ON_DEMAND"] = "on_demand";
    EnhancementPriority["AUTOMATIC"] = "automatic";
    EnhancementPriority["MANUAL"] = "manual";
})(EnhancementPriority || (exports.EnhancementPriority = EnhancementPriority = {}));
/**
 * Enhancement categories
 */
var EnhancementCategory;
(function (EnhancementCategory) {
    EnhancementCategory["PERFORMANCE"] = "performance";
    EnhancementCategory["SECURITY"] = "security";
    EnhancementCategory["SCALABILITY"] = "scalability";
    EnhancementCategory["RELIABILITY"] = "reliability";
    EnhancementCategory["AVAILABILITY"] = "availability";
    EnhancementCategory["USABILITY"] = "usability";
    EnhancementCategory["MAINTAINABILITY"] = "maintainability";
    EnhancementCategory["EFFICIENCY"] = "efficiency";
    EnhancementCategory["COST_OPTIMIZATION"] = "cost_optimization";
    EnhancementCategory["FEATURE_ENHANCEMENT"] = "feature_enhancement";
    EnhancementCategory["BUG_FIX"] = "bug_fix";
    EnhancementCategory["COMPLIANCE"] = "compliance";
    EnhancementCategory["INTEGRATION"] = "integration";
    EnhancementCategory["AUTOMATION"] = "automation";
    EnhancementCategory["MONITORING"] = "monitoring";
    EnhancementCategory["ANALYTICS"] = "analytics";
    EnhancementCategory["REPORTING"] = "reporting";
    EnhancementCategory["DOCUMENTATION"] = "documentation";
    EnhancementCategory["TESTING"] = "testing";
    EnhancementCategory["DEPLOYMENT"] = "deployment";
})(EnhancementCategory || (exports.EnhancementCategory = EnhancementCategory = {}));
/**
 * AI model types for enhancement
 */
var AIModelType;
(function (AIModelType) {
    AIModelType["DEEPSEEK_R1"] = "deepseek_r1";
    AIModelType["TENSORFLOW"] = "tensorflow";
    AIModelType["PYTORCH"] = "pytorch";
    AIModelType["SCIKIT_LEARN"] = "scikit_learn";
    AIModelType["XGBOOST"] = "xgboost";
    AIModelType["LIGHTGBM"] = "lightgbm";
    AIModelType["CATBOOST"] = "catboost";
    AIModelType["RANDOM_FOREST"] = "random_forest";
    AIModelType["GRADIENT_BOOSTING"] = "gradient_boosting";
    AIModelType["NEURAL_NETWORK"] = "neural_network";
    AIModelType["DEEP_NEURAL_NETWORK"] = "deep_neural_network";
    AIModelType["CONVOLUTIONAL_NEURAL_NETWORK"] = "convolutional_neural_network";
    AIModelType["RECURRENT_NEURAL_NETWORK"] = "recurrent_neural_network";
    AIModelType["TRANSFORMER"] = "transformer";
    AIModelType["BERT"] = "bert";
    AIModelType["GPT"] = "gpt";
    AIModelType["LSTM"] = "lstm";
    AIModelType["GRU"] = "gru";
    AIModelType["AUTOENCODER"] = "autoencoder";
    AIModelType["GENERATIVE_ADVERSARIAL_NETWORK"] = "generative_adversarial_network";
})(AIModelType || (exports.AIModelType = AIModelType = {}));
/**
 * Processing modes
 */
var ProcessingMode;
(function (ProcessingMode) {
    ProcessingMode["REAL_TIME"] = "real_time";
    ProcessingMode["BATCH"] = "batch";
    ProcessingMode["STREAM"] = "stream";
    ProcessingMode["MICRO_BATCH"] = "micro_batch";
    ProcessingMode["NEAR_REAL_TIME"] = "near_real_time";
    ProcessingMode["OFFLINE"] = "offline";
    ProcessingMode["ONLINE"] = "online";
    ProcessingMode["HYBRID"] = "hybrid";
    ProcessingMode["SYNCHRONOUS"] = "synchronous";
    ProcessingMode["ASYNCHRONOUS"] = "asynchronous";
    ProcessingMode["PARALLEL"] = "parallel";
    ProcessingMode["SEQUENTIAL"] = "sequential";
    ProcessingMode["DISTRIBUTED"] = "distributed";
    ProcessingMode["CENTRALIZED"] = "centralized";
    ProcessingMode["EDGE"] = "edge";
    ProcessingMode["CLOUD"] = "cloud";
    ProcessingMode["ON_PREMISE"] = "on_premise";
    ProcessingMode["MULTI_CLOUD"] = "multi_cloud";
    ProcessingMode["HYBRID_CLOUD"] = "hybrid_cloud";
    ProcessingMode["SERVERLESS"] = "serverless";
})(ProcessingMode || (exports.ProcessingMode = ProcessingMode = {}));
/**
 * Quality metrics
 */
var QualityMetric;
(function (QualityMetric) {
    QualityMetric["ACCURACY"] = "accuracy";
    QualityMetric["PRECISION"] = "precision";
    QualityMetric["RECALL"] = "recall";
    QualityMetric["F1_SCORE"] = "f1_score";
    QualityMetric["AUC_ROC"] = "auc_roc";
    QualityMetric["AUC_PR"] = "auc_pr";
    QualityMetric["MEAN_SQUARED_ERROR"] = "mean_squared_error";
    QualityMetric["ROOT_MEAN_SQUARED_ERROR"] = "root_mean_squared_error";
    QualityMetric["MEAN_ABSOLUTE_ERROR"] = "mean_absolute_error";
    QualityMetric["R_SQUARED"] = "r_squared";
    QualityMetric["ADJUSTED_R_SQUARED"] = "adjusted_r_squared";
    QualityMetric["SILHOUETTE_SCORE"] = "silhouette_score";
    QualityMetric["DAVIES_BOULDIN_INDEX"] = "davies_bouldin_index";
    QualityMetric["CALINSKI_HARABASZ_INDEX"] = "calinski_harabasz_index";
    QualityMetric["COMPLETENESS"] = "completeness";
    QualityMetric["HOMOGENEITY"] = "homogeneity";
    QualityMetric["V_MEASURE"] = "v_measure";
    QualityMetric["MUTUAL_INFO_SCORE"] = "mutual_info_score";
    QualityMetric["NORMALIZED_MUTUAL_INFO_SCORE"] = "normalized_mutual_info_score";
    QualityMetric["ADJUSTED_MUTUAL_INFO_SCORE"] = "adjusted_mutual_info_score";
})(QualityMetric || (exports.QualityMetric = QualityMetric = {}));
//# sourceMappingURL=enhancement-engine.enum.js.map