/**
 * Session 2 Security Enhancement Routes
 * =====================================
 * 
 * API routes for:
 * - Multi-factor authentication (MFA)
 * - Audit logging and compliance
 * - Encryption key management
 * - Password policies
 * - Security monitoring and alerts
 */

import express from 'express';
import authService from '../services/auth-service.js';
import auditService from '../services/audit-service.js';
import encryptionService from '../services/encryption-service.js';
import passwordService from '../services/password-service.js';
import securityMonitor from '../services/security-monitor.js';

const router = express.Router();

// ============================================================================
// MFA (Multi-Factor Authentication) Routes
// ============================================================================

/**
 * Setup MFA for current user
 * POST /api/auth/mfa/setup
 */
router.post('/auth/mfa/setup', async (req, res) => {
  try {
    const userId = req.user.id; // From JWT middleware

    const result = await authService.setupMFA(userId);

    res.json({
      success: true,
      message: 'MFA setup initiated',
      data: result
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Enable MFA after verification
 * POST /api/auth/mfa/enable
 */
router.post('/auth/mfa/enable', async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Verification code is required'
      });
    }

    const result = await authService.enableMFA(userId, code);

    res.json({
      success: true,
      message: result.message,
      backupCodes: result.backupCodes
    });
  } catch (error) {
    console.error('MFA enable error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Disable MFA
 * POST /api/auth/mfa/disable
 */
router.post('/auth/mfa/disable', async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required to disable MFA'
      });
    }

    const result = await authService.disableMFA(userId, password);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('MFA disable error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Verify MFA code during login
 * POST /api/auth/mfa/verify
 */
router.post('/auth/mfa/verify', async (req, res) => {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json({
        success: false,
        error: 'Temporary token and code are required'
      });
    }

    const result = await authService.verifyMFA(
      tempToken,
      code,
      req.ip,
      req.get('user-agent')
    );

    res.json({
      success: true,
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn
    });
  } catch (error) {
    console.error('MFA verify error:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Audit Logging Routes
// ============================================================================

/**
 * Query audit logs (admin only)
 * GET /api/audit/logs
 */
router.get('/audit/logs', async (req, res) => {
  try {
    // Check admin permission
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const filters = {
      userId: req.query.userId,
      action: req.query.action,
      success: req.query.success === 'true' ? true : req.query.success === 'false' ? false : undefined,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      ipAddress: req.query.ipAddress,
      resourceType: req.query.resourceType,
      isSuspicious: req.query.isSuspicious === 'true',
      riskLevel: req.query.riskLevel
    };

    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      sortBy: req.query.sortBy || 'timestamp',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const result = await auditService.query(filters, pagination);

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Query audit logs error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get audit statistics
 * GET /api/audit/statistics
 */
router.get('/audit/statistics', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const timeRange = req.query.timeRange || '24 hours';
    const stats = await auditService.getStatistics(timeRange);

    res.json({
      success: true,
      data: stats,
      timeRange
    });
  } catch (error) {
    console.error('Get audit statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Export audit logs (admin only)
 * GET /api/audit/export
 */
router.get('/audit/export', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const filters = {
      userId: req.query.userId,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const format = req.query.format || 'json';
    const logs = await auditService.exportLogs(filters, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
      res.send(logs);
    } else {
      res.json({
        success: true,
        data: logs
      });
    }
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Archive old audit logs (admin only)
 * POST /api/audit/archive
 */
router.post('/audit/archive', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const archived = await auditService.archiveOldLogs();

    res.json({
      success: true,
      message: `Archived ${archived} audit logs`,
      archivedCount: archived
    });
  } catch (error) {
    console.error('Archive audit logs error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Encryption Key Management Routes
// ============================================================================

/**
 * Get encryption key status (admin only)
 * GET /api/security/encryption/status
 */
router.get('/security/encryption/status', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const status = await encryptionService.getKeyStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get encryption status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Check if key rotation is needed (admin only)
 * GET /api/security/encryption/rotation-check
 */
router.get('/security/encryption/rotation-check', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const check = await encryptionService.checkKeyRotation();

    res.json({
      success: true,
      data: check
    });
  } catch (error) {
    console.error('Check key rotation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Rotate encryption key (admin only)
 * POST /api/security/encryption/rotate
 */
router.post('/security/encryption/rotate', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { reEncrypt } = req.body;
    const result = await encryptionService.rotateKey(req.user.id, reEncrypt);

    res.json({
      success: true,
      message: result.message,
      data: {
        version: result.version,
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Rotate encryption key error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate new encryption key (admin only)
 * POST /api/security/encryption/generate
 */
router.post('/security/encryption/generate', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { description } = req.body;
    const result = await encryptionService.generateNewKey(description, req.user.id);

    res.json({
      success: true,
      message: result.message,
      data: {
        version: result.version,
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Generate encryption key error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Revoke encryption key (admin only)
 * POST /api/security/encryption/revoke
 */
router.post('/security/encryption/revoke', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { version, reason } = req.body;

    if (!version || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Version and reason are required'
      });
    }

    const result = await encryptionService.revokeKey(version, reason, req.user.id);

    res.json({
      success: true,
      message: result.message,
      data: {
        version: result.version,
        status: result.status
      }
    });
  } catch (error) {
    console.error('Revoke encryption key error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Password Policy Routes
// ============================================================================

/**
 * Get password policy
 * GET /api/security/password/policy
 */
router.get('/security/password/policy', (req, res) => {
  try {
    const policy = passwordService.getPolicy();

    res.json({
      success: true,
      data: policy
    });
  } catch (error) {
    console.error('Get password policy error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update password policy (admin only)
 * PUT /api/security/password/policy
 */
router.put('/security/password/policy', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const result = await passwordService.updatePolicy(req.body, req.user.id);

    res.json({
      success: true,
      message: result.message,
      policy: result.policy
    });
  } catch (error) {
    console.error('Update password policy error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Check password expiration
 * GET /api/security/password/expiration
 */
router.get('/security/password/expiration', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await passwordService.checkPasswordExpiration(userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Check password expiration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get password expiration report (admin only)
 * GET /api/security/password/expiration-report
 */
router.get('/security/password/expiration-report', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const report = await passwordService.getPasswordExpirationReport();

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Get password expiration report error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Force password reset for user (admin only)
 * POST /api/security/password/force-reset
 */
router.post('/security/password/force-reset', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { userId, reason } = req.body;

    if (!userId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'User ID and reason are required'
      });
    }

    const result = await passwordService.forcePasswordReset(userId, reason, req.user.id);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Force password reset error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Validate password strength
 * POST /api/security/password/validate
 */
router.post('/security/password/validate', (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      });
    }

    const userInfo = {
      email: req.user?.email,
      name: req.user?.name
    };

    const result = passwordService.validatePassword(password, userInfo);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Validate password error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Security Monitoring Routes
// ============================================================================

/**
 * Get security dashboard
 * GET /api/security/dashboard
 */
router.get('/security/dashboard', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const dashboard = await securityMonitor.getDashboard();

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Get security dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get security metrics
 * GET /api/security/metrics
 */
router.get('/security/metrics', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const timeRange = req.query.timeRange || '24 hours';
    const metrics = await securityMonitor.getSecurityMetrics(timeRange);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Get security metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get active security alerts
 * GET /api/security/alerts
 */
router.get('/security/alerts', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const filters = {
      severity: req.query.severity,
      type: req.query.type,
      limit: parseInt(req.query.limit) || 50
    };

    const alerts = await securityMonitor.getActiveAlerts(filters);

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Get security alerts error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Acknowledge security alert
 * POST /api/security/alerts/:id/acknowledge
 */
router.post('/security/alerts/:id/acknowledge', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const alertId = req.params.id;
    const { notes } = req.body;

    const result = await securityMonitor.acknowledgeAlert(alertId, req.user.id, notes);

    res.json({
      success: true,
      message: 'Alert acknowledged',
      data: result
    });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Resolve security alert
 * POST /api/security/alerts/:id/resolve
 */
router.post('/security/alerts/:id/resolve', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const alertId = req.params.id;
    const { resolution } = req.body;

    if (!resolution) {
      return res.status(400).json({
        success: false,
        error: 'Resolution notes are required'
      });
    }

    const result = await securityMonitor.resolveAlert(alertId, req.user.id, resolution);

    res.json({
      success: true,
      message: 'Alert resolved',
      data: result
    });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Run security threat check (admin only)
 * POST /api/security/check-threats
 */
router.post('/security/check-threats', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const threats = await securityMonitor.checkSecurityThreats();

    res.json({
      success: true,
      message: 'Security threat check completed',
      data: threats
    });
  } catch (error) {
    console.error('Check security threats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate security report (admin only)
 * GET /api/security/report
 */
router.get('/security/report', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { startDate, endDate, format } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    const report = await securityMonitor.generateReport(
      new Date(startDate),
      new Date(endDate),
      format || 'json'
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=security-report.csv');
      res.send(report);
    } else {
      res.json({
        success: true,
        data: report
      });
    }
  } catch (error) {
    console.error('Generate security report error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
