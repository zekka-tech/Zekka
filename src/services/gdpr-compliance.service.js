/**
 * GDPR Compliance Service
 */

const { pool: defaultPool } = require('../config/database');
const { AuditLogger } = require('../utils/audit-logger');
const logger = require('../utils/logger');

function loadOptionalDependency(load, fallback) {
  try {
    return load();
  } catch (error) {
    logger.warn(`Optional GDPR dependency unavailable, using fallback: ${error.message}`);
    return fallback;
  }
}

function createAuditServiceAdapter() {
  const auditLogger = new AuditLogger();

  return {
    log(event) {
      return auditLogger.log({
        category: 'data_access',
        severity: event.riskLevel === 'high' ? 'warning' : 'info',
        action: event.action,
        message: event.action,
        actor: {
          id: event.userId,
          email: event.username
        },
        target: {
          type: event.resourceType,
          id: event.resourceId
        },
        ipAddress: event.ipAddress,
        additionalData: event.requestBody || {}
      });
    }
  };
}

class GDPRComplianceService {
  constructor(
    pool = defaultPool,
    {
      auditService = loadOptionalDependency(
        () => require('./audit-service'),
        createAuditServiceAdapter()
      ),
      encryptionService = loadOptionalDependency(
        () => require('./encryption-service'),
        null
      )
    } = {}
  ) {
    this.pool = pool;
    this.auditService = auditService;
    this.encryptionService = encryptionService;
  }

  async exportUserData(userId, format = 'json') {
    try {
      const user = await this.pool.query('SELECT * FROM users WHERE user_id = $1 OR CAST(id AS TEXT) = $1', [
        userId
      ]);

      if (user.rows.length === 0) {
        throw new Error('User not found');
      }

      const auditLogs = await this.pool.query(
        'SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1000',
        [userId]
      );

      const passwordHistory = await this.pool.query(
        'SELECT changed_at, ip_address FROM password_history WHERE user_id = $1 ORDER BY changed_at DESC',
        [userId]
      );

      const sessions = await this.pool.query(
        'SELECT created_at, last_activity, ip_address, user_agent FROM user_sessions WHERE user_id = $1',
        [userId]
      );

      const securityEvents = await this.pool.query(
        'SELECT * FROM security_events WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 100',
        [userId]
      );

      const userData = {
        exportDate: new Date().toISOString(),
        exportType: 'GDPR Article 15 - Right to Access',
        user: {
          id: user.rows[0].user_id || user.rows[0].id,
          email: user.rows[0].email,
          name: user.rows[0].name,
          role: user.rows[0].role,
          createdAt: user.rows[0].created_at,
          lastLogin: user.rows[0].last_login,
          emailVerified: user.rows[0].email_verified,
          mfaEnabled: user.rows[0].mfa_enabled
        },
        auditLogs: auditLogs.rows.map((log) => ({
          action: log.action,
          timestamp: log.timestamp,
          ipAddress: log.ip_address,
          success: log.success,
          resourceType: log.resource_type
        })),
        passwordHistory: passwordHistory.rows,
        sessions: sessions.rows,
        securityEvents: securityEvents.rows
      };

      await this.auditService.log({
        userId,
        username: user.rows[0].email,
        action: 'gdpr_data_export',
        resourceType: 'user_data',
        resourceId: userId,
        success: true,
        requestBody: { format },
        riskLevel: 'medium'
      });

      return format === 'csv' ? this.convertToCSV(userData) : userData;
    } catch (error) {
      logger.error('GDPR data export error:', error);
      throw error;
    }
  }

  async deleteUserData(userId, reason, requestedBy) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const user = await client.query(
        'SELECT email FROM users WHERE user_id = $1 OR CAST(id AS TEXT) = $1',
        [userId]
      );

      if (user.rows.length === 0) {
        throw new Error('User not found');
      }

      const userEmail = user.rows[0].email;

      await client.query(
        `INSERT INTO data_deletion_requests (
          user_id, email, reason, requested_by, status, deletion_date
        ) VALUES ($1, $2, $3, $4, 'completed', NOW())`,
        [userId, userEmail, reason, requestedBy]
      );

      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [
        userId
      ]);
      await client.query('DELETE FROM password_history WHERE user_id = $1', [
        userId
      ]);
      await client.query(
        `UPDATE audit_logs
         SET username = $2,
             request_body = NULL,
             response_body = NULL
         WHERE user_id = $1`,
        [userId, `deleted-user-${userId}`]
      );
      await client.query(
        `UPDATE security_events
         SET user_id = NULL
         WHERE user_id = $1`,
        [userId]
      );
      await client.query('DELETE FROM mfa_devices WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM api_keys WHERE user_id = $1', [userId]);
      await client.query(
        'DELETE FROM users WHERE user_id = $1 OR CAST(id AS TEXT) = $1',
        [userId]
      );

      await client.query('COMMIT');

      await this.auditService.log({
        userId: null,
        username: `deleted-${userEmail}`,
        action: 'gdpr_data_deletion',
        resourceType: 'user_data',
        resourceId: userId,
        success: true,
        requestBody: { reason, requestedBy },
        riskLevel: 'high'
      });

      return {
        success: true,
        message: 'All user data has been permanently deleted',
        userId,
        deletionDate: new Date().toISOString(),
        reason
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('GDPR data deletion error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async exportPortableData(userId) {
    const userData = await this.exportUserData(userId, 'json');

    return {
      format: 'JSON-LD',
      version: '1.0',
      exportDate: new Date().toISOString(),
      user: userData.user,
      data: {
        profile: {
          email: userData.user.email,
          name: userData.user.name,
          created: userData.user.createdAt
        },
        activity: userData.auditLogs,
        security: {
          passwordChanges: userData.passwordHistory.length,
          activeSessions: userData.sessions.length,
          securityEvents: userData.securityEvents.length
        }
      }
    };
  }

  convertToCSV(userData) {
    const csv = [];
    csv.push(`GDPR Data Export - ${userData.user.email}`);
    csv.push(`Export Date: ${userData.exportDate}`);
    csv.push('');
    csv.push('User Information');
    csv.push('ID,Email,Name,Role,Created At');
    csv.push(
      `${userData.user.id},${userData.user.email},${userData.user.name},${userData.user.role},${userData.user.createdAt}`
    );

    return csv.join('\n');
  }
}

const gdprCompliance = new GDPRComplianceService();

module.exports = GDPRComplianceService;
module.exports.GDPRComplianceService = GDPRComplianceService;
module.exports.gdprCompliance = gdprCompliance;
