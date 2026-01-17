/**
 * Module 3 Phase 3.1: Advanced Automation Foundation
 * Security Framework Enums
 * 
 * Comprehensive enums for security, authentication, authorization,
 * encryption, and compliance management
 */

/**
 * Authentication methods
 */
export enum AuthenticationMethod {
  USERNAME_PASSWORD = 'username_password',
  MULTI_FACTOR = 'multi_factor',
  BIOMETRIC = 'biometric',
  TOKEN_BASED = 'token_based',
  CERTIFICATE = 'certificate',
  OAUTH2 = 'oauth2',
  SAML = 'saml',
  LDAP = 'ldap',
  ACTIVE_DIRECTORY = 'active_directory',
  SINGLE_SIGN_ON = 'single_sign_on',
  API_KEY = 'api_key',
  JWT = 'jwt'
}

/**
 * Authorization levels
 */
export enum AuthorizationLevel {
  NONE = 'none',
  READ_ONLY = 'read_only',
  READ_WRITE = 'read_write',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  SYSTEM = 'system'
}

/**
 * User roles in the system
 */
export enum UserRole {
  // Customer Roles
  CUSTOMER = 'customer',
  PREMIUM_CUSTOMER = 'premium_customer',
  ENTERPRISE_CUSTOMER = 'enterprise_customer',
  
  // Internal Roles
  EMPLOYEE = 'employee',
  MANAGER = 'manager',
  SUPERVISOR = 'supervisor',
  ANALYST = 'analyst',
  
  // Administrative Roles
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  SYSTEM_ADMIN = 'system_admin',
  SECURITY_ADMIN = 'security_admin',
  
  // Technical Roles
  DEVELOPER = 'developer',
  DEVOPS = 'devops',
  SUPPORT = 'support',
  API_USER = 'api_user',
  
  // Business Roles
  FINANCE = 'finance',
  ACCOUNTING = 'accounting',
  SALES = 'sales',
  MARKETING = 'marketing',
  
  // Compliance Roles
  AUDITOR = 'auditor',
  COMPLIANCE_OFFICER = 'compliance_officer',
  RISK_MANAGER = 'risk_manager'
}

/**
 * Permission types for granular access control
 */
export enum Permission {
  // Invoice Permissions
  CREATE_INVOICE = 'create_invoice',
  READ_INVOICE = 'read_invoice',
  UPDATE_INVOICE = 'update_invoice',
  DELETE_INVOICE = 'delete_invoice',
  APPROVE_INVOICE = 'approve_invoice',
  
  // Payment Permissions
  PROCESS_PAYMENT = 'process_payment',
  REFUND_PAYMENT = 'refund_payment',
  VIEW_PAYMENT_DETAILS = 'view_payment_details',
  MANAGE_PAYMENT_METHODS = 'manage_payment_methods',
  
  // Customer Permissions
  CREATE_CUSTOMER = 'create_customer',
  READ_CUSTOMER = 'read_customer',
  UPDATE_CUSTOMER = 'update_customer',
  DELETE_CUSTOMER = 'delete_customer',
  VIEW_CUSTOMER_ANALYTICS = 'view_customer_analytics',
  
  // System Permissions
  MANAGE_USERS = 'manage_users',
  MANAGE_ROLES = 'manage_roles',
  MANAGE_PERMISSIONS = 'manage_permissions',
  VIEW_SYSTEM_LOGS = 'view_system_logs',
  MANAGE_CONFIGURATIONS = 'manage_configurations',
  
  // Reporting Permissions
  VIEW_REPORTS = 'view_reports',
  CREATE_REPORTS = 'create_reports',
  EXPORT_DATA = 'export_data',
  VIEW_ANALYTICS = 'view_analytics',
  
  // Security Permissions
  MANAGE_SECURITY_POLICIES = 'manage_security_policies',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  MANAGE_ENCRYPTION = 'manage_encryption',
  INCIDENT_RESPONSE = 'incident_response'
}

/**
 * Encryption algorithms
 */
export enum EncryptionAlgorithm {
  AES_256_GCM = 'aes_256_gcm',
  AES_128_GCM = 'aes_128_gcm',
  RSA_2048 = 'rsa_2048',
  RSA_4096 = 'rsa_4096',
  ECDSA_P256 = 'ecdsa_p256',
  ECDSA_P384 = 'ecdsa_p384',
  CHACHA20_POLY1305 = 'chacha20_poly1305',
  ARGON2ID = 'argon2id',
  BCRYPT = 'bcrypt',
  SCRYPT = 'scrypt'
}

/**
 * Security incident types
 */
export enum IncidentType {
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_BREACH = 'data_breach',
  MALWARE_DETECTION = 'malware_detection',
  PHISHING_ATTEMPT = 'phishing_attempt',
  BRUTE_FORCE_ATTACK = 'brute_force_attack',
  SQL_INJECTION = 'sql_injection',
  XSS_ATTACK = 'xss_attack',
  CSRF_ATTACK = 'csrf_attack',
  DDoS_ATTACK = 'ddos_attack',
  INSIDER_THREAT = 'insider_threat',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  SYSTEM_COMPROMISE = 'system_compromise'
}

/**
 * Security incident severity levels
 */
export enum IncidentSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFORMATIONAL = 'informational'
}

/**
 * Security incident status
 */
export enum IncidentStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  CONTAINED = 'contained',
  MITIGATED = 'mitigated',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  FALSE_POSITIVE = 'false_positive'
}

/**
 * Compliance frameworks
 */
export enum ComplianceFramework {
  GDPR = 'gdpr',
  PCI_DSS = 'pci_dss',
  SOX = 'sox',
  HIPAA = 'hipaa',
  ISO_27001 = 'iso_27001',
  SOC_2 = 'soc_2',
  NIST = 'nist',
  RBI_GUIDELINES = 'rbi_guidelines',
  INDIAN_DATA_PROTECTION = 'indian_data_protection',
  COMPANIES_ACT = 'companies_act'
}

/**
 * Data classification levels
 */
export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  TOP_SECRET = 'top_secret'
}

/**
 * Access control models
 */
export enum AccessControlModel {
  RBAC = 'rbac', // Role-Based Access Control
  ABAC = 'abac', // Attribute-Based Access Control
  MAC = 'mac',   // Mandatory Access Control
  DAC = 'dac',   // Discretionary Access Control
  PBAC = 'pbac'  // Policy-Based Access Control
}

/**
 * Security assessment types
 */
export enum AssessmentType {
  VULNERABILITY_SCAN = 'vulnerability_scan',
  PENETRATION_TEST = 'penetration_test',
  CODE_REVIEW = 'code_review',
  SECURITY_AUDIT = 'security_audit',
  COMPLIANCE_ASSESSMENT = 'compliance_assessment',
  RISK_ASSESSMENT = 'risk_assessment',
  THREAT_MODELING = 'threat_modeling'
}

/**
 * Threat levels
 */
export enum ThreatLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
  CRITICAL = 'critical'
}

/**
 * Security control types
 */
export enum SecurityControlType {
  PREVENTIVE = 'preventive',
  DETECTIVE = 'detective',
  CORRECTIVE = 'corrective',
  DETERRENT = 'deterrent',
  RECOVERY = 'recovery',
  COMPENSATING = 'compensating'
}

/**
 * Audit event types
 */
export enum AuditEventType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  EXPORT = 'export',
  IMPORT = 'import',
  CONFIGURATION_CHANGE = 'configuration_change',
  PERMISSION_CHANGE = 'permission_change',
  SECURITY_EVENT = 'security_event'
}

/**
 * Session status
 */
export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
  LOCKED = 'locked',
  SUSPENDED = 'suspended'
}

/**
 * Multi-factor authentication types
 */
export enum MFAType {
  SMS = 'sms',
  EMAIL = 'email',
  TOTP = 'totp', // Time-based One-Time Password
  HOTP = 'hotp', // HMAC-based One-Time Password
  PUSH_NOTIFICATION = 'push_notification',
  HARDWARE_TOKEN = 'hardware_token',
  BIOMETRIC = 'biometric',
  BACKUP_CODES = 'backup_codes'
}

/**
 * Key management operations
 */
export enum KeyOperation {
  GENERATE = 'generate',
  ROTATE = 'rotate',
  REVOKE = 'revoke',
  ARCHIVE = 'archive',
  DESTROY = 'destroy',
  IMPORT = 'import',
  EXPORT = 'export'
}

/**
 * Security policy types
 */
export enum PolicyType {
  PASSWORD_POLICY = 'password_policy',
  ACCESS_POLICY = 'access_policy',
  DATA_RETENTION_POLICY = 'data_retention_policy',
  ENCRYPTION_POLICY = 'encryption_policy',
  INCIDENT_RESPONSE_POLICY = 'incident_response_policy',
  BACKUP_POLICY = 'backup_policy',
  PRIVACY_POLICY = 'privacy_policy'
}

/**
 * Risk levels for risk assessment
 */
export enum RiskLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
  CRITICAL = 'critical'
}

/**
 * Security monitoring alert types
 */
export enum SecurityAlertType {
  SUSPICIOUS_LOGIN = 'suspicious_login',
  MULTIPLE_FAILED_LOGINS = 'multiple_failed_logins',
  UNUSUAL_ACCESS_PATTERN = 'unusual_access_pattern',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  DATA_EXFILTRATION = 'data_exfiltration',
  MALICIOUS_ACTIVITY = 'malicious_activity',
  POLICY_VIOLATION = 'policy_violation',
  SYSTEM_ANOMALY = 'system_anomaly'
}

/**
 * Encryption key types
 */
export enum KeyType {
  SYMMETRIC = 'symmetric',
  ASYMMETRIC_PUBLIC = 'asymmetric_public',
  ASYMMETRIC_PRIVATE = 'asymmetric_private',
  MASTER_KEY = 'master_key',
  DATA_ENCRYPTION_KEY = 'data_encryption_key',
  KEY_ENCRYPTION_KEY = 'key_encryption_key'
}

/**
 * Security testing types
 */
export enum SecurityTestType {
  STATIC_ANALYSIS = 'static_analysis',
  DYNAMIC_ANALYSIS = 'dynamic_analysis',
  INTERACTIVE_ANALYSIS = 'interactive_analysis',
  DEPENDENCY_SCAN = 'dependency_scan',
  CONTAINER_SCAN = 'container_scan',
  INFRASTRUCTURE_SCAN = 'infrastructure_scan'
}

