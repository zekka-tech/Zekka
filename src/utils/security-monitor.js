/**
 * Security Monitoring Dashboard and Alerting System
 * 
 * Features:
 * - Real-time security event monitoring
 * - Threat detection and alerting
 * - Security metrics aggregation
 * - Anomaly detection
 * - Dashboard API endpoints
 * - Alert notifications
 */

const EventEmitter = require('events');
const { getAuditLogger, AuditCategory, AuditSeverity } = require('./audit-logger');

// Alert severity levels
const AlertSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Alert types
const AlertType = {
  FAILED_LOGIN: 'failed_login',
  ACCOUNT_LOCKOUT: 'account_lockout',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  DATA_BREACH_ATTEMPT: 'data_breach_attempt',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  XSS_ATTEMPT: 'xss_attempt',
  CSRF_VIOLATION: 'csrf_violation',
  SESSION_HIJACKING: 'session_hijacking',
  BRUTE_FORCE: 'brute_force',
  PRIVILEGE_ESCALATION: 'privilege_escalation',
  DATA_EXFILTRATION: 'data_exfiltration'
};

class SecurityMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.auditLogger = getAuditLogger();
    this.redisClient = options.redisClient;
    this.options = {
      // Alert thresholds
      failedLoginThreshold: options.failedLoginThreshold || 5,
      failedLoginWindow: options.failedLoginWindow || 15 * 60 * 1000, // 15 minutes
      rateLimitThreshold: options.rateLimitThreshold || 100,
      rateLimitWindow: options.rateLimitWindow || 60 * 1000, // 1 minute
      
      // Monitoring intervals
      metricsInterval: options.metricsInterval || 60 * 1000, // 1 minute
      anomalyCheckInterval: options.anomalyCheckInterval || 5 * 60 * 1000, // 5 minutes
      
      // Alert configuration
      enableEmailAlerts: options.enableEmailAlerts || false,
      enableSlackAlerts: options.enableSlackAlerts || false,
      alertEmailAddresses: options.alertEmailAddresses || [],
      slackWebhookUrl: options.slackWebhookUrl || null,
      
      ...options
    };
    
    this.metrics = {
      authenticationEvents: 0,
      failedLogins: 0,
      successfulLogins: 0,
      activeUsers: new Set(),
      activeSessions: 0,
      apiCalls: 0,
      securityViolations: 0,
      alerts: []
    };
    
    this.anomalyBaseline = {};
    this.startMonitoring();
  }
  
  /**
   * Start monitoring services
   */
  startMonitoring() {
    // Metrics collection
    setInterval(() => {
      this.collectMetrics();
    }, this.options.metricsInterval);
    
    // Anomaly detection
    setInterval(() => {
      this.detectAnomalies();
    }, this.options.anomalyCheckInterval);
  }
  
  /**
   * Track authentication attempt
   */
  async trackAuthenticationAttempt(email, success, ipAddress, details = {}) {
    this.metrics.authenticationEvents++;
    
    if (success) {
      this.metrics.successfulLogins++;
      await this.clearFailedAttempts(email, ipAddress);
    } else {
      this.metrics.failedLogins++;
      await this.recordFailedAttempt(email, ipAddress);
      
      // Check for brute force
      const failedCount = await this.getFailedAttemptCount(email, ipAddress);
      if (failedCount >= this.options.failedLoginThreshold) {
        await this.raiseAlert(AlertType.BRUTE_FORCE, AlertSeverity.HIGH, {
          email,
          ipAddress,
          failedAttempts: failedCount,
          message: `Brute force attack detected: ${failedCount} failed login attempts`
        });
      }
    }
    
    // Log event
    this.auditLogger.logAuthentication(
      success ? 'login_success' : 'login_failure',
      success ? 'success' : 'failure',
      { email, ipAddress },
      details
    );
  }
  
  /**
   * Record failed authentication attempt
   */
  async recordFailedAttempt(identifier, ipAddress) {
    const key = `failed_auth:${identifier}:${ipAddress}`;
    await this.redisClient.incr(key);
    await this.redisClient.expire(key, this.options.failedLoginWindow / 1000);
  }
  
  /**
   * Get failed attempt count
   */
  async getFailedAttemptCount(identifier, ipAddress) {
    const key = `failed_auth:${identifier}:${ipAddress}`;
    const count = await this.redisClient.get(key);
    return parseInt(count || 0);
  }
  
  /**
   * Clear failed attempts
   */
  async clearFailedAttempts(identifier, ipAddress) {
    const key = `failed_auth:${identifier}:${ipAddress}`;
    await this.redisClient.del(key);
  }
  
  /**
   * Track security violation
   */
  async trackSecurityViolation(type, severity, actor, details = {}) {
    this.metrics.securityViolations++;
    
    // Log violation
    this.auditLogger.logSecurityEvent(
      type,
      this.mapAlertSeverityToAudit(severity),
      'failure',
      actor,
      details
    );
    
    // Raise alert for high/critical violations
    if (severity === AlertSeverity.HIGH || severity === AlertSeverity.CRITICAL) {
      await this.raiseAlert(type, severity, {
        actor,
        ...details
      });
    }
  }
  
  /**
   * Track API call
   */
  trackApiCall(method, path, statusCode, userId, duration) {
    this.metrics.apiCalls++;
    
    if (userId) {
      this.metrics.activeUsers.add(userId);
    }
    
    // Track slow requests
    if (duration > 5000) { // 5 seconds
      this.auditLogger.log({
        category: AuditCategory.SYSTEM_EVENT,
        severity: AuditSeverity.WARNING,
        message: `Slow API call detected: ${method} ${path} (${duration}ms)`,
        action: `${method} ${path}`,
        additionalData: { duration, statusCode, userId }
      });
    }
  }
  
  /**
   * Raise security alert
   */
  async raiseAlert(type, severity, details = {}) {
    const alert = {
      id: this.generateAlertId(),
      type,
      severity,
      timestamp: new Date().toISOString(),
      details,
      acknowledged: false
    };
    
    // Store alert
    this.metrics.alerts.push(alert);
    await this.storeAlert(alert);
    
    // Emit event
    this.emit('alert', alert);
    
    // Send notifications
    await this.sendAlertNotifications(alert);
    
    // Log alert
    this.auditLogger.log({
      category: AuditCategory.SECURITY_EVENT,
      severity: this.mapAlertSeverityToAudit(severity),
      message: `Security alert: ${type}`,
      action: type,
      outcome: 'failure',
      additionalData: { alert }
    });
    
    return alert;
  }
  
  /**
   * Store alert in Redis
   */
  async storeAlert(alert) {
    const key = `security:alerts:${alert.id}`;
    await this.redisClient.set(key, JSON.stringify(alert));
    await this.redisClient.expire(key, 30 * 24 * 60 * 60); // 30 days
    
    // Add to alerts list
    await this.redisClient.lPush('security:alerts:list', alert.id);
    await this.redisClient.lTrim('security:alerts:list', 0, 999); // Keep last 1000
  }
  
  /**
   * Send alert notifications
   */
  async sendAlertNotifications(alert) {
    // Email notifications
    if (this.options.enableEmailAlerts && this.options.alertEmailAddresses.length > 0) {
      await this.sendEmailAlert(alert);
    }
    
    // Slack notifications
    if (this.options.enableSlackAlerts && this.options.slackWebhookUrl) {
      await this.sendSlackAlert(alert);
    }
  }
  
  /**
   * Send email alert (placeholder for integration)
   */
  async sendEmailAlert(alert) {
    // TODO: Integrate with email service
    console.log('Email alert:', alert);
  }
  
  /**
   * Send Slack alert (placeholder for integration)
   */
  async sendSlackAlert(alert) {
    // TODO: Integrate with Slack
    console.log('Slack alert:', alert);
  }
  
  /**
   * Get recent alerts
   */
  async getRecentAlerts(limit = 50) {
    const alertIds = await this.redisClient.lRange('security:alerts:list', 0, limit - 1);
    const alerts = [];
    
    for (const alertId of alertIds) {
      const key = `security:alerts:${alertId}`;
      const alertData = await this.redisClient.get(key);
      if (alertData) {
        alerts.push(JSON.parse(alertData));
      }
    }
    
    return alerts;
  }
  
  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId, acknowledgedBy) {
    const key = `security:alerts:${alertId}`;
    const alertData = await this.redisClient.get(key);
    
    if (alertData) {
      const alert = JSON.parse(alertData);
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date().toISOString();
      
      await this.redisClient.set(key, JSON.stringify(alert));
      return alert;
    }
    
    return null;
  }
  
  /**
   * Collect security metrics
   */
  async collectMetrics() {
    const snapshot = {
      timestamp: new Date().toISOString(),
      metrics: {
        authenticationEvents: this.metrics.authenticationEvents,
        failedLogins: this.metrics.failedLogins,
        successfulLogins: this.metrics.successfulLogins,
        activeUsers: this.metrics.activeUsers.size,
        apiCalls: this.metrics.apiCalls,
        securityViolations: this.metrics.securityViolations,
        recentAlerts: this.metrics.alerts.length
      }
    };
    
    // Store metrics
    await this.redisClient.lPush('security:metrics', JSON.stringify(snapshot));
    await this.redisClient.lTrim('security:metrics', 0, 1439); // Keep 24 hours (1 minute intervals)
    
    // Reset counters
    this.metrics.authenticationEvents = 0;
    this.metrics.failedLogins = 0;
    this.metrics.successfulLogins = 0;
    this.metrics.apiCalls = 0;
    this.metrics.securityViolations = 0;
    this.metrics.activeUsers.clear();
    this.metrics.alerts = [];
    
    return snapshot;
  }
  
  /**
   * Get metrics history
   */
  async getMetricsHistory(hours = 24) {
    const count = hours * 60; // 1 minute intervals
    const metricsData = await this.redisClient.lRange('security:metrics', 0, count - 1);
    
    return metricsData.map(data => JSON.parse(data));
  }
  
  /**
   * Detect anomalies
   */
  async detectAnomalies() {
    const history = await this.getMetricsHistory(1); // Last hour
    
    if (history.length === 0) return;
    
    // Calculate baseline if not set
    if (Object.keys(this.anomalyBaseline).length === 0) {
      this.calculateBaseline(history);
      return;
    }
    
    const current = history[0].metrics;
    
    // Check for anomalies
    if (current.failedLogins > this.anomalyBaseline.failedLogins * 3) {
      await this.raiseAlert(AlertType.SUSPICIOUS_ACTIVITY, AlertSeverity.MEDIUM, {
        message: `Unusual spike in failed logins: ${current.failedLogins} vs baseline ${this.anomalyBaseline.failedLogins}`,
        currentValue: current.failedLogins,
        baselineValue: this.anomalyBaseline.failedLogins
      });
    }
    
    if (current.securityViolations > this.anomalyBaseline.securityViolations * 2) {
      await this.raiseAlert(AlertType.SUSPICIOUS_ACTIVITY, AlertSeverity.HIGH, {
        message: `Unusual spike in security violations: ${current.securityViolations} vs baseline ${this.anomalyBaseline.securityViolations}`,
        currentValue: current.securityViolations,
        baselineValue: this.anomalyBaseline.securityViolations
      });
    }
  }
  
  /**
   * Calculate baseline metrics
   */
  calculateBaseline(history) {
    const sum = history.reduce((acc, snapshot) => {
      acc.failedLogins += snapshot.metrics.failedLogins;
      acc.successfulLogins += snapshot.metrics.successfulLogins;
      acc.securityViolations += snapshot.metrics.securityViolations;
      return acc;
    }, { failedLogins: 0, successfulLogins: 0, securityViolations: 0 });
    
    this.anomalyBaseline = {
      failedLogins: sum.failedLogins / history.length,
      successfulLogins: sum.successfulLogins / history.length,
      securityViolations: sum.securityViolations / history.length
    };
  }
  
  /**
   * Get dashboard data
   */
  async getDashboardData() {
    const recentAlerts = await this.getRecentAlerts(10);
    const metrics = await this.getMetricsHistory(24);
    
    return {
      alerts: recentAlerts,
      metrics,
      summary: {
        totalAlerts: recentAlerts.length,
        criticalAlerts: recentAlerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
        highAlerts: recentAlerts.filter(a => a.severity === AlertSeverity.HIGH).length,
        unacknowledgedAlerts: recentAlerts.filter(a => !a.acknowledged).length
      }
    };
  }
  
  /**
   * Utility methods
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  
  mapAlertSeverityToAudit(alertSeverity) {
    switch (alertSeverity) {
      case AlertSeverity.LOW: return AuditSeverity.INFO;
      case AlertSeverity.MEDIUM: return AuditSeverity.WARNING;
      case AlertSeverity.HIGH: return AuditSeverity.ERROR;
      case AlertSeverity.CRITICAL: return AuditSeverity.CRITICAL;
      default: return AuditSeverity.INFO;
    }
  }
}

// Singleton instance
let securityMonitorInstance = null;

/**
 * Get security monitor instance
 */
function getSecurityMonitor(options) {
  if (!securityMonitorInstance) {
    securityMonitorInstance = new SecurityMonitor(options);
  }
  return securityMonitorInstance;
}

module.exports = {
  SecurityMonitor,
  getSecurityMonitor,
  AlertSeverity,
  AlertType
};
