/**
 * Redis Configuration and Cache Management
 * ========================================
 *
 * Comprehensive Redis setup for:
 * - Session management
 * - Rate limiting
 * - Caching layer
 * - Context bus (project state, agent coordination)
 * - File locking mechanism
 * - Token budget tracking
 * - Message queues
 */

const { createClient } = require('redis');
const config = require('./index.js');

// Cache key patterns for different data types
const CACHE_KEYS = {
  PROJECT: (projectId) => `${config.redis.keyPrefix || 'zekka:'}project:${projectId}`,
  PROJECT_STATE: (projectId) => `${config.redis.keyPrefix || 'zekka:'}project:${projectId}:state`,
  PROJECT_STATUS: (projectId) => `${config.redis.keyPrefix || 'zekka:'}project:${projectId}:status`,
  PROJECT_AGENTS: (projectId) => `${config.redis.keyPrefix || 'zekka:'}project:${projectId}:agents`,
  PROJECT_CONFLICTS: (projectId) => `${config.redis.keyPrefix || 'zekka:'}project:${projectId}:conflicts`,
  PROJECT_LOCKS: (projectId, filePath) => `${config.redis.keyPrefix || 'zekka:'}project:${projectId}:lock:${filePath}`,

  AGENT: (agentId) => `${config.redis.keyPrefix || 'zekka:'}agent:${agentId}`,
  AGENT_STATUS: (agentId) => `${config.redis.keyPrefix || 'zekka:'}agent:${agentId}:status`,
  AGENT_OUTPUT: (agentId, outputId) => `${config.redis.keyPrefix || 'zekka:'}agent:${agentId}:output:${outputId}`,

  USER: (userId) => `${config.redis.keyPrefix || 'zekka:'}user:${userId}`,
  USER_SESSION: (userId, sessionId) => `${config.redis.keyPrefix || 'zekka:'}user:${userId}:session:${sessionId}`,

  CONVERSATION: (conversationId) => `${config.redis.keyPrefix || 'zekka:'}conversation:${conversationId}`,
  MESSAGE: (messageId) => `${config.redis.keyPrefix || 'zekka:'}message:${messageId}`,

  TASK: (taskId) => `${config.redis.keyPrefix || 'zekka:'}task:${taskId}`,
  TASK_QUEUE: (queue) => `${config.redis.keyPrefix || 'zekka:'}queue:${queue}`,

  REVIEW_PENDING: () => `${config.redis.keyPrefix || 'zekka:'}claude:review:pending`,
  OUTPUT_STATUS: (outputId) => `${config.redis.keyPrefix || 'zekka:'}output:${outputId}:status`,

  METRICS: (metricType) => `${config.redis.keyPrefix || 'zekka:'}metrics:${metricType}`,
  RATE_LIMIT: (identifier) => `${config.redis.keyPrefix || 'zekka:'}ratelimit:${identifier}`,

  BUDGET: (period) => `${config.redis.keyPrefix || 'zekka:'}budget:${period}`,
  TOKEN_USAGE: (model, date) => `${config.redis.keyPrefix || 'zekka:'}tokens:${model}:${date}`,

  CACHE: (key) => `${config.redis.keyPrefix || 'zekka:'}cache:${key}`,
  TEMP: (key) => `${config.redis.keyPrefix || 'zekka:'}temp:${key}`
};

// TTL configurations (in seconds)
const TTL = {
  SHORT: 300,           // 5 minutes
  MEDIUM: 1800,         // 30 minutes
  LONG: 3600,           // 1 hour
  DAILY: 86400,         // 24 hours
  WEEKLY: 604800,       // 7 days
  SESSION: 7200,        // 2 hours
  LOCK: 300,            // 5 minutes
  TEMP: 60,             // 1 minute
  RATE_LIMIT: 900       // 15 minutes
};

// Create Redis client
const redis = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
    connectTimeout: 5000,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Redis max retries exceeded');
        return new Error('Redis connection failed');
      }
      // Exponential backoff: 50ms, 100ms, 200ms, etc.
      return Math.min(retries * 50, 3000);
    }
  },
  password: config.redis.password || undefined,
  database: 0,
  // Client name for debugging
  name: 'zekka-framework'
});

// Error handling
redis.on('error', (err) => {
  console.error('❌ Redis client error:', err);
});

redis.on('connect', () => {
  console.log('✅ Redis client connecting...');
});

redis.on('ready', () => {
  console.log('✅ Redis client connected and ready');
});

redis.on('reconnecting', () => {
  console.log('⚠️  Redis client reconnecting...');
});

redis.on('end', () => {
  console.log('⚠️  Redis client connection closed');
});

/**
 * Initialize Redis connection
 */
async function connectRedis() {
  try {
    await redis.connect();
    console.log('✅ Redis connection established');
    return redis;
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    throw error;
  }
}

/**
 * Health check
 */
async function healthCheck() {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('❌ Redis health check failed:', error);
    return false;
  }
}

/**
 * Get Redis stats
 */
async function getStats() {
  try {
    const info = await redis.info('stats');
    return info;
  } catch (error) {
    console.error('❌ Failed to get Redis stats:', error);
    return null;
  }
}

/**
 * Close Redis connection
 */
async function closeRedis() {
  try {
    await redis.quit();
    console.log('✅ Redis connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing Redis connection:', error);
    await redis.disconnect();
  }
}

/**
 * Cache helper methods
 */
const cache = {
  /**
   * Set cache with TTL
   */
  async set(key, value, ttl = TTL.MEDIUM) {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      await redis.setEx(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error(`❌ Error setting cache key ${key}:`, error);
      return false;
    }
  },

  /**
   * Get cache value
   */
  async get(key, parseJson = true) {
    try {
      const value = await redis.get(key);
      if (!value) return null;
      return parseJson ? JSON.parse(value) : value;
    } catch (error) {
      if (error instanceof SyntaxError) {
        return await redis.get(key);
      }
      console.error(`❌ Error getting cache key ${key}:`, error);
      return null;
    }
  },

  /**
   * Delete cache key
   */
  async del(key) {
    try {
      return await redis.del(key);
    } catch (error) {
      console.error(`❌ Error deleting cache key ${key}:`, error);
      return 0;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      return await redis.exists(key);
    } catch (error) {
      console.error(`❌ Error checking cache key ${key}:`, error);
      return 0;
    }
  },

  /**
   * List operations - push to list
   */
  async lpush(key, ...values) {
    try {
      const serialized = values.map(v => typeof v === 'string' ? v : JSON.stringify(v));
      return await redis.lPush(key, serialized);
    } catch (error) {
      console.error(`❌ Error pushing to list ${key}:`, error);
      return null;
    }
  },

  /**
   * List operations - get range
   */
  async lrange(key, start = 0, stop = -1, parseJson = true) {
    try {
      const values = await redis.lRange(key, start, stop);
      if (!parseJson) return values;
      return values.map(v => {
        try {
          return JSON.parse(v);
        } catch {
          return v;
        }
      });
    } catch (error) {
      console.error(`❌ Error getting list range ${key}:`, error);
      return [];
    }
  },

  /**
   * Set operations - add to set
   */
  async sadd(key, ...members) {
    try {
      return await redis.sAdd(key, members);
    } catch (error) {
      console.error(`❌ Error adding to set ${key}:`, error);
      return null;
    }
  },

  /**
   * Set operations - get all members
   */
  async smembers(key) {
    try {
      return await redis.sMembers(key);
    } catch (error) {
      console.error(`❌ Error getting set members ${key}:`, error);
      return [];
    }
  },

  /**
   * Increment counter
   */
  async incr(key, ttl = null) {
    try {
      const value = await redis.incr(key);
      if (ttl && value === 1) {
        await redis.expire(key, ttl);
      }
      return value;
    } catch (error) {
      console.error(`❌ Error incrementing key ${key}:`, error);
      return null;
    }
  },

  /**
   * Clear cache by pattern
   */
  async clearByPattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
        return keys.length;
      }
      return 0;
    } catch (error) {
      console.error(`❌ Error clearing cache by pattern ${pattern}:`, error);
      return 0;
    }
  }
};

// Auto-connect on module load unless in test environment
if (process.env.NODE_ENV !== 'test') {
  connectRedis().catch(console.error);
}

module.exports = redis;
module.exports.connectRedis = connectRedis;
module.exports.closeRedis = closeRedis;
module.exports.healthCheck = healthCheck;
module.exports.getStats = getStats;
module.exports.CACHE_KEYS = CACHE_KEYS;
