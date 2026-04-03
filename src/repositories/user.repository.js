/**
 * User Repository
 * Centralized persistence layer for auth flows.
 */

const bcrypt = require('bcryptjs');
const { pool: sharedPool } = require('../config/database');
const {
  DatabaseError,
  NotFoundError,
  ConflictError
} = require('../utils/errors');

class UserRepository {
  constructor(pool = sharedPool) {
    this.pool = pool;
    this.initializeSchemaPromise = this.initializeSchema();
  }

  async initializeSchema() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(64) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          email_verified BOOLEAN DEFAULT false,
          login_attempts INTEGER DEFAULT 0,
          failed_login_attempts INTEGER DEFAULT 0,
          locked_until TIMESTAMP WITH TIME ZONE,
          last_login TIMESTAMP WITH TIME ZONE,
          metadata JSONB DEFAULT '{}'::jsonb,
          phone VARCHAR(32),
          telegram_id VARCHAR(64),
          username VARCHAR(255),
          auth_method VARCHAR(32) DEFAULT 'password',
          verified BOOLEAN DEFAULT false,
          password_expires_at TIMESTAMP WITH TIME ZONE,
          password_history JSONB DEFAULT '[]'::jsonb,
          reset_token TEXT,
          reset_token_expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
        CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
        CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
      `);

      await this.pool.query(`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
          ADD COLUMN IF NOT EXISTS phone VARCHAR(32),
          ADD COLUMN IF NOT EXISTS telegram_id VARCHAR(64),
          ADD COLUMN IF NOT EXISTS username VARCHAR(255),
          ADD COLUMN IF NOT EXISTS auth_method VARCHAR(32) DEFAULT 'password',
          ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS password_history JSONB DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS reset_token TEXT,
          ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
      `);
    } catch (error) {
      throw new DatabaseError('Schema initialization failed', {
        error: error.message
      });
    }
  }

  async ready() {
    await this.initializeSchemaPromise;
  }

  generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  toDomainUser(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.user_id || String(row.id),
      userId: row.user_id || String(row.id),
      email: row.email,
      password: row.password_hash,
      name: row.name,
      metadata: row.metadata || {},
      phone: row.phone || null,
      telegramId: row.telegram_id || null,
      username: row.username || null,
      authMethod: row.auth_method || 'password',
      verified: row.verified ?? row.email_verified ?? false,
      is_active: row.is_active,
      email_verified: row.email_verified,
      last_login: row.last_login,
      login_attempts: row.login_attempts ?? row.failed_login_attempts ?? 0,
      failed_login_attempts: row.failed_login_attempts ?? row.login_attempts ?? 0,
      locked_until: row.locked_until,
      password_expires_at: row.password_expires_at,
      password_history: Array.isArray(row.password_history)
        ? row.password_history
        : [],
      reset_token: row.reset_token,
      reset_token_expires_at: row.reset_token_expires_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  buildSyntheticEmail({ phone, telegramId }) {
    if (phone) {
      return `${phone.replace(/\D/g, '') || 'user'}@whatsapp.zekka.local`;
    }
    if (telegramId) {
      return `telegram-${telegramId}@telegram.zekka.local`;
    }
    return `user-${Date.now()}@zekka.local`;
  }

  buildDisplayName({ name, username, firstName, lastName, phone, telegramId }) {
    if (name) return name;
    const composite = [firstName, lastName].filter(Boolean).join(' ').trim();
    if (composite) return composite;
    if (username) return username;
    if (phone) return `WhatsApp ${phone}`;
    if (telegramId) return `Telegram ${telegramId}`;
    return 'Zekka User';
  }

  async create(input) {
    await this.ready();

    const {
      email,
      password,
      passwordHash,
      name,
      metadata = {},
      phone = null,
      telegramId = null,
      username = null,
      authMethod = 'password',
      verified = false,
      firstName,
      lastName
    } = input;

    const userId = input.userId || input.id || this.generateUserId();
    const resolvedEmail = (email || this.buildSyntheticEmail({ phone, telegramId }))
      .toLowerCase()
      .trim();
    const resolvedName = this.buildDisplayName({
      name,
      username,
      firstName,
      lastName,
      phone,
      telegramId
    });
    const resolvedPassword = passwordHash || password || `social-${userId}`;

    try {
      const result = await this.pool.query(
        `INSERT INTO users (
          user_id, email, password_hash, name, metadata, phone, telegram_id,
          username, auth_method, verified, email_verified
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          userId,
          resolvedEmail,
          resolvedPassword,
          resolvedName,
          JSON.stringify(metadata),
          phone,
          telegramId,
          username,
          authMethod,
          verified,
          verified
        ]
      );

      return this.toDomainUser(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictError('User with this identity already exists');
      }
      throw new DatabaseError('Failed to create user', {
        error: error.message
      });
    }
  }

  async findByEmail(email) {
    await this.ready();
    try {
      const result = await this.pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      );
      return this.toDomainUser(result.rows[0]);
    } catch (error) {
      throw new DatabaseError('Failed to find user by email', {
        error: error.message
      });
    }
  }

  async findById(id) {
    await this.ready();
    try {
      const result = await this.pool.query(
        'SELECT * FROM users WHERE user_id = $1 OR CAST(id AS TEXT) = $1',
        [id]
      );
      if (result.rows.length === 0) {
        throw new NotFoundError('User');
      }
      return this.toDomainUser(result.rows[0]);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to find user by id', {
        error: error.message
      });
    }
  }

  async findUserByPhone(phone) {
    await this.ready();
    const result = await this.pool.query(
      'SELECT * FROM users WHERE phone = $1',
      [phone]
    );
    return this.toDomainUser(result.rows[0]);
  }

  async findUserByTelegramId(telegramId) {
    await this.ready();
    const result = await this.pool.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [String(telegramId)]
    );
    return this.toDomainUser(result.rows[0]);
  }

  async update(id, updates) {
    await this.ready();
    const fieldMap = {
      name: 'name',
      metadata: 'metadata',
      phone: 'phone',
      telegramId: 'telegram_id',
      username: 'username',
      authMethod: 'auth_method',
      verified: 'verified',
      emailVerified: 'email_verified',
      lastLogin: 'last_login',
      lockedUntil: 'locked_until'
    };

    const entries = Object.entries(updates)
      .filter(([key, value]) => fieldMap[key] && value !== undefined);

    if (entries.length === 0) {
      return this.findById(id);
    }

    const values = [id];
    const setClause = entries.map(([key, value], index) => {
      values.push(key === 'metadata' ? JSON.stringify(value) : value);
      const column = fieldMap[key];
      const cast = key === 'metadata' ? '::jsonb' : '';
      return `${column} = $${index + 2}${cast}`;
    }).join(', ');

    const result = await this.pool.query(
      `UPDATE users
       SET ${setClause}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 OR CAST(id AS TEXT) = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    return this.toDomainUser(result.rows[0]);
  }

  async recordFailedLoginAttempt(userId) {
    await this.ready();
    await this.pool.query(
      `UPDATE users
       SET failed_login_attempts = COALESCE(failed_login_attempts, login_attempts, 0) + 1,
           login_attempts = COALESCE(failed_login_attempts, login_attempts, 0) + 1,
           locked_until = CASE
             WHEN COALESCE(failed_login_attempts, login_attempts, 0) + 1 >= 5
             THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
             ELSE locked_until
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 OR CAST(id AS TEXT) = $1`,
      [userId]
    );
  }

  async resetFailedLoginAttempts(userId) {
    await this.ready();
    await this.pool.query(
      `UPDATE users
       SET failed_login_attempts = 0,
           login_attempts = 0,
           locked_until = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 OR CAST(id AS TEXT) = $1`,
      [userId]
    );
  }

  async updateLastLogin(userId) {
    await this.ready();
    await this.pool.query(
      `UPDATE users
       SET last_login = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 OR CAST(id AS TEXT) = $1`,
      [userId]
    );
  }

  async checkPasswordHistory(userId, candidatePassword) {
    const user = await this.findById(userId);
    const passwordHashes = [user.password, ...(user.password_history || [])]
      .filter(Boolean);

    for (const hash of passwordHashes) {
      if (await bcrypt.compare(candidatePassword, hash)) {
        return true;
      }
    }

    return false;
  }

  async updatePassword(userId, hashedPassword) {
    const user = await this.findById(userId);
    const passwordHistory = [user.password, ...(user.password_history || [])]
      .filter(Boolean)
      .slice(0, 5);

    await this.pool.query(
      `UPDATE users
       SET password_hash = $2,
           password_history = $3::jsonb,
           password_expires_at = CURRENT_TIMESTAMP + INTERVAL '90 days',
           reset_token = NULL,
           reset_token_expires_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 OR CAST(id AS TEXT) = $1`,
      [userId, hashedPassword, JSON.stringify(passwordHistory)]
    );
  }

  async storeResetToken(userId, token) {
    await this.ready();
    await this.pool.query(
      `UPDATE users
       SET reset_token = $2,
           reset_token_expires_at = CURRENT_TIMESTAMP + INTERVAL '1 hour',
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 OR CAST(id AS TEXT) = $1`,
      [userId, token]
    );
  }

  async count() {
    const result = await this.pool.query('SELECT COUNT(*)::int AS count FROM users');
    return result.rows[0].count;
  }

  async countActive() {
    const result = await this.pool.query(
      'SELECT COUNT(*)::int AS count FROM users WHERE is_active = true'
    );
    return result.rows[0].count;
  }

  async countLocked() {
    const result = await this.pool.query(
      'SELECT COUNT(*)::int AS count FROM users WHERE locked_until > CURRENT_TIMESTAMP'
    );
    return result.rows[0].count;
  }

  async countExpiredPasswords() {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS count
       FROM users
       WHERE password_expires_at IS NOT NULL
         AND password_expires_at < CURRENT_TIMESTAMP`
    );
    return result.rows[0].count;
  }

  async delete(id) {
    await this.ready();
    const result = await this.pool.query(
      'DELETE FROM users WHERE user_id = $1 OR CAST(id AS TEXT) = $1 RETURNING user_id',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    return true;
  }

  async close() {
    if (this.pool !== sharedPool) {
      await this.pool.end();
    }
  }
}

module.exports = UserRepository;
