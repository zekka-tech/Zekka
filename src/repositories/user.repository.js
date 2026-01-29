/**
 * User Repository
 * Database operations for users
 *
 * SECURITY FIX: Phase 1 - Database user storage
 * SECURITY FIX: Phase 2 - SQL injection prevention with parameterized queries
 */

const { Pool } = require('pg');
const config = require('../config');
const {
  DatabaseError,
  NotFoundError,
  ConflictError
} = require('../utils/errors');

class UserRepository {
  constructor() {
    this.pool = new Pool({
      connectionString: config.database.url,
      min: config.database.poolMin,
      max: config.database.poolMax,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: config.isProduction ? { rejectUnauthorized: false } : false
    });

    this.pool.on('error', (err) => {
      console.error('❌ Unexpected database pool error:', err);
    });

    this.initializeSchema();
  }

  /**
   * Initialize database schema
   */
  async initializeSchema() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name VARCHAR(100) NOT NULL,
          mfa_enabled BOOLEAN DEFAULT false,
          mfa_secret TEXT,
          failed_login_attempts INTEGER DEFAULT 0,
          locked_until TIMESTAMP,
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      `);

      console.log('✅ User database schema initialized');
    } catch (error) {
      console.error('❌ Failed to initialize user schema:', error);
      throw new DatabaseError('Schema initialization failed', {
        error: error.message
      });
    }
  }

  /**
   * Create new user
   * SECURITY: Uses parameterized queries to prevent SQL injection
   */
  async create({ email, passwordHash, name }) {
    try {
      const result = await this.pool.query(
        `INSERT INTO users (email, password_hash, name) 
         VALUES ($1, $2, $3) 
         RETURNING id, email, name, created_at`,
        [email, passwordHash, name]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        // Unique violation
        throw new ConflictError('User with this email already exists');
      }
      throw new DatabaseError('Failed to create user', {
        error: error.message
      });
    }
  }

  /**
   * Find user by email
   * SECURITY: Uses parameterized queries to prevent SQL injection
   */
  async findByEmail(email) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw new DatabaseError('Failed to find user', { error: error.message });
    }
  }

  /**
   * Find user by ID
   * SECURITY: Uses parameterized queries to prevent SQL injection
   */
  async findById(id) {
    try {
      const result = await this.pool.query(
        'SELECT id, email, name, mfa_enabled, last_login, created_at, updated_at FROM users WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('User');
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to find user', { error: error.message });
    }
  }

  /**
   * Update user
   * SECURITY: Uses parameterized queries to prevent SQL injection
   */
  async update(id, updates) {
    const allowedFields = ['name', 'mfa_enabled', 'mfa_secret', 'last_login'];
    const fields = Object.keys(updates).filter((key) => allowedFields.includes(key));

    if (fields.length === 0) {
      return this.findById(id);
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 2}`)
      .join(', ');
    const values = [id, ...fields.map((field) => updates[field])];

    try {
      const result = await this.pool.query(
        `UPDATE users 
         SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
         RETURNING id, email, name, mfa_enabled, last_login, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('User');
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to update user', {
        error: error.message
      });
    }
  }

  /**
   * Update failed login attempts
   * SECURITY: Track failed logins for brute force protection
   */
  async incrementFailedAttempts(email) {
    try {
      const result = await this.pool.query(
        `UPDATE users 
         SET failed_login_attempts = failed_login_attempts + 1,
             locked_until = CASE 
               WHEN failed_login_attempts >= 4 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
               ELSE locked_until
             END
         WHERE email = $1
         RETURNING failed_login_attempts, locked_until`,
        [email]
      );

      return result.rows[0];
    } catch (error) {
      throw new DatabaseError('Failed to update login attempts', {
        error: error.message
      });
    }
  }

  /**
   * Reset failed login attempts
   */
  async resetFailedAttempts(email) {
    try {
      await this.pool.query(
        `UPDATE users 
         SET failed_login_attempts = 0,
             locked_until = NULL,
             last_login = CURRENT_TIMESTAMP
         WHERE email = $1`,
        [email]
      );
    } catch (error) {
      throw new DatabaseError('Failed to reset login attempts', {
        error: error.message
      });
    }
  }

  /**
   * Check if user is locked
   */
  async isLocked(email) {
    try {
      const result = await this.pool.query(
        'SELECT locked_until FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const lockedUntil = result.rows[0].locked_until;
      if (!lockedUntil) return false;

      return new Date(lockedUntil) > new Date();
    } catch (error) {
      throw new DatabaseError('Failed to check lock status', {
        error: error.message
      });
    }
  }

  /**
   * Delete user (for testing)
   */
  async delete(id) {
    try {
      const result = await this.pool.query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('User');
      }

      return true;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to delete user', {
        error: error.message
      });
    }
  }

  /**
   * Close database connection
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = UserRepository;
