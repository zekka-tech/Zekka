/**
 * Password Utilities
 * ==================
 *
 * Utilities for password hashing, verification, and validation.
 * Uses bcrypt for secure password hashing.
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Salt rounds for bcrypt (higher = more secure but slower)
const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 *
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 *
 * @example
 * const hash = await hashPassword('MySecurePass123!');
 */
export async function hashPassword(password) {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against its hash
 *
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 *
 * @example
 * const isValid = await verifyPassword('MySecurePass123!', storedHash);
 */
export async function verifyPassword(password, hash) {
  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

/**
 * Generate a secure random token
 *
 * @param {number} length - Length in bytes (default: 32)
 * @returns {string} Hex-encoded random token
 *
 * @example
 * const token = generateToken(); // 64 character hex string
 */
export function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure random password
 *
 * @param {number} length - Password length (default: 16)
 * @returns {string} Random password with mixed case, numbers, and symbols
 *
 * @example
 * const tempPassword = generateRandomPassword(20);
 */
export function generateRandomPassword(length = 16) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '@$!%*?&';

  const allChars = lowercase + uppercase + numbers + symbols;

  let password = '';

  // Ensure at least one of each required character type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Validate password strength
 *
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with score and feedback
 *
 * @example
 * const result = validatePasswordStrength('MyPass123!');
 * if (!result.isValid) {
 *   console.log(result.errors);
 * }
 */
export function validatePasswordStrength(password) {
  const errors = [];
  let score = 0;

  // Length check
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  } else if (password.length >= 12 && password.length < 16) {
    score += 1;
  } else if (password.length >= 16) {
    score += 2;
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Number check
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Special character check
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  } else {
    score += 1;
  }

  // Additional complexity bonus
  if (/[A-Z].*[A-Z]/.test(password)) score += 0.5; // Multiple uppercase
  if (/\d.*\d/.test(password)) score += 0.5; // Multiple numbers
  if (/[@$!%*?&].*[@$!%*?&]/.test(password)) score += 0.5; // Multiple special chars

  // Check for common patterns
  const commonPatterns = [
    /^(.)\1+$/, // All same character
    /^(012|123|234|345|456|567|678|789|890)/, // Sequential numbers
    /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i // Sequential letters
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common or predictable patterns');
      score -= 1;
      break;
    }
  }

  // Determine strength level
  let strength = 'weak';
  if (score >= 6) strength = 'strong';
  else if (score >= 4) strength = 'medium';

  return {
    isValid: errors.length === 0,
    score: Math.max(0, score),
    strength,
    errors,
    suggestions: errors.length === 0 ? [] : [
      'Use a mix of uppercase and lowercase letters',
      'Include numbers and special characters',
      'Make it at least 12-16 characters long',
      'Avoid common words and patterns'
    ]
  };
}

/**
 * Check if password has been compromised in known data breaches
 * (Simple implementation - in production, use haveibeenpwned API)
 *
 * @param {string} password - Password to check
 * @returns {Promise<boolean>} True if password appears compromised
 *
 * @example
 * const isCompromised = await isPasswordCompromised('password123');
 */
export async function isPasswordCompromised(password) {
  // Common weak passwords list (subset)
  const weakPasswords = [
    'password', 'password123', '12345678', '123456789', '12345678910',
    'qwerty', 'abc123', 'password1', 'admin', 'letmein',
    'welcome', 'monkey', '1234567890', 'password!', 'pass123'
  ];

  const lowercasePassword = password.toLowerCase();

  // Check against known weak passwords
  if (weakPasswords.includes(lowercasePassword)) {
    return true;
  }

  // Check for password variations
  for (const weak of weakPasswords) {
    if (lowercasePassword.includes(weak)) {
      return true;
    }
  }

  // In production, integrate with haveibeenpwned API:
  // https://haveibeenpwned.com/API/v3#PwnedPasswords

  return false;
}

/**
 * Generate a password reset token with expiry
 *
 * @returns {Object} Token and expiry date
 *
 * @example
 * const { token, expiresAt } = generateResetToken();
 */
export function generateResetToken() {
  const token = generateToken(32); // 64 character hex string
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

  return { token, expiresAt };
}

/**
 * Generate an email verification token
 *
 * @returns {Object} Token and expiry date
 *
 * @example
 * const { token, expiresAt } = generateVerificationToken();
 */
export function generateVerificationToken() {
  const token = generateToken(32);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

  return { token, expiresAt };
}

/**
 * Mask password for logging (security)
 *
 * @param {string} password - Password to mask
 * @returns {string} Masked password
 *
 * @example
 * console.log(maskPassword('MySecurePass123!')); // "***************"
 */
export function maskPassword(password) {
  if (!password) return '';
  return '*'.repeat(password.length);
}

/**
 * Calculate password entropy (bits)
 *
 * @param {string} password - Password to analyze
 * @returns {number} Entropy in bits
 *
 * @example
 * const entropy = calculateEntropy('MyPass123!');
 * console.log(`Entropy: ${entropy} bits`);
 */
export function calculateEntropy(password) {
  const charSets = {
    lowercase: /[a-z]/,
    uppercase: /[A-Z]/,
    numbers: /\d/,
    symbols: /[@$!%*?&]/,
    other: /[^a-zA-Z0-9@$!%*?&]/
  };

  let poolSize = 0;

  if (charSets.lowercase.test(password)) poolSize += 26;
  if (charSets.uppercase.test(password)) poolSize += 26;
  if (charSets.numbers.test(password)) poolSize += 10;
  if (charSets.symbols.test(password)) poolSize += 8;
  if (charSets.other.test(password)) poolSize += 20; // Approximate

  // Entropy = log2(poolSize^length)
  const entropy = Math.log2(Math.pow(poolSize, password.length));

  return Math.round(entropy);
}

export default {
  hashPassword,
  verifyPassword,
  generateToken,
  generateRandomPassword,
  validatePasswordStrength,
  isPasswordCompromised,
  generateResetToken,
  generateVerificationToken,
  maskPassword,
  calculateEntropy
};
