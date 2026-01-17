/**
 * Auth Middleware Unit Tests
 * 
 * Comprehensive test suite for Authentication and Authorization Middleware
 * Target: 85%+ code coverage
 */

import { Request, Response, NextFunction } from 'express';
import {
    authenticate,
    optionalAuthenticate,
    requireRole,
    requirePermission,
    requireTenant,
    authenticateApiKey,
    rateLimitByUser,
} from '../auth.middleware';
import { jwtService, IDecodedToken } from '../jwt.service';
import { tenantService } from '../../multi-tenancy/tenant.service';
import { UnauthorizedError, ForbiddenError } from '../../errors/app-error';

// Mock dependencies
jest.mock('../jwt.service');
jest.mock('../../multi-tenancy/tenant.service');
jest.mock('../../logging/logger');

describe('AuthMiddleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    const mockDecodedToken: IDecodedToken = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        email: 'test@example.com',
        roles: ['user', 'admin'],
        permissions: ['read:invoices', 'write:invoices'],
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
    };

    beforeEach(() => {
        mockRequest = {
            headers: {},
        };
        mockResponse = {};
        mockNext = jest.fn();

        jest.clearAllMocks();
    });

    describe('authenticate()', () => {
        it('should authenticate valid token and attach user to request', async () => {
            mockRequest.headers = {
                authorization: 'Bearer valid-token-123',
            };

            (jwtService.extractTokenFromHeader as jest.Mock).mockReturnValue('valid-token-123');
            (jwtService.verifyAccessToken as jest.Mock).mockReturnValue(mockDecodedToken);
            (jwtService.isTokenRevoked as jest.Mock).mockResolvedValue(false);
            (tenantService.isEnabled as jest.Mock).mockReturnValue(false);

            const middleware = authenticate();
            await middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockRequest.user).toEqual(mockDecodedToken);
            expect(mockRequest.tenantId).toBe('tenant-456');
            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should fetch tenant schema when multi-tenancy is enabled', async () => {
            mockRequest.headers = {
                authorization: 'Bearer valid-token',
            };

            const mockTenant = { schema: 'tenant_456_schema' };

            (jwtService.extractTokenFromHeader as jest.Mock).mockReturnValue('valid-token');
            (jwtService.verifyAccessToken as jest.Mock).mockReturnValue(mockDecodedToken);
            (jwtService.isTokenRevoked as jest.Mock).mockResolvedValue(false);
            (tenantService.isEnabled as jest.Mock).mockReturnValue(true);
            (tenantService.getTenantById as jest.Mock).mockResolvedValue(mockTenant);

            const middleware = authenticate();
            await middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(tenantService.getTenantById).toHaveBeenCalledWith('tenant-456');
            expect(mockRequest.tenantSchema).toBe('tenant_456_schema');
            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should reject missing authorization header', async () => {
            mockRequest.headers = {};

            (jwtService.extractTokenFromHeader as jest.Mock).mockImplementation(() => {
                throw new UnauthorizedError('Authorization header missing');
            });

            const middleware = authenticate();
            await middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
            expect(mockRequest.user).toBeUndefined();
        });

        it('should reject expired token', async () => {
            mockRequest.headers = {
                authorization: 'Bearer expired-token',
            };

            (jwtService.extractTokenFromHeader as jest.Mock).mockReturnValue('expired-token');
            (jwtService.verifyAccessToken as jest.Mock).mockImplementation(() => {
                throw new Error('Access token expired');
            });

            const middleware = authenticate();
            await middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });

        it('should reject revoked token', async () => {
            mockRequest.headers = {
                authorization: 'Bearer revoked-token',
            };

            (jwtService.extractTokenFromHeader as jest.Mock).mockReturnValue('revoked-token');
            (jwtService.verifyAccessToken as jest.Mock).mockReturnValue(mockDecodedToken);
            (jwtService.isTokenRevoked as jest.Mock).mockResolvedValue(true);

            const middleware = authenticate();
            await middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Token has been revoked',
            }));
        });

        it('should reject malformed Bearer header', async () => {
            mockRequest.headers = {
                authorization: 'InvalidFormat token',
            };

            (jwtService.extractTokenFromHeader as jest.Mock).mockImplementation(() => {
                throw new UnauthorizedError('Invalid authorization header format');
            });

            const middleware = authenticate();
            await middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
        });
    });

    describe('optionalAuthenticate()', () => {
        it('should authenticate when valid token is present', async () => {
            mockRequest.headers = {
                authorization: 'Bearer valid-token',
            };

            (jwtService.extractTokenFromHeader as jest.Mock).mockReturnValue('valid-token');
            (jwtService.verifyAccessToken as jest.Mock).mockReturnValue(mockDecodedToken);
            (jwtService.isTokenRevoked as jest.Mock).mockResolvedValue(false);
            (tenantService.isEnabled as jest.Mock).mockReturnValue(false);

            const middleware = optionalAuthenticate();
            await middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockRequest.user).toEqual(mockDecodedToken);
            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should proceed without authentication when no token present', async () => {
            mockRequest.headers = {};

            const middleware = optionalAuthenticate();
            await middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockRequest.user).toBeUndefined();
            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should not attach user if token is revoked', async () => {
            mockRequest.headers = {
                authorization: 'Bearer revoked-token',
            };

            (jwtService.extractTokenFromHeader as jest.Mock).mockReturnValue('revoked-token');
            (jwtService.verifyAccessToken as jest.Mock).mockReturnValue(mockDecodedToken);
            (jwtService.isTokenRevoked as jest.Mock).mockResolvedValue(true);

            const middleware = optionalAuthenticate();
            await middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockRequest.user).toBeUndefined();
            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should continue on authentication errors', async () => {
            mockRequest.headers = {
                authorization: 'Bearer invalid-token',
            };

            (jwtService.extractTokenFromHeader as jest.Mock).mockReturnValue('invalid-token');
            (jwtService.verifyAccessToken as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid token');
            });

            const middleware = optionalAuthenticate();
            await middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockRequest.user).toBeUndefined();
            expect(mockNext).toHaveBeenCalledWith(); // No error passed
        });
    });

    describe('requireRole()', () => {
        it('should allow user with required role', () => {
            mockRequest.user = mockDecodedToken; // Has 'admin' role

            const middleware = requireRole('admin');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should allow user with any of the required roles', () => {
            mockRequest.user = mockDecodedToken; // Has 'user' and 'admin' roles

            const middleware = requireRole('superadmin', 'admin', 'moderator');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should deny user without required role', () => {
            mockRequest.user = mockDecodedToken; // Has 'user', 'admin'

            const middleware = requireRole('superadmin');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
        });

        it('should reject unauthenticated user', () => {
            mockRequest.user = undefined;

            const middleware = requireRole('admin');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
        });

        it('should handle user with empty roles array', () => {
            mockRequest.user = { ...mockDecodedToken, roles: [] };

            const middleware = requireRole('admin');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
        });

        it('should handle multiple role requirements', () => {
            mockRequest.user = mockDecodedToken;

            const middleware = requireRole('admin', 'moderator', 'editor');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(); // Has 'admin'
        });
    });

    describe('requirePermission()', () => {
        it('should allow user with required permission', () => {
            mockRequest.user = mockDecodedToken; // Has 'read:invoices'

            const middleware = requirePermission('read:invoices');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should require ALL specified permissions', () => {
            mockRequest.user = mockDecodedToken; // Has 'read:invoices', 'write:invoices'

            const middleware = requirePermission('read:invoices', 'write:invoices');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should deny user missing one required permission', () => {
            mockRequest.user = mockDecodedToken; // Has 'read:invoices', 'write:invoices'

            const middleware = requirePermission('read:invoices', 'write:invoices', 'delete:invoices', 'admin:invoices');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            // Missing 'admin:invoices'
            expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
        });

        it('should reject unauthenticated user', () => {
            mockRequest.user = undefined;

            const middleware = requirePermission('read:invoices');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
        });

        it('should handle user with empty permissions array', () => {
            mockRequest.user = { ...mockDecodedToken, permissions: [] };

            const middleware = requirePermission('read:invoices');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
        });

        it('should handle granular permission patterns', () => {
            mockRequest.user = mockDecodedToken;

            const middleware = requirePermission('read:invoices');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
        });
    });

    describe('requireTenant()', () => {
        it('should allow request with valid tenant context', () => {
            mockRequest.user = mockDecodedToken;
            mockRequest.tenantId = 'tenant-456';

            (tenantService.isEnabled as jest.Mock).mockReturnValue(true);

            const middleware = requireTenant();
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should skip check when multi-tenancy is disabled', () => {
            mockRequest.user = mockDecodedToken;

            (tenantService.isEnabled as jest.Mock).mockReturnValue(false);

            const middleware = requireTenant();
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should reject request without tenant context', () => {
            mockRequest.user = mockDecodedToken;
            mockRequest.tenantId = undefined;

            (tenantService.isEnabled as jest.Mock).mockReturnValue(true);

            const middleware = requireTenant();
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
        });

        it('should reject unauthenticated user', () => {
            mockRequest.user = undefined;

            const middleware = requireTenant();
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
        });
    });

    describe('authenticateApiKey()', () => {
        it('should authenticate valid API key', async () => {
            mockRequest.headers = {
                'x-api-key': 'a'.repeat(32), // 32+ character key
            };

            const middleware = authenticateApiKey();
            await middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should reject missing API key', async () => {
            mockRequest.headers = {};

            const middleware = authenticateApiKey();
            await middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
        });

        it('should reject short API key', async () => {
            mockRequest.headers = {
                'x-api-key': 'short-key',
            };

            const middleware = authenticateApiKey();
            await middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
        });

        it('should accept exactly 32 character key', async () => {
            mockRequest.headers = {
                'x-api-key': 'a'.repeat(32),
            };

            const middleware = authenticateApiKey();
            await middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should accept long API keys', async () => {
            mockRequest.headers = {
                'x-api-key': 'a'.repeat(64),
            };

            const middleware = authenticateApiKey();
            await middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
        });
    });

    describe('rateLimitByUser()', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should allow requests within rate limit', () => {
            mockRequest.user = mockDecodedToken;

            const middleware = rateLimitByUser(10, 60000); // 10 requests per minute

            // Make 5 requests (under limit)
            for (let i = 0; i < 5; i++) {
                middleware(mockRequest as Request, mockResponse as Response, mockNext);
            }

            expect(mockNext).toHaveBeenCalledTimes(5);
            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should block requests exceeding rate limit', () => {
            mockRequest.user = mockDecodedToken;

            const middleware = rateLimitByUser(5, 60000); // 5 requests per minute

            // Make 6 requests (1 over limit)
            for (let i = 0; i < 6; i++) {
                mockNext.mockClear();
                middleware(mockRequest as Request, mockResponse as Response, mockNext);
            }

            // Last call should fail
            expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
        });

        it('should reset counter after time window', () => {
            mockRequest.user = mockDecodedToken;

            const middleware = rateLimitByUser(3, 60000); // 3 requests per 60s

            // Make 3 requests
            for (let i = 0; i < 3; i++) {
                middleware(mockRequest as Request, mockResponse as Response, mockNext);
            }

            // Advance time by 61 seconds
            jest.advanceTimersByTime(61000);

            // Should allow new requests
            mockNext.mockClear();
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should track requests per user separately', () => {
            const user1 = { ...mockDecodedToken, userId: 'user-1' };
            const user2 = { ...mockDecodedToken, userId: 'user-2' };

            const middleware = rateLimitByUser(2, 60000);

            // User 1 makes 2 requests
            mockRequest.user = user1;
            middleware(mockRequest as Request, mockResponse as Response, mockNext);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            // User 2 should still be allowed
            mockRequest.user = user2;
            mockNext.mockClear();
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should skip rate limiting for unauthenticated requests', () => {
            mockRequest.user = undefined;

            const middleware = rateLimitByUser(1, 60000);

            // Make multiple requests
            middleware(mockRequest as Request, mockResponse as Response, mockNext);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(2);
            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should include reset time in error', () => {
            mockRequest.user = mockDecodedToken;

            const middleware = rateLimitByUser(1, 60000);

            middleware(mockRequest as Request, mockResponse as Response, mockNext);
            mockNext.mockClear();
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            const error = mockNext.mock.calls[0][0] as ForbiddenError;
            expect(error).toBeInstanceOf(ForbiddenError);
            expect(error.message).toContain('Rate limit exceeded');
        });
    });

    describe('Edge Cases and Integration', () => {
        it('should handle concurrent authentication and role check', async () => {
            mockRequest.headers = {
                authorization: 'Bearer valid-token',
            };

            (jwtService.extractTokenFromHeader as jest.Mock).mockReturnValue('valid-token');
            (jwtService.verifyAccessToken as jest.Mock).mockReturnValue(mockDecodedToken);
            (jwtService.isTokenRevoked as jest.Mock).mockResolvedValue(false);
            (tenantService.isEnabled as jest.Mock).mockReturnValue(false);

            const authMiddleware = authenticate();
            const roleMiddleware = requireRole('admin');

            await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            mockNext.mockClear();
            roleMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should handle authentication -> permission check flow', async () => {
            mockRequest.headers = {
                authorization: 'Bearer valid-token',
            };

            (jwtService.extractTokenFromHeader as jest.Mock).mockReturnValue('valid-token');
            (jwtService.verifyAccessToken as jest.Mock).mockReturnValue(mockDecodedToken);
            (jwtService.isTokenRevoked as jest.Mock).mockResolvedValue(false);
            (tenantService.isEnabled as jest.Mock).mockReturnValue(false);

            const authMiddleware = authenticate();
            const permMiddleware = requirePermission('read:invoices');

            await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            mockNext.mockClear();
            permMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should properly chain authentication -> tenant -> role checks', async () => {
            mockRequest.headers = {
                authorization: 'Bearer valid-token',
            };

            (jwtService.extractTokenFromHeader as jest.Mock).mockReturnValue('valid-token');
            (jwtService.verifyAccessToken as jest.Mock).mockReturnValue(mockDecodedToken);
            (jwtService.isTokenRevoked as jest.Mock).mockResolvedValue(false);
            (tenantService.isEnabled as jest.Mock).mockReturnValue(true);
            (tenantService.getTenantById as jest.Mock).mockResolvedValue({ schema: 'tenant_456' });

            const authMiddleware = authenticate();
            const tenantMiddleware = requireTenant();
            const roleMiddleware = requireRole('admin');

            await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
            mockNext.mockClear();

            tenantMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
            mockNext.mockClear();

            roleMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
        });
    });
});
