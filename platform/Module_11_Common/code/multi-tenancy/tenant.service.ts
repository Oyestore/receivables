import { Logger } from '../logging/logger';
import { TenantError, ValidationError, NotFoundError } from '../errors/app-error';
import { config } from '../config/config.service';

const logger = new Logger('TenantService');

/**
 * Tenant interface
 */
export interface ITenant {
  id: string;
  name: string;
  domain: string;
  schema: string;
  isActive: boolean;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tenant creation data
 */
export interface ICreateTenant {
  name: string;
  domain: string;
  settings?: Record<string, unknown>;
}

/**
 * Tenant context for request processing
 */
export interface ITenantContext {
  tenantId: string;
  schema: string;
  tenant: ITenant;
}

/**
 * Multi-Tenancy Service
 * Manages tenant registration, activation, and context
 */
export class TenantService {
  private static instance: TenantService;
  private tenants: Map<string, ITenant> = new Map();
  private tenantsByDomain: Map<string, ITenant> = new Map();

  private constructor() {
    logger.info('TenantService initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TenantService {
    if (!TenantService.instance) {
      TenantService.instance = new TenantService();
    }
    return TenantService.instance;
  }

  /**
   * Register a new tenant
   */
  public async registerTenant(data: ICreateTenant): Promise<ITenant> {
    logger.info('Registering new tenant', { name: data.name, domain: data.domain });

    // Validate tenant data
    this.validateTenantData(data);

    // Check if domain already exists
    if (this.tenantsByDomain.has(data.domain)) {
      throw new TenantError(`Tenant with domain ${data.domain} already exists`);
    }

    // Generate tenant ID and schema name
    const tenantId = this.generateTenantId();
    const schema = this.generateSchemaName(tenantId);

    // Create tenant object
    const tenant: ITenant = {
      id: tenantId,
      name: data.name,
      domain: data.domain,
      schema,
      isActive: true,
      settings: data.settings || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store tenant
    this.tenants.set(tenantId, tenant);
    this.tenantsByDomain.set(data.domain, tenant);

    // In production, this would:
    // 1. Create database schema
    // 2. Run migrations for tenant schema
    // 3. Seed initial data
    // 4. Store tenant in database

    logger.info('Tenant registered successfully', {
      tenantId,
      name: data.name,
      schema,
    });

    return tenant;
  }

  /**
   * Get tenant by ID
   */
  public async getTenantById(tenantId: string): Promise<ITenant> {
    const tenant = this.tenants.get(tenantId);
    
    if (!tenant) {
      throw new NotFoundError(`Tenant with ID ${tenantId} not found`);
    }

    if (!tenant.isActive) {
      throw new TenantError(`Tenant ${tenantId} is not active`);
    }

    return tenant;
  }

  /**
   * Get tenant by domain
   */
  public async getTenantByDomain(domain: string): Promise<ITenant> {
    const tenant = this.tenantsByDomain.get(domain);
    
    if (!tenant) {
      throw new NotFoundError(`Tenant with domain ${domain} not found`);
    }

    if (!tenant.isActive) {
      throw new TenantError(`Tenant ${domain} is not active`);
    }

    return tenant;
  }

  /**
   * Update tenant
   */
  public async updateTenant(
    tenantId: string,
    updates: Partial<ICreateTenant>
  ): Promise<ITenant> {
    const tenant = await this.getTenantById(tenantId);

    // Update tenant properties
    if (updates.name) {
      tenant.name = updates.name;
    }

    if (updates.domain && updates.domain !== tenant.domain) {
      // Check if new domain is available
      if (this.tenantsByDomain.has(updates.domain)) {
        throw new TenantError(`Domain ${updates.domain} is already taken`);
      }

      // Update domain mapping
      this.tenantsByDomain.delete(tenant.domain);
      tenant.domain = updates.domain;
      this.tenantsByDomain.set(updates.domain, tenant);
    }

    if (updates.settings) {
      tenant.settings = { ...tenant.settings, ...updates.settings };
    }

    tenant.updatedAt = new Date();

    logger.info('Tenant updated', { tenantId, updates });

    return tenant;
  }

  /**
   * Deactivate tenant
   */
  public async deactivateTenant(tenantId: string): Promise<void> {
    const tenant = await this.getTenantById(tenantId);
    tenant.isActive = false;
    tenant.updatedAt = new Date();

    logger.warn('Tenant deactivated', { tenantId });
  }

  /**
   * Activate tenant
   */
  public async activateTenant(tenantId: string): Promise<void> {
    const tenant = this.tenants.get(tenantId);
    
    if (!tenant) {
      throw new NotFoundError(`Tenant with ID ${tenantId} not found`);
    }

    tenant.isActive = true;
    tenant.updatedAt = new Date();

    logger.info('Tenant activated', { tenantId });
  }

  /**
   * Delete tenant (soft delete)
   */
  public async deleteTenant(tenantId: string): Promise<void> {
    const tenant = await this.getTenantById(tenantId);

    // Remove from maps
    this.tenants.delete(tenantId);
    this.tenantsByDomain.delete(tenant.domain);

    // In production, this would:
    // 1. Mark tenant as deleted in database
    // 2. Archive tenant data
    // 3. Schedule schema cleanup

    logger.warn('Tenant deleted', { tenantId });
  }

  /**
   * Get all active tenants
   */
  public async getAllTenants(): Promise<ITenant[]> {
    return Array.from(this.tenants.values()).filter(t => t.isActive);
  }

  /**
   * Create tenant context from tenant ID
   */
  public async createContext(tenantId: string): Promise<ITenantContext> {
    const tenant = await this.getTenantById(tenantId);

    return {
      tenantId: tenant.id,
      schema: tenant.schema,
      tenant,
    };
  }

  /**
   * Validate tenant data
   */
  private validateTenantData(data: ICreateTenant): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Tenant name is required');
    }

    if (!data.domain || data.domain.trim().length === 0) {
      throw new ValidationError('Tenant domain is required');
    }

    // Validate domain format
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    if (!domainRegex.test(data.domain)) {
      throw new ValidationError('Invalid domain format');
    }
  }

  /**
   * Generate unique tenant ID
   */
  private generateTenantId(): string {
    return `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate schema name for tenant
   */
  private generateSchemaName(tenantId: string): string {
    const prefix = config.getValue('multiTenancy').schemaPrefix;
    const sanitized = tenantId.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
    return `${prefix}${sanitized}`;
  }

  /**
   * Check if multi-tenancy is enabled
   */
  public isEnabled(): boolean {
    return config.getValue('multiTenancy').enabled;
  }

  /**
   * Get tenant count
   */
  public getTenantCount(): number {
    return Array.from(this.tenants.values()).filter(t => t.isActive).length;
  }
}

// Export singleton instance
export const tenantService = TenantService.getInstance();
