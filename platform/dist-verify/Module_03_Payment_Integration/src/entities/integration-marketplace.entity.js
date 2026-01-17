"use strict";
/**
 * Integration Marketplace Entity for Third-Party Ecosystem
 * SME Receivables Management Platform - Module 11 Phase 2
 *
 * Comprehensive entity for integration marketplace, third-party connectors,
 * API management, developer platform, and revenue sharing capabilities
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationEventEntity = exports.APIEndpointEntity = exports.IntegrationReviewEntity = exports.IntegrationInstallationEntity = exports.DeveloperEntity = exports.IntegrationEntity = void 0;
const typeorm_1 = require("typeorm");
const uuid_1 = require("uuid");
const advanced_features_enum_1 = require("@shared/enums/advanced-features.enum");
let IntegrationEntity = class IntegrationEntity {
    // Lifecycle Hooks
    generateId() {
        if (!this.id) {
            this.id = (0, uuid_1.v4)();
        }
        this.version = 1;
    }
    updateVersion() {
        this.version += 1;
        this.lastUpdatedAt = new Date();
    }
    // Business Methods
    updateMetrics(metrics) {
        this.installCount = metrics.installCount;
        this.activeInstallations = metrics.activeInstallations;
        this.averageRating = metrics.averageRating;
        this.reviewCount = metrics.reviewCount;
        this.totalRevenue = metrics.totalRevenue;
        this.monthlyRevenue = metrics.monthlyRevenue;
        this.popularityScore = this.calculatePopularityScore();
    }
    calculatePopularityScore() {
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
    updatePerformanceMetrics(uptime, responseTime, errorRate) {
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
    getHealthStatus() {
        if (this.uptimePercentage < 95 || this.errorRate > 5) {
            return 'critical';
        }
        if (this.uptimePercentage < 99 || this.errorRate > 1 || this.averageResponseTime > 2000) {
            return 'warning';
        }
        return 'healthy';
    }
    publish(userId) {
        this.status = advanced_features_enum_1.IntegrationStatus.PUBLISHED;
        this.isPublished = true;
        this.publishedAt = new Date();
        this.updatedBy = userId;
    }
    unpublish(userId, reason) {
        this.status = advanced_features_enum_1.IntegrationStatus.DRAFT;
        this.isPublished = false;
        this.publishedAt = null;
        this.updatedBy = userId;
        if (reason) {
            this.reviewNotes = { ...this.reviewNotes, unpublished: reason };
        }
    }
    approve(userId, notes) {
        this.status = advanced_features_enum_1.IntegrationStatus.APPROVED;
        this.reviewedBy = userId;
        this.reviewedAt = new Date();
        this.updatedBy = userId;
        if (notes) {
            this.reviewNotes = { ...this.reviewNotes, approved: notes };
        }
    }
    reject(userId, reason) {
        this.status = advanced_features_enum_1.IntegrationStatus.REJECTED;
        this.rejectionReason = reason;
        this.reviewedBy = userId;
        this.reviewedAt = new Date();
        this.updatedBy = userId;
        this.reviewNotes = { ...this.reviewNotes, rejected: reason };
    }
    deprecate(userId, notice) {
        this.isDeprecated = true;
        this.deprecatedAt = new Date();
        this.deprecationNotice = notice;
        this.updatedBy = userId;
    }
    feature(userId, duration = 30) {
        this.isFeatured = true;
        this.featuredUntil = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
        this.updatedBy = userId;
    }
    unfeature(userId) {
        this.isFeatured = false;
        this.featuredUntil = null;
        this.updatedBy = userId;
    }
    canInstall(tenantId) {
        return (this.isActive &&
            this.isPublished &&
            !this.isDeprecated &&
            this.status === advanced_features_enum_1.IntegrationStatus.PUBLISHED &&
            this.getHealthStatus() !== 'critical');
    }
    calculateRevenue(installations, usage) {
        switch (this.pricingModel) {
            case advanced_features_enum_1.PricingModel.FREE:
                return 0;
            case advanced_features_enum_1.PricingModel.FIXED:
                return this.basePrice * installations;
            case advanced_features_enum_1.PricingModel.USAGE_BASED:
                return this.pricingConfig.usageRate * usage;
            case advanced_features_enum_1.PricingModel.TIERED:
                return this.calculateTieredRevenue(installations, usage);
            default:
                return 0;
        }
    }
    calculateTieredRevenue(installations, usage) {
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
    toJSON() {
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
};
exports.IntegrationEntity = IntegrationEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'tenant_id', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'developer_id' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "developerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'short_description' }),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "shortDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: advanced_features_enum_1.IntegrationType,
        default: advanced_features_enum_1.IntegrationType.API,
        name: 'integration_type'
    }),
    __metadata("design:type", typeof (_a = typeof advanced_features_enum_1.IntegrationType !== "undefined" && advanced_features_enum_1.IntegrationType) === "function" ? _a : Object)
], IntegrationEntity.prototype, "integrationType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: advanced_features_enum_1.IntegrationCategory,
        default: advanced_features_enum_1.IntegrationCategory.ACCOUNTING,
        name: 'category'
    }),
    __metadata("design:type", typeof (_b = typeof advanced_features_enum_1.IntegrationCategory !== "undefined" && advanced_features_enum_1.IntegrationCategory) === "function" ? _b : Object)
], IntegrationEntity.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: advanced_features_enum_1.IntegrationStatus,
        default: advanced_features_enum_1.IntegrationStatus.DRAFT,
        name: 'status'
    }),
    __metadata("design:type", typeof (_c = typeof advanced_features_enum_1.IntegrationStatus !== "undefined" && advanced_features_enum_1.IntegrationStatus) === "function" ? _c : Object)
], IntegrationEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, name: 'logo_url', nullable: true }),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "logoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'screenshots', default: [] }),
    __metadata("design:type", Array)
], IntegrationEntity.prototype, "screenshots", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'tags', default: [] }),
    __metadata("design:type", Array)
], IntegrationEntity.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, name: 'website_url', nullable: true }),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "websiteUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, name: 'documentation_url', nullable: true }),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "documentationUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, name: 'support_url', nullable: true }),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "supportUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, name: 'support_email', nullable: true }),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "supportEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'integration_config', default: {} }),
    __metadata("design:type", Object)
], IntegrationEntity.prototype, "integrationConfig", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: advanced_features_enum_1.APIVersion,
        default: advanced_features_enum_1.APIVersion.V1,
        name: 'api_version'
    }),
    __metadata("design:type", typeof (_d = typeof advanced_features_enum_1.APIVersion !== "undefined" && advanced_features_enum_1.APIVersion) === "function" ? _d : Object)
], IntegrationEntity.prototype, "apiVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, name: 'base_url' }),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "baseUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: advanced_features_enum_1.AuthenticationType,
        default: advanced_features_enum_1.AuthenticationType.API_KEY,
        name: 'auth_type'
    }),
    __metadata("design:type", typeof (_e = typeof advanced_features_enum_1.AuthenticationType !== "undefined" && advanced_features_enum_1.AuthenticationType) === "function" ? _e : Object)
], IntegrationEntity.prototype, "authType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'auth_config', default: {} }),
    __metadata("design:type", Object)
], IntegrationEntity.prototype, "authConfig", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'rate_limits', default: {} }),
    __metadata("design:type", Object)
], IntegrationEntity.prototype, "rateLimits", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'webhook_config', default: {} }),
    __metadata("design:type", Object)
], IntegrationEntity.prototype, "webhookConfig", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'supported_operations', default: [] }),
    __metadata("design:type", Array)
], IntegrationEntity.prototype, "supportedOperations", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'data_mappings', default: {} }),
    __metadata("design:type", Object)
], IntegrationEntity.prototype, "dataMappings", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'field_mappings', default: {} }),
    __metadata("design:type", Object)
], IntegrationEntity.prototype, "fieldMappings", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'real_time_sync', default: false }),
    __metadata("design:type", Boolean)
], IntegrationEntity.prototype, "realTimeSync", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'batch_processing', default: true }),
    __metadata("design:type", Boolean)
], IntegrationEntity.prototype, "batchProcessing", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'bidirectional_sync', default: false }),
    __metadata("design:type", Boolean)
], IntegrationEntity.prototype, "bidirectionalSync", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'sync_frequency_options', default: [] }),
    __metadata("design:type", Array)
], IntegrationEntity.prototype, "syncFrequencyOptions", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: advanced_features_enum_1.PricingModel,
        default: advanced_features_enum_1.PricingModel.FREE,
        name: 'pricing_model'
    }),
    __metadata("design:type", typeof (_f = typeof advanced_features_enum_1.PricingModel !== "undefined" && advanced_features_enum_1.PricingModel) === "function" ? _f : Object)
], IntegrationEntity.prototype, "pricingModel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'pricing_config', default: {} }),
    __metadata("design:type", Object)
], IntegrationEntity.prototype, "pricingConfig", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: advanced_features_enum_1.RevenueShareModel,
        default: advanced_features_enum_1.RevenueShareModel.PERCENTAGE,
        name: 'revenue_share_model'
    }),
    __metadata("design:type", typeof (_g = typeof advanced_features_enum_1.RevenueShareModel !== "undefined" && advanced_features_enum_1.RevenueShareModel) === "function" ? _g : Object)
], IntegrationEntity.prototype, "revenueShareModel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, name: 'revenue_share_percentage', default: 0.0 }),
    __metadata("design:type", Number)
], IntegrationEntity.prototype, "revenueSharePercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'base_price', default: 0.0 }),
    __metadata("design:type", Number)
], IntegrationEntity.prototype, "basePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'pricing_tiers', default: [] }),
    __metadata("design:type", Array)
], IntegrationEntity.prototype, "pricingTiers", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: advanced_features_enum_1.CertificationLevel,
        default: advanced_features_enum_1.CertificationLevel.NONE,
        name: 'certification_level'
    }),
    __metadata("design:type", typeof (_h = typeof advanced_features_enum_1.CertificationLevel !== "undefined" && advanced_features_enum_1.CertificationLevel) === "function" ? _h : Object)
], IntegrationEntity.prototype, "certificationLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', name: 'certified_at', nullable: true }),
    __metadata("design:type", Date)
], IntegrationEntity.prototype, "certifiedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'certified_by', nullable: true }),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "certifiedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'certification_criteria', default: {} }),
    __metadata("design:type", Object)
], IntegrationEntity.prototype, "certificationCriteria", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: advanced_features_enum_1.SupportLevel,
        default: advanced_features_enum_1.SupportLevel.COMMUNITY,
        name: 'support_level'
    }),
    __metadata("design:type", typeof (_j = typeof advanced_features_enum_1.SupportLevel !== "undefined" && advanced_features_enum_1.SupportLevel) === "function" ? _j : Object)
], IntegrationEntity.prototype, "supportLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'sla_config', default: {} }),
    __metadata("design:type", Object)
], IntegrationEntity.prototype, "slaConfig", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'install_count', default: 0 }),
    __metadata("design:type", Number)
], IntegrationEntity.prototype, "installCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'active_installations', default: 0 }),
    __metadata("design:type", Number)
], IntegrationEntity.prototype, "activeInstallations", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 3, scale: 2, name: 'average_rating', default: 0.0 }),
    __metadata("design:type", Number)
], IntegrationEntity.prototype, "averageRating", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'review_count', default: 0 }),
    __metadata("design:type", Number)
], IntegrationEntity.prototype, "reviewCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'popularity_score', default: 0 }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Number)
], IntegrationEntity.prototype, "popularityScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2, name: 'total_revenue', default: 0.0 }),
    __metadata("design:type", Number)
], IntegrationEntity.prototype, "totalRevenue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2, name: 'monthly_revenue', default: 0.0 }),
    __metadata("design:type", Number)
], IntegrationEntity.prototype, "monthlyRevenue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, name: 'uptime_percentage', default: 0.0 }),
    __metadata("design:type", Number)
], IntegrationEntity.prototype, "uptimePercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'average_response_time', default: 0.0 }),
    __metadata("design:type", Number)
], IntegrationEntity.prototype, "averageResponseTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'error_rate', default: 0 }),
    __metadata("design:type", Number)
], IntegrationEntity.prototype, "errorRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', name: 'last_health_check', nullable: true }),
    __metadata("design:type", Date)
], IntegrationEntity.prototype, "lastHealthCheck", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'performance_metrics', default: {} }),
    __metadata("design:type", Object)
], IntegrationEntity.prototype, "performanceMetrics", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'security_features', default: [] }),
    __metadata("design:type", Array)
], IntegrationEntity.prototype, "securityFeatures", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'compliance_certifications', default: [] }),
    __metadata("design:type", Array)
], IntegrationEntity.prototype, "complianceCertifications", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'gdpr_compliant', default: false }),
    __metadata("design:type", Boolean)
], IntegrationEntity.prototype, "gdprCompliant", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'hipaa_compliant', default: false }),
    __metadata("design:type", Boolean)
], IntegrationEntity.prototype, "hipaaCompliant", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'sox_compliant', default: false }),
    __metadata("design:type", Boolean)
], IntegrationEntity.prototype, "soxCompliant", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'data_retention_policy', default: {} }),
    __metadata("design:type", Object)
], IntegrationEntity.prototype, "dataRetentionPolicy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, name: 'current_version', default: '1.0.0' }),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "currentVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'version_history', default: [] }),
    __metadata("design:type", Array)
], IntegrationEntity.prototype, "versionHistory", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'auto_update', default: false }),
    __metadata("design:type", Boolean)
], IntegrationEntity.prototype, "autoUpdate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', name: 'last_updated_at', nullable: true }),
    __metadata("design:type", Date)
], IntegrationEntity.prototype, "lastUpdatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'update_notes', default: {} }),
    __metadata("design:type", Object)
], IntegrationEntity.prototype, "updateNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'is_published', default: false }),
    __metadata("design:type", Boolean)
], IntegrationEntity.prototype, "isPublished", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', name: 'published_at', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Date)
], IntegrationEntity.prototype, "publishedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'is_featured', default: false }),
    __metadata("design:type", Boolean)
], IntegrationEntity.prototype, "isFeatured", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', name: 'featured_until', nullable: true }),
    __metadata("design:type", Date)
], IntegrationEntity.prototype, "featuredUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'is_deprecated', default: false }),
    __metadata("design:type", Boolean)
], IntegrationEntity.prototype, "isDeprecated", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', name: 'deprecated_at', nullable: true }),
    __metadata("design:type", Date)
], IntegrationEntity.prototype, "deprecatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'deprecation_notice', nullable: true }),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "deprecationNotice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'is_active', default: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Boolean)
], IntegrationEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'rejection_reason', nullable: true }),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "rejectionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'review_notes', default: {} }),
    __metadata("design:type", Object)
], IntegrationEntity.prototype, "reviewNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'reviewed_by', nullable: true }),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "reviewedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', name: 'reviewed_at', nullable: true }),
    __metadata("design:type", Date)
], IntegrationEntity.prototype, "reviewedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'created_by' }),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'updated_by' }),
    __metadata("design:type", String)
], IntegrationEntity.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], IntegrationEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], IntegrationEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 1 }),
    __metadata("design:type", Number)
], IntegrationEntity.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], IntegrationEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => DeveloperEntity, developer => developer.integrations),
    (0, typeorm_1.JoinColumn)({ name: 'developer_id' }),
    __metadata("design:type", DeveloperEntity)
], IntegrationEntity.prototype, "developer", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => IntegrationInstallationEntity, installation => installation.integration),
    __metadata("design:type", Array)
], IntegrationEntity.prototype, "installations", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => IntegrationReviewEntity, review => review.integration),
    __metadata("design:type", Array)
], IntegrationEntity.prototype, "reviews", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => APIEndpointEntity, endpoint => endpoint.integration),
    __metadata("design:type", Array)
], IntegrationEntity.prototype, "endpoints", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => IntegrationEventEntity, event => event.integration),
    __metadata("design:type", Array)
], IntegrationEntity.prototype, "events", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], IntegrationEntity.prototype, "generateId", null);
__decorate([
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], IntegrationEntity.prototype, "updateVersion", null);
exports.IntegrationEntity = IntegrationEntity = __decorate([
    (0, typeorm_1.Entity)('integrations'),
    (0, typeorm_1.Index)(['tenantId', 'isActive']),
    (0, typeorm_1.Index)(['category', 'status']),
    (0, typeorm_1.Index)(['publishedAt']),
    (0, typeorm_1.Index)(['popularity'])
], IntegrationEntity);
// Supporting Entities
let DeveloperEntity = class DeveloperEntity {
    toJSON() {
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
};
exports.DeveloperEntity = DeveloperEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DeveloperEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, name: 'company_name' }),
    __metadata("design:type", String)
], DeveloperEntity.prototype, "companyName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, name: 'contact_name' }),
    __metadata("design:type", String)
], DeveloperEntity.prototype, "contactName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, unique: true }),
    __metadata("design:type", String)
], DeveloperEntity.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", String)
], DeveloperEntity.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], DeveloperEntity.prototype, "website", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], DeveloperEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, name: 'logo_url', nullable: true }),
    __metadata("design:type", String)
], DeveloperEntity.prototype, "logoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'social_links', default: {} }),
    __metadata("design:type", Object)
], DeveloperEntity.prototype, "socialLinks", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'is_verified', default: false }),
    __metadata("design:type", Boolean)
], DeveloperEntity.prototype, "isVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', name: 'verified_at', nullable: true }),
    __metadata("design:type", Date)
], DeveloperEntity.prototype, "verifiedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'is_partner', default: false }),
    __metadata("design:type", Boolean)
], DeveloperEntity.prototype, "isPartner", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'partner_benefits', default: {} }),
    __metadata("design:type", Object)
], DeveloperEntity.prototype, "partnerBenefits", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2, name: 'total_revenue', default: 0.0 }),
    __metadata("design:type", Number)
], DeveloperEntity.prototype, "totalRevenue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'total_integrations', default: 0 }),
    __metadata("design:type", Number)
], DeveloperEntity.prototype, "totalIntegrations", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 3, scale: 2, name: 'average_rating', default: 0.0 }),
    __metadata("design:type", Number)
], DeveloperEntity.prototype, "averageRating", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], DeveloperEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], DeveloperEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], DeveloperEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => IntegrationEntity, integration => integration.developer),
    __metadata("design:type", Array)
], DeveloperEntity.prototype, "integrations", void 0);
exports.DeveloperEntity = DeveloperEntity = __decorate([
    (0, typeorm_1.Entity)('developers'),
    (0, typeorm_1.Index)(['email']),
    (0, typeorm_1.Index)(['companyName'])
], DeveloperEntity);
let IntegrationInstallationEntity = class IntegrationInstallationEntity {
};
exports.IntegrationInstallationEntity = IntegrationInstallationEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], IntegrationInstallationEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'integration_id' }),
    __metadata("design:type", String)
], IntegrationInstallationEntity.prototype, "integrationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'tenant_id' }),
    __metadata("design:type", String)
], IntegrationInstallationEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'installed_by' }),
    __metadata("design:type", String)
], IntegrationInstallationEntity.prototype, "installedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', name: 'installed_at', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], IntegrationInstallationEntity.prototype, "installedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'configuration', default: {} }),
    __metadata("design:type", Object)
], IntegrationInstallationEntity.prototype, "configuration", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], IntegrationInstallationEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', name: 'last_sync_at', nullable: true }),
    __metadata("design:type", Date)
], IntegrationInstallationEntity.prototype, "lastSyncAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'sync_count', default: 0 }),
    __metadata("design:type", Number)
], IntegrationInstallationEntity.prototype, "syncCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'error_count', default: 0 }),
    __metadata("design:type", Number)
], IntegrationInstallationEntity.prototype, "errorCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'last_error', nullable: true }),
    __metadata("design:type", String)
], IntegrationInstallationEntity.prototype, "lastError", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'usage_metrics', default: {} }),
    __metadata("design:type", Object)
], IntegrationInstallationEntity.prototype, "usageMetrics", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], IntegrationInstallationEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], IntegrationInstallationEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], IntegrationInstallationEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => IntegrationEntity, integration => integration.installations),
    (0, typeorm_1.JoinColumn)({ name: 'integration_id' }),
    __metadata("design:type", IntegrationEntity)
], IntegrationInstallationEntity.prototype, "integration", void 0);
exports.IntegrationInstallationEntity = IntegrationInstallationEntity = __decorate([
    (0, typeorm_1.Entity)('integration_installations'),
    (0, typeorm_1.Index)(['integrationId', 'tenantId']),
    (0, typeorm_1.Index)(['installedAt'])
], IntegrationInstallationEntity);
let IntegrationReviewEntity = class IntegrationReviewEntity {
};
exports.IntegrationReviewEntity = IntegrationReviewEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], IntegrationReviewEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'integration_id' }),
    __metadata("design:type", String)
], IntegrationReviewEntity.prototype, "integrationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'tenant_id' }),
    __metadata("design:type", String)
], IntegrationReviewEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'user_id' }),
    __metadata("design:type", String)
], IntegrationReviewEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'rating' }),
    __metadata("design:type", Number)
], IntegrationReviewEntity.prototype, "rating", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], IntegrationReviewEntity.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'pros', default: [] }),
    __metadata("design:type", Array)
], IntegrationReviewEntity.prototype, "pros", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'cons', default: [] }),
    __metadata("design:type", Array)
], IntegrationReviewEntity.prototype, "cons", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'is_verified', default: false }),
    __metadata("design:type", Boolean)
], IntegrationReviewEntity.prototype, "isVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'is_featured', default: false }),
    __metadata("design:type", Boolean)
], IntegrationReviewEntity.prototype, "isFeatured", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'helpful_votes', default: 0 }),
    __metadata("design:type", Number)
], IntegrationReviewEntity.prototype, "helpfulVotes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], IntegrationReviewEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], IntegrationReviewEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], IntegrationReviewEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => IntegrationEntity, integration => integration.reviews),
    (0, typeorm_1.JoinColumn)({ name: 'integration_id' }),
    __metadata("design:type", IntegrationEntity)
], IntegrationReviewEntity.prototype, "integration", void 0);
exports.IntegrationReviewEntity = IntegrationReviewEntity = __decorate([
    (0, typeorm_1.Entity)('integration_reviews'),
    (0, typeorm_1.Index)(['integrationId', 'rating']),
    (0, typeorm_1.Index)(['createdAt'])
], IntegrationReviewEntity);
let APIEndpointEntity = class APIEndpointEntity {
    toJSON() {
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
};
exports.APIEndpointEntity = APIEndpointEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], APIEndpointEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'integration_id' }),
    __metadata("design:type", String)
], APIEndpointEntity.prototype, "integrationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], APIEndpointEntity.prototype, "path", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10 }),
    __metadata("design:type", String)
], APIEndpointEntity.prototype, "method", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], APIEndpointEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'parameters', default: {} }),
    __metadata("design:type", Object)
], APIEndpointEntity.prototype, "parameters", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'request_schema', default: {} }),
    __metadata("design:type", Object)
], APIEndpointEntity.prototype, "requestSchema", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'response_schema', default: {} }),
    __metadata("design:type", Object)
], APIEndpointEntity.prototype, "responseSchema", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'examples', default: {} }),
    __metadata("design:type", Object)
], APIEndpointEntity.prototype, "examples", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'requires_auth', default: true }),
    __metadata("design:type", Boolean)
], APIEndpointEntity.prototype, "requiresAuth", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'rate_limit', default: {} }),
    __metadata("design:type", Object)
], APIEndpointEntity.prototype, "rateLimit", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], APIEndpointEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], APIEndpointEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], APIEndpointEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => IntegrationEntity, integration => integration.endpoints),
    (0, typeorm_1.JoinColumn)({ name: 'integration_id' }),
    __metadata("design:type", IntegrationEntity)
], APIEndpointEntity.prototype, "integration", void 0);
exports.APIEndpointEntity = APIEndpointEntity = __decorate([
    (0, typeorm_1.Entity)('api_endpoints'),
    (0, typeorm_1.Index)(['integrationId', 'method'])
], APIEndpointEntity);
let IntegrationEventEntity = class IntegrationEventEntity {
};
exports.IntegrationEventEntity = IntegrationEventEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], IntegrationEventEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'integration_id' }),
    __metadata("design:type", String)
], IntegrationEventEntity.prototype, "integrationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'tenant_id', nullable: true }),
    __metadata("design:type", String)
], IntegrationEventEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, name: 'event_type' }),
    __metadata("design:type", String)
], IntegrationEventEntity.prototype, "eventType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'event_data', default: {} }),
    __metadata("design:type", Object)
], IntegrationEventEntity.prototype, "eventData", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 45, name: 'ip_address', nullable: true }),
    __metadata("design:type", String)
], IntegrationEventEntity.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'user_agent', nullable: true }),
    __metadata("design:type", String)
], IntegrationEventEntity.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], IntegrationEventEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], IntegrationEventEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => IntegrationEntity, integration => integration.events),
    (0, typeorm_1.JoinColumn)({ name: 'integration_id' }),
    __metadata("design:type", IntegrationEntity)
], IntegrationEventEntity.prototype, "integration", void 0);
exports.IntegrationEventEntity = IntegrationEventEntity = __decorate([
    (0, typeorm_1.Entity)('integration_events'),
    (0, typeorm_1.Index)(['integrationId', 'eventType']),
    (0, typeorm_1.Index)(['createdAt'])
], IntegrationEventEntity);
//# sourceMappingURL=integration-marketplace.entity.js.map