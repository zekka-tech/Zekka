/**
 * Performance Optimizer
 * Database query optimization, indexing strategies, and performance monitoring
 *
 * Features:
 * - Query optimization
 * - Index recommendations
 * - Slow query detection
 * - Performance metrics
 * - Database connection pooling
 * - Query result caching
 */

const { CacheManager } = require('./cache-manager');

class PerformanceOptimizer {
  constructor(config = {}) {
    this.config = {
      slowQueryThreshold: config.slowQueryThreshold || 1000, // 1 second
      enableQueryLogging: config.enableQueryLogging !== false,
      enableCaching: config.enableCaching !== false,
      cacheDefaultTtl: config.cacheDefaultTtl || 300, // 5 minutes
      ...config
    };

    if (this.config.enableCaching) {
      this.cacheManager = new CacheManager(config.cache);
    }

    this.initializeMetrics();
    this.initializeIndexRecommendations();
  }

  /**
   * Initialize performance metrics
   */
  initializeMetrics() {
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      cachedQueries: 0,
      totalQueryTime: 0,
      averageQueryTime: 0,
      queries: new Map(), // Query -> stats mapping
      slowQueryLog: []
    };
  }

  /**
   * Initialize index recommendations
   */
  initializeIndexRecommendations() {
    this.indexRecommendations = {
      users: [
        {
          column: 'email',
          type: 'unique',
          reason: 'Frequent lookups by email'
        },
        { column: 'created_at', type: 'btree', reason: 'Date range queries' }
      ],
      sessions: [
        { column: 'user_id', type: 'btree', reason: 'Join with users table' },
        { column: 'token', type: 'unique', reason: 'Token validation' },
        {
          column: 'expires_at',
          type: 'btree',
          reason: 'Cleanup expired sessions'
        }
      ],
      audit_logs: [
        { column: 'user_id', type: 'btree', reason: 'User activity queries' },
        { column: 'category', type: 'btree', reason: 'Category filtering' },
        { column: 'created_at', type: 'btree', reason: 'Time-based queries' },
        {
          column: 'user_id, created_at',
          type: 'composite',
          reason: 'User timeline queries'
        }
      ],
      password_history: [
        { column: 'user_id', type: 'btree', reason: 'User password history' },
        { column: 'created_at', type: 'btree', reason: 'History cleanup' }
      ]
    };
  }

  /**
   * Optimize database query with caching
   * @param {string} queryKey - Unique query identifier
   * @param {Function} queryFn - Query execution function
   * @param {Object} options - Optimization options
   * @returns {Promise<any>} Query result
   */
  async optimizeQuery(queryKey, queryFn, options = {}) {
    const {
      cache = this.config.enableCaching,
      ttl = this.config.cacheDefaultTtl,
      track = true
    } = options;

    const startTime = Date.now();

    try {
      let result;
      let fromCache = false;

      // Try cache first
      if (cache && this.cacheManager) {
        result = await this.cacheManager.get(queryKey);
        if (result !== null) {
          fromCache = true;
          this.metrics.cachedQueries++;
        }
      }

      // Execute query if not cached
      if (!fromCache) {
        result = await queryFn();

        // Cache result
        if (cache && this.cacheManager) {
          await this.cacheManager.set(queryKey, result, ttl);
        }
      }

      const duration = Date.now() - startTime;

      // Track metrics
      if (track) {
        this.trackQuery(queryKey, duration, fromCache);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (track) {
        this.trackQuery(queryKey, duration, false, error);
      }

      throw error;
    }
  }

  /**
   * Track query execution
   * @param {string} queryKey - Query identifier
   * @param {number} duration - Execution duration in ms
   * @param {boolean} fromCache - Whether result was from cache
   * @param {Error} error - Error if query failed
   */
  trackQuery(queryKey, duration, fromCache = false, error = null) {
    this.metrics.totalQueries++;
    this.metrics.totalQueryTime += duration;
    this.metrics.averageQueryTime = this.metrics.totalQueryTime / this.metrics.totalQueries;

    // Track per-query stats
    if (!this.metrics.queries.has(queryKey)) {
      this.metrics.queries.set(queryKey, {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        slowCount: 0,
        cacheHits: 0,
        errors: 0
      });
    }

    const queryStats = this.metrics.queries.get(queryKey);
    queryStats.count++;
    queryStats.totalTime += duration;
    queryStats.averageTime = queryStats.totalTime / queryStats.count;

    if (fromCache) {
      queryStats.cacheHits++;
    }

    if (error) {
      queryStats.errors++;
    }

    // Log slow queries
    if (duration >= this.config.slowQueryThreshold) {
      this.metrics.slowQueries++;
      queryStats.slowCount++;

      const slowQueryEntry = {
        query: queryKey,
        duration,
        timestamp: new Date().toISOString(),
        fromCache,
        error: error ? error.message : null
      };

      this.metrics.slowQueryLog.push(slowQueryEntry);

      // Keep only last 100 slow queries
      if (this.metrics.slowQueryLog.length > 100) {
        this.metrics.slowQueryLog.shift();
      }

      if (this.config.enableQueryLogging) {
        console.warn(
          '[PerformanceOptimizer] Slow query detected:',
          slowQueryEntry
        );
      }
    }
  }

  /**
   * Get query statistics
   * @returns {Object} Query statistics
   */
  getQueryStats() {
    const topSlowQueries = Array.from(this.metrics.queries.entries())
      .map(([query, stats]) => ({ query, ...stats }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);

    return {
      total: this.metrics.totalQueries,
      slow: this.metrics.slowQueries,
      cached: this.metrics.cachedQueries,
      averageTime: Math.round(this.metrics.averageQueryTime),
      cacheHitRate:
        this.metrics.totalQueries > 0
          ? `${((this.metrics.cachedQueries / this.metrics.totalQueries) * 100).toFixed(2)}%`
          : '0%',
      topSlowQueries,
      recentSlowQueries: this.metrics.slowQueryLog.slice(-10)
    };
  }

  /**
   * Get index recommendations for a table
   * @param {string} tableName - Table name
   * @returns {Array} Index recommendations
   */
  getIndexRecommendations(tableName) {
    return this.indexRecommendations[tableName] || [];
  }

  /**
   * Get all index recommendations
   * @returns {Object} All index recommendations
   */
  getAllIndexRecommendations() {
    return this.indexRecommendations;
  }

  /**
   * Generate SQL for creating recommended indexes
   * @param {string} tableName - Table name
   * @returns {Array<string>} SQL statements
   */
  generateIndexSQL(tableName) {
    const recommendations = this.getIndexRecommendations(tableName);
    const sqlStatements = [];

    recommendations.forEach((rec, index) => {
      const indexName = `idx_${tableName}_${rec.column.replace(/,\s*/g, '_').replace(/\s+/g, '_')}`;

      let sql;
      if (rec.type === 'unique') {
        sql = `CREATE UNIQUE INDEX ${indexName} ON ${tableName}(${rec.column});`;
      } else if (rec.type === 'composite') {
        sql = `CREATE INDEX ${indexName} ON ${tableName}(${rec.column});`;
      } else {
        sql = `CREATE INDEX ${indexName} ON ${tableName}(${rec.column}) USING ${rec.type.toUpperCase()};`;
      }

      sqlStatements.push({
        sql,
        reason: rec.reason
      });
    });

    return sqlStatements;
  }

  /**
   * Generate SQL for all recommended indexes
   * @returns {Array<string>} SQL statements
   */
  generateAllIndexSQL() {
    const allSQL = [];

    Object.keys(this.indexRecommendations).forEach((tableName) => {
      const tableSQL = this.generateIndexSQL(tableName);
      allSQL.push({
        table: tableName,
        indexes: tableSQL
      });
    });

    return allSQL;
  }

  /**
   * Analyze query performance and suggest optimizations
   * @param {string} queryKey - Query identifier
   * @returns {Object} Performance analysis
   */
  analyzeQuery(queryKey) {
    const stats = this.metrics.queries.get(queryKey);

    if (!stats) {
      return {
        status: 'unknown',
        message: 'No data available for this query'
      };
    }

    const analysis = {
      query: queryKey,
      stats,
      status: 'good',
      recommendations: []
    };

    // Analyze average time
    if (stats.averageTime > this.config.slowQueryThreshold) {
      analysis.status = 'needs_optimization';
      analysis.recommendations.push({
        type: 'performance',
        message:
          'Query is consistently slow. Consider adding indexes or optimizing the query.'
      });
    }

    // Analyze cache effectiveness
    const cacheHitRate = stats.count > 0 ? (stats.cacheHits / stats.count) * 100 : 0;

    if (cacheHitRate < 50 && stats.count > 10) {
      analysis.recommendations.push({
        type: 'caching',
        message: `Low cache hit rate (${cacheHitRate.toFixed(2)}%). Consider adjusting cache TTL or query patterns.`
      });
    }

    // Analyze error rate
    const errorRate = stats.count > 0 ? (stats.errors / stats.count) * 100 : 0;

    if (errorRate > 5) {
      analysis.status = 'problematic';
      analysis.recommendations.push({
        type: 'reliability',
        message: `High error rate (${errorRate.toFixed(2)}%). Investigate query failures.`
      });
    }

    return analysis;
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      queries: this.getQueryStats(),
      cache: this.cacheManager ? this.cacheManager.getStats() : null
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.initializeMetrics();
  }

  /**
   * Close connections and cleanup
   */
  async close() {
    if (this.cacheManager) {
      await this.cacheManager.close();
    }
  }
}

module.exports = { PerformanceOptimizer };
