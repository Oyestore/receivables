import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyToken, 
  createTokenAuthMiddleware,
  createRoleBasedAuthMiddleware,
  refreshAccessToken,
} from '../lib/jwt';
import { UserRole } from '../types/auth.types';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    JWT_SECRET: 'test-secret-key-for-testing',
    JWT_EXPIRES_IN: '1h',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('JWT Token Generation', () => {
  describe('Token Generation', () => {
    it('should generate a valid access token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.SME_OWNER,
        tenantId: 'tenant-123',
        permissions: ['invoice:create', 'invoice:read']
      };

      const token = generateAccessToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include correct payload in token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.SME_OWNER,
        tenantId: 'tenant-123',
        permissions: ['invoice:create', 'invoice:read']
      };

      const token = generateAccessToken(payload);
      const decoded = verifyToken(token);
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.tenantId).toBe(payload.tenantId);
      expect(decoded.permissions).toEqual(payload.permissions);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should throw error with invalid secret', () => {
      process.env.JWT_SECRET = '';
      
      expect(() => {
        generateAccessToken({
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.SME_OWNER,
          tenantId: 'tenant-123',
          permissions: []
        });
      }).toThrow('Failed to generate access token');
    });

    it('should handle empty payload', () => {
      const token = generateAccessToken({} as any);
      expect(typeof token).toBe('string');
      
      const decoded = verifyToken(token);
      expect(decoded.userId).toBeUndefined();
      expect(decoded.email).toBeUndefined();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const userId = 'user-123';
      const token = generateRefreshToken(userId);
      
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include user ID and type in refresh token', () => {
      const userId = 'user-123';
      const token = generateRefreshToken(userId);
      const decoded = verifyToken(token);
      
      expect(decoded.userId).toBe(userId);
      expect(decoded.type).toBe('refresh');
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should have longer expiration for refresh tokens', () => {
      const userId = 'user-123';
      const token = generateRefreshToken(userId);
      const decoded = verifyToken(token);
      
      // Refresh tokens should expire in 7 days (604800 seconds)
      const expectedExp = decoded.iat + 7 * 24 * 60 * 60;
      expect(decoded.exp).toBe(expectedExp);
    });

    it('should throw error with invalid secret', () => {
      process.env.JWT_SECRET = '';
      
      expect(() => {
        generateRefreshToken('user-123');
      }).toThrow('Failed to generate refresh token');
    });
  });
});

describe('JWT Token Verification', () => {
  describe('verifyToken', () => {
    const validPayload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: UserRole.SME_OWNER,
      tenantId: 'tenant-123',
      permissions: ['invoice:create', 'invoice:read']
    };

    it('should verify a valid access token', () => {
      const token = generateAccessToken(validPayload);
      const decoded = verifyToken(token);
      
      expect(decoded.userId).toBe(validPayload.userId);
      expect(decoded.email).toBe(validPayload.email);
      expect(decoded.role).toBe(validPayload.role);
      expect(decoded.tenantId).toBe(validPayload.tenantId);
    });

    it('should verify a valid refresh token', () => {
      const token = generateRefreshToken(validPayload.userId);
      const decoded = verifyToken(token);
      
      expect(decoded.userId).toBe(validPayload.userId);
      expect(decoded.type).toBe('refresh');
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        verifyToken(invalidToken);
      }).toThrow('Failed to verify token');
    });

    it('should throw error for expired token', () => {
      // Create a token that's already expired
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: 'user-123' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );
      
      expect(() => {
        verifyToken(expiredToken);
      }).toThrow('Failed to verify token');
    });

    it('should throw error for token with invalid signature', () => {
      const token = generateAccessToken(validPayload);
      const tamperedToken = token.slice(0, -1) + 'x'; // Change last character
      
      expect(() => {
        verifyToken(tamperedToken);
      }).toThrow('Failed to verify token');
    });

    it('should throw error with wrong secret', () => {
      const originalSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'wrong-secret';
      
      const token = generateAccessToken(validPayload);
      process.env.JWT_SECRET = originalSecret;
      
      expect(() => {
        verifyToken(token);
      }).toThrow('Failed to verify token');
    });
  });
});

describe('JWT Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('createTokenAuthMiddleware', () => {
    it('should pass with valid token', async () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.SME_OWNER,
        tenantId: 'tenant-123',
      };
      const token = generateAccessToken(payload);
      
      mockReq.headers.authorization = `Bearer ${token}`;
      
      const middleware = createTokenAuthMiddleware();
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toEqual(expect.objectContaining(payload));
    });

    it('should fail without authorization header', async () => {
      const middleware = createTokenAuthMiddleware();
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail with invalid authorization header format', async () => {
      mockReq.headers.authorization = 'InvalidFormat token';
      
      const middleware = createTokenAuthMiddleware();
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail with invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';
      
      const middleware = createTokenAuthMiddleware();
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail with expired token', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: 'user-123' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' }
      );
      
      mockReq.headers.authorization = `Bearer ${expiredToken}`;
      
      const middleware = createTokenAuthMiddleware();
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token expired',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('createRoleBasedAuthMiddleware', () => {
    it('should pass with correct role', async () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.SME_OWNER,
        tenantId: 'tenant-123',
      };
      const token = generateAccessToken(payload);
      
      mockReq.headers.authorization = `Bearer ${token}`;
      
      const middleware = createRoleBasedAuthMiddleware([UserRole.SME_OWNER]);
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail with incorrect role', async () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.VIEWER,
        tenantId: 'tenant-123',
      };
      const token = generateAccessToken(payload);
      
      mockReq.headers.authorization = `Bearer ${token}`;
      
      const middleware = createRoleBasedAuthMiddleware([UserRole.ADMIN]);
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        required: [UserRole.ADMIN],
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass with multiple allowed roles', async () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.ACCOUNTANT,
        tenantId: 'tenant-123',
      };
      const token = generateAccessToken(payload);
      
      mockReq.headers.authorization = `Bearer ${token}`;
      
      const middleware = createRoleBasedAuthMiddleware([UserRole.ADMIN, UserRole.ACCOUNTANT]);
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail without authentication', async () => {
      const middleware = createRoleBasedAuthMiddleware([UserRole.ADMIN]);
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

describe('refreshAccessToken', () => {
  it('should refresh access token with valid refresh token', async () => {
    const userId = 'user-123';
    const refreshToken = generateRefreshToken(userId);
    
    const result = await refreshAccessToken(refreshToken);
    
    expect(result.success).toBe(true);
    expect(result.accessToken).toBeDefined();
    expect(result.expiresIn).toBe(24 * 60 * 60); // 24 hours
  });

  it('should fail with invalid refresh token', async () => {
    const result = await refreshAccessToken('invalid-refresh-token');
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid refresh token');
  });

  it('should fail with access token instead of refresh token', async () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: UserRole.SME_OWNER,
    };
    const accessToken = generateAccessToken(payload);
    
    const result = await refreshAccessToken(accessToken);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid refresh token');
  });
});

describe('JWT Security', () => {
  it('should not include sensitive data in tokens', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: UserRole.SME_OWNER,
      password: 'secret-password', // This should not be in tokens
      ssn: '123-45-6789', // This should not be in tokens
    };
    
    const token = generateAccessToken(payload);
    const decoded = verifyToken(token);
    
    expect(decoded.password).toBeUndefined();
    expect(decoded.ssn).toBeUndefined();
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  it('should have reasonable token expiration', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: UserRole.SME_OWNER,
    };
    
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload.userId);
    
    const accessDecoded = verifyToken(accessToken);
    const refreshDecoded = verifyToken(refreshToken);
    
    // Access token should expire sooner than refresh token
    expect(accessDecoded.exp).toBeLessThan(refreshDecoded.exp);
    
    // Access token should expire within a reasonable time (1 hour by default)
    const accessDuration = accessDecoded.exp - accessDecoded.iat;
    expect(accessDuration).toBeLessThanOrEqual(60 * 60); // 1 hour
    
    // Refresh token should last longer (7 days)
    const refreshDuration = refreshDecoded.exp - refreshDecoded.iat;
    expect(refreshDuration).toBe(7 * 24 * 60 * 60); // 7 days
  });

  it('should handle malformed tokens gracefully', () => {
    const malformedTokens = [
      '',
      'not.a.jwt',
      'header.payload', // Missing signature
      'header..signature', // Empty payload
      '..signature', // Empty header and payload
      'header.payload.invalidsignature',
    ];
    
    malformedTokens.forEach(token => {
      expect(() => {
        verifyToken(token);
      }).toThrow('Failed to verify token');
    });
  });
});

describe('JWT Performance', () => {
  it('should generate tokens quickly', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: UserRole.SME_OWNER,
    };
    
    const startTime = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      generateAccessToken(payload);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should generate 1000 tokens in less than 1 second
    expect(duration).toBeLessThan(1000);
  });

  it('should verify tokens quickly', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: UserRole.SME_OWNER,
    };
    
    const token = generateAccessToken(payload);
    
    const startTime = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      verifyToken(token);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should verify 1000 tokens in less than 1 second
    expect(duration).toBeLessThan(1000);
  });
});

describe('JWT Edge Cases', () => {
  it('should handle very long user IDs', () => {
    const longUserId = 'user-'.repeat(100); // Very long user ID
    const payload = {
      userId: longUserId,
      email: 'test@example.com',
      role: UserRole.SME_OWNER,
    };
    
    const token = generateAccessToken(payload);
    const decoded = verifyToken(token);
    
    expect(decoded.userId).toBe(longUserId);
  });

  it('should handle special characters in email', () => {
    const payload = {
      userId: 'user-123',
      email: 'test+tag@example.com',
      role: UserRole.SME_OWNER,
    };
    
    const token = generateAccessToken(payload);
    const decoded = verifyToken(token);
    
    expect(decoded.email).toBe(payload.email);
  });

  it('should handle all user roles', () => {
    Object.values(UserRole).forEach(role => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role,
      };
      
      const token = generateAccessToken(payload);
      const decoded = verifyToken(token);
      
      expect(decoded.role).toBe(role);
    });
  });

  it('should handle missing optional fields', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: UserRole.SME_OWNER,
      // tenantId is optional
    };
    
    const token = generateAccessToken(payload);
    const decoded = verifyToken(token);
    
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.tenantId).toBeUndefined();
  });
});
