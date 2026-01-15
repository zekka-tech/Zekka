#!/usr/bin/env node
/**
 * Secure Secrets Generator for Production Environment
 * 
 * Generates cryptographically secure secrets for:
 * - JWT tokens
 * - Session management
 * - Encryption keys
 * - API keys
 * 
 * Usage:
 *   node scripts/generate-secrets.js
 *   node scripts/generate-secrets.js --output .env
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecretGenerator {
  /**
   * Generate cryptographically secure random string
   */
  static generateSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate base64 encoded key for encryption
   */
  static generateEncryptionKey(bytes = 32) {
    return crypto.randomBytes(bytes).toString('base64');
  }

  /**
   * Generate UUID v4
   */
  static generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * Generate secure password
   */
  static generatePassword(length = 32) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }
    
    return password;
  }

  /**
   * Generate all secrets for production environment
   */
  static generateAllSecrets() {
    return {
      // Application secrets
      JWT_SECRET: this.generateSecret(64),
      JWT_REFRESH_SECRET: this.generateSecret(64),
      SESSION_SECRET: this.generateSecret(64),
      ENCRYPTION_KEY: this.generateEncryptionKey(32),
      API_KEY_SALT: this.generateSecret(32),
      
      // MFA secrets
      MFA_ENCRYPTION_KEY: this.generateEncryptionKey(32),
      BACKUP_CODE_SALT: this.generateSecret(32),
      
      // Database encryption
      DATABASE_ENCRYPTION_KEY: this.generateEncryptionKey(32),
      
      // Cookie secret
      COOKIE_SECRET: this.generateSecret(32),
      
      // CSRF token secret
      CSRF_SECRET: this.generateSecret(32),
      
      // Webhook secrets
      WEBHOOK_SECRET: this.generateSecret(32),
      
      // Instance ID
      INSTANCE_ID: this.generateUUID(),
      
      // Generated timestamp
      SECRETS_GENERATED_AT: new Date().toISOString()
    };
  }

  /**
   * Generate .env file content
   */
  static generateEnvFile(secrets, includeExamples = true) {
    const lines = [
      '# ==================================',
      '# Zekka Framework - Production Environment',
      '# ==================================',
      '# Generated: ' + new Date().toISOString(),
      '# SECURITY: Keep this file secure and never commit to git',
      '# ==================================',
      '',
      '# Environment',
      'NODE_ENV=production',
      'PORT=3000',
      '',
      '# ==================================',
      '# SECURITY SECRETS (REQUIRED)',
      '# ==================================',
      '# These secrets were generated cryptographically',
      '# DO NOT share these values',
      '',
      `JWT_SECRET=${secrets.JWT_SECRET}`,
      `JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}`,
      `SESSION_SECRET=${secrets.SESSION_SECRET}`,
      `ENCRYPTION_KEY=${secrets.ENCRYPTION_KEY}`,
      `API_KEY_SALT=${secrets.API_KEY_SALT}`,
      '',
      '# MFA Configuration',
      `MFA_ENCRYPTION_KEY=${secrets.MFA_ENCRYPTION_KEY}`,
      `BACKUP_CODE_SALT=${secrets.BACKUP_CODE_SALT}`,
      '',
      '# Database Encryption',
      `DATABASE_ENCRYPTION_KEY=${secrets.DATABASE_ENCRYPTION_KEY}`,
      '',
      '# Cookie & CSRF',
      `COOKIE_SECRET=${secrets.COOKIE_SECRET}`,
      `CSRF_SECRET=${secrets.CSRF_SECRET}`,
      '',
      '# Webhooks',
      `WEBHOOK_SECRET=${secrets.WEBHOOK_SECRET}`,
      '',
      '# Instance Identification',
      `INSTANCE_ID=${secrets.INSTANCE_ID}`,
      '',
      '# ==================================',
      '# DATABASE CONFIGURATION (REQUIRED)',
      '# ==================================',
      '# Update these with your actual database credentials',
      ''
    ];

    if (includeExamples) {
      lines.push(
        '# PostgreSQL Connection',
        '# Format: postgresql://username:password@host:port/database',
        'DATABASE_URL=postgresql://zekka_user:CHANGE_THIS_PASSWORD@localhost:5432/zekka_production',
        'DATABASE_HOST=localhost',
        'DATABASE_PORT=5432',
        'DATABASE_NAME=zekka_production',
        'DATABASE_USER=zekka_user',
        'DATABASE_PASSWORD=CHANGE_THIS_PASSWORD',
        'DATABASE_SSL=true',
        'DATABASE_POOL_MIN=2',
        'DATABASE_POOL_MAX=10',
        '',
        '# ==================================',
        '# REDIS CONFIGURATION (REQUIRED)',
        '# ==================================',
        'REDIS_URL=redis://localhost:6379',
        'REDIS_HOST=localhost',
        'REDIS_PORT=6379',
        'REDIS_PASSWORD=CHANGE_THIS_PASSWORD',
        'REDIS_DB=0',
        'REDIS_TLS=false',
        '',
        '# ==================================',
        '# JWT CONFIGURATION',
        '# ==================================',
        'JWT_EXPIRY=1h',
        'JWT_REFRESH_EXPIRY=7d',
        'JWT_ISSUER=zekka-framework',
        'JWT_AUDIENCE=zekka-api',
        '',
        '# ==================================',
        '# SESSION CONFIGURATION',
        '# ==================================',
        'SESSION_NAME=zekka.sid',
        'SESSION_MAX_AGE=86400000',
        'SESSION_SECURE=true',
        'SESSION_HTTP_ONLY=true',
        'SESSION_SAME_SITE=strict',
        '',
        '# ==================================',
        '# RATE LIMITING',
        '# ==================================',
        'RATE_LIMIT_WINDOW_MS=900000',
        'RATE_LIMIT_MAX_REQUESTS=100',
        'RATE_LIMIT_AUTH_WINDOW_MS=900000',
        'RATE_LIMIT_AUTH_MAX_REQUESTS=5',
        '',
        '# ==================================',
        '# SECURITY SETTINGS',
        '# ==================================',
        'BCRYPT_ROUNDS=12',
        'PASSWORD_MIN_LENGTH=12',
        'PASSWORD_REQUIRE_UPPERCASE=true',
        'PASSWORD_REQUIRE_LOWERCASE=true',
        'PASSWORD_REQUIRE_NUMBERS=true',
        'PASSWORD_REQUIRE_SPECIAL=true',
        'MAX_LOGIN_ATTEMPTS=5',
        'LOCKOUT_DURATION=900000',
        '',
        '# ==================================',
        '# CORS CONFIGURATION',
        '# ==================================',
        'CORS_ORIGIN=https://yourdomain.com',
        'CORS_CREDENTIALS=true',
        '',
        '# ==================================',
        '# LOGGING',
        '# ==================================',
        'LOG_LEVEL=info',
        'LOG_DIR=./logs',
        'LOG_MAX_SIZE=100m',
        'LOG_MAX_FILES=90d',
        'AUDIT_LOG_RETENTION_DAYS=90',
        '',
        '# ==================================',
        '# MONITORING',
        '# ==================================',
        'PROMETHEUS_PORT=9090',
        'METRICS_ENABLED=true',
        'HEALTH_CHECK_INTERVAL=30000',
        '',
        '# ==================================',
        '# EMAIL CONFIGURATION (Optional)',
        '# ==================================',
        '# SMTP_HOST=smtp.example.com',
        '# SMTP_PORT=587',
        '# SMTP_SECURE=true',
        '# SMTP_USER=notifications@example.com',
        '# SMTP_PASSWORD=CHANGE_THIS',
        '# EMAIL_FROM=noreply@example.com',
        '',
        '# ==================================',
        '# CLOUD SERVICES (Optional)',
        '# ==================================',
        '# AWS_REGION=us-east-1',
        '# AWS_ACCESS_KEY_ID=CHANGE_THIS',
        '# AWS_SECRET_ACCESS_KEY=CHANGE_THIS',
        '# S3_BUCKET=zekka-uploads',
        '',
        '# ==================================',
        '# EXTERNAL APIs (Optional)',
        '# ==================================',
        '# OPENAI_API_KEY=sk-...',
        '# ANTHROPIC_API_KEY=sk-ant-...',
        '# GOOGLE_API_KEY=...',
        '',
        '# ==================================',
        '# SECRETS METADATA',
        '# ==================================',
        `SECRETS_GENERATED_AT=${secrets.SECRETS_GENERATED_AT}`,
        '',
        '# ==================================',
        '# IMPORTANT SECURITY NOTES:',
        '# ==================================',
        '# 1. Change all "CHANGE_THIS_PASSWORD" placeholders',
        '# 2. Never commit this file to version control',
        '# 3. Use different secrets for each environment',
        '# 4. Rotate secrets regularly (every 90 days)',
        '# 5. Use a secrets manager in production (AWS Secrets Manager, HashiCorp Vault)',
        '# 6. Ensure .env is in .gitignore',
        '# 7. Backup this file securely',
        '# =================================='
      );
    }

    return lines.join('\n');
  }

  /**
   * Save secrets to file
   */
  static saveToFile(filePath, content) {
    // Check if file exists and warn
    if (fs.existsSync(filePath)) {
      console.warn(`⚠️  WARNING: ${filePath} already exists!`);
      const backupPath = `${filePath}.backup.${Date.now()}`;
      fs.copyFileSync(filePath, backupPath);
      console.log(`📦 Existing file backed up to: ${backupPath}`);
    }

    // Write with restricted permissions (600 - owner read/write only)
    fs.writeFileSync(filePath, content, { mode: 0o600 });
    console.log(`✅ Secrets generated and saved to: ${filePath}`);
    console.log(`🔒 File permissions set to 600 (owner read/write only)`);
  }

  /**
   * Display secrets (for manual copying)
   */
  static displaySecrets(secrets) {
    console.log('\n' + '='.repeat(60));
    console.log('🔐 GENERATED SECRETS');
    console.log('='.repeat(60));
    console.log('\n⚠️  SECURITY WARNING: These secrets are displayed only once!');
    console.log('   Copy them to a secure location immediately.\n');
    
    Object.entries(secrets).forEach(([key, value]) => {
      console.log(`${key}=${value}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🔒 Store these secrets securely and never share them!');
    console.log('='.repeat(60) + '\n');
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const outputFile = args.includes('--output') 
    ? args[args.indexOf('--output') + 1] 
    : null;
  const displayOnly = args.includes('--display-only');

  console.log('\n🔐 Zekka Framework - Secure Secrets Generator\n');

  // Generate secrets
  const secrets = SecretGenerator.generateAllSecrets();

  if (displayOnly) {
    // Just display secrets
    SecretGenerator.displaySecrets(secrets);
  } else if (outputFile) {
    // Save to specified file
    const envContent = SecretGenerator.generateEnvFile(secrets, true);
    const fullPath = path.resolve(process.cwd(), outputFile);
    SecretGenerator.saveToFile(fullPath, envContent);
    
    console.log('\n📝 Next steps:');
    console.log('   1. Review and update database credentials');
    console.log('   2. Review and update Redis credentials');
    console.log('   3. Add any optional API keys needed');
    console.log('   4. Verify all CHANGE_THIS placeholders are updated');
    console.log('   5. Run: npm run validate:env\n');
  } else {
    // Default: save to .env
    const envContent = SecretGenerator.generateEnvFile(secrets, true);
    const envPath = path.resolve(process.cwd(), '.env');
    SecretGenerator.saveToFile(envPath, envContent);
    
    console.log('\n📝 Next steps:');
    console.log('   1. Edit .env and update database credentials');
    console.log('   2. Edit .env and update Redis credentials');
    console.log('   3. Add any optional API keys needed');
    console.log('   4. Verify all CHANGE_THIS placeholders are updated');
    console.log('   5. Run: npm run validate:env\n');
  }
}

module.exports = SecretGenerator;
