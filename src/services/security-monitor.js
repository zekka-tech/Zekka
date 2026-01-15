/**
 * Security Monitoring Service
 * ===========================
 * 
 * Real-time security monitoring and threat detection service.
 * 
 * Features:
 * - Real-time security event monitoring
 * - Threat detection and alerting
 * - Security metrics and dashboards
 * - Anomaly detection
 * - Incident response automation
 * - Security reporting
 * 
 * Compliance: OWASP, SOC 2, PCI DSS, GDPR
 */

import pool from '../config/database.js';
import redis from '../config/redis.js';
import auditService from './audit-service.js';

// Alert thresholds
const THRESHOLDS = {
  failedLogins: {
    count: 5,
    windowMinutes: 15,
    severity: 'high'
  },
  suspiciousActivity: {
    count: 3,
    windowMinutes: 10,
    severity: 'critical'
  },
  rateLimitExceeded: {
    count: 10,
    windowMinutes: 5,
    severity: 'medium'
  },
  unauthorizedAccess: {
    count: 3,
    windowMinutes: 10,
    severity: 'critical'
  },
  dataExfiltration: {
    sizeBytes: 100000000, // 100MB
    windowMinutes: 30,
    severity: 'critical'
  }
};

class SecurityMonitor {
  constructor() {
    this.alertHandlers = [];
    this.metricsCache = new Map();
  }

  /**
   * Initialize security monitoring
   */
  async initialize() {
    console.log('Security monitoring service initialized');
    
    // Start periodic monitoring tasks
    this.startPeriodicMonitoring();
  }

  /**
   * Start periodic monitoring tasks
   */
  startPeriodicMonitoring() {
    // Check for security threats every minute
    setInterval(() => {
      this.checkSecurityThreats().catch(err => 
        console.error('Security threat check error:', err)
      );
    }, 60000); // 1 minute

    // Generate security metrics every 5 minutes
    setInterval(() => {
      this.updateSecurityMetrics().catch(err => 
        console.error('Security metrics update error:', err)
      );
    }, 300000); // 5 minutes

    // Check for expiring passwords daily
    setInterval(() => {
      this.checkPasswordExpirations().catch(err => 
        console.error('Password expiration check error:', err)
      );
    }, 86400000); // 24 hours
  }

  /**
   * Monitor failed login attempts
   */
  async monitorFailedLogins() {
    try {
      const threshold = THRESHOLDS.failedLogins;
      const query = `
        SELECT 
          ip_address,
          COUNT(*) as attempt_count,
          array_agg(username) as usernames,
          MAX(timestamp) as last_attempt
        FROM audit_logs
        WHERE action = 'login_failed'
          AND timestamp > NOW() - INTERVAL '${threshold.windowMinutes} minutes'
        GROUP BY ip_address
        HAVING COUNT(*) >= ${threshold.count}
      `;

      const result = await pool.query(query);

      for (const row of result.rows) {
        await this.createAlert({
          type: 'failed_login_attempts',
          severity: threshold.severity,
          title: `Multiple failed login attempts from ${row.ip_address}`,
          description: `${row.attempt_count} failed login attempts in ${threshold.windowMinutes} minutes`,
          metadata: {
            ipAddress: row.ip_address,
            attemptCount: row.attempt_count,
            usernames: row.usernames,
            lastAttempt: row.last_attempt
          },
          recommendedAction: 'Block IP address temporarily or investigate user accounts'
        });
      }

      return result.rows;
    } catch (error) {
      console.error('Failed login monitoring error:', error);
      throw error;
    }
  }

  /**
   * Monitor suspicious activities
   */
  async monitorSuspiciousActivities() {
    try {
      const threshold = THRESHOLDS.suspiciousActivity;
      const query = `
        SELECT 
          user_id,
          username,
          ip_address,
          COUNT(*) as event_count,
          array_agg(DISTINCT action) as actions,
          MAX(timestamp) as last_event
        FROM audit_logs
        WHERE is_suspicious = true
          AND timestamp > NOW() - INTERVAL '${threshold.windowMinutes} minutes'
        GROUP BY user_id, username, ip_address
        HAVING COUNT(*) >= ${threshold.count}
      `;

      const result = await pool.query(query);

      for (const row of result.rows) {
        await this.createAlert({
          type: 'suspicious_activity',
          severity: threshold.severity,
          title: `Multiple suspicious activities detected`,
          description: `${row.event_count} suspicious events from user ${row.username || 'unknown'} in ${threshold.windowMinutes} minutes`,
          metadata: {
            userId: row.user_id,
            username: row.username,
            ipAddress: row.ip_address,
            eventCount: row.event_count,
            actions: row.actions,
            lastEvent: row.last_event
          },
          recommendedAction: 'Investigate user activity and consider temporary account suspension'
        });
      }

      return result.rows;
    } catch (error) {
      console.error('Suspicious activity monitoring error:', error);
      throw error;
    }
  }

  /**
   * Monitor unauthorized access attempts
   */
  async monitorUnauthorizedAccess() {
    try {
      const threshold = THRESHOLDS.unauthorizedAccess;
      const query = `
        SELECT 
          user_id,
          username,
          ip_address,
          COUNT(*) as attempt_count,
          array_agg(DISTINCT resource_type) as resources_accessed,
          MAX(timestamp) as last_attempt
        FROM audit_logs
        WHERE action LIKE '%unauthorized%' OR action = 'permission_denied'
          AND timestamp > NOW() - INTERVAL '${threshold.windowMinutes} minutes'
        GROUP BY user_id, username, ip_address
        HAVING COUNT(*) >= ${threshold.count}
      `;

      const result = await pool.query(query);

      for (const row of result.rows) {
        await this.createAlert({
          type: 'unauthorized_access',
          severity: threshold.severity,
          title: `Multiple unauthorized access attempts`,
          description: `${row.attempt_count} unauthorized access attempts by ${row.username || 'unknown'} in ${threshold.windowMinutes} minutes`,
          metadata: {
            userId: row.user_id,
            username: row.username,
            ipAddress: row.ip_address,
            attemptCount: row.attempt_count,
            resourcesAccessed: row.resources_accessed,
            lastAttempt: row.last_attempt
          },
          recommendedAction: 'Review user permissions and investigate potential privilege escalation'
        });
      }

      return result.rows;
    } catch (error) {
      console.error('Unauthorized access monitoring error:', error);
      throw error;
    }
  }

  /**
   * Monitor for potential data exfiltration
   */
  async monitorDataExfiltration() {
    try {
      const threshold = THRESHOLDS.dataExfiltration;
      const query = `
        SELECT 
          user_id,
          username,
          ip_address,
          COUNT(*) as export_count,
          MAX(timestamp) as last_export
        FROM audit_logs
        WHERE action LIKE '%export%' OR action LIKE '%download%'
          AND timestamp > NOW() - INTERVAL '${threshold.windowMinutes} minutes'
        GROUP BY user_id, username, ip_address
        HAVING COUNT(*) >= 10
      `;

      const result = await pool.query(query);

      for (const row of result.rows) {
        await this.createAlert({
          type: 'potential_data_exfiltration',
          severity: threshold.severity,
          title: `Potential data exfiltration detected`,
          description: `${row.export_count} data exports by ${row.username || 'unknown'} in ${threshold.windowMinutes} minutes`,
          metadata: {
            userId: row.user_id,
            username: row.username,
            ipAddress: row.ip_address,
            exportCount: row.export_count,
            lastExport: row.last_export
          },
          recommendedAction: 'Immediately review exported data and consider suspending account'
        });
      }

      return result.rows;
    } catch (error) {
      console.error('Data exfiltration monitoring error:', error);
      throw error;
    }
  }

  /**
   * Check all security threats
   */
  async checkSecurityThreats() {
    try {
      const results = await Promise.all([
        this.monitorFailedLogins(),
        this.monitorSuspiciousActivities(),
        this.monitorUnauthorizedAccess(),
        this.monitorDataExfiltration()
      ]);

      const totalThreats = results.reduce((sum, r) => sum + r.length, 0);
      
      if (totalThreats > 0) {
        console.log(`Security monitoring: ${totalThreats} potential threats detected`);
      }

      return {
        timestamp: new Date(),
        failedLogins: results[0].length,
        suspiciousActivities: results[1].length,
        unauthorizedAccess: results[2].length,
        dataExfiltration: results[3].length,
        total: totalThreats
      };
    } catch (error) {
      console.error('Security threat check error:', error);
      throw error;
    }
  }

  /**
   * Create security alert
   */
  async createAlert(alertData) {
    try {
      // Check if similar alert already exists (deduplicate)
      const existingAlert = await pool.query(
        `SELECT id FROM security_alerts
         WHERE type = $1 
           AND status = 'open'
           AND metadata->>'ipAddress' = $2
           AND created_at > NOW() - INTERVAL '1 hour'
         LIMIT 1`,
        [alertData.type, alertData.metadata?.ipAddress || '']
      );

      if (existingAlert.rows.length > 0) {
        // Update existing alert count
        await pool.query(
          `UPDATE security_alerts 
           SET occurrence_count = occurrence_count + 1,
               updated_at = NOW()
           WHERE id = $1`,
          [existingAlert.rows[0].id]
        );
        return existingAlert.rows[0];
      }

      // Create new alert
      const result = await pool.query(
        `INSERT INTO security_alerts (
          type, severity, title, description, metadata,
          recommended_action, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'open')
        RETURNING *`,
        [
          alertData.type,
          alertData.severity,
          alertData.title,
          alertData.description,
          alertData.metadata,
          alertData.recommendedAction
        ]
      );

      const alert = result.rows[0];

      // Trigger alert handlers
      await this.triggerAlertHandlers(alert);

      // Log alert creation
      await auditService.log({
        action: 'security_alert_created',
        resourceType: 'security_alert',
        resourceId: alert.id,
        success: true,
        requestBody: {
          type: alert.type,
          severity: alert.severity
        },
        riskLevel: alert.severity
      });

      return alert;
    } catch (error) {
      console.error('Alert creation error:', error);
      throw error;
    }
  }

  /**
   * Trigger alert handlers (webhooks, notifications, etc.)
   */
  async triggerAlertHandlers(alert) {
    for (const handler of this.alertHandlers) {
      try {
        await handler(alert);
      } catch (error) {
        console.error('Alert handler error:', error);
      }
    }
  }

  /**
   * Register alert handler
   */
  registerAlertHandler(handler) {
    this.alertHandlers.push(handler);
  }

  /**
   * Get active security alerts
   */
  async getActiveAlerts(filters = {}) {
    try {
      const { severity, type, limit = 50 } = filters;
      
      let query = `
        SELECT *
        FROM security_alerts
        WHERE status = 'open'
      `;
      const values = [];
      let paramCount = 0;

      if (severity) {
        paramCount++;
        query += ` AND severity = $${paramCount}`;
        values.push(severity);
      }

      if (type) {
        paramCount++;
        query += ` AND type = $${paramCount}`;
        values.push(type);
      }

      query += ` ORDER BY severity DESC, created_at DESC LIMIT $${paramCount + 1}`;
      values.push(limit);

      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Get active alerts error:', error);
      throw error;
    }
  }

  /**
   * Acknowledge security alert
   */
  async acknowledgeAlert(alertId, userId, notes) {
    try {
      const result = await pool.query(
        `UPDATE security_alerts
         SET status = 'acknowledged',
             acknowledged_by = $2,
             acknowledged_at = NOW(),
             resolution_notes = $3,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [alertId, userId, notes]
      );

      if (result.rows.length === 0) {
        throw new Error('Alert not found');
      }

      // Log acknowledgment
      await auditService.log({
        userId,
        action: 'security_alert_acknowledged',
        resourceType: 'security_alert',
        resourceId: alertId,
        success: true,
        requestBody: { notes }
      });

      return result.rows[0];
    } catch (error) {
      console.error('Alert acknowledgment error:', error);
      throw error;
    }
  }

  /**
   * Resolve security alert
   */
  async resolveAlert(alertId, userId, resolution) {
    try {
      const result = await pool.query(
        `UPDATE security_alerts
         SET status = 'resolved',
             resolved_by = $2,
             resolved_at = NOW(),
             resolution_notes = $3,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [alertId, userId, resolution]
      );

      if (result.rows.length === 0) {
        throw new Error('Alert not found');
      }

      // Log resolution
      await auditService.log({
        userId,
        action: 'security_alert_resolved',
        resourceType: 'security_alert',
        resourceId: alertId,
        success: true,
        requestBody: { resolution }
      });

      return result.rows[0];
    } catch (error) {
      console.error('Alert resolution error:', error);
      throw error;
    }
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(timeRange = '24 hours') {
    try {
      const cacheKey = `security_metrics_${timeRange}`;
      
      // Check cache
      const cached = this.metricsCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
      }

      const query = `
        SELECT 
          COUNT(*) as total_events,
          COUNT(*) FILTER (WHERE success = false) as failed_events,
          COUNT(*) FILTER (WHERE is_suspicious = true) as suspicious_events,
          COUNT(*) FILTER (WHERE risk_level = 'high') as high_risk_events,
          COUNT(*) FILTER (WHERE risk_level = 'critical') as critical_risk_events,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT ip_address) as unique_ips,
          COUNT(*) FILTER (WHERE action = 'login_failed') as failed_logins,
          COUNT(*) FILTER (WHERE action = 'login_success') as successful_logins,
          COUNT(*) FILTER (WHERE action LIKE '%mfa%') as mfa_events
        FROM audit_logs
        WHERE timestamp > NOW() - INTERVAL '${timeRange}'
      `;

      const auditResult = await pool.query(query);
      
      const alertsQuery = `
        SELECT 
          COUNT(*) as total_alerts,
          COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
          COUNT(*) FILTER (WHERE severity = 'high') as high_alerts,
          COUNT(*) FILTER (WHERE severity = 'medium') as medium_alerts,
          COUNT(*) FILTER (WHERE severity = 'low') as low_alerts,
          COUNT(*) FILTER (WHERE status = 'open') as open_alerts,
          COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged_alerts,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved_alerts
        FROM security_alerts
        WHERE created_at > NOW() - INTERVAL '${timeRange}'
      `;

      const alertsResult = await pool.query(alertsQuery);

      const metrics = {
        timestamp: new Date(),
        timeRange,
        audit: auditResult.rows[0],
        alerts: alertsResult.rows[0]
      };

      // Cache for 5 minutes
      this.metricsCache.set(cacheKey, {
        data: metrics,
        expiresAt: Date.now() + (5 * 60 * 1000)
      });

      return metrics;
    } catch (error) {
      console.error('Get security metrics error:', error);
      throw error;
    }
  }

  /**
   * Get security dashboard data
   */
  async getDashboard() {
    try {
      const [metrics, activeAlerts, recentEvents] = await Promise.all([
        this.getSecurityMetrics('24 hours'),
        this.getActiveAlerts({ limit: 10 }),
        this.getRecentSecurityEvents(20)
      ]);

      return {
        metrics,
        activeAlerts,
        recentEvents,
        healthStatus: this.calculateHealthStatus(metrics)
      };
    } catch (error) {
      console.error('Get dashboard error:', error);
      throw error;
    }
  }

  /**
   * Calculate overall security health status
   */
  calculateHealthStatus(metrics) {
    const { audit, alerts } = metrics;

    let score = 100;
    const issues = [];

    // Check critical alerts
    if (alerts.critical_alerts > 0) {
      score -= 30;
      issues.push(`${alerts.critical_alerts} critical alerts`);
    }

    // Check high alerts
    if (alerts.high_alerts > 5) {
      score -= 20;
      issues.push(`${alerts.high_alerts} high severity alerts`);
    }

    // Check failed logins
    if (audit.failed_logins > 100) {
      score -= 15;
      issues.push('High number of failed login attempts');
    }

    // Check suspicious activities
    if (audit.suspicious_events > 50) {
      score -= 15;
      issues.push('High number of suspicious events');
    }

    // Check critical risk events
    if (audit.critical_risk_events > 10) {
      score -= 20;
      issues.push('Multiple critical risk events detected');
    }

    score = Math.max(0, score);

    let status = 'healthy';
    if (score < 50) status = 'critical';
    else if (score < 70) status = 'warning';
    else if (score < 90) status = 'caution';

    return {
      status,
      score,
      issues,
      recommendation: this.getHealthRecommendation(status, issues)
    };
  }

  /**
   * Get health recommendation
   */
  getHealthRecommendation(status, issues) {
    if (status === 'critical') {
      return 'IMMEDIATE ACTION REQUIRED: Critical security issues detected. Review all critical alerts immediately.';
    }
    if (status === 'warning') {
      return 'Security attention needed: Multiple security issues require investigation.';
    }
    if (status === 'caution') {
      return 'Monitor closely: Some security concerns detected that should be addressed.';
    }
    return 'Security posture is healthy. Continue monitoring.';
  }

  /**
   * Get recent security events
   */
  async getRecentSecurityEvents(limit = 50) {
    try {
      const result = await pool.query(
        `SELECT 
          id, user_id, username, action, resource_type, 
          ip_address, success, is_suspicious, risk_level, timestamp
         FROM audit_logs
         WHERE is_suspicious = true OR risk_level IN ('high', 'critical')
         ORDER BY timestamp DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Get recent security events error:', error);
      throw error;
    }
  }

  /**
   * Update security metrics (periodic task)
   */
  async updateSecurityMetrics() {
    try {
      // Clear cache to force refresh
      this.metricsCache.clear();

      // Get fresh metrics
      const metrics = await this.getSecurityMetrics('24 hours');

      console.log('Security metrics updated:', {
        total_events: metrics.audit.total_events,
        suspicious_events: metrics.audit.suspicious_events,
        active_alerts: metrics.alerts.open_alerts
      });

      return metrics;
    } catch (error) {
      console.error('Update security metrics error:', error);
      throw error;
    }
  }

  /**
   * Check for expiring passwords (periodic task)
   */
  async checkPasswordExpirations() {
    try {
      const query = `
        WITH latest_passwords AS (
          SELECT 
            user_id,
            MAX(changed_at) as last_changed
          FROM password_history
          GROUP BY user_id
        )
        SELECT 
          u.id,
          u.email,
          u.name,
          COALESCE(lp.last_changed, u.created_at) as last_changed,
          CURRENT_DATE - COALESCE(lp.last_changed, u.created_at)::date as days_since_change
        FROM users u
        LEFT JOIN latest_passwords lp ON u.id = lp.user_id
        WHERE u.is_active = true
          AND CURRENT_DATE - COALESCE(lp.last_changed, u.created_at)::date >= 83
        ORDER BY days_since_change DESC
      `;

      const result = await pool.query(query);

      if (result.rows.length > 0) {
        console.log(`Password expiration check: ${result.rows.length} users with expiring passwords`);
        
        // Create alert for expired passwords
        await this.createAlert({
          type: 'password_expiration_warning',
          severity: 'medium',
          title: 'Users with expiring passwords',
          description: `${result.rows.length} users have passwords that will expire soon`,
          metadata: {
            userCount: result.rows.length,
            users: result.rows.slice(0, 10) // First 10 users
          },
          recommendedAction: 'Send password expiration notifications to affected users'
        });
      }

      return result.rows;
    } catch (error) {
      console.error('Password expiration check error:', error);
      throw error;
    }
  }

  /**
   * Generate security report
   */
  async generateReport(startDate, endDate, format = 'json') {
    try {
      const query = `
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as total_events,
          COUNT(*) FILTER (WHERE success = false) as failed_events,
          COUNT(*) FILTER (WHERE is_suspicious = true) as suspicious_events,
          COUNT(*) FILTER (WHERE risk_level = 'high') as high_risk_events,
          COUNT(*) FILTER (WHERE risk_level = 'critical') as critical_risk_events,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT ip_address) as unique_ips
        FROM audit_logs
        WHERE timestamp BETWEEN $1 AND $2
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `;

      const result = await pool.query(query, [startDate, endDate]);

      const report = {
        period: {
          start: startDate,
          end: endDate
        },
        summary: {
          total_days: result.rows.length,
          total_events: result.rows.reduce((sum, row) => sum + parseInt(row.total_events), 0),
          total_suspicious: result.rows.reduce((sum, row) => sum + parseInt(row.suspicious_events), 0),
          total_high_risk: result.rows.reduce((sum, row) => sum + parseInt(row.high_risk_events), 0),
          total_critical_risk: result.rows.reduce((sum, row) => sum + parseInt(row.critical_risk_events), 0)
        },
        daily: result.rows,
        generated_at: new Date()
      };

      if (format === 'csv') {
        return this.convertReportToCSV(report);
      }

      return report;
    } catch (error) {
      console.error('Generate report error:', error);
      throw error;
    }
  }

  /**
   * Convert report to CSV
   */
  convertReportToCSV(report) {
    const headers = ['Date', 'Total Events', 'Failed Events', 'Suspicious Events', 'High Risk', 'Critical Risk', 'Unique Users', 'Unique IPs'];
    const rows = report.daily.map(row => [
      row.date,
      row.total_events,
      row.failed_events,
      row.suspicious_events,
      row.high_risk_events,
      row.critical_risk_events,
      row.unique_users,
      row.unique_ips
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }
}

// Export singleton instance
const securityMonitor = new SecurityMonitor();
export default securityMonitor;
