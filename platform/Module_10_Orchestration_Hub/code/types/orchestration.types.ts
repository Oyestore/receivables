/**
 * Module 10: Multi-Agent Orchestration & Intelligence Hub
 * Type Definitions and Interfaces
 * 
 * Comprehensive type system for orchestration, workflows, constraints, and recommendations
 */

// ============================================================================
// Agent and Task Types
// ============================================================================

export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  ERROR = 'error'
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

export enum TaskPriority {
  CRITICAL = 10,
  HIGH = 8,
  MEDIUM = 5,
  LOW = 3,
  ROUTINE = 1
}

export interface IAgent {
  id: string;
  tenant_id: string;
  name: string;
  agent_type: string;
  description: string;
  capabilities: string[];
  configuration: Record<string, any>;
  status: AgentStatus;
  created_at: Date;
  updated_at: Date;
  last_active_at?: Date;
}

export interface IAgentTask {
  id: string;
  tenant_id: string;
  agent_id: string;
  task_type: string;
  priority: number;
  status: TaskStatus;
  input_data: Record<string, any>;
  output_data?: Record<string, any>;
  dependencies?: string[];
  created_by: string;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  execution_time?: number;
  error_message?: string;
}

// ============================================================================
// Constraint Types
// ============================================================================

export enum ConstraintType {
  CASH_FLOW = 'cash_flow',
  COLLECTION_EFFICIENCY = 'collection_efficiency',
  CREDIT_RISK = 'credit_risk',
  OPERATIONAL = 'operational',
  MARKET = 'market',
  CUSTOMER_SEGMENT = 'customer_segment',
  RESOURCE = 'resource',
  PROCESS = 'process'
}

export enum ConstraintSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum ConstraintStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  IN_PROGRESS = 'in_progress',
  IGNORED = 'ignored'
}

export interface IConstraint {
  id?: string;
  tenant_id?: string;
  constraint_type: ConstraintType;
  severity: ConstraintSeverity;
  description: string;
  impact_score: number;
  identified_data: Record<string, any>;
  status?: ConstraintStatus;
  root_causes?: string[];
  affected_modules?: string[];
  created_at?: Date;
  updated_at?: Date;
  resolved_at?: Date;
}

export interface IConstraintAnalysisResult {
  constraints: IConstraint[];
  primary_constraint: IConstraint | null;
  total_impact_score: number;
  analysis_timestamp: Date;
  data_sources: string[];
  confidence_score: number;
}

// ============================================================================
// Strategic Recommendation Types
// ============================================================================

export enum RecommendationType {
  IMMEDIATE_ACTION = 'immediate_action',
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
  PROCESS_IMPROVEMENT = 'process_improvement',
  TECHNOLOGY_UPGRADE = 'technology_upgrade',
  POLICY_CHANGE = 'policy_change'
}

export enum RecommendationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  OBSOLETE = 'obsolete'
}

export interface IActionItem {
  title: string;
  description: string;
  estimated_effort_hours: number;
  required_resources: string[];
  dependencies?: string[];
  expected_completion_days: number;
}

export interface IStrategicRecommendation {
  id?: string;
  tenant_id?: string;
  constraint_id?: string;
  recommendation_type: RecommendationType;
  title: string;
  description: string;
  expected_impact: string;
  priority: number;
  action_items: IActionItem[];
  status?: RecommendationStatus;
  implementation_timeline_days?: number;
  estimated_roi_percentage?: number;
  risk_factors?: string[];
  success_metrics?: string[];
  created_at?: Date;
  updated_at?: Date;
  implemented_at?: Date;
}

// ============================================================================
// Workflow Types
// ============================================================================

export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

export enum WorkflowPriority {
  CRITICAL = 10,
  HIGH = 7,
  NORMAL = 5,
  LOW = 3
}

export interface IWorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  workflow_type: string;
  triggers: IWorkflowTrigger[];
  steps: IWorkflowStep[];
  error_handling: IErrorHandling;
  timeout_seconds: number;
  max_retries: number;
  metadata: Record<string, any>;
}

export interface IWorkflowTrigger {
  type: 'manual' | 'scheduled' | 'event' | 'condition';
  config: Record<string, any>;
}

export interface IWorkflowStep {
  id: string;
  name: string;
  type: 'activity' | 'decision' | 'parallel' | 'wait';
  module?: string;
  action: string;
  input: Record<string, any>;
  output?: string;
  next_step_id?: string;
  condition?: string;
  timeout_seconds?: number;
  retry_policy?: IRetryPolicy;
}

export interface IRetryPolicy {
  max_attempts: number;
  initial_interval_seconds: number;
  backoff_coefficient: number;
  maximum_interval_seconds: number;
}

export interface IErrorHandling {
  on_error: 'retry' | 'fail' | 'compensate' | 'ignore';
  compensation_workflow?: string;
  error_notification: boolean;
  escalation_rules: IEscalationRule[];
}

export interface IEscalationRule {
  condition: string;
  escalate_to: string;
  escalation_type: 'email' | 'sms' | 'notification';
  message_template: string;
}

export interface IWorkflowExecution {
  id: string;
  tenant_id: string;
  workflow_id: string;
  workflow_name: string;
  status: WorkflowStatus;
  priority: WorkflowPriority;
  input_data: Record<string, any>;
  output_data?: Record<string, any>;
  current_step?: string;
  execution_path: string[];
  error_details?: IErrorDetails;
  started_at: Date;
  completed_at?: Date;
  execution_duration_ms?: number;
  created_by: string;
}

export interface IErrorDetails {
  step_id: string;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  retry_count: number;
  timestamp: Date;
}

// ============================================================================
// Module Integration Types
// ============================================================================

export enum ModuleName {
  INVOICE_MANAGEMENT = 'module_01',
  CUSTOMER_COMMUNICATION = 'module_02',
  PAYMENT_INTEGRATION = 'module_03',
  ANALYTICS_REPORTING = 'module_04',
  MILESTONE_WORKFLOWS = 'module_05',
  CREDIT_SCORING = 'module_06',
  FINANCING_FACTORING = 'module_07',
  DISPUTE_RESOLUTION = 'module_08',
  MARKETING_CUSTOMER_SUCCESS = 'module_09'
}

export interface IModuleAdapter {
  moduleName: ModuleName;
  baseUrl: string;
  version: string;
  capabilities: string[];
  healthCheck(): Promise<IHealthCheckResult>;
  executeAction(action: string, params: Record<string, any>): Promise<any>;
}

export interface IHealthCheckResult {
  module: ModuleName;
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time_ms: number;
  error?: string;
  last_check: Date;
}

export interface IModuleEvent {
  event_id: string;
  source_module: ModuleName;
  event_type: string;
  timestamp: Date;
  tenant_id: string;
  payload: Record<string, any>;
  correlation_id?: string;
}

// ============================================================================
// Multi-Module Coordination Types
// ============================================================================

export interface ICoordinationRequest {
  tenant_id: string;
  coordination_type: string;
  modules: ModuleName[];
  objective: string;
  constraints?: Record<string, any>;
  priority: WorkflowPriority;
  requested_by: string;
}

export interface ICoordinationResult {
  coordination_id: string;
  status: 'success' | 'partial_success' | 'failed';
  module_results: Map<ModuleName, any>;
  execution_summary: string;
  errors: IModuleError[];
  duration_ms: number;
}

export interface IModuleError {
  module: ModuleName;
  error_type: string;
  error_message: string;
  timestamp: Date;
  recoverable: boolean;
}

// ============================================================================
// Metrics and Monitoring Types
// ============================================================================

export interface IOrchestrationMetrics {
  tenant_id: string;
  period_start: Date;
  period_end: Date;
  workflows_executed: number;
  workflows_successful: number;
  workflows_failed: number;
  average_execution_time_ms: number;
  constraints_identified: number;
  recommendations_generated: number;
  module_integration_success_rate: number;
  error_rate: number;
}

export interface IPerformanceMetrics {
  metric_name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
}

// ============================================================================
// Cache and State Management Types
// ============================================================================

export interface ICacheEntry<T> {
  key: string;
  value: T;
  ttl_seconds: number;
  created_at: Date;
  expires_at: Date;
}

export interface IWorkflowState {
  workflow_execution_id: string;
  state_data: Record<string, any>;
  last_updated: Date;
  version: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface IOrchestrationConfig {
  temporal: ITemporalConfig;
  modules: IModuleConfig[];
  cache: ICacheConfig;
  security: ISecurityConfig;
  monitoring: IMonitoringConfig;
}

export interface ITemporalConfig {
  address: string;
  namespace: string;
  task_queue: string;
  max_concurrent_workflows: number;
  workflow_execution_timeout_seconds: number;
  worker_options: Record<string, any>;
}

export interface IModuleConfig {
  name: ModuleName;
  base_url: string;
  timeout_ms: number;
  retry_attempts: number;
  circuit_breaker: {
    failure_threshold: number;
    timeout_seconds: number;
    half_open_attempts: number;
  };
}

export interface ICacheConfig {
  redis_url: string;
  default_ttl_seconds: number;
  max_memory_mb: number;
  eviction_policy: string;
}

export interface ISecurityConfig {
  jwt_secret: string;
  jwt_expiry_seconds: number;
  rbac_enabled: boolean;
  audit_logging: boolean;
  rate_limit: {
    window_seconds: number;
    max_requests: number;
  };
}

export interface IMonitoringConfig {
  metrics_enabled: boolean;
  metrics_port: number;
  log_level: 'debug' | 'info' | 'warn' | 'error';
  distributed_tracing: boolean;
  health_check_interval_seconds: number;
}
