/**
 * Cache Decorators
 * 
 * Decorators for easy caching of method results with:
 * - Method-level caching
 * - Automatic key generation
 * - TTL configuration
 * - Cache invalidation
 */

import { getCacheService } from './cache.service';
import { Logger } from '../logging/logger';

const logger = new Logger('CacheDecorators');

/**
 * Cache decorator options
 */
export interface ICacheableOptions {
    ttl?: number;
    namespace?: string;
    keyGenerator?: (...args: any[]) => string;
    condition?: (...args: any[]) => boolean;
}

/**
 * @Cacheable decorator
 * Caches method return value
 * 
 * Usage:
 * @Cacheable({ ttl: 3600, namespace: 'users' })
 * async getUser(userId: string) { ... }
 */
export function Cacheable(options: ICacheableOptions = {}) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            // Check condition if provided
            if (options.condition && !options.condition(...args)) {
                return originalMethod.apply(this, args);
            }

            const cacheService = getCacheService();

            // Generate cache key
            const cacheKey = options.keyGenerator
                ? options.keyGenerator(...args)
                : `${propertyKey}:${JSON.stringify(args)}`;

            // Try to get from cache
            const cached = await cacheService.get(cacheKey, {
                namespace: options.namespace,
            });

            if (cached !== null) {
                logger.debug('Cache hit for method', {
                    method: propertyKey,
                    key: cacheKey,
                });
                return cached;
            }

            // Execute original method
            const result = await originalMethod.apply(this, args);

            // Cache the result
            await cacheService.set(cacheKey, result, {
                ttl: options.ttl,
                namespace: options.namespace,
            });

            logger.debug('Cache miss, result cached', {
                method: propertyKey,
                key: cacheKey,
            });

            return result;
        };

        return descriptor;
    };
}

/**
 * @CacheEvict decorator
 * Invalidates cache after method execution
 * 
 * Usage:
 * @CacheEvict({ namespace: 'users', key: (userId) => `user:${userId}` })
 * async updateUser(userId: string, data: any) { ... }
 */
export function CacheEvict(options: {
    namespace?: string;
    key?: (...args: any[]) => string;
    allEntries?: boolean;
}) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            // Execute original method first
            const result = await originalMethod.apply(this, args);

            const cacheService = getCacheService();

            if (options.allEntries) {
                // Clear all entries in namespace
                await cacheService.invalidatePattern('*', {
                    namespace: options.namespace,
                });

                logger.debug('Cache evicted (all entries)', {
                    method: propertyKey,
                    namespace: options.namespace,
                });
            } else if (options.key) {
                // Invalidate specific key
                const cacheKey = options.key(...args);
                await cacheService.delete(cacheKey, {
                    namespace: options.namespace,
                });

                logger.debug('Cache evicted (specific key)', {
                    method: propertyKey,
                    key: cacheKey,
                });
            }

            return result;
        };

        return descriptor;
    };
}

/**
 * @CachePut decorator
 * Always executes method and updates cache
 * 
 * Usage:
 * @CachePut({ ttl: 3600, namespace: 'users', key: (userId) => `user:${userId}` })
 * async refreshUser(userId: string) { ... }
 */
export function CachePut(options: {
    ttl?: number;
    namespace?: string;
    key?: (...args: any[]) => string;
}) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            // Always execute original method
            const result = await originalMethod.apply(this, args);

            const cacheService = getCacheService();

            // Generate cache key
            const cacheKey = options.key
                ? options.key(...args)
                : `${propertyKey}:${JSON.stringify(args)}`;

            // Update cache with fresh data
            await cacheService.set(cacheKey, result, {
                ttl: options.ttl,
                namespace: options.namespace,
            });

            logger.debug('Cache updated', {
                method: propertyKey,
                key: cacheKey,
            });

            return result;
        };

        return descriptor;
    };
}

/**
 * Helper: Generate cache key from object ID
 */
export function cacheKeyById(idField: string = 'id') {
    return (...args: any[]) => {
        const id = args[0]; // First argument is usually the ID
        return `${idField}:${id}`;
    };
}

/**
 * Helper: Generate cache key from multiple arguments
 */
export function cacheKeyByArgs(...argNames: string[]) {
    return (...args: any[]) => {
        const keyParts = argNames.map((name, index) => `${name}:${args[index]}`);
        return keyParts.join(':');
    };
}

/**
 * Cache warming utility
 */
export class CacheWarmer {
    private cacheService = getCacheService();

    /**
     * Warm cache with data
     */
    async warm<T>(
        key: string,
        fetcher: () => Promise<T>,
        options?: { ttl?: number; namespace?: string }
    ): Promise<T> {
        logger.info('Warming cache', { key, namespace: options?.namespace });

        const data = await fetcher();
        await this.cacheService.set(key, data, options);

        return data;
    }

    /**
     * Warm multiple cache entries
     */
    async warmBatch<T>(
        entries: Array<{
            key: string;
            fetcher: () => Promise<T>;
            options?: { ttl?: number; namespace?: string };
        }>
    ): Promise<void> {
        logger.info('Warming cache (batch)', { count: entries.length });

        await Promise.all(
            entries.map(entry => this.warm(entry.key, entry.fetcher, entry.options))
        );

        logger.info('Cache warming complete', { count: entries.length });
    }

    /**
     * Schedule periodic cache warming
     */
    scheduleWarming(
        intervalMs: number,
        warmer: () => Promise<void>
    ): NodeJS.Timeout {
        logger.info('Scheduling cache warming', { intervalMs });

        return setInterval(async () => {
            try {
                await warmer();
            } catch (error) {
                logger.error('Cache warming failed', { error: (error as Error).message });
            }
        }, intervalMs);
    }
}

/**
 * Cache invalidation strategies
 */
export class CacheInvalidationStrategy {
    private cacheService = getCacheService();

    /**
     * Invalidate by tags
     */
    async invalidateByTags(tags: string[], namespace?: string): Promise<void> {
        logger.info('Invalidating cache by tags', { tags, namespace });

        for (const tag of tags) {
            await this.cacheService.invalidatePattern(`*:tag:${tag}:*`, { namespace });
        }
    }

    /**
     * Invalidate by entity type
     */
    async invalidateEntity(entityType: string, entityId?: string): Promise<void> {
        const pattern = entityId
            ? `${entityType}:${entityId}*`
            : `${entityType}:*`;

        logger.info('Invalidating entity cache', { entityType, entityId, pattern });

        await this.cacheService.invalidatePattern(pattern);
    }

    /**
     * Invalidate by time window
     */
    async invalidateOlderThan(ageSeconds: number, namespace?: string): Promise<void> {
        // This would require storing timestamps with each cache entry
        // For now, log a warning
        logger.warn('Time-based invalidation not yet implemented', {
            ageSeconds,
            namespace,
        });

        // Alternative: just clear all cache in namespace
        await this.cacheService.invalidatePattern('*', { namespace });
    }

    /**
     * Cascade invalidation (invalidate related entities)
     */
    async cascadeInvalidate(
        rootEntity: string,
        relatedEntities: string[]
    ): Promise<void> {
        logger.info('Cascade cache invalidation', {
            rootEntity,
            relatedCount: relatedEntities.length,
        });

        // Invalidate root entity
        await this.invalidateEntity(rootEntity);

        // Invalidate related entities
        for (const related of relatedEntities) {
            await this.invalidateEntity(related);
        }
    }
}

/**
 * Example usage:
 * 
 * class UserService {
 *   @Cacheable({ 
 *     ttl: 900, 
 *     namespace: 'users',
 *     keyGenerator: cacheKeyById('userId')
 *   })
 *   async getUser(userId: string) {
 *     return await this.userRepository.findOne(userId);
 *   }
 * 
 *   @CacheEvict({
 *     namespace: 'users',
 *     key: (userId) => `userId:${userId}`
 *   })
 *   async updateUser(userId: string, data: any) {
 *     return await this.userRepository.update(userId, data);
 *   }
 * 
 *   @CachePut({
 *     ttl: 900,
 *     namespace: 'users',
 *     key: (userId) => `userId:${userId}`
 *   })
 *   async refreshUser(userId: string) {
 *     return await this.userRepository.findOne(userId);
 *   }
 * }
 */
