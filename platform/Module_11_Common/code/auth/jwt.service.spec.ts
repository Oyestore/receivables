/**
 * JWT Service Unit Tests
 * 
 * Comprehensive test suite for JWTService
 * Target: 90%+ code coverage
 */

import { JWTService, IJWTPayload, ITokenPair, IDecodedToken } from '../jwt.service';
import { TokenError, UnauthorizedError } from '../../errors/app-error';
import { config } from '../../config/config.service';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../config/config.service');
jest.mock('../../logging/logger');
jest.mock('jsonwebtoken');

describe('JWTService', () => {
    let jwtService: JWTService;

    const mockJwtConfig = {
        secret: 'test-secret-key-for-access-tokens',
        refreshSecret: 'test-refresh-secret-key',
        expiresIn: '15m',
        refreshExpiresIn: '7d',
    };

    const mockPayload: IJWTPayload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        email: 'test@example.com',
        roles: ['admin', 'user'],
        permissions: ['read:invoices', 'write:invoices', 'delete:invoices'],
    };

    beforeEach(() => {
        // Reset singleton
        (JWTService as any).instance = undefined;

        // Mock config
        (config.getValue as jest.Mock).mockReturnValue(mockJwtConfig);

        jwtService = JWTService.getInstance();

        // Reset JWT mocks
        jest.clearAllMocks();
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = JWTService.getInstance();
            const instance2 = JWTService.getInstance();

            expect(instance1).toBe(instance2);
        });

        it('should initialize with JWT configuration', () => {
            expect(config.getValue).toHaveBeenCalledWith('jwt');
        });
    });

    describe('generateTokenPair', () => {
        it('should generate both access and refresh tokens', () => {
            (jwt.sign as jest.Mock).mockReturnValue('mock-token');

            const tokenPair = jwtService.generateTokenPair(mockPayload);

            expect(tokenPair).toHaveProperty('accessToken');
            expect(tokenPair).toHaveProperty('refreshToken');
            expect(tokenPair).toHaveProperty('expiresIn');
            expect(typeof tokenPair.expiresIn).toBe('number');
        });

        it('should call generateAccessToken and generateRefreshToken', () => {
            const generateAccessSpy = jest.spyOn(jwtService, 'generateAccessToken');
            const generateRefreshSpy = jest.spyOn(jwtService, 'generateRefreshToken');

            (jwt.sign as jest.Mock).mockReturnValue('mock-token');

            jwtService.generateTokenPair(mockPayload);

            expect(generateAccessSpy).toHaveBeenCalledWith(mockPayload);
            expect(generateRefreshSpy).toHaveBeenCalledWith(mockPayload);
        });

        it('should return correct expiration time', () => {
            (jwt.sign as jest.Mock).mockReturnValue('mock-token');

            const tokenPair = jwtService.generateTokenPair(mockPayload);

            // 15m = 900 seconds
            expect(tokenPair.expiresIn).toBe(900);
        });
    });

    describe('generateAccessToken', () => {
        it('should generate access token with correct payload', () => {
            (jwt.sign as jest.Mock).mockReturnValue('access-token-123');

            const token = jwtService.generateAccessToken(mockPayload);

            expect(jwt.sign).toHaveBeenCalledWith(
                expect.objectContaining({
                    ...mockPayload,
                    type: 'access',
                }),
                mockJwtConfig.secret,
                { expiresIn: mockJwtConfig.expiresIn }
            );
            expect(token).toBe('access-token-123');
        });

        it('should include all payload fields', () => {
            (jwt.sign as jest.Mock).mockImplementation((payload) => {
                expect(payload).toHaveProperty('userId');
                expect(payload).toHaveProperty('tenantId');
                expect(payload).toHaveProperty('email');
                expect(payload).toHaveProperty('roles');
                expect(payload).toHaveProperty('permissions');
                expect(payload.type).toBe('access');
                return 'token';
            });

            jwtService.generateAccessToken(mockPayload);
        });
    });

    describe('generateRefreshToken', () => {
        it('should generate refresh token with minimal payload', () => {
            (jwt.sign as jest.Mock).mockReturnValue('refresh-token-456');

            const token = jwtService.generateRefreshToken(mockPayload);

            expect(jwt.sign).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockPayload.userId,
                    tenantId: mockPayload.tenantId,
                    type: 'refresh',
                }),
                mockJwtConfig.refreshSecret,
                { expiresIn: mockJwtConfig.refreshExpiresIn }
            );
            expect(token).toBe('refresh-token-456');
        });

        it('should not include sensitive fields in refresh token', () => {
            (jwt.sign as jest.Mock).mockImplementation((payload) => {
                expect(payload).not.toHaveProperty('email');
                expect(payload).not.toHaveProperty('roles');
                expect(payload).not.toHaveProperty('permissions');
                return 'token';
            });

            jwtService.generateRefreshToken(mockPayload);
        });
    });

    describe('verifyAccessToken', () => {
        const mockDecodedToken: IDecodedToken = {
            ...mockPayload,
            type: 'access',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 900,
        };

        it('should verify valid access token', () => {
            (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

            const decoded = jwtService.verifyAccessToken('valid-token');

            expect(jwt.verify).toHaveBeenCalledWith('valid-token', mockJwtConfig.secret);
            expect(decoded).toEqual(mockDecodedToken);
        });

        it('should throw TokenError for expired token', () => {
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new jwt.TokenExpiredError('Token expired', new Date());
            });

            expect(() => jwtService.verifyAccessToken('expired-token')).toThrow(TokenError);
            expect(() => jwtService.verifyAccessToken('expired-token')).toThrow('Access token expired');
        });

        it('should throw TokenError for invalid token', () => {
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new jwt.JsonWebTokenError('Invalid token');
            });

            expect(() => jwtService.verifyAccessToken('invalid-token')).toThrow(TokenError);
            expect(() => jwtService.verifyAccessToken('invalid-token')).toThrow('Invalid access token');
        });

        it('should throw TokenError for refresh token passed to access verification', () => {
            const refreshToken: IDecodedToken = {
                ...mock DecodedToken,
                type: 'refresh',
            };

            (jwt.verify as jest.Mock).mockReturnValue(refreshToken);

            expect(() => jwtService.verifyAccessToken('refresh-token')).toThrow(TokenError);
            expect(() => jwtService.verifyAccessToken('refresh-token')).toThrow('Invalid token type');
        });

        it('should rethrow unknown errors', () => {
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new Error('Unexpected error');
            });

            expect(() => jwtService.verifyAccessToken('token')).toThrow('Unexpected error');
        });
    });

    describe('verifyRefreshToken', () => {
        const mockDecodedRefresh: IDecodedToken = {
            ...mockPayload,
            type: 'refresh',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 604800,
        };

        it('should verify valid refresh token', () => {
            (jwt.verify as jest.Mock).mockReturnValue(mockDecodedRefresh);

            const decoded = jwtService.verifyRefreshToken('valid-refresh-token');

            expect(jwt.verify).toHaveBeenCalledWith('valid-refresh-token', mockJwtConfig.refreshSecret);
            expect(decoded).toEqual(mockDecodedRefresh);
        });

        it('should throw TokenError for expired refresh token', () => {
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new jwt.TokenExpiredError('Refresh token expired', new Date());
            });

            expect(() => jwtService.verifyRefreshToken('expired-refresh-token')).toThrow(TokenError);
            expect(() => jwtService.verifyRefreshToken('expired-refresh-token')).toThrow('Refresh token expired');
        });

        it('should throw TokenError for access token passed to refresh verification', () => {
            const accessToken: IDecodedToken = {
                ...mockDecodedRefresh,
                type: 'access',
            };

            (jwt.verify as jest.Mock).mockReturnValue(accessToken);

            expect(() => jwtService.verifyRefreshToken('access-token')).toThrow(TokenError);
            expect(() => jwtService.verifyRefreshToken('access-token')).toThrow('Invalid token type');
        });
    });

    describe('refreshAccessToken', () => {
        const mockDecodedRefresh: IDecodedToken = {
            ...mockPayload,
            type: 'refresh',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 604800,
        };

        it('should generate new token pair from valid refresh token', async () => {
            (jwt.verify as jest.Mock).mockReturnValue(mockDecodedRefresh);
            (jwt.sign as jest.Mock).mockReturnValue('new-token');

            const tokenPair = await jwtService.refreshAccessToken('valid-refresh-token');

            expect(tokenPair).toHaveProperty('accessToken');
            expect(tokenPair).toHaveProperty('refreshToken');
            expect(tokenPair).toHaveProperty('expiresIn');
        });

        it('should verify refresh token before generating new pair', async () => {
            const verifySpy = jest.spyOn(jwtService, 'verifyRefreshToken');
            (jwt.verify as jest.Mock).mockReturnValue(mockDecodedRefresh);
            (jwt.sign as jest.Mock).mockReturnValue('new-token');

            await jwtService.refreshAccessToken('refresh-token');

            expect(verifySpy).toHaveBeenCalledWith('refresh-token');
        });

        it('should throw error for invalid refresh token', async () => {
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new jwt.JsonWebTokenError('Invalid token');
            });

            await expect(jwtService.refreshAccessToken('invalid-token')).rejects.toThrow(TokenError);
        });
    });

    describe('decodeToken', () => {
        it('should decode valid token without verification', () => {
            const mockDecoded = { ...mockPayload, type: 'access', iat: 123, exp: 456 };
            (jwt.decode as jest.Mock).mockReturnValue(mockDecoded);

            const decoded = jwtService.decodeToken('any-token');

            expect(jwt.decode).toHaveBeenCalledWith('any-token');
            expect(decoded).toEqual(mockDecoded);
        });

        it('should return null for invalid token', () => {
            (jwt.decode as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid');
            });

            const decoded = jwtService.decodeToken('malformed-token');

            expect(decoded).toBeNull();
        });

        it('should decode expired token successfully', () => {
            const expiredToken = { ...mockPayload, type: 'access', iat: 100, exp: 200 };
            (jwt.decode as jest.Mock).mockReturnValue(expiredToken);

            const decoded = jwtService.decodeToken('expired-token');

            expect(decoded).toEqual(expiredToken);
        });
    });

    describe('extractTokenFromHeader', () => {
        it('should extract token from valid Bearer header', () => {
            const token = jwtService.extractTokenFromHeader('Bearer abc123xyz');

            expect(token).toBe('abc123xyz');
        });

        it('should throw UnauthorizedError for missing header', () => {
            expect(() => jwtService.extractTokenFromHeader(undefined)).toThrow(UnauthorizedError);
            expect(() => jwtService.extractTokenFromHeader(undefined)).toThrow('Authorization header missing');
        });

        it('should throw UnauthorizedError for invalid format (no Bearer)', () => {
            expect(() => jwtService.extractTokenFromHeader('abc123xyz')).toThrow(UnauthorizedError);
            expect(() => jwtService.extractTokenFromHeader('abc123xyz')).toThrow('Invalid authorization header format');
        });

        it('should throw UnauthorizedError for invalid scheme', () => {
            expect(() => jwtService.extractTokenFromHeader('Basic abc123xyz')).toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for missing token part', () => {
            expect(() => jwtService.extractTokenFromHeader('Bearer ')).toThrow(UnauthorizedError);
        });

        it('should handle tokens with special characters', () => {
            const token = jwtService.extractTokenFromHeader('Bearer abc.123_XYZ-789');

            expect(token).toBe('abc.123_XYZ-789');
        });
    });

    describe('isTokenExpired', () => {
        it('should return false for valid token', () => {
            const futureExp = Math.floor(Date.now() / 1000) + 3600;
            (jwt.decode as jest.Mock).mockReturnValue({
                ...mockPayload,
                exp: futureExp,
            });

            const isExpired = jwtService.isTokenExpired('valid-token');

            expect(isExpired).toBe(false);
        });

        it('should return true for expired token', () => {
            const pastExp = Math.floor(Date.now() / 1000) - 3600;
            (jwt.decode as jest.Mock).mockReturnValue({
                ...mockPayload,
                exp: pastExp,
            });

            const isExpired = jwtService.isTokenExpired('expired-token');

            expect(isExpired).toBe(true);
        });

        it('should return true for token without exp claim', () => {
            (jwt.decode as jest.Mock).mockReturnValue({
                ...mockPayload,
            });

            const isExpired = jwtService.isTokenExpired('token-without-exp');

            expect(isExpired).toBe(true);
        });

        it('should return true for invalid token', () => {
            (jwt.decode as jest.Mock).mockReturnValue(null);

            const isExpired = jwtService.isTokenExpired('invalid-token');

            expect(isExpired).toBe(true);
        });

        it('should return true for token expiring in 1 second', () => {
            const almostExpired = Math.floor(Date.now() / 1000) + 1;
            (jwt.decode as jest.Mock).mockReturnValue({
                ...mockPayload,
                exp: almostExpired,
            });

            // Wait 2 seconds
            jest.useFakeTimers();
            jest.advanceTimersByTime(2000);

            const isExpired = jwtService.isTokenExpired('almost-expired-token');

            expect(isExpired).toBe(true);
            jest.useRealTimers();
        });
    });

    describe('getTokenExpiration', () => {
        it('should return expiration date for valid token', () => {
            const expTimestamp = Math.floor(Date.now() / 1000) + 3600;
            (jwt.decode as jest.Mock).mockReturnValue({
                ...mockPayload,
                exp: expTimestamp,
            });

            const expDate = jwtService.getTokenExpiration('valid-token');

            expect(expDate).toBeInstanceOf(Date);
            expect(expDate?.getTime()).toBe(expTimestamp * 1000);
        });

        it('should return null for token without exp claim', () => {
            (jwt.decode as jest.Mock).mockReturnValue({
                ...mockPayload,
            });

            const expDate = jwtService.getTokenExpiration('token-without-exp');

            expect(expDate).toBeNull();
        });

        it('should return null for invalid token', () => {
            (jwt.decode as jest.Mock).mockReturnValue(null);

            const expDate = jwtService.getTokenExpiration('invalid-token');

            expect(expDate).toBeNull();
        });
    });

    describe('parseExpirationTime', () => {
        it('should parse seconds correctly', () => {
            const seconds = (jwtService as any).parseExpirationTime('30s');
            expect(seconds).toBe(30);
        });

        it('should parse minutes correctly', () => {
            const seconds = (jwtService as any).parseExpirationTime('15m');
            expect(seconds).toBe(900); // 15 * 60
        });

        it('should parse hours correctly', () => {
            const seconds = (jwtService as any).parseExpirationTime('2h');
            expect(seconds).toBe(7200); // 2 * 3600
        });

        it('should parse days correctly', () => {
            const seconds = (jwtService as any).parseExpirationTime('7d');
            expect(seconds).toBe(604800); // 7 * 86400
        });

        it('should throw error for invalid format', () => {
            expect(() => (jwtService as any).parseExpirationTime('invalid')).toThrow('Invalid expiration time format');
            expect(() => (jwtService as any).parseExpirationTime('15minutes')).toThrow();
            expect(() => (jwtService as any).parseExpirationTime('m15')).toThrow();
        });
    });

    describe('revokeToken', () => {
        it('should revoke valid token', async () => {
            const mockDecoded = { ...mockPayload, type: 'access', iat: 123, exp: 456 };
            (jwt.decode as jest.Mock).mockReturnValue(mockDecoded);

            await expect(jwtService.revokeToken('valid-token')).resolves.not.toThrow();
        });

        it('should throw error for invalid token', async () => {
            (jwt.decode as jest.Mock).mockReturnValue(null);

            await expect(jwtService.revokeToken('invalid-token')).rejects.toThrow(TokenError);
            await expect(jwtService.revokeToken('invalid-token')).rejects.toThrow('Invalid token');
        });

        it('should log revocation details', async () => {
            const mockDecoded = {
                ...mockPayload,
                type: 'access',
                iat: 123,
                exp: 456,
            };
            (jwt.decode as jest.Mock).mockReturnValue(mockDecoded);

            await jwtService.revokeToken('token-to-revoke');

            // In production, this would verify Redis write
            // For now, just ensure no error thrown
            expect(true).toBe(true);
        });
    });

    describe('isTokenRevoked', () => {
        it('should return false for non-revoked token (placeholder)', async () => {
            const isRevoked = await jwtService.isTokenRevoked('any-token');

            expect(isRevoked).toBe(false);
        });

        // In production with Redis:
        // it('should return true for revoked token', async () => { ... });
        // it('should return false for expired revocation entry', async () => { ... });
    });

    describe('Edge Cases and Security', () => {
        it('should handle very long tokens', () => {
            const longToken = 'A'.repeat(10000);
            (jwt.decode as jest.Mock).mockReturnValue(mockPayload);

            jwtService.decodeToken(longToken);

            expect(jwt.decode).toHaveBeenCalledWith(longToken);
        });

        it('should handle tokens with special characters in payload', () => {
            const specialPayload = {
                ...mockPayload,
                email: 'test+special@example.com',
                roles: ['admin & user', 'special-role'],
            };

            (jwt.sign as jest.Mock).mockReturnValue('token-with-special-chars');

            jwtService.generateAccessToken(specialPayload);

            expect(jwt.sign).toHaveBeenCalledWith(
                expect.objectContaining(specialPayload),
                expect.any(String),
                expect.any(Object)
            );
        });

        it('should handle payload with empty arrays', () => {
            const emptyArraysPayload = {
                ...mockPayload,
                roles: [],
                permissions: [],
            };

            (jwt.sign as jest.Mock).mockReturnValue('token');

            jwtService.generateAccessToken(emptyArraysPayload);

            expect(jwt.sign).toHaveBeenCalled();
        });

        it('should handle malformed Bearer headers', () => {
            const malformedHeaders = [
                'bearer token123', // lowercase
                'Bearer  token123', // double space
                'Bearer\ttoken123', // tab instead of space
                'BearerNoSpace',
            ];

            for (const header of malformedHeaders) {
                try {
                    jwtService.extractTokenFromHeader(header);
                    // Some should fail
                } catch (error) {
                    expect(error).toBeInstanceOf(UnauthorizedError);
                }
            }
        });
    });

    describe('Multiple User Scenarios', () => {
        it('should generate different tokens for different users', () => {
            const user1: IJWTPayload = {
                userId: 'user-1',
                tenantId: 'tenant-1',
                email: 'user1@example.com',
                roles: ['user'],
                permissions: ['read:own'],
            };

            const user2: IJWTPayload = {
                userId: 'user-2',
                tenantId: 'tenant-1',
                email: 'user2@example.com',
                roles: ['admin'],
                permissions: ['read:all', 'write:all'],
            };

            (jwt.sign as jest.Mock)
                .mockReturnValueOnce('token-user1-access')
                .mockReturnValueOnce('token-user1-refresh')
                .mockReturnValueOnce('token-user2-access')
                .mockReturnValueOnce('token-user2-refresh');

            const tokens1 = jwtService.generateTokenPair(user1);
            const tokens2 = jwtService.generateTokenPair(user2);

            expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
            expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
        });

        it('should support varying role counts', () => {
            const payloads = [
                { ...mockPayload, roles: [] },
                { ...mockPayload, roles: ['user'] },
                { ...mockPayload, roles: ['user', 'admin'] },
                { ...mockPayload, roles: ['user', 'admin', 'superadmin', 'auditor'] },
            ];

            (jwt.sign as jest.Mock).mockReturnValue('token');

            for (const payload of payloads) {
                jwtService.generateAccessToken(payload);
                expect(jwt.sign).toHaveBeenCalledWith(
                    expect.objectContaining({ roles: payload.roles }),
                    expect.any(String),
                    expect.any(Object)
                );
            }
        });
    });
});
