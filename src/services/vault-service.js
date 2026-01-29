/**
 * HashiCorp Vault Service
 *
 * Provides secure secrets management using HashiCorp Vault.
 * Implements AppRole authentication and KV v2 secrets engine.
 *
 * @module services/vault-service
 * @requires axios - HTTP client for Vault API
 *
 * @description
 * This service provides:
 * - AppRole authentication with auto-renewal
 * - KV v2 secrets engine integration
 * - Secret caching with TTL
 * - Automatic token renewal
 * - Health monitoring
 *
 * @example
 * const vault = new VaultService({
 *   vaultAddr: 'http://localhost:8200',
 *   roleId: process.env.VAULT_ROLE_ID,
 *   secretId: process.env.VAULT_SECRET_ID
 * });
 * await vault.initialize();
 * const dbPassword = await vault.getSecret('database/password');
 *
 * @author Zekka Technologies
 * @version 1.0.0
 * @since 2.0.0
 */

const axios = require('axios');
const crypto = require('crypto');

class VaultService {
  /**
   * Create a new Vault service instance.
   *
   * @param {Object} options - Configuration options
   * @param {string} options.vaultAddr - Vault server address (e.g., http://localhost:8200)
   * @param {string} options.roleId - AppRole Role ID for authentication
   * @param {string} options.secretId - AppRole Secret ID for authentication
   * @param {string} [options.mountPath='kv'] - KV secrets engine mount path
   * @param {number} [options.cacheTTL=300000] - Secret cache TTL in milliseconds (default 5 min)
   * @param {Object} [options.logger=console] - Logger instance
   *
   * @throws {Error} If vaultAddr, roleId, or secretId are not provided
   */
  constructor(options = {}) {
    // Validate required options
    if (!options.vaultAddr || !options.roleId || !options.secretId) {
      throw new Error(
        'vaultAddr, roleId, and secretId are required for Vault service'
      );
    }

    this.vaultAddr = options.vaultAddr;
    this.roleId = options.roleId;
    this.secretId = options.secretId;
    this.mountPath = options.mountPath || 'kv';
    this.cacheTTL = options.cacheTTL || 300000; // 5 minutes default
    this.logger = options.logger || console;

    // Internal state
    this.token = null;
    this.tokenExpiry = null;
    this.cache = new Map();
    this.renewalTimer = null;
    this.initialized = false;

    // Create axios instance with Vault base URL
    this.client = axios.create({
      baseURL: this.vaultAddr,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Initialize the Vault service by authenticating and starting token renewal.
   *
   * @returns {Promise<void>}
   * @throws {Error} If authentication fails
   */
  async initialize() {
    try {
      this.logger.info('🔐 Initializing Vault service...');

      // Authenticate with AppRole
      await this.authenticate();

      // Start automatic token renewal
      this.startTokenRenewal();

      this.initialized = true;
      this.logger.info('✅ Vault service initialized');
    } catch (error) {
      this.logger.error(
        '❌ Failed to initialize Vault service:',
        error.message
      );
      throw error;
    }
  }

  /**
   * Authenticate with Vault using AppRole method.
   *
   * @private
   * @returns {Promise<void>}
   * @throws {Error} If authentication fails
   */
  async authenticate() {
    try {
      const response = await this.client.post('/v1/auth/approle/login', {
        role_id: this.roleId,
        secret_id: this.secretId
      });

      const authData = response.data.auth;
      this.token = authData.client_token;
      this.tokenExpiry = Date.now() + authData.lease_duration * 1000;

      // Update client with authentication token
      this.client.defaults.headers.common['X-Vault-Token'] = this.token;

      this.logger.info('✅ Vault authentication successful');
    } catch (error) {
      this.logger.error('❌ Vault authentication failed:', error.message);
      throw new Error(`Vault authentication failed: ${error.message}`);
    }
  }

  /**
   * Start automatic token renewal process.
   * Renews token when it's 80% through its TTL.
   *
   * @private
   */
  startTokenRenewal() {
    if (this.renewalTimer) {
      clearInterval(this.renewalTimer);
    }

    // Check token every minute
    this.renewalTimer = setInterval(async () => {
      try {
        const now = Date.now();
        const timeToExpiry = this.tokenExpiry - now;
        const renewalThreshold = (this.tokenExpiry - (Date.now() - this.cacheTTL)) * 0.8;

        // Renew if 80% through TTL
        if (timeToExpiry < renewalThreshold) {
          this.logger.info('🔄 Renewing Vault token...');
          await this.renewToken();
        }
      } catch (error) {
        this.logger.error('❌ Token renewal failed:', error.message);
        // Try to re-authenticate if renewal fails
        try {
          await this.authenticate();
        } catch (authError) {
          this.logger.error('❌ Re-authentication failed:', authError.message);
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Renew the current Vault token.
   *
   * @private
   * @returns {Promise<void>}
   */
  async renewToken() {
    try {
      const response = await this.client.post('/v1/auth/token/renew-self');
      const authData = response.data.auth;
      this.tokenExpiry = Date.now() + authData.lease_duration * 1000;
      this.logger.info('✅ Vault token renewed');
    } catch (error) {
      throw new Error(`Token renewal failed: ${error.message}`);
    }
  }

  /**
   * Get a secret from Vault KV v2 secrets engine.
   *
   * @param {string} path - Secret path (e.g., 'database/credentials', 'api/github-token')
   * @param {boolean} [useCache=true] - Whether to use cached value if available
   * @returns {Promise<Object>} Secret data object
   * @throws {Error} If secret retrieval fails
   *
   * @example
   * const dbCreds = await vault.getSecret('database/credentials');
   * console.log(dbCreds.password); // Access specific field
   */
  async getSecret(path, useCache = true) {
    if (!this.initialized) {
      throw new Error(
        'Vault service not initialized. Call initialize() first.'
      );
    }

    // Check cache first
    if (useCache && this.cache.has(path)) {
      const cached = this.cache.get(path);
      if (Date.now() < cached.expiry) {
        this.logger.debug(`🔍 Cache hit for secret: ${path}`);
        return cached.data;
      }
      this.cache.delete(path);
    }

    try {
      // KV v2 uses /data/ in the path
      const response = await this.client.get(
        `/v1/${this.mountPath}/data/${path}`
      );
      const secretData = response.data.data.data;

      // Cache the secret
      this.cache.set(path, {
        data: secretData,
        expiry: Date.now() + this.cacheTTL
      });

      this.logger.debug(`✅ Retrieved secret: ${path}`);
      return secretData;
    } catch (error) {
      this.logger.error(`❌ Failed to get secret '${path}':`, error.message);
      throw new Error(
        `Failed to get secret '${path}': ${error.response?.data?.errors?.[0] || error.message}`
      );
    }
  }

  /**
   * Write a secret to Vault KV v2 secrets engine.
   *
   * @param {string} path - Secret path
   * @param {Object} data - Secret data to store
   * @returns {Promise<void>}
   * @throws {Error} If secret write fails
   *
   * @example
   * await vault.setSecret('database/credentials', {
   *   username: 'admin',
   *   password: 'secure-password'
   * });
   */
  async setSecret(path, data) {
    if (!this.initialized) {
      throw new Error(
        'Vault service not initialized. Call initialize() first.'
      );
    }

    try {
      // KV v2 uses /data/ in the path and wraps data in { data: {...} }
      await this.client.post(`/v1/${this.mountPath}/data/${path}`, {
        data
      });

      // Invalidate cache for this path
      this.cache.delete(path);

      this.logger.info(`✅ Secret written: ${path}`);
    } catch (error) {
      this.logger.error(`❌ Failed to write secret '${path}':`, error.message);
      throw new Error(
        `Failed to write secret '${path}': ${error.response?.data?.errors?.[0] || error.message}`
      );
    }
  }

  /**
   * Delete a secret from Vault.
   *
   * @param {string} path - Secret path
   * @returns {Promise<void>}
   * @throws {Error} If secret deletion fails
   */
  async deleteSecret(path) {
    if (!this.initialized) {
      throw new Error(
        'Vault service not initialized. Call initialize() first.'
      );
    }

    try {
      // KV v2 soft delete
      await this.client.delete(`/v1/${this.mountPath}/data/${path}`);

      // Remove from cache
      this.cache.delete(path);

      this.logger.info(`✅ Secret deleted: ${path}`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete secret '${path}':`, error.message);
      throw new Error(`Failed to delete secret '${path}': ${error.message}`);
    }
  }

  /**
   * Check if Vault service is healthy and authenticated.
   *
   * @returns {Promise<boolean>} True if healthy, false otherwise
   */
  async isHealthy() {
    try {
      // Check Vault server health
      const healthResponse = await this.client.get('/v1/sys/health');

      // Check token validity
      if (this.token) {
        await this.client.get('/v1/auth/token/lookup-self');
      }

      return healthResponse.status === 200 && this.initialized;
    } catch (error) {
      this.logger.error('❌ Vault health check failed:', error.message);
      return false;
    }
  }

  /**
   * Clear the secret cache.
   */
  clearCache() {
    this.cache.clear();
    this.logger.info('🗑️  Vault cache cleared');
  }

  /**
   * Shutdown the Vault service and cleanup resources.
   *
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.logger.info('🛑 Shutting down Vault service...');

    // Stop token renewal
    if (this.renewalTimer) {
      clearInterval(this.renewalTimer);
      this.renewalTimer = null;
    }

    // Clear cache
    this.clearCache();

    // Revoke token
    try {
      if (this.token) {
        await this.client.post('/v1/auth/token/revoke-self');
        this.logger.info('✅ Vault token revoked');
      }
    } catch (error) {
      this.logger.warn('⚠️  Failed to revoke token:', error.message);
    }

    this.token = null;
    this.tokenExpiry = null;
    this.initialized = false;

    this.logger.info('✅ Vault service shutdown complete');
  }

  /**
   * Get service status information.
   *
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      authenticated: !!this.token,
      tokenExpiry: this.tokenExpiry
        ? new Date(this.tokenExpiry).toISOString()
        : null,
      cacheSize: this.cache.size,
      vaultAddr: this.vaultAddr
    };
  }
}

module.exports = VaultService;
