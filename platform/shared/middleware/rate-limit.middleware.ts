import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../services/cache.service';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
    constructor(private readonly cacheService: CacheService) { }

    async use(req: Request, res: Response, next: NextFunction) {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const key = `rate_limit:${ip}`;

        // Get current request count
        const currentCount = await this.cacheService.get<number>(key);

        // Rate limit: 100 requests per minute
        const limit = 100;
        const windowSeconds = 60;

        if (currentCount === null) {
            // First request in window
            await this.cacheService.setWithExpiry(key, 1, windowSeconds);
            next();
        } else if (currentCount < limit) {
            // Increment counter
            await this.cacheService.increment(key);
            next();
        } else {
            // Rate limit exceeded
            throw new HttpException(
                {
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                    message: 'Rate limit exceeded. Please try again later.',
                    retryAfter: await this.cacheService.getTTL(key),
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
    }
}
