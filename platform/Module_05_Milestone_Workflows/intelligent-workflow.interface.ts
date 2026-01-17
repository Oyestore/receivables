/**
 * Module 3 Phase 3.2: Intelligent Workflow Engine
 * Comprehensive Interfaces for AI-Powered Workflow Operations
 * 
 * This file contains all interfaces for intelligent workflow management,
 * AI-powered task routing, dynamic adaptation, and autonomous decision-making
 */

import {
  IntelligentRoutingStrategy,
  RoutingConfidenceLevel,
  ResourceOptimizationStrategy,
  TaskComplexityLevel,
  SkillMatchingAlgorithm,
  AdaptationTrigger,
  AdaptationStrategy,
  LearningMechanism,
  AdaptationImpactLevel,
  AutonomousDecisionType,
  DecisionConfidenceLevel,
  DecisionApprovalRequirement,
  DecisionExecutionStatus,
  DecisionImpactLevel,
  OptimizationObjective,
  OptimizationAlgorithm,
  PerformanceMetric,
  OptimizationFrequency,
  AIModelType,
  AIProcessingMode,
  AIModelTrainingStatus,
  AIPredictionQuality,
  WorkflowIntelligenceLevel,
  PatternRecognitionType,
  LearningFeedbackType,
  WorkflowAutomationLevel,
  QualityAssessmentCriteria,
  ComplianceFramework,
  RiskLevel,
  IntelligentMonitoringType,
  AlertIntelligenceLevel,
  EscalationStrategy
} from '../enums/intelligent-workflow.enum';

// ============================================================================
// CORE INTELLIGENT WORKFLOW INTERFACES
// ============================================================================

/**
 * Base interface for all intelligent workflow entities
 */
export interface IIntelligentWorkflowEntity {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  version: string;
  isActive: boolean;
  intelligenceLevel: WorkflowIntelligenceLevel;
  automationLevel: WorkflowAutomationLevel;
  aiConfiguration: IAIConfiguration;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

/**
 * AI Configuration for intelligent workflow operations
 */
export interface IAIConfiguration {
  primaryModel: AIModelType;
  fallbackModels: AIModelType[];
  processingMode: AIProcessingMode;
  confidenceThreshold: number;
  learningEnabled: boolean;
  adaptationEnabled: boolean;
  autonomousDecisionEnabled: boolean;
  humanOversightRequired: boolean;
  modelParameters: Record<string, any>;
  trainingConfiguration: IModelTrainingConfiguration;
  performanceTargets: IPerformanceTargets;
}

/**
 * Model training configuration
 */
export interface IModelTrainingConfiguration {
  trainingDataSources: string[];
  trainingFrequency: OptimizationFrequency;
  validationSplit: number;
  testSplit: number;
  hyperparameters: Record<string, any>;
  earlyStoppingEnabled: boolean;
  crossValidationFolds: number;
  featureSelection: IFeatureSelectionConfig;
  modelEvaluation: IModelEvaluationConfig;
}

/**
 * Feature selection configuration
 */
export interface IFeatureSelectionConfig {
  method: string;
  maxFeatures: number;
  importanceThreshold: number;
  correlationThreshold: number;
  varianceThreshold: number;
  customSelectors: string[];
}

/**
 * Model evaluation configuration
 */
export interface IModelEvaluationConfig {
  metrics: PerformanceMetric[];
  validationMethods: string[];
  benchmarkDatasets: string[];
  performanceThresholds: Record<PerformanceMetric, number>;
  comparisonModels: AIModelType[];
}

/**
 * Performance targets for AI operations
 */
export interface IPerformanceTargets {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  responseTime: number;
  throughput: number;
  resourceUtilization: number;
  costPerOperation: number;
  qualityScore: number;
  userSatisfaction: number;
}

// ============================================================================
// INTELLIGENT TASK ROUTING INTERFACES
// ============================================================================

/**
 * Intelligent task routing configuration
 */
export interface IIntelligentTaskRoutingConfig {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  routingStrategy: IntelligentRoutingStrategy;
  skillMatchingAlgorithm: SkillMatchingAlgorithm;
  confidenceThreshold: number;
  fallbackStrategy: IntelligentRoutingStrategy;
  resourceOptimization: IResourceOptimizationConfig;
  performanceWeights: IPerformanceWeights;
  constraints: IRoutingConstraints;
  learningConfiguration: ILearningConfiguration;
  monitoringConfiguration: IMonitoringConfiguration;
}

/**
 * Resource optimization configuration
 */
export interface IResourceOptimizationConfig {
  strategy: ResourceOptimizationStrategy;
  objectives: OptimizationObjective[];
  constraints: IResourceConstraints;
  scalingPolicies: IScalingPolicies;
  costOptimization: ICostOptimizationConfig;
  performanceOptimization: IPerformanceOptimizationConfig;
  qualityOptimization: IQualityOptimizationConfig;
}

/**
 * Resource constraints for optimization
 */
export interface IResourceConstraints {
  maxCpuUtilization: number;
  maxMemoryUtilization: number;
  maxStorageUtilization: number;
  maxNetworkUtilization: number;
  maxConcurrentTasks: number;
  maxQueueLength: number;
  maxWaitTime: number;
  budgetConstraints: IBudgetConstraints;
  complianceConstraints: IComplianceConstraints;
}

/**
 * Budget constraints for resource optimization
 */
export interface IBudgetConstraints {
  maxHourlyCost: number;
  maxDailyCost: number;
  maxMonthlyCost: number;
  costPerOperation: number;
  costPerResource: Record<string, number>;
  budgetAlerts: IBudgetAlerts;
}

/**
 * Budget alerts configuration
 */
export interface IBudgetAlerts {
  warningThreshold: number;
  criticalThreshold: number;
  notificationChannels: string[];
  escalationProcedure: string[];
  automaticActions: string[];
}

/**
 * Compliance constraints for routing
 */
export interface IComplianceConstraints {
  frameworks: ComplianceFramework[];
  dataResidencyRequirements: string[];
  accessControlRequirements: string[];
  auditRequirements: string[];
  encryptionRequirements: string[];
  retentionRequirements: string[];
}

/**
 * Scaling policies for resource optimization
 */
export interface IScalingPolicies {
  autoScalingEnabled: boolean;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  minInstances: number;
  maxInstances: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
  predictiveScaling: IPredictiveScalingConfig;
}

/**
 * Predictive scaling configuration
 */
export interface IPredictiveScalingConfig {
  enabled: boolean;
  predictionHorizon: number;
  confidenceThreshold: number;
  historicalDataPeriod: number;
  seasonalityDetection: boolean;
  trendAnalysis: boolean;
  anomalyDetection: boolean;
}

/**
 * Performance weights for routing decisions
 */
export interface IPerformanceWeights {
  speed: number;
  quality: number;
  cost: number;
  reliability: number;
  expertise: number;
  availability: number;
  workload: number;
  historicalPerformance: number;
  userPreference: number;
  businessPriority: number;
}

/**
 * Routing constraints
 */
export interface IRoutingConstraints {
  maxRoutingTime: number;
  maxRetries: number;
  blacklistedResources: string[];
  whitelistedResources: string[];
  geographicConstraints: string[];
  timeConstraints: ITimeConstraints;
  skillRequirements: ISkillRequirements;
  securityRequirements: ISecurityRequirements;
}

/**
 * Time constraints for task routing
 */
export interface ITimeConstraints {
  businessHoursOnly: boolean;
  timeZonePreferences: string[];
  excludedDates: Date[];
  urgencyLevels: Record<string, number>;
  deadlineRequirements: IDeadlineRequirements;
}

/**
 * Deadline requirements
 */
export interface IDeadlineRequirements {
  hardDeadlines: boolean;
  softDeadlines: boolean;
  escalationOnDelay: boolean;
  penaltyForDelay: number;
  bonusForEarlyCompletion: number;
}

/**
 * Skill requirements for task routing
 */
export interface ISkillRequirements {
  requiredSkills: ISkill[];
  preferredSkills: ISkill[];
  minimumExperienceLevel: number;
  certificationRequirements: string[];
  languageRequirements: string[];
  domainExpertise: string[];
}

/**
 * Skill definition
 */
export interface ISkill {
  name: string;
  level: number;
  category: string;
  importance: number;
  verificationRequired: boolean;
  expirationDate?: Date;
}

/**
 * Security requirements for routing
 */
export interface ISecurityRequirements {
  clearanceLevel: string;
  accessPermissions: string[];
  dataClassification: string;
  encryptionRequired: boolean;
  auditingRequired: boolean;
  complianceFrameworks: ComplianceFramework[];
}

/**
 * Learning configuration for intelligent routing
 */
export interface ILearningConfiguration {
  learningEnabled: boolean;
  learningMechanisms: LearningMechanism[];
  feedbackTypes: LearningFeedbackType[];
  learningRate: number;
  adaptationRate: number;
  memorySize: number;
  forgettingFactor: number;
  explorationRate: number;
  exploitationRate: number;
  rewardFunction: IRewardFunction;
}

/**
 * Reward function for reinforcement learning
 */
export interface IRewardFunction {
  successReward: number;
  failureReward: number;
  timeReward: number;
  qualityReward: number;
  costReward: number;
  userSatisfactionReward: number;
  customRewards: Record<string, number>;
}

/**
 * Task routing decision
 */
export interface ITaskRoutingDecision {
  taskId: string;
  routingStrategy: IntelligentRoutingStrategy;
  selectedResource: string;
  confidence: RoutingConfidenceLevel;
  confidenceScore: number;
  reasoning: string[];
  alternativeOptions: IRoutingOption[];
  estimatedPerformance: IEstimatedPerformance;
  riskAssessment: IRiskAssessment;
  decisionTimestamp: Date;
  executionPlan: IExecutionPlan;
}

/**
 * Routing option for alternative choices
 */
export interface IRoutingOption {
  resourceId: string;
  confidence: number;
  estimatedPerformance: IEstimatedPerformance;
  cost: number;
  availability: Date;
  reasoning: string[];
}

/**
 * Estimated performance for routing decisions
 */
export interface IEstimatedPerformance {
  executionTime: number;
  successProbability: number;
  qualityScore: number;
  cost: number;
  resourceUtilization: number;
  userSatisfaction: number;
  riskLevel: RiskLevel;
}

/**
 * Risk assessment for routing decisions
 */
export interface IRiskAssessment {
  overallRisk: RiskLevel;
  riskFactors: IRiskFactor[];
  mitigationStrategies: string[];
  contingencyPlans: string[];
  monitoringRequirements: string[];
}

/**
 * Risk factor definition
 */
export interface IRiskFactor {
  type: string;
  severity: RiskLevel;
  probability: number;
  impact: number;
  description: string;
  mitigationActions: string[];
}

/**
 * Execution plan for task routing
 */
export interface IExecutionPlan {
  steps: IExecutionStep[];
  dependencies: string[];
  prerequisites: string[];
  estimatedDuration: number;
  checkpoints: ICheckpoint[];
  rollbackPlan: IRollbackPlan;
}

/**
 * Execution step definition
 */
export interface IExecutionStep {
  id: string;
  name: string;
  description: string;
  order: number;
  estimatedDuration: number;
  dependencies: string[];
  resources: string[];
  validationCriteria: string[];
}

/**
 * Checkpoint for execution monitoring
 */
export interface ICheckpoint {
  id: string;
  name: string;
  description: string;
  criteria: string[];
  actions: string[];
  escalationProcedure: string[];
}

/**
 * Rollback plan for execution failures
 */
export interface IRollbackPlan {
  enabled: boolean;
  triggers: string[];
  steps: IExecutionStep[];
  dataRecovery: string[];
  notificationProcedure: string[];
}

// ============================================================================
// WORKFLOW ADAPTATION INTERFACES
// ============================================================================

/**
 * Workflow adaptation configuration
 */
export interface IWorkflowAdaptationConfig {
  id: string;
  tenantId: string;
  workflowId: string;
  adaptationEnabled: boolean;
  adaptationTriggers: AdaptationTrigger[];
  adaptationStrategies: AdaptationStrategy[];
  learningMechanisms: LearningMechanism[];
  adaptationThresholds: IAdaptationThresholds;
  impactAssessment: IImpactAssessmentConfig;
  approvalWorkflow: IApprovalWorkflowConfig;
  rollbackConfiguration: IRollbackConfiguration;
  monitoringConfiguration: IAdaptationMonitoringConfig;
}

/**
 * Adaptation thresholds for triggering changes
 */
export interface IAdaptationThresholds {
  performanceDegradation: number;
  errorRateIncrease: number;
  resourceUtilizationThreshold: number;
  qualityScoreDecrease: number;
  userSatisfactionDecrease: number;
  costIncreaseThreshold: number;
  slaViolationThreshold: number;
  customThresholds: Record<string, number>;
}

/**
 * Impact assessment configuration
 */
export interface IImpactAssessmentConfig {
  assessmentEnabled: boolean;
  impactCategories: string[];
  assessmentCriteria: IAssessmentCriteria[];
  stakeholderAnalysis: IStakeholderAnalysis;
  riskAnalysis: IRiskAnalysisConfig;
  benefitAnalysis: IBenefitAnalysisConfig;
  costAnalysis: ICostAnalysisConfig;
}

/**
 * Assessment criteria for impact analysis
 */
export interface IAssessmentCriteria {
  category: string;
  weight: number;
  metrics: string[];
  thresholds: Record<string, number>;
  evaluationMethod: string;
}

/**
 * Stakeholder analysis configuration
 */
export interface IStakeholderAnalysis {
  stakeholderGroups: IStakeholderGroup[];
  impactMatrix: Record<string, Record<string, number>>;
  communicationPlan: ICommunicationPlan;
  feedbackMechanisms: string[];
}

/**
 * Stakeholder group definition
 */
export interface IStakeholderGroup {
  id: string;
  name: string;
  description: string;
  influence: number;
  interest: number;
  impactLevel: AdaptationImpactLevel;
  communicationPreferences: string[];
}

/**
 * Communication plan for adaptations
 */
export interface ICommunicationPlan {
  preAdaptationNotification: boolean;
  duringAdaptationUpdates: boolean;
  postAdaptationReport: boolean;
  channels: string[];
  frequency: string;
  templates: Record<string, string>;
}

/**
 * Risk analysis configuration
 */
export interface IRiskAnalysisConfig {
  riskCategories: string[];
  riskAssessmentMethods: string[];
  riskTolerance: Record<string, number>;
  mitigationStrategies: Record<string, string[]>;
  contingencyPlans: Record<string, string[]>;
}

/**
 * Benefit analysis configuration
 */
export interface IBenefitAnalysisConfig {
  benefitCategories: string[];
  quantificationMethods: string[];
  timeHorizon: number;
  discountRate: number;
  benefitMetrics: string[];
}

/**
 * Cost analysis configuration
 */
export interface ICostAnalysisConfig {
  costCategories: string[];
  costingMethods: string[];
  timeHorizon: number;
  costMetrics: string[];
  budgetConstraints: IBudgetConstraints;
}

/**
 * Approval workflow configuration
 */
export interface IApprovalWorkflowConfig {
  approvalRequired: boolean;
  approvalLevels: IApprovalLevel[];
  escalationProcedure: IEscalationProcedure;
  timeoutHandling: ITimeoutHandling;
  delegationRules: IDelegationRules;
}

/**
 * Approval level definition
 */
export interface IApprovalLevel {
  level: number;
  name: string;
  description: string;
  approvers: string[];
  requiredApprovals: number;
  impactThreshold: AdaptationImpactLevel;
  timeLimit: number;
  escalationTrigger: string[];
}

/**
 * Escalation procedure for approvals
 */
export interface IEscalationProcedure {
  escalationLevels: IEscalationLevel[];
  automaticEscalation: boolean;
  escalationCriteria: string[];
  notificationChannels: string[];
}

/**
 * Escalation level definition
 */
export interface IEscalationLevel {
  level: number;
  escalationTo: string[];
  timeThreshold: number;
  actions: string[];
  notificationTemplate: string;
}

/**
 * Timeout handling configuration
 */
export interface ITimeoutHandling {
  defaultAction: string;
  timeoutPeriod: number;
  reminderSchedule: number[];
  automaticApproval: boolean;
  escalationOnTimeout: boolean;
}

/**
 * Delegation rules for approvals
 */
export interface IDelegationRules {
  delegationAllowed: boolean;
  delegationCriteria: string[];
  delegationLimits: Record<string, number>;
  delegationTracking: boolean;
}

/**
 * Rollback configuration for adaptations
 */
export interface IRollbackConfiguration {
  rollbackEnabled: boolean;
  automaticRollback: boolean;
  rollbackTriggers: string[];
  rollbackProcedure: IRollbackProcedure;
  dataBackup: IDataBackupConfig;
  rollbackValidation: IRollbackValidation;
}

/**
 * Rollback procedure definition
 */
export interface IRollbackProcedure {
  steps: IExecutionStep[];
  validationPoints: ICheckpoint[];
  rollbackTimeLimit: number;
  partialRollbackAllowed: boolean;
  rollbackNotification: string[];
}

/**
 * Data backup configuration
 */
export interface IDataBackupConfig {
  backupEnabled: boolean;
  backupFrequency: string;
  backupRetention: number;
  backupValidation: boolean;
  backupEncryption: boolean;
  backupLocation: string[];
}

/**
 * Rollback validation configuration
 */
export interface IRollbackValidation {
  validationEnabled: boolean;
  validationCriteria: string[];
  validationTimeout: number;
  validationFailureAction: string;
  postRollbackTesting: boolean;
}

/**
 * Adaptation monitoring configuration
 */
export interface IAdaptationMonitoringConfig {
  monitoringEnabled: boolean;
  monitoringMetrics: string[];
  monitoringFrequency: string;
  alertingConfiguration: IAlertingConfiguration;
  reportingConfiguration: IReportingConfiguration;
  dashboardConfiguration: IDashboardConfiguration;
}

/**
 * Alerting configuration for adaptations
 */
export interface IAlertingConfiguration {
  alertingEnabled: boolean;
  alertTypes: string[];
  alertThresholds: Record<string, number>;
  alertChannels: string[];
  escalationStrategy: EscalationStrategy;
  alertSuppression: IAlertSuppression;
}

/**
 * Alert suppression configuration
 */
export interface IAlertSuppression {
  suppressionEnabled: boolean;
  suppressionRules: ISuppressionRule[];
  suppressionDuration: number;
  suppressionCriteria: string[];
}

/**
 * Suppression rule definition
 */
export interface ISuppressionRule {
  id: string;
  name: string;
  conditions: string[];
  duration: number;
  scope: string[];
  priority: number;
}

/**
 * Reporting configuration for adaptations
 */
export interface IReportingConfiguration {
  reportingEnabled: boolean;
  reportTypes: string[];
  reportFrequency: string;
  reportRecipients: string[];
  reportTemplates: Record<string, string>;
  reportDelivery: IReportDelivery;
}

/**
 * Report delivery configuration
 */
export interface IReportDelivery {
  deliveryChannels: string[];
  deliverySchedule: string;
  deliveryFormat: string[];
  deliveryRetention: number;
  deliveryEncryption: boolean;
}

/**
 * Dashboard configuration for adaptations
 */
export interface IDashboardConfiguration {
  dashboardEnabled: boolean;
  dashboardTypes: string[];
  refreshFrequency: string;
  userAccess: Record<string, string[]>;
  customizations: Record<string, any>;
}

// ============================================================================
// AUTONOMOUS DECISION-MAKING INTERFACES
// ============================================================================

/**
 * Autonomous decision configuration
 */
export interface IAutonomousDecisionConfig {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  decisionType: AutonomousDecisionType;
  autonomyLevel: WorkflowAutomationLevel;
  confidenceThreshold: DecisionConfidenceLevel;
  approvalRequirement: DecisionApprovalRequirement;
  riskTolerance: RiskLevel;
  decisionCriteria: IDecisionCriteria;
  decisionAlgorithm: IDecisionAlgorithm;
  safetyMechanisms: ISafetyMechanisms;
  learningConfiguration: IDecisionLearningConfig;
  monitoringConfiguration: IDecisionMonitoringConfig;
}

/**
 * Decision criteria for autonomous decisions
 */
export interface IDecisionCriteria {
  primaryCriteria: ICriterion[];
  secondaryCriteria: ICriterion[];
  weights: Record<string, number>;
  constraints: IDecisionConstraints;
  objectives: IDecisionObjectives;
  preferences: IDecisionPreferences;
}

/**
 * Criterion definition for decisions
 */
export interface ICriterion {
  id: string;
  name: string;
  description: string;
  type: string;
  weight: number;
  threshold: number;
  evaluationMethod: string;
  dataSource: string;
  validationRules: string[];
}

/**
 * Decision constraints
 */
export interface IDecisionConstraints {
  hardConstraints: IConstraint[];
  softConstraints: IConstraint[];
  businessRules: IBusinessRule[];
  complianceRequirements: IComplianceRequirement[];
  resourceLimitations: IResourceLimitation[];
}

/**
 * Constraint definition
 */
export interface IConstraint {
  id: string;
  name: string;
  description: string;
  type: string;
  condition: string;
  value: any;
  priority: number;
  violationAction: string;
}

/**
 * Business rule definition
 */
export interface IBusinessRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: string;
  priority: number;
  effectiveDate: Date;
  expirationDate?: Date;
}

/**
 * Compliance requirement definition
 */
export interface IComplianceRequirement {
  framework: ComplianceFramework;
  requirement: string;
  description: string;
  mandatory: boolean;
  validationMethod: string;
  evidence: string[];
}

/**
 * Resource limitation definition
 */
export interface IResourceLimitation {
  resourceType: string;
  maxUtilization: number;
  maxCost: number;
  availability: string;
  constraints: string[];
}

/**
 * Decision objectives
 */
export interface IDecisionObjectives {
  primaryObjectives: IObjective[];
  secondaryObjectives: IObjective[];
  conflictResolution: IConflictResolution;
  optimizationStrategy: OptimizationAlgorithm;
}

/**
 * Objective definition
 */
export interface IObjective {
  id: string;
  name: string;
  description: string;
  type: string;
  target: number;
  weight: number;
  measurementMethod: string;
  optimizationDirection: 'maximize' | 'minimize';
}

/**
 * Conflict resolution configuration
 */
export interface IConflictResolution {
  resolutionStrategy: string;
  priorityMatrix: Record<string, Record<string, number>>;
  escalationProcedure: string[];
  humanIntervention: boolean;
}

/**
 * Decision preferences
 */
export interface IDecisionPreferences {
  riskPreference: string;
  timePreference: string;
  qualityPreference: string;
  costPreference: string;
  userPreferences: Record<string, any>;
  contextualPreferences: Record<string, any>;
}

/**
 * Decision algorithm configuration
 */
export interface IDecisionAlgorithm {
  algorithmType: string;
  algorithmParameters: Record<string, any>;
  ensembleMethods: string[];
  votingStrategy: string;
  confidenceCalculation: IConfidenceCalculation;
  uncertaintyHandling: IUncertaintyHandling;
}

/**
 * Confidence calculation configuration
 */
export interface IConfidenceCalculation {
  method: string;
  factors: string[];
  weights: Record<string, number>;
  calibration: IConfidenceCalibration;
  validation: IConfidenceValidation;
}

/**
 * Confidence calibration configuration
 */
export interface IConfidenceCalibration {
  calibrationEnabled: boolean;
  calibrationMethod: string;
  calibrationData: string;
  recalibrationFrequency: string;
}

/**
 * Confidence validation configuration
 */
export interface IConfidenceValidation {
  validationEnabled: boolean;
  validationMethods: string[];
  validationThresholds: Record<string, number>;
  validationActions: Record<string, string>;
}

/**
 * Uncertainty handling configuration
 */
export interface IUncertaintyHandling {
  uncertaintyTypes: string[];
  handlingStrategies: Record<string, string>;
  uncertaintyThresholds: Record<string, number>;
  escalationProcedures: Record<string, string[]>;
}

/**
 * Safety mechanisms for autonomous decisions
 */
export interface ISafetyMechanisms {
  safetyChecks: ISafetyCheck[];
  killSwitches: IKillSwitch[];
  humanOversight: IHumanOversight;
  auditTrail: IAuditTrailConfig;
  emergencyProcedures: IEmergencyProcedures;
}

/**
 * Safety check definition
 */
export interface ISafetyCheck {
  id: string;
  name: string;
  description: string;
  checkType: string;
  frequency: string;
  criteria: string[];
  actions: string[];
  escalation: string[];
}

/**
 * Kill switch configuration
 */
export interface IKillSwitch {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  actions: string[];
  authorization: string[];
  notification: string[];
}

/**
 * Human oversight configuration
 */
export interface IHumanOversight {
  oversightRequired: boolean;
  oversightLevel: string;
  oversightTriggers: string[];
  oversightPersonnel: string[];
  oversightProcedures: string[];
  escalationMatrix: Record<string, string[]>;
}

/**
 * Audit trail configuration
 */
export interface IAuditTrailConfig {
  auditingEnabled: boolean;
  auditLevel: string;
  auditEvents: string[];
  auditRetention: number;
  auditEncryption: boolean;
  auditValidation: boolean;
}

/**
 * Emergency procedures configuration
 */
export interface IEmergencyProcedures {
  emergencyContacts: string[];
  emergencyActions: string[];
  emergencyEscalation: string[];
  emergencyNotification: string[];
  emergencyRecovery: string[];
}

/**
 * Decision learning configuration
 */
export interface IDecisionLearningConfig {
  learningEnabled: boolean;
  learningMethods: LearningMechanism[];
  feedbackSources: string[];
  learningRate: number;
  adaptationRate: number;
  memoryConfiguration: IMemoryConfiguration;
  experienceReplay: IExperienceReplay;
}

/**
 * Memory configuration for decision learning
 */
export interface IMemoryConfiguration {
  memorySize: number;
  memoryTypes: string[];
  forgettingStrategy: string;
  memoryConsolidation: boolean;
  memoryRetrieval: IMemoryRetrieval;
}

/**
 * Memory retrieval configuration
 */
export interface IMemoryRetrieval {
  retrievalStrategy: string;
  similarityThreshold: number;
  contextMatching: boolean;
  temporalWeighting: boolean;
}

/**
 * Experience replay configuration
 */
export interface IExperienceReplay {
  replayEnabled: boolean;
  replayFrequency: string;
  replayBatchSize: number;
  replayStrategy: string;
  prioritizedReplay: boolean;
}

/**
 * Decision monitoring configuration
 */
export interface IDecisionMonitoringConfig {
  monitoringEnabled: boolean;
  monitoringMetrics: string[];
  monitoringFrequency: string;
  performanceTracking: IPerformanceTracking;
  outcomeAnalysis: IOutcomeAnalysis;
  feedbackCollection: IFeedbackCollection;
}

/**
 * Performance tracking for decisions
 */
export interface IPerformanceTracking {
  trackingEnabled: boolean;
  trackingMetrics: PerformanceMetric[];
  trackingFrequency: string;
  benchmarking: IBenchmarking;
  trendAnalysis: ITrendAnalysis;
}

/**
 * Benchmarking configuration
 */
export interface IBenchmarking {
  benchmarkingEnabled: boolean;
  benchmarkSources: string[];
  benchmarkMetrics: string[];
  benchmarkFrequency: string;
  benchmarkReporting: boolean;
}

/**
 * Trend analysis configuration
 */
export interface ITrendAnalysis {
  analysisEnabled: boolean;
  analysisWindow: number;
  trendDetection: boolean;
  seasonalityDetection: boolean;
  anomalyDetection: boolean;
}

/**
 * Outcome analysis configuration
 */
export interface IOutcomeAnalysis {
  analysisEnabled: boolean;
  analysisMetrics: string[];
  analysisFrequency: string;
  causalAnalysis: ICausalAnalysis;
  impactAssessment: IOutcomeImpactAssessment;
}

/**
 * Causal analysis configuration
 */
export interface ICausalAnalysis {
  analysisEnabled: boolean;
  analysisMethod: string;
  causalFactors: string[];
  confoundingVariables: string[];
  validationMethod: string;
}

/**
 * Outcome impact assessment
 */
export interface IOutcomeImpactAssessment {
  assessmentEnabled: boolean;
  impactCategories: string[];
  assessmentMethods: string[];
  stakeholderImpact: boolean;
  businessImpact: boolean;
}

/**
 * Feedback collection configuration
 */
export interface IFeedbackCollection {
  collectionEnabled: boolean;
  feedbackSources: string[];
  feedbackTypes: LearningFeedbackType[];
  collectionMethods: string[];
  feedbackProcessing: IFeedbackProcessing;
}

/**
 * Feedback processing configuration
 */
export interface IFeedbackProcessing {
  processingEnabled: boolean;
  processingMethods: string[];
  qualityFiltering: boolean;
  sentimentAnalysis: boolean;
  feedbackAggregation: boolean;
}

// ============================================================================
// SELF-OPTIMIZATION INTERFACES
// ============================================================================

/**
 * Self-optimization configuration
 */
export interface ISelfOptimizationConfig {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  optimizationEnabled: boolean;
  optimizationObjectives: OptimizationObjective[];
  optimizationAlgorithms: OptimizationAlgorithm[];
  optimizationFrequency: OptimizationFrequency;
  performanceTargets: IOptimizationTargets;
  optimizationConstraints: IOptimizationConstraints;
  optimizationStrategy: IOptimizationStrategy;
  monitoringConfiguration: IOptimizationMonitoringConfig;
}

/**
 * Optimization targets
 */
export interface IOptimizationTargets {
  performanceTargets: Record<PerformanceMetric, number>;
  improvementTargets: Record<string, number>;
  efficiencyTargets: Record<string, number>;
  qualityTargets: Record<string, number>;
  costTargets: Record<string, number>;
  timeTargets: Record<string, number>;
}

/**
 * Optimization constraints
 */
export interface IOptimizationConstraints {
  resourceConstraints: IResourceConstraints;
  performanceConstraints: Record<PerformanceMetric, number>;
  qualityConstraints: Record<QualityAssessmentCriteria, number>;
  costConstraints: IBudgetConstraints;
  timeConstraints: ITimeConstraints;
  complianceConstraints: IComplianceConstraints;
}

/**
 * Optimization strategy
 */
export interface IOptimizationStrategy {
  strategyType: string;
  algorithmSelection: IAlgorithmSelection;
  parameterTuning: IParameterTuning;
  multiObjectiveOptimization: IMultiObjectiveOptimization;
  constraintHandling: IConstraintHandling;
  convergenceCriteria: IConvergenceCriteria;
}

/**
 * Algorithm selection configuration
 */
export interface IAlgorithmSelection {
  selectionMethod: string;
  candidateAlgorithms: OptimizationAlgorithm[];
  selectionCriteria: string[];
  performanceComparison: boolean;
  adaptiveSelection: boolean;
}

/**
 * Parameter tuning configuration
 */
export interface IParameterTuning {
  tuningEnabled: boolean;
  tuningMethod: string;
  parameterSpace: Record<string, any>;
  tuningBudget: number;
  validationMethod: string;
}

/**
 * Multi-objective optimization configuration
 */
export interface IMultiObjectiveOptimization {
  enabled: boolean;
  objectives: IObjective[];
  weightingStrategy: string;
  paretoOptimization: boolean;
  tradeoffAnalysis: boolean;
}

/**
 * Constraint handling configuration
 */
export interface IConstraintHandling {
  handlingMethod: string;
  penaltyFunctions: Record<string, string>;
  constraintRelaxation: boolean;
  feasibilityCheck: boolean;
}

/**
 * Convergence criteria configuration
 */
export interface IConvergenceCriteria {
  maxIterations: number;
  toleranceThreshold: number;
  improvementThreshold: number;
  stabilityWindow: number;
  earlyStoppingEnabled: boolean;
}

/**
 * Optimization monitoring configuration
 */
export interface IOptimizationMonitoringConfig {
  monitoringEnabled: boolean;
  monitoringMetrics: PerformanceMetric[];
  monitoringFrequency: string;
  progressTracking: IProgressTracking;
  resultAnalysis: IResultAnalysis;
  reportGeneration: IReportGeneration;
}

/**
 * Progress tracking configuration
 */
export interface IProgressTracking {
  trackingEnabled: boolean;
  trackingInterval: number;
  progressMetrics: string[];
  milestoneTracking: boolean;
  visualizationEnabled: boolean;
}

/**
 * Result analysis configuration
 */
export interface IResultAnalysis {
  analysisEnabled: boolean;
  analysisTypes: string[];
  statisticalAnalysis: boolean;
  sensitivityAnalysis: boolean;
  robustnessAnalysis: boolean;
}

/**
 * Report generation configuration
 */
export interface IReportGeneration {
  reportingEnabled: boolean;
  reportTypes: string[];
  reportFrequency: string;
  reportRecipients: string[];
  reportFormat: string[];
}

// ============================================================================
// MONITORING AND ANALYTICS INTERFACES
// ============================================================================

/**
 * Monitoring configuration for intelligent workflows
 */
export interface IMonitoringConfiguration {
  monitoringEnabled: boolean;
  monitoringTypes: IntelligentMonitoringType[];
  monitoringFrequency: string;
  metricsCollection: IMetricsCollection;
  alertConfiguration: IIntelligentAlertConfig;
  dashboardConfiguration: IDashboardConfiguration;
  analyticsConfiguration: IAnalyticsConfiguration;
}

/**
 * Metrics collection configuration
 */
export interface IMetricsCollection {
  collectionEnabled: boolean;
  collectionInterval: number;
  metricsTypes: PerformanceMetric[];
  dataRetention: number;
  dataAggregation: IDataAggregation;
  dataQuality: IDataQuality;
}

/**
 * Data aggregation configuration
 */
export interface IDataAggregation {
  aggregationEnabled: boolean;
  aggregationMethods: string[];
  aggregationWindows: number[];
  realTimeAggregation: boolean;
  batchAggregation: boolean;
}

/**
 * Data quality configuration
 */
export interface IDataQuality {
  qualityChecks: string[];
  qualityThresholds: Record<string, number>;
  qualityActions: Record<string, string>;
  qualityReporting: boolean;
}

/**
 * Intelligent alert configuration
 */
export interface IIntelligentAlertConfig {
  alertingEnabled: boolean;
  intelligenceLevel: AlertIntelligenceLevel;
  alertTypes: string[];
  alertThresholds: Record<string, number>;
  alertChannels: string[];
  alertEscalation: IAlertEscalation;
  alertSuppression: IAlertSuppression;
}

/**
 * Alert escalation configuration
 */
export interface IAlertEscalation {
  escalationEnabled: boolean;
  escalationStrategy: EscalationStrategy;
  escalationLevels: IEscalationLevel[];
  escalationCriteria: string[];
  escalationActions: string[];
}

/**
 * Analytics configuration
 */
export interface IAnalyticsConfiguration {
  analyticsEnabled: boolean;
  analyticsTypes: string[];
  analyticsFrequency: string;
  predictiveAnalytics: IPredictiveAnalytics;
  descriptiveAnalytics: IDescriptiveAnalytics;
  prescriptiveAnalytics: IPrescriptiveAnalytics;
}

/**
 * Predictive analytics configuration
 */
export interface IPredictiveAnalytics {
  predictionEnabled: boolean;
  predictionModels: AIModelType[];
  predictionHorizon: number;
  predictionAccuracy: number;
  predictionValidation: boolean;
}

/**
 * Descriptive analytics configuration
 */
export interface IDescriptiveAnalytics {
  analysisEnabled: boolean;
  analysisTypes: string[];
  visualizationTypes: string[];
  reportGeneration: boolean;
  trendAnalysis: boolean;
}

/**
 * Prescriptive analytics configuration
 */
export interface IPrescriptiveAnalytics {
  recommendationEnabled: boolean;
  recommendationTypes: string[];
  optimizationSuggestions: boolean;
  actionableInsights: boolean;
  decisionSupport: boolean;
}

// Export all interfaces
export {
  // Add any additional exports here
};

