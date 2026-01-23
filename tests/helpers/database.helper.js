/**
 * Database Test Helper
 * Utilities for database setup, teardown, and mocking in tests
 */

const { Pool } = require('pg');

class DatabaseHelper {
  constructor() {
    this.pool = null;
    this.client = null;
  }

  /**
   * Initialize test database connection
   */
  async initialize() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'zekka_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'test'
    });

    // Test connection
    try {
      this.client = await this.pool.connect();
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  /**
   * Begin transaction for test isolation
   */
  async beginTransaction() {
    if (!this.client) {
      await this.initialize();
    }
    await this.client.query('BEGIN');
  }

  /**
   * Rollback transaction after test
   */
  async rollbackTransaction() {
    if (this.client) {
      await this.client.query('ROLLBACK');
    }
  }

  /**
   * Commit transaction (rarely used in tests)
   */
  async commitTransaction() {
    if (this.client) {
      await this.client.query('COMMIT');
    }
  }

  /**
   * Clean up all test data
   */
  async cleanup() {
    if (!this.pool) return;

    const tables = [
      'agent_activity',
      'agent_tasks',
      'messages',
      'conversations',
      'project_members',
      'projects',
      'sessions',
      'password_history',
      'users'
    ];

    for (const table of tables) {
      try {
        await this.pool.query(`TRUNCATE TABLE ${table} CASCADE`);
      } catch (error) {
        // Table might not exist, ignore
      }
    }
  }

  /**
   * Seed test data
   */
  async seed(table, data) {
    if (!this.pool) {
      await this.initialize();
    }

    if (Array.isArray(data)) {
      for (const row of data) {
        await this.insertRow(table, row);
      }
    } else {
      await this.insertRow(table, data);
    }
  }

  /**
   * Insert a single row
   */
  async insertRow(table, row) {
    const keys = Object.keys(row);
    const values = Object.values(row);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');

    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Query helper
   */
  async query(text, params = []) {
    if (!this.pool) {
      await this.initialize();
    }
    return this.pool.query(text, params);
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.client) {
      this.client.release();
      this.client = null;
    }

    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Create mock database pool
   */
  createMockPool() {
    return {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn(),
        release: jest.fn()
      }),
      end: jest.fn()
    };
  }

  /**
   * Create mock query result
   */
  mockQueryResult(rows = [], command = 'SELECT') {
    return {
      rows,
      rowCount: rows.length,
      command,
      fields: [],
      oid: null
    };
  }

  /**
   * Mock successful insert
   */
  mockInsert(data) {
    return this.mockQueryResult([data], 'INSERT');
  }

  /**
   * Mock successful update
   */
  mockUpdate(data) {
    return this.mockQueryResult([data], 'UPDATE');
  }

  /**
   * Mock successful delete
   */
  mockDelete(count = 1) {
    return this.mockQueryResult([], 'DELETE');
  }

  /**
   * Mock database error
   */
  mockError(message = 'Database error', code = '23505') {
    const error = new Error(message);
    error.code = code;
    error.constraint = 'test_constraint';
    return error;
  }
}

// Export singleton instance
const dbHelper = new DatabaseHelper();

module.exports = {
  DatabaseHelper,
  dbHelper,

  // Common mock responses
  mockDbResponse: dbHelper.mockQueryResult.bind(dbHelper),
  mockInsert: dbHelper.mockInsert.bind(dbHelper),
  mockUpdate: dbHelper.mockUpdate.bind(dbHelper),
  mockDelete: dbHelper.mockDelete.bind(dbHelper),
  mockDbError: dbHelper.mockError.bind(dbHelper)
};
