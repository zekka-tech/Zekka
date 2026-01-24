/**
 * Environment Configuration Validator
 * Checks if all required environment variables are set and valid.
 * Fails fast if configuration is missing.
 */

const requiredVars = [
  'NODE_ENV',
  'DATABASE_URL',
  'JWT_SECRET',
  'SESSION_SECRET',
  'ENCRYPTION_KEY'
];

const optionalVars = [
  'PORT',
  'LOG_LEVEL',
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_PASSWORD',
  'VAULT_ADDR',
  'VAULT_TOKEN'
];

function validateEnv() {
  const missing = [];
  const invalid = [];

  // Check required variables
  requiredVars.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  // Validate specific formats
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    invalid.push('JWT_SECRET must be at least 32 characters');
  }

  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    invalid.push('SESSION_SECRET must be at least 32 characters');
  }

  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 64) {
    invalid.push('ENCRYPTION_KEY must be exactly 64 characters (hex)');
  }

  if (missing.length > 0 || invalid.length > 0) {
    console.error('❌ Environment Validation Failed');
    
    if (missing.length > 0) {
      console.error('\nMissing Required Variables:');
      missing.forEach(v => console.error(` - ${v}`));
    }

    if (invalid.length > 0) {
      console.error('\nInvalid Variables:');
      invalid.forEach(v => console.error(` - ${v}`));
    }

    console.error('\nPlease check your .env file or deployment configuration.');
    process.exit(1);
  }

  console.log('✅ Environment configuration valid');
}

// Run validation if called directly
if (require.main === module) {
  // Load dotenv if available (dev mode)
  try {
    require('dotenv').config();
  } catch (e) {
    // Ignore in production if dotenv not installed or needed
  }
  validateEnv();
}

module.exports = validateEnv;
