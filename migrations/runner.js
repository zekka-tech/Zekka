#!/usr/bin/env node

/**
 * Database Migration Runner
 * =========================
 *
 * Handles execution of SQL migration files in order.
 * Tracks applied migrations to prevent re-running.
 *
 * Usage:
 *   node migrations/runner.js          - Run all pending migrations
 *   node migrations/runner.js status   - Show migration status
 *   node migrations/runner.js rollback - Rollback last migration (if supported)
 *   node migrations/runner.js verify   - Verify database schema
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

// Configuration
const MIGRATIONS_DIR = __dirname;
const MIGRATIONS_TABLE = 'schema_migrations';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Initialize migrations table
 */
async function initMigrationsTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER,
        checksum VARCHAR(64)
      );
      CREATE INDEX IF NOT EXISTS idx_migrations_name ON ${MIGRATIONS_TABLE}(name);
      CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON ${MIGRATIONS_TABLE}(executed_at);
    `);
    console.log(`✅ Migrations table '${MIGRATIONS_TABLE}' initialized`);
  } catch (error) {
    console.error('❌ Error initializing migrations table:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get list of migration files
 */
async function getMigrationFiles() {
  try {
    const files = await fs.readdir(MIGRATIONS_DIR);
    return files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure migrations run in order
  } catch (error) {
    console.error('❌ Error reading migration files:', error);
    throw error;
  }
}

/**
 * Get applied migrations from database
 */
async function getAppliedMigrations() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT name, executed_at, execution_time_ms FROM ${MIGRATIONS_TABLE} ORDER BY executed_at ASC`
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching applied migrations:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Calculate file checksum
 */
function calculateChecksum(content) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Run a single migration
 */
async function runMigration(filename) {
  const client = await pool.connect();
  const startTime = Date.now();

  try {
    // Read migration file
    const filePath = path.join(MIGRATIONS_DIR, filename);
    const sql = await fs.readFile(filePath, 'utf8');
    const checksum = calculateChecksum(sql);

    console.log(`\n🔄 Running migration: ${filename}`);

    // Execute migration in a transaction
    await client.query('BEGIN');

    // Execute the migration SQL
    await client.query(sql);

    // Record migration
    const executionTime = Date.now() - startTime;
    await client.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (name, execution_time_ms, checksum)
       VALUES ($1, $2, $3)`,
      [filename, executionTime, checksum]
    );

    await client.query('COMMIT');

    console.log(`✅ Migration completed: ${filename} (${executionTime}ms)`);
    return { success: true, filename, executionTime };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Migration failed: ${filename}`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  try {
    // Initialize migrations table
    await initMigrationsTable();

    // Get all migration files
    const migrationFiles = await getMigrationFiles();
    console.log(`📁 Found ${migrationFiles.length} migration files`);

    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations();
    const appliedNames = new Set(appliedMigrations.map(m => m.name));
    console.log(`✔️  ${appliedNames.size} migrations already applied\n`);

    // Find pending migrations
    const pendingMigrations = migrationFiles.filter(file => !appliedNames.has(file));

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations to run');
      return;
    }

    console.log(`⏳ Running ${pendingMigrations.length} pending migrations:\n`);
    pendingMigrations.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    console.log('');

    // Run each pending migration
    const results = [];
    for (const file of pendingMigrations) {
      const result = await runMigration(file);
      results.push(result);
    }

    // Summary
    const totalTime = results.reduce((sum, r) => sum + r.executionTime, 0);
    console.log(`\n✅ Successfully ran ${results.length} migrations in ${totalTime}ms`);
  } catch (error) {
    console.error('\n❌ Migration process failed:', error);
    throw error;
  }
}

/**
 * Show migration status
 */
async function showStatus() {
  console.log('📊 Migration Status\n');

  try {
    await initMigrationsTable();

    const migrationFiles = await getMigrationFiles();
    const appliedMigrations = await getAppliedMigrations();
    const appliedNames = new Set(appliedMigrations.map(m => m.name));

    console.log('Applied Migrations:');
    console.log('==================');
    if (appliedMigrations.length === 0) {
      console.log('   (none)');
    } else {
      appliedMigrations.forEach((migration, index) => {
        const time = new Date(migration.executed_at).toLocaleString();
        console.log(`   ${index + 1}. ${migration.name}`);
        console.log(`      Executed: ${time} (${migration.execution_time_ms}ms)`);
      });
    }

    console.log('\nPending Migrations:');
    console.log('==================');
    const pendingMigrations = migrationFiles.filter(file => !appliedNames.has(file));
    if (pendingMigrations.length === 0) {
      console.log('   (none)');
    } else {
      pendingMigrations.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`);
      });
    }

    console.log(`\nTotal: ${migrationFiles.length} migrations (${appliedMigrations.length} applied, ${pendingMigrations.length} pending)`);
  } catch (error) {
    console.error('❌ Error showing migration status:', error);
    throw error;
  }
}

/**
 * Verify database schema
 */
async function verify() {
  console.log('🔍 Verifying database schema...\n');

  const client = await pool.connect();
  try {
    // Check if migrations table exists
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('📋 Database Tables:');
    console.log('==================');
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    // Get table sizes
    const sizesResult = await client.query(`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    `);

    console.log('\n📊 Table Sizes:');
    console.log('==============');
    sizesResult.rows.forEach((row) => {
      console.log(`   ${row.tablename}: ${row.size}`);
    });

    // Get database version
    const versionResult = await client.query('SELECT version()');
    console.log(`\n📌 PostgreSQL Version:`);
    console.log(`   ${versionResult.rows[0].version.split(',')[0]}`);

    console.log('\n✅ Database schema verification complete');
  } catch (error) {
    console.error('❌ Error verifying database:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Rollback last migration
 */
async function rollback() {
  console.log('⏪ Rolling back last migration...\n');

  const client = await pool.connect();
  try {
    // Get last migration
    const result = await client.query(
      `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY executed_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      console.log('ℹ️  No migrations to rollback');
      return;
    }

    const lastMigration = result.rows[0].name;
    console.log(`🔄 Rolling back: ${lastMigration}`);

    // Check if rollback file exists
    const rollbackFile = lastMigration.replace('.sql', '_rollback.sql');
    const rollbackPath = path.join(MIGRATIONS_DIR, rollbackFile);

    try {
      await fs.access(rollbackPath);
    } catch {
      console.error(`❌ Rollback file not found: ${rollbackFile}`);
      console.log('⚠️  Manual rollback required');
      return;
    }

    // Read and execute rollback
    const rollbackSql = await fs.readFile(rollbackPath, 'utf8');

    await client.query('BEGIN');
    await client.query(rollbackSql);
    await client.query(
      `DELETE FROM ${MIGRATIONS_TABLE} WHERE name = $1`,
      [lastMigration]
    );
    await client.query('COMMIT');

    console.log(`✅ Successfully rolled back: ${lastMigration}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2] || 'run';

  try {
    switch (command.toLowerCase()) {
      case 'run':
      case 'migrate':
        await runMigrations();
        break;
      case 'status':
        await showStatus();
        break;
      case 'verify':
        await verify();
        break;
      case 'rollback':
        await rollback();
        break;
      default:
        console.log(`
Usage: node runner.js [command]

Commands:
  run, migrate  - Run all pending migrations (default)
  status        - Show migration status
  verify        - Verify database schema
  rollback      - Rollback last migration

Examples:
  node runner.js
  node runner.js status
  node runner.js verify
  node runner.js rollback
        `);
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  runMigrations,
  showStatus,
  verify,
  rollback
};
