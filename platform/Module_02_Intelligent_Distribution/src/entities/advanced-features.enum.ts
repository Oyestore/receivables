/**
 * Advanced Features Enums for Phase 2 Administrative Module
 * SME Receivables Management Platform
 * 
 * Comprehensive enumeration types for advanced billing, analytics,
 * user experience, and integration marketplace features
 */

// ============================================================================
// ADVANCED BILLING ENUMS
// ============================================================================

export enum PricingStrategy {
  FIXED = 'fixed',
  DYNAMIC = 'dynamic',
  USAGE_BASED = 'usage_based',
  TIERED = 'tiered',
  VOLUME = 'volume',
  HYBRID = 'hybrid',
  FREEMIUM = 'freemium',
  ENTERPRISE = 'enterprise'
}

export enum BillingCycle {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUAL = 'semi_annual',
  ANNUAL = 'annual',
  CUSTOM = 'custom',
  ON_DEMAND = 'on_demand'
}

export enum UsageMetricType {
  API_CALLS = 'api_calls',
  DATA_STORAGE = 'data_storage',
  PROCESSING_TIME = 'processing_time',
  USER_SESSIONS = 'user_sessions',
  TRANSACTIONS = 'transactions',
  DOCUMENTS = 'documents',
  INTEGRATIONS = 'integrations',
  CUSTOM = 'custom'
}

export enum PricingTier {
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  PREMIUM = 'premium',
  CUSTOM = 'custom'
}

export enum RevenueOptimizationStrategy {
  MAXIMIZE_REVENUE = 'maximize_revenue',
  MAXIMIZE_USERS = 'maximize_users',
  MAXIMIZE_RETENTION = 'maximize_retention',
  BALANCED = 'balanced',
  COMPETITIVE = 'competitive',
  PENETRATION = 'penetration'
}

export enum BillingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  DIGITAL_WALLET = 'digital_wallet',
  CRYPTOCURRENCY = 'cryptocurrency',
  INVOICE = 'invoice',
  WIRE_TRANSFER = 'wire_transfer'
}

export enum CurrencyCode {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  INR = 'INR',
  JPY = 'JPY',
  CAD = 'CAD',
  AUD = 'AUD',
  SGD = 'SGD',
  CNY = 'CNY',
  BRL = 'BRL'
}

export enum TaxType {
  VAT = 'vat',
  GST = 'gst',
  SALES_TAX = 'sales_tax',
  INCOME_TAX = 'income_tax',
  WITHHOLDING_TAX = 'withholding_tax',
  CUSTOMS_DUTY = 'customs_duty',
  EXCISE_TAX = 'excise_tax'
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  VOLUME_DISCOUNT = 'volume_discount',
  LOYALTY_DISCOUNT = 'loyalty_discount',
  PROMOTIONAL = 'promotional',
  EARLY_PAYMENT = 'early_payment'
}

// ============================================================================
// PLATFORM ANALYTICS ENUMS
// ============================================================================

export enum AnalyticsType {
  REAL_TIME = 'real_time',
  BATCH = 'batch',
  PREDICTIVE = 'predictive',
  DESCRIPTIVE = 'descriptive',
  PRESCRIPTIVE = 'prescriptive',
  DIAGNOSTIC = 'diagnostic'
}

export enum MetricCategory {
  BUSINESS = 'business',
  TECHNICAL = 'technical',
  USER_BEHAVIOR = 'user_behavior',
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  SECURITY = 'security'
}

export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  AREA = 'area',
  SCATTER = 'scatter',
  HEATMAP = 'heatmap',
  GAUGE = 'gauge',
  FUNNEL = 'funnel',
  TREEMAP = 'treemap',
  SANKEY = 'sankey'
}

export enum TimeGranularity {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

export enum PredictionModel {
  LINEAR_REGRESSION = 'linear_regression',
  RANDOM_FOREST = 'random_forest',
  NEURAL_NETWORK = 'neural_network',
  ARIMA = 'arima',
  LSTM = 'lstm',
  PROPHET = 'prophet',
  DEEPSEEK_R1 = 'deepseek_r1'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
  HTML = 'html',
  POWERPOINT = 'powerpoint'
}

export enum DataSource {
  DATABASE = 'database',
  API = 'api',
  FILE = 'file',
  STREAM = 'stream',
  EXTERNAL = 'external',
  CACHE = 'cache'
}

export enum AggregationType {
  SUM = 'sum',
  AVERAGE = 'average',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
  MEDIAN = 'median',
  PERCENTILE = 'percentile',
  STANDARD_DEVIATION = 'standard_deviation'
}

// ============================================================================
// USER EXPERIENCE ENUMS
// ============================================================================

export enum UserInterfaceTheme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
  HIGH_CONTRAST = 'high_contrast',
  CUSTOM = 'custom'
}

export enum PersonalizationLevel {
  BASIC = 'basic',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  TEAMS = 'teams'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

export enum UserPreferenceCategory {
  INTERFACE = 'interface',
  NOTIFICATIONS = 'notifications',
  PRIVACY = 'privacy',
  ACCESSIBILITY = 'accessibility',
  LANGUAGE = 'language',
  TIMEZONE = 'timezone'
}

export enum AccessibilityFeature {
  SCREEN_READER = 'screen_reader',
  HIGH_CONTRAST = 'high_contrast',
  LARGE_TEXT = 'large_text',
  KEYBOARD_NAVIGATION = 'keyboard_navigation',
  VOICE_CONTROL = 'voice_control',
  REDUCED_MOTION = 'reduced_motion'
}

export enum DeviceType {
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  MOBILE = 'mobile',
  SMART_TV = 'smart_tv',
  WEARABLE = 'wearable'
}

export enum InteractionType {
  CLICK = 'click',
  HOVER = 'hover',
  SCROLL = 'scroll',
  KEYBOARD = 'keyboard',
  TOUCH = 'touch',
  VOICE = 'voice',
  GESTURE = 'gesture'
}

export enum OnboardingStep {
  WELCOME = 'welcome',
  PROFILE_SETUP = 'profile_setup',
  PREFERENCES = 'preferences',
  TUTORIAL = 'tutorial',
  FIRST_TASK = 'first_task',
  COMPLETION = 'completion'
}

export enum HelpContentType {
  TOOLTIP = 'tooltip',
  TUTORIAL = 'tutorial',
  VIDEO = 'video',
  ARTICLE = 'article',
  FAQ = 'faq',
  INTERACTIVE_GUIDE = 'interactive_guide'
}

// ============================================================================
// INTEGRATION MARKETPLACE ENUMS
// ============================================================================

export enum IntegrationType {
  API = 'api',
  WEBHOOK = 'webhook',
  FILE_SYNC = 'file_sync',
  DATABASE = 'database',
  MESSAGING = 'messaging',
  REAL_TIME = 'real_time'
}

export enum IntegrationCategory {
  ACCOUNTING = 'accounting',
  CRM = 'crm',
  ERP = 'erp',
  PAYMENT = 'payment',
  COMMUNICATION = 'communication',
  ANALYTICS = 'analytics',
  SECURITY = 'security',
  PRODUCTIVITY = 'productivity'
}

export enum IntegrationStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  DEPRECATED = 'deprecated',
  SUSPENDED = 'suspended'
}

export enum APIProtocol {
  REST = 'rest',
  GRAPHQL = 'graphql',
  SOAP = 'soap',
  GRPC = 'grpc',
  WEBSOCKET = 'websocket',
  WEBHOOK = 'webhook'
}

export enum AuthenticationType {
  API_KEY = 'api_key',
  OAUTH2 = 'oauth2',
  JWT = 'jwt',
  BASIC_AUTH = 'basic_auth',
  BEARER_TOKEN = 'bearer_token',
  CUSTOM = 'custom'
}

export enum DataFormat {
  JSON = 'json',
  XML = 'xml',
  CSV = 'csv',
  YAML = 'yaml',
  PROTOBUF = 'protobuf',
  AVRO = 'avro'
}

export enum SyncDirection {
  UNIDIRECTIONAL = 'unidirectional',
  BIDIRECTIONAL = 'bidirectional',
  PULL_ONLY = 'pull_only',
  PUSH_ONLY = 'push_only'
}

export enum IntegrationTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
  CUSTOM = 'custom'
}

export enum MarketplaceCategory {
  FEATURED = 'featured',
  POPULAR = 'popular',
  NEW = 'new',
  TRENDING = 'trending',
  RECOMMENDED = 'recommended'
}

export enum PartnerType {
  TECHNOLOGY = 'technology',
  CONSULTING = 'consulting',
  RESELLER = 'reseller',
  SYSTEM_INTEGRATOR = 'system_integrator',
  ISV = 'isv'
}

// ============================================================================
// GENERAL SYSTEM ENUMS
// ============================================================================

export enum FeatureFlag {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  BETA = 'beta',
  ALPHA = 'alpha',
  DEPRECATED = 'deprecated'
}

export enum EnvironmentType {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TESTING = 'testing',
  SANDBOX = 'sandbox'
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

export enum CacheStrategy {
  LRU = 'lru',
  LFU = 'lfu',
  FIFO = 'fifo',
  TTL = 'ttl',
  WRITE_THROUGH = 'write_through',
  WRITE_BEHIND = 'write_behind'
}

export enum QueuePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ProcessingStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying'
}

export enum SecurityLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  TOP_SECRET = 'top_secret'
}

export enum ComplianceFramework {
  GDPR = 'gdpr',
  CCPA = 'ccpa',
  SOX = 'sox',
  PCI_DSS = 'pci_dss',
  HIPAA = 'hipaa',
  ISO_27001 = 'iso_27001'
}

export enum AuditEventType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  PERMISSION_CHANGE = 'permission_change',
  CONFIGURATION_CHANGE = 'configuration_change'
}

export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  NETWORK = 'network',
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service'
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

export enum MaintenanceMode {
  NONE = 'none',
  READ_ONLY = 'read_only',
  FULL_MAINTENANCE = 'full_maintenance',
  EMERGENCY = 'emergency'
}

// ============================================================================
// EXPORT ALL ENUMS
// ============================================================================

export const AdvancedFeaturesEnums = {
  // Billing
  PricingStrategy,
  BillingCycle,
  UsageMetricType,
  PricingTier,
  RevenueOptimizationStrategy,
  BillingStatus,
  PaymentMethod,
  CurrencyCode,
  TaxType,
  DiscountType,
  
  // Analytics
  AnalyticsType,
  MetricCategory,
  ChartType,
  TimeGranularity,
  PredictionModel,
  AlertSeverity,
  ReportFormat,
  DataSource,
  AggregationType,
  
  // User Experience
  UserInterfaceTheme,
  PersonalizationLevel,
  NotificationChannel,
  NotificationPriority,
  UserPreferenceCategory,
  AccessibilityFeature,
  DeviceType,
  InteractionType,
  OnboardingStep,
  HelpContentType,
  
  // Integration Marketplace
  IntegrationType,
  IntegrationCategory,
  IntegrationStatus,
  APIProtocol,
  AuthenticationType,
  DataFormat,
  SyncDirection,
  IntegrationTier,
  MarketplaceCategory,
  PartnerType,
  
  // System
  FeatureFlag,
  EnvironmentType,
  LogLevel,
  CacheStrategy,
  QueuePriority,
  ProcessingStatus,
  SecurityLevel,
  ComplianceFramework,
  AuditEventType,
  ErrorCategory,
  HealthStatus,
  MaintenanceMode
};

