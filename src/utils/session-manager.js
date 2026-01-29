/**
 * Advanced Session Management System
 *
 * Features:
 * - Redis-backed session storage
 * - Session fixation prevention
 * - Concurrent session management
 * - Device fingerprinting
 * - Session activity tracking
 * - Automatic session cleanup
 * - Geographic tracking (optional)
 */

const session = require('express-session');
const RedisStore = require('connect-redis').default;
const crypto = require('crypto');

class SessionManager {
  constructor(redisClient, options = {}) {
    this.redisClient = redisClient;
    this.options = {
      // Session configuration
      sessionMaxAge: options.sessionMaxAge || 24 * 60 * 60 * 1000, // 24 hours
      sessionName: options.sessionName || 'zekka.sid',
      sessionSecret: options.sessionSecret || process.env.SESSION_SECRET,

      // Security options
      secureCookie: options.secureCookie !== false, // HTTPS only by default
      httpOnly: options.httpOnly !== false, // Prevent XSS
      sameSite: options.sameSite || 'strict',

      // Session limits
      maxConcurrentSessions: options.maxConcurrentSessions || 5,
      maxIdleTime: options.maxIdleTime || 30 * 60 * 1000, // 30 minutes

      // Activity tracking
      trackActivity: options.trackActivity !== false,
      trackLocation: options.trackLocation || false,
      trackDevice: options.trackDevice !== false,

      // Advanced features
      rollingSession: options.rollingSession !== false,
      resaveUnmodified: options.resaveUnmodified || false,
      saveUninitialized: options.saveUninitialized || false,

      ...options
    };

    if (!this.options.sessionSecret) {
      throw new Error('SESSION_SECRET is required');
    }

    this.store = this.createStore();
    this.middleware = this.createMiddleware();
  }

  /**
   * Create Redis store
   */
  createStore() {
    return new RedisStore({
      client: this.redisClient,
      prefix: 'sess:',
      ttl: this.options.sessionMaxAge / 1000, // Convert to seconds
      disableTouch: false // Enable session refresh on activity
    });
  }

  /**
   * Create session middleware
   */
  createMiddleware() {
    return session({
      store: this.store,
      name: this.options.sessionName,
      secret: this.options.sessionSecret,
      resave: this.options.resaveUnmodified,
      saveUninitialized: this.options.saveUninitialized,
      rolling: this.options.rollingSession,
      cookie: {
        secure: this.options.secureCookie,
        httpOnly: this.options.httpOnly,
        sameSite: this.options.sameSite,
        maxAge: this.options.sessionMaxAge,
        path: '/'
      }
    });
  }

  /**
   * Initialize session for user
   */
  async initializeSession(req, userId, metadata = {}) {
    // Generate new session ID to prevent fixation
    await this.regenerateSession(req);

    // Store user info
    req.session.userId = userId;
    req.session.createdAt = Date.now();
    req.session.lastActivity = Date.now();

    // Device fingerprint
    if (this.options.trackDevice) {
      req.session.deviceFingerprint = this.generateDeviceFingerprint(req);
    }

    // IP address
    req.session.ipAddress = req.ip || req.connection.remoteAddress;

    // User agent
    req.session.userAgent = req.get('user-agent');

    // Additional metadata
    req.session.metadata = metadata;

    // Track this session for the user
    await this.trackUserSession(userId, req.sessionID);

    return req.session;
  }

  /**
   * Regenerate session ID (prevent fixation)
   */
  regenerateSession(req) {
    return new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Generate device fingerprint
   */
  generateDeviceFingerprint(req) {
    const userAgent = req.get('user-agent') || '';
    const acceptLanguage = req.get('accept-language') || '';
    const acceptEncoding = req.get('accept-encoding') || '';

    const fingerprint = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
    return crypto.createHash('sha256').update(fingerprint).digest('hex');
  }

  /**
   * Verify device fingerprint
   */
  verifyDeviceFingerprint(req) {
    if (!this.options.trackDevice || !req.session.deviceFingerprint) {
      return true;
    }

    const currentFingerprint = this.generateDeviceFingerprint(req);
    return currentFingerprint === req.session.deviceFingerprint;
  }

  /**
   * Track user session
   */
  async trackUserSession(userId, sessionId) {
    const key = `user:${userId}:sessions`;
    const sessionData = {
      sessionId,
      createdAt: Date.now()
    };

    // Add to user's session list
    await this.redisClient.hSet(key, sessionId, JSON.stringify(sessionData));

    // Enforce concurrent session limit
    await this.enforceConcurrentSessionLimit(userId);
  }

  /**
   * Enforce concurrent session limit
   */
  async enforceConcurrentSessionLimit(userId) {
    const key = `user:${userId}:sessions`;
    const sessions = await this.redisClient.hGetAll(key);

    if (Object.keys(sessions).length > this.options.maxConcurrentSessions) {
      // Sort by creation time
      const sessionArray = Object.entries(sessions)
        .map(([sessionId, data]) => ({
          sessionId,
          ...JSON.parse(data)
        }))
        .sort((a, b) => a.createdAt - b.createdAt);

      // Remove oldest sessions
      const toRemove = sessionArray.slice(
        0,
        sessionArray.length - this.options.maxConcurrentSessions
      );

      for (const session of toRemove) {
        await this.destroySession(session.sessionId);
        await this.redisClient.hDel(key, session.sessionId);
      }
    }
  }

  /**
   * Update session activity
   */
  async updateActivity(req) {
    if (!this.options.trackActivity || !req.session) {
      return;
    }

    req.session.lastActivity = Date.now();

    // Store activity log
    if (req.session.userId) {
      const activityKey = `user:${req.session.userId}:activity`;
      const activity = {
        timestamp: Date.now(),
        path: req.path,
        method: req.method,
        ip: req.ip,
        sessionId: req.sessionID
      };

      await this.redisClient.lPush(activityKey, JSON.stringify(activity));
      await this.redisClient.lTrim(activityKey, 0, 99); // Keep last 100 activities
      await this.redisClient.expire(activityKey, 7 * 24 * 60 * 60); // 7 days
    }
  }

  /**
   * Check if session is idle
   */
  isSessionIdle(req) {
    if (!req.session || !req.session.lastActivity) {
      return false;
    }

    const idleTime = Date.now() - req.session.lastActivity;
    return idleTime > this.options.maxIdleTime;
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId) {
    const key = `user:${userId}:sessions`;
    const sessions = await this.redisClient.hGetAll(key);

    const sessionArray = [];
    for (const [sessionId, data] of Object.entries(sessions)) {
      const sessionData = JSON.parse(data);

      // Try to get full session info
      const sessionInfo = await this.getSessionInfo(sessionId);

      sessionArray.push({
        sessionId,
        ...sessionData,
        ...sessionInfo
      });
    }

    return sessionArray;
  }

  /**
   * Get session information
   */
  async getSessionInfo(sessionId) {
    const sessionKey = `sess:${sessionId}`;
    const sessionData = await this.redisClient.get(sessionKey);

    if (!sessionData) {
      return null;
    }

    try {
      const parsed = JSON.parse(sessionData);
      return {
        userId: parsed.userId,
        createdAt: parsed.createdAt,
        lastActivity: parsed.lastActivity,
        ipAddress: parsed.ipAddress,
        userAgent: parsed.userAgent,
        metadata: parsed.metadata
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Destroy session
   */
  async destroySession(sessionId) {
    return new Promise((resolve, reject) => {
      this.store.destroy(sessionId, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Destroy all user sessions
   */
  async destroyAllUserSessions(userId, exceptSessionId = null) {
    const key = `user:${userId}:sessions`;
    const sessions = await this.redisClient.hGetAll(key);

    for (const sessionId of Object.keys(sessions)) {
      if (sessionId !== exceptSessionId) {
        await this.destroySession(sessionId);
        await this.redisClient.hDel(key, sessionId);
      }
    }
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions() {
    // Redis TTL handles most cleanup, but we clean user session tracking
    const pattern = 'user:*:sessions';
    let cursor = '0';

    do {
      const result = await this.redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100
      });

      cursor = result.cursor;
      const { keys } = result;

      for (const key of keys) {
        const sessions = await this.redisClient.hGetAll(key);

        for (const [sessionId, data] of Object.entries(sessions)) {
          const sessionExists = await this.redisClient.exists(
            `sess:${sessionId}`
          );

          if (!sessionExists) {
            await this.redisClient.hDel(key, sessionId);
          }
        }
      }
    } while (cursor !== '0');
  }

  /**
   * Get session statistics
   */
  async getSessionStatistics(userId = null) {
    if (userId) {
      const sessions = await this.getUserSessions(userId);
      return {
        userId,
        totalSessions: sessions.length,
        activeSessions: sessions.filter((s) => !this.isSessionExpired(s))
          .length,
        sessions: sessions.map((s) => ({
          sessionId: s.sessionId,
          createdAt: s.createdAt,
          lastActivity: s.lastActivity,
          ipAddress: s.ipAddress,
          isExpired: this.isSessionExpired(s)
        }))
      };
    }

    // Global statistics
    const pattern = 'sess:*';
    let cursor = '0';
    let totalCount = 0;

    do {
      const result = await this.redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 1000
      });

      cursor = result.cursor;
      totalCount += result.keys.length;
    } while (cursor !== '0');

    return {
      totalActiveSessions: totalCount
    };
  }

  /**
   * Check if session is expired
   */
  isSessionExpired(session) {
    if (!session.createdAt) return true;

    const age = Date.now() - session.createdAt;
    return age > this.options.sessionMaxAge;
  }

  /**
   * Session activity middleware
   */
  activityMiddleware() {
    return async (req, res, next) => {
      if (req.session && req.session.userId) {
        // Check device fingerprint
        if (!this.verifyDeviceFingerprint(req)) {
          return res.status(401).json({
            error: 'Session validation failed',
            code: 'DEVICE_MISMATCH'
          });
        }

        // Check idle time
        if (this.isSessionIdle(req)) {
          await this.destroySession(req.sessionID);
          return res.status(401).json({
            error: 'Session expired due to inactivity',
            code: 'SESSION_IDLE'
          });
        }

        // Update activity
        await this.updateActivity(req);
      }

      next();
    };
  }

  /**
   * Get middleware
   */
  getMiddleware() {
    return this.middleware;
  }

  /**
   * Start cleanup job
   */
  startCleanupJob(intervalMinutes = 60) {
    setInterval(
      async () => {
        try {
          await this.cleanupExpiredSessions();
        } catch (error) {
          console.error('Session cleanup error:', error);
        }
      },
      intervalMinutes * 60 * 1000
    );
  }
}

module.exports = SessionManager;
