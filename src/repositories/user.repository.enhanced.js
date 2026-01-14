/**
 * Enhanced User Repository with Advanced Security Features
 * 
 * Features:
 * - Password history tracking
 * - Password expiration
 * - Account lockout
 * - Login attempt tracking
 * - User metadata
 */

const { pool } = require('../config/database');
const { getPasswordPolicyManager } = require('../utils/password-policy');
const { getKeyManager } = require('../utils/encryption-key-manager');

class EnhancedUserRepository {
  constructor() {
    this.policyManager = getPasswordPolicyManager();
    this.keyManager = getKeyManager();
  }
  
  /**
   * Initialize database schema
   */
  async initializeDatabase() {
    const client = await pool.connect();
    
    try {
      // Users table (enhanced)
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          is_locked BOOLEAN DEFAULT false,
          failed_login_attempts INTEGER DEFAULT 0,
          locked_until TIMESTAMP,
          password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          password_expires_at TIMESTAMP,
          must_change_password BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login_at TIMESTAMP,
          metadata JSONB DEFAULT '{}'::jsonb
        )
      `);
      
      // Password history table
      await client.query(`
        CREATE TABLE IF NOT EXISTS password_history (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          password_hash_encrypted TEXT NOT NULL,
          encryption_version INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
        CREATE INDEX IF NOT EXISTS idx_users_is_locked ON users(is_locked);
        CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
        CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON password_history(created_at);
      `);
      
      // Create trigger for updated_at
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);
      
      await client.query(`
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
        CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `);
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Create new user with password policy enforcement
   */
  async createUser(email, password, name, metadata = {}) {
    // Validate password
    const validation = this.policyManager.validatePassword(password, { email, name });
    if (!validation.isValid) {
      throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Hash password
    const passwordHash = await this.policyManager.hashPassword(password);
    
    // Calculate password expiration
    const policy = this.policyManager.getPolicy();
    const passwordExpiresAt = policy.expirationDays
      ? new Date(Date.now() + policy.expirationDays * 24 * 60 * 60 * 1000)
      : null;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Generate user ID
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Insert user
      const result = await client.query(
        `INSERT INTO users (
          id, email, password_hash, name, password_expires_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, name, is_active, created_at`,
        [userId, email.toLowerCase(), passwordHash, name, passwordExpiresAt, JSON.stringify(metadata)]
      );
      
      // Add to password history
      await this.addToPasswordHistory(client, userId, passwordHash);
      
      await client.query('COMMIT');
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Add password to history (encrypted)
   */
  async addToPasswordHistory(client, userId, passwordHash) {
    const encrypted = this.keyManager.encrypt(passwordHash);
    
    await client.query(
      `INSERT INTO password_history (user_id, password_hash_encrypted, encryption_version)
       VALUES ($1, $2, $3)`,
      [userId, JSON.stringify(encrypted), encrypted.version]
    );
    
    // Clean up old history based on policy
    const policy = this.policyManager.getPolicy();
    if (policy.historySize > 0) {
      await client.query(
        `DELETE FROM password_history
         WHERE user_id = $1
         AND id NOT IN (
           SELECT id FROM password_history
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT $2
         )`,
        [userId, policy.historySize]
      );
    }
  }
  
  /**
   * Change user password with history check
   */
  async changePassword(userId, newPassword, userInfo = {}) {
    // Validate password
    const validation = this.policyManager.validatePassword(newPassword, userInfo);
    if (!validation.isValid) {
      throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check password history
      const historyResult = await client.query(
        `SELECT password_hash_encrypted, encryption_version
         FROM password_history
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );
      
      for (const row of historyResult.rows) {
        try {
          const encryptedData = JSON.parse(row.password_hash_encrypted);
          const oldHash = this.keyManager.decrypt(encryptedData);
          const matches = await this.policyManager.verifyPassword(newPassword, oldHash);
          
          if (matches) {
            throw new Error('Password was used recently. Please choose a different password.');
          }
        } catch (error) {
          if (error.message.includes('recently')) {
            throw error;
          }
          // Ignore decryption errors for old passwords
        }
      }
      
      // Hash new password
      const passwordHash = await this.policyManager.hashPassword(newPassword);
      
      // Calculate expiration
      const policy = this.policyManager.getPolicy();
      const passwordExpiresAt = policy.expirationDays
        ? new Date(Date.now() + policy.expirationDays * 24 * 60 * 60 * 1000)
        : null;
      
      // Update user
      await client.query(
        `UPDATE users
         SET password_hash = $1,
             password_changed_at = CURRENT_TIMESTAMP,
             password_expires_at = $2,
             must_change_password = false
         WHERE id = $3`,
        [passwordHash, passwordExpiresAt, userId]
      );
      
      // Add to password history
      await this.addToPasswordHistory(client, userId, passwordHash);
      
      await client.query('COMMIT');
      
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Authenticate user
   */
  async authenticate(email, password) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const user = result.rows[0];
    
    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is disabled');
    }
    
    // Check if user is locked
    if (user.is_locked) {
      if (user.locked_until && new Date() > new Date(user.locked_until)) {
        // Unlock account
        await this.unlockAccount(user.id);
      } else {
        throw new Error('Account is locked due to too many failed login attempts');
      }
    }
    
    // Verify password
    const isValid = await this.policyManager.verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      await this.recordFailedLogin(user.id);
      return null;
    }
    
    // Check if password is expired
    if (user.password_expires_at && new Date() > new Date(user.password_expires_at)) {
      throw new Error('Password has expired. Please change your password.');
    }
    
    // Reset failed attempts and update last login
    await pool.query(
      `UPDATE users
       SET failed_login_attempts = 0,
           last_login_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [user.id]
    );
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordExpiresAt: user.password_expires_at,
      mustChangePassword: user.must_change_password
    };
  }
  
  /**
   * Record failed login attempt
   */
  async recordFailedLogin(userId) {
    const policy = this.policyManager.getPolicy();
    
    const result = await pool.query(
      `UPDATE users
       SET failed_login_attempts = failed_login_attempts + 1
       WHERE id = $1
       RETURNING failed_login_attempts`,
      [userId]
    );
    
    const attempts = result.rows[0]?.failed_login_attempts || 0;
    
    // Lock account if threshold reached
    if (attempts >= policy.maxFailedAttempts) {
      const lockoutDuration = policy.lockoutDurationMinutes * 60 * 1000;
      const lockedUntil = new Date(Date.now() + lockoutDuration);
      
      await pool.query(
        `UPDATE users
         SET is_locked = true,
             locked_until = $1
         WHERE id = $2`,
        [lockedUntil, userId]
      );
    }
    
    return attempts;
  }
  
  /**
   * Unlock account
   */
  async unlockAccount(userId) {
    await pool.query(
      `UPDATE users
       SET is_locked = false,
           locked_until = NULL,
           failed_login_attempts = 0
       WHERE id = $1`,
      [userId]
    );
  }
  
  /**
   * Get user by ID
   */
  async findById(userId) {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }
  
  /**
   * Get user by email
   */
  async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }
  
  /**
   * Update user metadata
   */
  async updateMetadata(userId, metadata) {
    await pool.query(
      `UPDATE users
       SET metadata = metadata || $1::jsonb
       WHERE id = $2`,
      [JSON.stringify(metadata), userId]
    );
  }
  
  /**
   * Get users requiring password change
   */
  async getUsersRequiringPasswordChange() {
    const result = await pool.query(
      `SELECT id, email, name, password_expires_at
       FROM users
       WHERE password_expires_at IS NOT NULL
       AND password_expires_at < CURRENT_TIMESTAMP
       AND is_active = true`
    );
    
    return result.rows;
  }
  
  /**
   * Get users with expiring passwords (for warnings)
   */
  async getUsersWithExpiringPasswords(daysUntilExpiration = 14) {
    const result = await pool.query(
      `SELECT id, email, name, password_expires_at
       FROM users
       WHERE password_expires_at IS NOT NULL
       AND password_expires_at > CURRENT_TIMESTAMP
       AND password_expires_at < CURRENT_TIMESTAMP + INTERVAL '${daysUntilExpiration} days'
       AND is_active = true`
    );
    
    return result.rows;
  }
}

// Singleton instance
let repositoryInstance = null;

/**
 * Get enhanced user repository instance
 */
function getEnhancedUserRepository() {
  if (!repositoryInstance) {
    repositoryInstance = new EnhancedUserRepository();
  }
  return repositoryInstance;
}

module.exports = {
  EnhancedUserRepository,
  getEnhancedUserRepository
};
