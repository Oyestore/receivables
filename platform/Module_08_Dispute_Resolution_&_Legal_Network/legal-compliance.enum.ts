/**
 * Legal Compliance Enhancement - Comprehensive Enums
 * Module 8 Enhancement for SME Receivables Management Platform
 * 
 * This file contains all enums used across the legal compliance automation system
 * including MSME portal integration, legal service providers, document generation,
 * and compliance monitoring.
 */

// ============================================================================
// MSME Portal Integration Enums
// ============================================================================

/**
 * MSME Portal Environment Types
 */
export enum MSMEPortalEnvironment {
  SANDBOX = 'sandbox',
  PRODUCTION = 'production',
  STAGING = 'staging',
  DEVELOPMENT = 'development'
}

/**
 * MSME Complaint Status Types
 */
export enum MSMEComplaintStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  BUYER_NOTIFIED = 'buyer_notified',
  CONCILIATION_SCHEDULED = 'conciliation_scheduled',
  CONCILIATION_IN_PROGRESS = 'conciliation_in_progress',
  CONCILIATION_COMPLETED = 'conciliation_completed',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  CLOSED = 'closed',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}

/**
 * MSME Complaint Types
 */
export enum MSMEComplaintType {
  DELAYED_PAYMENT = 'delayed_payment',
  NON_PAYMENT = 'non_payment',
  PARTIAL_PAYMENT = 'partial_payment',
  DISPUTED_PAYMENT = 'disputed_payment',
  INTEREST_CLAIM = 'interest_claim',
  CONTRACT_VIOLATION = 'contract_violation',
  QUALITY_DISPUTE = 'quality_dispute',
  DELIVERY_DISPUTE = 'delivery_dispute'
}

/**
 * MSME Portal Document Types
 */
export enum MSMEPortalDocumentType {
  INVOICE = 'invoice',
  PURCHASE_ORDER = 'purchase_order',
  DELIVERY_RECEIPT = 'delivery_receipt',
  ACCEPTANCE_CERTIFICATE = 'acceptance_certificate',
  CORRESPONDENCE = 'correspondence',
  BANK_STATEMENT = 'bank_statement',
  UDYAM_CERTIFICATE = 'udyam_certificate',
  GST_RETURN = 'gst_return',
  AGREEMENT = 'agreement',
  OTHER = 'other'
}

/**
 * MSME Portal Authentication Status
 */
export enum MSMEPortalAuthStatus {
  AUTHENTICATED = 'authenticated',
  EXPIRED = 'expired',
  INVALID = 'invalid',
  PENDING = 'pending',
  FAILED = 'failed',
  REVOKED = 'revoked'
}

// ============================================================================
// Legal Service Provider Enums
// ============================================================================

/**
 * Legal Specialization Areas
 */
export enum LegalSpecialization {
  RECEIVABLES_MANAGEMENT = 'receivables_management',
  DEBT_COLLECTION = 'debt_collection',
  MSME_LAW = 'msme_law',
  CONTRACT_LAW = 'contract_law',
  COMMERCIAL_LAW = 'commercial_law',
  BANKING_LAW = 'banking_law',
  CORPORATE_LAW = 'corporate_law',
  ARBITRATION = 'arbitration',
  MEDIATION = 'mediation',
  LITIGATION = 'litigation',
  INSOLVENCY = 'insolvency',
  RECOVERY = 'recovery',
  NEGOTIATION = 'negotiation',
  COMPLIANCE = 'compliance',
  REGULATORY = 'regulatory'
}

/**
 * Legal Provider Status
 */
export enum LegalProviderStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
  VERIFIED = 'verified',
  BLACKLISTED = 'blacklisted',
  UNDER_REVIEW = 'under_review'
}

/**
 * Legal Provider Availability Status
 */
export enum LegalProviderAvailability {
  AVAILABLE = 'available',
  BUSY = 'busy',
  UNAVAILABLE = 'unavailable',
  ON_LEAVE = 'on_leave',
  EMERGENCY_ONLY = 'emergency_only'
}

/**
 * Legal Notice Types
 */
export enum LegalNoticeType {
  DEMAND_NOTICE = 'demand_notice',
  LEGAL_NOTICE = 'legal_notice',
  FINAL_NOTICE = 'final_notice',
  CEASE_AND_DESIST = 'cease_and_desist',
  BREACH_NOTICE = 'breach_notice',
  TERMINATION_NOTICE = 'termination_notice',
  PAYMENT_REMINDER = 'payment_reminder',
  SETTLEMENT_OFFER = 'settlement_offer',
  ARBITRATION_NOTICE = 'arbitration_notice',
  COURT_NOTICE = 'court_notice'
}

/**
 * Legal Notice Delivery Methods
 */
export enum LegalNoticeDeliveryMethod {
  REGISTERED_POST = 'registered_post',
  SPEED_POST = 'speed_post',
  COURIER = 'courier',
  EMAIL = 'email',
  HAND_DELIVERY = 'hand_delivery',
  PUBLICATION = 'publication',
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  MULTI_CHANNEL = 'multi_channel'
}

/**
 * Legal Notice Delivery Status
 */
export enum LegalNoticeDeliveryStatus {
  PENDING = 'pending',
  DISPATCHED = 'dispatched',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETURNED = 'returned',
  ACKNOWLEDGED = 'acknowledged',
  READ = 'read',
  RESPONDED = 'responded'
}

/**
 * Legal Service Types
 */
export enum LegalServiceType {
  CONSULTATION = 'consultation',
  NOTICE_DRAFTING = 'notice_drafting',
  NOTICE_DISPATCH = 'notice_dispatch',
  NEGOTIATION = 'negotiation',
  MEDIATION = 'mediation',
  ARBITRATION = 'arbitration',
  LITIGATION = 'litigation',
  RECOVERY = 'recovery',
  COMPLIANCE_REVIEW = 'compliance_review',
  DOCUMENT_REVIEW = 'document_review',
  LEGAL_OPINION = 'legal_opinion',
  REPRESENTATION = 'representation'
}

/**
 * Legal Service Priority Levels
 */
export enum LegalServicePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

// ============================================================================
// Document Generation Enums
// ============================================================================

/**
 * Legal Document Template Categories
 */
export enum LegalDocumentTemplateCategory {
  DEMAND_NOTICES = 'demand_notices',
  LEGAL_NOTICES = 'legal_notices',
  AGREEMENTS = 'agreements',
  CONTRACTS = 'contracts',
  LETTERS = 'letters',
  APPLICATIONS = 'applications',
  PETITIONS = 'petitions',
  AFFIDAVITS = 'affidavits',
  UNDERTAKINGS = 'undertakings',
  SETTLEMENTS = 'settlements',
  RELEASES = 'releases',
  WAIVERS = 'waivers',
  POWERS_OF_ATTORNEY = 'powers_of_attorney',
  AUTHORIZATIONS = 'authorizations',
  CERTIFICATES = 'certificates'
}

/**
 * Document Output Formats
 */
export enum DocumentOutputFormat {
  PDF = 'pdf',
  DOCX = 'docx',
  HTML = 'html',
  RTF = 'rtf',
  TXT = 'txt',
  ODT = 'odt'
}

/**
 * Document Languages
 */
export enum DocumentLanguage {
  ENGLISH = 'english',
  HINDI = 'hindi',
  MARATHI = 'marathi',
  GUJARATI = 'gujarati',
  TAMIL = 'tamil',
  TELUGU = 'telugu',
  KANNADA = 'kannada',
  BENGALI = 'bengali',
  PUNJABI = 'punjabi',
  MALAYALAM = 'malayalam',
  ODIA = 'odia',
  ASSAMESE = 'assamese'
}

/**
 * Document Generation Status
 */
export enum DocumentGenerationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  GENERATED = 'generated',
  SIGNED = 'signed',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

/**
 * Digital Signature Types
 */
export enum DigitalSignatureType {
  AADHAAR_ESIGN = 'aadhaar_esign',
  DSC_CLASS_2 = 'dsc_class_2',
  DSC_CLASS_3 = 'dsc_class_3',
  EMUDHRA = 'emudhra',
  NCODE = 'ncode',
  SAFESCRYPT = 'safescrypt',
  DOCUSIGN = 'docusign',
  ADOBE_SIGN = 'adobe_sign'
}

/**
 * Template Compliance Status
 */
export enum TemplateComplianceStatus {
  CURRENT = 'current',
  OUTDATED = 'outdated',
  DEPRECATED = 'deprecated',
  UNDER_REVIEW = 'under_review',
  DRAFT = 'draft',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

// ============================================================================
// Compliance Monitoring Enums
// ============================================================================

/**
 * Compliance Categories
 */
export enum ComplianceCategory {
  MSME_COMPLIANCE = 'msme_compliance',
  LEGAL_DOCUMENTATION = 'legal_documentation',
  REGULATORY_COMPLIANCE = 'regulatory_compliance',
  CONTRACTUAL_COMPLIANCE = 'contractual_compliance',
  PAYMENT_COMPLIANCE = 'payment_compliance',
  DISPUTE_RESOLUTION = 'dispute_resolution',
  RECORD_KEEPING = 'record_keeping',
  NOTIFICATION_COMPLIANCE = 'notification_compliance',
  DEADLINE_COMPLIANCE = 'deadline_compliance',
  PROCEDURAL_COMPLIANCE = 'procedural_compliance'
}

/**
 * Compliance Status
 */
export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  WARNING = 'warning',
  CRITICAL = 'critical',
  PENDING_REVIEW = 'pending_review',
  UNDER_REMEDIATION = 'under_remediation',
  EXEMPTED = 'exempted',
  NOT_APPLICABLE = 'not_applicable'
}

/**
 * Compliance Requirement Types
 */
export enum ComplianceRequirementType {
  MANDATORY = 'mandatory',
  RECOMMENDED = 'recommended',
  OPTIONAL = 'optional',
  CONDITIONAL = 'conditional',
  REGULATORY = 'regulatory',
  CONTRACTUAL = 'contractual',
  INTERNAL = 'internal',
  INDUSTRY_STANDARD = 'industry_standard'
}

/**
 * Compliance Check Frequency
 */
export enum ComplianceCheckFrequency {
  REAL_TIME = 'real_time',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
  ON_DEMAND = 'on_demand',
  EVENT_TRIGGERED = 'event_triggered'
}

/**
 * Compliance Alert Severity
 */
export enum ComplianceAlertSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

/**
 * Compliance Alert Types
 */
export enum ComplianceAlertType {
  DEADLINE_APPROACHING = 'deadline_approaching',
  DEADLINE_MISSED = 'deadline_missed',
  REQUIREMENT_VIOLATED = 'requirement_violated',
  SCORE_DEGRADED = 'score_degraded',
  REGULATORY_CHANGE = 'regulatory_change',
  DOCUMENT_EXPIRED = 'document_expired',
  CERTIFICATION_REQUIRED = 'certification_required',
  AUDIT_REQUIRED = 'audit_required',
  REMEDIATION_REQUIRED = 'remediation_required',
  ESCALATION_REQUIRED = 'escalation_required'
}

// ============================================================================
// Integration and System Enums
// ============================================================================

/**
 * Integration Status
 */
export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
  DEPRECATED = 'deprecated',
  TESTING = 'testing'
}

/**
 * API Response Status
 */
export enum APIResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  PARTIAL_SUCCESS = 'partial_success',
  TIMEOUT = 'timeout',
  RATE_LIMITED = 'rate_limited',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  VALIDATION_ERROR = 'validation_error',
  INTERNAL_ERROR = 'internal_error'
}

/**
 * Audit Action Types
 */
export enum AuditActionType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  IMPORT = 'import',
  APPROVE = 'approve',
  REJECT = 'reject',
  SUBMIT = 'submit',
  CANCEL = 'cancel',
  ESCALATE = 'escalate',
  RESOLVE = 'resolve',
  ASSIGN = 'assign',
  TRANSFER = 'transfer'
}

/**
 * Notification Types
 */
export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  PUSH = 'push',
  IN_APP = 'in_app',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  TEAMS = 'teams'
}

/**
 * Notification Priority
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

/**
 * Queue Job Status
 */
export enum QueueJobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
  STUCK = 'stuck'
}

/**
 * Cache Strategy Types
 */
export enum CacheStrategy {
  TTL = 'ttl',
  LRU = 'lru',
  LFU = 'lfu',
  FIFO = 'fifo',
  WRITE_THROUGH = 'write_through',
  WRITE_BEHIND = 'write_behind',
  REFRESH_AHEAD = 'refresh_ahead'
}

// ============================================================================
// Business Logic Enums
// ============================================================================

/**
 * Indian States and Union Territories
 */
export enum IndianState {
  ANDHRA_PRADESH = 'andhra_pradesh',
  ARUNACHAL_PRADESH = 'arunachal_pradesh',
  ASSAM = 'assam',
  BIHAR = 'bihar',
  CHHATTISGARH = 'chhattisgarh',
  GOA = 'goa',
  GUJARAT = 'gujarat',
  HARYANA = 'haryana',
  HIMACHAL_PRADESH = 'himachal_pradesh',
  JHARKHAND = 'jharkhand',
  KARNATAKA = 'karnataka',
  KERALA = 'kerala',
  MADHYA_PRADESH = 'madhya_pradesh',
  MAHARASHTRA = 'maharashtra',
  MANIPUR = 'manipur',
  MEGHALAYA = 'meghalaya',
  MIZORAM = 'mizoram',
  NAGALAND = 'nagaland',
  ODISHA = 'odisha',
  PUNJAB = 'punjab',
  RAJASTHAN = 'rajasthan',
  SIKKIM = 'sikkim',
  TAMIL_NADU = 'tamil_nadu',
  TELANGANA = 'telangana',
  TRIPURA = 'tripura',
  UTTAR_PRADESH = 'uttar_pradesh',
  UTTARAKHAND = 'uttarakhand',
  WEST_BENGAL = 'west_bengal',
  ANDAMAN_NICOBAR = 'andaman_nicobar',
  CHANDIGARH = 'chandigarh',
  DADRA_NAGAR_HAVELI = 'dadra_nagar_haveli',
  DAMAN_DIU = 'daman_diu',
  DELHI = 'delhi',
  JAMMU_KASHMIR = 'jammu_kashmir',
  LADAKH = 'ladakh',
  LAKSHADWEEP = 'lakshadweep',
  PUDUCHERRY = 'puducherry'
}

/**
 * Business Entity Types
 */
export enum BusinessEntityType {
  SOLE_PROPRIETORSHIP = 'sole_proprietorship',
  PARTNERSHIP = 'partnership',
  LIMITED_LIABILITY_PARTNERSHIP = 'limited_liability_partnership',
  PRIVATE_LIMITED_COMPANY = 'private_limited_company',
  PUBLIC_LIMITED_COMPANY = 'public_limited_company',
  ONE_PERSON_COMPANY = 'one_person_company',
  SECTION_8_COMPANY = 'section_8_company',
  PRODUCER_COMPANY = 'producer_company',
  COOPERATIVE_SOCIETY = 'cooperative_society',
  TRUST = 'trust',
  SOCIETY = 'society',
  HUF = 'huf'
}

/**
 * MSME Categories
 */
export enum MSMECategory {
  MICRO = 'micro',
  SMALL = 'small',
  MEDIUM = 'medium'
}

/**
 * MSME Sectors
 */
export enum MSMESector {
  MANUFACTURING = 'manufacturing',
  SERVICE = 'service',
  TRADING = 'trading'
}

/**
 * Payment Terms
 */
export enum PaymentTerms {
  IMMEDIATE = 'immediate',
  NET_7 = 'net_7',
  NET_15 = 'net_15',
  NET_30 = 'net_30',
  NET_45 = 'net_45',
  NET_60 = 'net_60',
  NET_90 = 'net_90',
  CUSTOM = 'custom'
}

/**
 * Currency Codes (Indian Context)
 */
export enum CurrencyCode {
  INR = 'INR',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  JPY = 'JPY',
  AUD = 'AUD',
  CAD = 'CAD',
  SGD = 'SGD',
  AED = 'AED'
}

/**
 * Legal Jurisdiction
 */
export enum LegalJurisdiction {
  ALL_INDIA = 'all_india',
  STATE_SPECIFIC = 'state_specific',
  HIGH_COURT = 'high_court',
  DISTRICT_COURT = 'district_court',
  SUPREME_COURT = 'supreme_court',
  TRIBUNAL = 'tribunal',
  ARBITRATION = 'arbitration'
}

/**
 * Time Zones (Indian Context)
 */
export enum TimeZone {
  IST = 'Asia/Kolkata',
  UTC = 'UTC',
  EST = 'America/New_York',
  PST = 'America/Los_Angeles',
  GMT = 'Europe/London',
  JST = 'Asia/Tokyo',
  AEST = 'Australia/Sydney'
}

// ============================================================================
// AI and Machine Learning Enums
// ============================================================================

/**
 * AI Model Types
 */
export enum AIModelType {
  DEEPSEEK_R1 = 'deepseek_r1',
  TENSORFLOW = 'tensorflow',
  PYTORCH = 'pytorch',
  SCIKIT_LEARN = 'scikit_learn',
  NATURAL_LANGUAGE = 'natural_language',
  COMPUTER_VISION = 'computer_vision',
  RECOMMENDATION = 'recommendation',
  CLASSIFICATION = 'classification',
  REGRESSION = 'regression',
  CLUSTERING = 'clustering'
}

/**
 * AI Processing Status
 */
export enum AIProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled'
}

/**
 * Machine Learning Task Types
 */
export enum MLTaskType {
  DOCUMENT_CLASSIFICATION = 'document_classification',
  SENTIMENT_ANALYSIS = 'sentiment_analysis',
  ENTITY_EXTRACTION = 'entity_extraction',
  TEXT_SUMMARIZATION = 'text_summarization',
  LANGUAGE_DETECTION = 'language_detection',
  FRAUD_DETECTION = 'fraud_detection',
  RISK_ASSESSMENT = 'risk_assessment',
  PREDICTIVE_ANALYTICS = 'predictive_analytics'
}

// ============================================================================
// Error and Exception Enums
// ============================================================================

/**
 * Error Categories
 */
export enum ErrorCategory {
  VALIDATION_ERROR = 'validation_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  BUSINESS_LOGIC_ERROR = 'business_logic_error',
  INTEGRATION_ERROR = 'integration_error',
  DATABASE_ERROR = 'database_error',
  NETWORK_ERROR = 'network_error',
  SYSTEM_ERROR = 'system_error',
  CONFIGURATION_ERROR = 'configuration_error',
  EXTERNAL_SERVICE_ERROR = 'external_service_error'
}

/**
 * Error Severity Levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  FATAL = 'fatal'
}

/**
 * HTTP Status Codes (Common)
 */
export enum HTTPStatusCode {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504
}

// ============================================================================
// Export all enums for easy access
// ============================================================================

export const LegalComplianceEnums = {
  // MSME Portal
  MSMEPortalEnvironment,
  MSMEComplaintStatus,
  MSMEComplaintType,
  MSMEPortalDocumentType,
  MSMEPortalAuthStatus,
  
  // Legal Providers
  LegalSpecialization,
  LegalProviderStatus,
  LegalProviderAvailability,
  LegalNoticeType,
  LegalNoticeDeliveryMethod,
  LegalNoticeDeliveryStatus,
  LegalServiceType,
  LegalServicePriority,
  
  // Document Generation
  LegalDocumentTemplateCategory,
  DocumentOutputFormat,
  DocumentLanguage,
  DocumentGenerationStatus,
  DigitalSignatureType,
  TemplateComplianceStatus,
  
  // Compliance Monitoring
  ComplianceCategory,
  ComplianceStatus,
  ComplianceRequirementType,
  ComplianceCheckFrequency,
  ComplianceAlertSeverity,
  ComplianceAlertType,
  
  // Integration and System
  IntegrationStatus,
  APIResponseStatus,
  AuditActionType,
  NotificationType,
  NotificationPriority,
  QueueJobStatus,
  CacheStrategy,
  
  // Business Logic
  IndianState,
  BusinessEntityType,
  MSMECategory,
  MSMESector,
  PaymentTerms,
  CurrencyCode,
  LegalJurisdiction,
  TimeZone,
  
  // AI and ML
  AIModelType,
  AIProcessingStatus,
  MLTaskType,
  
  // Error Handling
  ErrorCategory,
  ErrorSeverity,
  HTTPStatusCode
} as const;

