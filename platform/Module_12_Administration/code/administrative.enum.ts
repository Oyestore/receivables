/**
 * Comprehensive Administrative Enums for SME Receivables Management Platform
 * 2-tier Hierarchical Administrative Module - Phase 1 Foundation
 * 
 * @fileoverview Defines all enumeration types used across the administrative module
 * @version 1.0.0
 * @since 2025-01-21
 */

/**
 * Tenant status enumeration for lifecycle management
 */
export enum TenantStatus {
  PROVISIONING = 'provisioning',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
  PENDING_ACTIVATION = 'pending_activation',
  UNDER_REVIEW = 'under_review',
  MIGRATION_IN_PROGRESS = 'migration_in_progress'
}

/**
 * User status enumeration for account lifecycle
 */
export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
  LOCKED = 'locked',
  PASSWORD_EXPIRED = 'password_expired',
  PENDING_VERIFICATION = 'pending_verification'
}

/**
 * Subscription plan types for billing and access control
 */
export enum SubscriptionPlanType {
  SUBSCRIPTION = 'subscription',
  USAGE = 'usage',
  HYBRID = 'hybrid',
  ENTERPRISE = 'enterprise',
  TRIAL = 'trial',
  FREEMIUM = 'freemium'
}

/**
 * Billing cycle enumeration for subscription management
 */
export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
  USAGE_BASED = 'usage_based',
  ONE_TIME = 'one_time'
}

/**
 * Contact types for tenant organization management
 */
export enum ContactType {
  PRIMARY = 'primary',
  BILLING = 'billing',
  TECHNICAL = 'technical',
  LEGAL = 'legal',
  COMPLIANCE = 'compliance',
  EMERGENCY = 'emergency'
}

/**
 * Role types for access control and permission management
 */
export enum RoleType {
  SYSTEM = 'system',
  CUSTOM = 'custom',
  INHERITED = 'inherited',
  TEMPORARY = 'temporary',
  DELEGATED = 'delegated'
}

/**
 * Permission actions for granular access control
 */
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  APPROVE = 'approve',
  EXPORT = 'export',
  IMPORT = 'import',
  CONFIGURE = 'configure',
  MONITOR = 'monitor'
}

/**
 * Access levels for module and feature control
 */
export enum AccessLevel {
  NONE = 'none',
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
  OWNER = 'owner'
}

/**
 * Platform modules enumeration for access control
 */
export enum PlatformModule {
  INVOICE_GENERATION = 'invoice_generation',
  CUSTOMER_RELATIONSHIP = 'customer_relationship',
  PAYMENT_INTEGRATION = 'payment_integration',
  FINANCIAL_ANALYTICS = 'financial_analytics',
  CREDIT_RATING = 'credit_rating',
  WORKFLOW_AUTOMATION = 'workflow_automation',
  DOCUMENT_MANAGEMENT = 'document_management',
  LEGAL_COMPLIANCE = 'legal_compliance',
  COMMUNICATION_HUB = 'communication_hub',
  BUSINESS_INTELLIGENCE = 'business_intelligence',
  ADMINISTRATIVE_HUB = 'administrative_hub'
}

/**
 * Audit action types for comprehensive logging
 */
export enum AuditAction {
  // User Management Actions
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_ACTIVATED = 'user_activated',
  USER_DEACTIVATED = 'user_deactivated',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_PASSWORD_CHANGED = 'user_password_changed',
  USER_MFA_ENABLED = 'user_mfa_enabled',
  USER_MFA_DISABLED = 'user_mfa_disabled',
  
  // Tenant Management Actions
  TENANT_CREATED = 'tenant_created',
  TENANT_UPDATED = 'tenant_updated',
  TENANT_ACTIVATED = 'tenant_activated',
  TENANT_SUSPENDED = 'tenant_suspended',
  TENANT_TERMINATED = 'tenant_terminated',
  TENANT_CONFIGURATION_CHANGED = 'tenant_configuration_changed',
  
  // Role and Permission Actions
  ROLE_CREATED = 'role_created',
  ROLE_UPDATED = 'role_updated',
  ROLE_DELETED = 'role_deleted',
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_UNASSIGNED = 'role_unassigned',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  
  // Access Control Actions
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  ACCESS_ATTEMPTED = 'access_attempted',
  
  // Billing Actions
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  PAYMENT_PROCESSED = 'payment_processed',
  PAYMENT_FAILED = 'payment_failed',
  INVOICE_GENERATED = 'invoice_generated',
  
  // Security Actions
  SECURITY_VIOLATION = 'security_violation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  AUTHENTICATION_FAILED = 'authentication_failed',
  AUTHORIZATION_FAILED = 'authorization_failed',
  
  // System Actions
  SYSTEM_CONFIGURATION_CHANGED = 'system_configuration_changed',
  BACKUP_CREATED = 'backup_created',
  BACKUP_RESTORED = 'backup_restored',
  MAINTENANCE_STARTED = 'maintenance_started',
  MAINTENANCE_COMPLETED = 'maintenance_completed'
}

/**
 * Compliance status enumeration for regulatory management
 */
export enum ComplianceStatus {
  PENDING = 'pending',
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  UNDER_REVIEW = 'under_review',
  REMEDIATION_REQUIRED = 'remediation_required',
  EXEMPTED = 'exempted'
}

/**
 * Data residency options for tenant configuration
 */
export enum DataResidency {
  DEFAULT = 'default',
  INDIA = 'india',
  SINGAPORE = 'singapore',
  UAE = 'uae',
  US_EAST = 'us_east',
  EU_WEST = 'eu_west',
  CUSTOM = 'custom'
}

/**
 * Business types for tenant categorization
 */
export enum BusinessType {
  SOLE_PROPRIETORSHIP = 'sole_proprietorship',
  PARTNERSHIP = 'partnership',
  PRIVATE_LIMITED = 'private_limited',
  PUBLIC_LIMITED = 'public_limited',
  LLP = 'llp',
  TRUST = 'trust',
  SOCIETY = 'society',
  COOPERATIVE = 'cooperative',
  GOVERNMENT = 'government',
  NGO = 'ngo'
}

/**
 * Integration types for external system connectivity
 */
export enum IntegrationType {
  ACCOUNTING_SOFTWARE = 'accounting_software',
  PAYMENT_GATEWAY = 'payment_gateway',
  BANKING_API = 'banking_api',
  ERP_SYSTEM = 'erp_system',
  CRM_SYSTEM = 'crm_system',
  IDENTITY_PROVIDER = 'identity_provider',
  NOTIFICATION_SERVICE = 'notification_service',
  ANALYTICS_PLATFORM = 'analytics_platform'
}

/**
 * Notification types for system communications
 */
export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  TEAMS = 'teams'
}

/**
 * Priority levels for various operations
 */
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

/**
 * Environment types for deployment and configuration
 */
export enum Environment {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  STAGING = 'staging',
  PRODUCTION = 'production',
  SANDBOX = 'sandbox'
}

/**
 * Currency codes for international billing support
 */
export enum Currency {
  USD = 'USD',
  INR = 'INR',
  EUR = 'EUR',
  GBP = 'GBP',
  SGD = 'SGD',
  AED = 'AED',
  CAD = 'CAD',
  AUD = 'AUD'
}

/**
 * Time zones for global operations
 */
export enum TimeZone {
  UTC = 'UTC',
  IST = 'Asia/Kolkata',
  EST = 'America/New_York',
  PST = 'America/Los_Angeles',
  GMT = 'Europe/London',
  CET = 'Europe/Paris',
  JST = 'Asia/Tokyo',
  SGT = 'Asia/Singapore'
}

/**
 * Log levels for application logging
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose'
}

/**
 * API rate limit types for throttling
 */
export enum RateLimitType {
  PER_SECOND = 'per_second',
  PER_MINUTE = 'per_minute',
  PER_HOUR = 'per_hour',
  PER_DAY = 'per_day',
  PER_MONTH = 'per_month'
}

/**
 * Cache types for performance optimization
 */
export enum CacheType {
  MEMORY = 'memory',
  REDIS = 'redis',
  DATABASE = 'database',
  CDN = 'cdn'
}

/**
 * Backup types for data protection
 */
export enum BackupType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  DIFFERENTIAL = 'differential',
  SNAPSHOT = 'snapshot'
}

/**
 * Deployment status for release management
 */
export enum DeploymentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

/**
 * Health check status for system monitoring
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

/**
 * Feature flag status for gradual rollouts
 */
export enum FeatureFlag {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  BETA = 'beta',
  DEPRECATED = 'deprecated'
}

