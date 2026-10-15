'use strict';

/**
 * Fields that must never be exposed in API responses or logs.
 * Centralized here so every code path strips the same set of secrets.
 */
const SENSITIVE_USER_FIELDS = Object.freeze([
  'password',
  'password_history',
  'reset_token',
  'reset_token_expires_at',
  'verification_token',
  'verification_token_expires_at'
]);

/**
 * Remove sensitive fields from a user record before it leaves the service
 * boundary. Returns the input unchanged when it is null/undefined so callers
 * can safely pass the result of a lookup that may not have found a user.
 *
 * @param {Object|null|undefined} user - Raw user row (e.g. from the repository)
 * @returns {Object|null|undefined} A shallow copy without sensitive fields
 */
function sanitizeUser(user) {
  if (!user || typeof user !== 'object') {
    return user;
  }

  const sanitized = { ...user };
  for (const field of SENSITIVE_USER_FIELDS) {
    delete sanitized[field];
  }

  return sanitized;
}

module.exports = { sanitizeUser, SENSITIVE_USER_FIELDS };
