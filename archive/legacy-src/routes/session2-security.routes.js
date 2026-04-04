/**
 * Archived legacy route module.
 *
 * This file is intentionally kept outside `src/` because it depends on the
 * retired Session 2 security service layer (`archive/legacy-src/services/auth-service.js`
 * and related ESM modules) and is not mounted by the active runtime.
 *
 * Archived on 2026-04-03 after the backend auth path was consolidated around
 * `src/services/auth.service.js` and `src/routes/auth.routes.js`.
 */

import express from 'express';
import authService from '../services/auth-service.js';
import auditService from '../../../src/services/audit-service.js';
import encryptionService from '../../../src/services/encryption-service.js';
import passwordService from '../../../src/services/password-service.js';
import securityMonitor from '../../../src/services/security-monitor.js';

const router = express.Router();

// ============================================================================
// MFA (Multi-Factor Authentication) Routes
// ============================================================================

router.post('/auth/mfa/setup', async (req, res) => {
  try {
    const userId = req.user.id;
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

router.get('/audit/logs', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const filters = {
      userId: req.query.userId,
      action: req.query.action,
      success:
        req.query.success === 'true'
          ? true
          : req.query.success === 'false'
            ? false
            : undefined,
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

router.get('/audit/statistics', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate || new Date();

    const stats = await auditService.getStatistics(startDate, endDate);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get audit statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/security/password-policy', async (req, res) => {
  try {
    res.json({
      success: true,
      data: passwordService.getPolicy()
    });
  } catch (error) {
    console.error('Get password policy error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/security/password/validate', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      });
    }

    const validation = await passwordService.validatePassword(
      password,
      req.user?.id
    );

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Validate password error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/security/encryption/status', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const status = await encryptionService.getStatus();

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

router.get('/security/monitoring/alerts', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const alerts = await securityMonitor.getRecentAlerts();

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

export default router;
