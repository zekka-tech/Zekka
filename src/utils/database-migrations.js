/**
 * Database Migrations Framework
 * 
 * Features:
 * - Version-controlled schema changes
 * - Rollback support
 * - Migration tracking
 * - Automatic execution on startup
 * - CLI commands for management
 */

const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../config/database');

class MigrationManager {
  constructor(options = {}) {
    this.migrationsDir = options.migrationsDir || path.join(process.cwd(), 'migrations');
    this.tableName = options.tableName || 'migrations';
    this.pool = options.pool || pool;
  }
  
  /**
   * Initialize migrations table
   */
  async initialize() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER,
        checksum VARCHAR(64)
      )
    `);
  }
  
  /**
   * Get all migration files
   */
  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      return files
        .filter(f => f.endsWith('.sql') || f.endsWith('.js'))
        .sort();
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(this.migrationsDir, { recursive: true });
        return [];
      }
      throw error;
    }
  }
  
  /**
   * Get executed migrations
   */
  async getExecutedMigrations() {
    const result = await this.pool.query(
      `SELECT name, executed_at, execution_time_ms FROM ${this.tableName} ORDER BY id`
    );
    return result.rows;
  }
  
  /**
   * Get pending migrations
   */
  async getPendingMigrations() {
    const allFiles = await this.getMigrationFiles();
    const executed = await this.getExecutedMigrations();
    const executedNames = new Set(executed.map(m => m.name));
    
    return allFiles.filter(f => !executedNames.has(f));
  }
  
  /**
   * Execute a single migration
   */
  async executeMigration(filename) {
    const filepath = path.join(this.migrationsDir, filename);
    const ext = path.extname(filename);
    
    const startTime = Date.now();
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      if (ext === '.sql') {
        // Execute SQL migration
        const sql = await fs.readFile(filepath, 'utf8');
        await client.query(sql);
      } else if (ext === '.js') {
        // Execute JavaScript migration
        const migration = require(filepath);
        if (typeof migration.up === 'function') {
          await migration.up(client);
        } else {
          throw new Error(`Migration ${filename} must export an 'up' function`);
        }
      }
      
      // Record migration
      const executionTime = Date.now() - startTime;
      const checksum = await this.calculateChecksum(filepath);
      
      await client.query(
        `INSERT INTO ${this.tableName} (name, execution_time_ms, checksum)
         VALUES ($1, $2, $3)`,
        [filename, executionTime, checksum]
      );
      
      await client.query('COMMIT');
      
      return {
        name: filename,
        success: true,
        executionTime
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${filename} failed: ${error.message}`);
    } finally {
      client.release();
    }
  }
  
  /**
   * Rollback a migration
   */
  async rollbackMigration(filename) {
    const filepath = path.join(this.migrationsDir, filename);
    const ext = path.extname(filename);
    
    if (ext !== '.js') {
      throw new Error('Rollback is only supported for JavaScript migrations');
    }
    
    const migration = require(filepath);
    if (typeof migration.down !== 'function') {
      throw new Error(`Migration ${filename} must export a 'down' function for rollback`);
    }
    
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      await migration.down(client);
      
      await client.query(
        `DELETE FROM ${this.tableName} WHERE name = $1`,
        [filename]
      );
      
      await client.query('COMMIT');
      
      return {
        name: filename,
        success: true
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Rollback of ${filename} failed: ${error.message}`);
    } finally {
      client.release();
    }
  }
  
  /**
   * Run all pending migrations
   */
  async runPending() {
    await this.initialize();
    
    const pending = await this.getPendingMigrations();
    
    if (pending.length === 0) {
      return {
        message: 'No pending migrations',
        executed: []
      };
    }
    
    const results = [];
    
    for (const filename of pending) {
      console.log(`Executing migration: ${filename}`);
      const result = await this.executeMigration(filename);
      results.push(result);
      console.log(`✅ ${filename} executed in ${result.executionTime}ms`);
    }
    
    return {
      message: `Executed ${results.length} migration(s)`,
      executed: results
    };
  }
  
  /**
   * Rollback last migration
   */
  async rollbackLast() {
    const executed = await this.getExecutedMigrations();
    
    if (executed.length === 0) {
      return {
        message: 'No migrations to rollback',
        rolledBack: null
      };
    }
    
    const lastMigration = executed[executed.length - 1];
    console.log(`Rolling back migration: ${lastMigration.name}`);
    
    await this.rollbackMigration(lastMigration.name);
    
    console.log(`✅ ${lastMigration.name} rolled back`);
    
    return {
      message: 'Migration rolled back',
      rolledBack: lastMigration
    };
  }
  
  /**
   * Get migration status
   */
  async getStatus() {
    await this.initialize();
    
    const allFiles = await this.getMigrationFiles();
    const executed = await this.getExecutedMigrations();
    const pending = await this.getPendingMigrations();
    
    return {
      total: allFiles.length,
      executed: executed.length,
      pending: pending.length,
      migrations: {
        executed: executed.map(m => ({
          name: m.name,
          executedAt: m.executed_at,
          executionTime: m.execution_time_ms
        })),
        pending: pending
      }
    };
  }
  
  /**
   * Create a new migration file
   */
  async createMigration(name, type = 'sql') {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const filename = `${timestamp}_${name}.${type}`;
    const filepath = path.join(this.migrationsDir, filename);
    
    await fs.mkdir(this.migrationsDir, { recursive: true });
    
    if (type === 'sql') {
      await fs.writeFile(filepath, `-- Migration: ${name}\n-- Created: ${new Date().toISOString()}\n\n-- Add your SQL here\n`);
    } else if (type === 'js') {
      const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

module.exports = {
  /**
   * Run the migration
   */
  async up(client) {
    // Add your migration code here
    await client.query(\`
      -- Your SQL here
    \`);
  },
  
  /**
   * Rollback the migration
   */
  async down(client) {
    // Add your rollback code here
    await client.query(\`
      -- Your rollback SQL here
    \`);
  }
};
`;
      await fs.writeFile(filepath, template);
    }
    
    return {
      message: 'Migration created',
      filename,
      filepath
    };
  }
  
  /**
   * Calculate checksum for migration file
   */
  async calculateChecksum(filepath) {
    const crypto = require('crypto');
    const content = await fs.readFile(filepath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  /**
   * Verify migration integrity
   */
  async verifyIntegrity() {
    const executed = await this.getExecutedMigrations();
    const issues = [];
    
    for (const migration of executed) {
      const filepath = path.join(this.migrationsDir, migration.name);
      
      try {
        const currentChecksum = await this.calculateChecksum(filepath);
        
        if (migration.checksum && currentChecksum !== migration.checksum) {
          issues.push({
            name: migration.name,
            issue: 'checksum_mismatch',
            expected: migration.checksum,
            actual: currentChecksum
          });
        }
      } catch (error) {
        issues.push({
          name: migration.name,
          issue: 'file_not_found'
        });
      }
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}

/**
 * CLI commands
 */
async function runCLI() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  const manager = new MigrationManager();
  
  try {
    switch (command) {
      case 'status':
        const status = await manager.getStatus();
        console.log('Migration Status:');
        console.log(`  Total: ${status.total}`);
        console.log(`  Executed: ${status.executed}`);
        console.log(`  Pending: ${status.pending}`);
        break;
        
      case 'up':
      case 'migrate':
        const result = await manager.runPending();
        console.log(result.message);
        break;
        
      case 'down':
      case 'rollback':
        const rollbackResult = await manager.rollbackLast();
        console.log(rollbackResult.message);
        break;
        
      case 'create':
        if (!arg) {
          console.error('Migration name required: npm run migrate:create <name>');
          process.exit(1);
        }
        const type = process.argv[4] || 'sql';
        const created = await manager.createMigration(arg, type);
        console.log(created.message);
        console.log(`File: ${created.filepath}`);
        break;
        
      case 'verify':
        const integrity = await manager.verifyIntegrity();
        if (integrity.valid) {
          console.log('✅ All migrations verified');
        } else {
          console.log('❌ Migration integrity issues:');
          integrity.issues.forEach(issue => {
            console.log(`  - ${issue.name}: ${issue.issue}`);
          });
        }
        break;
        
      default:
        console.log('Usage:');
        console.log('  npm run migrate:status   - Show migration status');
        console.log('  npm run migrate:up       - Run pending migrations');
        console.log('  npm run migrate:down     - Rollback last migration');
        console.log('  npm run migrate:create <name> [type] - Create new migration');
        console.log('  npm run migrate:verify   - Verify migration integrity');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  }
}

// Run CLI if executed directly
if (require.main === module) {
  runCLI();
}

module.exports = {
  MigrationManager,
  runCLI
};
