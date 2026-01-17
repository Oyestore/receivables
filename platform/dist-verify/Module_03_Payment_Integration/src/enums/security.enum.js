"use strict";
/**
 * Module 3 Phase 3.1: Advanced Automation Foundation
 * Security Framework Enums
 *
 * Comprehensive enums for security, authentication, authorization,
 * encryption, and compliance management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityTestType = exports.KeyType = exports.SecurityAlertType = exports.RiskLevel = exports.PolicyType = exports.KeyOperation = exports.MFAType = exports.SessionStatus = exports.AuditEventType = exports.SecurityControlType = exports.ThreatLevel = exports.AssessmentType = exports.AccessControlModel = exports.DataClassification = exports.ComplianceFramework = exports.IncidentStatus = exports.IncidentSeverity = exports.IncidentType = exports.EncryptionAlgorithm = exports.Permission = exports.UserRole = exports.AuthorizationLevel = exports.AuthenticationMethod = void 0;
/**
 * Authentication methods
 */
var AuthenticationMethod;
(function (AuthenticationMethod) {
    AuthenticationMethod["USERNAME_PASSWORD"] = "username_password";
    AuthenticationMethod["MULTI_FACTOR"] = "multi_factor";
    AuthenticationMethod["BIOMETRIC"] = "biometric";
    AuthenticationMethod["TOKEN_BASED"] = "token_based";
    AuthenticationMethod["CERTIFICATE"] = "certificate";
    AuthenticationMethod["OAUTH2"] = "oauth2";
    AuthenticationMethod["SAML"] = "saml";
    AuthenticationMethod["LDAP"] = "ldap";
    AuthenticationMethod["ACTIVE_DIRECTORY"] = "active_directory";
    AuthenticationMethod["SINGLE_SIGN_ON"] = "single_sign_on";
    AuthenticationMethod["API_KEY"] = "api_key";
    AuthenticationMethod["JWT"] = "jwt";
})(AuthenticationMethod || (exports.AuthenticationMethod = AuthenticationMethod = {}));
/**
 * Authorization levels
 */
var AuthorizationLevel;
(function (AuthorizationLevel) {
    AuthorizationLevel["NONE"] = "none";
    AuthorizationLevel["READ_ONLY"] = "read_only";
    AuthorizationLevel["READ_WRITE"] = "read_write";
    AuthorizationLevel["ADMIN"] = "admin";
    AuthorizationLevel["SUPER_ADMIN"] = "super_admin";
    AuthorizationLevel["SYSTEM"] = "system";
})(AuthorizationLevel || (exports.AuthorizationLevel = AuthorizationLevel = {}));
/**
 * User roles in the system
 */
var UserRole;
(function (UserRole) {
    // Customer Roles
    UserRole["CUSTOMER"] = "customer";
    UserRole["PREMIUM_CUSTOMER"] = "premium_customer";
    UserRole["ENTERPRISE_CUSTOMER"] = "enterprise_customer";
    // Internal Roles
    UserRole["EMPLOYEE"] = "employee";
    UserRole["MANAGER"] = "manager";
    UserRole["SUPERVISOR"] = "supervisor";
    UserRole["ANALYST"] = "analyst";
    // Administrative Roles
    UserRole["ADMIN"] = "admin";
    UserRole["SUPER_ADMIN"] = "super_admin";
    UserRole["SYSTEM_ADMIN"] = "system_admin";
    UserRole["SECURITY_ADMIN"] = "security_admin";
    // Technical Roles
    UserRole["DEVELOPER"] = "developer";
    UserRole["DEVOPS"] = "devops";
    UserRole["SUPPORT"] = "support";
    UserRole["API_USER"] = "api_user";
    // Business Roles
    UserRole["FINANCE"] = "finance";
    UserRole["ACCOUNTING"] = "accounting";
    UserRole["SALES"] = "sales";
    UserRole["MARKETING"] = "marketing";
    // Compliance Roles
    UserRole["AUDITOR"] = "auditor";
    UserRole["COMPLIANCE_OFFICER"] = "compliance_officer";
    UserRole["RISK_MANAGER"] = "risk_manager";
})(UserRole || (exports.UserRole = UserRole = {}));
/**
 * Permission types for granular access control
 */
var Permission;
(function (Permission) {
    // Invoice Permissions
    Permission["CREATE_INVOICE"] = "create_invoice";
    Permission["READ_INVOICE"] = "read_invoice";
    Permission["UPDATE_INVOICE"] = "update_invoice";
    Permission["DELETE_INVOICE"] = "delete_invoice";
    Permission["APPROVE_INVOICE"] = "approve_invoice";
    // Payment Permissions
    Permission["PROCESS_PAYMENT"] = "process_payment";
    Permission["REFUND_PAYMENT"] = "refund_payment";
    Permission["VIEW_PAYMENT_DETAILS"] = "view_payment_details";
    Permission["MANAGE_PAYMENT_METHODS"] = "manage_payment_methods";
    // Customer Permissions
    Permission["CREATE_CUSTOMER"] = "create_customer";
    Permission["READ_CUSTOMER"] = "read_customer";
    Permission["UPDATE_CUSTOMER"] = "update_customer";
    Permission["DELETE_CUSTOMER"] = "delete_customer";
    Permission["VIEW_CUSTOMER_ANALYTICS"] = "view_customer_analytics";
    // System Permissions
    Permission["MANAGE_USERS"] = "manage_users";
    Permission["MANAGE_ROLES"] = "manage_roles";
    Permission["MANAGE_PERMISSIONS"] = "manage_permissions";
    Permission["VIEW_SYSTEM_LOGS"] = "view_system_logs";
    Permission["MANAGE_CONFIGURATIONS"] = "manage_configurations";
    // Reporting Permissions
    Permission["VIEW_REPORTS"] = "view_reports";
    Permission["CREATE_REPORTS"] = "create_reports";
    Permission["EXPORT_DATA"] = "export_data";
    Permission["VIEW_ANALYTICS"] = "view_analytics";
    // Security Permissions
    Permission["MANAGE_SECURITY_POLICIES"] = "manage_security_policies";
    Permission["VIEW_AUDIT_LOGS"] = "view_audit_logs";
    Permission["MANAGE_ENCRYPTION"] = "manage_encryption";
    Permission["INCIDENT_RESPONSE"] = "incident_response";
})(Permission || (exports.Permission = Permission = {}));
/**
 * Encryption algorithms
 */
var EncryptionAlgorithm;
(function (EncryptionAlgorithm) {
    EncryptionAlgorithm["AES_256_GCM"] = "aes_256_gcm";
    EncryptionAlgorithm["AES_128_GCM"] = "aes_128_gcm";
    EncryptionAlgorithm["RSA_2048"] = "rsa_2048";
    EncryptionAlgorithm["RSA_4096"] = "rsa_4096";
    EncryptionAlgorithm["ECDSA_P256"] = "ecdsa_p256";
    EncryptionAlgorithm["ECDSA_P384"] = "ecdsa_p384";
    EncryptionAlgorithm["CHACHA20_POLY1305"] = "chacha20_poly1305";
    EncryptionAlgorithm["ARGON2ID"] = "argon2id";
    EncryptionAlgorithm["BCRYPT"] = "bcrypt";
    EncryptionAlgorithm["SCRYPT"] = "scrypt";
})(EncryptionAlgorithm || (exports.EncryptionAlgorithm = EncryptionAlgorithm = {}));
/**
 * Security incident types
 */
var IncidentType;
(function (IncidentType) {
    IncidentType["UNAUTHORIZED_ACCESS"] = "unauthorized_access";
    IncidentType["DATA_BREACH"] = "data_breach";
    IncidentType["MALWARE_DETECTION"] = "malware_detection";
    IncidentType["PHISHING_ATTEMPT"] = "phishing_attempt";
    IncidentType["BRUTE_FORCE_ATTACK"] = "brute_force_attack";
    IncidentType["SQL_INJECTION"] = "sql_injection";
    IncidentType["XSS_ATTACK"] = "xss_attack";
    IncidentType["CSRF_ATTACK"] = "csrf_attack";
    IncidentType["DDoS_ATTACK"] = "ddos_attack";
    IncidentType["INSIDER_THREAT"] = "insider_threat";
    IncidentType["COMPLIANCE_VIOLATION"] = "compliance_violation";
    IncidentType["SYSTEM_COMPROMISE"] = "system_compromise";
})(IncidentType || (exports.IncidentType = IncidentType = {}));
/**
 * Security incident severity levels
 */
var IncidentSeverity;
(function (IncidentSeverity) {
    IncidentSeverity["CRITICAL"] = "critical";
    IncidentSeverity["HIGH"] = "high";
    IncidentSeverity["MEDIUM"] = "medium";
    IncidentSeverity["LOW"] = "low";
    IncidentSeverity["INFORMATIONAL"] = "informational";
})(IncidentSeverity || (exports.IncidentSeverity = IncidentSeverity = {}));
/**
 * Security incident status
 */
var IncidentStatus;
(function (IncidentStatus) {
    IncidentStatus["OPEN"] = "open";
    IncidentStatus["INVESTIGATING"] = "investigating";
    IncidentStatus["CONTAINED"] = "contained";
    IncidentStatus["MITIGATED"] = "mitigated";
    IncidentStatus["RESOLVED"] = "resolved";
    IncidentStatus["CLOSED"] = "closed";
    IncidentStatus["FALSE_POSITIVE"] = "false_positive";
})(IncidentStatus || (exports.IncidentStatus = IncidentStatus = {}));
/**
 * Compliance frameworks
 */
var ComplianceFramework;
(function (ComplianceFramework) {
    ComplianceFramework["GDPR"] = "gdpr";
    ComplianceFramework["PCI_DSS"] = "pci_dss";
    ComplianceFramework["SOX"] = "sox";
    ComplianceFramework["HIPAA"] = "hipaa";
    ComplianceFramework["ISO_27001"] = "iso_27001";
    ComplianceFramework["SOC_2"] = "soc_2";
    ComplianceFramework["NIST"] = "nist";
    ComplianceFramework["RBI_GUIDELINES"] = "rbi_guidelines";
    ComplianceFramework["INDIAN_DATA_PROTECTION"] = "indian_data_protection";
    ComplianceFramework["COMPANIES_ACT"] = "companies_act";
})(ComplianceFramework || (exports.ComplianceFramework = ComplianceFramework = {}));
/**
 * Data classification levels
 */
var DataClassification;
(function (DataClassification) {
    DataClassification["PUBLIC"] = "public";
    DataClassification["INTERNAL"] = "internal";
    DataClassification["CONFIDENTIAL"] = "confidential";
    DataClassification["RESTRICTED"] = "restricted";
    DataClassification["TOP_SECRET"] = "top_secret";
})(DataClassification || (exports.DataClassification = DataClassification = {}));
/**
 * Access control models
 */
var AccessControlModel;
(function (AccessControlModel) {
    AccessControlModel["RBAC"] = "rbac";
    AccessControlModel["ABAC"] = "abac";
    AccessControlModel["MAC"] = "mac";
    AccessControlModel["DAC"] = "dac";
    AccessControlModel["PBAC"] = "pbac"; // Policy-Based Access Control
})(AccessControlModel || (exports.AccessControlModel = AccessControlModel = {}));
/**
 * Security assessment types
 */
var AssessmentType;
(function (AssessmentType) {
    AssessmentType["VULNERABILITY_SCAN"] = "vulnerability_scan";
    AssessmentType["PENETRATION_TEST"] = "penetration_test";
    AssessmentType["CODE_REVIEW"] = "code_review";
    AssessmentType["SECURITY_AUDIT"] = "security_audit";
    AssessmentType["COMPLIANCE_ASSESSMENT"] = "compliance_assessment";
    AssessmentType["RISK_ASSESSMENT"] = "risk_assessment";
    AssessmentType["THREAT_MODELING"] = "threat_modeling";
})(AssessmentType || (exports.AssessmentType = AssessmentType = {}));
/**
 * Threat levels
 */
var ThreatLevel;
(function (ThreatLevel) {
    ThreatLevel["VERY_LOW"] = "very_low";
    ThreatLevel["LOW"] = "low";
    ThreatLevel["MEDIUM"] = "medium";
    ThreatLevel["HIGH"] = "high";
    ThreatLevel["VERY_HIGH"] = "very_high";
    ThreatLevel["CRITICAL"] = "critical";
})(ThreatLevel || (exports.ThreatLevel = ThreatLevel = {}));
/**
 * Security control types
 */
var SecurityControlType;
(function (SecurityControlType) {
    SecurityControlType["PREVENTIVE"] = "preventive";
    SecurityControlType["DETECTIVE"] = "detective";
    SecurityControlType["CORRECTIVE"] = "corrective";
    SecurityControlType["DETERRENT"] = "deterrent";
    SecurityControlType["RECOVERY"] = "recovery";
    SecurityControlType["COMPENSATING"] = "compensating";
})(SecurityControlType || (exports.SecurityControlType = SecurityControlType = {}));
/**
 * Audit event types
 */
var AuditEventType;
(function (AuditEventType) {
    AuditEventType["LOGIN"] = "login";
    AuditEventType["LOGOUT"] = "logout";
    AuditEventType["CREATE"] = "create";
    AuditEventType["READ"] = "read";
    AuditEventType["UPDATE"] = "update";
    AuditEventType["DELETE"] = "delete";
    AuditEventType["APPROVE"] = "approve";
    AuditEventType["REJECT"] = "reject";
    AuditEventType["EXPORT"] = "export";
    AuditEventType["IMPORT"] = "import";
    AuditEventType["CONFIGURATION_CHANGE"] = "configuration_change";
    AuditEventType["PERMISSION_CHANGE"] = "permission_change";
    AuditEventType["SECURITY_EVENT"] = "security_event";
})(AuditEventType || (exports.AuditEventType = AuditEventType = {}));
/**
 * Session status
 */
var SessionStatus;
(function (SessionStatus) {
    SessionStatus["ACTIVE"] = "active";
    SessionStatus["EXPIRED"] = "expired";
    SessionStatus["TERMINATED"] = "terminated";
    SessionStatus["LOCKED"] = "locked";
    SessionStatus["SUSPENDED"] = "suspended";
})(SessionStatus || (exports.SessionStatus = SessionStatus = {}));
/**
 * Multi-factor authentication types
 */
var MFAType;
(function (MFAType) {
    MFAType["SMS"] = "sms";
    MFAType["EMAIL"] = "email";
    MFAType["TOTP"] = "totp";
    MFAType["HOTP"] = "hotp";
    MFAType["PUSH_NOTIFICATION"] = "push_notification";
    MFAType["HARDWARE_TOKEN"] = "hardware_token";
    MFAType["BIOMETRIC"] = "biometric";
    MFAType["BACKUP_CODES"] = "backup_codes";
})(MFAType || (exports.MFAType = MFAType = {}));
/**
 * Key management operations
 */
var KeyOperation;
(function (KeyOperation) {
    KeyOperation["GENERATE"] = "generate";
    KeyOperation["ROTATE"] = "rotate";
    KeyOperation["REVOKE"] = "revoke";
    KeyOperation["ARCHIVE"] = "archive";
    KeyOperation["DESTROY"] = "destroy";
    KeyOperation["IMPORT"] = "import";
    KeyOperation["EXPORT"] = "export";
})(KeyOperation || (exports.KeyOperation = KeyOperation = {}));
/**
 * Security policy types
 */
var PolicyType;
(function (PolicyType) {
    PolicyType["PASSWORD_POLICY"] = "password_policy";
    PolicyType["ACCESS_POLICY"] = "access_policy";
    PolicyType["DATA_RETENTION_POLICY"] = "data_retention_policy";
    PolicyType["ENCRYPTION_POLICY"] = "encryption_policy";
    PolicyType["INCIDENT_RESPONSE_POLICY"] = "incident_response_policy";
    PolicyType["BACKUP_POLICY"] = "backup_policy";
    PolicyType["PRIVACY_POLICY"] = "privacy_policy";
})(PolicyType || (exports.PolicyType = PolicyType = {}));
/**
 * Risk levels for risk assessment
 */
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["VERY_LOW"] = "very_low";
    RiskLevel["LOW"] = "low";
    RiskLevel["MEDIUM"] = "medium";
    RiskLevel["HIGH"] = "high";
    RiskLevel["VERY_HIGH"] = "very_high";
    RiskLevel["CRITICAL"] = "critical";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
/**
 * Security monitoring alert types
 */
var SecurityAlertType;
(function (SecurityAlertType) {
    SecurityAlertType["SUSPICIOUS_LOGIN"] = "suspicious_login";
    SecurityAlertType["MULTIPLE_FAILED_LOGINS"] = "multiple_failed_logins";
    SecurityAlertType["UNUSUAL_ACCESS_PATTERN"] = "unusual_access_pattern";
    SecurityAlertType["PRIVILEGE_ESCALATION"] = "privilege_escalation";
    SecurityAlertType["DATA_EXFILTRATION"] = "data_exfiltration";
    SecurityAlertType["MALICIOUS_ACTIVITY"] = "malicious_activity";
    SecurityAlertType["POLICY_VIOLATION"] = "policy_violation";
    SecurityAlertType["SYSTEM_ANOMALY"] = "system_anomaly";
})(SecurityAlertType || (exports.SecurityAlertType = SecurityAlertType = {}));
/**
 * Encryption key types
 */
var KeyType;
(function (KeyType) {
    KeyType["SYMMETRIC"] = "symmetric";
    KeyType["ASYMMETRIC_PUBLIC"] = "asymmetric_public";
    KeyType["ASYMMETRIC_PRIVATE"] = "asymmetric_private";
    KeyType["MASTER_KEY"] = "master_key";
    KeyType["DATA_ENCRYPTION_KEY"] = "data_encryption_key";
    KeyType["KEY_ENCRYPTION_KEY"] = "key_encryption_key";
})(KeyType || (exports.KeyType = KeyType = {}));
/**
 * Security testing types
 */
var SecurityTestType;
(function (SecurityTestType) {
    SecurityTestType["STATIC_ANALYSIS"] = "static_analysis";
    SecurityTestType["DYNAMIC_ANALYSIS"] = "dynamic_analysis";
    SecurityTestType["INTERACTIVE_ANALYSIS"] = "interactive_analysis";
    SecurityTestType["DEPENDENCY_SCAN"] = "dependency_scan";
    SecurityTestType["CONTAINER_SCAN"] = "container_scan";
    SecurityTestType["INFRASTRUCTURE_SCAN"] = "infrastructure_scan";
})(SecurityTestType || (exports.SecurityTestType = SecurityTestType = {}));
//# sourceMappingURL=security.enum.js.map