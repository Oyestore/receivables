/**
 * Module 3 Phase 3.1: Advanced Automation Foundation
 * Security Framework Interfaces
 * 
 * Comprehensive interfaces for security, authentication, authorization,
 * encryption, compliance, and incident management
 */

import {
  AuthenticationMethod,
  AuthorizationLevel,
  UserRole,
  Permission,
  EncryptionAlgorithm,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  ComplianceFramework,
  DataClassification,
  AccessControlModel,
  AssessmentType,
  ThreatLevel,
  SecurityControlType,
  AuditEventType,
  SessionStatus,
  MFAType,
  KeyOperation,
  PolicyType,
  RiskLevel,
  SecurityAlertType,
  KeyType,
  SecurityTestType
} from '../enums/security.enum';

/**
 * User authentication interface
 */
export interface IUserAuthentication {
  id: string;
  userId: string;
  
  // Authentication Details
  authenticationMethod: AuthenticationMethod;
  credentials: ICredentials;
  
  // Multi-Factor Authentication
  mfaEnabled: boolean;
  mfaConfiguration?: IMFAConfiguration;
  
  // Session Management
  sessionConfiguration: ISessionConfiguration;
  
  // Security Settings
  passwordPolicy: IPasswordPolicy;
  accountLockoutPolicy: IAccountLockoutPolicy;
  
  // Audit Information
  lastLoginAt?: Date;
  lastLoginIP?: string;
  failedLoginAttempts: number;
  lastFailedLoginAt?: Date;
  
  // Status
  isActive: boolean;
  isLocked: boolean;
  lockedUntil?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

/**
 * User authorization interface
 */
export interface IUserAuthorization {
  id: string;
  userId: string;
  
  // Role-Based Access Control
  roles: IUserRole[];
  
  // Direct Permissions
  permissions: IUserPermission[];
  
  // Attribute-Based Access Control
  attributes: IUserAttribute[];
  
  // Context-Based Access Control
  accessContexts: IAccessContext[];
  
  // Resource-Based Access Control
  resourceAccess: IResourceAccess[];
  
  // Time-Based Access Control
  timeBasedAccess: ITimeBasedAccess[];
  
  // Delegation
  delegations: IDelegation[];
  
  // Metadata
  effectiveFrom: Date;
  effectiveUntil?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Security policy interface
 */
export interface ISecurityPolicy {
  id: string;
  name: string;
  description: string;
  type: PolicyType;
  version: string;
  
  // Policy Configuration
  configuration: IPolicyConfiguration;
  
  // Scope and Applicability
  scope: IPolicyScope;
  applicability: IPolicyApplicability;
  
  // Enforcement
  enforcementLevel: string;
  enforcementActions: IEnforcementAction[];
  
  // Compliance
  complianceFrameworks: ComplianceFramework[];
  complianceRequirements: IComplianceRequirement[];
  
  // Monitoring and Reporting
  monitoringConfiguration: IPolicyMonitoringConfiguration;
  
  // Lifecycle Management
  status: string;
  approvedBy: string;
  approvedAt: Date;
  reviewDate: Date;
  expiryDate?: Date;
  
  // Metadata
  tags: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

/**
 * Encryption configuration interface
 */
export interface IEncryptionConfiguration {
  id: string;
  name: string;
  description: string;
  
  // Encryption Settings
  algorithm: EncryptionAlgorithm;
  keySize: number;
  mode: string;
  
  // Key Management
  keyManagement: IKeyManagementConfiguration;
  
  // Data Classification
  dataClassification: DataClassification[];
  
  // Performance Settings
  performanceSettings: IEncryptionPerformanceSettings;
  
  // Compliance
  complianceRequirements: ComplianceFramework[];
  
  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

/**
 * Security incident interface
 */
export interface ISecurityIncident {
  id: string;
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  
  // Detection Information
  detectedAt: Date;
  detectedBy: string;
  detectionMethod: string;
  
  // Impact Assessment
  impactAssessment: IImpactAssessment;
  
  // Response Information
  responseTeam: IResponseTeam;
  responseActions: IResponseAction[];
  
  // Investigation
  investigation: IInvestigation;
  
  // Evidence
  evidence: IEvidence[];
  
  // Timeline
  timeline: IIncidentTimelineEntry[];
  
  // Resolution
  resolution: IIncidentResolution;
  
  // Lessons Learned
  lessonsLearned: ILessonsLearned;
  
  // Metadata
  tags: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: string;
}

/**
 * Compliance assessment interface
 */
export interface IComplianceAssessment {
  id: string;
  name: string;
  description: string;
  framework: ComplianceFramework;
  
  // Assessment Scope
  scope: IAssessmentScope;
  
  // Assessment Configuration
  assessmentType: AssessmentType;
  assessmentCriteria: IAssessmentCriteria[];
  
  // Execution
  executionPlan: IExecutionPlan;
  executionResults: IExecutionResult[];
  
  // Findings
  findings: IComplianceFinding[];
  
  // Recommendations
  recommendations: IRecommendation[];
  
  // Remediation
  remediationPlan: IRemediationPlan;
  
  // Status and Timeline
  status: string;
  startDate: Date;
  endDate?: Date;
  nextAssessmentDate?: Date;
  
  // Metadata
  assessor: string;
  reviewer: string;
  approver: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Risk assessment interface
 */
export interface IRiskAssessment {
  id: string;
  name: string;
  description: string;
  
  // Risk Identification
  riskIdentification: IRiskIdentification;
  
  // Risk Analysis
  riskAnalysis: IRiskAnalysis;
  
  // Risk Evaluation
  riskEvaluation: IRiskEvaluation;
  
  // Risk Treatment
  riskTreatment: IRiskTreatment;
  
  // Monitoring and Review
  monitoringPlan: IRiskMonitoringPlan;
  
  // Status and Timeline
  status: string;
  assessmentDate: Date;
  nextReviewDate: Date;
  
  // Metadata
  assessor: string;
  reviewer: string;
  approver: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Security audit interface
 */
export interface ISecurityAudit {
  id: string;
  auditId: string;
  eventType: AuditEventType;
  
  // Event Details
  timestamp: Date;
  userId: string;
  sessionId: string;
  
  // Resource Information
  resourceType: string;
  resourceId: string;
  resourceName: string;
  
  // Action Details
  action: string;
  actionDetails: Record<string, any>;
  
  // Context Information
  ipAddress: string;
  userAgent: string;
  geolocation?: IGeoLocation;
  
  // Request Information
  requestId: string;
  requestMethod?: string;
  requestUrl?: string;
  requestHeaders?: Record<string, string>;
  
  // Response Information
  responseStatus?: number;
  responseTime?: number;
  
  // Security Context
  securityContext: ISecurityContext;
  
  // Risk Assessment
  riskScore: number;
  riskFactors: string[];
  
  // Metadata
  tags: Record<string, string>;
  metadata: Record<string, any>;
}

/**
 * Supporting interfaces
 */

export interface ICredentials {
  type: string;
  value: string;
  salt?: string;
  hash?: string;
  expiresAt?: Date;
  metadata: Record<string, any>;
}

export interface IMFAConfiguration {
  methods: IMFAMethod[];
  backupCodes: string[];
  trustedDevices: ITrustedDevice[];
  settings: IMFASettings;
}

export interface IMFAMethod {
  id: string;
  type: MFAType;
  isEnabled: boolean;
  isPrimary: boolean;
  configuration: Record<string, any>;
  lastUsedAt?: Date;
}

export interface ITrustedDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  trustedAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface IMFASettings {
  requireMFA: boolean;
  mfaTimeout: number;
  allowTrustedDevices: boolean;
  trustedDeviceDuration: number;
  backupCodesCount: number;
}

export interface ISessionConfiguration {
  maxSessionDuration: number;
  idleTimeout: number;
  absoluteTimeout: number;
  concurrentSessionsLimit: number;
  sessionStorage: string;
}

export interface IPasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialCharacters: boolean;
  preventReuse: number;
  expirationDays: number;
  warningDays: number;
}

export interface IAccountLockoutPolicy {
  maxFailedAttempts: number;
  lockoutDuration: number;
  resetFailedAttemptsAfter: number;
  notifyOnLockout: boolean;
}

export interface IUserRole {
  roleId: string;
  roleName: string;
  assignedAt: Date;
  assignedBy: string;
  expiresAt?: Date;
  isActive: boolean;
}

export interface IUserPermission {
  permissionId: string;
  permission: Permission;
  grantedAt: Date;
  grantedBy: string;
  expiresAt?: Date;
  isActive: boolean;
}

export interface IUserAttribute {
  name: string;
  value: any;
  type: string;
  source: string;
  updatedAt: Date;
}

export interface IAccessContext {
  id: string;
  name: string;
  conditions: IAccessCondition[];
  permissions: Permission[];
  isActive: boolean;
}

export interface IAccessCondition {
  type: string;
  operator: string;
  value: any;
  metadata: Record<string, any>;
}

export interface IResourceAccess {
  resourceType: string;
  resourceId: string;
  permissions: Permission[];
  conditions: IAccessCondition[];
  grantedAt: Date;
  expiresAt?: Date;
}

export interface ITimeBasedAccess {
  id: string;
  name: string;
  schedule: IAccessSchedule;
  permissions: Permission[];
  isActive: boolean;
}

export interface IAccessSchedule {
  timezone: string;
  allowedDays: number[];
  allowedHours: ITimeRange[];
  exceptions: IScheduleException[];
}

export interface ITimeRange {
  startTime: string;
  endTime: string;
}

export interface IScheduleException {
  date: Date;
  isAllowed: boolean;
  reason: string;
}

export interface IDelegation {
  id: string;
  delegatedTo: string;
  permissions: Permission[];
  conditions: IAccessCondition[];
  delegatedAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface IPolicyConfiguration {
  rules: IPolicyRule[];
  parameters: Record<string, any>;
  exceptions: IPolicyException[];
}

export interface IPolicyRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  priority: number;
  isActive: boolean;
}

export interface IPolicyException {
  id: string;
  name: string;
  condition: string;
  justification: string;
  approvedBy: string;
  expiresAt?: Date;
}

export interface IPolicyScope {
  includePatterns: string[];
  excludePatterns: string[];
  resourceTypes: string[];
  userGroups: string[];
}

export interface IPolicyApplicability {
  userRoles: UserRole[];
  resourceTypes: string[];
  conditions: IAccessCondition[];
}

export interface IEnforcementAction {
  type: string;
  configuration: Record<string, any>;
  severity: string;
}

export interface IComplianceRequirement {
  id: string;
  name: string;
  description: string;
  framework: ComplianceFramework;
  controls: string[];
  testProcedures: string[];
}

export interface IPolicyMonitoringConfiguration {
  enableMonitoring: boolean;
  monitoringInterval: string;
  alertingRules: IAlertingRule[];
  reportingSchedule: IReportingSchedule;
}

export interface IAlertingRule {
  id: string;
  name: string;
  condition: string;
  severity: string;
  recipients: string[];
}

export interface IReportingSchedule {
  frequency: string;
  recipients: string[];
  format: string;
  includeDetails: boolean;
}

export interface IKeyManagementConfiguration {
  keyStorage: string;
  keyRotationPolicy: IKeyRotationPolicy;
  keyBackupPolicy: IKeyBackupPolicy;
  keyAccessPolicy: IKeyAccessPolicy;
}

export interface IKeyRotationPolicy {
  enabled: boolean;
  rotationInterval: number;
  automaticRotation: boolean;
  notificationSettings: INotificationSettings;
}

export interface IKeyBackupPolicy {
  enabled: boolean;
  backupLocation: string;
  backupFrequency: string;
  encryptBackups: boolean;
}

export interface IKeyAccessPolicy {
  authorizedUsers: string[];
  authorizedRoles: string[];
  accessLogging: boolean;
  requireApproval: boolean;
}

export interface INotificationSettings {
  enabled: boolean;
  recipients: string[];
  channels: string[];
  templates: Record<string, string>;
}

export interface IEncryptionPerformanceSettings {
  enableHardwareAcceleration: boolean;
  cacheSize: number;
  batchSize: number;
  parallelProcessing: boolean;
}

export interface IImpactAssessment {
  confidentialityImpact: string;
  integrityImpact: string;
  availabilityImpact: string;
  businessImpact: string;
  financialImpact: number;
  reputationalImpact: string;
  legalImpact: string;
}

export interface IResponseTeam {
  teamLead: string;
  members: ITeamMember[];
  externalConsultants: IExternalConsultant[];
}

export interface ITeamMember {
  userId: string;
  role: string;
  responsibilities: string[];
  contactInfo: IContactInfo;
}

export interface IExternalConsultant {
  name: string;
  organization: string;
  expertise: string[];
  contactInfo: IContactInfo;
}

export interface IContactInfo {
  email: string;
  phone: string;
  alternateContact?: string;
}

export interface IResponseAction {
  id: string;
  action: string;
  description: string;
  performedBy: string;
  performedAt: Date;
  status: string;
  results: string;
}

export interface IInvestigation {
  investigator: string;
  startDate: Date;
  endDate?: Date;
  methodology: string;
  findings: IInvestigationFinding[];
  conclusions: string[];
}

export interface IInvestigationFinding {
  id: string;
  category: string;
  description: string;
  evidence: string[];
  confidence: string;
}

export interface IEvidence {
  id: string;
  type: string;
  description: string;
  location: string;
  collectedBy: string;
  collectedAt: Date;
  chainOfCustody: IChainOfCustodyEntry[];
}

export interface IChainOfCustodyEntry {
  transferredTo: string;
  transferredAt: Date;
  purpose: string;
  signature: string;
}

export interface IIncidentTimelineEntry {
  timestamp: Date;
  event: string;
  description: string;
  source: string;
  impact: string;
}

export interface IIncidentResolution {
  resolvedAt: Date;
  resolvedBy: string;
  resolution: string;
  rootCause: string;
  preventiveMeasures: string[];
}

export interface ILessonsLearned {
  whatWorkedWell: string[];
  whatCouldBeImproved: string[];
  recommendations: string[];
  processImprovements: string[];
}

export interface IAssessmentScope {
  systems: string[];
  processes: string[];
  controls: string[];
  locations: string[];
  timeframe: ITimeframe;
}

export interface ITimeframe {
  startDate: Date;
  endDate: Date;
  timezone: string;
}

export interface IAssessmentCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  passingScore: number;
  testProcedures: string[];
}

export interface IExecutionPlan {
  phases: IExecutionPhase[];
  resources: IResourceRequirement[];
  timeline: IExecutionTimeline;
}

export interface IExecutionPhase {
  id: string;
  name: string;
  description: string;
  activities: IActivity[];
  dependencies: string[];
}

export interface IActivity {
  id: string;
  name: string;
  description: string;
  estimatedDuration: number;
  assignedTo: string;
}

export interface IResourceRequirement {
  type: string;
  quantity: number;
  skills: string[];
  availability: string;
}

export interface IExecutionTimeline {
  startDate: Date;
  endDate: Date;
  milestones: IMilestone[];
}

export interface IMilestone {
  id: string;
  name: string;
  date: Date;
  deliverables: string[];
}

export interface IExecutionResult {
  phaseId: string;
  activityId: string;
  status: string;
  completedAt: Date;
  results: Record<string, any>;
  issues: string[];
}

export interface IComplianceFinding {
  id: string;
  criteriaId: string;
  status: string;
  score: number;
  evidence: string[];
  gaps: string[];
  risks: string[];
}

export interface IRecommendation {
  id: string;
  priority: string;
  category: string;
  description: string;
  implementation: string;
  timeline: string;
  cost: number;
  benefit: string;
}

export interface IRemediationPlan {
  recommendations: IRemediationAction[];
  timeline: IRemediationTimeline;
  resources: IResourceAllocation[];
  monitoring: IRemediationMonitoring;
}

export interface IRemediationAction {
  id: string;
  recommendationId: string;
  action: string;
  assignedTo: string;
  dueDate: Date;
  status: string;
  progress: number;
}

export interface IRemediationTimeline {
  startDate: Date;
  endDate: Date;
  phases: IRemediationPhase[];
}

export interface IRemediationPhase {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  actions: string[];
}

export interface IResourceAllocation {
  resourceType: string;
  quantity: number;
  cost: number;
  assignedTo: string;
}

export interface IRemediationMonitoring {
  frequency: string;
  metrics: string[];
  reportingSchedule: string;
  escalationRules: string[];
}

export interface IRiskIdentification {
  assets: IAsset[];
  threats: IThreat[];
  vulnerabilities: IVulnerability[];
  riskScenarios: IRiskScenario[];
}

export interface IAsset {
  id: string;
  name: string;
  type: string;
  value: number;
  classification: DataClassification;
  owner: string;
  location: string;
}

export interface IThreat {
  id: string;
  name: string;
  type: string;
  source: string;
  likelihood: string;
  impact: string;
  description: string;
}

export interface IVulnerability {
  id: string;
  name: string;
  type: string;
  severity: string;
  cvssScore?: number;
  affectedAssets: string[];
  description: string;
}

export interface IRiskScenario {
  id: string;
  name: string;
  description: string;
  assets: string[];
  threats: string[];
  vulnerabilities: string[];
  likelihood: string;
  impact: string;
}

export interface IRiskAnalysis {
  qualitativeAnalysis: IQualitativeAnalysis;
  quantitativeAnalysis?: IQuantitativeAnalysis;
  riskMatrix: IRiskMatrix;
}

export interface IQualitativeAnalysis {
  likelihoodAssessment: ILikelihoodAssessment[];
  impactAssessment: IImpactAssessmentDetail[];
  riskRating: IRiskRating[];
}

export interface ILikelihoodAssessment {
  riskScenarioId: string;
  likelihood: string;
  justification: string;
  confidence: string;
}

export interface IImpactAssessmentDetail {
  riskScenarioId: string;
  impactCategory: string;
  impact: string;
  justification: string;
  confidence: string;
}

export interface IRiskRating {
  riskScenarioId: string;
  riskLevel: RiskLevel;
  riskScore: number;
  justification: string;
}

export interface IQuantitativeAnalysis {
  annualLossExpectancy: IAnnualLossExpectancy[];
  returnOnSecurityInvestment: IROSIAnalysis[];
  costBenefitAnalysis: ICostBenefitAnalysis[];
}

export interface IAnnualLossExpectancy {
  riskScenarioId: string;
  singleLossExpectancy: number;
  annualRateOfOccurrence: number;
  annualLossExpectancy: number;
}

export interface IROSIAnalysis {
  controlId: string;
  investmentCost: number;
  riskReduction: number;
  rosi: number;
}

export interface ICostBenefitAnalysis {
  controlId: string;
  implementationCost: number;
  operationalCost: number;
  riskReduction: number;
  netBenefit: number;
}

export interface IRiskMatrix {
  dimensions: IRiskDimension[];
  cells: IRiskCell[];
}

export interface IRiskDimension {
  name: string;
  type: string;
  scale: string[];
}

export interface IRiskCell {
  likelihood: string;
  impact: string;
  riskLevel: RiskLevel;
  color: string;
}

export interface IRiskEvaluation {
  riskTolerance: IRiskTolerance;
  riskAcceptanceCriteria: IRiskAcceptanceCriteria;
  riskPrioritization: IRiskPrioritization[];
}

export interface IRiskTolerance {
  overall: RiskLevel;
  byCategory: Record<string, RiskLevel>;
  byAsset: Record<string, RiskLevel>;
}

export interface IRiskAcceptanceCriteria {
  acceptableRiskLevel: RiskLevel;
  acceptableRiskScore: number;
  acceptanceConditions: string[];
}

export interface IRiskPrioritization {
  riskScenarioId: string;
  priority: number;
  justification: string;
  treatmentRequired: boolean;
}

export interface IRiskTreatment {
  treatmentOptions: IRiskTreatmentOption[];
  selectedTreatments: IRiskTreatmentSelection[];
  implementationPlan: IRiskTreatmentImplementation;
}

export interface IRiskTreatmentOption {
  id: string;
  type: string;
  description: string;
  cost: number;
  effectiveness: number;
  feasibility: string;
}

export interface IRiskTreatmentSelection {
  riskScenarioId: string;
  treatmentOptionId: string;
  justification: string;
  approvedBy: string;
  approvedAt: Date;
}

export interface IRiskTreatmentImplementation {
  phases: IRiskTreatmentPhase[];
  timeline: IRiskTreatmentTimeline;
  resources: IResourceAllocation[];
}

export interface IRiskTreatmentPhase {
  id: string;
  name: string;
  treatments: string[];
  startDate: Date;
  endDate: Date;
}

export interface IRiskTreatmentTimeline {
  startDate: Date;
  endDate: Date;
  milestones: IMilestone[];
}

export interface IRiskMonitoringPlan {
  monitoringFrequency: string;
  keyRiskIndicators: IKeyRiskIndicator[];
  reportingSchedule: IReportingSchedule;
  reviewSchedule: IReviewSchedule;
}

export interface IKeyRiskIndicator {
  id: string;
  name: string;
  description: string;
  metric: string;
  threshold: number;
  frequency: string;
}

export interface IReviewSchedule {
  frequency: string;
  participants: string[];
  agenda: string[];
  deliverables: string[];
}

export interface IGeoLocation {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface ISecurityContext {
  tenantId: string;
  userId: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
  securityLevel: string;
  dataClassification: DataClassification;
}

