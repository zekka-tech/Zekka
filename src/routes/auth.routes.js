/**
 * Authentication Routes
 * =====================
 *
 * Defines all authentication-related endpoints with:
 * - Rate limiting
 * - Input validation
 * - Authentication middleware
 * - Error handling
 */

import express from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/security.middleware.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

/**
 * Public Routes (No Authentication Required)
 */

// Register new user
router.post('/register', authLimiter, authController.register);

// Login user
router.post('/login', authLimiter, authController.login);

// Verify MFA code
router.post('/mfa/verify', authLimiter, authController.verifyMFA);

// Refresh access token
router.post('/refresh-token', authController.refreshToken);

// Request password reset
router.post('/forgot-password', authLimiter, authController.forgotPassword);

// Reset password with token
router.post('/reset-password', authLimiter, authController.resetPassword);

// Verify email
router.post('/verify-email', authController.verifyEmail);

// Resend verification email
router.post('/resend-verification', authLimiter, authController.resendVerification);

/**
 * Protected Routes (Authentication Required)
 */

// Get current user
router.get('/me', authenticate, authController.getCurrentUser);

// Logout current session
router.post('/logout', authenticate, authController.logout);

// Logout all sessions
router.post('/logout-all', authenticate, authController.logoutAll);

// Change password
router.post('/change-password', authenticate, authController.changePassword);

/**
 * MFA Management Routes (Authentication Required)
 */

// Setup MFA (get QR code)
router.post('/mfa/setup', authenticate, authController.setupMFA);

// Enable MFA after setup
router.post('/mfa/enable', authenticate, authController.enableMFA);

// Disable MFA
router.post('/mfa/disable', authenticate, authController.disableMFA);

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  console.error('Auth route error:', error);

  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

export default router;
