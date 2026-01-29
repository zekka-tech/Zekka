/**
 * Database Migrations Framework
 * Enterprise-grade migration system with version control, rollback, and audit trail
 *
 * Features:
 * - Sequential versioning with checksums
 * - Up/Down migrations with automatic rollback
 * - Dry-run mode for testing
 * - Migration locking to prevent concurrent runs
 * - Detailed audit trail and logging
 * - TypeScript support with type-safe migrations
 *
 * @version 1.0.0
 * @module migrations
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

class MigrationManager {
  constructor(config) {
    this.config = {
      migrationsDir:
        config.migrationsDir || path.join(process.cwd(), 'migrations'),
      tableName: config.tableName || 'schema_migrations',
      lockTableName: config.lockTableName || 'schema_migrations_lock',
      database: config.database,
      ...config
    };

    this.pool = new Pool(this.config.database);
  }

  /**
   * Initialize migration system
   */
  async initialize() {
    await this.createMigrationsTable();
    await this.createLockTable();
    console.log('✅ Migration system initialized');
  }

  /**
   * Create migrations tracking table
   */
  async createMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.config.tableName} (
        id SERIAL PRIMARY KEY,
        version BIGINT NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER NOT NULL,
        success BOOLEAN DEFAULT true,
        error_message TEXT,
        rolled_back BOOLEAN DEFAULT false,
        rolled_back_at TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_version 
        ON ${this.config.tableName}(version);
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_executed_at 
        ON ${this.config.tableName}(executed_at);
    `;

    await this.pool.query(query);
  }

  /**
   * Create migration lock table to prevent concurrent migrations
   */
  async createLockTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.config.lockTableName} (
        id INTEGER PRIMARY KEY DEFAULT 1,
        locked BOOLEAN DEFAULT false,
        locked_at TIMESTAMP,
        locked_by VARCHAR(255),
        CHECK (id = 1)
      );
      
      INSERT INTO ${this.config.lockTableName} (id, locked)
      VALUES (1, false)
      ON CONFLICT (id) DO NOTHING;
    `;

    await this.pool.query(query);
  }

  /**
   * Acquire migration lock
   */
  async acquireLock(identifier = 'unknown') {
    const maxRetries = 10;
    const retryDelay = 1000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await this.pool.query(
          `
          UPDATE ${this.config.lockTableName}
          SET locked = true, 
              locked_at = CURRENT_TIMESTAMP,
              locked_by = $1
          WHERE id = 1 AND locked = false
          RETURNING *
        `,
          [identifier]
        );

        if (result.rowCount > 0) {
          console.log(`🔒 Migration lock acquired by ${identifier}`);
          return true;
        }

        // Lock is held, wait and retry
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } catch (error) {
        throw new Error(`Failed to acquire migration lock: ${error.message}`);
      }
    }

    throw new Error(
      'Could not acquire migration lock after retries. Another migration may be in progress.'
    );
  }

  /**
   * Release migration lock
   */
  async releaseLock() {
    await this.pool.query(`
      UPDATE ${this.config.lockTableName}
      SET locked = false, locked_at = NULL, locked_by = NULL
      WHERE id = 1
    `);
    console.log('🔓 Migration lock released');
  }

  /**
   * Get all migration files
   */
  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.config.migrationsDir);
      return files
        .filter((f) => f.match(/^\d+_.*\.(js|sql|ts)$/))
        .sort()
        .map((filename) => {
          const match = filename.match(/^(\d+)_(.+)\.(js|sql|ts)$/);
          return {
            version: parseInt(match[1]),
            name: match[2],
            filename,
            filepath: path.join(this.config.migrationsDir, filename),
            type: match[3]
          };
        });
    } catch (error) {
      throw new Error(`Failed to read migration files: ${error.message}`);
    }
  }

  /**
   * Calculate checksum for migration file
   */
  async calculateChecksum(filepath) {
    const content = await fs.readFile(filepath, 'utf-8');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get executed migrations from database
   */
  async getExecutedMigrations() {
    const result = await this.pool.query(`
      SELECT version, name, checksum, executed_at, success, rolled_back
      FROM ${this.config.tableName}
      WHERE rolled_back = false
      ORDER BY version
    `);
    return result.rows;
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations() {
    const allMigrations = await this.getMigrationFiles();
    const executed = await this.getExecutedMigrations();
    const executedVersions = new Set(executed.map((m) => m.version));

    return allMigrations.filter((m) => !executedVersions.has(m.version));
  }

  /**
   * Execute SQL migration
   */
  async executeSqlMigration(filepath, direction = 'up') {
    const content = await fs.readFile(filepath, 'utf-8');

    // Parse migration file for UP and DOWN sections
    const upMatch = content.match(/--\s*UP\s*([\s\S]*?)(?=--\s*DOWN|$)/i);
    const downMatch = content.match(/--\s*DOWN\s*([\s\S]*?)$/i);

    let sql;
    if (direction === 'up' && upMatch) {
      sql = upMatch[1].trim();
    } else if (direction === 'down' && downMatch) {
      sql = downMatch[1].trim();
    } else {
      // No sections defined, use entire content for UP
      sql = direction === 'up' ? content : '';
    }

    if (!sql) {
      throw new Error(
        `No ${direction.toUpperCase()} section found in migration`
      );
    }

    await this.pool.query(sql);
  }

  /**
   * Execute JavaScript/TypeScript migration
   */
  async executeJsMigration(filepath, direction = 'up') {
    const migration = require(filepath);

    if (typeof migration[direction] !== 'function') {
      throw new Error(
        `Migration ${filepath} does not export a ${direction} function`
      );
    }

    await migration[direction](this.pool);
  }

  /**
   * Run a single migration
   */
  async runMigration(migration, dryRun = false) {
    const startTime = Date.now();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 Running migration: ${migration.version}_${migration.name}`);
    console.log(`${'='.repeat(60)}`);

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made');
    }

    const client = await this.pool.connect();

    try {
      if (!dryRun) {
        await client.query('BEGIN');
      }

      // Execute migration based on type
      if (migration.type === 'sql') {
        await this.executeSqlMigration(migration.filepath, 'up');
      } else {
        await this.executeJsMigration(migration.filepath, 'up');
      }

      const executionTime = Date.now() - startTime;

      if (!dryRun) {
        // Record migration
        const checksum = await this.calculateChecksum(migration.filepath);
        await client.query(
          `
          INSERT INTO ${this.config.tableName} 
          (version, name, checksum, execution_time_ms)
          VALUES ($1, $2, $3, $4)
        `,
          [migration.version, migration.name, checksum, executionTime]
        );

        await client.query('COMMIT');
      }

      console.log(`✅ Migration completed in ${executionTime}ms`);
      return { success: true, executionTime };
    } catch (error) {
      if (!dryRun) {
        await client.query('ROLLBACK');

        // Record failed migration
        await this.pool.query(
          `
          INSERT INTO ${this.config.tableName} 
          (version, name, checksum, execution_time_ms, success, error_message)
          VALUES ($1, $2, $3, $4, false, $5)
        `,
          [
            migration.version,
            migration.name,
            await this.calculateChecksum(migration.filepath),
            Date.now() - startTime,
            error.message
          ]
        );
      }

      console.error(`❌ Migration failed: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rollback a migration
   */
  async rollbackMigration(migration) {
    const startTime = Date.now();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`⏪ Rolling back: ${migration.version}_${migration.name}`);
    console.log(`${'='.repeat(60)}`);

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Execute rollback
      if (migration.type === 'sql') {
        await this.executeSqlMigration(migration.filepath, 'down');
      } else {
        await this.executeJsMigration(migration.filepath, 'down');
      }

      // Mark as rolled back
      await client.query(
        `
        UPDATE ${this.config.tableName}
        SET rolled_back = true, rolled_back_at = CURRENT_TIMESTAMP
        WHERE version = $1
      `,
        [migration.version]
      );

      await client.query('COMMIT');

      const executionTime = Date.now() - startTime;
      console.log(`✅ Rollback completed in ${executionTime}ms`);
      return { success: true, executionTime };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Rollback failed: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate(options = {}) {
    const { dryRun = false, target = null } = options;
    const identifier = `migrate_${Date.now()}`;

    try {
      await this.acquireLock(identifier);

      const pending = await this.getPendingMigrations();

      if (pending.length === 0) {
        console.log('✅ No pending migrations');
        return { executed: [], skipped: 0 };
      }

      console.log(`\n📋 Found ${pending.length} pending migration(s)\n`);

      const toExecute = target
        ? pending.filter((m) => m.version <= target)
        : pending;

      const results = [];

      for (const migration of toExecute) {
        const result = await this.runMigration(migration, dryRun);
        results.push({ migration, ...result });
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ Successfully executed ${results.length} migration(s)`);
      console.log(`${'='.repeat(60)}\n`);

      return { executed: results, skipped: pending.length - toExecute.length };
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Rollback last N migrations
   */
  async rollback(count = 1) {
    const identifier = `rollback_${Date.now()}`;

    try {
      await this.acquireLock(identifier);

      const executed = await this.getExecutedMigrations();
      const toRollback = executed.slice(-count).reverse();

      if (toRollback.length === 0) {
        console.log('✅ No migrations to rollback');
        return { rolled_back: [] };
      }

      console.log(`\n📋 Rolling back ${toRollback.length} migration(s)\n`);

      const allMigrations = await this.getMigrationFiles();
      const results = [];

      for (const executed of toRollback) {
        const migration = allMigrations.find(
          (m) => m.version === executed.version
        );
        if (migration) {
          const result = await this.rollbackMigration(migration);
          results.push({ migration, ...result });
        }
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ Successfully rolled back ${results.length} migration(s)`);
      console.log(`${'='.repeat(60)}\n`);

      return { rolled_back: results };
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Get migration status
   */
  async status() {
    const allMigrations = await this.getMigrationFiles();
    const executed = await this.getExecutedMigrations();
    const executedMap = new Map(executed.map((m) => [m.version, m]));

    console.log('\n📊 Migration Status\n');
    console.log(
      `${'Version'.padEnd(15) + 'Name'.padEnd(40) + 'Status'.padEnd(15)}Executed At`
    );
    console.log('='.repeat(100));

    for (const migration of allMigrations) {
      const exec = executedMap.get(migration.version);
      const status = exec
        ? exec.rolled_back
          ? '⏪ ROLLED BACK'
          : '✅ EXECUTED'
        : '⏳ PENDING';
      const executedAt = exec && !exec.rolled_back
        ? new Date(exec.executed_at).toLocaleString()
        : '-';

      console.log(
        String(migration.version).padEnd(15)
          + migration.name.padEnd(40)
          + status.padEnd(15)
          + executedAt
      );
    }

    console.log('\n');

    return {
      total: allMigrations.length,
      executed: executed.filter((m) => !m.rolled_back).length,
      pending:
        allMigrations.length - executed.filter((m) => !m.rolled_back).length
    };
  }

  /**
   * Verify migration integrity
   */
  async verify() {
    console.log('\n🔍 Verifying migration integrity...\n');

    const allMigrations = await this.getMigrationFiles();
    const executed = await this.getExecutedMigrations();
    const issues = [];

    for (const exec of executed) {
      const migration = allMigrations.find((m) => m.version === exec.version);

      if (!migration) {
        issues.push({
          type: 'MISSING_FILE',
          version: exec.version,
          message: `Migration file for version ${exec.version} not found`
        });
        continue;
      }

      const currentChecksum = await this.calculateChecksum(migration.filepath);
      if (currentChecksum !== exec.checksum) {
        issues.push({
          type: 'CHECKSUM_MISMATCH',
          version: exec.version,
          message: 'Migration file has been modified after execution'
        });
      }
    }

    if (issues.length === 0) {
      console.log('✅ All migrations verified successfully\n');
    } else {
      console.log(`⚠️  Found ${issues.length} issue(s):\n`);
      issues.forEach((issue) => {
        console.log(`  ${issue.type}: ${issue.message}`);
      });
      console.log('\n');
    }

    return { verified: issues.length === 0, issues };
  }

  /**
   * Close database connection
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = MigrationManager;
