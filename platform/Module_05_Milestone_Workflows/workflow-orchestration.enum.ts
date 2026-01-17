/**
 * Module 3 Phase 3.1: Advanced Automation Foundation
 * Workflow Orchestration Enums
 * 
 * Comprehensive enums for workflow orchestration, task management,
 * and automation engine configuration
 */

/**
 * Workflow execution status enumeration
 */
export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  SUSPENDED = 'suspended',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived'
}

/**
 * Task execution status enumeration
 */
export enum TaskStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  WAITING = 'waiting',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  SKIPPED = 'skipped',
  TIMEOUT = 'timeout',
  RETRY = 'retry'
}

/**
 * Task priority levels
 */
export enum TaskPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  BACKGROUND = 'background'
}

/**
 * Workflow trigger types
 */
export enum WorkflowTrigger {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  EVENT_DRIVEN = 'event_driven',
  API_CALL = 'api_call',
  WEBHOOK = 'webhook',
  FILE_UPLOAD = 'file_upload',
  DATA_CHANGE = 'data_change',
  TIME_BASED = 'time_based',
  CONDITION_MET = 'condition_met'
}

/**
 * Task routing strategies
 */
export enum TaskRoutingStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_LOADED = 'least_loaded',
  SKILL_BASED = 'skill_based',
  PERFORMANCE_BASED = 'performance_based',
  GEOGRAPHIC = 'geographic',
  COST_OPTIMIZED = 'cost_optimized',
  PRIORITY_BASED = 'priority_based',
  RANDOM = 'random'
}

/**
 * Workflow execution modes
 */
export enum WorkflowExecutionMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional',
  LOOP = 'loop',
  BRANCH = 'branch',
  MERGE = 'merge',
  SPLIT = 'split',
  JOIN = 'join'
}

/**
 * Task types for different operations
 */
export enum TaskType {
  // Payment Processing Tasks
  PAYMENT_VALIDATION = 'payment_validation',
  PAYMENT_PROCESSING = 'payment_processing',
  PAYMENT_RECONCILIATION = 'payment_reconciliation',
  PAYMENT_NOTIFICATION = 'payment_notification',
  
  // Customer Management Tasks
  CUSTOMER_ONBOARDING = 'customer_onboarding',
  CUSTOMER_VERIFICATION = 'customer_verification',
  CUSTOMER_COMMUNICATION = 'customer_communication',
  CUSTOMER_SEGMENTATION = 'customer_segmentation',
  
  // Invoice Management Tasks
  INVOICE_GENERATION = 'invoice_generation',
  INVOICE_DELIVERY = 'invoice_delivery',
  INVOICE_REMINDER = 'invoice_reminder',
  INVOICE_RECONCILIATION = 'invoice_reconciliation',
  
  // Risk Management Tasks
  RISK_ASSESSMENT = 'risk_assessment',
  FRAUD_DETECTION = 'fraud_detection',
  COMPLIANCE_CHECK = 'compliance_check',
  AUDIT_TRAIL = 'audit_trail',
  
  // Analytics and Reporting Tasks
  DATA_COLLECTION = 'data_collection',
  DATA_PROCESSING = 'data_processing',
  REPORT_GENERATION = 'report_generation',
  ANALYTICS_COMPUTATION = 'analytics_computation',
  
  // Integration Tasks
  API_CALL = 'api_call',
  DATA_SYNC = 'data_sync',
  FILE_PROCESSING = 'file_processing',
  WEBHOOK_PROCESSING = 'webhook_processing',
  
  // System Tasks
  HEALTH_CHECK = 'health_check',
  MAINTENANCE = 'maintenance',
  BACKUP = 'backup',
  CLEANUP = 'cleanup',
  
  // AI and ML Tasks
  MODEL_TRAINING = 'model_training',
  PREDICTION = 'prediction',
  ANOMALY_DETECTION = 'anomaly_detection',
  PATTERN_RECOGNITION = 'pattern_recognition'
}

/**
 * Automation levels for different operations
 */
export enum AutomationLevel {
  MANUAL = 'manual',
  SEMI_AUTOMATED = 'semi_automated',
  FULLY_AUTOMATED = 'fully_automated',
  AI_ASSISTED = 'ai_assisted',
  AUTONOMOUS = 'autonomous'
}

/**
 * Workflow template categories
 */
export enum WorkflowCategory {
  PAYMENT_PROCESSING = 'payment_processing',
  CUSTOMER_MANAGEMENT = 'customer_management',
  INVOICE_MANAGEMENT = 'invoice_management',
  RISK_MANAGEMENT = 'risk_management',
  COMPLIANCE = 'compliance',
  ANALYTICS = 'analytics',
  INTEGRATION = 'integration',
  MAINTENANCE = 'maintenance',
  CUSTOM = 'custom'
}

/**
 * Error handling strategies
 */
export enum ErrorHandlingStrategy {
  FAIL_FAST = 'fail_fast',
  RETRY = 'retry',
  SKIP = 'skip',
  FALLBACK = 'fallback',
  COMPENSATE = 'compensate',
  ESCALATE = 'escalate',
  IGNORE = 'ignore',
  MANUAL_INTERVENTION = 'manual_intervention'
}

/**
 * Resource allocation strategies
 */
export enum ResourceAllocationStrategy {
  FIXED = 'fixed',
  DYNAMIC = 'dynamic',
  ADAPTIVE = 'adaptive',
  PREDICTIVE = 'predictive',
  COST_OPTIMIZED = 'cost_optimized',
  PERFORMANCE_OPTIMIZED = 'performance_optimized',
  BALANCED = 'balanced'
}

/**
 * Workflow metrics types
 */
export enum WorkflowMetricType {
  EXECUTION_TIME = 'execution_time',
  SUCCESS_RATE = 'success_rate',
  ERROR_RATE = 'error_rate',
  THROUGHPUT = 'throughput',
  RESOURCE_UTILIZATION = 'resource_utilization',
  COST = 'cost',
  QUALITY_SCORE = 'quality_score',
  CUSTOMER_SATISFACTION = 'customer_satisfaction',
  SLA_COMPLIANCE = 'sla_compliance'
}

/**
 * Notification types for workflow events
 */
export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  TEAMS = 'teams',
  IN_APP = 'in_app',
  DASHBOARD = 'dashboard'
}

/**
 * Workflow version control actions
 */
export enum VersionAction {
  CREATE = 'create',
  UPDATE = 'update',
  DEPLOY = 'deploy',
  ROLLBACK = 'rollback',
  ARCHIVE = 'archive',
  CLONE = 'clone',
  MERGE = 'merge',
  BRANCH = 'branch'
}

/**
 * Integration types for external systems
 */
export enum IntegrationType {
  REST_API = 'rest_api',
  GRAPHQL = 'graphql',
  SOAP = 'soap',
  WEBHOOK = 'webhook',
  MESSAGE_QUEUE = 'message_queue',
  DATABASE = 'database',
  FILE_SYSTEM = 'file_system',
  FTP = 'ftp',
  SFTP = 'sftp',
  EMAIL = 'email',
  SMS = 'sms'
}

/**
 * Workflow complexity levels
 */
export enum WorkflowComplexity {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
  ENTERPRISE = 'enterprise',
  CRITICAL = 'critical'
}

/**
 * Performance optimization strategies
 */
export enum OptimizationStrategy {
  SPEED = 'speed',
  COST = 'cost',
  QUALITY = 'quality',
  RELIABILITY = 'reliability',
  SCALABILITY = 'scalability',
  SECURITY = 'security',
  COMPLIANCE = 'compliance',
  BALANCED = 'balanced'
}

/**
 * Workflow deployment environments
 */
export enum DeploymentEnvironment {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  STAGING = 'staging',
  PRODUCTION = 'production',
  DISASTER_RECOVERY = 'disaster_recovery'
}

/**
 * Workflow scaling strategies
 */
export enum ScalingStrategy {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
  AUTO = 'auto',
  PREDICTIVE = 'predictive',
  REACTIVE = 'reactive',
  PROACTIVE = 'proactive'
}

/**
 * Quality assurance levels
 */
export enum QualityLevel {
  BASIC = 'basic',
  STANDARD = 'standard',
  ENHANCED = 'enhanced',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

/**
 * Workflow governance levels
 */
export enum GovernanceLevel {
  NONE = 'none',
  BASIC = 'basic',
  STANDARD = 'standard',
  STRICT = 'strict',
  ENTERPRISE = 'enterprise',
  REGULATORY = 'regulatory'
}

