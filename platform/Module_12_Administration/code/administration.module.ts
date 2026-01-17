import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Entities
import { SubscriptionPlan, PlanFeature, UsageRate } from './entities/subscription.entity';
import { Tenant, TenantContact } from './entities/tenant.entity';
import { User } from './entities/user.entity';

// Controllers
import { AdministrationController } from './controllers/administration.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { ComplianceController } from './controllers/compliance.controller';
import { IntegrationsController } from './controllers/integrations.controller';
import { MfaController } from './controllers/mfa.controller';
import { P2FeaturesController } from './controllers/p2-features.controller';
import { PartnerController } from './controllers/partner.controller';
import { PortalController } from './controllers/portal.controller';
import { PricingController } from './controllers/pricing.controller';
import { ProvisioningController } from './controllers/provisioning.controller';
import { RiskController } from './controllers/risk.controller';
import { SubscriptionController } from './controllers/subscription.controller';
import { UsageController } from './controllers/usage.controller';

// Services
import { AdministrationService } from './services/administration.service';
import { AdvancedAnalyticsService } from './services/advanced-analytics.service';
import { AdvancedAuthService } from './services/advanced-auth.service';
import { AiPersonalizationService } from './services/ai-personalization.service';
import { AuditService } from './services/audit.service';
import { ComplianceMonitoringService } from './services/compliance-monitoring.service';
import { DynamicPricingService } from './services/dynamic-pricing.service';
import { IntegrationMarketplaceService } from './services/integration-marketplace.service';
import { MfaService } from './services/mfa.service';
import { MlCapacityPlanningService } from './services/ml-capacity-planning.service';
import { ModuleAccessService } from './services/module-access.service';
import { OAuth2Service } from './services/oauth2.service';
import { PartnerManagementService } from './services/partner-management.service';
import { PortalBuilderService } from './services/portal-builder.service';
import { RiskAssessmentService } from './services/risk-assessment.service';
import { SamlService } from './services/saml.service';
import { SubscriptionService } from './services/subscription.service';
import { TenantProvisioningService } from './services/tenant-provisioning.service';
import { UsageTrackingService } from './services/usage-tracking.service';

/**
 * Administration Module
 * 
 * This module provides comprehensive administrative functionality for the SME Platform,
 * including tenant management, user administration, subscription management, compliance,
 * security, and advanced features.
 * 
 * Key Features:
 * - Platform-level tenant lifecycle management
 * - Tenant-level user and access control
 * - 2-tier hierarchical administration architecture
 * - Subscription and billing management
 * - Compliance and risk assessment
 * - Advanced authentication (MFA, OAuth2, SAML)
 * - AI-powered personalization and analytics
 * - Partner management and marketplace
 * - Portal builder and customization
 */
@Module({
  imports: [
    // Database entities
    TypeOrmModule.forFeature([
      // Subscription entities
      SubscriptionPlan,
      PlanFeature,
      UsageRate,
      // Tenant entities
      Tenant,
      TenantContact,
      // User entities
      User,
    ]),
  ],
  controllers: [
    // Core administration controllers
    AdministrationController,
    AnalyticsController,
    ComplianceController,
    IntegrationsController,
    MfaController,
    P2FeaturesController,
    PartnerController,
    PortalController,
    PricingController,
    ProvisioningController,
    RiskController,
    SubscriptionController,
    UsageController,
  ],
  providers: [
    // Core services
    AdministrationService,
    AdvancedAnalyticsService,
    AdvancedAuthService,
    AiPersonalizationService,
    AuditService,
    ComplianceMonitoringService,
    DynamicPricingService,
    IntegrationMarketplaceService,
    MfaService,
    MlCapacityPlanningService,
    ModuleAccessService,
    OAuth2Service,
    PartnerManagementService,
    PortalBuilderService,
    RiskAssessmentService,
    SamlService,
    SubscriptionService,
    TenantProvisioningService,
    UsageTrackingService,
  ],
  exports: [
    // Export core services for other modules
    AdministrationService,
    SubscriptionService,
    TenantProvisioningService,
    UsageTrackingService,
    ComplianceMonitoringService,
    AdvancedAuthService,
    MfaService,
  ],
})
export class AdministrationModule {}
