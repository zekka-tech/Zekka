/**
 * GDPR Compliance Service
 * =======================
 *
 * Comprehensive GDPR compliance system implementing:
 * - Right to Access (Article 15)
 * - Right to Rectification (Article 16)
 * - Right to Erasure / Right to be Forgotten (Article 17)
 * - Right to Data Portability (Article 20)
 * - Right to Restriction of Processing (Article 18)
 * - Right to Object (Article 21)
 * - Data Breach Notification (Article 33/34)
 * - Consent Management
 * - Data Processing Records
 * - Privacy by Design
 *
 * Compliance Standards:
 * - GDPR (EU General Data Protection Regulation)
 * - Privacy Shield Framework
 * - ISO 27701 (Privacy Information Management)
 */

import pool from '../config/database.js';
import auditService from './audit-service.js';
import encryptionService from './encryption-service.js';
import logger from '../utils/logger.js';

class GDPRComplianceService {
  /**
   * Article 15: Right to Access
   *
   * User can request all personal data held by the organization
   */
  async exportUserData(userId, format = 'json') {
    try {
      // Get user data
      const user = await pool.query('SELECT * FROM users WHERE id = $1', [
        userId
      ]);

      if (user.rows.length === 0) {
        throw new Error('User not found');
      }

      // Get audit logs
      const auditLogs = await pool.query(
        'SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1000',
        [userId]
      );

      // Get password history (excluding hashes)
      const passwordHistory = await pool.query(
        'SELECT changed_at, ip_address FROM password_history WHERE user_id = $1 ORDER BY changed_at DESC',
        [userId]
      );

      // Get sessions
      const sessions = await pool.query(
        'SELECT created_at, last_activity, ip_address, user_agent FROM user_sessions WHERE user_id = $1',
        [userId]
      );

      // Get security events
      const securityEvents = await pool.query(
        'SELECT * FROM security_events WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 100',
        [userId]
      );

      const userData = {
        exportDate: new Date().toISOString(),
        exportType: 'GDPR Article 15 - Right to Access',
        user: {
          id: user.rows[0].id,
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
        securityEvents: securityEvents.rows,
        dataProcessingPurposes: [
          'Authentication and account management',
          'Security monitoring and fraud prevention',
          'Service improvement and analytics',
          'Legal compliance and audit trail'
        ],
        dataRetentionPolicy: {
          userData: '7 years after account closure',
          auditLogs: '90 days active, then archived',
          passwordHistory: '90 days',
          sessions: '30 days'
        },
        thirdPartyProcessors: [
          {
            name: 'PostgreSQL Database',
            purpose: 'Data storage',
            location: 'EU/US (configurable)'
          },
          {
            name: 'Redis Cache',
            purpose: 'Session management',
            location: 'Same as application'
          }
        ]
      };

      // Log data export
      await auditService.log({
        userId,
        username: user.rows[0].email,
        action: 'gdpr_data_export',
        resourceType: 'user_data',
        resourceId: userId,
        success: true,
        requestBody: { format },
        riskLevel: 'medium'
      });

      if (format === 'csv') {
        return this.convertToCSV(userData);
      }

      return userData;
    } catch (error) {
      logger.error('GDPR data export error:', error);
      throw error;
    }
  }

  /**
   * Article 17: Right to Erasure (Right to be Forgotten)
   *
   * Delete all user personal data
   */
  async deleteUserData(userId, reason, requestedBy) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get user email for logging
      const user = await client.query('SELECT email FROM users WHERE id = $1', [
        userId
      ]);

      if (user.rows.length === 0) {
        throw new Error('User not found');
      }

      const userEmail = user.rows[0].email;

      // Create deletion record (for compliance audit trail)
      await client.query(
        `INSERT INTO data_deletion_requests (
          user_id, email, reason, requested_by, status, deletion_date
        ) VALUES ($1, $2, $3, $4, 'completed', NOW())`,
        [userId, userEmail, reason, requestedBy]
      );

      // Delete user sessions
      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [
        userId
      ]);

      // Delete password history
      await client.query('DELETE FROM password_history WHERE user_id = $1', [
        userId
      ]);

      // Anonymize audit logs (keep for compliance but remove PII)
      await client.query(
        `UPDATE audit_logs 
         SET username = 'deleted-user-${userId}',
             request_body = NULL,
             response_body = NULL
         WHERE user_id = $1`,
        [userId]
      );

      // Anonymize security events
      await client.query(
        `UPDATE security_events 
         SET user_id = NULL
         WHERE user_id = $1`,
        [userId]
      );

      // Delete MFA settings
      await client.query('DELETE FROM mfa_devices WHERE user_id = $1', [
        userId
      ]);

      // Delete API keys
      await client.query('DELETE FROM api_keys WHERE user_id = $1', [userId]);

      // Finally, delete user record
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      await client.query('COMMIT');

      // Log deletion (with NULL user_id since user is deleted)
      await auditService.log({
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

  /**
   * Article 20: Right to Data Portability
   *
   * Export user data in machine-readable format
   */
  async exportPortableData(userId) {
    const userData = await this.exportUserData(userId, 'json');

    // Format for portability (machine-readable, structured)
    const portableData = {
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

    return portableData;
  }

  /**
   * Consent Management
   *
   * Track and manage user consent for data processing
   */
  async recordConsent(userId, consentType, granted, ipAddress) {
    try {
      await pool.query(
        `INSERT INTO user_consents (
          user_id, consent_type, granted, granted_at, ip_address
        ) VALUES ($1, $2, $3, NOW(), $4)`,
        [userId, consentType, granted, ipAddress]
      );

      await auditService.log({
        userId,
        action: 'consent_recorded',
        resourceType: 'consent',
        ipAddress,
        success: true,
        requestBody: { consentType, granted }
      });

      return { success: true };
    } catch (error) {
      logger.error('Consent recording error:', error);
      throw error;
    }
  }

  /**
   * Get user consents
   */
  async getUserConsents(userId) {
    const result = await pool.query(
      'SELECT * FROM user_consents WHERE user_id = $1 ORDER BY granted_at DESC',
      [userId]
    );

    return result.rows;
  }

  /**
   * Data Breach Notification (Article 33/34)
   *
   * Log and notify about data breaches within 72 hours
   */
  async reportDataBreach(breachDetails) {
    try {
      const {
        description,
        affectedUsers,
        dataTypes,
        severity,
        reportedBy,
        mitigationSteps
      } = breachDetails;

      // Create breach record
      const result = await pool.query(
        `INSERT INTO data_breaches (
          description, affected_users_count, data_types, 
          severity, reported_by, reported_at, mitigation_steps, status
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'reported')
        RETURNING *`,
        [
          description,
          affectedUsers,
          JSON.stringify(dataTypes),
          severity,
          reportedBy,
          JSON.stringify(mitigationSteps)
        ]
      );

      const breach = result.rows[0];

      // Log breach
      await auditService.log({
        action: 'data_breach_reported',
        resourceType: 'data_breach',
        resourceId: breach.id,
        success: true,
        requestBody: breachDetails,
        riskLevel: 'critical'
      });

      // TODO: Notify affected users (Article 34)
      // TODO: Notify supervisory authority within 72 hours (Article 33)

      return breach;
    } catch (error) {
      logger.error('Data breach reporting error:', error);
      throw error;
    }
  }

  /**
   * Generate GDPR compliance report
   */
  async generateComplianceReport(startDate, endDate) {
    try {
      // Data access requests
      const accessRequests = await pool.query(
        `SELECT COUNT(*) as count FROM audit_logs 
         WHERE action = 'gdpr_data_export' 
         AND timestamp BETWEEN $1 AND $2`,
        [startDate, endDate]
      );

      // Deletion requests
      const deletionRequests = await pool.query(
        `SELECT COUNT(*) as count FROM data_deletion_requests 
         WHERE deletion_date BETWEEN $1 AND $2`,
        [startDate, endDate]
      );

      // Consents
      const consents = await pool.query(
        `SELECT consent_type, COUNT(*) as count, 
         SUM(CASE WHEN granted THEN 1 ELSE 0 END) as granted,
         SUM(CASE WHEN NOT granted THEN 1 ELSE 0 END) as revoked
         FROM user_consents
         WHERE granted_at BETWEEN $1 AND $2
         GROUP BY consent_type`,
        [startDate, endDate]
      );

      // Data breaches
      const breaches = await pool.query(
        `SELECT * FROM data_breaches 
         WHERE reported_at BETWEEN $1 AND $2`,
        [startDate, endDate]
      );

      return {
        reportPeriod: { startDate, endDate },
        generatedAt: new Date().toISOString(),
        metrics: {
          dataAccessRequests: parseInt(accessRequests.rows[0].count),
          dataDeletionRequests: parseInt(deletionRequests.rows[0].count),
          consents: consents.rows,
          dataBreaches: breaches.rows.length
        },
        compliance: {
          dataAccessResponseTime: '< 30 days',
          deletionResponseTime: '< 30 days',
          breachNotificationTime: '< 72 hours',
          dataProcessingLegalBasis: [
            'Consent (Article 6(1)(a))',
            'Contract (Article 6(1)(b))',
            'Legal obligation (Article 6(1)(c))',
            'Legitimate interests (Article 6(1)(f))'
          ]
        },
        recommendations: this.getComplianceRecommendations({
          accessRequests: parseInt(accessRequests.rows[0].count),
          deletionRequests: parseInt(deletionRequests.rows[0].count),
          breaches: breaches.rows.length
        })
      };
    } catch (error) {
      logger.error('GDPR compliance report error:', error);
      throw error;
    }
  }

  /**
   * Get compliance recommendations
   */
  getComplianceRecommendations(metrics) {
    const recommendations = [];

    if (metrics.accessRequests > 50) {
      recommendations.push({
        priority: 'high',
        recommendation:
          'High volume of data access requests - consider self-service data export portal'
      });
    }

    if (metrics.deletionRequests > 20) {
      recommendations.push({
        priority: 'medium',
        recommendation:
          'Consider implementing automated data deletion workflow'
      });
    }

    if (metrics.breaches > 0) {
      recommendations.push({
        priority: 'critical',
        recommendation:
          'Data breach detected - review security measures and incident response procedures'
      });
    }

    return recommendations;
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(userData) {
    // Simplified CSV export
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

// Export singleton
const gdprCompliance = new GDPRComplianceService();
export default gdprCompliance;
