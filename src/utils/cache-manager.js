/**
 * Advanced Cache Manager
 * Multi-tier caching with Redis and in-memory fallback
 *
 * Features:
 * - Redis primary cache
 * - In-memory LRU fallback cache
 * - Cache warming and preloading
 * - TTL management
 * - Cache invalidation strategies
 * - Cache statistics and monitoring
 * - Automatic cache regeneration
 */

const Redis = require('ioredis');
const { LRUCache } = require('lru-cache');

class CacheManager {
  constructor(config = {}) {
    this.config = {
      redis: {
        host: config.redisHost || process.env.REDIS_HOST || 'localhost',
        port: config.redisPort || process.env.REDIS_PORT || 6379,
        password: config.redisPassword || process.env.REDIS_PASSWORD,
        db: config.redisDb || 0,
        keyPrefix: config.keyPrefix || 'zekka:cache:',
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      },
      memory: {
        max: config.memoryMax || 500,
        ttl: config.memoryTtl || 1000 * 60 * 5, // 5 minutes
        updateAgeOnGet: true
      },
      defaultTtl: config.defaultTtl || 300, // 5 minutes
      enableStats: config.enableStats !== false
    };

    this.initializeRedis();
    this.initializeMemoryCache();
    this.initializeStats();
  }

  /**
   * Initialize Redis connection
   */
  initializeRedis() {
    try {
      this.redis = new Redis(this.config.redis);
      this.redisAvailable = true;

      this.redis.on('error', (error) => {
        console.error('[CacheManager] Redis error:', error.message);
        this.redisAvailable = false;
      });

      this.redis.on('connect', () => {
        console.log('[CacheManager] Redis connected');
        this.redisAvailable = true;
      });

      this.redis.on('ready', () => {
        console.log('[CacheManager] Redis ready');
        this.redisAvailable = true;
      });
    } catch (error) {
      console.error(
        '[CacheManager] Failed to initialize Redis:',
        error.message
      );
      this.redis = null;
      this.redisAvailable = false;
    }
  }

  /**
   * Initialize in-memory LRU cache
   */
  initializeMemoryCache() {
    this.memoryCache = new LRUCache(this.config.memory);
  }

  /**
   * Initialize cache statistics
   */
  initializeStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      redis: {
        hits: 0,
        misses: 0,
        errors: 0
      },
      memory: {
        hits: 0,
        misses: 0
      }
    };
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    try {
      // Try Redis first
      if (this.redisAvailable && this.redis) {
        try {
          const value = await this.redis.get(key);

          if (value !== null) {
            this.incrementStat('hits');
            this.incrementStat('redis.hits');

            // Parse JSON if possible
            try {
              return JSON.parse(value);
            } catch {
              return value;
            }
          }
        } catch (error) {
          console.error('[CacheManager] Redis get error:', error.message);
          this.incrementStat('redis.errors');
        }
      }

      // Fallback to memory cache
      const memoryValue = this.memoryCache.get(key);
      if (memoryValue !== undefined) {
        this.incrementStat('hits');
        this.incrementStat('memory.hits');
        return memoryValue;
      }

      // Cache miss
      this.incrementStat('misses');
      return null;
    } catch (error) {
      console.error('[CacheManager] Get error:', error.message);
      this.incrementStat('errors');
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = null) {
    try {
      const effectiveTtl = ttl || this.config.defaultTtl;
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

      // Set in Redis
      if (this.redisAvailable && this.redis) {
        try {
          await this.redis.setex(key, effectiveTtl, stringValue);
        } catch (error) {
          console.error('[CacheManager] Redis set error:', error.message);
          this.incrementStat('redis.errors');
        }
      }

      // Set in memory cache
      this.memoryCache.set(key, value, {
        ttl: effectiveTtl * 1000 // Convert to milliseconds
      });

      this.incrementStat('sets');
      return true;
    } catch (error) {
      console.error('[CacheManager] Set error:', error.message);
      this.incrementStat('errors');
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async delete(key) {
    try {
      // Delete from Redis
      if (this.redisAvailable && this.redis) {
        try {
          await this.redis.del(key);
        } catch (error) {
          console.error('[CacheManager] Redis delete error:', error.message);
          this.incrementStat('redis.errors');
        }
      }

      // Delete from memory cache
      this.memoryCache.delete(key);

      this.incrementStat('deletes');
      return true;
    } catch (error) {
      console.error('[CacheManager] Delete error:', error.message);
      this.incrementStat('errors');
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   * @param {string} pattern - Key pattern (supports wildcards)
   * @returns {Promise<number>} Number of keys deleted
   */
  async deletePattern(pattern) {
    try {
      let deletedCount = 0;

      // Delete from Redis
      if (this.redisAvailable && this.redis) {
        try {
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            deletedCount = await this.redis.del(...keys);
          }
        } catch (error) {
          console.error(
            '[CacheManager] Redis deletePattern error:',
            error.message
          );
          this.incrementStat('redis.errors');
        }
      }

      // Delete from memory cache (simple pattern matching)
      const memoryKeys = Array.from(this.memoryCache.keys());
      const regex = new RegExp(pattern.replace('*', '.*'));

      memoryKeys.forEach((key) => {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
          deletedCount++;
        }
      });

      return deletedCount;
    } catch (error) {
      console.error('[CacheManager] DeletePattern error:', error.message);
      this.incrementStat('errors');
      return 0;
    }
  }

  /**
   * Get or set value (cache-aside pattern)
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch value if not cached
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<any>} Cached or fetched value
   */
  async getOrSet(key, fetchFn, ttl = null) {
    try {
      // Try to get from cache
      const cachedValue = await this.get(key);
      if (cachedValue !== null) {
        return cachedValue;
      }

      // Fetch fresh value
      const freshValue = await fetchFn();

      // Store in cache
      await this.set(key, freshValue, ttl);

      return freshValue;
    } catch (error) {
      console.error('[CacheManager] GetOrSet error:', error.message);
      this.incrementStat('errors');

      // Try to return cached value even if expired
      try {
        return await this.get(key);
      } catch {
        throw error;
      }
    }
  }

  /**
   * Increment stat counter
   * @param {string} statPath - Stat path (e.g., 'hits' or 'redis.hits')
   */
  incrementStat(statPath) {
    if (!this.config.enableStats) return;

    const parts = statPath.split('.');
    let current = this.stats;

    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]]++;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0
      ? ((this.stats.hits / totalRequests) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      totalRequests,
      memorySize: this.memoryCache.size,
      memorySizeBytes: this.memoryCache.calculatedSize
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.initializeStats();
  }

  /**
   * Clear all caches
   * @returns {Promise<boolean>} Success status
   */
  async clear() {
    try {
      // Clear Redis
      if (this.redisAvailable && this.redis) {
        try {
          await this.redis.flushdb();
        } catch (error) {
          console.error('[CacheManager] Redis clear error:', error.message);
          this.incrementStat('redis.errors');
        }
      }

      // Clear memory cache
      this.memoryCache.clear();

      return true;
    } catch (error) {
      console.error('[CacheManager] Clear error:', error.message);
      this.incrementStat('errors');
      return false;
    }
  }

  /**
   * Warm up cache with preloaded data
   * @param {Array} entries - Array of {key, value, ttl} objects
   * @returns {Promise<number>} Number of entries loaded
   */
  async warmUp(entries) {
    let loadedCount = 0;

    for (const entry of entries) {
      try {
        await this.set(entry.key, entry.value, entry.ttl);
        loadedCount++;
      } catch (error) {
        console.error(
          `[CacheManager] Warmup error for key ${entry.key}:`,
          error.message
        );
      }
    }

    console.log(
      `[CacheManager] Cache warmed up with ${loadedCount}/${entries.length} entries`
    );
    return loadedCount;
  }

  /**
   * Check if cache is healthy
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      redis: {
        available: this.redisAvailable,
        status: 'unknown'
      },
      memory: {
        size: this.memoryCache.size,
        maxSize: this.config.memory.max
      }
    };

    // Test Redis connection
    if (this.redis) {
      try {
        await this.redis.ping();
        health.redis.status = 'connected';
      } catch (error) {
        health.redis.status = 'error';
        health.redis.error = error.message;
        health.status = 'degraded';
      }
    } else {
      health.redis.status = 'not_initialized';
      health.status = 'degraded';
    }

    return health;
  }

  /**
   * Close connections
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
    }
    this.memoryCache.clear();
  }
}

module.exports = { CacheManager };
