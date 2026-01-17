/**
 * Module 3 Phase 3.2: Intelligent Workflow Engine
 * Comprehensive Enums for AI-Powered Workflow Operations
 * 
 * This file contains all enums for intelligent workflow management,
 * AI-powered task routing, dynamic adaptation, and autonomous decision-making
 */

// ============================================================================
// INTELLIGENT TASK ROUTING ENUMS
// ============================================================================

/**
 * Intelligent routing strategies with AI-powered optimization
 */
export enum IntelligentRoutingStrategy {
  AI_OPTIMIZED = 'ai_optimized',
  SKILL_BASED_AI = 'skill_based_ai',
  PERFORMANCE_BASED_AI = 'performance_based_ai',
  LOAD_BALANCED_AI = 'load_balanced_ai',
  COST_OPTIMIZED_AI = 'cost_optimized_ai',
  PRIORITY_BASED_AI = 'priority_based_ai',
  DEADLINE_AWARE_AI = 'deadline_aware_ai',
  QUALITY_FOCUSED_AI = 'quality_focused_ai',
  RESOURCE_AWARE_AI = 'resource_aware_ai',
  PREDICTIVE_ROUTING = 'predictive_routing',
  ADAPTIVE_ROUTING = 'adaptive_routing',
  LEARNING_ROUTING = 'learning_routing',
  HYBRID_AI_ROUTING = 'hybrid_ai_routing'
}

/**
 * Task routing confidence levels for AI decisions
 */
export enum RoutingConfidenceLevel {
  VERY_LOW = 'very_low',        // 0-20%
  LOW = 'low',                  // 21-40%
  MEDIUM = 'medium',            // 41-60%
  HIGH = 'high',                // 61-80%
  VERY_HIGH = 'very_high',      // 81-95%
  CERTAIN = 'certain'           // 96-100%
}

/**
 * Resource optimization strategies
 */
export enum ResourceOptimizationStrategy {
  AI_DRIVEN = 'ai_driven',
  PREDICTIVE_SCALING = 'predictive_scaling',
  DEMAND_BASED = 'demand_based',
  COST_EFFICIENT = 'cost_efficient',
  PERFORMANCE_FOCUSED = 'performance_focused',
  BALANCED_OPTIMIZATION = 'balanced_optimization',
  REAL_TIME_ADAPTIVE = 'real_time_adaptive',
  MACHINE_LEARNING = 'machine_learning',
  PATTERN_BASED = 'pattern_based',
  WORKLOAD_AWARE = 'workload_aware'
}

/**
 * Task complexity levels for intelligent routing
 */
export enum TaskComplexityLevel {
  TRIVIAL = 'trivial',          // Simple, automated tasks
  SIMPLE = 'simple',            // Basic tasks with minimal decision-making
  MODERATE = 'moderate',        // Standard tasks requiring some analysis
  COMPLEX = 'complex',          // Advanced tasks requiring expertise
  EXPERT = 'expert',            // Highly complex tasks requiring specialized skills
  CRITICAL = 'critical'         // Mission-critical tasks requiring top expertise
}

/**
 * Skill matching algorithms for task routing
 */
export enum SkillMatchingAlgorithm {
  EXACT_MATCH = 'exact_match',
  FUZZY_MATCH = 'fuzzy_match',
  AI_SIMILARITY = 'ai_similarity',
  WEIGHTED_SCORING = 'weighted_scoring',
  MACHINE_LEARNING = 'machine_learning',
  NEURAL_NETWORK = 'neural_network',
  COLLABORATIVE_FILTERING = 'collaborative_filtering',
  CONTENT_BASED = 'content_based',
  HYBRID_MATCHING = 'hybrid_matching'
}

// ============================================================================
// WORKFLOW ADAPTATION ENUMS
// ============================================================================

/**
 * Workflow adaptation triggers
 */
export enum AdaptationTrigger {
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  RESOURCE_CONSTRAINT = 'resource_constraint',
  QUALITY_ISSUE = 'quality_issue',
  SLA_VIOLATION = 'sla_violation',
  PATTERN_CHANGE = 'pattern_change',
  LOAD_SPIKE = 'load_spike',
  ERROR_RATE_INCREASE = 'error_rate_increase',
  USER_FEEDBACK = 'user_feedback',
  SEASONAL_CHANGE = 'seasonal_change',
  BUSINESS_RULE_CHANGE = 'business_rule_change',
  EXTERNAL_FACTOR = 'external_factor',
  AI_RECOMMENDATION = 'ai_recommendation'
}

/**
 * Adaptation strategies for dynamic workflow modification
 */
export enum AdaptationStrategy {
  INCREMENTAL_CHANGE = 'incremental_change',
  RADICAL_RESTRUCTURE = 'radical_restructure',
  PARALLEL_TESTING = 'parallel_testing',
  GRADUAL_ROLLOUT = 'gradual_rollout',
  IMMEDIATE_SWITCH = 'immediate_switch',
  ROLLBACK_CAPABLE = 'rollback_capable',
  A_B_TESTING = 'a_b_testing',
  CANARY_DEPLOYMENT = 'canary_deployment',
  BLUE_GREEN = 'blue_green',
  FEATURE_TOGGLE = 'feature_toggle'
}

/**
 * Learning mechanisms for workflow adaptation
 */
export enum LearningMechanism {
  SUPERVISED_LEARNING = 'supervised_learning',
  UNSUPERVISED_LEARNING = 'unsupervised_learning',
  REINFORCEMENT_LEARNING = 'reinforcement_learning',
  DEEP_LEARNING = 'deep_learning',
  TRANSFER_LEARNING = 'transfer_learning',
  ONLINE_LEARNING = 'online_learning',
  BATCH_LEARNING = 'batch_learning',
  ACTIVE_LEARNING = 'active_learning',
  ENSEMBLE_LEARNING = 'ensemble_learning',
  FEDERATED_LEARNING = 'federated_learning'
}

/**
 * Adaptation impact levels
 */
export enum AdaptationImpactLevel {
  MINIMAL = 'minimal',          // Minor tweaks, no user impact
  LOW = 'low',                  // Small changes, minimal user impact
  MODERATE = 'moderate',        // Noticeable changes, some user impact
  HIGH = 'high',                // Significant changes, major user impact
  CRITICAL = 'critical'         // Major restructure, significant impact
}

// ============================================================================
// AUTONOMOUS DECISION-MAKING ENUMS
// ============================================================================

/**
 * Autonomous decision types
 */
export enum AutonomousDecisionType {
  TASK_ASSIGNMENT = 'task_assignment',
  RESOURCE_ALLOCATION = 'resource_allocation',
  WORKFLOW_MODIFICATION = 'workflow_modification',
  PRIORITY_ADJUSTMENT = 'priority_adjustment',
  ESCALATION_TRIGGER = 'escalation_trigger',
  QUALITY_CONTROL = 'quality_control',
  PERFORMANCE_OPTIMIZATION = 'performance_optimization',
  COST_OPTIMIZATION = 'cost_optimization',
  RISK_MITIGATION = 'risk_mitigation',
  COMPLIANCE_ENFORCEMENT = 'compliance_enforcement',
  CAPACITY_PLANNING = 'capacity_planning',
  INCIDENT_RESPONSE = 'incident_response'
}

/**
 * Decision confidence levels
 */
export enum DecisionConfidenceLevel {
  VERY_LOW = 'very_low',        // 0-20% confidence
  LOW = 'low',                  // 21-40% confidence
  MEDIUM = 'medium',            // 41-60% confidence
  HIGH = 'high',                // 61-80% confidence
  VERY_HIGH = 'very_high',      // 81-95% confidence
  CERTAIN = 'certain'           // 96-100% confidence
}

/**
 * Decision approval requirements
 */
export enum DecisionApprovalRequirement {
  AUTOMATIC = 'automatic',      // No approval needed
  NOTIFICATION = 'notification', // Notify but proceed
  SOFT_APPROVAL = 'soft_approval', // Approval preferred but not required
  HARD_APPROVAL = 'hard_approval', // Approval required before execution
  COMMITTEE_APPROVAL = 'committee_approval', // Multiple approvals required
  ESCALATED_APPROVAL = 'escalated_approval' // Senior management approval
}

/**
 * Decision execution status
 */
export enum DecisionExecutionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
  PARTIALLY_EXECUTED = 'partially_executed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

/**
 * Decision impact assessment
 */
export enum DecisionImpactLevel {
  NEGLIGIBLE = 'negligible',    // No measurable impact
  MINOR = 'minor',              // Small, localized impact
  MODERATE = 'moderate',        // Noticeable impact on operations
  MAJOR = 'major',              // Significant impact on business
  CRITICAL = 'critical'         // Business-critical impact
}

// ============================================================================
// SELF-OPTIMIZATION ENUMS
// ============================================================================

/**
 * Optimization objectives
 */
export enum OptimizationObjective {
  PERFORMANCE = 'performance',
  COST = 'cost',
  QUALITY = 'quality',
  EFFICIENCY = 'efficiency',
  THROUGHPUT = 'throughput',
  LATENCY = 'latency',
  RESOURCE_UTILIZATION = 'resource_utilization',
  USER_SATISFACTION = 'user_satisfaction',
  COMPLIANCE = 'compliance',
  RELIABILITY = 'reliability',
  SCALABILITY = 'scalability',
  MAINTAINABILITY = 'maintainability'
}

/**
 * Optimization algorithms
 */
export enum OptimizationAlgorithm {
  GENETIC_ALGORITHM = 'genetic_algorithm',
  SIMULATED_ANNEALING = 'simulated_annealing',
  PARTICLE_SWARM = 'particle_swarm',
  GRADIENT_DESCENT = 'gradient_descent',
  BAYESIAN_OPTIMIZATION = 'bayesian_optimization',
  REINFORCEMENT_LEARNING = 'reinforcement_learning',
  NEURAL_NETWORK = 'neural_network',
  RANDOM_SEARCH = 'random_search',
  GRID_SEARCH = 'grid_search',
  EVOLUTIONARY_STRATEGY = 'evolutionary_strategy'
}

/**
 * Performance measurement metrics
 */
export enum PerformanceMetric {
  EXECUTION_TIME = 'execution_time',
  THROUGHPUT = 'throughput',
  ERROR_RATE = 'error_rate',
  SUCCESS_RATE = 'success_rate',
  RESOURCE_USAGE = 'resource_usage',
  COST_PER_OPERATION = 'cost_per_operation',
  QUALITY_SCORE = 'quality_score',
  USER_SATISFACTION = 'user_satisfaction',
  SLA_COMPLIANCE = 'sla_compliance',
  AVAILABILITY = 'availability',
  SCALABILITY_INDEX = 'scalability_index',
  EFFICIENCY_RATIO = 'efficiency_ratio'
}

/**
 * Optimization frequency
 */
export enum OptimizationFrequency {
  REAL_TIME = 'real_time',      // Continuous optimization
  HOURLY = 'hourly',            // Every hour
  DAILY = 'daily',              // Once per day
  WEEKLY = 'weekly',            // Once per week
  MONTHLY = 'monthly',          // Once per month
  QUARTERLY = 'quarterly',      // Once per quarter
  ON_DEMAND = 'on_demand',      // Triggered manually
  EVENT_DRIVEN = 'event_driven', // Triggered by events
  THRESHOLD_BASED = 'threshold_based' // Triggered by thresholds
}

// ============================================================================
// AI INTELLIGENCE ENUMS
// ============================================================================

/**
 * AI model types for different workflow operations
 */
export enum AIModelType {
  DEEPSEEK_R1 = 'deepseek_r1',
  TENSORFLOW = 'tensorflow',
  PYTORCH = 'pytorch',
  SCIKIT_LEARN = 'scikit_learn',
  XGBOOST = 'xgboost',
  LIGHTGBM = 'lightgbm',
  CATBOOST = 'catboost',
  RANDOM_FOREST = 'random_forest',
  NEURAL_NETWORK = 'neural_network',
  DECISION_TREE = 'decision_tree',
  SVM = 'svm',
  ENSEMBLE = 'ensemble'
}

/**
 * AI processing modes
 */
export enum AIProcessingMode {
  REAL_TIME = 'real_time',
  BATCH = 'batch',
  STREAMING = 'streaming',
  HYBRID = 'hybrid',
  ON_DEMAND = 'on_demand',
  SCHEDULED = 'scheduled',
  EVENT_DRIVEN = 'event_driven',
  CONTINUOUS = 'continuous'
}

/**
 * AI model training status
 */
export enum AIModelTrainingStatus {
  NOT_TRAINED = 'not_trained',
  TRAINING = 'training',
  TRAINED = 'trained',
  RETRAINING = 'retraining',
  VALIDATION = 'validation',
  DEPLOYED = 'deployed',
  DEPRECATED = 'deprecated',
  FAILED = 'failed'
}

/**
 * AI prediction quality levels
 */
export enum AIPredictionQuality {
  POOR = 'poor',                // 0-40% accuracy
  FAIR = 'fair',                // 41-60% accuracy
  GOOD = 'good',                // 61-80% accuracy
  EXCELLENT = 'excellent',      // 81-95% accuracy
  OUTSTANDING = 'outstanding'   // 96-100% accuracy
}

// ============================================================================
// WORKFLOW INTELLIGENCE ENUMS
// ============================================================================

/**
 * Workflow intelligence levels
 */
export enum WorkflowIntelligenceLevel {
  BASIC = 'basic',              // Rule-based automation
  INTERMEDIATE = 'intermediate', // Pattern recognition
  ADVANCED = 'advanced',        // Machine learning
  EXPERT = 'expert',            // Deep learning
  AUTONOMOUS = 'autonomous'     // Fully autonomous
}

/**
 * Pattern recognition types
 */
export enum PatternRecognitionType {
  TEMPORAL = 'temporal',        // Time-based patterns
  BEHAVIORAL = 'behavioral',    // User behavior patterns
  OPERATIONAL = 'operational',  // Operational patterns
  SEASONAL = 'seasonal',        // Seasonal patterns
  ANOMALY = 'anomaly',          // Anomaly detection
  TREND = 'trend',              // Trend analysis
  CORRELATION = 'correlation',  // Correlation patterns
  CLUSTERING = 'clustering'     // Data clustering
}

/**
 * Learning feedback types
 */
export enum LearningFeedbackType {
  EXPLICIT = 'explicit',        // Direct user feedback
  IMPLICIT = 'implicit',        // Inferred from behavior
  OUTCOME_BASED = 'outcome_based', // Based on results
  PERFORMANCE_BASED = 'performance_based', // Based on metrics
  COMPARATIVE = 'comparative',  // Comparison with alternatives
  REINFORCEMENT = 'reinforcement' // Reinforcement signals
}

/**
 * Workflow automation levels
 */
export enum WorkflowAutomationLevel {
  MANUAL = 'manual',            // No automation
  ASSISTED = 'assisted',        // Human-assisted automation
  SEMI_AUTOMATED = 'semi_automated', // Partial automation
  HIGHLY_AUTOMATED = 'highly_automated', // Mostly automated
  FULLY_AUTOMATED = 'fully_automated', // Complete automation
  AUTONOMOUS = 'autonomous'     // Self-managing automation
}

// ============================================================================
// QUALITY AND COMPLIANCE ENUMS
// ============================================================================

/**
 * Quality assessment criteria
 */
export enum QualityAssessmentCriteria {
  ACCURACY = 'accuracy',
  COMPLETENESS = 'completeness',
  CONSISTENCY = 'consistency',
  TIMELINESS = 'timeliness',
  RELEVANCE = 'relevance',
  RELIABILITY = 'reliability',
  VALIDITY = 'validity',
  PRECISION = 'precision',
  RECALL = 'recall',
  F1_SCORE = 'f1_score'
}

/**
 * Compliance frameworks for intelligent workflows
 */
export enum ComplianceFramework {
  GDPR = 'gdpr',
  PCI_DSS = 'pci_dss',
  RBI_GUIDELINES = 'rbi_guidelines',
  SOX = 'sox',
  HIPAA = 'hipaa',
  ISO_27001 = 'iso_27001',
  SOC_2 = 'soc_2',
  NIST = 'nist',
  COBIT = 'cobit',
  ITIL = 'itil'
}

/**
 * Risk levels for autonomous decisions
 */
export enum RiskLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
  CRITICAL = 'critical'
}

// ============================================================================
// MONITORING AND ALERTING ENUMS
// ============================================================================

/**
 * Intelligent monitoring types
 */
export enum IntelligentMonitoringType {
  PREDICTIVE = 'predictive',
  REACTIVE = 'reactive',
  PROACTIVE = 'proactive',
  ADAPTIVE = 'adaptive',
  ANOMALY_BASED = 'anomaly_based',
  THRESHOLD_BASED = 'threshold_based',
  PATTERN_BASED = 'pattern_based',
  ML_BASED = 'ml_based'
}

/**
 * Alert intelligence levels
 */
export enum AlertIntelligenceLevel {
  BASIC = 'basic',              // Simple threshold alerts
  SMART = 'smart',              // Context-aware alerts
  PREDICTIVE = 'predictive',    // Predictive alerts
  ADAPTIVE = 'adaptive',        // Self-tuning alerts
  AI_POWERED = 'ai_powered'     // AI-driven alerts
}

/**
 * Escalation strategies
 */
export enum EscalationStrategy {
  IMMEDIATE = 'immediate',
  GRADUAL = 'gradual',
  INTELLIGENT = 'intelligent',
  CONTEXT_AWARE = 'context_aware',
  PRIORITY_BASED = 'priority_based',
  SKILL_BASED = 'skill_based',
  AVAILABILITY_BASED = 'availability_based',
  WORKLOAD_BASED = 'workload_based'
}

// ============================================================================
// INTEGRATION AND COMMUNICATION ENUMS
// ============================================================================

/**
 * Integration intelligence levels
 */
export enum IntegrationIntelligenceLevel {
  STATIC = 'static',            // Fixed integration rules
  DYNAMIC = 'dynamic',          // Adaptive integration
  INTELLIGENT = 'intelligent',  // AI-driven integration
  AUTONOMOUS = 'autonomous'     // Self-managing integration
}

/**
 * Communication protocols for intelligent workflows
 */
export enum CommunicationProtocol {
  REST_API = 'rest_api',
  GRAPHQL = 'graphql',
  GRPC = 'grpc',
  WEBSOCKET = 'websocket',
  MESSAGE_QUEUE = 'message_queue',
  EVENT_STREAM = 'event_stream',
  WEBHOOK = 'webhook',
  RPC = 'rpc'
}

/**
 * Data synchronization strategies
 */
export enum DataSyncStrategy {
  REAL_TIME = 'real_time',
  NEAR_REAL_TIME = 'near_real_time',
  BATCH = 'batch',
  INCREMENTAL = 'incremental',
  FULL_SYNC = 'full_sync',
  DELTA_SYNC = 'delta_sync',
  EVENT_DRIVEN = 'event_driven',
  SCHEDULED = 'scheduled'
}

// Export all enums for use throughout the application
export {
  // Add any additional exports here
};

