import { UserRole, User } from '../types/auth.types';
import { Redis } from 'ioredis';

// Permission definition following the specification: <resource>:<action>[:<scope>]
export enum Permission {
  // Invoice permissions
  INVOICE_CREATE = 'invoice:create',
  INVOICE_READ = 'invoice:read',
  INVOICE_UPDATE = 'invoice:update',
  INVOICE_DELETE = 'invoice:delete',
  INVOICE_APPROVE = 'invoice:approve',
  INVOICE_EXPORT = 'invoice:export',
  
  // Payment permissions
  PAYMENT_CREATE = 'payment:create',
  PAYMENT_READ = 'payment:read',
  PAYMENT_UPDATE = 'payment:update',
  PAYMENT_DELETE = 'payment:delete',
  PAYMENT_PROCESS = 'payment:process',
  PAYMENT_REFUND = 'payment:refund',
  
  // Dispute permissions
  DISPUTE_CREATE = 'dispute:create',
  DISPUTE_READ = 'dispute:read',
  DISPUTE_UPDATE = 'dispute:update',
  DISPUTE_RESOLVE = 'dispute:resolve',
  DISPUTE_ESCALATE = 'dispute:escalate',
  
  // Analytics permissions
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',
  ANALYTICS_ADVANCED = 'analytics:advanced',
  
  // User management permissions
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_ASSIGN_ROLES = 'user:assign_roles',
  
  // System permissions
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_LOGS = 'system:logs',
  SYSTEM_HEALTH = 'system:health',
  SYSTEM_BACKUP = 'system:backup',
  
  // Tenant permissions
  TENANT_CREATE = 'tenant:create',
  TENANT_READ = 'tenant:read',
  TENANT_UPDATE = 'tenant:update',
  TENANT_DELETE = 'tenant:delete',
  TENANT_MANAGE_USERS = 'tenant:manage_users',
  
  // Credit scoring permissions
  CREDIT_SCORE_VIEW = 'credit:view',
  CREDIT_SCORE_CREATE = 'credit:create',
  CREDIT_SCORE_UPDATE = 'credit:update',
  
  // Financing permissions
  FINANCING_APPLY = 'financing:apply',
  FINANCING_APPROVE = 'financing:approve',
  FINANCING_MANAGE = 'financing:manage',
  
  // Marketing permissions
  MARKETING_CREATE = 'marketing:create',
  MARKETING_VIEW = 'marketing:view',
  MARKETING_MANAGE = 'marketing:manage',
  
  // Document permissions
  DOCUMENT_CREATE = 'document:create',
  DOCUMENT_READ = 'document:read',
  DOCUMENT_UPDATE = 'document:update',
  DOCUMENT_DELETE = 'document:delete',
  DOCUMENT_SHARE = 'document:share',
}

// Role to permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SME_OWNER]: [
    Permission.INVOICE_CREATE,
    Permission.INVOICE_READ,
    Permission.INVOICE_UPDATE,
    Permission.INVOICE_DELETE,
    Permission.INVOICE_EXPORT,
    Permission.PAYMENT_CREATE,
    Permission.PAYMENT_READ,
    Permission.PAYMENT_UPDATE,
    Permission.DISPUTE_CREATE,
    Permission.DISPUTE_READ,
    Permission.DISPUTE_UPDATE,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.CREDIT_SCORE_VIEW,
    Permission.FINANCING_APPLY,
    Permission.DOCUMENT_CREATE,
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_UPDATE,
    Permission.DOCUMENT_DELETE,
    Permission.DOCUMENT_SHARE,
  ],
  
  [UserRole.LEGAL_PARTNER]: [
    Permission.DISPUTE_READ,
    Permission.DISPUTE_UPDATE,
    Permission.DISPUTE_RESOLVE,
    Permission.DISPUTE_ESCALATE,
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_UPDATE,
    Permission.DOCUMENT_CREATE,
    Permission.ANALYTICS_VIEW,
  ],
  
  [UserRole.ACCOUNTANT]: [
    Permission.INVOICE_READ,
    Permission.INVOICE_UPDATE,
    Permission.INVOICE_EXPORT,
    Permission.PAYMENT_READ,
    Permission.PAYMENT_UPDATE,
    Permission.PAYMENT_PROCESS,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_CREATE,
    Permission.DOCUMENT_UPDATE,
  ],
  
  [UserRole.ADMIN]: [
    // Admin has all permissions
    ...Object.values(Permission),
  ],
  
  [UserRole.VIEWER]: [
    Permission.INVOICE_READ,
    Permission.PAYMENT_READ,
    Permission.DISPUTE_READ,
    Permission.ANALYTICS_VIEW,
    Permission.DOCUMENT_READ,
  ],
};

// Permission cache interface
interface PermissionCache {
  userId: string;
  permissions: Permission[];
  expiresAt: number;
}

// Authorization service class
export class AuthorizationService {
  private redis: Redis;
  private cacheExpiry = 300; // 5 minutes
  private permissionCache = new Map<string, PermissionCache>();

  constructor(redis: Redis) {
    this.redis = redis;
  }

  // Check if user has specific permission
  async hasPermission(user: User, permission: Permission): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(user);
    return userPermissions.includes(permission);
  }

  // Check if user has any of the specified permissions
  async hasAnyPermission(user: User, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(user);
    return permissions.some(permission => userPermissions.includes(permission));
  }

  // Check if user has all specified permissions
  async hasAllPermissions(user: User, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(user);
    return permissions.every(permission => userPermissions.includes(permission));
  }

  // Get user permissions with caching
  async getUserPermissions(user: User): Promise<Permission[]> {
    const cacheKey = `user:${user.id}:permissions`;
    
    // Check memory cache first
    const memCache = this.permissionCache.get(cacheKey);
    if (memCache && memCache.expiresAt > Date.now()) {
      return memCache.permissions;
    }

    // Check Redis cache
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const parsed: PermissionCache = JSON.parse(cached);
        if (parsed.expiresAt > Date.now()) {
          // Update memory cache
          this.permissionCache.set(cacheKey, parsed);
          return parsed.permissions;
        }
      }
    } catch (error) {
      console.warn('Redis cache error:', error);
    }

    // Get permissions from role
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    
    // Add tenant-specific permissions if user has tenantId
    if (user.tenantId) {
      permissions.push(Permission.TENANT_READ);
    }

    // Cache the permissions
    const cacheData: PermissionCache = {
      userId: user.id,
      permissions,
      expiresAt: Date.now() + (this.cacheExpiry * 1000),
    };

    // Update caches
    this.permissionCache.set(cacheKey, cacheData);
    
    try {
      await this.redis.setex(cacheKey, this.cacheExpiry, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Redis cache set error:', error);
    }

    return permissions;
  }

  // Clear user permission cache
  async clearUserPermissionCache(userId: string): Promise<void> {
    const cacheKey = `user:${userId}:permissions`;
    
    // Clear memory cache
    this.permissionCache.delete(cacheKey);
    
    // Clear Redis cache
    try {
      await this.redis.del(cacheKey);
    } catch (error) {
      console.warn('Redis cache clear error:', error);
    }
  }

  // Check resource-level permission
  async canAccessResource(
    user: User,
    resource: string,
    action: string,
    resourceId?: string,
    resourceOwnerId?: string
  ): Promise<boolean> {
    // Build permission string
    const permission = `${resource}:${action}` as Permission;
    
    // Check basic permission
    const hasBasicPermission = await this.hasPermission(user, permission);
    if (!hasBasicPermission) {
      return false;
    }

    // If resource owner is specified, check ownership
    if (resourceOwnerId && resourceOwnerId !== user.id) {
      // Only admins and owners can access other users' resources
      const ownerPermissions = [Permission.INVOICE_READ, Permission.PAYMENT_READ];
      const canAccessOthers = await this.hasAnyPermission(user, [
        Permission.SYSTEM_CONFIG,
        Permission.TENANT_MANAGE_USERS,
        ...ownerPermissions,
      ]);
      
      if (!canAccessOthers) {
        return false;
      }
    }

    return true;
  }

  // Get permissions for API response
  async getUserPermissionsForAPI(user: User): Promise<string[]> {
    const permissions = await this.getUserPermissions(user);
    return permissions.map(p => p.toString());
  }

  // Batch permission check for performance
  async batchPermissionCheck(
    user: User,
    checks: Array<{ resource: string; action: string; resourceId?: string; resourceOwnerId?: string }>
  ): Promise<boolean[]> {
    const userPermissions = await this.getUserPermissions(user);
    
    return checks.map(check => {
      const permission = `${check.resource}:${check.action}` as Permission;
      const hasPermission = userPermissions.includes(permission);
      
      if (!hasPermission) {
        return false;
      }

      // Check ownership if applicable
      if (check.resourceOwnerId && check.resourceOwnerId !== user.id) {
        const ownerPermissions = [Permission.INVOICE_READ, Permission.PAYMENT_READ];
        const canAccessOthers = userPermissions.some(p => 
          [Permission.SYSTEM_CONFIG, Permission.TENANT_MANAGE_USERS, ...ownerPermissions].includes(p)
        );
        
        return canAccessOthers;
      }

      return true;
    });
  }

  // Cleanup expired cache entries
  cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, cache] of this.permissionCache.entries()) {
      if (cache.expiresAt <= now) {
        this.permissionCache.delete(key);
      }
    }
  }
}

// Express middleware for authorization
export const createAuthorizationMiddleware = (authService: AuthorizationService) => {
  return async (req: any, res: any, next: any) => {
    try {
      // Get user from request (should be set by authentication middleware)
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get required permission from route
      const requiredPermission = req.requiredPermission;
      if (requiredPermission) {
        const hasPermission = await authService.hasPermission(user, requiredPermission);
        if (!hasPermission) {
          return res.status(403).json({ 
            error: 'Insufficient permissions',
            required: requiredPermission,
          });
        }
      }

      // Check resource-level permissions if applicable
      if (req.resource && req.action) {
        const canAccess = await authService.canAccessResource(
          user,
          req.resource,
          req.action,
          req.resourceId,
          req.resourceOwnerId
        );
        
        if (!canAccess) {
          return res.status(403).json({ 
            error: 'Resource access denied',
            resource: req.resource,
            action: req.action,
          });
        }
      }

      // Add authorization service to request for use in handlers
      req.auth = authService;
      next();
    } catch (error) {
      console.error('Authorization middleware error:', error);
      res.status(500).json({ error: 'Authorization service error' });
    }
  };
};

// Decorator for route-level authorization
export const requirePermission = (permission: Permission) => {
  return (req: any, res: any, next: any) => {
    req.requiredPermission = permission;
    next();
  };
};

// Decorator for resource-level authorization
export const requireResourceAccess = (resource: string, action: string) => {
  return (req: any, res: any, next: any) => {
    req.resource = resource;
    req.action = action;
    req.resourceId = req.params.id;
    req.resourceOwnerId = req.body.ownerId;
    next();
  };
};

// Permission validation utility
export const validatePermission = (permission: string): boolean => {
  return Object.values(Permission).includes(permission as Permission);
};

// Get all permissions for a role
export const getRolePermissions = (role: UserRole): Permission[] => {
  return ROLE_PERMISSIONS[role] || [];
};

// Check if role exists
export const isValidRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
};

// Initialize authorization service
let authorizationService: AuthorizationService;

export const initializeAuthorization = (redis: Redis): AuthorizationService => {
  if (!authorizationService) {
    authorizationService = new AuthorizationService(redis);
    
    // Set up periodic cache cleanup
    setInterval(() => {
      authorizationService.cleanupExpiredCache();
    }, 60000); // Every minute
  }
  
  return authorizationService;
};

export const getAuthorizationService = (): AuthorizationService => {
  if (!authorizationService) {
    throw new Error('Authorization service not initialized');
  }
  return authorizationService;
};
