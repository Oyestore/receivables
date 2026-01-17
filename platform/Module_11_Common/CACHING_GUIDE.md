# Caching Infrastructure Guide

## Overview

Module 11's caching infrastructure provides a production-ready, Redis-based caching layer with:

- **Distributed Caching**: Works across multiple instances
- **Multiple Strategies**: Method-level, HTTP response, and manual caching
- **Automatic Invalidation**: Smart cache invalidation on data changes
- **Statistics Tracking**: Monitor cache hit rates and performance
- **Cache Warming**: Pre-populate cache for better performance
- **Decorators**: Easy integration with TypeScript decorators

---

## Components

### 1. CacheService (`cache.service.ts`)

Core caching service with low-level Redis operations.

**Features:**
- Get/Set/Delete operations
- TTL (Time-To-Live) management
- Pattern-based invalidation
- Increment/Decrement counters
- Set operations (add, remove, get members)
- Cache statistics (hits, misses, hit rate)

**Basic Usage:**

```typescript
import { getCacheService } from './utils/cache.service';

const cache = getCacheService();

// Set value with 1 hour TTL
await cache.set('user:123', userData, { ttl: 3600 });

// Get value
const user = await cache.get('user:123');

// Delete value
await cache.delete('user:123');

// Get or set (fetch if not cached)
const user = await cache.getOrSet('user:123', async () => {
  return await userRepository.findOne('123');
}, { ttl: 3600 });

// Invalidate by pattern
await cache.invalidatePattern('user:*');

// Get statistics
const stats = cache.getStats();
console.log(`Hit rate: ${stats.hitRate}%`);
```

---

### 2. CacheManager (`cache.service.ts`)

High-level cache manager with predefined strategies for common use cases.

**Usage:**

```typescript
import { getCacheManager } from './utils/cache.service';

const cacheManager = getCacheManager();

// Cache user (15 min TTL)
await cacheManager.cacheUser('user-123', userData);
const user = await cacheManager.getUser('user-123');

// Cache template (24 hour TTL)
await cacheManager.cacheTemplate('template-456', templateData);
const template = await cacheManager.getTemplate('template-456');

// Cache config (7 day TTL)
await cacheManager.cacheConfig('app-settings', configData);
const config = await cacheManager.getConfig('app-settings');

// Cache session (1 hour TTL)
await cacheManager.cacheSession('session-789', sessionData);
const session = await cacheManager.getSession('session-789');
await cacheManager.invalidateSession('session-789');
```

---

### 3. Cache Decorators (`cache.decorators.ts`)

TypeScript decorators for method-level caching.

**@Cacheable** - Cache method results:

```typescript
import { Cacheable, cacheKeyById } from './utils/cache.decorators';

class UserService {
  @Cacheable({ 
    ttl: 900,  // 15 minutes
    namespace: 'users',
    keyGenerator: cacheKeyById('userId')
  })
  async getUser(userId: string) {
    return await this.userRepository.findOne(userId);
  }
}
```

**@CacheEvict** - Invalidate cache after method:

```typescript
import { CacheEvict } from './utils/cache.decorators';

class UserService {
  @CacheEvict({
    namespace: 'users',
    key: (userId) => `userId:${userId}`
  })
  async updateUser(userId: string, data: any) {
    return await this.userRepository.update(userId, data);
  }

  // Clear all user cache
  @CacheEvict({
    namespace: 'users',
    allEntries: true
  })
  async bulkUpdateUsers(updates: any[]) {
    return await this.userRepository.bulkUpdate(updates);
  }
}
```

**@CachePut** - Always execute and update cache:

```typescript
import { CachePut } from './utils/cache.decorators';

class UserService {
  @CachePut({
    ttl: 900,
    namespace: 'users',
    key: (userId) => `userId:${userId}`
  })
  async refreshUser(userId: string) {
    return await this.userRepository.findOne(userId);
  }
}
```

---

### 4. Cache Middleware (`cache.middleware.ts`)

HTTP response caching for Express/NestJS applications.

**HTTP Response Caching:**

```typescript
import { cacheMiddleware } from './middleware/cache.middleware';

// Cache all GET requests for 5 minutes
app.use(cacheMiddleware({ ttl: 300 }));

// Cache specific route with custom TTL
app.get('/api/users', 
  cacheMiddleware({ 
    ttl: 600,  // 10 minutes
    namespace: 'api-users'
  }), 
  getUsersHandler
);

// Cache with custom condition
app.get('/api/products',
  cacheMiddleware({
    ttl: 1800,
    condition: (req, res) => {
      // Only cache if not requesting real-time data
      return !req.query.realtime;
    }
  }),
  getProductsHandler
);

// Vary cache by Accept-Language header
app.get('/api/content',
  cacheMiddleware({
    ttl: 3600,
    varyBy: ['Accept-Language']
  }),
  getContentHandler
);
```

**Cache Invalidation Middleware:**

```typescript
import { cacheInvalidationMiddleware } from './middleware/cache.middleware';

// Invalidate cache after mutations
app.use('/api/users', 
  cacheInvalidationMiddleware({ 
    namespace: 'api-users',
    pattern: '*'
  })
);
```

**ETag Middleware:**

```typescript
import { etagMiddleware } from './middleware/cache.middleware';

// Enable conditional requests with ETags
app.use(etagMiddleware());
```

---

### 5. Cache Warming (`cache.decorators.ts`)

Pre-populate cache for better performance.

**Usage:**

```typescript
import { CacheWarmer } from './utils/cache.decorators';

const warmer = new CacheWarmer();

// Warm single cache entry
await warmer.warm(
  'popular-products',
  async () => await productService.getPopularProducts(),
  { ttl: 3600, namespace: 'products' }
);

// Warm multiple entries
await warmer.warmBatch([
  {
    key: 'user:stats',
    fetcher: async () => await statsService.getUserStats(),
    options: { ttl: 600, namespace: 'stats' }
  },
  {
    key: 'dashboard:metrics',
    fetcher: async () => await metricsService.getDashboard(),
    options: { ttl: 300, namespace: 'dashboard' }
  }
]);

// Schedule periodic warming (every 30 minutes)
const warmingInterval = warmer.scheduleWarming(
  30 * 60 * 1000,  // 30 minutes
  async () => {
    await warmer.warm('popular-products', fetchPopularProducts);
    await warmer.warm('trending-items', fetchTrendingItems);
  }
);

// Stop warming
clearInterval(warmingInterval);
```

---

### 6. Cache Invalidation Strategies

Smart cache invalidation for related entities.

**Usage:**

```typescript
import { CacheInvalidationStrategy } from './utils/cache.decorators';

const strategy = new CacheInvalidationStrategy();

// Invalidate by entity
await strategy.invalidateEntity('user', 'user-123');
await strategy.invalidateEntity('user'); // All users

// Cascade invalidation (invalidate related entities)
await strategy.cascadeInvalidate('invoice:123', [
  'customer:456',
  'payments:invoice:123',
  'analytics:customer:456'
]);

// Invalidate by tags
await strategy.invalidateByTags(['featured', 'homepage']);
```

---

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_CACHE_DB=1  # Separate DB for cache (0 for rate limiting)

# Cache Settings
CACHE_DEFAULT_TTL=3600  # 1 hour
CACHE_ENABLED=true
```

### Redis Setup

```typescript
// Custom Redis client
import Redis from 'ioredis';
import { CacheService } from './utils/cache.service';

const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 1,
  keyPrefix: 'myapp:cache:',
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  }
});

const cacheService = new CacheService(redisClient, {
  defaultTTL: 3600,
  defaultNamespace: 'myapp'
});
```

---

## Best Practices

### 1. Choose Appropriate TTL

```typescript
// Short TTL for frequently changing data
@Cacheable({ ttl: 60 })  // 1 minute
async getCurrentPrice() { ... }

// Medium TTL for moderately static data
@Cacheable({ ttl: 900 })  // 15 minutes
async getUserProfile() { ... }

// Long TTL for rarely changing data
@Cacheable({ ttl: 86400 })  // 24 hours
async getCountryList() { ... }

// No expiration for static data
@Cacheable({ ttl: 0 })
async getAppConstants() { ... }
```

### 2. Use Namespaces

```typescript
// Organize cache by feature/module
const userCache = { namespace: 'users' };
const productCache = { namespace: 'products' };
const analyticsCache = { namespace: 'analytics' };

// Easy invalidation by namespace
await cache.invalidatePattern('*', { namespace: 'users' });
```

### 3. Invalidate Proactively

```typescript
class ProductService {
  @CacheEvict({ namespace: 'products', key: (id) => `product:${id}` })
  async updateProduct(id: string, data: any) {
    return await this.productRepo.update(id, data);
  }

  // Also invalidate related caches
  async updateProductPrice(id: string, newPrice: number) {
    const result = await this.productRepo.updatePrice(id, newPrice);
    
    // Invalidate product cache
    await cache.delete(`product:${id}`, { namespace: 'products' });
    
    // Invalidate listings that include this product
    await cache.invalidatePattern('product-list:*', { namespace: 'products' });
    
    return result;
  }
}
```

### 4. Monitor Cache Performance

```typescript
// Get cache statistics
const stats = cacheService.getStats();

console.log(`
  Cache Performance:
  - Hits: ${stats.hits}
  - Misses: ${stats.misses}
  - Hit Rate: ${stats.hitRate.toFixed(2)}%
  - Sets: ${stats.sets}
  - Deletes: ${stats.deletes}
`);

// Reset stats periodically
setInterval(() => {
  const stats = cacheService.getStats();
  logger.info('Cache stats', stats);
  cacheService.resetStats();
}, 3600000);  // Every hour
```

---

## Common Patterns

### Pattern 1: Cache-Aside

```typescript
async function getUser(userId: string) {
  // Check cache first
  let user = await cache.get(`user:${userId}`);
  
  if (!user) {
    // Fetch from database
    user = await userRepo.findOne(userId);
    
    // Store in cache
    await cache.set(`user:${userId}`, user, { ttl: 900 });
  }
  
  return user;
}
```

### Pattern 2: Write-Through

```typescript
async function updateUser(userId: string, data: any) {
  // Update database
  const updated = await userRepo.update(userId, data);
  
  // Update cache immediately
  await cache.set(`user:${userId}`, updated, { ttl: 900 });
  
  return updated;
}
```

### Pattern 3: Refresh-Ahead

```typescript
async function getPopularProducts() {
  return await cache.getOrSet(
    'popular-products',
    async () => {
      const products = await productRepo.getPopular();
      
      // Schedule refresh before expiration
      setTimeout(async () => {
        await cache.set('popular-products', 
          await productRepo.getPopular(),
          { ttl: 3600 }
        );
      }, 3000 * 1000); // Refresh after 50 minutes (TTL is 1 hour)
      
      return products;
    },
    { ttl: 3600 }
  );
}
```

---

## Performance Tips

1. **Use compression for large objects**
2. **Batch operations when possible**
3. **Set appropriate TTLs** (don't cache forever)
4. **Monitor memory usage**
5. **Use cache warming for critical data**
6. **Implement circuit breakers for cache failures**

---

**Module 11 Caching Infrastructure - Production Ready** ✅
