/**
 * Redis-Based Rate Limiting Service
 * 
 * Production-ready distributed rate limiting using Redis
 * Replaces in-memory rate limiting from auth.middleware.ts
 * 
 * Features:
 * - Distributed rate limiting (works across multiple instances)
 * - Sliding window algorithm
 * - Per-user and per-IP rate limiting
 * - Configurable limits per endpoint
 * - Rate limit headers (X-RateLimit-*)
 */

import { Logger } from '../logging/logger';
import { ForbiddenError } from '../errors/app-error';

const logger = new Logger('RateLimitService');

export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    keyPrefix?: string;
}

export interface RateLimitResult {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: Date;
}

/**
 * Redis Rate Limiter
 */
export class RedisRateLimiter {
    private redis: any;

    constructor(redisClient?: any) {
        if (redisClient) {
            this.redis = redisClient;
            logger.info('Redis rate limiter initialized with provided client');
        } else {
            // Try to create Redis client
            try {
                const Redis = require('ioredis');
                this.redis = new Redis({
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    password: process.env.REDIS_PASSWORD,
                    db: parseInt(process.env.REDIS_DB || '0'),
                });

                this.redis.on('ready', () => {
                    logger.info('Redis rate limiter connected');
                });

                this.redis.on('error', (error: Error) => {
                    logger.error('Redis connection error', { error: error.message });
                });
            } catch (error) {
                logger.warn('Redis not available, rate limiting will be disabled', { error });
                this.redis = null;
            }
        }
    }

    /**
     * Check rate limit using sliding window algorithm
     */
    async checkLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
        if (!this.redis) {
            // Redis not available, allow all requests
            logger.debug('Redis unavailable, bypassing rate limit');
            return {
                allowed: true,
                limit: config.maxRequests,
                remaining: config.maxRequests,
                resetTime: new Date(Date.now() + config.windowMs),
            };
        }

        const now = Date.now();
        const windowStart = now - config.windowMs;
        const redisKey = `${config.keyPrefix || 'ratelimit'}:${key}`;

        try {
            // Use Redis transaction to ensure atomicity
            const pipeline = this.redis.pipeline();

            // Remove old entries outside the window
            pipeline.zremrangebyscore(redisKey, 0, windowStart);

            // Count current requests in window
            pipeline.zcard(redisKey);

            // Add current request
            pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);

            // Set expiration on the key
            pipeline.expire(redisKey, Math.ceil(config.windowMs / 1000) + 1);

            const results = await pipeline.exec();

            // Get count after removing old entries (index 1 in results)
            const currentCount = results[1][1] as number;

            const allowed = currentCount < config.maxRequests;
            const remaining = Math.max(0, config.maxRequests - currentCount - 1);
            const resetTime = new Date(now + config.windowMs);

            if (!allowed) {
                logger.warn('Rate limit exceeded', {
                    key,
                    limit: config.maxRequests,
                    current: currentCount,
                    window: `${config.windowMs}ms`,
                });
            }

            return {
                allowed,
                limit: config.maxRequests,
                remaining,
                resetTime,
            };
        } catch (error) {
            logger.error('Rate limit check failed', {
                key,
                error: (error as Error).message,
            });

            // On error, allow the request (fail open)
            return {
                allowed: true,
                limit: config.maxRequests,
                remaining: config.maxRequests,
                resetTime: new Date(now + config.windowMs),
            };
        }
    }

    /**
     * Reset rate limit for a key
     */
    async reset(key: string, keyPrefix?: string): Promise<void> {
        if (!this.redis) return;

        const redisKey = `${keyPrefix || 'ratelimit'}:${key}`;

        try {
            await this.redis.del(redisKey);
            logger.info('Rate limit reset', { key: redisKey });
        } catch (error) {
            logger.error('Rate limit reset failed', {
                key: redisKey,
                error: (error as Error).message,
            });
        }
    }

    /**
     * Get current rate limit status
     */
    async getStatus(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
        if (!this.redis) {
            return {
                allowed: true,
                limit: config.maxRequests,
                remaining: config.maxRequests,
                resetTime: new Date(Date.now() + config.windowMs),
            };
        }

        const now = Date.now();
        const windowStart = now - config.windowMs;
        const redisKey = `${config.keyPrefix || 'ratelimit'}:${key}`;

        try {
            // Count requests in current window
            const count = await this.redis.zcount(redisKey, windowStart, now);

            const remaining = Math.max(0, config.maxRequests - count);
            const allowed = count < config.maxRequests;

            return {
                allowed,
                limit: config.maxRequests,
                remaining,
                resetTime: new Date(now + config.windowMs),
            };
        } catch (error) {
            logger.error('Failed to get rate limit status', {
                key,
                error: (error as Error).message,
            });

            return {
                allowed: true,
                limit: config.maxRequests,
                remaining: config.maxRequests,
                resetTime: new Date(now + config.windowMs),
            };
        }
    }

    /**
     * Close Redis connection
     */
    async close(): Promise<void> {
        if (this.redis) {
            await this.redis.quit();
            logger.info('Redis rate limiter disconnected');
        }
    }
}

/**
 * Rate Limit Middleware Factory
 */
export function createRateLimitMiddleware(
    limiter: RedisRateLimiter,
    config: RateLimitConfig,
    keyGenerator?: (req: any) => string
) {
    return async (req: any, res: any, next: any): Promise<void> => {
        try {
            // Generate rate limit key
            const key = keyGenerator
                ? keyGenerator(req)
                : req.user?.userId || req.ip || 'anonymous';

            // Check rate limit
            const result = await limiter.checkLimit(key, config);

            // Set rate limit headers
            res.setHeader('X-RateLimit-Limit', result.limit.toString());
            res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
            res.setHeader('X-RateLimit-Reset', result.resetTime.toISOString());

            if (!result.allowed) {
                throw new ForbiddenError('Rate limit exceeded. Please try again later.', {
                    limit: result.limit,
                    resetAt: result.resetTime.toISOString(),
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Pre-configured rate limit tiers
 */
export const RateLimitTiers = {
    // API endpoints
    strict: { maxRequests: 10, windowMs: 60000 }, // 10/minute
    normal: { maxRequests: 60, windowMs: 60000 }, // 60/minute
    relaxed: { maxRequests: 300, windowMs: 60000 }, // 300/minute

    // Authentication
    login: { maxRequests: 5, windowMs: 300000 }, // 5/5min
    signup: { maxRequests: 3, windowMs: 3600000 }, // 3/hour
    passwordReset: { maxRequests: 3, windowMs: 3600000 }, // 3/hour

    // Notifications
    emailSend: { maxRequests: 100, windowMs: 3600000 }, // 100/hour
    smsSend: { maxRequests: 20, windowMs: 3600000 }, // 20/hour
};

/**
 * Key generators for different scenarios
 */
export const KeyGenerators = {
    byUserId: (req: any) => `user:${req.user?.userId || 'anonymous'}`,
    byTenantId: (req: any) => `tenant:${req.user?.tenantId || 'anonymous'}`,
    byIP: (req: any) => `ip:${req.ip}`,
    byUserAndIP: (req: any) => `user:${req.user?.userId || 'anonymous'}:ip:${req.ip}`,
    byApiKey: (req: any) => `apikey:${req.headers['x-api-key'] || 'anonymous'}`,
};
