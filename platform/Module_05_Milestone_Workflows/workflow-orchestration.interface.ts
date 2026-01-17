/**
 * Module 3 Phase 3.1: Advanced Automation Foundation
 * Workflow Orchestration Interfaces
 * 
 * Comprehensive interfaces for workflow orchestration, task management,
 * automation engine configuration, and performance monitoring
 */

import {
  WorkflowStatus,
  TaskStatus,
  TaskPriority,
  WorkflowTrigger,
  TaskRoutingStrategy,
  WorkflowExecutionMode,
  TaskType,
  AutomationLevel,
  WorkflowCategory,
  ErrorHandlingStrategy,
  ResourceAllocationStrategy,
  WorkflowMetricType,
  NotificationType,
  IntegrationType,
  WorkflowComplexity,
  OptimizationStrategy,
  ScalingStrategy,
  QualityLevel,
  GovernanceLevel
} from '../enums/workflow-orchestration.enum';

/**
 * Base workflow definition interface
 */
export interface IWorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  category: WorkflowCategory;
  complexity: WorkflowComplexity;
  status: WorkflowStatus;
  
  // Workflow Configuration
  trigger: IWorkflowTrigger;
  executionMode: WorkflowExecutionMode;
  automationLevel: AutomationLevel;
  
  // Tasks and Dependencies
  tasks: ITaskDefinition[];
  dependencies: ITaskDependency[];
  
  // Resource Management
  resourceRequirements: IResourceRequirements;
  resourceAllocationStrategy: ResourceAllocationStrategy;
  
  // Performance and Quality
  slaRequirements: ISLARequirements;
  qualityLevel: QualityLevel;
  optimizationStrategy: OptimizationStrategy;
  
  // Governance and Compliance
  governanceLevel: GovernanceLevel;
  complianceRequirements: string[];
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  tags: string[];
  metadata: Record<string, any>;
}

/**
 * Workflow trigger configuration
 */
export interface IWorkflowTrigger {
  type: WorkflowTrigger;
  configuration: {
    // Schedule-based triggers
    cronExpression?: string;
    timezone?: string;
    
    // Event-driven triggers
    eventType?: string;
    eventSource?: string;
    eventFilters?: Record<string, any>;
    
    // API-based triggers
    apiEndpoint?: string;
    httpMethod?: string;
    authenticationRequired?: boolean;
    
    // Webhook triggers
    webhookUrl?: string;
    secretKey?: string;
    
    // Condition-based triggers
    conditions?: IWorkflowCondition[];
    
    // File-based triggers
    filePath?: string;
    filePattern?: string;
    
    // Data change triggers
    dataSource?: string;
    changeType?: string;
    changeFilters?: Record<string, any>;
  };
  
  // Trigger validation and testing
  isActive: boolean;
  lastTriggered?: Date;
  triggerCount: number;
  failureCount: number;
}

/**
 * Task definition interface
 */
export interface ITaskDefinition {
  id: string;
  name: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  
  // Task Configuration
  configuration: ITaskConfiguration;
  
  // Input/Output Definition
  inputs: ITaskInput[];
  outputs: ITaskOutput[];
  
  // Execution Settings
  executionSettings: ITaskExecutionSettings;
  
  // Error Handling
  errorHandling: IErrorHandlingConfiguration;
  
  // Resource Requirements
  resourceRequirements: ITaskResourceRequirements;
  
  // Routing and Assignment
  routingStrategy: TaskRoutingStrategy;
  assignmentRules: ITaskAssignmentRule[];
  
  // Monitoring and Metrics
  monitoringConfiguration: ITaskMonitoringConfiguration;
  
  // Metadata
  tags: string[];
  metadata: Record<string, any>;
}

/**
 * Task configuration interface
 */
export interface ITaskConfiguration {
  // General Configuration
  timeout: number;
  retryPolicy: IRetryPolicy;
  
  // Task-specific Configuration
  parameters: Record<string, any>;
  
  // Integration Configuration
  integrations: IIntegrationConfiguration[];
  
  // AI/ML Configuration
  aiConfiguration?: IAIConfiguration;
  
  // Validation Rules
  validationRules: IValidationRule[];
  
  // Custom Scripts
  preExecutionScript?: string;
  postExecutionScript?: string;
  
  // Environment Variables
  environmentVariables: Record<string, string>;
}

/**
 * Task input definition
 */
export interface ITaskInput {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  validation: IValidationRule[];
  description: string;
  source?: string;
  transformation?: string;
}

/**
 * Task output definition
 */
export interface ITaskOutput {
  name: string;
  type: string;
  description: string;
  destination?: string;
  transformation?: string;
  persistenceSettings?: IPersistenceSettings;
}

/**
 * Task execution settings
 */
export interface ITaskExecutionSettings {
  maxConcurrency: number;
  executionOrder: number;
  canRunInParallel: boolean;
  requiresApproval: boolean;
  approvalRules?: IApprovalRule[];
  executionEnvironment: string;
  isolationLevel: string;
}

/**
 * Error handling configuration
 */
export interface IErrorHandlingConfiguration {
  strategy: ErrorHandlingStrategy;
  maxRetries: number;
  retryDelay: number;
  escalationRules: IEscalationRule[];
  fallbackTasks?: string[];
  compensationTasks?: string[];
  notificationSettings: INotificationSettings;
}

/**
 * Task resource requirements
 */
export interface ITaskResourceRequirements {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
  specialResources?: string[];
  constraints?: Record<string, any>;
}

/**
 * Task assignment rule
 */
export interface ITaskAssignmentRule {
  id: string;
  name: string;
  condition: string;
  assignTo: string;
  priority: number;
  isActive: boolean;
}

/**
 * Task monitoring configuration
 */
export interface ITaskMonitoringConfiguration {
  enableMetrics: boolean;
  metricsToCollect: WorkflowMetricType[];
  alertingRules: IAlertingRule[];
  dashboardConfiguration?: IDashboardConfiguration;
}

/**
 * Workflow condition interface
 */
export interface IWorkflowCondition {
  id: string;
  name: string;
  expression: string;
  operator: string;
  value: any;
  dataSource: string;
}

/**
 * Task dependency interface
 */
export interface ITaskDependency {
  id: string;
  dependentTaskId: string;
  prerequisiteTaskId: string;
  dependencyType: string;
  condition?: string;
  isOptional: boolean;
}

/**
 * Resource requirements interface
 */
export interface IResourceRequirements {
  minCpu: number;
  maxCpu: number;
  minMemory: number;
  maxMemory: number;
  minStorage: number;
  maxStorage: number;
  networkBandwidth: number;
  specialResources: string[];
  scalingPolicy: IScalingPolicy;
}

/**
 * SLA requirements interface
 */
export interface ISLARequirements {
  maxExecutionTime: number;
  maxResponseTime: number;
  minSuccessRate: number;
  maxErrorRate: number;
  availabilityTarget: number;
  performanceTargets: IPerformanceTarget[];
}

/**
 * Performance target interface
 */
export interface IPerformanceTarget {
  metric: WorkflowMetricType;
  target: number;
  threshold: number;
  operator: string;
}

/**
 * Retry policy interface
 */
export interface IRetryPolicy {
  maxRetries: number;
  initialDelay: number;
  backoffMultiplier: number;
  maxDelay: number;
  retryConditions: string[];
}

/**
 * Integration configuration interface
 */
export interface IIntegrationConfiguration {
  id: string;
  name: string;
  type: IntegrationType;
  endpoint: string;
  authentication: IAuthenticationConfiguration;
  parameters: Record<string, any>;
  timeout: number;
  retryPolicy: IRetryPolicy;
}

/**
 * Authentication configuration interface
 */
export interface IAuthenticationConfiguration {
  type: string;
  credentials: Record<string, string>;
  tokenEndpoint?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

/**
 * AI configuration interface
 */
export interface IAIConfiguration {
  modelType: string;
  modelVersion: string;
  parameters: Record<string, any>;
  trainingData?: string;
  confidenceThreshold: number;
  enableLearning: boolean;
}

/**
 * Validation rule interface
 */
export interface IValidationRule {
  id: string;
  name: string;
  type: string;
  expression: string;
  errorMessage: string;
  isRequired: boolean;
}

/**
 * Persistence settings interface
 */
export interface IPersistenceSettings {
  storageType: string;
  location: string;
  retentionPeriod: number;
  encryptionEnabled: boolean;
  compressionEnabled: boolean;
}

/**
 * Approval rule interface
 */
export interface IApprovalRule {
  id: string;
  name: string;
  condition: string;
  approvers: string[];
  requiredApprovals: number;
  timeout: number;
  escalationRules: IEscalationRule[];
}

/**
 * Escalation rule interface
 */
export interface IEscalationRule {
  id: string;
  name: string;
  condition: string;
  escalateTo: string[];
  delay: number;
  maxEscalations: number;
}

/**
 * Notification settings interface
 */
export interface INotificationSettings {
  enabled: boolean;
  channels: NotificationType[];
  recipients: string[];
  templates: Record<string, string>;
  conditions: string[];
}

/**
 * Alerting rule interface
 */
export interface IAlertingRule {
  id: string;
  name: string;
  condition: string;
  severity: string;
  threshold: number;
  duration: number;
  notificationSettings: INotificationSettings;
}

/**
 * Dashboard configuration interface
 */
export interface IDashboardConfiguration {
  id: string;
  name: string;
  widgets: IDashboardWidget[];
  refreshInterval: number;
  isPublic: boolean;
}

/**
 * Dashboard widget interface
 */
export interface IDashboardWidget {
  id: string;
  type: string;
  title: string;
  configuration: Record<string, any>;
  position: IWidgetPosition;
  size: IWidgetSize;
}

/**
 * Widget position interface
 */
export interface IWidgetPosition {
  x: number;
  y: number;
}

/**
 * Widget size interface
 */
export interface IWidgetSize {
  width: number;
  height: number;
}

/**
 * Scaling policy interface
 */
export interface IScalingPolicy {
  strategy: ScalingStrategy;
  minInstances: number;
  maxInstances: number;
  targetUtilization: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number;
}

/**
 * Workflow execution context interface
 */
export interface IWorkflowExecutionContext {
  workflowId: string;
  executionId: string;
  tenantId: string;
  userId: string;
  
  // Execution State
  status: WorkflowStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  
  // Input/Output Data
  inputData: Record<string, any>;
  outputData: Record<string, any>;
  
  // Task Execution Results
  taskResults: ITaskExecutionResult[];
  
  // Performance Metrics
  metrics: IWorkflowMetrics;
  
  // Error Information
  errors: IWorkflowError[];
  
  // Audit Trail
  auditTrail: IAuditEntry[];
}

/**
 * Task execution result interface
 */
export interface ITaskExecutionResult {
  taskId: string;
  status: TaskStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  inputData: Record<string, any>;
  outputData: Record<string, any>;
  errors: ITaskError[];
  metrics: ITaskMetrics;
}

/**
 * Workflow metrics interface
 */
export interface IWorkflowMetrics {
  executionTime: number;
  successRate: number;
  errorRate: number;
  throughput: number;
  resourceUtilization: IResourceUtilization;
  qualityScore: number;
  customerSatisfaction: number;
  cost: number;
}

/**
 * Task metrics interface
 */
export interface ITaskMetrics {
  executionTime: number;
  cpuUsage: number;
  memoryUsage: number;
  networkUsage: number;
  errorCount: number;
  retryCount: number;
  qualityScore: number;
}

/**
 * Resource utilization interface
 */
export interface IResourceUtilization {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
}

/**
 * Workflow error interface
 */
export interface IWorkflowError {
  id: string;
  taskId?: string;
  errorType: string;
  errorCode: string;
  message: string;
  stackTrace: string;
  timestamp: Date;
  severity: string;
  isRecoverable: boolean;
}

/**
 * Task error interface
 */
export interface ITaskError {
  id: string;
  errorType: string;
  errorCode: string;
  message: string;
  stackTrace: string;
  timestamp: Date;
  isRetryable: boolean;
}

/**
 * Audit entry interface
 */
export interface IAuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}

