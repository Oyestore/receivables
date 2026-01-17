import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * JWT Authentication Guard for Module 06
 * Validates JWT tokens on protected routes
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('No authentication token provided');
        }

        try {
            // In production, validate JWT token here
            // For now, basic validation
            const payload = this.validateToken(token);
            request.user = payload;
            return true;
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }

    private extractTokenFromHeader(request: any): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }

    private validateToken(token: string): any {
        // Production: Use @nestjs/jwt to verify token
        // For now, decode and return mock payload
        return {
            userId: 'user-123',
            tenantId: 'tenant-123',
            email: 'user@example.com',
            roles: ['credit_manager'],
        };
    }
}
