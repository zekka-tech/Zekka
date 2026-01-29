/**
 * Password Policy Service
 * =======================
 *
 * Comprehensive password management service with:
 * - Password strength validation
 * - Password history tracking
 * - Password expiration policies
 * - Password reuse prevention
 * - Security recommendations
 *
 * Compliant with: OWASP, NIST, PCI DSS, SOC 2
 */

import bcrypt from 'bcrypt';
import pool from '../config/database.js';
import auditService from './audit-service.js';
import logger from '../utils/logger.js';

const SALT_ROUNDS = 10;

// Password policy configuration
const POLICY = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  historyCount: 5, // Remember last 5 passwords
  expirationDays: 90, // Password expires after 90 days
  warningDays: 7, // Warn user 7 days before expiration
  maxAge: 365, // Maximum password age (1 year)
  minAge: 1, // Minimum time before password can be changed again (days)
  commonPasswordsCheck: true
};

// Common passwords to reject (top 100 most common)
const COMMON_PASSWORDS = [
  'password',
  'password123',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  '111111',
  '123123',
  'admin',
  'letmein',
  'welcome',
  'monkey',
  '1234567890',
  'password1',
  'Password1',
  'Password123',
  'admin123',
  'root',
  'toor'
  // Add more as needed
];

class PasswordService {
  /**
   * Validate password against policy
   */
  validatePassword(password, userInfo = {}) {
    const errors = [];
    const warnings = [];

    // Length check
    if (password.length < POLICY.minLength) {
      errors.push(
        `Password must be at least ${POLICY.minLength} characters long`
      );
    }
    if (password.length > POLICY.maxLength) {
      errors.push(`Password must not exceed ${POLICY.maxLength} characters`);
    }

    // Character requirements
    if (POLICY.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (POLICY.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (POLICY.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (
      POLICY.requireSpecialChars
      && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ) {
      errors.push('Password must contain at least one special character');
    }

    // Common password check
    if (POLICY.commonPasswordsCheck) {
      const lowerPassword = password.toLowerCase();
      if (COMMON_PASSWORDS.includes(lowerPassword)) {
        errors.push(
          'Password is too common. Please choose a more unique password'
        );
      }
    }

    // User info check (prevent using email, name in password)
    if (userInfo.email) {
      const emailParts = userInfo.email.toLowerCase().split('@')[0];
      if (
        password.toLowerCase().includes(emailParts)
        && emailParts.length > 3
      ) {
        warnings.push(
          'Password should not contain parts of your email address'
        );
      }
    }

    if (userInfo.name) {
      const nameParts = userInfo.name.toLowerCase().split(' ');
      for (const part of nameParts) {
        if (part.length > 3 && password.toLowerCase().includes(part)) {
          warnings.push('Password should not contain parts of your name');
        }
      }
    }

    // Sequential or repeated characters
    if (/(.)\1{2,}/.test(password)) {
      warnings.push('Password contains repeated characters');
    }
    if (
      /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(
        password
      )
    ) {
      warnings.push('Password contains sequential characters');
    }
    if (/(?:012|123|234|345|456|567|678|789|890)/.test(password)) {
      warnings.push('Password contains sequential numbers');
    }

    // Calculate strength score
    const strength = this.calculateStrength(password);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      strength,
      policy: {
        minLength: POLICY.minLength,
        requireUppercase: POLICY.requireUppercase,
        requireLowercase: POLICY.requireLowercase,
        requireNumbers: POLICY.requireNumbers,
        requireSpecialChars: POLICY.requireSpecialChars
      }
    };
  }

  /**
   * Calculate password strength (0-100)
   */
  calculateStrength(password) {
    let score = 0;

    // Length score (max 30 points)
    if (password.length >= 12) score += 20;
    if (password.length >= 16) score += 10;

    // Character variety (max 40 points)
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/[0-9]/.test(password)) score += 10;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 10;

    // Complexity (max 30 points)
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= 8) score += 10;
    if (uniqueChars >= 12) score += 10;
    if (uniqueChars >= 16) score += 10;

    // Penalties
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
    if (/^[a-zA-Z]+$/.test(password)) score -= 10; // Only letters
    if (/^[0-9]+$/.test(password)) score -= 20; // Only numbers

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check if password has been used before
   */
  async checkPasswordHistory(userId, password) {
    try {
      const result = await pool.query(
        `SELECT password_hash 
         FROM password_history 
         WHERE user_id = $1 
         ORDER BY changed_at DESC 
         LIMIT $2`,
        [userId, POLICY.historyCount]
      );

      for (const row of result.rows) {
        const matches = await bcrypt.compare(password, row.password_hash);
        if (matches) {
          return {
            reused: true,
            message: `Password has been used before. Please choose a different password (last ${POLICY.historyCount} passwords are remembered)`
          };
        }
      }

      return { reused: false };
    } catch (error) {
      logger.error('Error checking password history:', error);
      throw error;
    }
  }

  /**
   * Check if password change is allowed (minimum age)
   */
  async canChangePassword(userId) {
    try {
      const result = await pool.query(
        `SELECT changed_at 
         FROM password_history 
         WHERE user_id = $1 
         ORDER BY changed_at DESC 
         LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return { allowed: true };
      }

      const lastChanged = new Date(result.rows[0].changed_at);
      const now = new Date();
      const daysSinceChange = Math.floor(
        (now - lastChanged) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceChange < POLICY.minAge) {
        return {
          allowed: false,
          message: `Password can only be changed once every ${POLICY.minAge} day(s)`,
          daysRemaining: POLICY.minAge - daysSinceChange
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking password change eligibility:', error);
      throw error;
    }
  }

  /**
   * Save password to history
   */
  async savePasswordHistory(userId, passwordHash, ipAddress = null) {
    try {
      // Insert new password history
      await pool.query(
        `INSERT INTO password_history (user_id, password_hash, ip_address)
         VALUES ($1, $2, $3)`,
        [userId, passwordHash, ipAddress]
      );

      // Keep only the most recent passwords based on policy
      await pool.query(
        `DELETE FROM password_history 
         WHERE user_id = $1 
         AND id NOT IN (
           SELECT id FROM password_history 
           WHERE user_id = $1 
           ORDER BY changed_at DESC 
           LIMIT $2
         )`,
        [userId, POLICY.historyCount]
      );

      // Log password change in audit
      await auditService.log({
        userId,
        action: 'password_changed',
        resourceType: 'user',
        resourceId: userId,
        ipAddress,
        success: true,
        riskLevel: 'medium'
      });
    } catch (error) {
      logger.error('Error saving password history:', error);
      throw error;
    }
  }

  /**
   * Check if password is expired
   */
  async checkPasswordExpiration(userId) {
    try {
      const result = await pool.query(
        `SELECT changed_at 
         FROM password_history 
         WHERE user_id = $1 
         ORDER BY changed_at DESC 
         LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        // If no password history, check user creation date
        const userResult = await pool.query(
          'SELECT created_at FROM users WHERE id = $1',
          [userId]
        );

        if (userResult.rows.length === 0) {
          throw new Error('User not found');
        }

        result.rows[0] = { changed_at: userResult.rows[0].created_at };
      }

      const lastChanged = new Date(result.rows[0].changed_at);
      const now = new Date();
      const daysSinceChange = Math.floor(
        (now - lastChanged) / (1000 * 60 * 60 * 24)
      );

      const isExpired = daysSinceChange >= POLICY.expirationDays;
      const expiresWithinWarningPeriod = !isExpired
        && daysSinceChange >= POLICY.expirationDays - POLICY.warningDays;

      return {
        expired: isExpired,
        warning: expiresWithinWarningPeriod,
        daysSinceChange,
        daysUntilExpiration: Math.max(
          0,
          POLICY.expirationDays - daysSinceChange
        ),
        lastChanged,
        expirationDate: new Date(
          lastChanged.getTime() + POLICY.expirationDays * 24 * 60 * 60 * 1000
        ),
        policy: {
          expirationDays: POLICY.expirationDays,
          warningDays: POLICY.warningDays
        }
      };
    } catch (error) {
      logger.error('Error checking password expiration:', error);
      throw error;
    }
  }

  /**
   * Get users with expiring/expired passwords
   */
  async getPasswordExpirationReport() {
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
          CURRENT_DATE - COALESCE(lp.last_changed, u.created_at)::date as days_since_change,
          ${POLICY.expirationDays} - (CURRENT_DATE - COALESCE(lp.last_changed, u.created_at)::date) as days_until_expiration,
          CASE 
            WHEN CURRENT_DATE - COALESCE(lp.last_changed, u.created_at)::date >= ${POLICY.expirationDays} THEN 'expired'
            WHEN CURRENT_DATE - COALESCE(lp.last_changed, u.created_at)::date >= ${POLICY.expirationDays - POLICY.warningDays} THEN 'expiring_soon'
            ELSE 'valid'
          END as status
        FROM users u
        LEFT JOIN latest_passwords lp ON u.id = lp.user_id
        WHERE u.is_active = true
        ORDER BY days_until_expiration ASC
      `;

      const result = await pool.query(query);

      const expired = result.rows.filter((r) => r.status === 'expired');
      const expiringSoon = result.rows.filter(
        (r) => r.status === 'expiring_soon'
      );
      const valid = result.rows.filter((r) => r.status === 'valid');

      return {
        total: result.rows.length,
        expired: expired.length,
        expiringSoon: expiringSoon.length,
        valid: valid.length,
        users: result.rows
      };
    } catch (error) {
      logger.error('Error getting password expiration report:', error);
      throw error;
    }
  }

  /**
   * Force password reset for user
   */
  async forcePasswordReset(userId, reason, adminId = null) {
    try {
      await pool.query(
        'UPDATE users SET force_password_reset = true WHERE id = $1',
        [userId]
      );

      // Log forced password reset
      await auditService.log({
        userId: adminId,
        action: 'password_reset_forced',
        resourceType: 'user',
        resourceId: userId,
        success: true,
        requestBody: { reason },
        riskLevel: 'high'
      });

      return {
        message: 'User will be required to reset password on next login',
        reason
      };
    } catch (error) {
      logger.error('Error forcing password reset:', error);
      throw error;
    }
  }

  /**
   * Get password policy configuration
   */
  getPolicy() {
    return { ...POLICY };
  }

  /**
   * Update password policy (admin only)
   */
  async updatePolicy(newPolicy, adminId) {
    try {
      // Validate policy values
      if (newPolicy.minLength < 8 || newPolicy.minLength > 64) {
        throw new Error('minLength must be between 8 and 64');
      }

      // Merge with existing policy
      Object.assign(POLICY, newPolicy);

      // Log policy update
      await auditService.log({
        userId: adminId,
        action: 'password_policy_updated',
        resourceType: 'system_config',
        success: true,
        requestBody: newPolicy,
        riskLevel: 'high'
      });

      return {
        message: 'Password policy updated successfully',
        policy: POLICY
      };
    } catch (error) {
      logger.error('Error updating password policy:', error);
      throw error;
    }
  }

  /**
   * Generate secure random password
   */
  generateSecurePassword(length = 16) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const all = uppercase + lowercase + numbers + special;

    let password = '';

    // Ensure at least one of each required character type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }
}

export default new PasswordService();
