/**
 * Three-Tier Security Layer
 * Comprehensive security system integrating TwinGate, Wazuh, and internal security measures
 *
 * Tiers:
 * - Tier 1: Network Security (TwinGate Zero Trust)
 * - Tier 2: Threat Detection (Wazuh SIEM)
 * - Tier 3: Application Security (Custom)
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class ThreeTierSecurity extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      // TwinGate Configuration
      twingate: {
        apiUrl:
          config.twingateApiUrl
          || process.env.TWINGATE_API_URL
          || 'https://api.twingate.com/v1',
        apiKey: config.twingateApiKey || process.env.TWINGATE_API_KEY,
        networkId: config.twingateNetworkId || process.env.TWINGATE_NETWORK_ID,
        enabled: config.twingateEnabled !== false
      },

      // Wazuh Configuration
      wazuh: {
        apiUrl:
          config.wazuhApiUrl
          || process.env.WAZUH_API_URL
          || 'https://localhost:55000',
        username: config.wazuhUsername || process.env.WAZUH_USERNAME || 'admin',
        password: config.wazuhPassword || process.env.WAZUH_PASSWORD,
        enabled: config.wazuhEnabled !== false
      },

      // Application Security Configuration
      appSecurity: {
        encryptionAlgorithm: 'aes-256-gcm',
        encryptionKey:
          config.encryptionKey
          || process.env.ENCRYPTION_KEY
          || crypto.randomBytes(32),
        maxLoginAttempts: config.maxLoginAttempts || 5,
        lockoutDuration: config.lockoutDuration || 900000, // 15 minutes
        sessionTimeout: config.sessionTimeout || 3600000, // 1 hour
        mfaEnabled: config.mfaEnabled !== false,
        passwordMinLength: config.passwordMinLength || 12,
        passwordRequireSpecial: config.passwordRequireSpecial !== false,
        passwordRequireNumbers: config.passwordRequireNumbers !== false,
        passwordRequireUppercase: config.passwordRequireUppercase !== false
      },

      // Security Event Thresholds
      thresholds: {
        failedLoginAttempts: 5,
        suspiciousActivities: 10,
        highSeverityAlerts: 3,
        criticalVulnerabilities: 1
      },

      ...config
    };

    // Security State
    this.state = {
      tier1: {
        active: false,
        status: 'initializing',
        connectedUsers: 0,
        activeResources: 0
      },
      tier2: {
        active: false,
        status: 'initializing',
        agents: 0,
        alerts: 0,
        threats: 0
      },
      tier3: {
        active: false,
        status: 'initializing',
        sessions: 0,
        blockedIPs: []
      },
      overall: 'initializing'
    };

    // Login Attempts Tracking
    this.loginAttempts = new Map(); // IP -> { count, lastAttempt, locked }

    // Active Sessions
    this.sessions = new Map(); // sessionId -> { userId, ip, createdAt, lastActivity }

    // Blocked IPs
    this.blockedIPs = new Set();

    // Security Events Log
    this.securityEvents = [];

    // Statistics
    this.stats = {
      tier1: { totalConnections: 0, deniedAccess: 0, resourcesProtected: 0 },
      tier2: { totalAlerts: 0, threatsDetected: 0, incidentsResolved: 0 },
      tier3: { totalSessions: 0, blockedAttempts: 0, mfaVerifications: 0 },
      overall: {
        securityScore: 100,
        lastAssessment: new Date(),
        vulnerabilities: 0
      }
    };

    console.log('Three-Tier Security initialized');
  }

  /**
   * Initialize all security tiers
   */
  async initialize() {
    console.log('Initializing Three-Tier Security System...');

    try {
      // Initialize Tier 1: Network Security (TwinGate)
      await this.initializeTier1();

      // Initialize Tier 2: Threat Detection (Wazuh)
      await this.initializeTier2();

      // Initialize Tier 3: Application Security
      await this.initializeTier3();

      this.state.overall = 'active';

      this.emit('security.initialized', {
        tier1: this.state.tier1,
        tier2: this.state.tier2,
        tier3: this.state.tier3,
        timestamp: new Date()
      });

      console.log('Three-Tier Security System initialized successfully');

      return {
        success: true,
        tiers: {
          tier1: this.state.tier1,
          tier2: this.state.tier2,
          tier3: this.state.tier3
        }
      };
    } catch (error) {
      console.error('Failed to initialize Three-Tier Security:', error.message);
      this.state.overall = 'error';
      throw error;
    }
  }

  /**
   * Tier 1: Network Security (TwinGate Zero Trust)
   */
  async initializeTier1() {
    console.log('Initializing Tier 1: Network Security (TwinGate)');

    if (!this.config.twingate.enabled) {
      console.log('TwinGate disabled, skipping Tier 1 initialization');
      this.state.tier1.status = 'disabled';
      return;
    }

    try {
      // Simulated TwinGate initialization
      // In production, this would connect to TwinGate API

      this.state.tier1.active = true;
      this.state.tier1.status = 'active';
      this.state.tier1.connectedUsers = 0;
      this.state.tier1.activeResources = 0;

      console.log('Tier 1 (Network Security) initialized');
    } catch (error) {
      console.error('Tier 1 initialization failed:', error.message);
      this.state.tier1.status = 'error';
      throw error;
    }
  }

  /**
   * Tier 2: Threat Detection (Wazuh SIEM)
   */
  async initializeTier2() {
    console.log('Initializing Tier 2: Threat Detection (Wazuh)');

    if (!this.config.wazuh.enabled) {
      console.log('Wazuh disabled, skipping Tier 2 initialization');
      this.state.tier2.status = 'disabled';
      return;
    }

    try {
      // Simulated Wazuh initialization
      // In production, this would connect to Wazuh API

      this.state.tier2.active = true;
      this.state.tier2.status = 'active';
      this.state.tier2.agents = 0;
      this.state.tier2.alerts = 0;
      this.state.tier2.threats = 0;

      console.log('Tier 2 (Threat Detection) initialized');
    } catch (error) {
      console.error('Tier 2 initialization failed:', error.message);
      this.state.tier2.status = 'error';
      throw error;
    }
  }

  /**
   * Tier 3: Application Security
   */
  async initializeTier3() {
    console.log('Initializing Tier 3: Application Security');

    try {
      this.state.tier3.active = true;
      this.state.tier3.status = 'active';
      this.state.tier3.sessions = 0;
      this.state.tier3.blockedIPs = [];

      // Start session cleanup interval (every 5 minutes)
      this.sessionCleanupInterval = setInterval(() => {
        this.cleanupExpiredSessions();
      }, 300000);

      console.log('Tier 3 (Application Security) initialized');
    } catch (error) {
      console.error('Tier 3 initialization failed:', error.message);
      this.state.tier3.status = 'error';
      throw error;
    }
  }

  /**
   * TwinGate Operations
   */

  async authorizeResource(userId, resourceId) {
    console.log(`Authorizing resource ${resourceId} for user ${userId}`);

    if (!this.state.tier1.active) {
      console.warn('Tier 1 not active, skipping TwinGate authorization');
      return { authorized: true, bypassedTier1: true };
    }

    try {
      // Simulated TwinGate resource authorization
      const authorized = true; // In production, check with TwinGate API

      if (authorized) {
        this.state.tier1.activeResources++;
        this.stats.tier1.totalConnections++;
      } else {
        this.stats.tier1.deniedAccess++;
      }

      this.logSecurityEvent('tier1.resource.authorization', {
        userId,
        resourceId,
        authorized,
        timestamp: new Date()
      });

      return { authorized, resourceId, userId };
    } catch (error) {
      console.error('Resource authorization failed:', error.message);
      this.stats.tier1.deniedAccess++;
      return { authorized: false, error: error.message };
    }
  }

  async connectUser(userId, device = {}) {
    console.log(`Connecting user ${userId} via TwinGate`);

    if (!this.state.tier1.active) {
      console.warn('Tier 1 not active, skipping TwinGate connection');
      return { connected: true, bypassedTier1: true };
    }

    try {
      // Simulated TwinGate user connection
      const connected = true; // In production, establish TwinGate connection

      if (connected) {
        this.state.tier1.connectedUsers++;
        this.stats.tier1.totalConnections++;
      }

      this.logSecurityEvent('tier1.user.connected', {
        userId,
        device,
        timestamp: new Date()
      });

      return { connected, userId, device };
    } catch (error) {
      console.error('User connection failed:', error.message);
      this.stats.tier1.deniedAccess++;
      return { connected: false, error: error.message };
    }
  }

  async disconnectUser(userId) {
    console.log(`Disconnecting user ${userId}`);

    if (this.state.tier1.active && this.state.tier1.connectedUsers > 0) {
      this.state.tier1.connectedUsers--;
    }

    this.logSecurityEvent('tier1.user.disconnected', {
      userId,
      timestamp: new Date()
    });

    return { disconnected: true, userId };
  }

  /**
   * Wazuh Operations
   */

  async monitorThreats() {
    console.log('Monitoring threats with Wazuh');

    if (!this.state.tier2.active) {
      console.warn('Tier 2 not active, skipping threat monitoring');
      return { monitored: false, bypassedTier2: true };
    }

    try {
      // Simulated Wazuh threat monitoring
      const threats = []; // In production, fetch from Wazuh API

      this.state.tier2.alerts = threats.length;
      this.stats.tier2.totalAlerts += threats.length;

      const criticalThreats = threats.filter((t) => t.severity === 'critical');
      this.state.tier2.threats = criticalThreats.length;
      this.stats.tier2.threatsDetected += criticalThreats.length;

      if (criticalThreats.length > 0) {
        this.emit('security.critical.threat', {
          threats: criticalThreats,
          timestamp: new Date()
        });
      }

      return {
        monitored: true,
        totalAlerts: threats.length,
        criticalThreats: criticalThreats.length,
        threats
      };
    } catch (error) {
      console.error('Threat monitoring failed:', error.message);
      return { monitored: false, error: error.message };
    }
  }

  async analyzeSecurityEvent(event) {
    console.log('Analyzing security event with Wazuh');

    if (!this.state.tier2.active) {
      console.warn('Tier 2 not active, skipping event analysis');
      return { analyzed: false, bypassedTier2: true };
    }

    try {
      // Simulated Wazuh event analysis
      const analysis = {
        eventId: event.id || crypto.randomUUID(),
        severity: event.severity || 'medium',
        category: event.category || 'unknown',
        description: event.description || 'Security event detected',
        recommendations: [],
        riskScore: Math.floor(Math.random() * 100),
        timestamp: new Date()
      };

      // Add recommendations based on severity
      if (analysis.severity === 'critical') {
        analysis.recommendations.push('Immediate action required');
        analysis.recommendations.push('Isolate affected systems');
        analysis.recommendations.push('Notify security team');
      } else if (analysis.severity === 'high') {
        analysis.recommendations.push('Investigate within 1 hour');
        analysis.recommendations.push('Review access logs');
      }

      this.logSecurityEvent('tier2.event.analyzed', analysis);

      return { analyzed: true, analysis };
    } catch (error) {
      console.error('Event analysis failed:', error.message);
      return { analyzed: false, error: error.message };
    }
  }

  async getSecurityAlerts(filters = {}) {
    console.log('Fetching security alerts from Wazuh');

    if (!this.state.tier2.active) {
      return { alerts: [], bypassedTier2: true };
    }

    try {
      // Simulated Wazuh alerts fetch
      const alerts = []; // In production, fetch from Wazuh API with filters

      return {
        success: true,
        count: alerts.length,
        alerts,
        filters
      };
    } catch (error) {
      console.error('Failed to fetch alerts:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Application Security Operations
   */

  async authenticateUser(credentials) {
    const {
      username, password, ip, mfaCode
    } = credentials;

    console.log(`Authenticating user ${username} from IP ${ip}`);

    // Check if IP is blocked
    if (this.isIPBlocked(ip)) {
      this.stats.tier3.blockedAttempts++;
      this.logSecurityEvent('tier3.auth.blocked', {
        username,
        ip,
        reason: 'IP blocked'
      });
      return { authenticated: false, reason: 'IP blocked', locked: true };
    }

    // Check login attempts
    const attempts = this.loginAttempts.get(ip) || {
      count: 0,
      lastAttempt: Date.now(),
      locked: false
    };

    if (
      attempts.locked
      && Date.now() - attempts.lastAttempt
        < this.config.appSecurity.lockoutDuration
    ) {
      this.stats.tier3.blockedAttempts++;
      return {
        authenticated: false,
        reason: 'Account temporarily locked',
        locked: true
      };
    }

    // Reset lock if lockout duration passed
    if (
      attempts.locked
      && Date.now() - attempts.lastAttempt
        >= this.config.appSecurity.lockoutDuration
    ) {
      attempts.locked = false;
      attempts.count = 0;
    }

    // Simulated authentication
    const validUser = username
      && password
      && password.length >= this.config.appSecurity.passwordMinLength;

    if (!validUser) {
      attempts.count++;
      attempts.lastAttempt = Date.now();

      if (attempts.count >= this.config.appSecurity.maxLoginAttempts) {
        attempts.locked = true;
        this.blockIP(ip, 'Too many failed login attempts');
      }

      this.loginAttempts.set(ip, attempts);
      this.stats.tier3.blockedAttempts++;

      this.logSecurityEvent('tier3.auth.failed', {
        username,
        ip,
        attempts: attempts.count,
        timestamp: new Date()
      });

      return {
        authenticated: false,
        reason: 'Invalid credentials',
        attemptsRemaining:
          this.config.appSecurity.maxLoginAttempts - attempts.count
      };
    }

    // MFA verification if enabled
    if (this.config.appSecurity.mfaEnabled) {
      if (!mfaCode) {
        return {
          authenticated: false,
          reason: 'MFA code required',
          mfaRequired: true
        };
      }

      const mfaValid = this.verifyMFA(username, mfaCode);
      if (!mfaValid) {
        this.stats.tier3.blockedAttempts++;
        return { authenticated: false, reason: 'Invalid MFA code' };
      }

      this.stats.tier3.mfaVerifications++;
    }

    // Authentication successful
    attempts.count = 0;
    attempts.lastAttempt = Date.now();
    this.loginAttempts.set(ip, attempts);

    // Create session
    const session = await this.createSession(username, ip);

    this.logSecurityEvent('tier3.auth.success', {
      username,
      ip,
      sessionId: session.sessionId,
      timestamp: new Date()
    });

    return {
      authenticated: true,
      sessionId: session.sessionId,
      expiresAt: session.expiresAt,
      user: { username }
    };
  }

  async createSession(userId, ip) {
    const sessionId = crypto.randomUUID();
    const now = Date.now();

    const session = {
      sessionId,
      userId,
      ip,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + this.config.appSecurity.sessionTimeout
    };

    this.sessions.set(sessionId, session);
    this.state.tier3.sessions = this.sessions.size;
    this.stats.tier3.totalSessions++;

    console.log(`Session created for user ${userId}: ${sessionId}`);

    return session;
  }

  async validateSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    const now = Date.now();

    if (now > session.expiresAt) {
      this.sessions.delete(sessionId);
      this.state.tier3.sessions = this.sessions.size;
      return { valid: false, reason: 'Session expired' };
    }

    // Update last activity
    session.lastActivity = now;
    session.expiresAt = now + this.config.appSecurity.sessionTimeout;

    return { valid: true, session };
  }

  async terminateSession(sessionId) {
    const deleted = this.sessions.delete(sessionId);

    if (deleted) {
      this.state.tier3.sessions = this.sessions.size;
      console.log(`Session terminated: ${sessionId}`);
    }

    return { terminated: deleted };
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.state.tier3.sessions = this.sessions.size;
      console.log(`Cleaned up ${cleaned} expired sessions`);
    }
  }

  /**
   * Password Validation
   */
  validatePassword(password) {
    const errors = [];

    if (password.length < this.config.appSecurity.passwordMinLength) {
      errors.push(
        `Password must be at least ${this.config.appSecurity.passwordMinLength} characters`
      );
    }

    if (
      this.config.appSecurity.passwordRequireUppercase
      && !/[A-Z]/.test(password)
    ) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (
      this.config.appSecurity.passwordRequireNumbers
      && !/\d/.test(password)
    ) {
      errors.push('Password must contain at least one number');
    }

    if (
      this.config.appSecurity.passwordRequireSpecial
      && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  calculatePasswordStrength(password) {
    let strength = 0;

    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 20;
    if (password.length >= 16) strength += 10;
    if (/[a-z]/.test(password)) strength += 10;
    if (/[A-Z]/.test(password)) strength += 10;
    if (/\d/.test(password)) strength += 10;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 20;

    if (strength < 40) return 'weak';
    if (strength < 70) return 'medium';
    return 'strong';
  }

  /**
   * MFA Operations
   */
  verifyMFA(userId, code) {
    // Simulated MFA verification
    // In production, verify against TOTP or SMS code
    return code && code.length === 6;
  }

  /**
   * IP Blocking
   */
  blockIP(ip, reason = 'Security policy violation') {
    this.blockedIPs.add(ip);
    this.state.tier3.blockedIPs = Array.from(this.blockedIPs);

    this.logSecurityEvent('tier3.ip.blocked', {
      ip,
      reason,
      timestamp: new Date()
    });

    console.log(`IP blocked: ${ip} - ${reason}`);
  }

  unblockIP(ip) {
    const removed = this.blockedIPs.delete(ip);

    if (removed) {
      this.state.tier3.blockedIPs = Array.from(this.blockedIPs);
      console.log(`IP unblocked: ${ip}`);
    }

    return { unblocked: removed };
  }

  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  /**
   * Data Encryption
   */
  encrypt(data) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.config.appSecurity.encryptionAlgorithm,
        this.config.appSecurity.encryptionKey,
        iv
      );

      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      console.error('Encryption failed:', error.message);
      throw error;
    }
  }

  decrypt(encryptedData, iv, authTag) {
    try {
      const decipher = crypto.createDecipheriv(
        this.config.appSecurity.encryptionAlgorithm,
        this.config.appSecurity.encryptionKey,
        Buffer.from(iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error.message);
      throw error;
    }
  }

  /**
   * Security Event Logging
   */
  logSecurityEvent(type, data) {
    const event = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: new Date()
    };

    this.securityEvents.push(event);

    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents.shift();
    }

    this.emit('security.event', event);
  }

  /**
   * Security Assessment
   */
  async assessSecurityPosture() {
    console.log('Assessing overall security posture');

    let score = 100;
    const issues = [];

    // Tier 1 assessment
    if (!this.state.tier1.active) {
      score -= 20;
      issues.push({
        tier: 1,
        severity: 'high',
        issue: 'Network security layer not active'
      });
    }

    // Tier 2 assessment
    if (!this.state.tier2.active) {
      score -= 20;
      issues.push({
        tier: 2,
        severity: 'high',
        issue: 'Threat detection layer not active'
      });
    }

    if (this.state.tier2.threats > this.config.thresholds.highSeverityAlerts) {
      score -= 15;
      issues.push({
        tier: 2,
        severity: 'critical',
        issue: `${this.state.tier2.threats} unresolved threats`
      });
    }

    // Tier 3 assessment
    if (!this.state.tier3.active) {
      score -= 20;
      issues.push({
        tier: 3,
        severity: 'high',
        issue: 'Application security layer not active'
      });
    }

    if (this.blockedIPs.size > 50) {
      score -= 10;
      issues.push({
        tier: 3,
        severity: 'medium',
        issue: `${this.blockedIPs.size} IPs blocked`
      });
    }

    // Update stats
    this.stats.overall.securityScore = Math.max(0, score);
    this.stats.overall.lastAssessment = new Date();
    this.stats.overall.vulnerabilities = issues.filter(
      (i) => i.severity === 'critical'
    ).length;

    const assessment = {
      score: this.stats.overall.securityScore,
      grade: this.getSecurityGrade(score),
      issues,
      recommendations: this.generateRecommendations(issues),
      timestamp: new Date()
    };

    this.emit('security.assessment.complete', assessment);

    return assessment;
  }

  getSecurityGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  generateRecommendations(issues) {
    const recommendations = [];

    const criticalIssues = issues.filter((i) => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push('Address critical security issues immediately');
    }

    const tier1Issues = issues.filter((i) => i.tier === 1);
    if (tier1Issues.length > 0) {
      recommendations.push('Enable and configure TwinGate network security');
    }

    const tier2Issues = issues.filter((i) => i.tier === 2);
    if (tier2Issues.length > 0) {
      recommendations.push('Enable Wazuh threat detection and monitoring');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current security practices');
      recommendations.push('Conduct regular security audits');
    }

    return recommendations;
  }

  /**
   * Statistics
   */
  getStatistics() {
    return {
      tier1: {
        ...this.stats.tier1,
        active: this.state.tier1.active,
        connectedUsers: this.state.tier1.connectedUsers,
        activeResources: this.state.tier1.activeResources
      },
      tier2: {
        ...this.stats.tier2,
        active: this.state.tier2.active,
        activeAlerts: this.state.tier2.alerts,
        activeThreats: this.state.tier2.threats
      },
      tier3: {
        ...this.stats.tier3,
        active: this.state.tier3.active,
        activeSessions: this.state.tier3.sessions,
        blockedIPs: this.blockedIPs.size
      },
      overall: this.stats.overall,
      state: this.state
    };
  }

  /**
   * Cleanup
   */
  async cleanup() {
    console.log('Cleaning up Three-Tier Security');

    // Clear intervals
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
    }

    // Clear sessions
    this.sessions.clear();

    // Clear login attempts
    this.loginAttempts.clear();

    // Update state
    this.state.tier1.active = false;
    this.state.tier2.active = false;
    this.state.tier3.active = false;
    this.state.overall = 'stopped';

    console.log('Three-Tier Security cleaned up');
  }
}

module.exports = ThreeTierSecurity;
