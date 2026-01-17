/**
 * Security Middleware
 * 
 * JWT authentication and RBAC for Module 10 endpoints
 */

import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

interface JWTPayload {
    userId: string;
    tenantId: string;
    roles: string[];
    permissions: string[];
}

@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
    private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

    use(req: Request, res: Response, next: NextFunction): void {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('No authorization token provided');
        }

        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload;

            // Attach user info to request
            (req as any).user = {
                userId: decoded.userId,
                tenantId: decoded.tenantId,
                roles: decoded.roles,
                permissions: decoded.permissions,
            };

            next();
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}

/**
 * Role-Based Access Control Guard
 */
@Injectable()
export class RBACGuard {
    canActivate(requiredPermissions: string[], userPermissions: string[]): boolean {
        return requiredPermissions.every(permission =>
            userPermissions.includes(permission) || userPermissions.includes('admin:all')
        );
    }

    checkPermission(req: Request, requiredPermission: string): void {
        const user = (req as any).user;

        if (!user) {
            throw new UnauthorizedException('User not authenticated');
        }

        if (!this.canActivate([requiredPermission], user.permissions)) {
            throw new ForbiddenException(
                `Permission denied: ${requiredPermission} required`
            );
        }
    }

    checkAnyPermission(req: Request, requiredPermissions: string[]): void {
        const user = (req as any).user;

        if (!user) {
            throw new UnauthorizedException('User not authenticated');
        }

        const hasPermission = requiredPermissions.some(permission =>
            user.permissions.includes(permission) || user.permissions.includes('admin:all')
        );

        if (!hasPermission) {
            throw new ForbiddenException(
                `Permission denied: One of [${requiredPermissions.join(', ')}] required`
            );
        }
    }
}

/**
 * Permissions for Module 10 Operations
 */
export const Permissions = {
    // Workflow permissions
    WORKFLOW_START: 'workflow:start',
    WORKFLOW_VIEW: 'workflow:view',
    WORKFLOW_CANCEL: 'workflow:cancel',
    WORKFLOW_SIGNAL: 'workflow:signal',

    // Constraint analysis permissions
    CONSTRAINT_ANALYZE: 'constraint:analyze',
    CONSTRAINT_VIEW: 'constraint:view',

    // Recommendation permissions
    RECOMMENDATION_GENERATE: 'recommendation:generate',
    RECOMMENDATION_VIEW: 'recommendation:view',
    RECOMMENDATION_APPROVE: 'recommendation:approve',

    // Integration gateway permissions
    GATEWAY_EXECUTE: 'gateway:execute',
    GATEWAY_HEALTH: 'gateway:health',

    // Event permissions
    EVENT_PUBLISH: 'event:publish',
    EVENT_SUBSCRIBE: 'event:subscribe',

    // Admin permissions
    ADMIN_ALL: 'admin:all',
    ADMIN_METRICS: 'admin:metrics',
    ADMIN_CONFIG: 'admin:config',
} as const;

/**
 * Role Definitions
 */
export const Roles = {
    ADMIN: {
        name: 'admin',
        permissions: [Permissions.ADMIN_ALL],
    },
    WORKFLOW_MANAGER: {
        name: 'workflow_manager',
        permissions: [
            Permissions.WORKFLOW_START,
            Permissions.WORKFLOW_VIEW,
            Permissions.WORKFLOW_CANCEL,
            Permissions.WORKFLOW_SIGNAL,
            Permissions.CONSTRAINT_ANALYZE,
            Permissions.CONSTRAINT_VIEW,
            Permissions.RECOMMENDATION_GENERATE,
            Permissions.RECOMMENDATION_VIEW,
        ],
    },
    ANALYST: {
        name: 'analyst',
        permissions: [
            Permissions.WORKFLOW_VIEW,
            Permissions.CONSTRAINT_VIEW,
            Permissions.RECOMMENDATION_VIEW,
            Permissions.GATEWAY_HEALTH,
        ],
    },
    READONLY: {
        name: 'readonly',
        permissions: [
            Permissions.WORKFLOW_VIEW,
            Permissions.CONSTRAINT_VIEW,
            Permissions.RECOMMENDATION_VIEW,
        ],
    },
} as const;
