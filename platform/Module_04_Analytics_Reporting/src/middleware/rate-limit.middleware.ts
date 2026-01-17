import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private readonly redis: Redis;
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6380,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    this.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes
    this.maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = this.getClientId(req);
      const key = this.getRateLimitKey(clientId, req);

      const currentRequests = await this.getCurrentRequests(key);
      
      if (currentRequests >= this.maxRequests) {
        const ttl = await this.redis.ttl(key);
        this.logger.warn(`Rate limit exceeded for ${clientId}: ${currentRequests}/${this.maxRequests}`);
        
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            details: {
              limit: this.maxRequests,
              windowMs: this.windowMs,
              retryAfter: ttl,
            },
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Increment the counter
      await this.redis.incr(key);
      await this.redis.expire(key, Math.ceil(this.windowMs / 1000));

      // Add rate limit headers
      const remaining = this.maxRequests - (currentRequests + 1);
      res.set({
        'X-RateLimit-Limit': this.maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(Date.now() + this.windowMs).toISOString(),
      });

      this.logger.debug(`Rate limit check: ${clientId} - ${currentRequests + 1}/${this.maxRequests}`);
      next();
    } catch (error) {
      this.logger.error(`Rate limit middleware error: ${error.message}`);
      // Continue without rate limiting if Redis is down
      next();
    }
  }

  private getClientId(req: Request): string {
    // Try to get API key first
    const apiKey = req['apiKey'];
    if (apiKey) {
      return `api_key:${apiKey.substring(0, 8)}`;
    }

    // Fall back to IP address
    const forwarded = req.headers['x-forwarded-for'] as string;
    const ip = forwarded ? forwarded.split(',')[0] : req.ip || req.connection.remoteAddress;
    return `ip:${ip}`;
  }

  private getRateLimitKey(clientId: string, req: Request): string {
    const windowStart = Math.floor(Date.now() / this.windowMs) * this.windowMs;
    const endpoint = req.route?.path || req.path;
    return `rate_limit:${clientId}:${endpoint}:${windowStart}`;
  }

  private async getCurrentRequests(key: string): Promise<number> {
    try {
      const count = await this.redis.get(key);
      return count ? parseInt(count) : 0;
    } catch (error) {
      this.logger.error(`Error getting current requests: ${error.message}`);
      return 0;
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
