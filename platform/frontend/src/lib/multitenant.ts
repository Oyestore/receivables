import { Pool, PoolClient } from 'pg';
import Redis from 'ioredis';
import { User } from '../types/auth.types';

// Tenant interface
export interface Tenant {
  id: string;
  name: string;
  domain: string;
  industry: string;
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
  plan: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  settings: TenantSettings;
  subscription: TenantSubscription;
  createdAt: Date;
  updatedAt: Date;
}

// Tenant settings
export interface TenantSettings {
  branding: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    theme?: 'light' | 'dark' | 'auto';
  };
  features: {
    invoiceGeneration: boolean;
    paymentProcessing: boolean;
    creditScoring: boolean;
    financing: boolean;
    analytics: boolean;
    marketing: boolean;
    legalServices: boolean;
  };
  limits: {
    maxUsers: number;
    maxInvoices: number;
    maxStorage: number; // in MB
    maxApiCalls: number; // per day
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  security: {
    twoFactorAuth: boolean;
    sessionTimeout: number; // in minutes
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
  };
}

// Tenant subscription
export interface TenantSubscription {
  plan: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'UNPAID';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  usage: {
    users: number;
    invoices: number;
    storage: number;
    apiCalls: number;
  };
}

// Multi-tenant context
export interface TenantContext {
  tenant: Tenant;
  user: User;
  permissions: string[];
  sessionId: string;
  ipAddress: string;
  userAgent: string;
}

// Multi-tenant service class
export class MultiTenantService {
  private pool: Pool;
  private redis: Redis;
  private tenantCache = new Map<string, Tenant>();
  private cacheExpiry = 300; // 5 minutes

  constructor(pool: Pool, redis: Redis) {
    this.pool = pool;
    this.redis = redis;
    this.initializeDatabase();
  }

  // Initialize multi-tenant database schema
  private async initializeDatabase(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Create tenants table
      await client.query(`
        CREATE TABLE IF NOT EXISTS tenants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          domain VARCHAR(100) UNIQUE NOT NULL,
          industry VARCHAR(100),
          size VARCHAR(20) NOT NULL DEFAULT 'SMALL',
          plan VARCHAR(20) NOT NULL DEFAULT 'BASIC',
          status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
          settings JSONB NOT NULL DEFAULT '{}',
          subscription JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create indexes
      await client.query('CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);');

      // Add tenant_id to existing tables for data isolation
      await this.addTenantIsolation(client);

      // Create Row Level Security (RLS) policies
      await this.setupRowLevelSecurity(client);

      console.log('✅ Multi-tenant database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize multi-tenant database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Add tenant isolation to existing tables
  private async addTenantIsolation(client: PoolClient): Promise<void> {
    const tables = [
      'users',
      'invoices',
      'payments',
      'disputes',
      'credit_scores',
      'financing_applications',
      'documents',
      'audit_logs',
    ];

    for (const table of tables) {
      try {
        // Add tenant_id column if it doesn't exist
        await client.query(`
          ALTER TABLE ${table} 
          ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
        `);

        // Create index for tenant_id
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_${table}_tenant_id ON ${table}(tenant_id);
        `);

        // Create composite index for better performance
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_${table}_tenant_created ON ${table}(tenant_id, created_at DESC);
        `);
      } catch (error) {
        console.warn(`Warning: Could not add tenant isolation to table ${table}:`, error);
      }
    }
  }

  // Setup Row Level Security policies
  private async setupRowLevelSecurity(client: PoolClient): Promise<void> {
    const tables = [
      'users',
      'invoices',
      'payments',
      'disputes',
      'credit_scores',
      'financing_applications',
      'documents',
    ];

    for (const table of tables) {
      try {
        // Enable RLS on the table
        await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);

        // Create policy for tenant isolation
        await client.query(`
          CREATE POLICY IF NOT EXISTS tenant_isolation_policy_${table}
          ON ${table}
          FOR ALL
          TO authenticated_role
          USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
        `);

        // Create policy for system administrators
        await client.query(`
          CREATE POLICY IF NOT EXISTS admin_policy_${table}
          ON ${table}
          FOR ALL
          TO admin_role
          USING (true);
        `);
      } catch (error) {
        console.warn(`Warning: Could not setup RLS for table ${table}:`, error);
      }
    }
  }

  // Create a new tenant
  async createTenant(tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO tenants (name, domain, industry, size, plan, status, settings, subscription)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        tenantData.name,
        tenantData.domain,
        tenantData.industry,
        tenantData.size,
        tenantData.plan,
        tenantData.status,
        JSON.stringify(tenantData.settings),
        JSON.stringify(tenantData.subscription),
      ];

      const result = await client.query(query, values);
      const tenant = this.mapRowToTenant(result.rows[0]);

      // Cache the tenant
      await this.cacheTenant(tenant);

      // Create tenant-specific schema if needed
      await this.createTenantSchema(tenant.id);

      return tenant;
    } finally {
      client.release();
    }
  }

  // Get tenant by ID
  async getTenantById(tenantId: string): Promise<Tenant | null> {
    // Check cache first
    const cached = this.tenantCache.get(tenantId);
    if (cached && Date.now() - cached.updatedAt.getTime() < this.cacheExpiry * 1000) {
      return cached;
    }

    // Check Redis cache
    try {
      const redisKey = `tenant:${tenantId}`;
      const cached = await this.redis.get(redisKey);
      if (cached) {
        const tenant = JSON.parse(cached);
        this.tenantCache.set(tenantId, tenant);
        return tenant;
      }
    } catch (error) {
      console.warn('Redis cache error:', error);
    }

    // Fetch from database
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
      if (result.rows.length === 0) {
        return null;
      }

      const tenant = this.mapRowToTenant(result.rows[0]);
      await this.cacheTenant(tenant);
      return tenant;
    } finally {
      client.release();
    }
  }

  // Get tenant by domain
  async getTenantByDomain(domain: string): Promise<Tenant | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM tenants WHERE domain = $1', [domain]);
      if (result.rows.length === 0) {
        return null;
      }

      const tenant = this.mapRowToTenant(result.rows[0]);
      await this.cacheTenant(tenant);
      return tenant;
    } finally {
      client.release();
    }
  }

  // Update tenant
  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
    const client = await this.pool.connect();
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name) {
        fields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.industry) {
        fields.push(`industry = $${paramIndex++}`);
        values.push(updates.industry);
      }
      if (updates.size) {
        fields.push(`size = $${paramIndex++}`);
        values.push(updates.size);
      }
      if (updates.plan) {
        fields.push(`plan = $${paramIndex++}`);
        values.push(updates.plan);
      }
      if (updates.status) {
        fields.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      if (updates.settings) {
        fields.push(`settings = $${paramIndex++}`);
        values.push(JSON.stringify(updates.settings));
      }
      if (updates.subscription) {
        fields.push(`subscription = $${paramIndex++}`);
        values.push(JSON.stringify(updates.subscription));
      }

      fields.push(`updated_at = NOW()`);
      values.push(tenantId);

      const query = `
        UPDATE tenants 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      const tenant = this.mapRowToTenant(result.rows[0]);
      
      // Update cache
      await this.cacheTenant(tenant);
      
      return tenant;
    } finally {
      client.release();
    }
  }

  // Delete tenant (soft delete)
  async deleteTenant(tenantId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('UPDATE tenants SET status = $1 WHERE id = $2', ['TERMINATED', tenantId]);
      
      // Clear cache
      this.tenantCache.delete(tenantId);
      await this.redis.del(`tenant:${tenantId}`);
    } finally {
      client.release();
    }
  }

  // Create tenant-specific schema
  private async createTenantSchema(tenantId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Create schema for tenant-specific data if needed
      const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);
      
      // Grant permissions to tenant role
      await client.query(`GRANT USAGE ON SCHEMA ${schemaName} TO tenant_role;`);
      await client.query(`GRANT CREATE ON SCHEMA ${schemaName} TO tenant_role;`);
    } catch (error) {
      console.warn(`Warning: Could not create tenant schema for ${tenantId}:`, error);
    } finally {
      client.release();
    }
  }

  // Get tenant context for request
  async getTenantContext(user: User, sessionId: string, ipAddress: string, userAgent: string): Promise<TenantContext> {
    if (!user.tenantId) {
      throw new Error('User must be associated with a tenant');
    }

    const tenant = await this.getTenantById(user.tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (tenant.status !== 'ACTIVE') {
      throw new Error('Tenant is not active');
    }

    return {
      tenant,
      user,
      permissions: user.permissions,
      sessionId,
      ipAddress,
      userAgent,
    };
  }

  // Check tenant feature access
  async checkFeatureAccess(tenantId: string, feature: keyof TenantSettings['features']): Promise<boolean> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      return false;
    }

    return tenant.settings.features[feature] || false;
  }

  // Check tenant limits
  async checkTenantLimits(tenantId: string, resource: keyof TenantSettings['limits'], currentValue: number): Promise<boolean> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      return false;
    }

    const limit = tenant.settings.limits[resource];
    return currentValue <= limit;
  }

  // Get tenant usage statistics
  async getTenantUsage(tenantId: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      const queries = [
        // User count
        client.query('SELECT COUNT(*) as count FROM users WHERE tenant_id = $1', [tenantId]),
        // Invoice count
        client.query('SELECT COUNT(*) as count FROM invoices WHERE tenant_id = $1', [tenantId]),
        // Storage usage (simplified)
        client.query('SELECT SUM(LENGTH(COALESCE(details::text, \'\'))) as storage FROM documents WHERE tenant_id = $1', [tenantId]),
        // API calls (from audit logs)
        client.query('SELECT COUNT(*) as count FROM audit_logs WHERE tenant_id = $1 AND timestamp >= NOW() - INTERVAL \'24 hours\'', [tenantId]),
      ];

      const results = await Promise.all(queries);
      
      return {
        users: parseInt(results[0].rows[0].count),
        invoices: parseInt(results[1].rows[0].count),
        storage: Math.round(parseInt(results[2].rows[0].storage || '0') / 1024 / 1024), // Convert to MB
        apiCalls: parseInt(results[3].rows[0].count),
      };
    } finally {
      client.release();
    }
  }

  // Cache tenant data
  private async cacheTenant(tenant: Tenant): Promise<void> {
    // Memory cache
    this.tenantCache.set(tenant.id, tenant);

    // Redis cache
    try {
      const redisKey = `tenant:${tenant.id}`;
      await this.redis.setex(redisKey, this.cacheExpiry, JSON.stringify(tenant));
    } catch (error) {
      console.warn('Redis cache error:', error);
    }
  }

  // Clear tenant cache
  async clearTenantCache(tenantId: string): Promise<void> {
    this.tenantCache.delete(tenantId);
    try {
      await this.redis.del(`tenant:${tenantId}`);
    } catch (error) {
      console.warn('Redis cache clear error:', error);
    }
  }

  // Map database row to tenant
  private mapRowToTenant(row: any): Tenant {
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      industry: row.industry,
      size: row.size,
      plan: row.plan,
      status: row.status,
      settings: row.settings,
      subscription: row.subscription,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Get all tenants (admin only)
  async getAllTenants(filters: {
    status?: string;
    plan?: string;
    size?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ tenants: Tenant[]; total: number }> {
    const client = await this.pool.connect();
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (filters.status) {
        conditions.push(`status = $${paramIndex++}`);
        values.push(filters.status);
      }
      if (filters.plan) {
        conditions.push(`plan = $${paramIndex++}`);
        values.push(filters.plan);
      }
      if (filters.size) {
        conditions.push(`size = $${paramIndex++}`);
        values.push(filters.size);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count query
      const countQuery = `SELECT COUNT(*) FROM tenants ${whereClause}`;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Data query
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      values.push(limit, offset);

      const query = `
        SELECT * FROM tenants 
        ${whereClause} 
        ORDER BY created_at DESC 
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const result = await client.query(query, values);
      const tenants = result.rows.map(this.mapRowToTenant);

      return { tenants, total };
    } finally {
      client.release();
    }
  }

  // Cleanup expired cache entries
  cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, tenant] of this.tenantCache.entries()) {
      if (now - tenant.updatedAt.getTime() > this.cacheExpiry * 1000) {
        this.tenantCache.delete(key);
      }
    }
  }
}

// Multi-tenant middleware factory
export const createMultiTenantMiddleware = (tenantService: MultiTenantService) => {
  return async (req: any, res: any, next: any) => {
    try {
      // Get tenant from user context (should be set by auth middleware)
      if (!req.user || !req.user.tenantId) {
        return res.status(403).json({ error: 'Tenant context required' });
      }

      // Get tenant context
      const tenantContext = await tenantService.getTenantContext(
        req.user,
        req.sessionId,
        req.ip,
        req.headers['user-agent']
      );

      // Set tenant context in request
      req.tenantContext = tenantContext;

      // Set PostgreSQL session variable for RLS
      const pool = (tenantService as any).pool;
      const client = await pool.connect();
      try {
        await client.query('SET app.current_tenant_id = $1', [tenantContext.tenant.id]);
      } finally {
        client.release();
      }

      next();
    } catch (error) {
      console.error('Multi-tenant middleware error:', error);
      res.status(500).json({ error: 'Tenant context error' });
    }
  };
};

// Feature access middleware
export const createFeatureAccessMiddleware = (tenantService: MultiTenantService, feature: keyof TenantSettings['features']) => {
  return async (req: any, res: any, next: any) => {
    try {
      if (!req.tenantContext) {
        return res.status(403).json({ error: 'Tenant context required' });
      }

      const hasFeature = await tenantService.checkFeatureAccess(req.tenantContext.tenant.id, feature);
      if (!hasFeature) {
        return res.status(403).json({ 
          error: 'Feature not available',
          feature,
          plan: req.tenantContext.tenant.plan,
        });
      }

      next();
    } catch (error) {
      console.error('Feature access middleware error:', error);
      res.status(500).json({ error: 'Feature access check failed' });
    }
  };
};

// Tenant limits middleware
export const createTenantLimitsMiddleware = (tenantService: MultiTenantService, resource: keyof TenantSettings['limits']) => {
  return async (req: any, res: any, next: any) => {
    try {
      if (!req.tenantContext) {
        return res.status(403).json({ error: 'Tenant context required' });
      }

      const usage = await tenantService.getTenantUsage(req.tenantContext.tenant.id);
      const currentValue = usage[resource] || 0;
      const withinLimit = await tenantService.checkTenantLimits(req.tenantContext.tenant.id, resource, currentValue);

      if (!withinLimit) {
        return res.status(429).json({ 
          error: 'Tenant limit exceeded',
          resource,
          current: currentValue,
          limit: req.tenantContext.tenant.settings.limits[resource],
        });
      }

      next();
    } catch (error) {
      console.error('Tenant limits middleware error:', error);
      res.status(500).json({ error: 'Tenant limits check failed' });
    }
  };
};

export default MultiTenantService;
