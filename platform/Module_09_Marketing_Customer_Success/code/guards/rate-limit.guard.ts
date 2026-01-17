import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Rate Limiting Guard
 * 
 * Protects endpoints from abuse by limiting requests per user/IP
 * Configurable via @RateLimit() decorator
 */

export interface RateLimitOptions {
    windowMs: number;     // Time window in milliseconds
    maxRequests: number;  // Maximum requests per window
    keyGenerator?: (req: any) => string; // Custom key generator
}

@Injectable()
export class RateLimitGuard implements CanActivate {
    private requestCounts = new Map<string, { count: number; resetTime: number }>();

    constructor(private reflector: Reflector) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const options = this.reflector.get<RateLimitOptions>('rateLimit', context.getHandler());

        if (!options) {
            return true; // No rate limit configured
        }

        const request = context.switchToHttp().getRequest();
        const key = options.keyGenerator
            ? options.keyGenerator(request)
            : this.getDefaultKey(request);

        const now = Date.now();
        const record = this.requestCounts.get(key);

        // Clean up expired records periodically
        this.cleanupExpired(now);

        if (!record || now > record.resetTime) {
            // New window
            this.requestCounts.set(key, {
                count: 1,
                resetTime: now + options.windowMs,
            });
            return true;
        }

        if (record.count >= options.maxRequests) {
            const resetIn = Math.ceil((record.resetTime - now) / 1000);
            throw new HttpException(
                {
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                    message: 'Rate limit exceeded. Please try again later.',
                    retryAfter: resetIn,
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        record.count++;
        return true;
    }

    private getDefaultKey(request: any): string {
        // Use user ID if authenticated, otherwise IP address
        const userId = request.user?.id;
        const ip = request.ip || request.connection.remoteAddress;
        return userId ? `user:${userId}` : `ip:${ip}`;
    }

    private cleanupExpired(now: number): void {
        // Remove expired entries (run occasionally, not every request)
        if (Math.random() > 0.99) { // 1% chance
            for (const [key, record] of this.requestCounts.entries()) {
                if (now > record.resetTime) {
                    this.requestCounts.delete(key);
                }
            }
        }
    }
}

/**
 * Rate Limit Decorator
 * 
 * Usage:
 * @RateLimit({ windowMs: 60000, maxRequests: 10 })
 * async createCampaign() { ... }
 */
export const RateLimit = (options: RateLimitOptions) => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata('rateLimit', options, descriptor.value);
        return descriptor;
    };
};
