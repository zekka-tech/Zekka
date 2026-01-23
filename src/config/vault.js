/**
 * Vault Configuration and Initialization
 *
 * Provides centralized Vault service configuration and initialization.
 * Exports a singleton Vault instance for use across the application.
 *
 * @module config/vault
 * @requires services/vault-service
 *
 * @description
 * This module:
 * - Creates a singleton Vault service instance
 * - Provides initialization function
 * - Exports helper functions for common secret operations
 *
 * @example
 * const { initVault, getVaultSecret } = require('./config/vault');
 * await initVault();
 * const dbPassword = await getVaultSecret('database/password');
 *
 * @author Zekka Technologies
 * @version 1.0.0
 * @since 2.0.0
 */

const VaultService = require('../services/vault-service');

let vaultInstance = null;

/**
 * Initialize the Vault service.
 *
 * @param {Object} [logger=console] - Logger instance
 * @returns {Promise<VaultService>} Initialized Vault service instance
 * @throws {Error} If Vault environment variables are not set or initialization fails
 *
 * @example
 * const vault = await initVault(logger);
 */
async function initVault(logger = console) {
  // Check if Vault is enabled
  const vaultEnabled = process.env.VAULT_ENABLED === 'true';

  if (!vaultEnabled) {
    logger.info('ℹ️  Vault integration disabled (VAULT_ENABLED=false)');
    return null;
  }

  // Validate required environment variables
  const requiredVars = ['VAULT_ADDR', 'VAULT_ROLE_ID', 'VAULT_SECRET_ID'];
  const missing = requiredVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(`Missing required Vault environment variables: ${missing.join(', ')}`);
  }

  try {
    vaultInstance = new VaultService({
      vaultAddr: process.env.VAULT_ADDR,
      roleId: process.env.VAULT_ROLE_ID,
      secretId: process.env.VAULT_SECRET_ID,
      mountPath: process.env.VAULT_MOUNT_PATH || 'kv',
      cacheTTL: parseInt(process.env.VAULT_CACHE_TTL) || 300000,
      logger
    });

    await vaultInstance.initialize();

    logger.info('✅ Vault service ready');
    return vaultInstance;
  } catch (error) {
    logger.error('❌ Vault initialization failed:', error.message);
    throw error;
  }
}

/**
 * Get the Vault service instance.
 *
 * @returns {VaultService|null} Vault service instance or null if not initialized
 * @throws {Error} If Vault is not initialized
 */
function getVault() {
  if (!vaultInstance) {
    throw new Error('Vault not initialized. Call initVault() first.');
  }
  return vaultInstance;
}

/**
 * Helper function to get a secret from Vault.
 * Falls back to environment variable if Vault is not available.
 *
 * @param {string} vaultPath - Path to secret in Vault
 * @param {string} envVarName - Environment variable name as fallback
 * @param {string} [field] - Specific field to extract from secret object
 * @returns {Promise<string|Object>} Secret value
 *
 * @example
 * // Get entire secret object
 * const dbCreds = await getVaultSecret('database/credentials', 'DATABASE_URL');
 *
 * // Get specific field
 * const dbPassword = await getVaultSecret('database/credentials', 'DB_PASSWORD', 'password');
 */
async function getVaultSecret(vaultPath, envVarName, field = null) {
  // If Vault is not initialized, fall back to environment variable
  if (!vaultInstance) {
    const envValue = process.env[envVarName];
    if (!envValue) {
      throw new Error(`Secret not found: Vault not available and ${envVarName} not set`);
    }
    return envValue;
  }

  try {
    const secret = await vaultInstance.getSecret(vaultPath);

    // Return specific field if requested
    if (field) {
      if (!secret[field]) {
        throw new Error(`Field '${field}' not found in secret '${vaultPath}'`);
      }
      return secret[field];
    }

    return secret;
  } catch (error) {
    // Fall back to environment variable if Vault fails
    const envValue = process.env[envVarName];
    if (envValue) {
      console.warn(`⚠️  Vault failed, using fallback env var: ${envVarName}`);
      return envValue;
    }
    throw error;
  }
}

/**
 * Helper function to get multiple secrets at once.
 *
 * @param {Object} secretMap - Map of key to {vaultPath, envVar, field}
 * @returns {Promise<Object>} Object with all secrets
 *
 * @example
 * const secrets = await getVaultSecrets({
 *   dbUrl: { vaultPath: 'database/url', envVar: 'DATABASE_URL' },
 *   jwtSecret: { vaultPath: 'auth/jwt-secret', envVar: 'JWT_SECRET' },
 *   githubToken: { vaultPath: 'api/github', envVar: 'GITHUB_TOKEN', field: 'token' }
 * });
 */
async function getVaultSecrets(secretMap) {
  const secrets = {};

  for (const [key, config] of Object.entries(secretMap)) {
    try {
      secrets[key] = await getVaultSecret(
        config.vaultPath,
        config.envVar,
        config.field
      );
    } catch (error) {
      throw new Error(`Failed to get secret '${key}': ${error.message}`);
    }
  }

  return secrets;
}

/**
 * Shutdown the Vault service.
 *
 * @returns {Promise<void>}
 */
async function shutdownVault() {
  if (vaultInstance) {
    await vaultInstance.shutdown();
    vaultInstance = null;
  }
}

module.exports = {
  initVault,
  getVault,
  getVaultSecret,
  getVaultSecrets,
  shutdownVault
};
