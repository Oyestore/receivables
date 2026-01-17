/**
 * Module 3 Phase 3.1: Advanced Automation Foundation
 * Monitoring Infrastructure Entities
 * 
 * Comprehensive entities for monitoring, alerting, health checking,
 * performance tracking, and observability
 */

import {
  MetricType,
  AlertSeverity,
  AlertStatus,
  HealthStatus,
  MonitoringLevel,
  DataRetentionPolicy,
  AggregationMethod,
  ComparisonOperator,
  AlertChannel,
  DashboardType,
  VisualizationType,
  DataQualityStatus,
  EventType,
  LogLevel,
  MonitoringCategory,
  ThresholdType,
  EscalationLevel,
  NotificationMethod,
  MonitoringScope,
  PerformanceCategory,
  ResourceType
} from '../../shared/enums/monitoring.enum';

import {
  IMetricDefinition,
  IMetricValue,
  IAlertConfiguration,
  IAlert,
  IAlertAction,
  IHealthCheckConfiguration,
  IHealthCheckResult,
  IDashboardConfiguration,
  IDashboardWidget,
  ILogConfiguration,
  ILogEntry,
  IEventConfiguration,
  IEvent,
  IDataQualityConfiguration,
  IDataQualityResult,
  IPerformanceMetrics,
  IResourceUtilization,
  IMonitoringRule,
  IThreshold,
  IEscalationPolicy,
  INotificationConfiguration
} from '../../shared/interfaces/monitoring.interface';

/**
 * Metric Definition Entity
 * Defines how metrics are collected, processed, and stored
 */
export class MetricDefinitionEntity implements IMetricDefinition {
  public id: string;
  public name: string;
  public description: string;
  public type: MetricType;
  public category: MonitoringCategory;
  public scope: MonitoringScope;
  
  // Collection Configuration
  public collectionInterval: number;
  public collectionMethod: string;
  public dataSource: string;
  public query?: string;
  
  // Processing Configuration
  public aggregationMethod: AggregationMethod;
  public aggregationWindow: number;
  public retentionPolicy: DataRetentionPolicy;
  
  // Metadata
  public unit: string;
  public tags: Record<string, string>;
  public dimensions: string[];
  public isActive: boolean;
  public createdAt: Date;
  public updatedAt: Date;

  // Runtime State
  private lastCollectionTime?: Date;
  private collectionCount: number = 0;
  private errorCount: number = 0;
  private averageCollectionTime: number = 0;

  constructor(definition: Partial<IMetricDefinition>) {
    this.id = definition.id || this.generateId();
    this.name = definition.name || '';
    this.description = definition.description || '';
    this.type = definition.type || MetricType.GAUGE;
    this.category = definition.category || MonitoringCategory.SYSTEM;
    this.scope = definition.scope || MonitoringScope.TENANT;
    
    this.collectionInterval = definition.collectionInterval || 60000; // 1 minute
    this.collectionMethod = definition.collectionMethod || 'pull';
    this.dataSource = definition.dataSource || '';
    this.query = definition.query;
    
    this.aggregationMethod = definition.aggregationMethod || AggregationMethod.AVERAGE;
    this.aggregationWindow = definition.aggregationWindow || 300000; // 5 minutes
    this.retentionPolicy = definition.retentionPolicy || DataRetentionPolicy.MEDIUM;
    
    this.unit = definition.unit || '';
    this.tags = definition.tags || {};
    this.dimensions = definition.dimensions || [];
    this.isActive = definition.isActive !== false;
    this.createdAt = definition.createdAt || new Date();
    this.updatedAt = definition.updatedAt || new Date();
  }

  /**
   * Validate metric definition
   */
  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Metric name is required');
    }

    if (!this.dataSource || this.dataSource.trim().length === 0) {
      errors.push('Data source is required');
    }

    if (this.collectionInterval < 1000) {
      errors.push('Collection interval must be at least 1 second');
    }

    if (this.aggregationWindow < this.collectionInterval) {
      errors.push('Aggregation window must be greater than collection interval');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Update collection statistics
   */
  public updateCollectionStatistics(collectionTime: number, success: boolean): void {
    this.collectionCount++;
    this.lastCollectionTime = new Date();
    
    if (!success) {
      this.errorCount++;
    }
    
    // Update average collection time
    this.averageCollectionTime = (
      (this.averageCollectionTime * (this.collectionCount - 1)) + collectionTime
    ) / this.collectionCount;
  }

  /**
   * Get collection success rate
   */
  public getCollectionSuccessRate(): number {
    if (this.collectionCount === 0) return 100;
    return ((this.collectionCount - this.errorCount) / this.collectionCount) * 100;
  }

  /**
   * Get retention period in milliseconds
   */
  public getRetentionPeriodMs(): number {
    switch (this.retentionPolicy) {
      case DataRetentionPolicy.SHORT:
        return 24 * 60 * 60 * 1000; // 1 day
      case DataRetentionPolicy.MEDIUM:
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      case DataRetentionPolicy.LONG:
        return 30 * 24 * 60 * 60 * 1000; // 30 days
      case DataRetentionPolicy.EXTENDED:
        return 365 * 24 * 60 * 60 * 1000; // 1 year
      default:
        return 7 * 24 * 60 * 60 * 1000; // Default 7 days
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Metric Value Entity
 * Represents a single metric data point
 */
export class MetricValueEntity implements IMetricValue {
  public metricId: string;
  public value: number;
  public timestamp: Date;
  public tags: Record<string, string>;
  public dimensions: Record<string, any>;
  public quality: DataQualityStatus;

  constructor(
    metricId: string,
    value: number,
    timestamp: Date = new Date(),
    tags: Record<string, string> = {},
    dimensions: Record<string, any> = {}
  ) {
    this.metricId = metricId;
    this.value = value;
    this.timestamp = timestamp;
    this.tags = tags;
    this.dimensions = dimensions;
    this.quality = DataQualityStatus.GOOD;
  }

  /**
   * Validate metric value
   */
  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.metricId) {
      errors.push('Metric ID is required');
    }

    if (typeof this.value !== 'number' || isNaN(this.value)) {
      errors.push('Value must be a valid number');
    }

    if (!this.timestamp || !(this.timestamp instanceof Date)) {
      errors.push('Timestamp must be a valid Date');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if value is within expected range
   */
  public isWithinRange(min?: number, max?: number): boolean {
    if (min !== undefined && this.value < min) return false;
    if (max !== undefined && this.value > max) return false;
    return true;
  }

  /**
   * Apply data quality assessment
   */
  public assessQuality(expectedRange?: { min?: number; max?: number }): void {
    if (expectedRange && !this.isWithinRange(expectedRange.min, expectedRange.max)) {
      this.quality = DataQualityStatus.POOR;
    } else if (this.value === 0) {
      this.quality = DataQualityStatus.SUSPECT;
    } else {
      this.quality = DataQualityStatus.GOOD;
    }
  }
}

/**
 * Alert Configuration Entity
 * Defines alert rules and conditions
 */
export class AlertConfigurationEntity implements IAlertConfiguration {
  public id: string;
  public name: string;
  public description: string;
  public metricId: string;
  public severity: AlertSeverity;
  public category: MonitoringCategory;
  
  // Alert Conditions
  public thresholds: IThreshold[];
  public evaluationWindow: number;
  public evaluationFrequency: number;
  public minimumDataPoints: number;
  
  // Actions and Notifications
  public actions: IAlertAction[];
  public escalationPolicy: IEscalationPolicy;
  public notificationConfiguration: INotificationConfiguration;
  
  // State Management
  public isActive: boolean;
  public isSuppressed: boolean;
  public suppressionEndTime?: Date;
  
  // Metadata
  public tags: Record<string, string>;
  public createdAt: Date;
  public updatedAt: Date;

  // Runtime Statistics
  private triggerCount: number = 0;
  private lastTriggeredTime?: Date;
  private falsePositiveCount: number = 0;

  constructor(configuration: Partial<IAlertConfiguration>) {
    this.id = configuration.id || this.generateId();
    this.name = configuration.name || '';
    this.description = configuration.description || '';
    this.metricId = configuration.metricId || '';
    this.severity = configuration.severity || AlertSeverity.MEDIUM;
    this.category = configuration.category || MonitoringCategory.SYSTEM;
    
    this.thresholds = configuration.thresholds || [];
    this.evaluationWindow = configuration.evaluationWindow || 300000; // 5 minutes
    this.evaluationFrequency = configuration.evaluationFrequency || 60000; // 1 minute
    this.minimumDataPoints = configuration.minimumDataPoints || 3;
    
    this.actions = configuration.actions || [];
    this.escalationPolicy = configuration.escalationPolicy || this.createDefaultEscalationPolicy();
    this.notificationConfiguration = configuration.notificationConfiguration || this.createDefaultNotificationConfiguration();
    
    this.isActive = configuration.isActive !== false;
    this.isSuppressed = configuration.isSuppressed || false;
    this.suppressionEndTime = configuration.suppressionEndTime;
    
    this.tags = configuration.tags || {};
    this.createdAt = configuration.createdAt || new Date();
    this.updatedAt = configuration.updatedAt || new Date();
  }

  /**
   * Evaluate alert conditions against metric values
   */
  public evaluate(metricValues: IMetricValue[]): { shouldTrigger: boolean; triggeredThresholds: IThreshold[] } {
    if (!this.isActive || this.isSuppressed) {
      return { shouldTrigger: false, triggeredThresholds: [] };
    }

    if (metricValues.length < this.minimumDataPoints) {
      return { shouldTrigger: false, triggeredThresholds: [] };
    }

    const triggeredThresholds: IThreshold[] = [];

    for (const threshold of this.thresholds) {
      if (this.evaluateThreshold(threshold, metricValues)) {
        triggeredThresholds.push(threshold);
      }
    }

    const shouldTrigger = triggeredThresholds.length > 0;
    
    if (shouldTrigger) {
      this.triggerCount++;
      this.lastTriggeredTime = new Date();
    }

    return { shouldTrigger, triggeredThresholds };
  }

  /**
   * Evaluate a single threshold
   */
  private evaluateThreshold(threshold: IThreshold, metricValues: IMetricValue[]): boolean {
    const relevantValues = metricValues.filter(value => 
      value.timestamp.getTime() >= Date.now() - this.evaluationWindow
    );

    if (relevantValues.length < this.minimumDataPoints) {
      return false;
    }

    let aggregatedValue: number;

    switch (threshold.aggregationMethod) {
      case AggregationMethod.AVERAGE:
        aggregatedValue = relevantValues.reduce((sum, v) => sum + v.value, 0) / relevantValues.length;
        break;
      case AggregationMethod.MAX:
        aggregatedValue = Math.max(...relevantValues.map(v => v.value));
        break;
      case AggregationMethod.MIN:
        aggregatedValue = Math.min(...relevantValues.map(v => v.value));
        break;
      case AggregationMethod.SUM:
        aggregatedValue = relevantValues.reduce((sum, v) => sum + v.value, 0);
        break;
      case AggregationMethod.COUNT:
        aggregatedValue = relevantValues.length;
        break;
      default:
        aggregatedValue = relevantValues[relevantValues.length - 1].value; // Last value
    }

    return this.compareValue(aggregatedValue, threshold.value, threshold.operator);
  }

  /**
   * Compare value against threshold
   */
  private compareValue(value: number, threshold: number, operator: ComparisonOperator): boolean {
    switch (operator) {
      case ComparisonOperator.GREATER_THAN:
        return value > threshold;
      case ComparisonOperator.GREATER_THAN_OR_EQUAL:
        return value >= threshold;
      case ComparisonOperator.LESS_THAN:
        return value < threshold;
      case ComparisonOperator.LESS_THAN_OR_EQUAL:
        return value <= threshold;
      case ComparisonOperator.EQUAL:
        return value === threshold;
      case ComparisonOperator.NOT_EQUAL:
        return value !== threshold;
      default:
        return false;
    }
  }

  /**
   * Suppress alert for specified duration
   */
  public suppress(durationMs: number): void {
    this.isSuppressed = true;
    this.suppressionEndTime = new Date(Date.now() + durationMs);
  }

  /**
   * Remove suppression
   */
  public unsuppress(): void {
    this.isSuppressed = false;
    this.suppressionEndTime = undefined;
  }

  /**
   * Check if suppression has expired
   */
  public checkSuppressionExpiry(): void {
    if (this.isSuppressed && this.suppressionEndTime && this.suppressionEndTime <= new Date()) {
      this.unsuppress();
    }
  }

  /**
   * Get alert statistics
   */
  public getStatistics(): any {
    return {
      triggerCount: this.triggerCount,
      lastTriggeredTime: this.lastTriggeredTime,
      falsePositiveCount: this.falsePositiveCount,
      falsePositiveRate: this.triggerCount > 0 ? (this.falsePositiveCount / this.triggerCount) * 100 : 0
    };
  }

  /**
   * Create default escalation policy
   */
  private createDefaultEscalationPolicy(): IEscalationPolicy {
    return {
      levels: [
        {
          level: EscalationLevel.L1,
          delayMinutes: 0,
          recipients: [],
          methods: [NotificationMethod.EMAIL]
        },
        {
          level: EscalationLevel.L2,
          delayMinutes: 15,
          recipients: [],
          methods: [NotificationMethod.EMAIL, NotificationMethod.SMS]
        },
        {
          level: EscalationLevel.L3,
          delayMinutes: 30,
          recipients: [],
          methods: [NotificationMethod.EMAIL, NotificationMethod.SMS, NotificationMethod.PHONE]
        }
      ],
      maxEscalationLevel: EscalationLevel.L3,
      escalationTimeout: 60
    };
  }

  /**
   * Create default notification configuration
   */
  private createDefaultNotificationConfiguration(): INotificationConfiguration {
    return {
      channels: [AlertChannel.EMAIL],
      recipients: [],
      messageTemplate: 'Alert: {{alertName}} - {{severity}} - {{description}}',
      includeMetricData: true,
      includeGraphs: false,
      throttleMinutes: 5,
      maxNotificationsPerHour: 10
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Alert Entity
 * Represents an active or historical alert instance
 */
export class AlertEntity implements IAlert {
  public id: string;
  public alertConfigurationId: string;
  public metricId: string;
  public status: AlertStatus;
  public severity: AlertSeverity;
  
  // Alert Details
  public title: string;
  public description: string;
  public triggeredValue: number;
  public triggeredThresholds: IThreshold[];
  
  // Timing
  public triggeredAt: Date;
  public acknowledgedAt?: Date;
  public resolvedAt?: Date;
  public duration?: number;
  
  // Context
  public context: Record<string, any>;
  public tags: Record<string, string>;
  
  // Actions Taken
  public actionsTaken: IAlertAction[];
  public escalationLevel: EscalationLevel;
  public notificationsSent: number;

  constructor(
    alertConfigurationId: string,
    metricId: string,
    severity: AlertSeverity,
    title: string,
    description: string,
    triggeredValue: number,
    triggeredThresholds: IThreshold[]
  ) {
    this.id = this.generateId();
    this.alertConfigurationId = alertConfigurationId;
    this.metricId = metricId;
    this.status = AlertStatus.TRIGGERED;
    this.severity = severity;
    this.title = title;
    this.description = description;
    this.triggeredValue = triggeredValue;
    this.triggeredThresholds = triggeredThresholds;
    this.triggeredAt = new Date();
    this.context = {};
    this.tags = {};
    this.actionsTaken = [];
    this.escalationLevel = EscalationLevel.L1;
    this.notificationsSent = 0;
  }

  /**
   * Acknowledge alert
   */
  public acknowledge(userId: string, comment?: string): void {
    this.status = AlertStatus.ACKNOWLEDGED;
    this.acknowledgedAt = new Date();
    
    this.actionsTaken.push({
      type: 'acknowledge',
      timestamp: new Date(),
      userId,
      details: { comment }
    });
  }

  /**
   * Resolve alert
   */
  public resolve(userId: string, comment?: string): void {
    this.status = AlertStatus.RESOLVED;
    this.resolvedAt = new Date();
    this.duration = this.resolvedAt.getTime() - this.triggeredAt.getTime();
    
    this.actionsTaken.push({
      type: 'resolve',
      timestamp: new Date(),
      userId,
      details: { comment }
    });
  }

  /**
   * Escalate alert
   */
  public escalate(newLevel: EscalationLevel, userId: string, reason?: string): void {
    this.escalationLevel = newLevel;
    
    this.actionsTaken.push({
      type: 'escalate',
      timestamp: new Date(),
      userId,
      details: { newLevel, reason }
    });
  }

  /**
   * Add action taken
   */
  public addAction(action: IAlertAction): void {
    this.actionsTaken.push(action);
  }

  /**
   * Increment notification count
   */
  public incrementNotificationCount(): void {
    this.notificationsSent++;
  }

  /**
   * Check if alert is active
   */
  public isActive(): boolean {
    return this.status === AlertStatus.TRIGGERED || this.status === AlertStatus.ACKNOWLEDGED;
  }

  /**
   * Get alert age in milliseconds
   */
  public getAge(): number {
    return Date.now() - this.triggeredAt.getTime();
  }

  /**
   * Get alert summary
   */
  public getSummary(): any {
    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      status: this.status,
      triggeredAt: this.triggeredAt,
      age: this.getAge(),
      escalationLevel: this.escalationLevel,
      notificationsSent: this.notificationsSent,
      actionCount: this.actionsTaken.length
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Health Check Configuration Entity
 * Defines health check parameters and expectations
 */
export class HealthCheckConfigurationEntity implements IHealthCheckConfiguration {
  public id: string;
  public name: string;
  public description: string;
  public category: MonitoringCategory;
  public scope: MonitoringScope;
  
  // Check Configuration
  public checkType: string;
  public endpoint?: string;
  public timeout: number;
  public interval: number;
  public retryAttempts: number;
  public retryDelay: number;
  
  // Health Criteria
  public expectedStatusCode?: number;
  public expectedResponseTime?: number;
  public expectedContent?: string;
  public customValidation?: string;
  
  // State Management
  public isActive: boolean;
  public tags: Record<string, string>;
  public createdAt: Date;
  public updatedAt: Date;

  // Runtime Statistics
  private checkCount: number = 0;
  private successCount: number = 0;
  private failureCount: number = 0;
  private averageResponseTime: number = 0;
  private lastCheckTime?: Date;

  constructor(configuration: Partial<IHealthCheckConfiguration>) {
    this.id = configuration.id || this.generateId();
    this.name = configuration.name || '';
    this.description = configuration.description || '';
    this.category = configuration.category || MonitoringCategory.SYSTEM;
    this.scope = configuration.scope || MonitoringScope.GLOBAL;
    
    this.checkType = configuration.checkType || 'http';
    this.endpoint = configuration.endpoint;
    this.timeout = configuration.timeout || 5000;
    this.interval = configuration.interval || 30000;
    this.retryAttempts = configuration.retryAttempts || 3;
    this.retryDelay = configuration.retryDelay || 1000;
    
    this.expectedStatusCode = configuration.expectedStatusCode || 200;
    this.expectedResponseTime = configuration.expectedResponseTime || 5000;
    this.expectedContent = configuration.expectedContent;
    this.customValidation = configuration.customValidation;
    
    this.isActive = configuration.isActive !== false;
    this.tags = configuration.tags || {};
    this.createdAt = configuration.createdAt || new Date();
    this.updatedAt = configuration.updatedAt || new Date();
  }

  /**
   * Update check statistics
   */
  public updateCheckStatistics(responseTime: number, success: boolean): void {
    this.checkCount++;
    this.lastCheckTime = new Date();
    
    if (success) {
      this.successCount++;
    } else {
      this.failureCount++;
    }
    
    // Update average response time
    this.averageResponseTime = (
      (this.averageResponseTime * (this.checkCount - 1)) + responseTime
    ) / this.checkCount;
  }

  /**
   * Get health check success rate
   */
  public getSuccessRate(): number {
    if (this.checkCount === 0) return 100;
    return (this.successCount / this.checkCount) * 100;
  }

  /**
   * Get health check statistics
   */
  public getStatistics(): any {
    return {
      checkCount: this.checkCount,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: this.getSuccessRate(),
      averageResponseTime: this.averageResponseTime,
      lastCheckTime: this.lastCheckTime
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `healthcheck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Health Check Result Entity
 * Represents the result of a health check execution
 */
export class HealthCheckResultEntity implements IHealthCheckResult {
  public healthCheckId: string;
  public status: HealthStatus;
  public responseTime: number;
  public timestamp: Date;
  public message?: string;
  public details: Record<string, any>;
  public error?: string;

  constructor(
    healthCheckId: string,
    status: HealthStatus,
    responseTime: number,
    message?: string,
    details: Record<string, any> = {},
    error?: string
  ) {
    this.healthCheckId = healthCheckId;
    this.status = status;
    this.responseTime = responseTime;
    this.timestamp = new Date();
    this.message = message;
    this.details = details;
    this.error = error;
  }

  /**
   * Check if result indicates healthy status
   */
  public isHealthy(): boolean {
    return this.status === HealthStatus.HEALTHY;
  }

  /**
   * Check if result indicates degraded status
   */
  public isDegraded(): boolean {
    return this.status === HealthStatus.DEGRADED;
  }

  /**
   * Check if result indicates unhealthy status
   */
  public isUnhealthy(): boolean {
    return this.status === HealthStatus.UNHEALTHY;
  }

  /**
   * Get result summary
   */
  public getSummary(): any {
    return {
      healthCheckId: this.healthCheckId,
      status: this.status,
      responseTime: this.responseTime,
      timestamp: this.timestamp,
      isHealthy: this.isHealthy(),
      message: this.message
    };
  }
}

