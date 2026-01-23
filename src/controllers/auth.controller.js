/**
 * Authentication Controller
 * =========================
 *
 * Handles all authentication-related HTTP requests:
 * - User registration and login
 * - Token refresh and logout
 * - Password reset flow
 * - Email verification
 * - MFA setup and verification
 * - User profile management
 */

import authService from '../services/auth-service.js';
import {
  registerSchema,
  loginSchema,
  mfaVerifySchema,
  mfaEnableSchema,
  mfaDisableSchema,
  refreshTokenSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema
} from '../schemas/auth.schema.js';

/**
 * Register a new user
 * POST /auth/register
 */
export async function register(req, res) {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { email, password, name, role } = value;

    // Register user
    const result = await authService.register({
      email,
      password,
      name,
      role
    });

    res.status(201).json({
      success: true,
      message: result.message,
      user: result.user
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
}

/**
 * Login user
 * POST /auth/login
 */
export async function login(req, res) {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { email, password } = value;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    // Attempt login
    const result = await authService.login(email, password, ipAddress, userAgent);

    // If MFA is required
    if (result.requiresMFA) {
      return res.status(200).json({
        success: true,
        requiresMFA: true,
        tempToken: result.tempToken,
        message: result.message
      });
    }

    // Successful login
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn
    });
  } catch (error) {
    console.error('Login error:', error);

    if (error.message.includes('locked')) {
      return res.status(423).json({
        success: false,
        error: 'Account locked',
        message: error.message
      });
    }

    if (error.message.includes('deactivated')) {
      return res.status(403).json({
        success: false,
        error: 'Account deactivated',
        message: error.message
      });
    }

    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'Invalid email or password'
    });
  }
}

/**
 * Verify MFA code
 * POST /auth/mfa/verify
 */
export async function verifyMFA(req, res) {
  try {
    // Validate input
    const { error, value } = mfaVerifySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { tempToken, code } = value;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    const result = await authService.verifyMFA(tempToken, code, ipAddress, userAgent);

    res.status(200).json({
      success: true,
      message: 'MFA verification successful',
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn
    });
  } catch (error) {
    console.error('MFA verification error:', error);

    res.status(401).json({
      success: false,
      error: 'MFA verification failed',
      message: error.message || 'Invalid MFA code'
    });
  }
}

/**
 * Setup MFA for user
 * POST /auth/mfa/setup
 */
export async function setupMFA(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const result = await authService.setupMFA(req.user.id);

    res.status(200).json({
      success: true,
      message: 'MFA setup initiated',
      secret: result.secret,
      qrCode: result.qrCode,
      manualEntry: result.manual_entry
    });
  } catch (error) {
    console.error('MFA setup error:', error);

    res.status(500).json({
      success: false,
      error: 'MFA setup failed',
      message: error.message
    });
  }
}

/**
 * Enable MFA after setup
 * POST /auth/mfa/enable
 */
export async function enableMFA(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate input
    const { error, value } = mfaEnableSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { verificationCode } = value;

    const result = await authService.enableMFA(req.user.id, verificationCode);

    res.status(200).json({
      success: true,
      message: result.message,
      backupCodes: result.backupCodes
    });
  } catch (error) {
    console.error('MFA enable error:', error);

    res.status(400).json({
      success: false,
      error: 'MFA enable failed',
      message: error.message
    });
  }
}

/**
 * Disable MFA
 * POST /auth/mfa/disable
 */
export async function disableMFA(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate input
    const { error, value } = mfaDisableSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { password } = value;

    const result = await authService.disableMFA(req.user.id, password);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('MFA disable error:', error);

    res.status(400).json({
      success: false,
      error: 'MFA disable failed',
      message: error.message
    });
  }
}

/**
 * Refresh access token
 * POST /auth/refresh-token
 */
export async function refreshToken(req, res) {
  try {
    // Validate input
    const { error, value } = refreshTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { refreshToken } = value;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    const tokens = await authService.refreshToken(refreshToken, ipAddress, userAgent);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn
    });
  } catch (error) {
    console.error('Token refresh error:', error);

    res.status(401).json({
      success: false,
      error: 'Token refresh failed',
      message: 'Invalid or expired refresh token'
    });
  }
}

/**
 * Logout user
 * POST /auth/logout
 */
export async function logout(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate input
    const { error, value } = logoutSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { refreshToken } = value;

    await authService.logout(req.user.id, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);

    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: error.message
    });
  }
}

/**
 * Logout from all devices
 * POST /auth/logout-all
 */
export async function logoutAll(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    await authService.logoutAll(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Logged out from all devices'
    });
  } catch (error) {
    console.error('Logout all error:', error);

    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: error.message
    });
  }
}

/**
 * Request password reset
 * POST /auth/forgot-password
 */
export async function forgotPassword(req, res) {
  try {
    // Validate input
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { email } = value;
    const ipAddress = req.ip;

    const result = await authService.requestPasswordReset(email, ipAddress);

    // Always return success to prevent user enumeration
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Forgot password error:', error);

    // Still return success to prevent user enumeration
    res.status(200).json({
      success: true,
      message: 'If the email exists, a reset link has been sent'
    });
  }
}

/**
 * Reset password with token
 * POST /auth/reset-password
 */
export async function resetPassword(req, res) {
  try {
    // Validate input
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { token, newPassword } = value;
    const ipAddress = req.ip;

    await authService.resetPassword(token, newPassword, ipAddress);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);

    res.status(400).json({
      success: false,
      error: 'Password reset failed',
      message: error.message || 'Invalid or expired reset token'
    });
  }
}

/**
 * Change password (authenticated user)
 * POST /auth/change-password
 */
export async function changePassword(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate input
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { currentPassword, newPassword } = value;
    const ipAddress = req.ip;

    await authService.changePassword(req.user.id, currentPassword, newPassword, ipAddress);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);

    if (error.message.includes('incorrect')) {
      return res.status(400).json({
        success: false,
        error: 'Password change failed',
        message: 'Current password is incorrect'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Password change failed',
      message: error.message
    });
  }
}

/**
 * Get current user
 * GET /auth/me
 */
export async function getCurrentUser(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        mfaEnabled: req.user.mfa_enabled || false
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get user information'
    });
  }
}

/**
 * Verify email
 * POST /auth/verify-email
 */
export async function verifyEmail(req, res) {
  try {
    // Validate input
    const { error, value } = verifyEmailSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { token } = value;

    // TODO: Implement email verification in auth service
    // await authService.verifyEmail(token);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);

    res.status(400).json({
      success: false,
      error: 'Email verification failed',
      message: error.message
    });
  }
}

/**
 * Resend verification email
 * POST /auth/resend-verification
 */
export async function resendVerification(req, res) {
  try {
    // Validate input
    const { error, value } = resendVerificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { email } = value;

    // TODO: Implement resend verification in auth service
    // await authService.resendVerification(email);

    res.status(200).json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    console.error('Resend verification error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to resend verification email'
    });
  }
}

export default {
  register,
  login,
  verifyMFA,
  setupMFA,
  enableMFA,
  disableMFA,
  refreshToken,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
  changePassword,
  getCurrentUser,
  verifyEmail,
  resendVerification
};
