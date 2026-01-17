/**
 * Tenant Management Service for Platform-Level Administrative Operations
 * SME Receivables Management Platform - Administrative Module
 * 
 * @fileoverview Comprehensive service for tenant lifecycle management, provisioning, and operations
 * @version 1.0.0
 * @since 2025-01-21
 */

import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, DataSource, FindOptionsWhere } from 'typeorm';
import { 
  TenantStatus, 
  BusinessType, 
  ComplianceStatus, 
  DataResidency,
  AuditAction,
  Priority
} from '@shared/enums/administrative.enum';
import {
  ITenant,
  IResourceLimits,
  ITenantConfiguration,
  ISearchCriteria,
  IPagination,
  IApiResponse
} from '@shared/interfaces/administrative.interface';
import { Tenant } from '../entities/tenant.entity';
import { TenantContact } from '../entities/tenant-contact.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { TenantSubscription } from '../entities/tenant-subscription.entity';
import { PlatformAuditLog } from '../entities/platform-audit-log.entity';

/**
 * Data Transfer Objects for Tenant Management
 */
export interface CreateTenantDto {
  organizationName: string;
  businessType: BusinessType;
  subscriptionPlanId: string;
  dataResidency?: DataResidency;
  customDomain?: string;
  resourceLimits?: Partial<IResourceLimits>;
  configuration?: Partial<ITenantConfiguration>;
  contacts: CreateTenantContactDto[];
  createdBy: string;
}

export interface CreateTenantContactDto {
  contactType: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  isPrimary: boolean;
}

export interface UpdateTenantDto {
  organizationName?: string;
  businessType?: BusinessType;
  customDomain?: string;
  resourceLimits?: Partial<IResourceLimits>;
  configuration?: Partial<ITenantConfiguration>;
  updatedBy: string;
}

export interface TenantProvisioningResult {
  tenant: Tenant;
  provisioningStatus: 'success' | 'partial' | 'failed';
  provisioningSteps: ProvisioningStep[];
  errors?: string[];
}

export interface ProvisioningStep {
  step: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message?: string;
  timestamp: Date;
}

export interface TenantMetrics {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  terminatedTenants: number;
  tenantsByBusinessType: Record<BusinessType, number>;
  tenantsByPlan: Record<string, number>;
  complianceStatus: Record<ComplianceStatus, number>;
  averageUsage: Record<string, number>;
  growthMetrics: {
    newTenantsThisMonth: number;
    churnRate: number;
    activationRate: number;
  };
}

/**
 * Comprehensive tenant management service for platform-level operations
 * Handles tenant lifecycle, provisioning, monitoring, and compliance
 */
@Injectable()
export class TenantManagementService {
  private readonly logger = new Logger(TenantManagementService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantContact)
    private readonly contactRepository: Repository<TenantContact>,
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepository: Repository<SubscriptionPlan>,
    @InjectRepository(TenantSubscription)
    private readonly tenantSubscriptionRepository: Repository<TenantSubscription>,
    @InjectRepository(PlatformAuditLog)
    private readonly auditLogRepository: Repository<PlatformAuditLog>,
    private readonly dataSource: DataSource
  ) {}

  // =====================================================================================
  // TENANT CREATION AND PROVISIONING
  // =====================================================================================

  /**
   * Create a new tenant with comprehensive provisioning
   */
  async createTenant(createTenantDto: CreateTenantDto): Promise<TenantProvisioningResult> {
    this.logger.log(`Creating new tenant: ${createTenantDto.organizationName}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const provisioningSteps: ProvisioningStep[] = [];
    let tenant: Tenant;

    try {
      // Step 1: Validate subscription plan
      provisioningSteps.push({
        step: 'validate_subscription_plan',
        status: 'in_progress',
        timestamp: new Date()
      });

      const subscriptionPlan = await this.subscriptionPlanRepository.findOne({
        where: { id: createTenantDto.subscriptionPlanId, status: 'active' }
      });

      if (!subscriptionPlan) {
        throw new BadRequestException('Invalid or inactive subscription plan');
      }

      provisioningSteps[provisioningSteps.length - 1].status = 'completed';

      // Step 2: Check for duplicate organization name
      provisioningSteps.push({
        step: 'check_duplicates',
        status: 'in_progress',
        timestamp: new Date()
      });

      const existingTenant = await this.tenantRepository.findOne({
        where: { organizationName: createTenantDto.organizationName }
      });

      if (existingTenant) {
        throw new ConflictException('Organization name already exists');
      }

      provisioningSteps[provisioningSteps.length - 1].status = 'completed';

      // Step 3: Create tenant entity
      provisioningSteps.push({
        step: 'create_tenant',
        status: 'in_progress',
        timestamp: new Date()
      });

      tenant = this.tenantRepository.create({
        organizationName: createTenantDto.organizationName,
        businessType: createTenantDto.businessType,
        subscriptionPlanId: createTenantDto.subscriptionPlanId,
        status: TenantStatus.PROVISIONING,
        dataResidency: createTenantDto.dataResidency || DataResidency.DEFAULT,
        customDomain: createTenantDto.customDomain,
        resourceLimits: this.mergeResourceLimits(subscriptionPlan.usageLimits, createTenantDto.resourceLimits),
        configuration: this.mergeConfiguration(createTenantDto.configuration),
        createdBy: createTenantDto.createdBy
      });

      tenant.beforeInsert();
      tenant = await queryRunner.manager.save(tenant);

      provisioningSteps[provisioningSteps.length - 1].status = 'completed';

      // Step 4: Create tenant contacts
      provisioningSteps.push({
        step: 'create_contacts',
        status: 'in_progress',
        timestamp: new Date()
      });

      const contacts = createTenantDto.contacts.map(contactDto => 
        this.contactRepository.create({
          tenantId: tenant.id,
          ...contactDto,
          createdBy: createTenantDto.createdBy
        })
      );

      await queryRunner.manager.save(contacts);

      provisioningSteps[provisioningSteps.length - 1].status = 'completed';

      // Step 5: Create tenant subscription
      provisioningSteps.push({
        step: 'create_subscription',
        status: 'in_progress',
        timestamp: new Date()
      });

      const subscription = this.tenantSubscriptionRepository.create({
        tenantId: tenant.id,
        planId: createTenantDto.subscriptionPlanId,
        status: 'active',
        startDate: new Date(),
        billingCycle: subscriptionPlan.billingCycle,
        autoRenew: true,
        createdBy: createTenantDto.createdBy
      });

      await queryRunner.manager.save(subscription);

      provisioningSteps[provisioningSteps.length - 1].status = 'completed';

      // Step 6: Initialize tenant-specific resources
      provisioningSteps.push({
        step: 'initialize_resources',
        status: 'in_progress',
        timestamp: new Date()
      });

      await this.initializeTenantResources(tenant, queryRunner);

      provisioningSteps[provisioningSteps.length - 1].status = 'completed';

      // Step 7: Update tenant status to pending activation
      tenant.status = TenantStatus.PENDING_ACTIVATION;
      await queryRunner.manager.save(tenant);

      await queryRunner.commitTransaction();

      // Log audit event
      await this.logAuditEvent({
        action: AuditAction.TENANT_CREATED,
        resourceType: 'tenant',
        resourceId: tenant.id,
        details: {
          organizationName: tenant.organizationName,
          businessType: tenant.businessType,
          subscriptionPlan: subscriptionPlan.planName
        },
        adminId: createTenantDto.createdBy,
        severity: Priority.MEDIUM
      });

      this.logger.log(`Tenant created successfully: ${tenant.id}`);

      return {
        tenant,
        provisioningStatus: 'success',
        provisioningSteps
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      
      // Mark current step as failed
      if (provisioningSteps.length > 0) {
        provisioningSteps[provisioningSteps.length - 1].status = 'failed';
        provisioningSteps[provisioningSteps.length - 1].message = error.message;
      }

      this.logger.error(`Failed to create tenant: ${error.message}`, error.stack);

      return {
        tenant: null,
        provisioningStatus: 'failed',
        provisioningSteps,
        errors: [error.message]
      };

    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Initialize tenant-specific resources and configurations
   */
  private async initializeTenantResources(tenant: Tenant, queryRunner: QueryRunner): Promise<void> {
    // Create tenant-specific database schema if required
    // Initialize default roles and permissions
    // Set up default notification templates
    // Configure default workflows
    // This would typically involve calling other services

    this.logger.log(`Initializing resources for tenant: ${tenant.id}`);
    
    // Placeholder for resource initialization
    // In a real implementation, this would:
    // 1. Create tenant-specific database objects
    // 2. Initialize default roles and permissions
    // 3. Set up notification templates
    // 4. Configure default workflows
    // 5. Initialize monitoring and alerting
  }

  // =====================================================================================
  // TENANT LIFECYCLE MANAGEMENT
  // =====================================================================================

  /**
   * Activate a tenant
   */
  async activateTenant(tenantId: string, activatedBy: string): Promise<Tenant> {
    this.logger.log(`Activating tenant: ${tenantId}`);

    const tenant = await this.findTenantById(tenantId);
    
    if (tenant.status !== TenantStatus.PENDING_ACTIVATION) {
      throw new BadRequestException('Tenant must be in pending activation status');
    }

    tenant.activate();
    tenant.updatedBy = activatedBy;
    
    const updatedTenant = await this.tenantRepository.save(tenant);

    await this.logAuditEvent({
      action: AuditAction.TENANT_ACTIVATED,
      resourceType: 'tenant',
      resourceId: tenantId,
      details: { organizationName: tenant.organizationName },
      adminId: activatedBy,
      severity: Priority.MEDIUM
    });

    this.logger.log(`Tenant activated successfully: ${tenantId}`);
    return updatedTenant;
  }

  /**
   * Suspend a tenant
   */
  async suspendTenant(tenantId: string, reason: string, suspendedBy: string): Promise<Tenant> {
    this.logger.log(`Suspending tenant: ${tenantId}`);

    const tenant = await this.findTenantById(tenantId);
    
    tenant.suspend(reason);
    tenant.updatedBy = suspendedBy;
    
    const updatedTenant = await this.tenantRepository.save(tenant);

    await this.logAuditEvent({
      action: AuditAction.TENANT_SUSPENDED,
      resourceType: 'tenant',
      resourceId: tenantId,
      details: { 
        organizationName: tenant.organizationName,
        reason 
      },
      adminId: suspendedBy,
      severity: Priority.HIGH
    });

    this.logger.log(`Tenant suspended successfully: ${tenantId}`);
    return updatedTenant;
  }

  /**
   * Reactivate a suspended tenant
   */
  async reactivateTenant(tenantId: string, reactivatedBy: string): Promise<Tenant> {
    this.logger.log(`Reactivating tenant: ${tenantId}`);

    const tenant = await this.findTenantById(tenantId);
    
    tenant.reactivate();
    tenant.updatedBy = reactivatedBy;
    
    const updatedTenant = await this.tenantRepository.save(tenant);

    await this.logAuditEvent({
      action: AuditAction.TENANT_ACTIVATED,
      resourceType: 'tenant',
      resourceId: tenantId,
      details: { 
        organizationName: tenant.organizationName,
        action: 'reactivated'
      },
      adminId: reactivatedBy,
      severity: Priority.MEDIUM
    });

    this.logger.log(`Tenant reactivated successfully: ${tenantId}`);
    return updatedTenant;
  }

  /**
   * Terminate a tenant
   */
  async terminateTenant(tenantId: string, reason: string, terminatedBy: string): Promise<Tenant> {
    this.logger.log(`Terminating tenant: ${tenantId}`);

    const tenant = await this.findTenantById(tenantId);
    
    tenant.terminate(reason);
    tenant.updatedBy = terminatedBy;
    
    const updatedTenant = await this.tenantRepository.save(tenant);

    await this.logAuditEvent({
      action: AuditAction.TENANT_TERMINATED,
      resourceType: 'tenant',
      resourceId: tenantId,
      details: { 
        organizationName: tenant.organizationName,
        reason 
      },
      adminId: terminatedBy,
      severity: Priority.CRITICAL
    });

    this.logger.log(`Tenant terminated successfully: ${tenantId}`);
    return updatedTenant;
  }

  // =====================================================================================
  // TENANT RETRIEVAL AND SEARCH
  // =====================================================================================

  /**
   * Find tenant by ID with full details
   */
  async findTenantById(tenantId: string, includeRelations: boolean = false): Promise<Tenant> {
    const relations = includeRelations ? ['contacts', 'subscriptionPlan', 'activeSubscription'] : [];
    
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      relations
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found: ${tenantId}`);
    }

    return tenant;
  }

  /**
   * Find tenant by organization name
   */
  async findTenantByOrganizationName(organizationName: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { organizationName },
      relations: ['contacts', 'subscriptionPlan']
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found: ${organizationName}`);
    }

    return tenant;
  }

  /**
   * Search tenants with advanced filtering and pagination
   */
  async searchTenants(criteria: ISearchCriteria): Promise<IApiResponse<{ tenants: Tenant[]; pagination: IPagination }>> {
    try {
      const queryBuilder = this.tenantRepository.createQueryBuilder('tenant')
        .leftJoinAndSelect('tenant.subscriptionPlan', 'plan')
        .leftJoinAndSelect('tenant.contacts', 'contacts');

      // Apply filters
      if (criteria.filters) {
        if (criteria.filters.status) {
          queryBuilder.andWhere('tenant.status = :status', { status: criteria.filters.status });
        }
        if (criteria.filters.businessType) {
          queryBuilder.andWhere('tenant.businessType = :businessType', { businessType: criteria.filters.businessType });
        }
        if (criteria.filters.subscriptionPlanId) {
          queryBuilder.andWhere('tenant.subscriptionPlanId = :planId', { planId: criteria.filters.subscriptionPlanId });
        }
        if (criteria.filters.complianceStatus) {
          queryBuilder.andWhere('tenant.complianceStatus = :complianceStatus', { complianceStatus: criteria.filters.complianceStatus });
        }
        if (criteria.filters.dataResidency) {
          queryBuilder.andWhere('tenant.dataResidency = :dataResidency', { dataResidency: criteria.filters.dataResidency });
        }
        if (criteria.filters.createdAfter) {
          queryBuilder.andWhere('tenant.createdDate >= :createdAfter', { createdAfter: criteria.filters.createdAfter });
        }
        if (criteria.filters.createdBefore) {
          queryBuilder.andWhere('tenant.createdDate <= :createdBefore', { createdBefore: criteria.filters.createdBefore });
        }
      }

      // Apply search query
      if (criteria.query) {
        queryBuilder.andWhere(
          '(tenant.organizationName ILIKE :query OR tenant.customDomain ILIKE :query)',
          { query: `%${criteria.query}%` }
        );
      }

      // Apply sorting
      if (criteria.sorting && criteria.sorting.length > 0) {
        criteria.sorting.forEach((sort, index) => {
          const order = sort.direction.toUpperCase() as 'ASC' | 'DESC';
          if (index === 0) {
            queryBuilder.orderBy(`tenant.${sort.field}`, order);
          } else {
            queryBuilder.addOrderBy(`tenant.${sort.field}`, order);
          }
        });
      } else {
        queryBuilder.orderBy('tenant.createdDate', 'DESC');
      }

      // Apply pagination
      const page = criteria.pagination?.page || 1;
      const limit = criteria.pagination?.limit || 20;
      const offset = (page - 1) * limit;

      queryBuilder.skip(offset).take(limit);

      const [tenants, total] = await queryBuilder.getManyAndCount();

      const pagination: IPagination = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1
      };

      return {
        success: true,
        data: { tenants, pagination }
      };

    } catch (error) {
      this.logger.error(`Failed to search tenants: ${error.message}`, error.stack);
      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search tenants',
          details: { originalError: error.message },
          timestamp: new Date(),
          requestId: 'generated-request-id'
        }
      };
    }
  }

  /**
   * Get all active tenants
   */
  async getActiveTenants(): Promise<Tenant[]> {
    return this.tenantRepository.find({
      where: { status: TenantStatus.ACTIVE },
      relations: ['subscriptionPlan'],
      order: { lastActivity: 'DESC' }
    });
  }

  /**
   * Get tenants by subscription plan
   */
  async getTenantsByPlan(planId: string): Promise<Tenant[]> {
    return this.tenantRepository.find({
      where: { subscriptionPlanId: planId },
      relations: ['subscriptionPlan', 'contacts'],
      order: { createdDate: 'DESC' }
    });
  }

  // =====================================================================================
  // TENANT UPDATES AND CONFIGURATION
  // =====================================================================================

  /**
   * Update tenant information
   */
  async updateTenant(tenantId: string, updateDto: UpdateTenantDto): Promise<Tenant> {
    this.logger.log(`Updating tenant: ${tenantId}`);

    const tenant = await this.findTenantById(tenantId);

    // Update fields
    if (updateDto.organizationName) {
      // Check for duplicate organization name
      const existingTenant = await this.tenantRepository.findOne({
        where: { 
          organizationName: updateDto.organizationName,
          id: Not(tenantId) as any
        }
      });

      if (existingTenant) {
        throw new ConflictException('Organization name already exists');
      }

      tenant.organizationName = updateDto.organizationName;
    }

    if (updateDto.businessType) {
      tenant.businessType = updateDto.businessType;
    }

    if (updateDto.customDomain !== undefined) {
      if (updateDto.customDomain) {
        tenant.setCustomDomain(updateDto.customDomain);
      } else {
        tenant.removeCustomDomain();
      }
    }

    if (updateDto.resourceLimits) {
      tenant.updateResourceLimits(updateDto.resourceLimits);
    }

    if (updateDto.configuration) {
      tenant.updateConfiguration(updateDto.configuration);
    }

    tenant.updatedBy = updateDto.updatedBy;
    tenant.beforeUpdate();

    const updatedTenant = await this.tenantRepository.save(tenant);

    await this.logAuditEvent({
      action: AuditAction.TENANT_UPDATED,
      resourceType: 'tenant',
      resourceId: tenantId,
      details: { 
        organizationName: tenant.organizationName,
        updatedFields: Object.keys(updateDto).filter(key => key !== 'updatedBy')
      },
      adminId: updateDto.updatedBy,
      severity: Priority.LOW
    });

    this.logger.log(`Tenant updated successfully: ${tenantId}`);
    return updatedTenant;
  }

  /**
   * Update tenant compliance status
   */
  async updateComplianceStatus(
    tenantId: string, 
    status: ComplianceStatus, 
    notes: string,
    updatedBy: string
  ): Promise<Tenant> {
    this.logger.log(`Updating compliance status for tenant: ${tenantId}`);

    const tenant = await this.findTenantById(tenantId);
    
    const previousStatus = tenant.complianceStatus;
    tenant.updateComplianceStatus(status, notes);
    tenant.updatedBy = updatedBy;

    const updatedTenant = await this.tenantRepository.save(tenant);

    await this.logAuditEvent({
      action: AuditAction.TENANT_UPDATED,
      resourceType: 'tenant',
      resourceId: tenantId,
      details: { 
        organizationName: tenant.organizationName,
        complianceStatusChange: {
          from: previousStatus,
          to: status,
          notes
        }
      },
      adminId: updatedBy,
      severity: Priority.MEDIUM
    });

    this.logger.log(`Compliance status updated for tenant: ${tenantId}`);
    return updatedTenant;
  }

  /**
   * Update tenant activity timestamp
   */
  async updateTenantActivity(tenantId: string): Promise<void> {
    await this.tenantRepository.update(
      { id: tenantId },
      { lastActivity: new Date() }
    );
  }

  // =====================================================================================
  // TENANT METRICS AND ANALYTICS
  // =====================================================================================

  /**
   * Get comprehensive tenant metrics
   */
  async getTenantMetrics(): Promise<TenantMetrics> {
    this.logger.log('Generating tenant metrics');

    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      terminatedTenants,
      tenantsByBusinessType,
      tenantsByPlan,
      complianceStatus,
      newTenantsThisMonth
    ] = await Promise.all([
      this.tenantRepository.count(),
      this.tenantRepository.count({ where: { status: TenantStatus.ACTIVE } }),
      this.tenantRepository.count({ where: { status: TenantStatus.SUSPENDED } }),
      this.tenantRepository.count({ where: { status: TenantStatus.TERMINATED } }),
      this.getTenantsByBusinessType(),
      this.getTenantsByPlan(),
      this.getComplianceStatusDistribution(),
      this.getNewTenantsThisMonth()
    ]);

    const churnRate = await this.calculateChurnRate();
    const activationRate = await this.calculateActivationRate();

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      terminatedTenants,
      tenantsByBusinessType,
      tenantsByPlan,
      complianceStatus,
      averageUsage: {}, // Would be calculated from usage tracking
      growthMetrics: {
        newTenantsThisMonth,
        churnRate,
        activationRate
      }
    };
  }

  /**
   * Get tenant distribution by business type
   */
  private async getTenantsByBusinessType(): Promise<Record<BusinessType, number>> {
    const result = await this.tenantRepository
      .createQueryBuilder('tenant')
      .select('tenant.businessType', 'businessType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('tenant.businessType')
      .getRawMany();

    const distribution: Record<BusinessType, number> = {} as any;
    Object.values(BusinessType).forEach(type => {
      distribution[type] = 0;
    });

    result.forEach(row => {
      distribution[row.businessType] = parseInt(row.count);
    });

    return distribution;
  }

  /**
   * Get tenant distribution by subscription plan
   */
  private async getTenantsByPlan(): Promise<Record<string, number>> {
    const result = await this.tenantRepository
      .createQueryBuilder('tenant')
      .leftJoin('tenant.subscriptionPlan', 'plan')
      .select('plan.planName', 'planName')
      .addSelect('COUNT(*)', 'count')
      .groupBy('plan.planName')
      .getRawMany();

    const distribution: Record<string, number> = {};
    result.forEach(row => {
      distribution[row.planName || 'Unknown'] = parseInt(row.count);
    });

    return distribution;
  }

  /**
   * Get compliance status distribution
   */
  private async getComplianceStatusDistribution(): Promise<Record<ComplianceStatus, number>> {
    const result = await this.tenantRepository
      .createQueryBuilder('tenant')
      .select('tenant.complianceStatus', 'complianceStatus')
      .addSelect('COUNT(*)', 'count')
      .groupBy('tenant.complianceStatus')
      .getRawMany();

    const distribution: Record<ComplianceStatus, number> = {} as any;
    Object.values(ComplianceStatus).forEach(status => {
      distribution[status] = 0;
    });

    result.forEach(row => {
      distribution[row.complianceStatus] = parseInt(row.count);
    });

    return distribution;
  }

  /**
   * Get new tenants created this month
   */
  private async getNewTenantsThisMonth(): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return this.tenantRepository.count({
      where: {
        createdDate: MoreThanOrEqual(startOfMonth) as any
      }
    });
  }

  /**
   * Calculate churn rate (terminated tenants / total tenants)
   */
  private async calculateChurnRate(): Promise<number> {
    const [totalTenants, terminatedTenants] = await Promise.all([
      this.tenantRepository.count(),
      this.tenantRepository.count({ where: { status: TenantStatus.TERMINATED } })
    ]);

    return totalTenants > 0 ? (terminatedTenants / totalTenants) * 100 : 0;
  }

  /**
   * Calculate activation rate (active tenants / total tenants)
   */
  private async calculateActivationRate(): Promise<number> {
    const [totalTenants, activeTenants] = await Promise.all([
      this.tenantRepository.count(),
      this.tenantRepository.count({ where: { status: TenantStatus.ACTIVE } })
    ]);

    return totalTenants > 0 ? (activeTenants / totalTenants) * 100 : 0;
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  /**
   * Merge resource limits with plan defaults
   */
  private mergeResourceLimits(
    planLimits: IUsageLimits, 
    customLimits?: Partial<IResourceLimits>
  ): IResourceLimits {
    const defaultLimits: IResourceLimits = {
      maxUsers: planLimits.users || 10,
      maxStorage: planLimits.storage || 10,
      maxApiCalls: planLimits.apiCalls || 10000,
      maxComputeHours: planLimits.computeHours || 100,
      maxIntegrations: planLimits.integrations || 5,
      maxCustomFields: planLimits.customFields || 50,
      maxWorkflows: planLimits.workflows || 10,
      maxReports: planLimits.reports || 20
    };

    return { ...defaultLimits, ...customLimits };
  }

  /**
   * Merge tenant configuration with defaults
   */
  private mergeConfiguration(customConfig?: Partial<ITenantConfiguration>): ITenantConfiguration {
    // Return default configuration merged with custom settings
    // This would typically load from a configuration service
    const defaultConfig: ITenantConfiguration = {
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
          defaultRetention: 2555,
          categoryRetention: {},
          archivalSettings: {
            enabled: false,
            archiveAfter: 1825,
            archiveLocation: '',
            compressionEnabled: true
          },
          deletionSettings: {
            enabled: false,
            deleteAfter: 2555,
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

    return { ...defaultConfig, ...customConfig };
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(eventData: {
    action: AuditAction;
    resourceType: string;
    resourceId?: string;
    details: Record<string, any>;
    adminId?: string;
    severity: Priority;
  }): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        action: eventData.action,
        resourceType: eventData.resourceType,
        resourceId: eventData.resourceId,
        details: eventData.details,
        adminId: eventData.adminId,
        severity: eventData.severity,
        outcome: 'success',
        timestamp: new Date()
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(`Failed to log audit event: ${error.message}`, error.stack);
    }
  }
}

