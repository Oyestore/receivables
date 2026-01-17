/**
 * Cache Middleware
 * 
 * Express/NestJS middleware for HTTP response caching with:
 * - Conditional caching based on status codes
 * - Cache headers (Cache-Control, ETag)
 * - Query parameter-based cache keys
 * - Per-route TTL configuration
 */

import { Request, Response, NextFunction } from 'express';
import { getCacheService } from './cache.service';
import { Logger } from '../logging/logger';
import crypto from 'crypto';

const logger = new Logger('CacheMiddleware');

export interface ICacheMiddlewareOptions {
    ttl?: number; // Time-to-live in seconds
    namespace?: string;
    keyGenerator?: (req: Request) => string;
    condition?: (req: Request, res: Response) => boolean;
    statusCodes?: number[]; // Cache only these status codes (default: [200])
    excludePaths?: string[]; // Paths to exclude from caching
    varyBy?: string[]; // Headers to vary cache by (e.g., ['Accept', 'Accept-Language'])
}

/**
 * HTTP Response Cache Middleware
 */
export function cacheMiddleware(options: ICacheMiddlewareOptions = {}) {
    const cacheService = getCacheService();
    const ttl = options.ttl || 300; // 5 minutes default
    const namespace = options.namespace || 'http';
    const statusCodes = options.statusCodes || [200];
    const excludePaths = options.excludePaths || [];

    return async (req: Request, res: Response, next: NextFunction) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Check excluded paths
        if (excludePaths.some(path => req.path.startsWith(path))) {
            return next();
        }

        // Generate cache key
        const cacheKey = options.keyGenerator
            ? options.keyGenerator(req)
            : generateDefaultCacheKey(req, options.varyBy);

        try {
            // Try to get cached response
            const cached = await cacheService.get<{
                body: any;
                headers: Record<string, string>;
                statusCode: number;
            }>(cacheKey, { namespace });

            if (cached) {
                // Serve from cache
                logger.debug('HTTP cache hit', { path: req.path, key: cacheKey });

                // Set cache headers
                res.set('X-Cache', 'HIT');
                res.set('X-Cache-Key', cacheKey);

                // Restore cached headers
                Object.entries(cached.headers).forEach(([key, value]) => {
                    res.set(key, value);
                });

                return res.status(cached.statusCode).json(cached.body);
            }

            // Cache miss - capture response
            logger.debug('HTTP cache miss', { path: req.path, key: cacheKey });

            // Store original methods
            const originalJson = res.json.bind(res);
            const originalSend = res.send.bind(res);

            // Override json method
            res.json = function (body: any) {
                // Check if should cache
                if (shouldCache(req, res, options, statusCodes)) {
                    // Cache the response
                    const headersToCache: Record<string, string> = {};

                    // Copy relevant headers
                    ['content-type', 'content-encoding'].forEach(header => {
                        const value = res.get(header);
                        if (value) {
                            headersToCache[header] = value;
                        }
                    });

                    cacheService.set(
                        cacheKey,
                        {
                            body,
                            headers: headersToCache,
                            statusCode: res.statusCode,
                        },
                        { ttl, namespace }
                    );

                    logger.debug('HTTP response cached', {
                        path: req.path,
                        key: cacheKey,
                        statusCode: res.statusCode,
                    });
                }

                // Set cache headers
                res.set('X-Cache', 'MISS');
                res.set('X-Cache-Key', cacheKey);
                res.set('Cache-Control', `public, max-age=${ttl}`);

                return originalJson(body);
            };

            // Override send method (for non-JSON responses)
            res.send = function (body: any) {
                if (shouldCache(req, res, options, statusCodes)) {
                    const headersToCache: Record<string, string> = {};
                    ['content-type'].forEach(header => {
                        const value = res.get(header);
                        if (value) {
                            headersToCache[header] = value;
                        }
                    });

                    cacheService.set(
                        cacheKey,
                        { body, headers: headersToCache, statusCode: res.statusCode },
                        { ttl, namespace }
                    );
                }

                res.set('X-Cache', 'MISS');
                res.set('Cache-Control', `public, max-age=${ttl}`);

                return originalSend(body);
            };

            next();
        } catch (error) {
            logger.error('Cache middleware error', {
                error: (error as Error).message,
                path: req.path,
            });
            next();
        }
    };
}

/**
 * Generate default cache key from request
 */
function generateDefaultCacheKey(req: Request, varyBy?: string[]): string {
    const parts: string[] = [req.path];

    // Add query parameters
    if (Object.keys(req.query).length > 0) {
        parts.push(JSON.stringify(req.query));
    }

    // Add vary-by headers
    if (varyBy && varyBy.length > 0) {
        const headerValues = varyBy.map(header => req.get(header) || '').join(':');
        parts.push(headerValues);
    }

    const keyString = parts.join(':');

    // Hash the key to keep it short
    return crypto.createHash('md5').update(keyString).digest('hex');
}

/**
 * Check if response should be cached
 */
function shouldCache(
    req: Request,
    res: Response,
    options: ICacheMiddlewareOptions,
    statusCodes: number[]
): boolean {
    // Check status code
    if (!statusCodes.includes(res.statusCode)) {
        return false;
    }

    // Check custom condition
    if (options.condition && !options.condition(req, res)) {
        return false;
    }

    return true;
}

/**
 * Cache invalidation middleware
 * Invalidates cache after successful mutations
 */
export function cacheInvalidationMiddleware(options: {
    namespace?: string;
    pattern?: string;
    onMethods?: string[]; // Methods to trigger invalidation (default: POST, PUT, PATCH, DELETE)
}) {
    const cacheService = getCacheService();
    const methods = options.onMethods || ['POST', 'PUT', 'PATCH', 'DELETE'];

    return async (req: Request, res: Response, next: NextFunction) => {
        // Only invalidate on mutation methods
        if (!methods.includes(req.method)) {
            return next();
        }

        // Store original send
        const originalSend = res.send.bind(res);

        res.send = function (body: any) {
            // Only invalidate on successful responses (2xx)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const pattern = options.pattern || '*';

                cacheService.invalidatePattern(pattern, {
                    namespace: options.namespace,
                });

                logger.debug('Cache invalidated by middleware', {
                    method: req.method,
                    path: req.path,
                    pattern,
                });
            }

            return originalSend(body);
        };

        next();
    };
}

/**
 * ETag middleware (conditional caching)
 */
export function etagMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
        const originalJson = res.json.bind(res);

        res.json = function (body: any) {
            // Generate ETag from response body
            const etag = crypto
                .createHash('md5')
                .update(JSON.stringify(body))
                .digest('hex');

            res.set('ETag', `"${etag}"`);

            // Check If-None-Match header
            const clientEtag = req.get('If-None-Match');

            if (clientEtag === `"${etag}"`) {
                return res.status(304).end();
            }

            return originalJson(body);
        };

        next();
    };
}

/**
 * Example usage:
 * 
 * // Cache all GET requests for 5 minutes
 * app.use(cacheMiddleware({ ttl: 300 }));
 * 
 * // Cache specific route with custom TTL
 * app.get('/api/users', cacheMiddleware({ ttl: 600 }), getUsersHandler);
 * 
 * // Invalidate cache after mutations
 * app.use('/api', cacheInvalidationMiddleware({ namespace: 'http', pattern: '*' }));
 * 
 * // Use ETags for conditional requests
 * app.use(etagMiddleware());
 */
