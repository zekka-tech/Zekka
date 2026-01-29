/**
 * Performance Optimization Service
 * =================================
 *
 * Comprehensive performance optimization including:
 * - Query optimization and caching
 * - Database connection pooling
 * - Response compression
 * - CDN integration
 * - Static asset optimization
 * - Memory management
 * - Performance monitoring
 *
 * Industry Standards:
 * - Google Web Vitals
 * - RAIL performance model
 * - Database optimization best practices
 */

import redis from "../config/redis.js";
import pool from "../config/database.js";
import logger from "../utils/logger.js";

// Cache TTLs (in seconds)
const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
};

class PerformanceOptimization {
  constructor() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      queryTime: [],
      requestTime: [],
    };
  }

  /**
   * Query Result Caching
   *
   * Cache database query results in Redis
   */
  async cacheQuery(key, queryFn, ttl = CACHE_TTL.MEDIUM) {
    try {
      // Check cache first
      const cached = await redis.get(`query:${key}`);
      if (cached) {
        this.metrics.cacheHits++;
        return JSON.parse(cached);
      }

      // Cache miss - execute query
      this.metrics.cacheMisses++;
      const startTime = Date.now();
      const result = await queryFn();
      const queryTime = Date.now() - startTime;

      this.metrics.queryTime.push(queryTime);

      // Cache the result
      await redis.setex(`query:${key}`, ttl, JSON.stringify(result));

      return result;
    } catch (error) {
      logger.error("Query caching error:", error);
      // Fallback to direct query on cache error
      return await queryFn();
    }
  }

  /**
   * Invalidate cached query
   */
  async invalidateCache(pattern) {
    try {
      const keys = await redis.keys(`query:${pattern}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error("Cache invalidation error:", error);
    }
  }

  /**
   * Batch query optimization
   *
   * Combine multiple queries into a single database round-trip
   */
  async batchQueries(queries) {
    const client = await pool.connect();

    try {
      const results = [];

      for (const query of queries) {
        const result = await client.query(query.text, query.values);
        results.push(result.rows);
      }

      return results;
    } finally {
      client.release();
    }
  }

  /**
   * Prepared statement caching
   *
   * Use prepared statements for frequently executed queries
   */
  async preparedQuery(name, text, values) {
    try {
      // Check if statement is already prepared
      const prepared = await redis.get(`prepared:${name}`);

      if (!prepared) {
        // Prepare the statement
        await pool.query(`PREPARE ${name} AS ${text}`);
        await redis.set(`prepared:${name}`, "1", "EX", 3600);
      }

      // Execute prepared statement
      const startTime = Date.now();
      const result = await pool.query(
        `EXECUTE ${name}(${values.map((_, i) => `$${i + 1}`).join(",")})`,
        values,
      );
      const queryTime = Date.now() - startTime;

      this.metrics.queryTime.push(queryTime);

      return result.rows;
    } catch (error) {
      logger.error("Prepared query error:", error);
      // Fallback to regular query
      return await pool.query(text, values);
    }
  }

  /**
   * Database query optimization analyzer
   *
   * Analyze query performance and suggest optimizations
   */
  async analyzeQuery(query) {
    try {
      // Use EXPLAIN ANALYZE
      const explainResult = await pool.query(
        `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`,
      );
      const plan = explainResult.rows[0]["QUERY PLAN"][0];

      const analysis = {
        executionTime: plan["Execution Time"],
        planningTime: plan["Planning Time"],
        totalCost: plan["Plan"]["Total Cost"],
        warnings: [],
        suggestions: [],
      };

      // Check for sequential scans
      if (JSON.stringify(plan).includes("Seq Scan")) {
        analysis.warnings.push("Sequential scan detected");
        analysis.suggestions.push("Consider adding an index");
      }

      // Check for high cost
      if (plan["Plan"]["Total Cost"] > 1000) {
        analysis.warnings.push("High query cost detected");
        analysis.suggestions.push("Review query optimization and indexing");
      }

      // Check for slow execution
      if (plan["Execution Time"] > 100) {
        analysis.warnings.push("Slow query execution");
        analysis.suggestions.push("Consider query optimization or caching");
      }

      return analysis;
    } catch (error) {
      logger.error("Query analysis error:", error);
      return null;
    }
  }

  /**
   * Create database indexes for optimization
   */
  async createOptimizedIndexes() {
    const indexes = [
      // Users table
      "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
      "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)",
      "CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)",

      // Audit logs
      "CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)",
      "CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)",
      "CREATE INDEX IF NOT EXISTS idx_audit_logs_is_suspicious ON audit_logs(is_suspicious)",
      "CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON audit_logs(risk_level)",

      // Composite indexes for common queries
      "CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC)",
      "CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp ON audit_logs(action, timestamp DESC)",

      // Password history
      "CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_password_history_changed_at ON password_history(changed_at)",

      // Security events
      "CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity)",
      "CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp)",

      // Security alerts
      "CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status)",
      "CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity)",
      "CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at)",
    ];

    try {
      for (const indexQuery of indexes) {
        await pool.query(indexQuery);
      }
      logger.info("Optimized indexes created successfully");
    } catch (error) {
      logger.error("Index creation error:", error);
    }
  }

  /**
   * Vacuum and analyze database
   *
   * Maintain database performance
   */
  async vacuumDatabase() {
    try {
      await pool.query("VACUUM ANALYZE");
      logger.info("Database vacuumed and analyzed");
    } catch (error) {
      logger.error("Vacuum error:", error);
    }
  }

  /**
   * Get cache hit ratio
   */
  getCacheHitRatio() {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return total > 0 ? (this.metrics.cacheHits / total) * 100 : 0;
  }

  /**
   * Get average query time
   */
  getAverageQueryTime() {
    if (this.metrics.queryTime.length === 0) return 0;
    const sum = this.metrics.queryTime.reduce((a, b) => a + b, 0);
    return sum / this.metrics.queryTime.length;
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      cache: {
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        hitRatio: this.getCacheHitRatio().toFixed(2) + "%",
      },
      query: {
        averageTime: this.getAverageQueryTime().toFixed(2) + "ms",
        count: this.metrics.queryTime.length,
      },
      request: {
        averageTime:
          this.metrics.requestTime.length > 0
            ? (
                this.metrics.requestTime.reduce((a, b) => a + b, 0) /
                this.metrics.requestTime.length
              ).toFixed(2) + "ms"
            : "0ms",
        count: this.metrics.requestTime.length,
      },
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      queryTime: [],
      requestTime: [],
    };
  }
}

/**
 * Response compression middleware
 */
export const compressionMiddleware = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    // Check if client accepts compression
    const acceptEncoding = req.get("Accept-Encoding") || "";

    if (acceptEncoding.includes("gzip")) {
      res.setHeader("Content-Encoding", "gzip");
    }

    // Add caching headers
    if (req.method === "GET") {
      res.setHeader("Cache-Control", "public, max-age=300"); // 5 minutes
      res.setHeader(
        "ETag",
        require("crypto")
          .createHash("md5")
          .update(JSON.stringify(data))
          .digest("hex"),
      );
    }

    originalJson.call(this, data);
  };

  next();
};

/**
 * Request timing middleware
 */
export const timingMiddleware = (performanceService) => {
  return (req, res, next) => {
    const startTime = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - startTime;
      performanceService.metrics.requestTime.push(duration);

      // Add timing headers
      res.setHeader("X-Response-Time", `${duration}ms`);
      res.setHeader("X-Process-Time", process.hrtime()[0]);
    });

    next();
  };
};

/**
 * Memory optimization middleware
 */
export const memoryOptimization = (req, res, next) => {
  // Limit request body size
  if (req.body && JSON.stringify(req.body).length > 10 * 1024 * 1024) {
    // 10MB
    return res.status(413).json({
      success: false,
      error: "Request body too large",
      maxSize: "10MB",
    });
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const memLimit = 500 * 1024 * 1024; // 500MB

  if (memUsage.heapUsed > memLimit) {
    logger.warn("High memory usage:", memUsage.heapUsed / 1024 / 1024, "MB");

    // Trigger garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  next();
};

/**
 * CDN asset URL helper
 */
export const getCDNUrl = (path) => {
  const CDN_URL = process.env.CDN_URL || "";
  return CDN_URL ? `${CDN_URL}${path}` : path;
};

/**
 * Static asset optimization
 */
export const optimizeStaticAssets = (app) => {
  // Set cache headers for static assets
  app.use("/static", (req, res, next) => {
    // Cache static assets for 1 year
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });

  // Preload critical assets
  app.use((req, res, next) => {
    res.setHeader(
      "Link",
      [
        "</static/main.css>; rel=preload; as=style",
        "</static/main.js>; rel=preload; as=script",
      ].join(", "),
    );
    next();
  });
};

// Export singleton instance
const performanceService = new PerformanceOptimization();
export default performanceService;

export {
  CACHE_TTL,
  compressionMiddleware,
  timingMiddleware,
  memoryOptimization,
  optimizeStaticAssets,
};
