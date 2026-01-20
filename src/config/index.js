/**
 * Configuration Management
 * Centralized configuration with validation
 * 
 * SECURITY FIX: Phase 1 - Environment variable validation
 */

const joi = require('joi');
require('dotenv').config();

// Define validation schema
const envSchema = joi.object({
  // Environment
  NODE_ENV: joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  
  PORT: joi.number()
    .default(3000),
  
  // Database (REQUIRED)
  DATABASE_URL: joi.string()
    .required()
    .description('PostgreSQL connection string'),
  
  DATABASE_POOL_MIN: joi.number()
    .default(2),
  
  DATABASE_POOL_MAX: joi.number()
    .default(20),
  
  // Redis (REQUIRED)
  REDIS_HOST: joi.string()
    .default('localhost'),
  
  REDIS_PORT: joi.number()
    .default(6379),
  
  REDIS_PASSWORD: joi.string()
    .allow('')
    .default(''),
  
  // JWT (REQUIRED - NO DEFAULT)
  JWT_SECRET: joi.string()
    .min(32)
    .required()
    .description('JWT secret key (minimum 32 characters)'),
  
  JWT_EXPIRATION: joi.string()
    .default('24h'),
  
  // Encryption (REQUIRED - NO DEFAULT)
  ENCRYPTION_KEY: joi.string()
    .length(64)
    .required()
    .description('Encryption key (64 hex characters = 32 bytes)'),
  
  // Session (REQUIRED - NO DEFAULT)
  SESSION_SECRET: joi.string()
    .min(32)
    .required()
    .description('Session secret key (minimum 32 characters)'),
  
  // Password Requirements
  PASSWORD_MIN_LENGTH: joi.number()
    .min(12)
    .default(12),
  
  PASSWORD_REQUIRE_UPPERCASE: joi.boolean()
    .default(true),
  
  PASSWORD_REQUIRE_NUMBERS: joi.boolean()
    .default(true),
  
  PASSWORD_REQUIRE_SPECIAL: joi.boolean()
    .default(true),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: joi.number()
    .default(900000), // 15 minutes
  
  RATE_LIMIT_MAX_REQUESTS: joi.number()
    .default(100),
  
  AUTH_RATE_LIMIT_MAX: joi.number()
    .default(5),
  
  PROJECT_RATE_LIMIT_MAX: joi.number()
    .default(10),
  
  // Request Size Limits
  MAX_JSON_SIZE: joi.string()
    .default('1mb'),
  
  MAX_URL_ENCODED_SIZE: joi.string()
    .default('1mb'),
  
  // Logging
  LOG_LEVEL: joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  
  // External APIs (Optional)
  GITHUB_TOKEN: joi.string()
    .allow('')
    .default(''),
  
  ANTHROPIC_API_KEY: joi.string()
    .allow('')
    .default(''),
  
  OPENAI_API_KEY: joi.string()
    .allow('')
    .default(''),
  
  // CORS
  ALLOWED_ORIGINS: joi.string()
    .default('http://localhost:3000'),
  
  // Security
  TRUST_PROXY: joi.boolean()
    .default(false),
  
  // MFA
  MFA_ENABLED: joi.boolean()
    .default(true),
  
  // Session
  SESSION_TIMEOUT: joi.number()
    .default(3600000), // 1 hour
  
  // Postgres Password (if not in DATABASE_URL)
  POSTGRES_PASSWORD: joi.string()
    .allow('')
    .default(''),
  
  // Monitoring
  SENTRY_DSN: joi.string()
    .allow('')
    .default(''),
  
  // Budget
  DAILY_BUDGET: joi.number()
    .default(50),
  
  MONTHLY_BUDGET: joi.number()
    .default(1000),
  
  // TwinGate & Wazuh
  TWINGATE_API_URL: joi.string()
    .allow('')
    .default(''),
  
  TWINGATE_API_KEY: joi.string()
    .allow('')
    .default(''),
  
  WAZUH_API_URL: joi.string()
    .allow('')
    .default(''),
  
  WAZUH_USERNAME: joi.string()
    .allow('')
    .default(''),
  
  WAZUH_PASSWORD: joi.string()
    .allow('')
    .default(''),
  
  // Ollama
  OLLAMA_HOST: joi.string()
    .default('http://localhost:11434'),

  OLLAMA_MODEL: joi.string()
    .default('llama3.1:8b'),

  DEFAULT_MODEL: joi.string()
    .default('ollama'),

  MAX_CONCURRENT_AGENTS: joi.number()
    .default(10),

  // Model Configuration
  ARBITRATOR_MODEL: joi.string()
    .default('claude-sonnet-4-5'),

  ORCHESTRATOR_MODEL: joi.string()
    .default('gemini-pro'),

  FALLBACK_MODEL: joi.string()
    .default('llama3.1:8b'),

  // Gemini API Configuration
  GEMINI_API_KEY: joi.string()
    .allow('')
    .default(''),

  GEMINI_MODEL: joi.string()
    .default('gemini-pro'),

  GEMINI_TEMPERATURE: joi.number()
    .min(0)
    .max(1)
    .default(0.7),

  GEMINI_MAX_OUTPUT_TOKENS: joi.number()
    .default(8192),

  GEMINI_TOP_P: joi.number()
    .min(0)
    .max(1)
    .default(0.95),

  GEMINI_TOP_K: joi.number()
    .default(40),

  GEMINI_SAFETY_HARASSMENT: joi.string()
    .default('BLOCK_MEDIUM_AND_ABOVE'),

  GEMINI_SAFETY_HATE_SPEECH: joi.string()
    .default('BLOCK_MEDIUM_AND_ABOVE'),

  GEMINI_SAFETY_SEXUALLY_EXPLICIT: joi.string()
    .default('BLOCK_MEDIUM_AND_ABOVE'),

  GEMINI_SAFETY_DANGEROUS: joi.string()
    .default('BLOCK_MEDIUM_AND_ABOVE')

}).unknown(true); // Allow unknown env vars

// Validate environment variables
const { error, value: env } = envSchema.validate(process.env, {
  abortEarly: false
});

if (error) {
  const missingVars = error.details.map(detail => detail.message).join('\n  - ');
  console.error('❌ Configuration validation failed:');
  console.error(`  - ${missingVars}`);
  console.error('\n🔧 Required environment variables:');
  console.error('  - DATABASE_URL: PostgreSQL connection string');
  console.error('  - JWT_SECRET: Minimum 32 characters');
  console.error('  - ENCRYPTION_KEY: 64 hex characters (32 bytes)');
  console.error('  - SESSION_SECRET: Minimum 32 characters');
  console.error('\n📝 Create a .env file with these variables or set them in your environment.');
  console.error('   See .env.example for reference.\n');
  
  throw new Error('Configuration validation failed');
}

// Export validated configuration
const config = {
  // Environment
  env: env.NODE_ENV,
  port: env.PORT,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  
  // Database
  database: {
    url: env.DATABASE_URL,
    poolMin: env.DATABASE_POOL_MIN,
    poolMax: env.DATABASE_POOL_MAX,
    password: env.POSTGRES_PASSWORD
  },
  
  // Redis
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD
  },
  
  // JWT
  jwt: {
    secret: env.JWT_SECRET,
    expiration: env.JWT_EXPIRATION
  },
  
  // Encryption
  encryption: {
    key: Buffer.from(env.ENCRYPTION_KEY, 'hex')
  },
  
  // Session
  session: {
    secret: env.SESSION_SECRET,
    timeout: env.SESSION_TIMEOUT
  },
  
  // Password Policy
  password: {
    minLength: env.PASSWORD_MIN_LENGTH,
    requireUppercase: env.PASSWORD_REQUIRE_UPPERCASE,
    requireNumbers: env.PASSWORD_REQUIRE_NUMBERS,
    requireSpecial: env.PASSWORD_REQUIRE_SPECIAL
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    auth: {
      max: env.AUTH_RATE_LIMIT_MAX
    },
    project: {
      max: env.PROJECT_RATE_LIMIT_MAX
    }
  },
  
  // Request Limits
  limits: {
    json: env.MAX_JSON_SIZE,
    urlEncoded: env.MAX_URL_ENCODED_SIZE
  },
  
  // Logging
  logging: {
    level: env.LOG_LEVEL
  },
  
  // External APIs
  external: {
    github: env.GITHUB_TOKEN,
    anthropic: env.ANTHROPIC_API_KEY,
    openai: env.OPENAI_API_KEY,
    ollamaHost: env.OLLAMA_HOST
  },
  
  // CORS
  cors: {
    origins: env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  },
  
  // Security
  security: {
    trustProxy: env.TRUST_PROXY,
    mfaEnabled: env.MFA_ENABLED
  },
  
  // Budget
  budget: {
    daily: env.DAILY_BUDGET,
    monthly: env.MONTHLY_BUDGET
  },
  
  // Agent Config
  agents: {
    defaultModel: env.DEFAULT_MODEL,
    maxConcurrent: env.MAX_CONCURRENT_AGENTS
  },

  // Model Configuration (NEW)
  models: {
    // Component-specific model assignments
    arbitrator: {
      primary: env.ARBITRATOR_MODEL || 'claude-sonnet-4-5',
      fallback: env.FALLBACK_MODEL || 'llama3.1:8b',
      description: 'AI-powered conflict resolution'
    },
    orchestrator: {
      primary: env.ORCHESTRATOR_MODEL || 'gemini-pro',
      fallback: env.FALLBACK_MODEL || 'llama3.1:8b',
      description: 'Workflow coordination and planning'
    },
    // Gemini configuration
    gemini: {
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL || 'gemini-pro',
      temperature: parseFloat(env.GEMINI_TEMPERATURE) || 0.7,
      maxOutputTokens: parseInt(env.GEMINI_MAX_OUTPUT_TOKENS) || 8192,
      topP: parseFloat(env.GEMINI_TOP_P) || 0.95,
      topK: parseInt(env.GEMINI_TOP_K) || 40,
      safetySettings: {
        harassment: env.GEMINI_SAFETY_HARASSMENT || 'BLOCK_MEDIUM_AND_ABOVE',
        hateSpeech: env.GEMINI_SAFETY_HATE_SPEECH || 'BLOCK_MEDIUM_AND_ABOVE',
        sexuallyExplicit: env.GEMINI_SAFETY_SEXUALLY_EXPLICIT || 'BLOCK_MEDIUM_AND_ABOVE',
        dangerous: env.GEMINI_SAFETY_DANGEROUS || 'BLOCK_MEDIUM_AND_ABOVE'
      }
    },
    // Ollama configuration
    ollama: {
      host: env.OLLAMA_HOST || 'http://localhost:11434',
      model: env.OLLAMA_MODEL || 'llama3.1:8b'
    }
  },
  
  // Monitoring
  monitoring: {
    sentryDsn: env.SENTRY_DSN
  },
  
  // TwinGate
  twingate: {
    apiUrl: env.TWINGATE_API_URL,
    apiKey: env.TWINGATE_API_KEY
  },
  
  // Wazuh
  wazuh: {
    apiUrl: env.WAZUH_API_URL,
    username: env.WAZUH_USERNAME,
    password: env.WAZUH_PASSWORD
  }
};

// Log configuration (without secrets)
console.log('✅ Configuration loaded successfully');
console.log(`   Environment: ${config.env}`);
console.log(`   Port: ${config.port}`);
console.log(`   Database: Connected`);
console.log(`   Redis: ${config.redis.host}:${config.redis.port}`);
console.log(`   JWT: Configured (${config.jwt.expiration})`);
console.log(`   Password Min Length: ${config.password.minLength}`);
console.log(`   Rate Limit: ${config.rateLimit.max} req/${config.rateLimit.windowMs}ms`);
console.log(`   MFA: ${config.security.mfaEnabled ? 'Enabled' : 'Disabled'}`);

module.exports = config;
