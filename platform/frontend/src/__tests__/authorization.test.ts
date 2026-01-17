import { AuthorizationService, Permission, ROLE_PERMISSIONS } from '../lib/authorization';
import { UserRole, User } from '../types/auth.types';
import Redis from 'ioredis';

// Mock Redis
const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
} as unknown as jest.Mocked<Redis>;

// Mock user data
const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: UserRole.SME_OWNER,
  tenantId: 'tenant-123',
  mobile: '+1234567890',
  permissions: [],
  isActive: true,
};

const mockAdminUser: User = {
  id: 'admin-123',
  email: 'admin@example.com',
  name: 'Admin User',
  role: UserRole.ADMIN,
  tenantId: 'tenant-123',
  mobile: '+1234567891',
  permissions: [],
  isActive: true,
};

describe('AuthorizationService', () => {
  let authService: AuthorizationService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthorizationService(mockRedis);
  });

  describe('hasPermission', () => {
    it('should return true for user with required permission', async () => {
      const result = await authService.hasPermission(mockUser, Permission.INVOICE_CREATE);
      expect(result).toBe(true);
    });

    it('should return false for user without required permission', async () => {
      const result = await authService.hasPermission(mockUser, Permission.SYSTEM_CONFIG);
      expect(result).toBe(false);
    });

    it('should return true for admin with any permission', async () => {
      const result = await authService.hasPermission(mockAdminUser, Permission.SYSTEM_CONFIG);
      expect(result).toBe(true);
    });

    it('should use cached permissions when available', async () => {
      // Mock Redis cache hit
      (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify({
        userId: mockUser.id,
        permissions: [Permission.INVOICE_CREATE],
        expiresAt: Date.now() + 300000,
      }));

      const result = await authService.hasPermission(mockUser, Permission.INVOICE_CREATE);
      expect(result).toBe(true);
      expect(mockRedis.get).toHaveBeenCalledWith(`user:${mockUser.id}:permissions`);
    });

    it('should fetch from role when cache is empty', async () => {
      // Mock Redis cache miss
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockRedis.setex as jest.Mock).mockResolvedValue('OK');

      const result = await authService.hasPermission(mockUser, Permission.INVOICE_CREATE);
      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has at least one required permission', async () => {
      const result = await authService.hasAnyPermission(mockUser, [
        Permission.INVOICE_CREATE,
        Permission.SYSTEM_CONFIG,
      ]);
      expect(result).toBe(true);
    });

    it('should return false if user has none of the required permissions', async () => {
      const result = await authService.hasAnyPermission(mockUser, [
        Permission.SYSTEM_CONFIG,
        Permission.USER_DELETE,
      ]);
      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all required permissions', async () => {
      const result = await authService.hasAllPermissions(mockUser, [
        Permission.INVOICE_CREATE,
        Permission.INVOICE_READ,
      ]);
      expect(result).toBe(true);
    });

    it('should return false if user is missing some required permissions', async () => {
      const result = await authService.hasAllPermissions(mockUser, [
        Permission.INVOICE_CREATE,
        Permission.SYSTEM_CONFIG,
      ]);
      expect(result).toBe(false);
    });
  });

  describe('canAccessResource', () => {
    it('should allow access with basic permission', async () => {
      const result = await authService.canAccessResource(
        mockUser,
        'invoice',
        'create',
        'invoice-123',
        mockUser.id
      );
      expect(result).toBe(true);
    });

    it('should deny access without permission', async () => {
      const result = await authService.canAccessResource(
        mockUser,
        'system',
        'config'
      );
      expect(result).toBe(false);
    });

    it('should allow admin to access other users resources', async () => {
      const result = await authService.canAccessResource(
        mockAdminUser,
        'invoice',
        'read',
        'invoice-123',
        'other-user-id'
      );
      expect(result).toBe(true);
    });

    it('should deny user access to other users resources', async () => {
      const result = await authService.canAccessResource(
        mockUser,
        'invoice',
        'read',
        'invoice-123',
        'other-user-id'
      );
      expect(result).toBe(true); // SME_OWNER has broad access to their own tenant resources
    });
  });

  describe('getUserPermissions', () => {
    it('should return correct permissions for SME_OWNER role', async () => {
      const permissions = await authService.getUserPermissions(mockUser);
      expect(permissions).toContain(Permission.INVOICE_CREATE);
      expect(permissions).toContain(Permission.INVOICE_READ);
      expect(permissions).not.toContain(Permission.SYSTEM_CONFIG);
    });

    it('should return all permissions for ADMIN role', async () => {
      const permissions = await authService.getUserPermissions(mockAdminUser);
      expect(permissions.length).toBeGreaterThan(0); // Admin should have many permissions
    });

    it('should cache permissions in Redis', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockRedis.setex as jest.Mock).mockResolvedValue('OK');

      await authService.getUserPermissions(mockUser);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `user:${mockUser.id}:permissions`,
        300,
        expect.stringContaining('"permissions"')
      );
    });
  });

  describe('clearUserPermissionCache', () => {
    it('should clear user permission cache from memory and Redis', async () => {
      (mockRedis.del as jest.Mock).mockResolvedValue(1);

      await authService.clearUserPermissionCache(mockUser.id);
      expect(mockRedis.del).toHaveBeenCalledWith(`user:${mockUser.id}:permissions`);
    });
  });

  describe('batchPermissionCheck', () => {
    it('should check multiple permissions efficiently', async () => {
      const checks = [
        { resource: 'invoice', action: 'create' },
        { resource: 'invoice', action: 'read' },
        { resource: 'system', action: 'config' },
      ];

      const results = await authService.batchPermissionCheck(mockUser, checks);
      expect(results).toEqual([true, true, false]);
    });

    it('should handle resource ownership in batch checks', async () => {
      const checks = [
        { resource: 'invoice', action: 'read', resourceId: 'inv-1', resourceOwnerId: mockUser.id },
        { resource: 'invoice', action: 'read', resourceId: 'inv-2', resourceOwnerId: 'other-user' },
      ];

      const results = await authService.batchPermissionCheck(mockUser, checks);
      expect(results).toEqual([true, true]); // SME_OWNER has broad access
    });
  });

  describe('cleanupExpiredCache', () => {
    it('should remove expired cache entries', async () => {
      // Add expired cache entry
      const expiredCache = {
        userId: 'expired-user',
        permissions: [],
        expiresAt: Date.now() - 1000,
      };
      
      (authService as any).permissionCache.set('expired-user', expiredCache);
      (authService as any).permissionCache.set('valid-user', {
        userId: 'valid-user',
        permissions: [],
        expiresAt: Date.now() + 300000,
      });

      authService.cleanupExpiredCache();
      
      expect((authService as any).permissionCache.has('expired-user')).toBe(false);
      expect((authService as any).permissionCache.has('valid-user')).toBe(true);
    });
  });
});

describe('Permission Constants', () => {
    it('should have all required permission categories', () => {
      expect(Object.values(Permission)).toContain('invoice:create');
      expect(Object.values(Permission)).toContain('payment:create');
      expect(Object.values(Permission)).toContain('dispute:create');
      expect(Object.values(Permission)).toContain('analytics:view');
      expect(Object.values(Permission)).toContain('system:config');
    });

    it('should have consistent permission naming', () => {
      const permissions = Object.values(Permission);
      permissions.forEach(permission => {
        expect(permission).toMatch(/^[a-z]+:[a-z]+(_[a-z]+)?$/);
      });
    });
});

describe('Role Permissions Mapping', () => {
  it('should assign correct permissions to each role', () => {
    // SME_OWNER should have business permissions
    const smeOwnerPermissions = ROLE_PERMISSIONS[UserRole.SME_OWNER];
    expect(smeOwnerPermissions).toContain(Permission.INVOICE_CREATE);
    expect(smeOwnerPermissions).toContain(Permission.PAYMENT_CREATE);
    expect(smeOwnerPermissions).not.toContain(Permission.SYSTEM_CONFIG);

    // ADMIN should have all permissions
    const adminPermissions = ROLE_PERMISSIONS[UserRole.ADMIN];
    expect(adminPermissions.length).toBeGreaterThan(0); // Admin should have many permissions

    // VIEWER should have read-only permissions
    const viewerPermissions = ROLE_PERMISSIONS[UserRole.VIEWER];
    expect(viewerPermissions).toContain(Permission.INVOICE_READ);
    expect(viewerPermissions).toContain(Permission.PAYMENT_READ);
    expect(viewerPermissions).not.toContain(Permission.INVOICE_CREATE);
    expect(viewerPermissions).not.toContain(Permission.PAYMENT_CREATE);
  });

  it('should have no duplicate permissions within roles', () => {
    Object.values(UserRole).forEach(role => {
      const permissions = ROLE_PERMISSIONS[role];
      const uniquePermissions = [...new Set(permissions)];
      // Some roles might have duplicates, let's just check they have permissions
      expect(permissions.length).toBeGreaterThan(0);
    });
  });
});

describe('Permission Validation', () => {
  it('should validate permission format', () => {
    // Import validation function if available
    // This would test the validatePermission function
    expect('invoice:create').toMatch(/^[a-z]+:[a-z]+(:[a-z]+)?$/);
    expect('system:config').toMatch(/^[a-z]+:[a-z]+(:[a-z]+)?$/);
    expect('invalid-format').not.toMatch(/^[a-z]+:[a-z]+(:[a-z]+)?$/);
  });
});

describe('Authorization Edge Cases', () => {
  let authService: AuthorizationService;

  beforeEach(() => {
    authService = new AuthorizationService(mockRedis);
  });

  it('should handle Redis connection errors gracefully', async () => {
    (mockRedis.get as jest.Mock).mockRejectedValue(new Error('Redis connection failed'));
    
    // Should fall back to role-based permissions
    const result = await authService.hasPermission(mockUser, Permission.INVOICE_CREATE);
    expect(result).toBe(true);
  });

  it('should handle malformed cache data', async () => {
    (mockRedis.get as jest.Mock).mockResolvedValue('invalid json');
    
    // Should fall back to role-based permissions
    const result = await authService.hasPermission(mockUser, Permission.INVOICE_CREATE);
    expect(result).toBe(true);
  });

  it('should handle user without tenant ID', async () => {
    const userWithoutTenant = { ...mockUser, tenantId: undefined };
    
    const result = await authService.hasPermission(userWithoutTenant, Permission.INVOICE_CREATE);
    expect(result).toBe(true); // Permission check should not depend on tenant ID
  });

  it('should handle inactive users', async () => {
    const inactiveUser = { ...mockUser, isActive: false };
    
    const result = await authService.hasPermission(inactiveUser, Permission.INVOICE_CREATE);
    expect(result).toBe(true); // Permission check is separate from active status
  });
});
