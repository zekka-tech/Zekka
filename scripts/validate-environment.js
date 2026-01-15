#!/usr/bin/env node

/**
 * Production Environment Validator
 * 
 * Validates that all required environment variables are set correctly
 * and meet security standards before deploying to production.
 * 
 * Usage:
 *   node scripts/validate-environment.js
 *   npm run validate:env
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Validation results
const results = {
  passed: [],
  warnings: [],
  errors: [],
};

/**
 * Print colored output
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print section header
 */
function printSection(title) {
  log('\n' + '='.repeat(70), 'cyan');
  log(title, 'cyan');
  log('='.repeat(70), 'cyan');
}

/**
 * Check if environment variable exists
 */
function checkExists(name, description) {
  if (!process.env[name]) {
    results.errors.push(`Missing required variable: ${name} (${description})`);
    return false;
  }
  results.passed.push(`${name} is set`);
  return true;
}

/**
 * Check if secret meets minimum length
 */
function checkSecretLength(name, minLength = 32) {
  if (!process.env[name]) {
    return false;
  }
  
  if (process.env[name].length < minLength) {
    results.errors.push(`${name} is too short (minimum ${minLength} characters)`);
    return false;
  }
  
  results.passed.push(`${name} meets length requirements`);
  return true;
}

/**
 * Check if secret is not default value
 */
function checkNotDefault(name, defaultValue) {
  if (!process.env[name]) {
    return false;
  }
  
  if (process.env[name] === defaultValue || process.env[name].includes('change-this')) {
    results.errors.push(`${name} is still set to default value!`);
    return false;
  }
  
  results.passed.push(`${name} is not default value`);
  return true;
}

/**
 * Check database configuration
 */
function validateDatabase() {
  printSection('DATABASE CONFIGURATION');
  
  checkExists('DB_HOST', 'Database host');
  checkExists('DB_PORT', 'Database port');
  checkExists('DB_NAME', 'Database name');
  checkExists('DB_USER', 'Database user');
  
  if (checkExists('DB_PASSWORD', 'Database password')) {
    checkSecretLength('DB_PASSWORD', 16);
    checkNotDefault('DB_PASSWORD', 'password');
    checkNotDefault('DB_PASSWORD', 'your-secure-database-password-change-this');
  }
  
  // Check SSL configuration
  if (process.env.NODE_ENV === 'production') {
    if (process.env.DB_SSL_ENABLED !== 'true') {
      results.warnings.push('Database SSL is not enabled for production');
    }
  }
  
  // Check pool settings
  const poolMax = parseInt(process.env.DB_POOL_MAX || '20');
  if (poolMax < 10) {
    results.warnings.push(`Database pool size is low (${poolMax}). Consider increasing for production.`);
  } else if (poolMax > 100) {
    results.warnings.push(`Database pool size is very high (${poolMax}). This may cause issues.`);
  }
}

/**
 * Check Redis configuration
 */
function validateRedis() {
  printSection('REDIS CONFIGURATION');
  
  checkExists('REDIS_HOST', 'Redis host');
  checkExists('REDIS_PORT', 'Redis port');
  
  if (checkExists('REDIS_PASSWORD', 'Redis password')) {
    checkSecretLength('REDIS_PASSWORD', 16);
    checkNotDefault('REDIS_PASSWORD', 'your-secure-redis-password-change-this');
  }
  
  if (process.env.NODE_ENV === 'production') {
    if (process.env.REDIS_TLS_ENABLED !== 'true') {
      results.warnings.push('Redis TLS is not enabled for production');
    }
  }
}

/**
 * Check security configuration
 */
function validateSecurity() {
  printSection('SECURITY CONFIGURATION');
  
  // JWT Secret
  if (checkExists('JWT_SECRET', 'JWT secret key')) {
    checkSecretLength('JWT_SECRET', 32);
    checkNotDefault('JWT_SECRET', 'your-jwt-secret');
    checkNotDefault('JWT_SECRET', 'your-super-secure-jwt-secret-min-32-chars-change-this-in-production');
  }
  
  // Session Secret
  if (checkExists('SESSION_SECRET', 'Session secret key')) {
    checkSecretLength('SESSION_SECRET', 32);
    checkNotDefault('SESSION_SECRET', 'your-session-secret');
    checkNotDefault('SESSION_SECRET', 'your-super-secure-session-secret-min-32-chars-change-this-in-production');
  }
  
  // Encryption Key
  if (checkExists('ENCRYPTION_KEY', 'Encryption key')) {
    checkSecretLength('ENCRYPTION_KEY', 32);
    checkNotDefault('ENCRYPTION_KEY', 'your-aes-256-encryption-key-32-bytes-base64-encoded');
  }
  
  // SSL/TLS
  if (process.env.NODE_ENV === 'production') {
    if (process.env.SSL_ENABLED !== 'true') {
      results.errors.push('SSL/TLS must be enabled in production!');
    } else {
      if (!process.env.SSL_CERT_PATH || !process.env.SSL_KEY_PATH) {
        results.errors.push('SSL certificate paths must be set');
      }
    }
  }
  
  // Security headers
  if (process.env.HELMET_ENABLED !== 'true') {
    results.warnings.push('Helmet.js security headers are not enabled');
  }
  
  if (process.env.CSP_ENABLED !== 'true') {
    results.warnings.push('Content Security Policy is not enabled');
  }
}

/**
 * Check monitoring configuration
 */
function validateMonitoring() {
  printSection('MONITORING CONFIGURATION');
  
  if (process.env.PROMETHEUS_ENABLED !== 'true') {
    results.warnings.push('Prometheus monitoring is not enabled');
  }
  
  if (process.env.AUDIT_ENABLED !== 'true') {
    results.warnings.push('Audit logging is not enabled');
  }
  
  checkExists('LOG_LEVEL', 'Log level');
  checkExists('LOG_DIR', 'Log directory');
  
  // Check log retention
  const auditRetention = parseInt(process.env.AUDIT_RETENTION_DAYS || '0');
  if (auditRetention < 30) {
    results.warnings.push(`Audit log retention is only ${auditRetention} days. Consider 90+ days for compliance.`);
  }
}

/**
 * Check rate limiting configuration
 */
function validateRateLimiting() {
  printSection('RATE LIMITING CONFIGURATION');
  
  if (process.env.RATE_LIMIT_ENABLED !== 'true') {
    results.warnings.push('Rate limiting is not enabled');
  }
  
  const rateLimit = parseInt(process.env.RATE_LIMIT_MAX || '0');
  if (rateLimit < 10) {
    results.warnings.push(`Rate limit is very low (${rateLimit} requests). This may affect legitimate users.`);
  } else if (rateLimit > 1000) {
    results.warnings.push(`Rate limit is very high (${rateLimit} requests). Consider reducing for better protection.`);
  }
}

/**
 * Check CORS configuration
 */
function validateCORS() {
  printSection('CORS CONFIGURATION');
  
  if (process.env.CORS_ENABLED !== 'true') {
    results.warnings.push('CORS is not enabled');
  }
  
  if (!process.env.CORS_ORIGIN) {
    results.errors.push('CORS_ORIGIN must be set to allowed domains');
  } else if (process.env.CORS_ORIGIN === '*') {
    results.errors.push('CORS_ORIGIN should not be * in production');
  }
}

/**
 * Check backup configuration
 */
function validateBackup() {
  printSection('BACKUP CONFIGURATION');
  
  if (process.env.BACKUP_ENABLED !== 'true') {
    results.warnings.push('Automated backups are not enabled');
  }
  
  if (process.env.BACKUP_SCHEDULE) {
    results.passed.push('Backup schedule is configured');
  } else {
    results.warnings.push('Backup schedule is not set');
  }
}

/**
 * Print validation results
 */
function printResults() {
  printSection('VALIDATION RESULTS');
  
  log(`\n✅ Passed: ${results.passed.length}`, 'green');
  results.passed.forEach(msg => log(`  ✓ ${msg}`, 'green'));
  
  if (results.warnings.length > 0) {
    log(`\n⚠️  Warnings: ${results.warnings.length}`, 'yellow');
    results.warnings.forEach(msg => log(`  ! ${msg}`, 'yellow'));
  }
  
  if (results.errors.length > 0) {
    log(`\n❌ Errors: ${results.errors.length}`, 'red');
    results.errors.forEach(msg => log(`  ✗ ${msg}`, 'red'));
  }
  
  log('\n' + '='.repeat(70), 'cyan');
  
  if (results.errors.length === 0) {
    if (results.warnings.length === 0) {
      log('\n🎉 All validations passed! Environment is ready for production.', 'green');
      return 0;
    } else {
      log('\n✅ Core validations passed, but please review warnings.', 'yellow');
      return 0;
    }
  } else {
    log('\n❌ Environment validation failed! Fix errors before deploying.', 'red');
    return 1;
  }
}

/**
 * Main validation function
 */
function main() {
  log('\n╔══════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                              ║', 'cyan');
  log('║      Production Environment Validator                       ║', 'cyan');
  log('║      Zekka Framework v3.0.0                                 ║', 'cyan');
  log('║                                                              ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════════╝', 'cyan');
  
  // Check NODE_ENV
  if (process.env.NODE_ENV !== 'production') {
    log(`\nℹ️  NODE_ENV is ${process.env.NODE_ENV || 'not set'}`, 'yellow');
    log('   Running validation in non-production mode...', 'yellow');
  }
  
  // Run validations
  validateDatabase();
  validateRedis();
  validateSecurity();
  validateMonitoring();
  validateRateLimiting();
  validateCORS();
  validateBackup();
  
  // Print results
  const exitCode = printResults();
  
  process.exit(exitCode);
}

// Run validation
if (require.main === module) {
  main();
}

module.exports = {
  validateDatabase,
  validateRedis,
  validateSecurity,
  validateMonitoring,
  validateRateLimiting,
  validateCORS,
  validateBackup,
};
