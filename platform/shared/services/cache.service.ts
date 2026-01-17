import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

interface CacheOptions {
    ttl?: number; // Time to live in seconds
    namespace?: string;
}

@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name);
    private readonly redis: Redis;
    private readonly defaultTTL = 3600; // 1 hour

    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0'),
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        this.redis.on('connect', () => {
            this.logger.log('Redis connected successfully');
        });

        this.redis.on('error', (error) => {
            this.logger.error(`Redis connection error: ${error.message}`);
        });
    }

    /**
     * Get value from cache
     */
    async get<T>(key: string, namespace?: string): Promise<T | null> {
        try {
            const fullKey = this.buildKey(key, namespace);
            const value = await this.redis.get(fullKey);

            if (!value) {
                return null;
            }

            return JSON.parse(value) as T;
        } catch (error) {
            this.logger.error(`Cache GET error for key ${key}: ${error.message}`);
            return null;
        }
    }

    /**
     * Set value in cache
     */
    async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
        try {
            const fullKey = this.buildKey(key, options?.namespace);
            const ttl = options?.ttl || this.defaultTTL;
            const serialized = JSON.stringify(value);

            await this.redis.setex(fullKey, ttl, serialized);
            this.logger.debug(`Cached key: ${fullKey} (TTL: ${ttl}s)`);
        } catch (error) {
            this.logger.error(`Cache SET error for key ${key}: ${error.message}`);
        }
    }

    /**
     * Delete value from cache
     */
    async del(key: string, namespace?: string): Promise<void> {
        try {
            const fullKey = this.buildKey(key, namespace);
            await this.redis.del(fullKey);
            this.logger.debug(`Deleted cache key: ${fullKey}`);
        } catch (error) {
            this.logger.error(`Cache DEL error for key ${key}: ${error.message}`);
        }
    }

    /**
     * Check if key exists
     */
    async exists(key: string, namespace?: string): Promise<boolean> {
        try {
            const fullKey = this.buildKey(key, namespace);
            const result = await this.redis.exists(fullKey);
            return result === 1;
        } catch (error) {
            this.logger.error(`Cache EXISTS error for key ${key}: ${error.message}`);
            return false;
        }
    }

    /**
     * Get or set pattern - fetch from cache or compute and cache
     */
    async getOrSet<T>(
        key: string,
        factory: () => Promise<T>,
        options?: CacheOptions,
    ): Promise<T> {
        // Try to get from cache first
        const cached = await this.get<T>(key, options?.namespace);
        if (cached !== null) {
            this.logger.debug(`Cache HIT: ${key}`);
            return cached;
        }

        // Cache miss - compute value
        this.logger.debug(`Cache MISS: ${key}`);
        const value = await factory();

        // Store in cache for next time
        await this.set(key, value, options);

        return value;
    }

    /**
     * Invalidate pattern - delete all keys matching pattern
     */
    async invalidatePattern(pattern: string, namespace?: string): Promise<number> {
        try {
            const fullPattern = this.buildKey(pattern, namespace);
            const keys = await this.redis.keys(fullPattern);

            if (keys.length === 0) {
                return 0;
            }

            const result = await this.redis.del(...keys);
            this.logger.log(`Invalidated ${result} keys matching pattern: ${fullPattern}`);
            return result;
        } catch (error) {
            this.logger.error(`Cache pattern invalidation error: ${error.message}`);
            return 0;
        }
    }

    /**
     * Increment counter
     */
    async increment(key: string, namespace?: string): Promise<number> {
        try {
            const fullKey = this.buildKey(key, namespace);
            return await this.redis.incr(fullKey);
        } catch (error) {
            this.logger.error(`Cache INCR error for key ${key}: ${error.message}`);
            return 0;
        }
    }

    /**
     * Set with expiration
     */
    async setWithExpiry(key: string, value: any, seconds: number, namespace?: string): Promise<void> {
        await this.set(key, value, { ttl: seconds, namespace });
    }

    /**
     * Get TTL (time to live) for a key
     */
    async getTTL(key: string, namespace?: string): Promise<number> {
        try {
            const fullKey = this.buildKey(key, namespace);
            return await this.redis.ttl(fullKey);
        } catch (error) {
            this.logger.error(`Cache TTL error for key ${key}: ${error.message}`);
            return -1;
        }
    }

    /**
     * Clear all cache (use with caution!)
     */
    async clearAll(): Promise<void> {
        try {
            await this.redis.flushdb();
            this.logger.warn('All cache cleared');
        } catch (error) {
            this.logger.error(`Cache clear error: ${error.message}`);
        }
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<{
        connected: boolean;
        dbSize: number;
        usedMemory: string;
        hits: number;
        misses: number;
    }> {
        try {
            const info = await this.redis.info('stats');
            const dbSize = await this.redis.dbsize();

            // Parse info string
            const stats: any = {};
            info.split('\r\n').forEach((line) => {
                const [key, value] = line.split(':');
                if (key && value) {
                    stats[key] = value;
                }
            });

            return {
                connected: this.redis.status === 'ready',
                dbSize,
                usedMemory: stats.used_memory_human || 'N/A',
                hits: parseInt(stats.keyspace_hits || '0'),
                misses: parseInt(stats.keyspace_misses || '0'),
            };
        } catch (error) {
            this.logger.error(`Cache stats error: ${error.message}`);
            return {
                connected: false,
                dbSize: 0,
                usedMemory: 'N/A',
                hits: 0,
                misses: 0,
            };
        }
    }

    /**
     * Build full key with namespace
     */
    private buildKey(key: string, namespace?: string): string {
        const prefix = 'sme_platform';
        if (namespace) {
            return `${prefix}:${namespace}:${key}`;
        }
        return `${prefix}:${key}`;
    }

    /**
     * Close Redis connection
     */
    async onModuleDestroy() {
        await this.redis.quit();
        this.logger.log('Redis connection closed');
    }
}
