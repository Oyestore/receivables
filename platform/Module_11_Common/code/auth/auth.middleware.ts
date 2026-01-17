import { Request, Response, NextFunction } from 'express';
import { jwtService, IDecodedToken } from './jwt.service';
import { tenantService } from '../multi-tenancy/tenant.service';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error';
import { Logger } from '../logging/logger';

const logger = new Logger('AuthMiddleware');

/**
 * Extend Express Request to include user and tenant context
 */
declare global {
  namespace Express {
    interface Request {
      user?: IDecodedToken;
      tenantId?: string;
      tenantSchema?: string;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export function authenticate() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract token from Authorization header
      const token = jwtService.extractTokenFromHeader(req.headers.authorization);

      // Verify token
      const decoded = jwtService.verifyAccessToken(token);

      // Check if token is revoked
      const isRevoked = await jwtService.isTokenRevoked(token);
      if (isRevoked) {
        throw new UnauthorizedError('Token has been revoked');
      }

      // Attach user to request
      req.user = decoded;
      req.tenantId = decoded.tenantId;

      // If multi-tenancy is enabled, get tenant schema
      if (tenantService.isEnabled()) {
        const tenant = await tenantService.getTenantById(decoded.tenantId);
        req.tenantSchema = tenant.schema;
      }

      logger.debug('User authenticated', {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't fail if missing
 */
export function optionalAuthenticate() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return next();
      }

      const token = jwtService.extractTokenFromHeader(authHeader);
      const decoded = jwtService.verifyAccessToken(token);

      // Check if token is revoked
      const isRevoked = await jwtService.isTokenRevoked(token);
      if (!isRevoked) {
        req.user = decoded;
        req.tenantId = decoded.tenantId;

        if (tenantService.isEnabled()) {
          const tenant = await tenantService.getTenantById(decoded.tenantId);
          req.tenantSchema = tenant.schema;
        }
      }

      next();
    } catch (error) {
      // Don't fail on authentication errors for optional auth
      logger.debug('Optional authentication failed', { error });
      next();
    }
  };
}

/**
 * Role-based authorization middleware
 * Checks if user has required role
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const userRoles = req.user.roles || [];
      const hasRole = roles.some(role => userRoles.includes(role));

      if (!hasRole) {
        throw new ForbiddenError(
          `Access denied. Required roles: ${roles.join(', ')}`,
          { requiredRoles: roles, userRoles }
        );
      }

      logger.debug('Role check passed', {
        userId: req.user.userId,
        requiredRoles: roles,
        userRoles,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Permission-based authorization middleware
 * Checks if user has required permission
 */
export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const userPermissions = req.user.permissions || [];
      const hasPermission = permissions.every(permission =>
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        throw new ForbiddenError(
          `Access denied. Required permissions: ${permissions.join(', ')}`,
          { requiredPermissions: permissions, userPermissions }
        );
      }

      logger.debug('Permission check passed', {
        userId: req.user.userId,
        requiredPermissions: permissions,
        userPermissions,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Tenant isolation middleware
 * Ensures user can only access their tenant's data
 */
export function requireTenant() {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!tenantService.isEnabled()) {
        return next();
      }

      if (!req.tenantId) {
        throw new ForbiddenError('Tenant context missing');
      }

      // Tenant ID is already set from authentication middleware
      logger.debug('Tenant check passed', {
        userId: req.user.userId,
        tenantId: req.tenantId,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * API Key authentication middleware
 * For server-to-server communication
 */
export function authenticateApiKey() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        throw new UnauthorizedError('API key missing');
      }

      // In production, validate API key against database
      // For now, just check if it exists
      if (!apiKey || apiKey.length < 32) {
        throw new UnauthorizedError('Invalid API key');
      }

      logger.debug('API key authenticated', {
        apiKeyPrefix: apiKey.substring(0, 8),
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Rate limiting by user
 * Prevents abuse by authenticated users
 */
export function rateLimitByUser(maxRequests: number, windowMs: number) {
  const requests = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        return next();
      }

      const userId = req.user.userId;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Get user's request timestamps
      let userRequests = requests.get(userId) || [];

      // Filter out old requests
      userRequests = userRequests.filter(timestamp => timestamp > windowStart);

      // Check if limit exceeded
      if (userRequests.length >= maxRequests) {
        throw new ForbiddenError(
          'Rate limit exceeded. Please try again later.',
          {
            limit: maxRequests,
            windowMs,
            resetAt: new Date(userRequests[0] + windowMs).toISOString(),
          }
        );
      }

      // Add current request
      userRequests.push(now);
      requests.set(userId, userRequests);

      // Cleanup old entries periodically
      if (Math.random() < 0.01) {
        this.cleanupOldEntries(requests, windowMs);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Cleanup old rate limit entries
 */
function cleanupOldEntries(
  requests: Map<string, number[]>,
  windowMs: number
): void {
  const now = Date.now();
  const windowStart = now - windowMs;

  for (const [userId, timestamps] of requests.entries()) {
    const validTimestamps = timestamps.filter(t => t > windowStart);
    
    if (validTimestamps.length === 0) {
      requests.delete(userId);
    } else {
      requests.set(userId, validTimestamps);
    }
  }
}
