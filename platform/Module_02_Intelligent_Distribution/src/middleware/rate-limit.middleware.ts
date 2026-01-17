import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

interface RateLimitInfo {
  count: number;
  resetTime: number;
  lastRequest: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly rateLimitMap = new Map<string, RateLimitInfo>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(private readonly configService: ConfigService) {
    this.windowMs = this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000); // 15 minutes
    this.maxRequests = this.configService.get<number>('RATE_LIMIT_MAX_REQUESTS', 100);
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const clientId = this.getClientId(req);
    const now = Date.now();

    // Clean up expired entries
    this.cleanupExpiredEntries(now);

    // Get current rate limit info for client
    let rateLimitInfo = this.rateLimitMap.get(clientId);
    
    if (!rateLimitInfo || now > rateLimitInfo.resetTime) {
      // Initialize or reset rate limit info
      rateLimitInfo = {
        count: 1,
        resetTime: now + this.windowMs,
        lastRequest: now,
      };
      this.rateLimitMap.set(clientId, rateLimitInfo);
    } else {
      // Increment request count
      rateLimitInfo.count++;
      rateLimitInfo.lastRequest = now;
      this.rateLimitMap.set(clientId, rateLimitInfo);
    }

    // Set rate limit headers
    this.setRateLimitHeaders(res, rateLimitInfo);

    // Check if rate limit exceeded
    if (rateLimitInfo.count > this.maxRequests) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests',
          retryAfter: Math.ceil((rateLimitInfo.resetTime - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }

  private getClientId(req: Request): string {
    // Try to get API key first
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      return `api:${apiKey}`;
    }

    // Fall back to IP address
    const forwarded = req.headers['x-forwarded-for'] as string;
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
    return `ip:${ip}`;
  }

  private setRateLimitHeaders(res: Response, rateLimitInfo: RateLimitInfo): void {
    const now = Date.now();
    const remaining = Math.max(0, this.maxRequests - rateLimitInfo.count);
    const resetTime = Math.ceil((rateLimitInfo.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', this.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);
  }

  private cleanupExpiredEntries(now: number): void {
    for (const [clientId, rateLimitInfo] of this.rateLimitMap.entries()) {
      if (now > rateLimitInfo.resetTime) {
        this.rateLimitMap.delete(clientId);
      }
    }
  }

  // Utility method to get current rate limit status
  getRateLimitStatus(clientId: string): RateLimitInfo | null {
    const now = Date.now();
    const rateLimitInfo = this.rateLimitMap.get(clientId);
    
    if (!rateLimitInfo || now > rateLimitInfo.resetTime) {
      return null;
    }

    return {
      ...rateLimitInfo,
      remaining: Math.max(0, this.maxRequests - rateLimitInfo.count),
    };
  }

  // Utility method to reset rate limit for a client
  resetRateLimit(clientId: string): void {
    this.rateLimitMap.delete(clientId);
  }

  // Utility method to get statistics
  getStatistics(): {
    totalClients: number;
    activeClients: number;
    averageRequestsPerWindow: number;
  } {
    const now = Date.now();
    const activeClients = Array.from(this.rateLimitMap.values()).filter(
      info => now <= info.resetTime,
    );

    const totalRequests = activeClients.reduce((sum, info) => sum + info.count, 0);
    const averageRequests = activeClients.length > 0 ? totalRequests / activeClients.length : 0;

    return {
      totalClients: this.rateLimitMap.size,
      activeClients: activeClients.length,
      averageRequestsPerWindow: Math.round(averageRequests),
    };
  }
}
