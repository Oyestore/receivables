/**
 * Legal Compliance Enhancement - Comprehensive Interfaces
 * Module 8 Enhancement for SME Receivables Management Platform
 * 
 * This file contains all interfaces used across the legal compliance automation system
 * including MSME portal integration, legal service providers, document generation,
 * and compliance monitoring.
 */

import {
  MSMEPortalEnvironment,
  MSMEComplaintStatus,
  MSMEComplaintType,
  MSMEPortalDocumentType,
  MSMEPortalAuthStatus,
  LegalSpecialization,
  LegalProviderStatus,
  LegalProviderAvailability,
  LegalNoticeType,
  LegalNoticeDeliveryMethod,
  LegalNoticeDeliveryStatus,
  LegalServiceType,
  LegalServicePriority,
  LegalDocumentTemplateCategory,
  DocumentOutputFormat,
  DocumentLanguage,
  DocumentGenerationStatus,
  DigitalSignatureType,
  TemplateComplianceStatus,
  ComplianceCategory,
  ComplianceStatus,
  ComplianceRequirementType,
  ComplianceCheckFrequency,
  ComplianceAlertSeverity,
  ComplianceAlertType,
  IntegrationStatus,
  APIResponseStatus,
  AuditActionType,
  NotificationType,
  NotificationPriority,
  IndianState,
  BusinessEntityType,
  MSMECategory,
  MSMESector,
  PaymentTerms,
  CurrencyCode,
  LegalJurisdiction,
  TimeZone,
  AIModelType,
  AIProcessingStatus,
  MLTaskType,
  ErrorCategory,
  ErrorSeverity
} from './legal-compliance.enum';

// ============================================================================
// Base Interfaces
// ============================================================================

/**
 * Base Entity Interface
 */
export interface IBaseEntity {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  version: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}

/**
 * Base Response Interface
 */
export interface IBaseResponse<T = any> {
  success: boolean;
  data?: T;
  error?: IErrorResponse;
  message?: string;
  timestamp: Date;
  requestId?: string;
  pagination?: IPaginationResponse;
}

/**
 * Error Response Interface
 */
export interface IErrorResponse {
  code: string;
  message: string;
  details?: any;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: Date;
  path?: string;
  method?: string;
  stack?: string;
}

/**
 * Pagination Request Interface
 */
export interface IPaginationRequest {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
}

/**
 * Pagination Response Interface
 */
export interface IPaginationResponse {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Address Interface
 */
export interface IAddress {
  street: string;
  city: string;
  state: IndianState;
  pincode: string;
  country: string;
  landmark?: string;
  addressType?: 'registered' | 'correspondence' | 'billing' | 'shipping';
}

/**
 * Contact Details Interface
 */
export interface IContactDetails {
  email: string;
  phone: string;
  alternatePhone?: string;
  fax?: string;
  website?: string;
  socialMedia?: Record<string, string>;
}

/**
 * Business Entity Interface
 */
export interface IBusinessEntity {
  name: string;
  entityType: BusinessEntityType;
  registrationNumber?: string;
  udyamNumber?: string;
  gstNumber?: string;
  panNumber?: string;
  cinNumber?: string;
  address: IAddress;
  contactDetails: IContactDetails;
  msmeCategory?: MSMECategory;
  msmeSector?: MSMESector;
}

// ============================================================================
// MSME Portal Integration Interfaces
// ============================================================================

/**
 * MSME Portal Configuration Interface
 */
export interface IMSMEPortalConfig {
  environment: MSMEPortalEnvironment;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  certificatePath?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  rateLimitPerMinute: number;
}

/**
 * MSME Portal Authentication Interface
 */
export interface IMSMEPortalAuth {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  scope: string[];
  issuedAt: Date;
  status: MSMEPortalAuthStatus;
}

/**
 * MSME Complaint Data Interface
 */
export interface IMSMEComplaintData {
  udyamRegistrationNumber: string;
  buyerDetails: IBusinessEntity;
  invoiceDetails: IInvoiceDetails[];
  delayDetails: IPaymentDelayDetails;
  claimAmount: IClaimAmount;
  supportingDocuments: IDocumentReference[];
  complaintType: MSMEComplaintType;
  description: string;
  expectedResolution?: string;
}

/**
 * Invoice Details Interface
 */
export interface IInvoiceDetails {
  invoiceNumber: string;
  invoiceDate: Date;
  amount: number;
  currency: CurrencyCode;
  dueDate: Date;
  description: string;
  gstDetails?: IGSTDetails;
  paymentTerms: PaymentTerms;
  serviceDetails?: string;
  deliveryDate?: Date;
  acceptanceDate?: Date;
}

/**
 * Payment Delay Details Interface
 */
export interface IPaymentDelayDetails {
  delayDays: number;
  interestRate: number;
  interestAmount: number;
  penaltyAmount?: number;
  totalOutstanding: number;
  lastFollowUpDate?: Date;
  communicationHistory?: ICommunicationRecord[];
}

/**
 * Claim Amount Interface
 */
export interface IClaimAmount {
  principalAmount: number;
  interestAmount: number;
  penaltyAmount: number;
  legalCosts: number;
  totalClaimAmount: number;
  currency: CurrencyCode;
  calculationMethod: string;
  calculationDate: Date;
}

/**
 * GST Details Interface
 */
export interface IGSTDetails {
  gstNumber: string;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGstAmount: number;
  hsnCode?: string;
  sacCode?: string;
}

/**
 * Document Reference Interface
 */
export interface IDocumentReference {
  documentId: string;
  documentType: MSMEPortalDocumentType;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadDate: Date;
  description?: string;
  isRequired: boolean;
}

/**
 * MSME Complaint Reference Interface
 */
export interface IMSMEComplaintReference {
  referenceNumber: string;
  submissionDate: Date;
  status: MSMEComplaintStatus;
  trackingUrl: string;
  expectedResponseDate?: Date;
  nextSteps: string[];
  portalResponse?: any;
}

/**
 * MSME Complaint Status Update Interface
 */
export interface IMSMEComplaintStatusUpdate {
  referenceNumber: string;
  previousStatus: MSMEComplaintStatus;
  currentStatus: MSMEComplaintStatus;
  updateDate: Date;
  updateReason: string;
  additionalInfo?: any;
  nextActions?: string[];
}

// ============================================================================
// Legal Service Provider Interfaces
// ============================================================================

/**
 * Legal Service Provider Interface
 */
export interface ILegalServiceProvider {
  providerId: string;
  providerCode: string;
  name: string;
  firmName?: string;
  specializations: LegalSpecialization[];
  experienceYears: number;
  barCouncilNumber: string;
  location: IProviderLocation;
  contactDetails: IContactDetails;
  pricingStructure: IPricingStructure;
  credentials: ILegalCredentials;
  rating: number;
  totalReviews: number;
  availabilityStatus: LegalProviderAvailability;
  verificationStatus: LegalProviderStatus;
  languages: DocumentLanguage[];
  jurisdiction: LegalJurisdiction[];
  workingHours: IWorkingHours;
  emergencyAvailable: boolean;
}

/**
 * Provider Location Interface
 */
export interface IProviderLocation {
  address: IAddress;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  serviceAreas: string[];
  jurisdiction: LegalJurisdiction[];
  courtProximity?: {
    districtCourt: number;
    highCourt: number;
    supremeCourt?: number;
  };
}

/**
 * Pricing Structure Interface
 */
export interface IPricingStructure {
  consultationFee: number;
  noticeFee: number;
  courtRepresentationFee: number;
  hourlyRate: number;
  fixedPackages?: IFixedPackage[];
  currency: CurrencyCode;
  paymentTerms: PaymentTerms;
  discounts?: IDiscount[];
}

/**
 * Fixed Package Interface
 */
export interface IFixedPackage {
  packageId: string;
  name: string;
  description: string;
  services: LegalServiceType[];
  price: number;
  duration: number;
  inclusions: string[];
  exclusions: string[];
}

/**
 * Discount Interface
 */
export interface IDiscount {
  discountType: 'percentage' | 'fixed';
  value: number;
  condition: string;
  validFrom: Date;
  validTo: Date;
  applicableServices: LegalServiceType[];
}

/**
 * Legal Credentials Interface
 */
export interface ILegalCredentials {
  barCouncilNumber: string;
  enrollmentDate: Date;
  certifications: ICertification[];
  education: IEducation[];
  achievements: IAchievement[];
  publications?: IPublication[];
  memberships?: IMembership[];
}

/**
 * Certification Interface
 */
export interface ICertification {
  certificationId: string;
  name: string;
  issuingAuthority: string;
  issueDate: Date;
  expiryDate?: Date;
  verificationUrl?: string;
  specialization: LegalSpecialization;
}

/**
 * Education Interface
 */
export interface IEducation {
  degree: string;
  institution: string;
  year: number;
  specialization?: string;
  grade?: string;
}

/**
 * Achievement Interface
 */
export interface IAchievement {
  title: string;
  description: string;
  date: Date;
  category: string;
  verificationUrl?: string;
}

/**
 * Publication Interface
 */
export interface IPublication {
  title: string;
  journal: string;
  publishDate: Date;
  url?: string;
  coAuthors?: string[];
}

/**
 * Membership Interface
 */
export interface IMembership {
  organization: string;
  membershipType: string;
  startDate: Date;
  endDate?: Date;
  position?: string;
}

/**
 * Working Hours Interface
 */
export interface IWorkingHours {
  monday: ITimeSlot[];
  tuesday: ITimeSlot[];
  wednesday: ITimeSlot[];
  thursday: ITimeSlot[];
  friday: ITimeSlot[];
  saturday: ITimeSlot[];
  sunday: ITimeSlot[];
  timezone: TimeZone;
  holidays: Date[];
  emergencyHours?: ITimeSlot[];
}

/**
 * Time Slot Interface
 */
export interface ITimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  breakTime?: {
    startTime: string;
    endTime: string;
  };
}

/**
 * Legal Notice Request Interface
 */
export interface ILegalNoticeRequest {
  noticeType: LegalNoticeType;
  recipientDetails: IBusinessEntity;
  noticeContent: INoticeContent;
  deliveryMethod: LegalNoticeDeliveryMethod;
  urgency: LegalServicePriority;
  providerId: string;
  templateId?: string;
  customizations?: Record<string, any>;
  deliveryInstructions?: string;
  followUpRequired: boolean;
}

/**
 * Notice Content Interface
 */
export interface INoticeContent {
  templateId: string;
  subject: string;
  body: string;
  customizations: Record<string, any>;
  attachments: IDocumentReference[];
  language: DocumentLanguage;
  legalBasis: ILegalBasis;
  demandDetails?: IDemandDetails;
}

/**
 * Legal Basis Interface
 */
export interface ILegalBasis {
  act: string;
  section: string;
  applicableProvisions: string[];
  caseReferences?: ICaseReference[];
  precedents?: IPrecedent[];
}

/**
 * Case Reference Interface
 */
export interface ICaseReference {
  caseNumber: string;
  court: string;
  year: number;
  parties: string;
  relevantPoint: string;
}

/**
 * Precedent Interface
 */
export interface IPrecedent {
  citation: string;
  court: string;
  date: Date;
  relevantPrinciple: string;
  applicability: string;
}

/**
 * Demand Details Interface
 */
export interface IDemandDetails {
  principalAmount: number;
  interestAmount: number;
  totalDemand: number;
  currency: CurrencyCode;
  dueDate: Date;
  paymentInstructions: string;
  consequencesOfNonPayment: string[];
}

/**
 * Legal Notice Dispatch Result Interface
 */
export interface ILegalNoticeDispatchResult {
  noticeId: string;
  dispatchDate: Date;
  expectedDeliveryDate: Date;
  trackingNumber?: string;
  deliveryMethod: LegalNoticeDeliveryMethod;
  cost: number;
  status: LegalNoticeDeliveryStatus;
  providerId: string;
  estimatedResponseTime: number;
}

/**
 * Legal Service Booking Interface
 */
export interface ILegalServiceBooking {
  bookingId: string;
  serviceType: LegalServiceType;
  providerId: string;
  clientId: string;
  scheduledDate: Date;
  duration: number;
  priority: LegalServicePriority;
  description: string;
  requirements: string[];
  meetingMode: 'in_person' | 'video_call' | 'phone_call';
  meetingDetails?: IMeetingDetails;
  cost: number;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
}

/**
 * Meeting Details Interface
 */
export interface IMeetingDetails {
  platform?: string;
  meetingUrl?: string;
  meetingId?: string;
  password?: string;
  dialInNumbers?: string[];
  location?: IAddress;
}

// ============================================================================
// Document Generation Interfaces
// ============================================================================

/**
 * Legal Document Template Interface
 */
export interface ILegalDocumentTemplate {
  templateId: string;
  templateCode: string;
  name: string;
  category: LegalDocumentTemplateCategory;
  description: string;
  version: string;
  language: DocumentLanguage;
  jurisdiction: LegalJurisdiction[];
  content: string;
  variables: ITemplateVariable[];
  validationRules: IValidationRule[];
  legalRequirements: ILegalRequirement[];
  complianceStatus: TemplateComplianceStatus;
  lastReviewDate: Date;
  nextReviewDate: Date;
  approvedBy?: string;
  tags: string[];
}

/**
 * Template Variable Interface
 */
export interface ITemplateVariable {
  variableName: string;
  displayName: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  isRequired: boolean;
  defaultValue?: any;
  validationRules?: IValidationRule[];
  description: string;
  examples?: any[];
  dependsOn?: string[];
}

/**
 * Validation Rule Interface
 */
export interface IValidationRule {
  ruleId: string;
  ruleName: string;
  ruleType: 'required' | 'format' | 'range' | 'custom';
  parameters: Record<string, any>;
  errorMessage: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Legal Requirement Interface
 */
export interface ILegalRequirement {
  requirementId: string;
  description: string;
  legalBasis: ILegalBasis;
  mandatory: boolean;
  applicableJurisdiction: LegalJurisdiction[];
  effectiveDate: Date;
  expiryDate?: Date;
}

/**
 * Document Generation Request Interface
 */
export interface IDocumentGenerationRequest {
  templateId: string;
  documentData: IDocumentData;
  outputFormat: DocumentOutputFormat;
  language: DocumentLanguage;
  customizations?: IDocumentCustomizations;
  digitalSignature?: IDigitalSignatureRequest;
  deliveryOptions?: IDeliveryOptions;
  metadata?: Record<string, any>;
}

/**
 * Document Data Interface
 */
export interface IDocumentData {
  parties: IPartyDetails[];
  invoiceDetails: IInvoiceDetails[];
  paymentDetails: IPaymentDetails;
  legalBasis: ILegalBasis;
  customFields: Record<string, any>;
  documentDate: Date;
  jurisdiction: LegalJurisdiction;
  language: DocumentLanguage;
}

/**
 * Party Details Interface
 */
export interface IPartyDetails {
  role: 'creditor' | 'debtor' | 'guarantor' | 'witness' | 'advocate' | 'other';
  entity: IBusinessEntity;
  representative?: IRepresentative;
  authorizations?: IAuthorization[];
}

/**
 * Representative Interface
 */
export interface IRepresentative {
  name: string;
  designation: string;
  contactDetails: IContactDetails;
  authorizationDocument?: IDocumentReference;
  powerOfAttorney?: boolean;
}

/**
 * Authorization Interface
 */
export interface IAuthorization {
  authorizationType: string;
  authorizationNumber: string;
  issuingAuthority: string;
  issueDate: Date;
  expiryDate?: Date;
  scope: string[];
}

/**
 * Payment Details Interface
 */
export interface IPaymentDetails {
  originalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  delayDays: number;
  interestRate: number;
  interestAmount: number;
  penaltyAmount: number;
  totalAmount: number;
  currency: CurrencyCode;
  paymentHistory: IPaymentRecord[];
}

/**
 * Payment Record Interface
 */
export interface IPaymentRecord {
  paymentDate: Date;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  remarks?: string;
}

/**
 * Document Customizations Interface
 */
export interface IDocumentCustomizations {
  headerLogo?: string;
  footerText?: string;
  watermark?: string;
  fontFamily?: string;
  fontSize?: number;
  margins?: IMargins;
  pageOrientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'A3' | 'Letter' | 'Legal';
  colorScheme?: string;
}

/**
 * Margins Interface
 */
export interface IMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Digital Signature Request Interface
 */
export interface IDigitalSignatureRequest {
  required: boolean;
  signatureType: DigitalSignatureType;
  signerDetails: ISignerDetails[];
  certificateDetails?: ICertificateDetails;
  timestampRequired: boolean;
}

/**
 * Signer Details Interface
 */
export interface ISignerDetails {
  name: string;
  designation: string;
  email: string;
  phone: string;
  signingOrder: number;
  authenticationMethod: 'aadhaar' | 'otp' | 'biometric' | 'certificate';
}

/**
 * Certificate Details Interface
 */
export interface ICertificateDetails {
  certificateId: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  keyUsage: string[];
  certificatePolicy: string;
}

/**
 * Delivery Options Interface
 */
export interface IDeliveryOptions {
  deliveryMethods: NotificationType[];
  recipients: IRecipient[];
  deliverySchedule?: Date;
  expiryDate?: Date;
  passwordProtected: boolean;
  downloadLimit?: number;
}

/**
 * Recipient Interface
 */
export interface IRecipient {
  name: string;
  email: string;
  phone?: string;
  role: string;
  permissions: string[];
}

/**
 * Generated Document Interface
 */
export interface IGeneratedDocument {
  documentId: string;
  documentNumber: string;
  templateId: string;
  documentType: LegalDocumentTemplateCategory;
  fileName: string;
  filePath: string;
  fileSize: number;
  outputFormat: DocumentOutputFormat;
  language: DocumentLanguage;
  status: DocumentGenerationStatus;
  generationDate: Date;
  expiryDate?: Date;
  downloadUrl: string;
  digitalSignature?: IDigitalSignatureResult;
  metadata: IDocumentMetadata;
}

/**
 * Digital Signature Result Interface
 */
export interface IDigitalSignatureResult {
  signed: boolean;
  signatureId: string;
  signers: ISignerResult[];
  timestamp: Date;
  certificateChain?: string[];
  verificationUrl?: string;
}

/**
 * Signer Result Interface
 */
export interface ISignerResult {
  signerName: string;
  signedAt: Date;
  signatureValid: boolean;
  certificateValid: boolean;
  authenticationMethod: string;
}

/**
 * Document Metadata Interface
 */
export interface IDocumentMetadata {
  templateVersion: string;
  generationTime: Date;
  generatedBy: string;
  complianceChecked: boolean;
  complianceScore?: number;
  validationResults: IValidationResult[];
  auditTrail: IAuditRecord[];
}

/**
 * Validation Result Interface
 */
export interface IValidationResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  details?: any;
}

// ============================================================================
// Compliance Monitoring Interfaces
// ============================================================================

/**
 * Compliance Requirement Interface
 */
export interface IComplianceRequirement {
  requirementId: string;
  requirementCode: string;
  name: string;
  category: ComplianceCategory;
  description: string;
  applicableJurisdictions: LegalJurisdiction[];
  complianceCriteria: IComplianceCriteria;
  checkFrequency: ComplianceCheckFrequency;
  severity: ComplianceAlertSeverity;
  regulatorySource: string;
  effectiveDate: Date;
  expiryDate?: Date;
  status: 'active' | 'inactive' | 'deprecated';
  dependencies?: string[];
}

/**
 * Compliance Criteria Interface
 */
export interface IComplianceCriteria {
  rules: IComplianceRule[];
  thresholds: IComplianceThreshold[];
  calculations: IComplianceCalculation[];
  exemptions?: IComplianceExemption[];
}

/**
 * Compliance Rule Interface
 */
export interface IComplianceRule {
  ruleId: string;
  condition: string;
  expectedValue: any;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
  weight: number;
  mandatory: boolean;
}

/**
 * Compliance Threshold Interface
 */
export interface IComplianceThreshold {
  thresholdId: string;
  metric: string;
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
  unit: string;
  tolerancePercentage?: number;
}

/**
 * Compliance Calculation Interface
 */
export interface IComplianceCalculation {
  calculationId: string;
  formula: string;
  variables: Record<string, any>;
  resultType: 'score' | 'percentage' | 'boolean' | 'count';
  weightage: number;
}

/**
 * Compliance Exemption Interface
 */
export interface IComplianceExemption {
  exemptionId: string;
  condition: string;
  reason: string;
  validFrom: Date;
  validTo?: Date;
  approvedBy: string;
}

/**
 * Compliance Assessment Interface
 */
export interface IComplianceAssessment {
  assessmentId: string;
  tenantId: string;
  entityId: string;
  requirementId: string;
  assessmentDate: Date;
  complianceStatus: ComplianceStatus;
  score: number;
  findings: IComplianceFinding[];
  recommendations: IComplianceRecommendation[];
  nextAssessmentDate: Date;
  assessorId: string;
  evidenceDocuments?: IDocumentReference[];
}

/**
 * Compliance Finding Interface
 */
export interface IComplianceFinding {
  findingId: string;
  category: string;
  severity: ComplianceAlertSeverity;
  description: string;
  evidence: string[];
  impact: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Compliance Recommendation Interface
 */
export interface IComplianceRecommendation {
  recommendationId: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action: string;
  description: string;
  estimatedEffort: string;
  estimatedCost?: number;
  deadline?: Date;
  responsibleParty: string;
  dependencies?: string[];
}

/**
 * Compliance Status Overview Interface
 */
export interface IComplianceStatusOverview {
  entityId: string;
  overallScore: number;
  categories: IComplianceCategoryStatus[];
  lastAssessment: Date;
  nextAssessment: Date;
  criticalIssues: IComplianceIssue[];
  trends: IComplianceTrend[];
  alerts: IComplianceAlert[];
}

/**
 * Compliance Category Status Interface
 */
export interface IComplianceCategoryStatus {
  category: ComplianceCategory;
  score: number;
  status: ComplianceStatus;
  requirements: IComplianceRequirementStatus[];
  lastChecked: Date;
  nextCheck: Date;
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * Compliance Requirement Status Interface
 */
export interface IComplianceRequirementStatus {
  requirementId: string;
  description: string;
  status: ComplianceStatus;
  lastChecked: Date;
  nextCheck: Date;
  score?: number;
  issue?: string;
  remediation?: string;
}

/**
 * Compliance Issue Interface
 */
export interface IComplianceIssue {
  issueId: string;
  requirementId: string;
  severity: ComplianceAlertSeverity;
  description: string;
  detectedDate: Date;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  dueDate?: Date;
  resolution?: string;
  resolutionDate?: Date;
}

/**
 * Compliance Trend Interface
 */
export interface IComplianceTrend {
  category: ComplianceCategory;
  period: string;
  scoreHistory: IScorePoint[];
  direction: 'improving' | 'stable' | 'declining';
  changePercentage: number;
  factors: string[];
}

/**
 * Score Point Interface
 */
export interface IScorePoint {
  date: Date;
  score: number;
  events?: string[];
}

/**
 * Compliance Alert Interface
 */
export interface IComplianceAlert {
  alertId: string;
  alertType: ComplianceAlertType;
  severity: ComplianceAlertSeverity;
  title: string;
  description: string;
  entityId: string;
  requirementId?: string;
  triggeredDate: Date;
  dueDate?: Date;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  assignedTo?: string;
  actions: IAlertAction[];
  escalationLevel: number;
}

/**
 * Alert Action Interface
 */
export interface IAlertAction {
  actionId: string;
  actionType: 'notify' | 'escalate' | 'remediate' | 'document';
  description: string;
  dueDate?: Date;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completedDate?: Date;
  result?: string;
}

// ============================================================================
// Integration and System Interfaces
// ============================================================================

/**
 * API Configuration Interface
 */
export interface IAPIConfiguration {
  serviceName: string;
  baseUrl: string;
  version: string;
  authentication: IAuthenticationConfig;
  timeout: number;
  retryPolicy: IRetryPolicy;
  rateLimiting: IRateLimitConfig;
  monitoring: IMonitoringConfig;
}

/**
 * Authentication Configuration Interface
 */
export interface IAuthenticationConfig {
  type: 'bearer' | 'basic' | 'oauth2' | 'api_key' | 'certificate';
  credentials: Record<string, string>;
  tokenEndpoint?: string;
  refreshEndpoint?: string;
  scope?: string[];
}

/**
 * Retry Policy Interface
 */
export interface IRetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  initialDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

/**
 * Rate Limit Configuration Interface
 */
export interface IRateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  strategy: 'sliding_window' | 'fixed_window' | 'token_bucket';
}

/**
 * Monitoring Configuration Interface
 */
export interface IMonitoringConfig {
  healthCheckEndpoint: string;
  metricsEnabled: boolean;
  loggingLevel: 'debug' | 'info' | 'warn' | 'error';
  alerting: IAlertingConfig;
}

/**
 * Alerting Configuration Interface
 */
export interface IAlertingConfig {
  enabled: boolean;
  channels: NotificationType[];
  thresholds: IAlertThreshold[];
  escalationRules: IEscalationRule[];
}

/**
 * Alert Threshold Interface
 */
export interface IAlertThreshold {
  metric: string;
  operator: 'greater_than' | 'less_than' | 'equals';
  value: number;
  duration: number;
  severity: ComplianceAlertSeverity;
}

/**
 * Escalation Rule Interface
 */
export interface IEscalationRule {
  level: number;
  delay: number;
  recipients: string[];
  channels: NotificationType[];
  condition?: string;
}

/**
 * Audit Record Interface
 */
export interface IAuditRecord {
  auditId: string;
  tenantId: string;
  userId: string;
  action: AuditActionType;
  resource: string;
  resourceId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  result: 'success' | 'failure' | 'partial';
  details: Record<string, any>;
  changes?: IChangeRecord[];
}

/**
 * Change Record Interface
 */
export interface IChangeRecord {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'create' | 'update' | 'delete';
}

/**
 * Communication Record Interface
 */
export interface ICommunicationRecord {
  communicationId: string;
  type: NotificationType;
  direction: 'inbound' | 'outbound';
  sender: string;
  recipient: string;
  subject?: string;
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: Record<string, any>;
}

/**
 * Notification Request Interface
 */
export interface INotificationRequest {
  type: NotificationType;
  priority: NotificationPriority;
  recipients: string[];
  subject: string;
  content: string;
  templateId?: string;
  templateData?: Record<string, any>;
  scheduledTime?: Date;
  expiryTime?: Date;
  attachments?: IDocumentReference[];
}

/**
 * Notification Result Interface
 */
export interface INotificationResult {
  notificationId: string;
  status: 'sent' | 'failed' | 'scheduled';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
  deliveryReceipt?: any;
}

// ============================================================================
// AI and Machine Learning Interfaces
// ============================================================================

/**
 * AI Configuration Interface
 */
export interface IAIConfiguration {
  primaryModel: AIModelType;
  fallbackModels: AIModelType[];
  confidence: number;
  timeout: number;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * AI Processing Request Interface
 */
export interface IAIProcessingRequest {
  taskType: MLTaskType;
  inputData: any;
  configuration: IAIConfiguration;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * AI Processing Result Interface
 */
export interface IAIProcessingResult {
  taskId: string;
  taskType: MLTaskType;
  status: AIProcessingStatus;
  result: any;
  confidence: number;
  processingTime: number;
  model: AIModelType;
  metadata?: Record<string, any>;
  error?: string;
}

/**
 * Document Analysis Result Interface
 */
export interface IDocumentAnalysisResult {
  documentId: string;
  analysisType: MLTaskType;
  extractedEntities: IExtractedEntity[];
  sentiment?: ISentimentAnalysis;
  classification?: IDocumentClassification;
  summary?: string;
  keyPhrases?: string[];
  language?: DocumentLanguage;
  confidence: number;
}

/**
 * Extracted Entity Interface
 */
export interface IExtractedEntity {
  entityType: string;
  text: string;
  confidence: number;
  startPosition: number;
  endPosition: number;
  metadata?: Record<string, any>;
}

/**
 * Sentiment Analysis Interface
 */
export interface ISentimentAnalysis {
  overall: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
  aspects?: IAspectSentiment[];
}

/**
 * Aspect Sentiment Interface
 */
export interface IAspectSentiment {
  aspect: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
}

/**
 * Document Classification Interface
 */
export interface IDocumentClassification {
  category: string;
  subcategory?: string;
  confidence: number;
  alternativeCategories?: IClassificationOption[];
}

/**
 * Classification Option Interface
 */
export interface IClassificationOption {
  category: string;
  confidence: number;
}

// ============================================================================
// Export all interfaces for easy access
// ============================================================================

export const LegalComplianceInterfaces = {
  // Base Interfaces
  IBaseEntity,
  IBaseResponse,
  IErrorResponse,
  IPaginationRequest,
  IPaginationResponse,
  IAddress,
  IContactDetails,
  IBusinessEntity,
  
  // MSME Portal Interfaces
  IMSMEPortalConfig,
  IMSMEPortalAuth,
  IMSMEComplaintData,
  IInvoiceDetails,
  IPaymentDelayDetails,
  IClaimAmount,
  IGSTDetails,
  IDocumentReference,
  IMSMEComplaintReference,
  IMSMEComplaintStatusUpdate,
  
  // Legal Provider Interfaces
  ILegalServiceProvider,
  IProviderLocation,
  IPricingStructure,
  IFixedPackage,
  IDiscount,
  ILegalCredentials,
  ICertification,
  IEducation,
  IAchievement,
  IPublication,
  IMembership,
  IWorkingHours,
  ITimeSlot,
  ILegalNoticeRequest,
  INoticeContent,
  ILegalBasis,
  ICaseReference,
  IPrecedent,
  IDemandDetails,
  ILegalNoticeDispatchResult,
  ILegalServiceBooking,
  IMeetingDetails,
  
  // Document Generation Interfaces
  ILegalDocumentTemplate,
  ITemplateVariable,
  IValidationRule,
  ILegalRequirement,
  IDocumentGenerationRequest,
  IDocumentData,
  IPartyDetails,
  IRepresentative,
  IAuthorization,
  IPaymentDetails,
  IPaymentRecord,
  IDocumentCustomizations,
  IMargins,
  IDigitalSignatureRequest,
  ISignerDetails,
  ICertificateDetails,
  IDeliveryOptions,
  IRecipient,
  IGeneratedDocument,
  IDigitalSignatureResult,
  ISignerResult,
  IDocumentMetadata,
  IValidationResult,
  
  // Compliance Monitoring Interfaces
  IComplianceRequirement,
  IComplianceCriteria,
  IComplianceRule,
  IComplianceThreshold,
  IComplianceCalculation,
  IComplianceExemption,
  IComplianceAssessment,
  IComplianceFinding,
  IComplianceRecommendation,
  IComplianceStatusOverview,
  IComplianceCategoryStatus,
  IComplianceRequirementStatus,
  IComplianceIssue,
  IComplianceTrend,
  IScorePoint,
  IComplianceAlert,
  IAlertAction,
  
  // Integration and System Interfaces
  IAPIConfiguration,
  IAuthenticationConfig,
  IRetryPolicy,
  IRateLimitConfig,
  IMonitoringConfig,
  IAlertingConfig,
  IAlertThreshold,
  IEscalationRule,
  IAuditRecord,
  IChangeRecord,
  ICommunicationRecord,
  INotificationRequest,
  INotificationResult,
  
  // AI and ML Interfaces
  IAIConfiguration,
  IAIProcessingRequest,
  IAIProcessingResult,
  IDocumentAnalysisResult,
  IExtractedEntity,
  ISentimentAnalysis,
  IAspectSentiment,
  IDocumentClassification,
  IClassificationOption
} as const;

