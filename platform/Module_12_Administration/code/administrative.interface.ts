/**
 * Comprehensive Administrative Interfaces for SME Receivables Management Platform
 * 2-tier Hierarchical Administrative Module - Phase 1 Foundation
 * 
 * @fileoverview Defines all interface types used across the administrative module
 * @version 1.0.0
 * @since 2025-01-21
 */

import {
  TenantStatus,
  UserStatus,
  SubscriptionPlanType,
  BillingCycle,
  ContactType,
  RoleType,
  PermissionAction,
  AccessLevel,
  PlatformModule,
  AuditAction,
  ComplianceStatus,
  DataResidency,
  BusinessType,
  IntegrationType,
  NotificationType,
  Priority,
  Environment,
  Currency,
  TimeZone,
  LogLevel,
  RateLimitType,
  CacheType,
  BackupType,
  DeploymentStatus,
  HealthStatus,
  FeatureFlag
} from '../enums/administrative.enum';

/**
 * Base interface for all entities with common fields
 */
export interface BaseEntity {
  id: string;
  createdDate: Date;
  updatedDate: Date;
  createdBy: string;
  updatedBy?: string;
  version: number;
  metadata?: Record<string, any>;
}

/**
 * Tenant organization interface for platform-level management
 */
export interface ITenant extends BaseEntity {
  tenantId: string;
  organizationName: string;
  businessType: BusinessType;
  status: TenantStatus;
  subscriptionPlanId: string;
  activatedDate?: Date;
  lastActivity?: Date;
  complianceStatus: ComplianceStatus;
  dataResidency: DataResidency;
  customDomain?: string;
  resourceLimits: IResourceLimits;
  configuration: ITenantConfiguration;
  contacts: ITenantContact[];
  subscriptionPlan?: ISubscriptionPlan;
}

/**
 * Tenant contact information interface
 */
export interface ITenantContact extends BaseEntity {
  tenantId: string;
  contactType: ContactType;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  isPrimary: boolean;
}

/**
 * Resource limits interface for tenant capacity management
 */
export interface IResourceLimits {
  maxUsers: number;
  maxStorage: number; // in GB
  maxApiCalls: number; // per month
  maxComputeHours: number; // per month
  maxIntegrations: number;
  maxCustomFields: number;
  maxWorkflows: number;
  maxReports: number;
}

/**
 * Tenant configuration interface for customization
 */
export interface ITenantConfiguration {
  branding: IBrandingConfiguration;
  security: ISecurityConfiguration;
  features: IFeatureConfiguration;
  integrations: IIntegrationConfiguration;
  notifications: INotificationConfiguration;
  compliance: IComplianceConfiguration;
}

/**
 * Branding configuration interface
 */
export interface IBrandingConfiguration {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  customCss?: string;
  favicon?: string;
  companyName?: string;
  tagline?: string;
}

/**
 * Security configuration interface
 */
export interface ISecurityConfiguration {
  mfaRequired: boolean;
  passwordPolicy: IPasswordPolicy;
  sessionTimeout: number; // in minutes
  ipWhitelist?: string[];
  allowedDomains?: string[];
  ssoEnabled: boolean;
  ssoProvider?: string;
  auditRetention: number; // in days
}

/**
 * Password policy interface
 */
export interface IPasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // in days
  historyCount: number;
  lockoutThreshold: number;
  lockoutDuration: number; // in minutes
}

/**
 * Feature configuration interface
 */
export interface IFeatureConfiguration {
  enabledModules: PlatformModule[];
  moduleConfigurations: Record<PlatformModule, IModuleConfiguration>;
  featureFlags: Record<string, FeatureFlag>;
  customizations: Record<string, any>;
}

/**
 * Module configuration interface
 */
export interface IModuleConfiguration {
  enabled: boolean;
  accessLevel: AccessLevel;
  features: string[];
  limits: Record<string, number>;
  settings: Record<string, any>;
}

/**
 * Integration configuration interface
 */
export interface IIntegrationConfiguration {
  enabledIntegrations: IntegrationType[];
  integrationSettings: Record<IntegrationType, IIntegrationSettings>;
  webhookEndpoints: IWebhookEndpoint[];
  apiKeys: Record<string, string>;
}

/**
 * Integration settings interface
 */
export interface IIntegrationSettings {
  enabled: boolean;
  configuration: Record<string, any>;
  credentials: Record<string, string>;
  endpoints: Record<string, string>;
  rateLimits: Record<RateLimitType, number>;
}

/**
 * Webhook endpoint interface
 */
export interface IWebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  retryPolicy: IRetryPolicy;
}

/**
 * Retry policy interface
 */
export interface IRetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  maxBackoffTime: number;
  retryableStatusCodes: number[];
}

/**
 * Notification configuration interface
 */
export interface INotificationConfiguration {
  enabledChannels: NotificationType[];
  channelSettings: Record<NotificationType, INotificationChannelSettings>;
  templates: Record<string, INotificationTemplate>;
  preferences: INotificationPreferences;
}

/**
 * Notification channel settings interface
 */
export interface INotificationChannelSettings {
  enabled: boolean;
  configuration: Record<string, any>;
  rateLimits: Record<RateLimitType, number>;
  templates: string[];
}

/**
 * Notification template interface
 */
export interface INotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  channels: NotificationType[];
}

/**
 * Notification preferences interface
 */
export interface INotificationPreferences {
  defaultChannel: NotificationType;
  urgentChannel: NotificationType;
  quietHours: IQuietHours;
  frequency: Record<string, string>;
}

/**
 * Quiet hours interface
 */
export interface IQuietHours {
  enabled: boolean;
  startTime: string;
  endTime: string;
  timeZone: TimeZone;
  exceptions: string[];
}

/**
 * Compliance configuration interface
 */
export interface IComplianceConfiguration {
  frameworks: string[];
  dataRetention: IDataRetentionPolicy;
  auditSettings: IAuditSettings;
  privacySettings: IPrivacySettings;
  reportingSettings: IReportingSettings;
}

/**
 * Data retention policy interface
 */
export interface IDataRetentionPolicy {
  defaultRetention: number; // in days
  categoryRetention: Record<string, number>;
  archivalSettings: IArchivalSettings;
  deletionSettings: IDeletionSettings;
}

/**
 * Archival settings interface
 */
export interface IArchivalSettings {
  enabled: boolean;
  archiveAfter: number; // in days
  archiveLocation: string;
  compressionEnabled: boolean;
}

/**
 * Deletion settings interface
 */
export interface IDeletionSettings {
  enabled: boolean;
  deleteAfter: number; // in days
  secureDelete: boolean;
  approvalRequired: boolean;
}

/**
 * Audit settings interface
 */
export interface IAuditSettings {
  enabled: boolean;
  logLevel: LogLevel;
  includedActions: AuditAction[];
  excludedActions: AuditAction[];
  realTimeMonitoring: boolean;
  alertThresholds: Record<string, number>;
}

/**
 * Privacy settings interface
 */
export interface IPrivacySettings {
  dataMinimization: boolean;
  consentManagement: boolean;
  rightToErasure: boolean;
  dataPortability: boolean;
  anonymization: IAnonymizationSettings;
}

/**
 * Anonymization settings interface
 */
export interface IAnonymizationSettings {
  enabled: boolean;
  techniques: string[];
  schedule: string;
  retainStructure: boolean;
}

/**
 * Reporting settings interface
 */
export interface IReportingSettings {
  automaticReports: boolean;
  reportSchedule: string;
  reportRecipients: string[];
  reportFormats: string[];
  customReports: ICustomReport[];
}

/**
 * Custom report interface
 */
export interface ICustomReport {
  id: string;
  name: string;
  description: string;
  query: string;
  schedule: string;
  recipients: string[];
  format: string;
}

/**
 * Subscription plan interface for billing management
 */
export interface ISubscriptionPlan extends BaseEntity {
  planId: string;
  planName: string;
  planType: SubscriptionPlanType;
  status: string;
  basePrice: number;
  currency: Currency;
  billingCycle: BillingCycle;
  effectiveDate?: Date;
  expirationDate?: Date;
  featureSet: IFeatureSet;
  usageLimits: IUsageLimits;
  pricingRules: IPricingRules;
  targetSegments: string[];
}

/**
 * Feature set interface for plan capabilities
 */
export interface IFeatureSet {
  modules: PlatformModule[];
  features: Record<PlatformModule, string[]>;
  limits: Record<string, number>;
  restrictions: Record<string, any>;
}

/**
 * Usage limits interface for plan constraints
 */
export interface IUsageLimits {
  users: number;
  storage: number;
  apiCalls: number;
  computeHours: number;
  integrations: number;
  customFields: number;
  workflows: number;
  reports: number;
}

/**
 * Pricing rules interface for dynamic pricing
 */
export interface IPricingRules {
  baseRules: IPricingRule[];
  usageRules: IPricingRule[];
  discountRules: IDiscountRule[];
  overageRules: IPricingRule[];
}

/**
 * Pricing rule interface
 */
export interface IPricingRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  value: number;
  unit: string;
  priority: number;
}

/**
 * Discount rule interface
 */
export interface IDiscountRule {
  id: string;
  name: string;
  type: string;
  value: number;
  conditions: string[];
  validFrom: Date;
  validTo: Date;
  maxUsage?: number;
}

/**
 * User interface for tenant-level user management
 */
export interface IUser extends BaseEntity {
  userId: string;
  tenantId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  employeeId?: string;
  status: UserStatus;
  activatedDate?: Date;
  lastLogin?: Date;
  passwordHash: string;
  passwordChangedDate?: Date;
  mfaEnabled: boolean;
  mfaSecret?: string;
  preferences: IUserPreferences;
  roles: IUserRole[];
}

/**
 * User preferences interface
 */
export interface IUserPreferences {
  language: string;
  timeZone: TimeZone;
  dateFormat: string;
  timeFormat: string;
  theme: string;
  notifications: IUserNotificationPreferences;
  dashboard: IDashboardPreferences;
}

/**
 * User notification preferences interface
 */
export interface IUserNotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  frequency: string;
  categories: Record<string, boolean>;
}

/**
 * Dashboard preferences interface
 */
export interface IDashboardPreferences {
  layout: string;
  widgets: IDashboardWidget[];
  refreshInterval: number;
  defaultView: string;
}

/**
 * Dashboard widget interface
 */
export interface IDashboardWidget {
  id: string;
  type: string;
  position: IWidgetPosition;
  configuration: Record<string, any>;
  dataSource: string;
}

/**
 * Widget position interface
 */
export interface IWidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Role interface for access control
 */
export interface IRole extends BaseEntity {
  roleId: string;
  tenantId: string;
  roleName: string;
  roleDescription?: string;
  roleType: RoleType;
  isSystemRole: boolean;
  permissions: IPermission[];
  conditions: IRoleCondition[];
  inheritance: IRoleInheritance;
}

/**
 * Permission interface for granular access control
 */
export interface IPermission {
  id: string;
  module: PlatformModule;
  actions: PermissionAction[];
  scope: IPermissionScope;
  conditions: IPermissionCondition[];
}

/**
 * Permission scope interface
 */
export interface IPermissionScope {
  type: string;
  resources: string[];
  filters: Record<string, any>;
  restrictions: Record<string, any>;
}

/**
 * Permission condition interface
 */
export interface IPermissionCondition {
  type: string;
  operator: string;
  value: any;
  context: Record<string, any>;
}

/**
 * Role condition interface
 */
export interface IRoleCondition {
  type: string;
  expression: string;
  parameters: Record<string, any>;
  priority: number;
}

/**
 * Role inheritance interface
 */
export interface IRoleInheritance {
  parentRoles: string[];
  childRoles: string[];
  inheritanceType: string;
  restrictions: Record<string, any>;
}

/**
 * User role assignment interface
 */
export interface IUserRole extends BaseEntity {
  assignmentId: string;
  userId: string;
  roleId: string;
  assignedBy: string;
  effectiveDate: Date;
  expirationDate?: Date;
  isActive: boolean;
  conditions: IRoleAssignmentCondition[];
  role?: IRole;
}

/**
 * Role assignment condition interface
 */
export interface IRoleAssignmentCondition {
  type: string;
  value: any;
  context: Record<string, any>;
}

/**
 * Audit log interface for comprehensive tracking
 */
export interface IAuditLog extends BaseEntity {
  logId: string;
  tenantId?: string;
  userId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  timestamp: Date;
  severity: Priority;
  outcome: string;
  duration?: number;
}

/**
 * Session interface for user session management
 */
export interface IUserSession extends BaseEntity {
  sessionId: string;
  userId: string;
  tenantId: string;
  sessionToken: string;
  ipAddress?: string;
  userAgent?: string;
  expiresDate: Date;
  isActive: boolean;
  lastActivity: Date;
  deviceInfo: IDeviceInfo;
}

/**
 * Device information interface
 */
export interface IDeviceInfo {
  deviceType: string;
  operatingSystem: string;
  browser: string;
  location?: ILocationInfo;
  fingerprint: string;
}

/**
 * Location information interface
 */
export interface ILocationInfo {
  country: string;
  region: string;
  city: string;
  latitude?: number;
  longitude?: number;
  timezone: TimeZone;
}

/**
 * Billing information interface
 */
export interface IBillingInfo {
  tenantId: string;
  subscriptionId: string;
  currentBalance: number;
  currency: Currency;
  nextBillingDate: Date;
  paymentStatus: string;
  paymentMethod: IPaymentMethod;
  billingAddress: IBillingAddress;
  invoices: IInvoice[];
  usageMetrics: IUsageMetrics;
}

/**
 * Payment method interface
 */
export interface IPaymentMethod {
  id: string;
  type: string;
  details: Record<string, any>;
  isDefault: boolean;
  expiryDate?: Date;
  lastUsed?: Date;
}

/**
 * Billing address interface
 */
export interface IBillingAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  taxId?: string;
}

/**
 * Invoice interface
 */
export interface IInvoice {
  invoiceId: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  amount: number;
  currency: Currency;
  status: string;
  lineItems: IInvoiceLineItem[];
  taxes: ITaxItem[];
  payments: IPayment[];
}

/**
 * Invoice line item interface
 */
export interface IInvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxable: boolean;
  period?: IPeriod;
}

/**
 * Tax item interface
 */
export interface ITaxItem {
  id: string;
  name: string;
  rate: number;
  amount: number;
  type: string;
}

/**
 * Payment interface
 */
export interface IPayment {
  paymentId: string;
  amount: number;
  currency: Currency;
  paymentDate: Date;
  paymentMethod: string;
  status: string;
  transactionId: string;
}

/**
 * Period interface for billing periods
 */
export interface IPeriod {
  startDate: Date;
  endDate: Date;
  description: string;
}

/**
 * Usage metrics interface
 */
export interface IUsageMetrics {
  period: IPeriod;
  metrics: Record<string, IUsageMetric>;
  aggregations: Record<string, number>;
  trends: Record<string, ITrend>;
}

/**
 * Usage metric interface
 */
export interface IUsageMetric {
  name: string;
  value: number;
  unit: string;
  limit?: number;
  percentage?: number;
  trend: string;
}

/**
 * Trend interface
 */
export interface ITrend {
  direction: string;
  percentage: number;
  period: string;
  significance: string;
}

/**
 * API request context interface
 */
export interface IRequestContext {
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  requestId: string;
  correlationId?: string;
}

/**
 * API response interface
 */
export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: IApiError;
  metadata?: IResponseMetadata;
}

/**
 * API error interface
 */
export interface IApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  requestId: string;
}

/**
 * Response metadata interface
 */
export interface IResponseMetadata {
  requestId: string;
  timestamp: Date;
  duration: number;
  version: string;
  pagination?: IPagination;
}

/**
 * Pagination interface
 */
export interface IPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Search criteria interface
 */
export interface ISearchCriteria {
  query?: string;
  filters?: Record<string, any>;
  sorting?: ISortCriteria[];
  pagination?: IPaginationCriteria;
}

/**
 * Sort criteria interface
 */
export interface ISortCriteria {
  field: string;
  direction: 'asc' | 'desc';
  priority?: number;
}

/**
 * Pagination criteria interface
 */
export interface IPaginationCriteria {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * Configuration interface for system settings
 */
export interface ISystemConfiguration {
  environment: Environment;
  version: string;
  features: Record<string, FeatureFlag>;
  limits: ISystemLimits;
  security: ISystemSecurity;
  monitoring: ISystemMonitoring;
  backup: IBackupConfiguration;
}

/**
 * System limits interface
 */
export interface ISystemLimits {
  maxTenants: number;
  maxUsersPerTenant: number;
  maxApiCallsPerMinute: number;
  maxStoragePerTenant: number;
  maxConcurrentSessions: number;
}

/**
 * System security interface
 */
export interface ISystemSecurity {
  encryptionAlgorithm: string;
  keyRotationInterval: number;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
}

/**
 * System monitoring interface
 */
export interface ISystemMonitoring {
  metricsEnabled: boolean;
  loggingLevel: LogLevel;
  alertingEnabled: boolean;
  healthCheckInterval: number;
  performanceThresholds: Record<string, number>;
}

/**
 * Backup configuration interface
 */
export interface IBackupConfiguration {
  enabled: boolean;
  schedule: string;
  retention: number;
  type: BackupType;
  location: string;
  encryption: boolean;
}

