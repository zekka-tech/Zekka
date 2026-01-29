/**
 * Enhanced Audit Logging Service
 * =============================
 *
 * Comprehensive audit logging with retention policies, security monitoring,
 * and compliance features (GDPR, SOC 2, PCI DSS).
 *
 * Features:
 * - Automatic audit trail for all system activities
 * - Retention policies with automatic archiving
 * - Suspicious activity detection
 * - Performance metrics tracking
 * - Geo-location tracking
 * - GDPR compliance (right to be forgotten)
 */

import geoip from 'geoip-lite';
import pool from '../config/database.js';
import logger from '../utils/logger.js';

class AuditService {
  /**
   * Log an audit event
   *
   * @param {Object} options - Audit log options
   * @param {number} options.userId - User ID (optional)
   * @param {string} options.username - Username (optional)
   * @param {string} options.action - Action performed (required)
   * @param {string} options.resourceType - Type of resource accessed
   * @param {string} options.resourceId - ID of resource accessed
   * @param {string} options.method - HTTP method (GET, POST, etc.)
   * @param {string} options.endpoint - API endpoint
   * @param {string} options.ipAddress - Client IP address
   * @param {string} options.userAgent - User agent string
   * @param {string} options.sessionId - Session ID
   * @param {number} options.apiKeyId - API key ID if used
   * @param {Object} options.requestBody - Request payload (sanitized)
   * @param {number} options.responseStatus - HTTP response status
   * @param {Object} options.responseBody - Response payload (sanitized)
   * @param {boolean} options.success - Whether operation succeeded
   * @param {string} options.errorMessage - Error message if failed
   * @param {string} options.errorCode - Error code if failed
   * @param {number} options.durationMs - Operation duration in milliseconds
   * @param {boolean} options.isSuspicious - Flag suspicious activity
   * @param {string} options.riskLevel - Risk level (low, medium, high, critical)
   * @param {number} options.retentionDays - Custom retention period
   * @returns {Promise<Object>} Created audit log entry
   */
  async log(options) {
    try {
      // Sanitize request/response bodies (remove sensitive data)
      const sanitizedRequest = this.sanitizeData(options.requestBody);
      const sanitizedResponse = this.sanitizeData(options.responseBody);

      // Get geo-location from IP
      const geo = options.ipAddress ? geoip.lookup(options.ipAddress) : null;

      // Detect suspicious activity
      const isSuspicious = options.isSuspicious || (await this.detectSuspiciousActivity(options));

      // Determine risk level
      const riskLevel = options.riskLevel || this.calculateRiskLevel(options, isSuspicious);

      const query = `
        INSERT INTO audit_logs (
          user_id, username, action, resource_type, resource_id,
          method, endpoint, ip_address, user_agent, session_id, api_key_id,
          request_body, response_status, response_body,
          success, error_message, error_code, duration_ms,
          is_suspicious, risk_level,
          country_code, city, retention_days
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $14,
          $15, $16, $17, $18,
          $19, $20,
          $21, $22, $23
        )
        RETURNING *
      `;

      const values = [
        options.userId || null,
        options.username || null,
        options.action,
        options.resourceType || null,
        options.resourceId || null,
        options.method || null,
        options.endpoint || null,
        options.ipAddress || null,
        options.userAgent || null,
        options.sessionId || null,
        options.apiKeyId || null,
        sanitizedRequest,
        options.responseStatus || null,
        sanitizedResponse,
        options.success !== false, // Default to true
        options.errorMessage || null,
        options.errorCode || null,
        options.durationMs || null,
        isSuspicious,
        riskLevel,
        geo?.country || null,
        geo?.city || null,
        options.retentionDays || 90
      ];

      const result = await pool.query(query, values);

      // If suspicious or high risk, create security event
      if (isSuspicious || ['high', 'critical'].includes(riskLevel)) {
        await this.createSecurityEvent({
          eventType: options.action,
          severity: riskLevel === 'critical' ? 'critical' : 'high',
          category: this.categorizeAction(options.action),
          userId: options.userId,
          ipAddress: options.ipAddress,
          description: `Suspicious activity detected: ${options.action}`,
          details: {
            auditLogId: result.rows[0].id,
            endpoint: options.endpoint,
            method: options.method
          }
        });
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Audit logging error:', error);
      // Don't throw - audit failures shouldn't break the application
      return null;
    }
  }

  /**
   * Sanitize sensitive data from request/response
   */
  sanitizeData(data) {
    if (!data) return null;

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'creditCard',
      'ssn',
      'api_key',
      'access_token',
      'refresh_token',
      'private_key'
    ];

    const sanitize = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj;

      const sanitized = Array.isArray(obj) ? [] : {};

      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();

        if (sensitiveFields.some((field) => lowerKey.includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = sanitize(value);
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    };

    return sanitize(data);
  }

  /**
   * Detect suspicious activity
   */
  async detectSuspiciousActivity(options) {
    // Check for rapid successive requests (potential brute force)
    if (options.userId && options.success === false) {
      const recentFailures = await this.getRecentFailedAttempts(
        options.userId,
        options.action,
        5 // minutes
      );

      if (recentFailures >= 5) {
        return true;
      }
    }

    // Check for unusual IP addresses
    if (options.userId && options.ipAddress) {
      const knownIPs = await this.getUserKnownIPs(options.userId);
      if (knownIPs.length > 0 && !knownIPs.includes(options.ipAddress)) {
        return true; // New IP address
      }
    }

    // Check for suspicious actions
    const suspiciousActions = [
      'unauthorized_access_attempt',
      'privilege_escalation',
      'data_export_large',
      'multiple_failed_logins',
      'api_key_leak_detected'
    ];

    if (suspiciousActions.includes(options.action)) {
      return true;
    }

    return false;
  }

  /**
   * Calculate risk level based on activity
   */
  calculateRiskLevel(options, isSuspicious) {
    if (isSuspicious) {
      return 'high';
    }

    if (!options.success) {
      if (['login', 'mfa_verify', 'password_reset'].includes(options.action)) {
        return 'medium';
      }
      return 'low';
    }

    if (
      ['admin_action', 'user_delete', 'key_rotation'].includes(options.action)
    ) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Categorize action for security events
   */
  categorizeAction(action) {
    const authActions = [
      'login',
      'logout',
      'register',
      'password_change',
      'mfa_setup'
    ];
    const authzActions = ['permission_denied', 'unauthorized_access'];
    const dataActions = ['data_export', 'data_delete', 'data_update'];
    const apiActions = ['rate_limit_exceeded', 'invalid_api_key'];

    if (authActions.some((a) => action.includes(a))) return 'authentication';
    if (authzActions.some((a) => action.includes(a))) return 'authorization';
    if (dataActions.some((a) => action.includes(a))) return 'data_access';
    if (apiActions.some((a) => action.includes(a))) return 'api_abuse';

    return 'security_violation';
  }

  /**
   * Get recent failed attempts for a user
   */
  async getRecentFailedAttempts(userId, action, minutes = 5) {
    const query = `
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE user_id = $1
        AND action = $2
        AND success = false
        AND timestamp > NOW() - INTERVAL '${minutes} minutes'
    `;

    const result = await pool.query(query, [userId, action]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get user's known IP addresses
   */
  async getUserKnownIPs(userId, days = 30) {
    const query = `
      SELECT DISTINCT ip_address
      FROM audit_logs
      WHERE user_id = $1
        AND success = true
        AND timestamp > NOW() - INTERVAL '${days} days'
        AND ip_address IS NOT NULL
      LIMIT 10
    `;

    const result = await pool.query(query, [userId]);
    return result.rows.map((row) => row.ip_address);
  }

  /**
   * Create security event
   */
  async createSecurityEvent(options) {
    const query = `
      INSERT INTO security_events (
        event_type, severity, category, user_id,
        resource_type, resource_id, description, details,
        ip_address, user_agent, endpoint, method,
        requires_manual_review
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
      RETURNING *
    `;

    const values = [
      options.eventType,
      options.severity,
      options.category,
      options.userId || null,
      options.resourceType || null,
      options.resourceId || null,
      options.description,
      options.details,
      options.ipAddress || null,
      options.userAgent || null,
      options.endpoint || null,
      options.method || null,
      ['high', 'critical'].includes(options.severity)
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Query audit logs with filters
   */
  async query(filters = {}, pagination = {}) {
    const {
      userId,
      action,
      success,
      startDate,
      endDate,
      ipAddress,
      resourceType,
      isSuspicious,
      riskLevel
    } = filters;

    const {
      page = 1,
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = 'DESC'
    } = pagination;

    const conditions = [];
    const values = [];
    let paramCount = 0;

    if (userId) {
      paramCount++;
      conditions.push(`user_id = $${paramCount}`);
      values.push(userId);
    }

    if (action) {
      paramCount++;
      conditions.push(`action = $${paramCount}`);
      values.push(action);
    }

    if (success !== undefined) {
      paramCount++;
      conditions.push(`success = $${paramCount}`);
      values.push(success);
    }

    if (startDate) {
      paramCount++;
      conditions.push(`timestamp >= $${paramCount}`);
      values.push(startDate);
    }

    if (endDate) {
      paramCount++;
      conditions.push(`timestamp <= $${paramCount}`);
      values.push(endDate);
    }

    if (ipAddress) {
      paramCount++;
      conditions.push(`ip_address = $${paramCount}`);
      values.push(ipAddress);
    }

    if (resourceType) {
      paramCount++;
      conditions.push(`resource_type = $${paramCount}`);
      values.push(resourceType);
    }

    if (isSuspicious !== undefined) {
      paramCount++;
      conditions.push(`is_suspicious = $${paramCount}`);
      values.push(isSuspicious);
    }

    if (riskLevel) {
      paramCount++;
      conditions.push(`risk_level = $${paramCount}`);
      values.push(riskLevel);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const offset = (page - 1) * limit;

    const query = `
      SELECT *
      FROM audit_logs
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    values.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs
      ${whereClause}
    `;

    const [logs, count] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, values.slice(0, paramCount))
    ]);

    return {
      logs: logs.rows,
      pagination: {
        page,
        limit,
        total: parseInt(count.rows[0].total),
        pages: Math.ceil(count.rows[0].total / limit)
      }
    };
  }

  /**
   * Archive old audit logs based on retention policy
   */
  async archiveOldLogs() {
    try {
      const result = await pool.query('SELECT archive_old_audit_logs()');
      const archived = result.rows[0].archive_old_audit_logs;

      logger.info(`Archived ${archived} audit logs`);
      return archived;
    } catch (error) {
      logger.error('Error archiving audit logs:', error);
      throw error;
    }
  }

  /**
   * Delete archived audit logs older than 1 year
   */
  async deleteArchivedLogs() {
    try {
      const result = await pool.query('SELECT delete_archived_audit_logs()');
      const deleted = result.rows[0].delete_archived_audit_logs;

      logger.info(`Deleted ${deleted} archived audit logs`);
      return deleted;
    } catch (error) {
      logger.error('Error deleting archived logs:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getStatistics(timeRange = '24 hours') {
    const query = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE success = true) as successful_events,
        COUNT(*) FILTER (WHERE success = false) as failed_events,
        COUNT(*) FILTER (WHERE is_suspicious = true) as suspicious_events,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT ip_address) as unique_ips,
        AVG(duration_ms) as avg_duration_ms,
        COUNT(*) FILTER (WHERE risk_level = 'high') as high_risk_events,
        COUNT(*) FILTER (WHERE risk_level = 'critical') as critical_risk_events
      FROM audit_logs
      WHERE timestamp > NOW() - INTERVAL '${timeRange}'
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }

  /**
   * Export audit logs for compliance (GDPR, SOC 2)
   */
  async exportLogs(filters, format = 'json') {
    const { logs } = await this.query(filters, { limit: 10000 });

    if (format === 'csv') {
      return this.convertToCSV(logs);
    }

    return logs;
  }

  /**
   * Convert logs to CSV format
   */
  convertToCSV(logs) {
    if (logs.length === 0) return '';

    const headers = Object.keys(logs[0]);
    const rows = logs.map((log) => headers
      .map((header) => {
        const value = log[header];
        if (value === null) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value).replace(/"/g, '""');
      })
      .map((v) => `"${v}"`)
      .join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * GDPR: Delete user's audit logs (right to be forgotten)
   */
  async deleteUserLogs(userId) {
    const query = `
      DELETE FROM audit_logs
      WHERE user_id = $1
      RETURNING COUNT(*) as deleted_count
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }
}

export default new AuditService();
