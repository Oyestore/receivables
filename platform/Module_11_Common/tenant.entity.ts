/**
 * Tenant Entity for Platform-Level Administrative Management
 * SME Receivables Management Platform - Administrative Module
 * 
 * @fileoverview Comprehensive tenant entity for platform-level tenant lifecycle management
 * @version 1.0.0
 * @since 2025-01-21
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
  Check
} from 'typeorm';
import {
  TenantStatus,
  BusinessType,
  ComplianceStatus,
  DataResidency
} from '@shared/enums/administrative.enum';
import {
  ITenant,
  IResourceLimits,
  ITenantConfiguration
} from '@shared/interfaces/administrative.interface';
import { SubscriptionPlan } from './subscription-plan.entity';
import { TenantContact } from './tenant-contact.entity';
import { TenantSubscription } from './tenant-subscription.entity';
import { TenantBillingInfo } from './tenant-billing-info.entity';

/**
 * Tenant entity representing organizations using the platform
 * Implements comprehensive tenant lifecycle management with subscription integration
 */
@Entity('tenants', { schema: 'admin_platform' })
@Index(['status'])
@Index(['organizationName'])
@Index(['subscriptionPlanId'])
@Index(['lastActivity'])
@Index(['complianceStatus'])
@Index(['createdDate'])
@Check(`status IN ('provisioning', 'active', 'suspended', 'terminated', 'pending_activation', 'under_review', 'migration_in_progress')`)
@Check(`business_type IN ('sole_proprietorship', 'partnership', 'private_limited', 'public_limited', 'llp', 'trust', 'society', 'cooperative', 'government', 'ngo')`)
@Check(`compliance_status IN ('pending', 'compliant', 'non_compliant', 'under_review', 'remediation_required', 'exempted')`)
@Check(`data_residency IN ('default', 'india', 'singapore', 'uae', 'us_east', 'eu_west', 'custom')`)
export class Tenant implements ITenant {
  /**
   * Unique identifier for the tenant
   */
  @PrimaryGeneratedColumn('uuid', { name: 'tenant_id' })
  id: string;

  /**
   * Tenant ID for external references (same as id for consistency)
   */
  @Column({ name: 'tenant_id', type: 'uuid', insert: false, update: false })
  tenantId: string;

  /**
   * Organization name (must be unique across platform)
   */
  @Column({ 
    name: 'organization_name', 
    type: 'varchar', 
    length: 255,
    unique: true
  })
  organizationName: string;

  /**
   * Business type classification for compliance and feature enablement
   */
  @Column({ 
    name: 'business_type', 
    type: 'enum',
    enum: BusinessType
  })
  businessType: BusinessType;

  /**
   * Current tenant status in lifecycle
   */
  @Column({ 
    name: 'status', 
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.PROVISIONING
  })
  status: TenantStatus;

  /**
   * Associated subscription plan ID
   */
  @Column({ name: 'subscription_plan_id', type: 'uuid' })
  subscriptionPlanId: string;

  /**
   * Date when tenant was activated (null if not yet activated)
   */
  @Column({ 
    name: 'activated_date', 
    type: 'timestamp with time zone',
    nullable: true
  })
  activatedDate?: Date;

  /**
   * Last activity timestamp for monitoring and billing
   */
  @Column({ 
    name: 'last_activity', 
    type: 'timestamp with time zone',
    nullable: true
  })
  lastActivity?: Date;

  /**
   * Compliance status for regulatory management
   */
  @Column({ 
    name: 'compliance_status', 
    type: 'enum',
    enum: ComplianceStatus,
    default: ComplianceStatus.PENDING
  })
  complianceStatus: ComplianceStatus;

  /**
   * Data residency requirements for regulatory compliance
   */
  @Column({ 
    name: 'data_residency', 
    type: 'enum',
    enum: DataResidency,
    default: DataResidency.DEFAULT
  })
  dataResidency: DataResidency;

  /**
   * Custom domain for tenant branding (optional)
   */
  @Column({ 
    name: 'custom_domain', 
    type: 'varchar', 
    length: 255,
    nullable: true,
    unique: true
  })
  customDomain?: string;

  /**
   * Resource limits and quotas for the tenant
   */
  @Column({ 
    name: 'resource_limits', 
    type: 'jsonb',
    default: {}
  })
  resourceLimits: IResourceLimits;

  /**
   * Comprehensive tenant configuration including branding, security, features
   */
  @Column({ 
    name: 'configuration', 
    type: 'jsonb',
    default: {}
  })
  configuration: ITenantConfiguration;

  /**
   * Record creation timestamp
   */
  @CreateDateColumn({ 
    name: 'created_date',
    type: 'timestamp with time zone'
  })
  createdDate: Date;

  /**
   * Record last update timestamp
   */
  @UpdateDateColumn({ 
    name: 'updated_date',
    type: 'timestamp with time zone'
  })
  updatedDate: Date;

  /**
   * ID of user who created this record
   */
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  /**
   * ID of user who last updated this record
   */
  @Column({ 
    name: 'updated_by', 
    type: 'uuid',
    nullable: true
  })
  updatedBy?: string;

  /**
   * Version number for optimistic locking
   */
  @Column({ 
    name: 'version', 
    type: 'integer',
    default: 1
  })
  version: number;

  /**
   * Additional metadata for extensibility
   */
  @Column({ 
    name: 'metadata', 
    type: 'jsonb',
    default: {}
  })
  metadata?: Record<string, any>;

  // =====================================================================================
  // RELATIONSHIPS
  // =====================================================================================

  /**
   * Associated subscription plan
   */
  @ManyToOne(() => SubscriptionPlan, { eager: false })
  @JoinColumn({ name: 'subscription_plan_id' })
  subscriptionPlan?: SubscriptionPlan;

  /**
   * Tenant contact information
   */
  @OneToMany(() => TenantContact, contact => contact.tenant, { 
    cascade: true,
    eager: false
  })
  contacts: TenantContact[];

  /**
   * Active tenant subscription
   */
  @OneToOne(() => TenantSubscription, subscription => subscription.tenant)
  activeSubscription?: TenantSubscription;

  /**
   * Billing information
   */
  @OneToOne(() => TenantBillingInfo, billing => billing.tenant)
  billingInfo?: TenantBillingInfo;

  // =====================================================================================
  // COMPUTED PROPERTIES
  // =====================================================================================

  /**
   * Check if tenant is currently active
   */
  get isActive(): boolean {
    return this.status === TenantStatus.ACTIVE;
  }

  /**
   * Check if tenant is suspended
   */
  get isSuspended(): boolean {
    return this.status === TenantStatus.SUSPENDED;
  }

  /**
   * Check if tenant is terminated
   */
  get isTerminated(): boolean {
    return this.status === TenantStatus.TERMINATED;
  }

  /**
   * Check if tenant is compliant
   */
  get isCompliant(): boolean {
    return this.complianceStatus === ComplianceStatus.COMPLIANT;
  }

  /**
   * Get days since last activity
   */
  get daysSinceLastActivity(): number | null {
    if (!this.lastActivity) return null;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.lastActivity.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get tenant age in days
   */
  get tenantAgeInDays(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.createdDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if tenant has custom domain configured
   */
  get hasCustomDomain(): boolean {
    return !!this.customDomain;
  }

  /**
   * Get primary contact from contacts array
   */
  get primaryContact(): TenantContact | undefined {
    return this.contacts?.find(contact => contact.isPrimary);
  }

  /**
   * Get billing contact from contacts array
   */
  get billingContact(): TenantContact | undefined {
    return this.contacts?.find(contact => contact.contactType === 'billing');
  }

  /**
   * Get technical contact from contacts array
   */
  get technicalContact(): TenantContact | undefined {
    return this.contacts?.find(contact => contact.contactType === 'technical');
  }

  // =====================================================================================
  // BUSINESS METHODS
  // =====================================================================================

  /**
   * Activate the tenant
   */
  activate(): void {
    if (this.status !== TenantStatus.PENDING_ACTIVATION) {
      throw new Error('Tenant must be in pending activation status to activate');
    }
    this.status = TenantStatus.ACTIVE;
    this.activatedDate = new Date();
    this.lastActivity = new Date();
  }

  /**
   * Suspend the tenant
   */
  suspend(reason?: string): void {
    if (this.status !== TenantStatus.ACTIVE) {
      throw new Error('Only active tenants can be suspended');
    }
    this.status = TenantStatus.SUSPENDED;
    if (reason) {
      this.metadata = { ...this.metadata, suspensionReason: reason };
    }
  }

  /**
   * Reactivate a suspended tenant
   */
  reactivate(): void {
    if (this.status !== TenantStatus.SUSPENDED) {
      throw new Error('Only suspended tenants can be reactivated');
    }
    this.status = TenantStatus.ACTIVE;
    this.lastActivity = new Date();
    // Remove suspension reason from metadata
    if (this.metadata?.suspensionReason) {
      const { suspensionReason, ...remainingMetadata } = this.metadata;
      this.metadata = remainingMetadata;
    }
  }

  /**
   * Terminate the tenant
   */
  terminate(reason?: string): void {
    if (this.status === TenantStatus.TERMINATED) {
      throw new Error('Tenant is already terminated');
    }
    this.status = TenantStatus.TERMINATED;
    if (reason) {
      this.metadata = { ...this.metadata, terminationReason: reason };
    }
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity(): void {
    this.lastActivity = new Date();
  }

  /**
   * Update compliance status
   */
  updateComplianceStatus(status: ComplianceStatus, notes?: string): void {
    this.complianceStatus = status;
    if (notes) {
      this.metadata = { 
        ...this.metadata, 
        complianceNotes: notes,
        complianceUpdatedDate: new Date().toISOString()
      };
    }
  }

  /**
   * Update resource limits
   */
  updateResourceLimits(limits: Partial<IResourceLimits>): void {
    this.resourceLimits = { ...this.resourceLimits, ...limits };
  }

  /**
   * Update tenant configuration
   */
  updateConfiguration(config: Partial<ITenantConfiguration>): void {
    this.configuration = { ...this.configuration, ...config };
  }

  /**
   * Set custom domain
   */
  setCustomDomain(domain: string): void {
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      throw new Error('Invalid domain format');
    }
    this.customDomain = domain;
  }

  /**
   * Remove custom domain
   */
  removeCustomDomain(): void {
    this.customDomain = null;
  }

  /**
   * Check if tenant can access a specific module
   */
  canAccessModule(moduleName: string): boolean {
    const enabledModules = this.configuration?.features?.enabledModules || [];
    return enabledModules.includes(moduleName as any);
  }

  /**
   * Check if tenant has reached resource limit
   */
  hasReachedLimit(resourceType: keyof IResourceLimits): boolean {
    const limit = this.resourceLimits[resourceType];
    if (limit === -1) return false; // Unlimited
    
    // This would typically check against actual usage
    // For now, we'll return false as usage tracking is handled separately
    return false;
  }

  /**
   * Get tenant display name
   */
  get displayName(): string {
    return this.organizationName;
  }

  /**
   * Get tenant summary for dashboard display
   */
  getSummary(): {
    id: string;
    name: string;
    status: TenantStatus;
    businessType: BusinessType;
    userCount: number;
    lastActivity: Date | null;
    complianceStatus: ComplianceStatus;
  } {
    return {
      id: this.id,
      name: this.organizationName,
      status: this.status,
      businessType: this.businessType,
      userCount: this.resourceLimits?.maxUsers || 0,
      lastActivity: this.lastActivity,
      complianceStatus: this.complianceStatus
    };
  }

  /**
   * Validate tenant configuration
   */
  validateConfiguration(): string[] {
    const errors: string[] = [];

    if (!this.organizationName?.trim()) {
      errors.push('Organization name is required');
    }

    if (!this.subscriptionPlanId) {
      errors.push('Subscription plan is required');
    }

    if (!this.createdBy) {
      errors.push('Created by user ID is required');
    }

    if (this.customDomain) {
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(this.customDomain)) {
        errors.push('Invalid custom domain format');
      }
    }

    return errors;
  }

  /**
   * Prepare entity for database insertion
   */
  beforeInsert(): void {
    this.tenantId = this.id;
    this.version = 1;
    this.createdDate = new Date();
    this.updatedDate = new Date();
    
    // Set default resource limits if not provided
    if (!this.resourceLimits) {
      this.resourceLimits = {
        maxUsers: 10,
        maxStorage: 10, // GB
        maxApiCalls: 10000,
        maxComputeHours: 100,
        maxIntegrations: 5,
        maxCustomFields: 50,
        maxWorkflows: 10,
        maxReports: 20
      };
    }

    // Set default configuration if not provided
    if (!this.configuration) {
      this.configuration = {
        branding: {},
        security: {
          mfaRequired: false,
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: false,
            maxAge: 90,
            historyCount: 5,
            lockoutThreshold: 5,
            lockoutDuration: 30
          },
          sessionTimeout: 60,
          ssoEnabled: false,
          auditRetention: 365
        },
        features: {
          enabledModules: [],
          moduleConfigurations: {},
          featureFlags: {},
          customizations: {}
        },
        integrations: {
          enabledIntegrations: [],
          integrationSettings: {},
          webhookEndpoints: [],
          apiKeys: {}
        },
        notifications: {
          enabledChannels: [],
          channelSettings: {},
          templates: {},
          preferences: {
            defaultChannel: 'email' as any,
            urgentChannel: 'email' as any,
            quietHours: {
              enabled: false,
              startTime: '22:00',
              endTime: '08:00',
              timeZone: 'UTC' as any,
              exceptions: []
            },
            frequency: {}
          }
        },
        compliance: {
          frameworks: [],
          dataRetention: {
            defaultRetention: 2555, // 7 years in days
            categoryRetention: {},
            archivalSettings: {
              enabled: false,
              archiveAfter: 1825, // 5 years
              archiveLocation: '',
              compressionEnabled: true
            },
            deletionSettings: {
              enabled: false,
              deleteAfter: 2555, // 7 years
              secureDelete: true,
              approvalRequired: true
            }
          },
          auditSettings: {
            enabled: true,
            logLevel: 'info' as any,
            includedActions: [],
            excludedActions: [],
            realTimeMonitoring: false,
            alertThresholds: {}
          },
          privacySettings: {
            dataMinimization: true,
            consentManagement: true,
            rightToErasure: true,
            dataPortability: true,
            anonymization: {
              enabled: false,
              techniques: [],
              schedule: '',
              retainStructure: true
            }
          },
          reportingSettings: {
            automaticReports: false,
            reportSchedule: '',
            reportRecipients: [],
            reportFormats: [],
            customReports: []
          }
        }
      };
    }
  }

  /**
   * Prepare entity for database update
   */
  beforeUpdate(): void {
    this.updatedDate = new Date();
    this.version += 1;
  }
}

