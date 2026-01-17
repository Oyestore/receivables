/**
 * Cache Service
 * 
 * Production-ready Redis-based caching layer with:
 * - TTL (Time-To-Live) management
 * - Cache invalidation strategies
 * - Cache warming
 * - Statistics tracking
 * - Distributed caching support
 */

import { Logger } from '../logging/logger';

const logger = new Logger('CacheService');

export interface ICacheOptions {
    ttl?: number; // Time-to-live in seconds (0 = no expiration)
    namespace?: string; // Cache key namespace/prefix
}

export interface ICacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    hitRate: number;
}

export class CacheService {
    private redis: any;
    private stats: ICacheStats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        hitRate: 0,
    };
    private defaultTTL: number = 3600; // 1 hour default
    private defaultNamespace: string = 'cache';

    constructor(redisClient?: any, options?: { defaultTTL?: number; defaultNamespace?: string }) {
        if (redisClient) {
            this.redis = redisClient;
            logger.info('CacheService initialized with provided Redis client');
        } else {
            // Try to create Redis client
            try {
                const Redis = require('ioredis');
                this.redis = new Redis({
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    password: process.env.REDIS_PASSWORD,
                    db: parseInt(process.env.REDIS_CACHE_DB || '1'), // Use DB 1 for cache (DB 0 for rate limiting)
                    keyPrefix: options?.defaultNamespace || this.defaultNamespace + ':',
                });

                this.redis.on('ready', () => {
                    logger.info('CacheService Redis connection established');
                });

                this.redis.on('error', (error: Error) => {
                    logger.error('CacheService Redis connection error', { error: error.message });
                });
            } catch (error) {
                logger.warn('Redis not available, caching will be disabled', { error });
                this.redis = null;
            }
        }

        if (options?.defaultTTL) {
            this.defaultTTL = options.defaultTTL;
        }

        if (options?.defaultNamespace) {
            this.defaultNamespace = options.defaultNamespace;
        }
    }

    /**
     * Get value from cache
     */
    async get<T>(key: string, options?: ICacheOptions): Promise<T | null> {
        if (!this.redis) {
            return null;
        }

        try {
            const cacheKey = this.buildKey(key, options?.namespace);
            const value = await this.redis.get(cacheKey);

            if (value !== null) {
                this.stats.hits++;
                this.updateHitRate();

                logger.debug('Cache hit', { key: cacheKey });

                return JSON.parse(value) as T;
            }

            this.stats.misses++;
            this.updateHitRate();

            logger.debug('Cache miss', { key: cacheKey });

            return null;
        } catch (error) {
            logger.error('Cache get failed', { key, error: (error as Error).message });
            return null;
        }
    }

    /**
     * Set value in cache
     */
    async set<T>(key: string, value: T, options?: ICacheOptions): Promise<boolean> {
        if (!this.redis) {
            return false;
        }

        try {
            const cacheKey = this.buildKey(key, options?.namespace);
            const serialized = JSON.stringify(value);
            const ttl = options?.ttl ?? this.defaultTTL;

            if (ttl > 0) {
                await this.redis.setex(cacheKey, ttl, serialized);
            } else {
                await this.redis.set(cacheKey, serialized);
            }

            this.stats.sets++;

            logger.debug('Cache set', { key: cacheKey, ttl });

            return true;
        } catch (error) {
            logger.error('Cache set failed', { key, error: (error as Error).message });
            return false;
        }
    }

    /**
     * Delete value from cache
     */
    async delete(key: string, options?: ICacheOptions): Promise<boolean> {
        if (!this.redis) {
            return false;
        }

        try {
            const cacheKey = this.buildKey(key, options?.namespace);
            await this.redis.del(cacheKey);

            this.stats.deletes++;

            logger.debug('Cache delete', { key: cacheKey });

            return true;
        } catch (error) {
            logger.error('Cache delete failed', { key, error: (error as Error).message });
            return false;
        }
    }

    /**
     * Check if key exists in cache
     */
    async has(key: string, options?: ICacheOptions): Promise<boolean> {
        if (!this.redis) {
            return false;
        }

        try {
            const cacheKey = this.buildKey(key, options?.namespace);
            const exists = await this.redis.exists(cacheKey);

            return exists === 1;
        } catch (error) {
            logger.error('Cache has failed', { key, error: (error as Error).message });
            return false;
        }
    }

    /**
     * Get or set (fetch if not in cache)
     */
    async getOrSet<T>(
        key: string,
        fetcher: () => Promise<T>,
        options?: ICacheOptions
    ): Promise<T> {
        const cached = await this.get<T>(key, options);

        if (cached !== null) {
            return cached;
        }

        // Fetch fresh data
        const value = await fetcher();

        // Cache it
        await this.set(key, value, options);

        return value;
    }

    /**
     * Invalidate cache by pattern
     */
    async invalidatePattern(pattern: string, options?: ICacheOptions): Promise<number> {
        if (!this.redis) {
            return 0;
        }

        try {
            const namespace = options?.namespace || this.defaultNamespace;
            const searchPattern = `${namespace}:${pattern}`;

            const keys = await this.redis.keys(searchPattern);

            if (keys.length === 0) {
                return 0;
            }

            // Remove namespace prefix from keys before deleting
            const keysToDelete = keys.map((k: string) => k.replace(`${namespace}:`, ''));
            await this.redis.del(...keysToDelete);

            logger.info('Cache invalidated by pattern', {
                pattern: searchPattern,
                count: keys.length,
            });

            return keys.length;
        } catch (error) {
            logger.error('Cache invalidate pattern failed', {
                pattern,
                error: (error as Error).message,
            });
            return 0;
        }
    }

    /**
     * Clear all cache
     */
    async clear(): Promise<boolean> {
        if (!this.redis) {
            return false;
        }

        try {
            await this.redis.flushdb();

            logger.warn('Cache cleared (all keys deleted)');

            return true;
        } catch (error) {
            logger.error('Cache clear failed', { error: (error as Error).message });
            return false;
        }
    }

    /**
     * Get TTL for a key
     */
    async getTTL(key: string, options?: ICacheOptions): Promise<number> {
        if (!this.redis) {
            return -1;
        }

        try {
            const cacheKey = this.buildKey(key, options?.namespace);
            const ttl = await this.redis.ttl(cacheKey);

            return ttl;
        } catch (error) {
            logger.error('Get TTL failed', { key, error: (error as Error).message });
            return -1;
        }
    }

    /**
     * Set TTL for existing key
     */
    async setTTL(key: string, ttl: number, options?: ICacheOptions): Promise<boolean> {
        if (!this.redis) {
            return false;
        }

        try {
            const cacheKey = this.buildKey(key, options?.namespace);
            await this.redis.expire(cacheKey, ttl);

            logger.debug('TTL updated', { key: cacheKey, ttl });

            return true;
        } catch (error) {
            logger.error('Set TTL failed', { key, error: (error as Error).message });
            return false;
        }
    }

    /**
     * Increment numeric value
     */
    async increment(key: string, amount: number = 1, options?: ICacheOptions): Promise<number> {
        if (!this.redis) {
            return 0;
        }

        try {
            const cacheKey = this.buildKey(key, options?.namespace);
            const result = await this.redis.incrby(cacheKey, amount);

            // Set TTL if specified
            if (options?.ttl) {
                await this.redis.expire(cacheKey, options.ttl);
            }

            return result;
        } catch (error) {
            logger.error('Cache increment failed', { key, error: (error as Error).message });
            return 0;
        }
    }

    /**
     * Decrement numeric value
     */
    async decrement(key: string, amount: number = 1, options?: ICacheOptions): Promise<number> {
        if (!this.redis) {
            return 0;
        }

        try {
            const cacheKey = this.buildKey(key, options?.namespace);
            const result = await this.redis.decrby(cacheKey, amount);

            return result;
        } catch (error) {
            logger.error('Cache decrement failed', { key, error: (error as Error).message });
            return 0;
        }
    }

    /**
     * Add to set
     */
    async addToSet(key: string, members: string[], options?: ICacheOptions): Promise<number> {
        if (!this.redis) {
            return 0;
        }

        try {
            const cacheKey = this.buildKey(key, options?.namespace);
            const result = await this.redis.sadd(cacheKey, ...members);

            if (options?.ttl) {
                await this.redis.expire(cacheKey, options.ttl);
            }

            return result;
        } catch (error) {
            logger.error('Add to set failed', { key, error: (error as Error).message });
            return 0;
        }
    }

    /**
     * Get set members
     */
    async getSetMembers(key: string, options?: ICacheOptions): Promise<string[]> {
        if (!this.redis) {
            return [];
        }

        try {
            const cacheKey = this.buildKey(key, options?.namespace);
            const members = await this.redis.smembers(cacheKey);

            return members;
        } catch (error) {
            logger.error('Get set members failed', { key, error: (error as Error).message });
            return [];
        }
    }

    /**
     * Remove from set
     */
    async removeFromSet(key: string, members: string[], options?: ICacheOptions): Promise<number> {
        if (!this.redis) {
            return 0;
        }

        try {
            const cacheKey = this.buildKey(key, options?.namespace);
            const result = await this.redis.srem(cacheKey, ...members);

            return result;
        } catch (error) {
            logger.error('Remove from set failed', { key, error: (error as Error).message });
            return 0;
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): ICacheStats {
        return { ...this.stats };
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            hitRate: 0,
        };

        logger.info('Cache statistics reset');
    }

    /**
     * Build cache key with namespace
     */
    private buildKey(key: string, namespace?: string): string {
        const ns = namespace || this.defaultNamespace;
        return `${ns}:${key}`;
    }

    /**
     * Update hit rate calculation
     */
    private updateHitRate(): void {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    }

    /**
     * Close Redis connection
     */
    async close(): Promise<void> {
        if (this.redis) {
            await this.redis.quit();
            logger.info('CacheService Redis connection closed');
        }
    }
}

/**
 * Cache Manager
 * High-level cache management with predefined strategies
 */
export class CacheManager {
    private cacheService: CacheService;

    constructor(cacheService: CacheService) {
        this.cacheService = cacheService;
    }

    /**
     * Cache user data (short TTL)
     */
    async cacheUser<T>(userId: string, data: T): Promise<boolean> {
        return this.cacheService.set(`user:${userId}`, data, {
            ttl: 900, // 15 minutes
            namespace: 'users',
        });
    }

    async getUser<T>(userId: string): Promise<T | null> {
        return this.cacheService.get<T>(`user:${userId}`, { namespace: 'users' });
    }

    /**
     * Cache template (long TTL, rarely changes)
     */
    async cacheTemplate<T>(templateId: string, data: T): Promise<boolean> {
        return this.cacheService.set(`template:${templateId}`, data, {
            ttl: 86400, // 24 hours
            namespace: 'templates',
        });
    }

    async getTemplate<T>(templateId: string): Promise<T | null> {
        return this.cacheService.get<T>(`template:${templateId}`, { namespace: 'templates' });
    }

    async invalidateTemplate(templateId: string): Promise<boolean> {
        return this.cacheService.delete(`template:${templateId}`, { namespace: 'templates' });
    }

    /**
     * Cache configuration (very long TTL)
     */
    async cacheConfig<T>(key: string, data: T): Promise<boolean> {
        return this.cacheService.set(`config:${key}`, data, {
            ttl: 3600 * 24 * 7, // 7 days
            namespace: 'config',
        });
    }

    async getConfig<T>(key: string): Promise<T | null> {
        return this.cacheService.get<T>(`config:${key}`, { namespace: 'config' });
    }

    /**
     * Cache session (medium TTL)
     */
    async cacheSession<T>(sessionId: string, data: T): Promise<boolean> {
        return this.cacheService.set(`session:${sessionId}`, data, {
            ttl: 3600, // 1 hour
            namespace: 'sessions',
        });
    }

    async getSession<T>(sessionId: string): Promise<T | null> {
        return this.cacheService.get<T>(`session:${sessionId}`, { namespace: 'sessions' });
    }

    async invalidateSession(sessionId: string): Promise<boolean> {
        return this.cacheService.delete(`session:${sessionId}`, { namespace: 'sessions' });
    }
}

// Export singleton instance
let cacheServiceInstance: CacheService | null = null;

export function getCacheService(): CacheService {
    if (!cacheServiceInstance) {
        cacheServiceInstance = new CacheService();
    }
    return cacheServiceInstance;
}

export function getCacheManager(): CacheManager {
    return new CacheManager(getCacheService());
}
