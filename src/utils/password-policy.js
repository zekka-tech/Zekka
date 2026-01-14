/**
 * Advanced Password Policies System
 * 
 * Features:
 * - Password history (prevent reuse)
 * - Password expiration
 * - Complexity requirements
 * - Common password blacklist
 * - Password strength scoring
 * - Breach detection integration
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { getKeyManager } = require('./encryption-key-manager');

// Password policy configuration
const DEFAULT_POLICY = {
  // Length requirements
  minLength: 12,
  maxLength: 128,
  
  // Complexity requirements
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minUppercase: 1,
  minLowercase: 1,
  minNumbers: 1,
  minSpecialChars: 1,
  
  // History and expiration
  preventReuse: true,
  historySize: 5, // Remember last 5 passwords
  expirationDays: 90, // Password expires after 90 days
  warnDaysBefore: 14, // Warn user 14 days before expiration
  
  // Security features
  checkBreaches: true, // Check against known breaches (future integration)
  checkCommonPasswords: true,
  maxConsecutiveChars: 3, // Max consecutive identical characters
  preventUserInfo: true, // Prevent using user info in password
  
  // Account security
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 15,
  requireMFAAfterReset: false, // Future MFA integration
  
  // Strength requirements
  minStrengthScore: 3, // 0-5 scale
};

// Common weak passwords (expanded list)
const COMMON_PASSWORDS = new Set([
  'password', 'password123', '12345678', '123456789', '1234567890',
  'qwerty', 'abc123', 'monkey', '1234567', '12345',
  'password1', 'welcome', 'admin', 'letmein', 'dragon',
  'master', 'sunshine', 'princess', 'football', 'shadow',
  'passw0rd', 'trustno1', 'login', 'test', 'demo',
  'zekka', 'framework', 'secret', 'changeme', 'default'
]);

class PasswordPolicyManager {
  constructor(policy = {}) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
    this.keyManager = getKeyManager();
  }
  
  /**
   * Validate password against policy
   */
  validatePassword(password, userInfo = {}) {
    const errors = [];
    
    // Length checks
    if (password.length < this.policy.minLength) {
      errors.push(`Password must be at least ${this.policy.minLength} characters long`);
    }
    if (password.length > this.policy.maxLength) {
      errors.push(`Password must be no more than ${this.policy.maxLength} characters long`);
    }
    
    // Complexity checks
    if (this.policy.requireUppercase) {
      const uppercaseCount = (password.match(/[A-Z]/g) || []).length;
      if (uppercaseCount < this.policy.minUppercase) {
        errors.push(`Password must contain at least ${this.policy.minUppercase} uppercase letter(s)`);
      }
    }
    
    if (this.policy.requireLowercase) {
      const lowercaseCount = (password.match(/[a-z]/g) || []).length;
      if (lowercaseCount < this.policy.minLowercase) {
        errors.push(`Password must contain at least ${this.policy.minLowercase} lowercase letter(s)`);
      }
    }
    
    if (this.policy.requireNumbers) {
      const numberCount = (password.match(/[0-9]/g) || []).length;
      if (numberCount < this.policy.minNumbers) {
        errors.push(`Password must contain at least ${this.policy.minNumbers} number(s)`);
      }
    }
    
    if (this.policy.requireSpecialChars) {
      const specialCount = (password.match(/[^A-Za-z0-9]/g) || []).length;
      if (specialCount < this.policy.minSpecialChars) {
        errors.push(`Password must contain at least ${this.policy.minSpecialChars} special character(s)`);
      }
    }
    
    // Check consecutive characters
    if (this.hasConsecutiveChars(password, this.policy.maxConsecutiveChars)) {
      errors.push(`Password cannot have more than ${this.policy.maxConsecutiveChars} consecutive identical characters`);
    }
    
    // Check common passwords
    if (this.policy.checkCommonPasswords) {
      if (COMMON_PASSWORDS.has(password.toLowerCase())) {
        errors.push('This password is too common. Please choose a more unique password');
      }
    }
    
    // Check user info
    if (this.policy.preventUserInfo && userInfo) {
      if (this.containsUserInfo(password, userInfo)) {
        errors.push('Password cannot contain personal information (name, email, etc.)');
      }
    }
    
    // Calculate strength score
    const strengthScore = this.calculateStrength(password);
    if (strengthScore < this.policy.minStrengthScore) {
      errors.push(`Password is too weak. Strength score: ${strengthScore}/${5}. Required: ${this.policy.minStrengthScore}/${5}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      strengthScore,
      suggestions: this.getStrengthSuggestions(password, strengthScore)
    };
  }
  
  /**
   * Check for consecutive identical characters
   */
  hasConsecutiveChars(password, maxConsecutive) {
    for (let i = 0; i < password.length - maxConsecutive; i++) {
      const char = password[i];
      let consecutive = 1;
      
      for (let j = i + 1; j < password.length; j++) {
        if (password[j] === char) {
          consecutive++;
          if (consecutive > maxConsecutive) {
            return true;
          }
        } else {
          break;
        }
      }
    }
    return false;
  }
  
  /**
   * Check if password contains user information
   */
  containsUserInfo(password, userInfo) {
    const lowerPassword = password.toLowerCase();
    
    // Check email
    if (userInfo.email) {
      const emailParts = userInfo.email.split('@')[0].split(/[._-]/);
      for (const part of emailParts) {
        if (part.length >= 3 && lowerPassword.includes(part.toLowerCase())) {
          return true;
        }
      }
    }
    
    // Check name
    if (userInfo.name) {
      const nameParts = userInfo.name.split(/\s+/);
      for (const part of nameParts) {
        if (part.length >= 3 && lowerPassword.includes(part.toLowerCase())) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Calculate password strength (0-5 scale)
   */
  calculateStrength(password) {
    let score = 0;
    
    // Length bonus
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    
    // Character variety bonus
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    // Entropy calculation
    const entropy = this.calculateEntropy(password);
    if (entropy > 60) score++;
    if (entropy > 80) score++;
    
    // Cap at 5
    return Math.min(5, score);
  }
  
  /**
   * Calculate password entropy
   */
  calculateEntropy(password) {
    let charSet = 0;
    if (/[a-z]/.test(password)) charSet += 26;
    if (/[A-Z]/.test(password)) charSet += 26;
    if (/[0-9]/.test(password)) charSet += 10;
    if (/[^A-Za-z0-9]/.test(password)) charSet += 32;
    
    return password.length * Math.log2(charSet);
  }
  
  /**
   * Get suggestions for improving password strength
   */
  getStrengthSuggestions(password, currentScore) {
    const suggestions = [];
    
    if (password.length < 12) {
      suggestions.push('Increase password length to at least 12 characters');
    }
    
    if (!/[A-Z]/.test(password)) {
      suggestions.push('Add uppercase letters');
    }
    
    if (!/[a-z]/.test(password)) {
      suggestions.push('Add lowercase letters');
    }
    
    if (!/[0-9]/.test(password)) {
      suggestions.push('Add numbers');
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
      suggestions.push('Add special characters (!@#$%^&*)');
    }
    
    if (currentScore < 3) {
      suggestions.push('Consider using a passphrase (e.g., "Correct-Horse-Battery-Staple")');
    }
    
    return suggestions;
  }
  
  /**
   * Hash password with bcrypt
   */
  async hashPassword(password) {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    return await bcrypt.hash(password, rounds);
  }
  
  /**
   * Verify password against hash
   */
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
  
  /**
   * Store password in history (encrypted)
   */
  async addToHistory(userId, passwordHash) {
    const encrypted = this.keyManager.encrypt(passwordHash);
    
    return {
      userId,
      passwordHash: encrypted,
      createdAt: new Date()
    };
  }
  
  /**
   * Check if password was used before
   */
  async checkHistory(password, passwordHistory) {
    if (!this.policy.preventReuse || !passwordHistory) {
      return false;
    }
    
    for (const historyEntry of passwordHistory) {
      try {
        const decryptedHash = this.keyManager.decrypt(historyEntry.passwordHash);
        const matches = await bcrypt.compare(password, decryptedHash);
        if (matches) {
          return true;
        }
      } catch (error) {
        console.error('Error checking password history:', error);
      }
    }
    
    return false;
  }
  
  /**
   * Check if password is expired
   */
  isPasswordExpired(lastChangedAt) {
    if (!this.policy.expirationDays || !lastChangedAt) {
      return false;
    }
    
    const daysSinceChange = (Date.now() - new Date(lastChangedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceChange >= this.policy.expirationDays;
  }
  
  /**
   * Check if password expiration warning should be shown
   */
  shouldWarnExpiration(lastChangedAt) {
    if (!this.policy.expirationDays || !this.policy.warnDaysBefore || !lastChangedAt) {
      return false;
    }
    
    const daysSinceChange = (Date.now() - new Date(lastChangedAt).getTime()) / (1000 * 60 * 60 * 24);
    const daysUntilExpiration = this.policy.expirationDays - daysSinceChange;
    
    return daysUntilExpiration > 0 && daysUntilExpiration <= this.policy.warnDaysBefore;
  }
  
  /**
   * Get days until password expiration
   */
  getDaysUntilExpiration(lastChangedAt) {
    if (!this.policy.expirationDays || !lastChangedAt) {
      return null;
    }
    
    const daysSinceChange = (Date.now() - new Date(lastChangedAt).getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, this.policy.expirationDays - daysSinceChange);
  }
  
  /**
   * Generate secure random password
   */
  generateSecurePassword(length = 16) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = uppercase + lowercase + numbers + special;
    
    let password = '';
    
    // Ensure at least one of each type
    password += uppercase[crypto.randomInt(0, uppercase.length)];
    password += lowercase[crypto.randomInt(0, lowercase.length)];
    password += numbers[crypto.randomInt(0, numbers.length)];
    password += special[crypto.randomInt(0, special.length)];
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[crypto.randomInt(0, allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => crypto.randomInt(-1, 2)).join('');
  }
  
  /**
   * Get policy details
   */
  getPolicy() {
    return { ...this.policy };
  }
  
  /**
   * Update policy
   */
  updatePolicy(updates) {
    this.policy = { ...this.policy, ...updates };
  }
}

// Singleton instance
let policyManagerInstance = null;

/**
 * Get password policy manager instance
 */
function getPasswordPolicyManager(policy) {
  if (!policyManagerInstance) {
    policyManagerInstance = new PasswordPolicyManager(policy);
  }
  return policyManagerInstance;
}

module.exports = {
  PasswordPolicyManager,
  getPasswordPolicyManager,
  DEFAULT_POLICY,
  COMMON_PASSWORDS
};
