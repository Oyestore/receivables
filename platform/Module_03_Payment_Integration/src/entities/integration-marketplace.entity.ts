/**
 * Integration Marketplace Entity for Third-Party Ecosystem
 * SME Receivables Management Platform - Module 11 Phase 2
 * 
 * Comprehensive entity for integration marketplace, third-party connectors,
 * API management, developer platform, and revenue sharing capabilities
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  IntegrationType,
  IntegrationStatus,
  APIVersion,
  AuthenticationType,
  PricingModel,
  RevenueShareModel,
  IntegrationCategory,
  SupportLevel,
  CertificationLevel
} from '@shared/enums/advanced-features.enum';
import {
  Integration,
  IntegrationConfiguration,
  APIEndpoint,
  DeveloperProfile,
  MarketplaceMetrics
} from '@shared/interfaces/advanced-features.interface';

@Entity('integrations')
@Index(['tenantId', 'isActive'])
@Index(['category', 'status'])
@Index(['publishedAt'])
@Index(['popularity'])
export class IntegrationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  @Index()
  tenantId: string;

  @Column({ type: 'uuid', name: 'developer_id' })
  @Index()
  developerId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 500 })
  displayName: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', name: 'short_description' })
  shortDescription: string;

  @Column({
    type: 'enum',
    enum: IntegrationType,
    default: IntegrationType.API,
    name: 'integration_type'
  })
  integrationType: IntegrationType;

  @Column({
    type: 'enum',
    enum: IntegrationCategory,
    default: IntegrationCategory.ACCOUNTING,
    name: 'category'
  })
  category: IntegrationCategory;

  @Column({
    type: 'enum',
    enum: IntegrationStatus,
    default: IntegrationStatus.DRAFT,
    name: 'status'
  })
  status: IntegrationStatus;

  // Marketplace Information
  @Column({ type: 'varchar', length: 500, name: 'logo_url', nullable: true })
  logoUrl: string;

  @Column({ type: 'jsonb', name: 'screenshots', default: [] })
  screenshots: string[];

  @Column({ type: 'jsonb', name: 'tags', default: [] })
  tags: string[];

  @Column({ type: 'varchar', length: 500, name: 'website_url', nullable: true })
  websiteUrl: string;

  @Column({ type: 'varchar', length: 500, name: 'documentation_url', nullable: true })
  documentationUrl: string;

  @Column({ type: 'varchar', length: 500, name: 'support_url', nullable: true })
  supportUrl: string;

  @Column({ type: 'varchar', length: 100, name: 'support_email', nullable: true })
  supportEmail: string;

  // Technical Configuration
  @Column({ type: 'jsonb', name: 'integration_config', default: {} })
  integrationConfig: IntegrationConfigurationData;

  @Column({
    type: 'enum',
    enum: APIVersion,
    default: APIVersion.V1,
    name: 'api_version'
  })
  apiVersion: APIVersion;

  @Column({ type: 'varchar', length: 500, name: 'base_url' })
  baseUrl: string;

  @Column({
    type: 'enum',
    enum: AuthenticationType,
    default: AuthenticationType.API_KEY,
    name: 'auth_type'
  })
  authType: AuthenticationType;

  @Column({ type: 'jsonb', name: 'auth_config', default: {} })
  authConfig: AuthenticationConfig;

  @Column({ type: 'jsonb', name: 'rate_limits', default: {} })
  rateLimits: RateLimitConfig;

  @Column({ type: 'jsonb', name: 'webhook_config', default: {} })
  webhookConfig: WebhookConfiguration;

  // Capabilities and Features
  @Column({ type: 'jsonb', name: 'supported_operations', default: [] })
  supportedOperations: string[];

  @Column({ type: 'jsonb', name: 'data_mappings', default: {} })
  dataMappings: DataMappingConfig;

  @Column({ type: 'jsonb', name: 'field_mappings', default: {} })
  fieldMappings: FieldMappingConfig;

  @Column({ type: 'boolean', name: 'real_time_sync', default: false })
  realTimeSync: boolean;

  @Column({ type: 'boolean', name: 'batch_processing', default: true })
  batchProcessing: boolean;

  @Column({ type: 'boolean', name: 'bidirectional_sync', default: false })
  bidirectionalSync: boolean;

  @Column({ type: 'jsonb', name: 'sync_frequency_options', default: [] })
  syncFrequencyOptions: string[];

  // Pricing and Revenue
  @Column({
    type: 'enum',
    enum: PricingModel,
    default: PricingModel.FREE,
    name: 'pricing_model'
  })
  pricingModel: PricingModel;

  @Column({ type: 'jsonb', name: 'pricing_config', default: {} })
  pricingConfig: PricingConfiguration;

  @Column({
    type: 'enum',
    enum: RevenueShareModel,
    default: RevenueShareModel.PERCENTAGE,
    name: 'revenue_share_model'
  })
  revenueShareModel: RevenueShareModel;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'revenue_share_percentage', default: 0.0 })
  revenueSharePercentage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'base_price', default: 0.0 })
  basePrice: number;

  @Column({ type: 'jsonb', name: 'pricing_tiers', default: [] })
  pricingTiers: PricingTier[];

  // Quality and Certification
  @Column({
    type: 'enum',
    enum: CertificationLevel,
    default: CertificationLevel.NONE,
    name: 'certification_level'
  })
  certificationLevel: CertificationLevel;

  @Column({ type: 'timestamp', name: 'certified_at', nullable: true })
  certifiedAt: Date;

  @Column({ type: 'uuid', name: 'certified_by', nullable: true })
  certifiedBy: string;

  @Column({ type: 'jsonb', name: 'certification_criteria', default: {} })
  certificationCriteria: CertificationCriteria;

  @Column({
    type: 'enum',
    enum: SupportLevel,
    default: SupportLevel.COMMUNITY,
    name: 'support_level'
  })
  supportLevel: SupportLevel;

  @Column({ type: 'jsonb', name: 'sla_config', default: {} })
  slaConfig: SLAConfiguration;

  // Marketplace Metrics
  @Column({ type: 'integer', name: 'install_count', default: 0 })
  installCount: number;

  @Column({ type: 'integer', name: 'active_installations', default: 0 })
  activeInstallations: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, name: 'average_rating', default: 0.0 })
  averageRating: number;

  @Column({ type: 'integer', name: 'review_count', default: 0 })
  reviewCount: number;

  @Column({ type: 'integer', name: 'popularity_score', default: 0 })
  @Index()
  popularityScore: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_revenue', default: 0.0 })
  totalRevenue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'monthly_revenue', default: 0.0 })
  monthlyRevenue: number;

  // Performance and Reliability
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'uptime_percentage', default: 0.0 })
  uptimePercentage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'average_response_time', default: 0.0 })
  averageResponseTime: number;

  @Column({ type: 'integer', name: 'error_rate', default: 0 })
  errorRate: number;

  @Column({ type: 'timestamp', name: 'last_health_check', nullable: true })
  lastHealthCheck: Date;

  @Column({ type: 'jsonb', name: 'performance_metrics', default: {} })
  performanceMetrics: PerformanceMetrics;

  // Security and Compliance
  @Column({ type: 'jsonb', name: 'security_features', default: [] })
  securityFeatures: string[];

  @Column({ type: 'jsonb', name: 'compliance_certifications', default: [] })
  complianceCertifications: string[];

  @Column({ type: 'boolean', name: 'gdpr_compliant', default: false })
  gdprCompliant: boolean;

  @Column({ type: 'boolean', name: 'hipaa_compliant', default: false })
  hipaaCompliant: boolean;

  @Column({ type: 'boolean', name: 'sox_compliant', default: false })
  soxCompliant: boolean;

  @Column({ type: 'jsonb', name: 'data_retention_policy', default: {} })
  dataRetentionPolicy: DataRetentionPolicy;

  // Versioning and Updates
  @Column({ type: 'varchar', length: 50, name: 'current_version', default: '1.0.0' })
  currentVersion: string;

  @Column({ type: 'jsonb', name: 'version_history', default: [] })
  versionHistory: VersionHistory[];

  @Column({ type: 'boolean', name: 'auto_update', default: false })
  autoUpdate: boolean;

  @Column({ type: 'timestamp', name: 'last_updated_at', nullable: true })
  lastUpdatedAt: Date;

  @Column({ type: 'jsonb', name: 'update_notes', default: {} })
  updateNotes: Record<string, string>;

  // Publishing and Lifecycle
  @Column({ type: 'boolean', name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ type: 'timestamp', name: 'published_at', nullable: true })
  @Index()
  publishedAt: Date;

  @Column({ type: 'boolean', name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ type: 'timestamp', name: 'featured_until', nullable: true })
  featuredUntil: Date;

  @Column({ type: 'boolean', name: 'is_deprecated', default: false })
  isDeprecated: boolean;

  @Column({ type: 'timestamp', name: 'deprecated_at', nullable: true })
  deprecatedAt: Date;

  @Column({ type: 'text', name: 'deprecation_notice', nullable: true })
  deprecationNotice: string;

  // Status and Metadata
  @Column({ type: 'boolean', name: 'is_active', default: true })
  @Index()
  isActive: boolean;

  @Column({ type: 'text', name: 'rejection_reason', nullable: true })
  rejectionReason: string;

  @Column({ type: 'jsonb', name: 'review_notes', default: {} })
  reviewNotes: Record<string, string>;

  @Column({ type: 'uuid', name: 'reviewed_by', nullable: true })
  reviewedBy: string;

  @Column({ type: 'timestamp', name: 'reviewed_at', nullable: true })
  reviewedAt: Date;

  // Audit and Metadata
  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @Column({ type: 'uuid', name: 'updated_by' })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Relationships
  @ManyToOne(() => DeveloperEntity, developer => developer.integrations)
  @JoinColumn({ name: 'developer_id' })
  developer: DeveloperEntity;

  @OneToMany(() => IntegrationInstallationEntity, installation => installation.integration)
  installations: IntegrationInstallationEntity[];

  @OneToMany(() => IntegrationReviewEntity, review => review.integration)
  reviews: IntegrationReviewEntity[];

  @OneToMany(() => APIEndpointEntity, endpoint => endpoint.integration)
  endpoints: APIEndpointEntity[];

  @OneToMany(() => IntegrationEventEntity, event => event.integration)
  events: IntegrationEventEntity[];

  // Lifecycle Hooks
  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    this.version = 1;
  }

  @BeforeUpdate()
  updateVersion() {
    this.version += 1;
    this.lastUpdatedAt = new Date();
  }

  // Business Methods
  updateMetrics(metrics: MarketplaceMetrics): void {
    this.installCount = metrics.installCount;
    this.activeInstallations = metrics.activeInstallations;
    this.averageRating = metrics.averageRating;
    this.reviewCount = metrics.reviewCount;
    this.totalRevenue = metrics.totalRevenue;
    this.monthlyRevenue = metrics.monthlyRevenue;
    this.popularityScore = this.calculatePopularityScore();
  }

  calculatePopularityScore(): number {
    let score = 0;

    // Install count weight (40%)
    score += Math.min(this.installCount / 1000, 1) * 40;

    // Rating weight (30%)
    score += (this.averageRating / 5) * 30;

    // Active installations weight (20%)
    score += Math.min(this.activeInstallations / 500, 1) * 20;

    // Revenue weight (10%)
    score += Math.min(this.monthlyRevenue / 10000, 1) * 10;

    return Math.round(score);
  }

  updatePerformanceMetrics(uptime: number, responseTime: number, errorRate: number): void {
    this.uptimePercentage = uptime;
    this.averageResponseTime = responseTime;
    this.errorRate = errorRate;
    this.lastHealthCheck = new Date();

    this.performanceMetrics = {
      ...this.performanceMetrics,
      lastCheck: new Date(),
      uptime,
      responseTime,
      errorRate,
      status: this.getHealthStatus()
    };
  }

  getHealthStatus(): 'healthy' | 'warning' | 'critical' {
    if (this.uptimePercentage < 95 || this.errorRate > 5) {
      return 'critical';
    }
    if (this.uptimePercentage < 99 || this.errorRate > 1 || this.averageResponseTime > 2000) {
      return 'warning';
    }
    return 'healthy';
  }

  publish(userId: string): void {
    this.status = IntegrationStatus.PUBLISHED;
    this.isPublished = true;
    this.publishedAt = new Date();
    this.updatedBy = userId;
  }

  unpublish(userId: string, reason?: string): void {
    this.status = IntegrationStatus.DRAFT;
    this.isPublished = false;
    this.publishedAt = null;
    this.updatedBy = userId;
    
    if (reason) {
      this.reviewNotes = { ...this.reviewNotes, unpublished: reason };
    }
  }

  approve(userId: string, notes?: string): void {
    this.status = IntegrationStatus.APPROVED;
    this.reviewedBy = userId;
    this.reviewedAt = new Date();
    this.updatedBy = userId;
    
    if (notes) {
      this.reviewNotes = { ...this.reviewNotes, approved: notes };
    }
  }

  reject(userId: string, reason: string): void {
    this.status = IntegrationStatus.REJECTED;
    this.rejectionReason = reason;
    this.reviewedBy = userId;
    this.reviewedAt = new Date();
    this.updatedBy = userId;
    this.reviewNotes = { ...this.reviewNotes, rejected: reason };
  }

  deprecate(userId: string, notice: string): void {
    this.isDeprecated = true;
    this.deprecatedAt = new Date();
    this.deprecationNotice = notice;
    this.updatedBy = userId;
  }

  feature(userId: string, duration: number = 30): void {
    this.isFeatured = true;
    this.featuredUntil = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    this.updatedBy = userId;
  }

  unfeature(userId: string): void {
    this.isFeatured = false;
    this.featuredUntil = null;
    this.updatedBy = userId;
  }

  canInstall(tenantId: string): boolean {
    return (
      this.isActive &&
      this.isPublished &&
      !this.isDeprecated &&
      this.status === IntegrationStatus.PUBLISHED &&
      this.getHealthStatus() !== 'critical'
    );
  }

  calculateRevenue(installations: number, usage: number): number {
    switch (this.pricingModel) {
      case PricingModel.FREE:
        return 0;
      case PricingModel.FIXED:
        return this.basePrice * installations;
      case PricingModel.USAGE_BASED:
        return this.pricingConfig.usageRate * usage;
      case PricingModel.TIERED:
        return this.calculateTieredRevenue(installations, usage);
      default:
        return 0;
    }
  }

  private calculateTieredRevenue(installations: number, usage: number): number {
    let revenue = 0;
    const sortedTiers = this.pricingTiers.sort((a, b) => a.threshold - b.threshold);

    for (const tier of sortedTiers) {
      if (usage > tier.threshold) {
        const tierUsage = Math.min(usage - tier.threshold, tier.limit || Infinity);
        revenue += tierUsage * tier.price;
      }
    }

    return revenue;
  }

  toJSON(): Integration {
    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      shortDescription: this.shortDescription,
      type: this.integrationType,
      category: this.category,
      status: this.status,
      developer: this.developer?.toJSON(),
      marketplace: {
        logoUrl: this.logoUrl,
        screenshots: this.screenshots,
        tags: this.tags,
        websiteUrl: this.websiteUrl,
        documentationUrl: this.documentationUrl,
        supportUrl: this.supportUrl,
        supportEmail: this.supportEmail
      },
      technical: {
        apiVersion: this.apiVersion,
        baseUrl: this.baseUrl,
        authType: this.authType,
        authConfig: this.authConfig,
        rateLimits: this.rateLimits,
        supportedOperations: this.supportedOperations,
        realTimeSync: this.realTimeSync,
        batchProcessing: this.batchProcessing,
        bidirectionalSync: this.bidirectionalSync
      },
      pricing: {
        model: this.pricingModel,
        basePrice: this.basePrice,
        tiers: this.pricingTiers,
        revenueShare: {
          model: this.revenueShareModel,
          percentage: this.revenueSharePercentage
        }
      },
      quality: {
        certificationLevel: this.certificationLevel,
        certifiedAt: this.certifiedAt,
        supportLevel: this.supportLevel,
        sla: this.slaConfig
      },
      metrics: {
        installCount: this.installCount,
        activeInstallations: this.activeInstallations,
        averageRating: this.averageRating,
        reviewCount: this.reviewCount,
        popularityScore: this.popularityScore,
        totalRevenue: this.totalRevenue,
        monthlyRevenue: this.monthlyRevenue
      },
      performance: {
        uptime: this.uptimePercentage,
        responseTime: this.averageResponseTime,
        errorRate: this.errorRate,
        healthStatus: this.getHealthStatus(),
        lastCheck: this.lastHealthCheck
      },
      security: {
        features: this.securityFeatures,
        compliance: this.complianceCertifications,
        gdprCompliant: this.gdprCompliant,
        hipaaCompliant: this.hipaaCompliant,
        soxCompliant: this.soxCompliant
      },
      versioning: {
        currentVersion: this.currentVersion,
        history: this.versionHistory,
        autoUpdate: this.autoUpdate,
        lastUpdated: this.lastUpdatedAt
      },
      lifecycle: {
        isPublished: this.isPublished,
        publishedAt: this.publishedAt,
        isFeatured: this.isFeatured,
        featuredUntil: this.featuredUntil,
        isDeprecated: this.isDeprecated,
        deprecatedAt: this.deprecatedAt,
        deprecationNotice: this.deprecationNotice
      },
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// Supporting Entities
@Entity('developers')
@Index(['email'])
@Index(['companyName'])
export class DeveloperEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, name: 'company_name' })
  companyName: string;

  @Column({ type: 'varchar', length: 255, name: 'contact_name' })
  contactName: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  website: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, name: 'logo_url', nullable: true })
  logoUrl: string;

  @Column({ type: 'jsonb', name: 'social_links', default: {} })
  socialLinks: Record<string, string>;

  @Column({ type: 'boolean', name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ type: 'timestamp', name: 'verified_at', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'boolean', name: 'is_partner', default: false })
  isPartner: boolean;

  @Column({ type: 'jsonb', name: 'partner_benefits', default: {} })
  partnerBenefits: Record<string, any>;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_revenue', default: 0.0 })
  totalRevenue: number;

  @Column({ type: 'integer', name: 'total_integrations', default: 0 })
  totalIntegrations: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, name: 'average_rating', default: 0.0 })
  averageRating: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Relationships
  @OneToMany(() => IntegrationEntity, integration => integration.developer)
  integrations: IntegrationEntity[];

  toJSON(): DeveloperProfile {
    return {
      id: this.id,
      companyName: this.companyName,
      contactName: this.contactName,
      email: this.email,
      phone: this.phone,
      website: this.website,
      description: this.description,
      logoUrl: this.logoUrl,
      socialLinks: this.socialLinks,
      isVerified: this.isVerified,
      verifiedAt: this.verifiedAt,
      isPartner: this.isPartner,
      partnerBenefits: this.partnerBenefits,
      metrics: {
        totalRevenue: this.totalRevenue,
        totalIntegrations: this.totalIntegrations,
        averageRating: this.averageRating
      },
      createdAt: this.createdAt
    };
  }
}

@Entity('integration_installations')
@Index(['integrationId', 'tenantId'])
@Index(['installedAt'])
export class IntegrationInstallationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'integration_id' })
  integrationId: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'uuid', name: 'installed_by' })
  installedBy: string;

  @Column({ type: 'timestamp', name: 'installed_at', default: () => 'CURRENT_TIMESTAMP' })
  installedAt: Date;

  @Column({ type: 'jsonb', name: 'configuration', default: {} })
  configuration: Record<string, any>;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', name: 'last_sync_at', nullable: true })
  lastSyncAt: Date;

  @Column({ type: 'integer', name: 'sync_count', default: 0 })
  syncCount: number;

  @Column({ type: 'integer', name: 'error_count', default: 0 })
  errorCount: number;

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError: string;

  @Column({ type: 'jsonb', name: 'usage_metrics', default: {} })
  usageMetrics: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Relationships
  @ManyToOne(() => IntegrationEntity, integration => integration.installations)
  @JoinColumn({ name: 'integration_id' })
  integration: IntegrationEntity;
}

@Entity('integration_reviews')
@Index(['integrationId', 'rating'])
@Index(['createdAt'])
export class IntegrationReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'integration_id' })
  integrationId: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'integer', name: 'rating' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'jsonb', name: 'pros', default: [] })
  pros: string[];

  @Column({ type: 'jsonb', name: 'cons', default: [] })
  cons: string[];

  @Column({ type: 'boolean', name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ type: 'boolean', name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ type: 'integer', name: 'helpful_votes', default: 0 })
  helpfulVotes: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Relationships
  @ManyToOne(() => IntegrationEntity, integration => integration.reviews)
  @JoinColumn({ name: 'integration_id' })
  integration: IntegrationEntity;
}

@Entity('api_endpoints')
@Index(['integrationId', 'method'])
export class APIEndpointEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'integration_id' })
  integrationId: string;

  @Column({ type: 'varchar', length: 500 })
  path: string;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', name: 'parameters', default: {} })
  parameters: Record<string, any>;

  @Column({ type: 'jsonb', name: 'request_schema', default: {} })
  requestSchema: Record<string, any>;

  @Column({ type: 'jsonb', name: 'response_schema', default: {} })
  responseSchema: Record<string, any>;

  @Column({ type: 'jsonb', name: 'examples', default: {} })
  examples: Record<string, any>;

  @Column({ type: 'boolean', name: 'requires_auth', default: true })
  requiresAuth: boolean;

  @Column({ type: 'jsonb', name: 'rate_limit', default: {} })
  rateLimit: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Relationships
  @ManyToOne(() => IntegrationEntity, integration => integration.endpoints)
  @JoinColumn({ name: 'integration_id' })
  integration: IntegrationEntity;

  toJSON(): APIEndpoint {
    return {
      id: this.id,
      path: this.path,
      method: this.method,
      description: this.description,
      parameters: this.parameters,
      requestSchema: this.requestSchema,
      responseSchema: this.responseSchema,
      examples: this.examples,
      requiresAuth: this.requiresAuth,
      rateLimit: this.rateLimit
    };
  }
}

@Entity('integration_events')
@Index(['integrationId', 'eventType'])
@Index(['createdAt'])
export class IntegrationEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'integration_id' })
  integrationId: string;

  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  tenantId: string;

  @Column({ type: 'varchar', length: 100, name: 'event_type' })
  eventType: string;

  @Column({ type: 'jsonb', name: 'event_data', default: {} })
  eventData: Record<string, any>;

  @Column({ type: 'varchar', length: 45, name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ type: 'text', name: 'user_agent', nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Relationships
  @ManyToOne(() => IntegrationEntity, integration => integration.events)
  @JoinColumn({ name: 'integration_id' })
  integration: IntegrationEntity;
}

// Supporting Interfaces
interface IntegrationConfigurationData {
  endpoints: APIEndpointConfig[];
  webhooks: WebhookConfiguration;
  authentication: AuthenticationConfig;
  rateLimits: RateLimitConfig;
  dataMappings: DataMappingConfig;
  syncSettings: SyncConfiguration;
}

interface APIEndpointConfig {
  name: string;
  path: string;
  method: string;
  description: string;
  parameters: Record<string, any>;
  headers: Record<string, string>;
  authentication: boolean;
  rateLimit: number;
}

interface AuthenticationConfig {
  type: AuthenticationType;
  apiKey?: {
    header: string;
    prefix?: string;
  };
  oauth2?: {
    authUrl: string;
    tokenUrl: string;
    scopes: string[];
    clientId: string;
    redirectUrl: string;
  };
  basic?: {
    username: string;
    password: string;
  };
  bearer?: {
    token: string;
  };
}

interface RateLimitConfig {
  requests: number;
  window: number; // seconds
  burst?: number;
  concurrent?: number;
}

interface WebhookConfiguration {
  enabled: boolean;
  url?: string;
  events: string[];
  secret?: string;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoffSeconds: number;
  };
}

interface DataMappingConfig {
  inbound: Record<string, string>;
  outbound: Record<string, string>;
  transformations: TransformationRule[];
}

interface FieldMappingConfig {
  [sourceField: string]: {
    targetField: string;
    transformation?: string;
    required: boolean;
    defaultValue?: any;
  };
}

interface TransformationRule {
  field: string;
  type: 'format' | 'calculate' | 'lookup' | 'conditional';
  rule: string;
  parameters?: Record<string, any>;
}

interface SyncConfiguration {
  frequency: string;
  batchSize: number;
  timeout: number;
  retryPolicy: {
    maxRetries: number;
    backoffSeconds: number;
  };
  conflictResolution: 'source_wins' | 'target_wins' | 'manual';
}

interface PricingConfiguration {
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'usage';
  usageRate?: number;
  freeQuota?: number;
  overage?: number;
  discounts?: DiscountConfig[];
}

interface PricingTier {
  name: string;
  threshold: number;
  limit?: number;
  price: number;
  features: string[];
}

interface DiscountConfig {
  type: 'percentage' | 'fixed';
  value: number;
  condition: string;
  validUntil?: Date;
}

interface CertificationCriteria {
  security: boolean;
  performance: boolean;
  reliability: boolean;
  documentation: boolean;
  support: boolean;
  compliance: string[];
}

interface SLAConfiguration {
  uptime: number;
  responseTime: number;
  support: {
    hours: string;
    channels: string[];
    responseTime: number;
  };
  penalties: {
    uptimeBreach: number;
    responseTimeBreach: number;
  };
}

interface PerformanceMetrics {
  lastCheck: Date;
  uptime: number;
  responseTime: number;
  errorRate: number;
  status: 'healthy' | 'warning' | 'critical';
  trends: {
    uptimeTrend: number;
    responseTimeTrend: number;
    errorRateTrend: number;
  };
}

interface DataRetentionPolicy {
  logs: number; // days
  metrics: number; // days
  userData: number; // days
  backups: number; // days
  deletionMethod: 'soft' | 'hard';
}

interface VersionHistory {
  version: string;
  releaseDate: Date;
  changes: string[];
  breaking: boolean;
  deprecated: string[];
  migration?: string;
}

