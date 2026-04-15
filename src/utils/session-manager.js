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
const { RedisStore } = require('connect-redis');
const crypto = require('crypto');

class SessionManager {
  constructor(redisClient, options = {}) {
    this.redisClient = redisClient;
    this.memorySessions = new Map();
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

    this.store = this.redisClient ? this.createStore() : null;
    this.middleware = this.store ? this.createMiddleware() : null;
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
    if (!this.store) {
      return null;
    }

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
    if (!this.redisClient) {
      return Array.from(this.memorySessions.entries())
        .filter(([, session]) => session.userId === userId)
        .map(([sessionId, session]) => ({
          sessionId,
          ...session
        }));
    }

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
    if (!this.redisClient) {
      return this.memorySessions.get(sessionId) || null;
    }

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
    if (!this.store) {
      this.memorySessions.delete(sessionId);
      return;
    }

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
    if (!this.redisClient) {
      for (const [sessionId, session] of this.memorySessions.entries()) {
        if (session.userId === userId && sessionId !== exceptSessionId) {
          this.memorySessions.delete(sessionId);
        }
      }
      return;
    }

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
    if (!this.redisClient) {
      for (const [sessionId, session] of this.memorySessions.entries()) {
        if (this.isSessionExpired(session)) {
          this.memorySessions.delete(sessionId);
        }
      }
      return;
    }

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
    if (!this.redisClient) {
      const sessions = Array.from(this.memorySessions.entries()).map(
        ([sessionId, session]) => ({
          sessionId,
          ...session
        })
      );

      if (userId) {
        const userSessions = sessions.filter((session) => session.userId === userId);
        return {
          userId,
          totalSessions: userSessions.length,
          activeSessions: userSessions.filter((session) => !this.isSessionExpired(session)).length,
          sessions: userSessions
        };
      }

      return {
        totalActiveSessions: sessions.filter((session) => !this.isSessionExpired(session)).length
      };
    }

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
   * Evict the oldest entries from a token hash so its size stays within
   * maxConcurrentSessions.  Reads each session record for its createdAt
   * timestamp, sorts ascending, and deletes the surplus oldest ones.
   *
   * @param {string} hashKey   - Redis hash key (e.g. auth:user:{uid}:sessions)
   * @param {string} dataPrefix - Key prefix for session data blobs (auth:session: or auth:refresh:)
   * @private
   */
  async _enforceTokenSessionLimit(hashKey, dataPrefix) {
    const count = await this.redisClient.hLen(hashKey);
    if (count <= this.options.maxConcurrentSessions) {
      return;
    }

    // Retrieve all session IDs and their creation times
    const all = await this.redisClient.hKeys(hashKey);
    const withAge = await Promise.all(
      all.map(async (sessionId) => {
        try {
          const raw = await this.redisClient.get(`${dataPrefix}${sessionId}`);
          const parsed = raw ? JSON.parse(raw) : {};
          return { sessionId, createdAt: parsed.createdAt || 0 };
        } catch {
          return { sessionId, createdAt: 0 };
        }
      })
    );

    // Sort oldest-first, evict the excess
    withAge.sort((a, b) => a.createdAt - b.createdAt);
    const toEvict = withAge.slice(0, count - this.options.maxConcurrentSessions);

    await Promise.all(
      toEvict.map(async ({ sessionId }) => {
        await this.redisClient.del(`${dataPrefix}${sessionId}`);
        await this.redisClient.hDel(hashKey, sessionId);
      })
    );
  }

  /**
   * Evict oldest in-memory bearer or refresh sessions for a user when the
   * count exceeds maxConcurrentSessions.
   *
   * @param {string} userId
   * @param {string} keyPrefix - 'refresh:' for refresh sessions, '' for bearer
   * @private
   */
  _enforceMemorySessionLimit(userId, keyPrefix) {
    const prefix = keyPrefix || '';
    const userSessions = Array.from(this.memorySessions.entries())
      .filter(([key, sess]) => key.startsWith(prefix) && sess.userId === userId)
      .sort(([, a], [, b]) => a.createdAt - b.createdAt);

    const excess = userSessions.length - this.options.maxConcurrentSessions;
    if (excess > 0) {
      userSessions.slice(0, excess).forEach(([key]) => this.memorySessions.delete(key));
    }
  }

  /**
   * Create a service-level session record for token-based auth flows.
   */
  async createSession({ userId, token, metadata = {} }) {
    const sessionId = crypto.randomUUID();
    const sessionData = {
      userId,
      token,
      metadata,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    if (!this.redisClient) {
      this.memorySessions.set(sessionId, sessionData);
      this._enforceMemorySessionLimit(userId, '');
      return sessionId;
    }

    await this.redisClient.set(
      `auth:session:${sessionId}`,
      JSON.stringify(sessionData),
      { EX: Math.floor(this.options.sessionMaxAge / 1000) }
    );
    await this.redisClient.hSet(`auth:user:${userId}:sessions`, sessionId, token);
    await this._enforceTokenSessionLimit(`auth:user:${userId}:sessions`, 'auth:session:');

    return sessionId;
  }

  /**
   * Create a refresh-token session record for rotation/revocation.
   */
  async createRefreshSession({ userId, refreshToken, metadata = {} }) {
    const sessionId = crypto.randomUUID();
    const sessionData = {
      userId,
      refreshToken,
      metadata,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    if (!this.redisClient) {
      this.memorySessions.set(`refresh:${sessionId}`, sessionData);
      this._enforceMemorySessionLimit(userId, 'refresh:');
      return sessionId;
    }

    await this.redisClient.set(
      `auth:refresh:${sessionId}`,
      JSON.stringify(sessionData),
      { EX: Math.floor(this.options.sessionMaxAge / 1000) }
    );
    await this.redisClient.hSet(
      `auth:user:${userId}:refresh`,
      sessionId,
      refreshToken
    );
    await this._enforceTokenSessionLimit(`auth:user:${userId}:refresh`, 'auth:refresh:');

    return sessionId;
  }

  /**
   * Validate a token-based auth session for a user.
   */
  async validateSession(userId, token) {
    if (!this.redisClient) {
      return Array.from(this.memorySessions.values()).some(
        (session) => session.userId === userId && session.token === token
      );
    }

    const sessions = await this.redisClient.hGetAll(`auth:user:${userId}:sessions`);
    return Object.values(sessions).includes(token);
  }

  /**
   * Invalidate a single token-based auth session.
   */
  async invalidateSession(userId, token) {
    if (!this.redisClient) {
      for (const [sessionId, session] of this.memorySessions.entries()) {
        if (session.userId === userId && session.token === token) {
          this.memorySessions.delete(sessionId);
        }
      }
      return;
    }

    const key = `auth:user:${userId}:sessions`;
    const sessions = await this.redisClient.hGetAll(key);

    for (const [sessionId, sessionToken] of Object.entries(sessions)) {
      if (sessionToken === token) {
        await this.redisClient.del(`auth:session:${sessionId}`);
        await this.redisClient.hDel(key, sessionId);
      }
    }
  }

  /**
   * Validate a refresh-token session for a user.
   */
  async validateRefreshSession(userId, refreshToken) {
    if (!this.redisClient) {
      return Array.from(this.memorySessions.values()).some(
        (session) => session.userId === userId && session.refreshToken === refreshToken
      );
    }

    const sessions = await this.redisClient.hGetAll(`auth:user:${userId}:refresh`);
    return Object.values(sessions).includes(refreshToken);
  }

  /**
   * Invalidate a single refresh-token session.
   */
  async invalidateRefreshSession(userId, refreshToken) {
    if (!this.redisClient) {
      for (const [sessionId, session] of this.memorySessions.entries()) {
        if (session.userId === userId && session.refreshToken === refreshToken) {
          this.memorySessions.delete(sessionId);
        }
      }
      return;
    }

    const key = `auth:user:${userId}:refresh`;
    const sessions = await this.redisClient.hGetAll(key);

    for (const [sessionId, storedRefreshToken] of Object.entries(sessions)) {
      if (storedRefreshToken === refreshToken) {
        await this.redisClient.del(`auth:refresh:${sessionId}`);
        await this.redisClient.hDel(key, sessionId);
      }
    }
  }

  /**
   * Invalidate all token-based auth sessions for a user.
   */
  async invalidateAllUserSessions(userId) {
    if (!this.redisClient) {
      for (const [sessionId, session] of this.memorySessions.entries()) {
        if (session.userId === userId) {
          this.memorySessions.delete(sessionId);
        }
      }
      return;
    }

    const key = `auth:user:${userId}:sessions`;
    const sessions = await this.redisClient.hGetAll(key);

    for (const sessionId of Object.keys(sessions)) {
      await this.redisClient.del(`auth:session:${sessionId}`);
    }

    await this.redisClient.del(key);

    const refreshKey = `auth:user:${userId}:refresh`;
    const refreshSessions = await this.redisClient.hGetAll(refreshKey);

    for (const sessionId of Object.keys(refreshSessions)) {
      await this.redisClient.del(`auth:refresh:${sessionId}`);
    }

    await this.redisClient.del(refreshKey);
  }

  /**
   * Count active token-based auth sessions.
   */
  async getActiveSessionCount(userId = null) {
    if (!this.redisClient) {
      if (!userId) {
        return this.memorySessions.size;
      }

      return Array.from(this.memorySessions.values()).filter(
        (session) => session.userId === userId
      ).length;
    }

    if (userId) {
      return await this.redisClient.hLen(`auth:user:${userId}:sessions`);
    }

    const sessionStats = await this.getSessionStatistics();
    return sessionStats.totalActiveSessions;
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
module.exports.SessionManager = SessionManager;
