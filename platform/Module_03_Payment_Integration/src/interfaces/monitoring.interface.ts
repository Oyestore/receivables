/**
 * Module 3 Phase 3.1: Advanced Automation Foundation
 * Monitoring and Observability Interfaces
 * 
 * Comprehensive interfaces for monitoring, alerting, metrics collection,
 * observability infrastructure, and performance tracking
 */

import {
  MetricType,
  AlertSeverity,
  AlertStatus,
  DataSource,
  HealthStatus,
  MonitoringInterval,
  DashboardType,
  ChartType,
  LogLevel,
  EventType,
  NotificationChannel,
  AggregationMethod,
  TimeWindow,
  MonitoringTool,
  ThresholdType,
  MonitoringScope,
  RetentionPolicy,
  ConfigurationState,
  EscalationLevel,
  DataQuality,
  ObservabilityPillar,
  AutomationLevel
} from '../enums/monitoring.enum';

/**
 * Base metric definition interface
 */
export interface IMetricDefinition {
  id: string;
  name: string;
  description: string;
  type: MetricType;
  unit: string;
  
  // Data Source Configuration
  dataSource: IDataSourceConfiguration;
  
  // Collection Settings
  collectionInterval: MonitoringInterval;
  aggregationMethod: AggregationMethod;
  retentionPolicy: RetentionPolicy;
  
  // Threshold Configuration
  thresholds: IThreshold[];
  
  // Metadata
  tags: Record<string, string>;
  labels: Record<string, string>;
  dimensions: string[];
  
  // Quality and Validation
  dataQuality: DataQuality;
  validationRules: IValidationRule[];
  
  // Configuration State
  state: ConfigurationState;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

/**
 * Data source configuration interface
 */
export interface IDataSourceConfiguration {
  id: string;
  name: string;
  type: DataSource;
  
  // Connection Configuration
  connectionString?: string;
  endpoint?: string;
  authentication?: IAuthenticationConfig;
  
  // Query Configuration
  query?: string;
  queryParameters?: Record<string, any>;
  
  // Collection Settings
  timeout: number;
  retryPolicy: IRetryPolicy;
  
  // Data Processing
  transformations: IDataTransformation[];
  filters: IDataFilter[];
  
  // Health Monitoring
  healthCheck: IHealthCheckConfiguration;
}

/**
 * Threshold configuration interface
 */
export interface IThreshold {
  id: string;
  name: string;
  type: ThresholdType;
  
  // Threshold Values
  warningValue?: number;
  criticalValue?: number;
  
  // Dynamic Threshold Configuration
  baselineConfiguration?: IBaselineConfiguration;
  anomalyDetectionConfiguration?: IAnomalyDetectionConfiguration;
  
  // Evaluation Settings
  evaluationWindow: TimeWindow;
  evaluationFrequency: MonitoringInterval;
  
  // Alert Configuration
  alertConfiguration: IAlertConfiguration;
  
  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Alert configuration interface
 */
export interface IAlertConfiguration {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  
  // Trigger Conditions
  conditions: IAlertCondition[];
  
  // Notification Settings
  notificationChannels: INotificationChannelConfiguration[];
  
  // Escalation Configuration
  escalationRules: IEscalationRule[];
  
  // Suppression Rules
  suppressionRules: ISuppressionRule[];
  
  // Auto-Resolution
  autoResolve: boolean;
  autoResolveTimeout: number;
  
  // Metadata
  tags: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Alert condition interface
 */
export interface IAlertCondition {
  id: string;
  metricId: string;
  operator: string;
  value: number;
  aggregationMethod: AggregationMethod;
  timeWindow: TimeWindow;
  evaluationFrequency: MonitoringInterval;
}

/**
 * Notification channel configuration interface
 */
export interface INotificationChannelConfiguration {
  id: string;
  name: string;
  type: NotificationChannel;
  
  // Channel-specific Configuration
  configuration: {
    // Email Configuration
    emailAddresses?: string[];
    emailTemplate?: string;
    
    // SMS Configuration
    phoneNumbers?: string[];
    smsTemplate?: string;
    
    // Slack Configuration
    slackChannel?: string;
    slackWebhookUrl?: string;
    
    // Teams Configuration
    teamsWebhookUrl?: string;
    
    // Webhook Configuration
    webhookUrl?: string;
    webhookHeaders?: Record<string, string>;
    webhookPayloadTemplate?: string;
    
    // PagerDuty Configuration
    pagerDutyServiceKey?: string;
    
    // OpsGenie Configuration
    opsGenieApiKey?: string;
    opsGenieTeam?: string;
  };
  
  // Delivery Settings
  retryPolicy: IRetryPolicy;
  rateLimiting: IRateLimitingConfiguration;
  
  // Filtering
  filters: INotificationFilter[];
  
  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dashboard configuration interface
 */
export interface IDashboardConfiguration {
  id: string;
  name: string;
  description: string;
  type: DashboardType;
  
  // Layout Configuration
  layout: IDashboardLayout;
  
  // Widget Configuration
  widgets: IDashboardWidget[];
  
  // Access Control
  visibility: string;
  permissions: IDashboardPermission[];
  
  // Refresh Settings
  autoRefresh: boolean;
  refreshInterval: MonitoringInterval;
  
  // Filtering and Variables
  variables: IDashboardVariable[];
  filters: IDashboardFilter[];
  
  // Metadata
  tags: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

/**
 * Dashboard widget interface
 */
export interface IDashboardWidget {
  id: string;
  title: string;
  type: ChartType;
  
  // Position and Size
  position: IWidgetPosition;
  size: IWidgetSize;
  
  // Data Configuration
  dataConfiguration: IWidgetDataConfiguration;
  
  // Visualization Configuration
  visualizationConfiguration: IVisualizationConfiguration;
  
  // Interaction Configuration
  interactionConfiguration: IInteractionConfiguration;
  
  // Metadata
  description?: string;
  tags: Record<string, string>;
}

/**
 * Health check configuration interface
 */
export interface IHealthCheckConfiguration {
  id: string;
  name: string;
  description: string;
  
  // Check Configuration
  checkType: string;
  endpoint?: string;
  query?: string;
  expectedResponse?: any;
  
  // Execution Settings
  interval: MonitoringInterval;
  timeout: number;
  retryPolicy: IRetryPolicy;
  
  // Health Status Mapping
  healthStatusMapping: IHealthStatusMapping;
  
  // Dependencies
  dependencies: string[];
  
  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Log configuration interface
 */
export interface ILogConfiguration {
  id: string;
  name: string;
  description: string;
  
  // Log Source Configuration
  logSources: ILogSourceConfiguration[];
  
  // Processing Configuration
  processingRules: ILogProcessingRule[];
  
  // Storage Configuration
  storageConfiguration: ILogStorageConfiguration;
  
  // Indexing Configuration
  indexingConfiguration: ILogIndexingConfiguration;
  
  // Retention Configuration
  retentionPolicy: RetentionPolicy;
  retentionPeriod: number;
  
  // Metadata
  tags: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event configuration interface
 */
export interface IEventConfiguration {
  id: string;
  name: string;
  description: string;
  eventType: EventType;
  
  // Event Source Configuration
  eventSources: IEventSourceConfiguration[];
  
  // Processing Configuration
  processingRules: IEventProcessingRule[];
  
  // Correlation Configuration
  correlationRules: IEventCorrelationRule[];
  
  // Storage Configuration
  storageConfiguration: IEventStorageConfiguration;
  
  // Metadata
  tags: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Monitoring scope configuration interface
 */
export interface IMonitoringScopeConfiguration {
  id: string;
  name: string;
  scope: MonitoringScope;
  
  // Scope Definition
  scopeDefinition: IScopeDefinition;
  
  // Monitoring Configuration
  monitoringConfiguration: IScopeMonitoringConfiguration;
  
  // Resource Configuration
  resourceConfiguration: IScopeResourceConfiguration;
  
  // Metadata
  tags: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Supporting interfaces
 */

export interface IAuthenticationConfig {
  type: string;
  credentials: Record<string, string>;
  tokenEndpoint?: string;
  refreshToken?: string;
}

export interface IRetryPolicy {
  maxRetries: number;
  initialDelay: number;
  backoffMultiplier: number;
  maxDelay: number;
}

export interface IDataTransformation {
  id: string;
  name: string;
  type: string;
  configuration: Record<string, any>;
}

export interface IDataFilter {
  id: string;
  name: string;
  condition: string;
  isActive: boolean;
}

export interface IValidationRule {
  id: string;
  name: string;
  type: string;
  expression: string;
  errorMessage: string;
}

export interface IBaselineConfiguration {
  baselineType: string;
  baselinePeriod: TimeWindow;
  seasonalityDetection: boolean;
  trendDetection: boolean;
}

export interface IAnomalyDetectionConfiguration {
  algorithm: string;
  sensitivity: number;
  trainingPeriod: TimeWindow;
  minimumDataPoints: number;
}

export interface IEscalationRule {
  id: string;
  level: EscalationLevel;
  condition: string;
  delay: number;
  recipients: string[];
}

export interface ISuppressionRule {
  id: string;
  name: string;
  condition: string;
  duration: number;
  isActive: boolean;
}

export interface IRateLimitingConfiguration {
  enabled: boolean;
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
}

export interface INotificationFilter {
  id: string;
  name: string;
  condition: string;
  action: string;
}

export interface IDashboardLayout {
  type: string;
  columns: number;
  rows: number;
  gridSize: number;
}

export interface IDashboardPermission {
  userId: string;
  role: string;
  permissions: string[];
}

export interface IDashboardVariable {
  id: string;
  name: string;
  type: string;
  defaultValue: any;
  options: any[];
}

export interface IDashboardFilter {
  id: string;
  name: string;
  type: string;
  values: any[];
}

export interface IWidgetPosition {
  x: number;
  y: number;
}

export interface IWidgetSize {
  width: number;
  height: number;
}

export interface IWidgetDataConfiguration {
  metrics: string[];
  timeRange: TimeWindow;
  aggregationMethod: AggregationMethod;
  groupBy: string[];
  filters: Record<string, any>;
}

export interface IVisualizationConfiguration {
  colors: string[];
  axes: IAxisConfiguration[];
  legend: ILegendConfiguration;
  tooltip: ITooltipConfiguration;
  customOptions: Record<string, any>;
}

export interface IInteractionConfiguration {
  drillDown: boolean;
  zoom: boolean;
  pan: boolean;
  crossFilter: boolean;
}

export interface IAxisConfiguration {
  id: string;
  label: string;
  type: string;
  scale: string;
  min?: number;
  max?: number;
}

export interface ILegendConfiguration {
  enabled: boolean;
  position: string;
  alignment: string;
}

export interface ITooltipConfiguration {
  enabled: boolean;
  format: string;
  customTemplate?: string;
}

export interface IHealthStatusMapping {
  healthyConditions: string[];
  degradedConditions: string[];
  unhealthyConditions: string[];
}

export interface ILogSourceConfiguration {
  id: string;
  name: string;
  type: string;
  location: string;
  format: string;
  parser: string;
}

export interface ILogProcessingRule {
  id: string;
  name: string;
  type: string;
  condition: string;
  action: string;
  configuration: Record<string, any>;
}

export interface ILogStorageConfiguration {
  storageType: string;
  location: string;
  compression: boolean;
  encryption: boolean;
  partitioning: IPartitioningConfiguration;
}

export interface ILogIndexingConfiguration {
  indexFields: string[];
  fullTextSearch: boolean;
  customIndexes: ICustomIndex[];
}

export interface IPartitioningConfiguration {
  enabled: boolean;
  partitionBy: string;
  partitionSize: string;
}

export interface ICustomIndex {
  name: string;
  fields: string[];
  type: string;
}

export interface IEventSourceConfiguration {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  authentication: IAuthenticationConfig;
}

export interface IEventProcessingRule {
  id: string;
  name: string;
  type: string;
  condition: string;
  action: string;
  configuration: Record<string, any>;
}

export interface IEventCorrelationRule {
  id: string;
  name: string;
  events: string[];
  timeWindow: TimeWindow;
  condition: string;
  action: string;
}

export interface IEventStorageConfiguration {
  storageType: string;
  location: string;
  retention: number;
  compression: boolean;
}

export interface IScopeDefinition {
  includePatterns: string[];
  excludePatterns: string[];
  filters: Record<string, any>;
}

export interface IScopeMonitoringConfiguration {
  metrics: string[];
  alerts: string[];
  dashboards: string[];
}

export interface IScopeResourceConfiguration {
  resourceLimits: Record<string, number>;
  resourceAllocations: Record<string, number>;
}

/**
 * Runtime monitoring interfaces
 */

export interface IMetricValue {
  metricId: string;
  timestamp: Date;
  value: number;
  tags: Record<string, string>;
  dimensions: Record<string, any>;
}

export interface IAlert {
  id: string;
  alertConfigurationId: string;
  status: AlertStatus;
  severity: AlertSeverity;
  
  // Alert Details
  title: string;
  description: string;
  message: string;
  
  // Timing
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  
  // Context
  metricValues: IMetricValue[];
  tags: Record<string, string>;
  
  // Assignment
  assignedTo?: string;
  escalationLevel: EscalationLevel;
  
  // Actions
  actions: IAlertAction[];
  
  // Metadata
  metadata: Record<string, any>;
}

export interface IAlertAction {
  id: string;
  type: string;
  timestamp: Date;
  performedBy: string;
  details: Record<string, any>;
}

export interface IHealthCheckResult {
  healthCheckId: string;
  status: HealthStatus;
  timestamp: Date;
  responseTime: number;
  details: Record<string, any>;
  errors: string[];
}

export interface ILogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  source: string;
  tags: Record<string, string>;
  fields: Record<string, any>;
  stackTrace?: string;
}

export interface IEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  source: string;
  title: string;
  description: string;
  severity: string;
  tags: Record<string, string>;
  payload: Record<string, any>;
  correlationId?: string;
}

