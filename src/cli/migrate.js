#!/usr/bin/env node

/**
 * Zekka Database Migration CLI
 * Command-line interface for managing database migrations
 *
 * Usage:
 *   npm run migrate              # Run all pending migrations
 *   npm run migrate:status       # Show migration status
 *   npm run migrate:rollback     # Rollback last migration
 *   npm run migrate:create name  # Create new migration
 *   npm run migrate:verify       # Verify migration integrity
 *
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const MigrationManager = require('../utils/migration-manager');

// Parse DATABASE_URL if individual DB_* variables aren't set
function parseDatabaseConfig() {
  // If individual variables are set, use them
  if (process.env.DB_HOST) {
    return {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'zekka',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true'
    };
  }

  // Otherwise, parse DATABASE_URL
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      database: url.pathname.slice(1).split('?')[0], // Remove leading / and query params
      user: url.username,
      password: url.password,
      ssl: url.searchParams.get('sslmode') !== 'disable'
    };
  }

  // Default fallback
  return {
    host: 'localhost',
    port: 5432,
    database: 'zekka',
    user: 'postgres',
    password: '',
    ssl: false
  };
}

// Database configuration from environment
const config = {
  migrationsDir: path.join(__dirname, '../../migrations'),
  database: parseDatabaseConfig()
};

const commands = {
  /**
   * Initialize migration system
   */
  async init() {
    const manager = new MigrationManager(config);
    try {
      await manager.initialize();
      console.log('✅ Migration system initialized successfully');
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      process.exit(1);
    } finally {
      await manager.close();
    }
  },

  /**
   * Run pending migrations
   */
  async up(options = {}) {
    const manager = new MigrationManager(config);
    try {
      await manager.initialize();
      const result = await manager.migrate(options);

      if (result.executed.length === 0) {
        console.log('✅ Database is up to date');
      } else {
        console.log(`✅ Executed ${result.executed.length} migration(s)`);
      }
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    } finally {
      await manager.close();
    }
  },

  /**
   * Rollback migrations
   */
  async down(count = 1) {
    const manager = new MigrationManager(config);
    try {
      await manager.initialize();
      const result = await manager.rollback(count);

      if (result.rolled_back.length === 0) {
        console.log('✅ No migrations to rollback');
      } else {
        console.log(`✅ Rolled back ${result.rolled_back.length} migration(s)`);
      }
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      process.exit(1);
    } finally {
      await manager.close();
    }
  },

  /**
   * Show migration status
   */
  async status() {
    const manager = new MigrationManager(config);
    try {
      await manager.initialize();
      const result = await manager.status();
      console.log(
        `Summary: ${result.executed} executed, ${result.pending} pending, ${result.total} total`
      );
    } catch (error) {
      console.error('❌ Status check failed:', error.message);
      process.exit(1);
    } finally {
      await manager.close();
    }
  },

  /**
   * Verify migration integrity
   */
  async verify() {
    const manager = new MigrationManager(config);
    try {
      await manager.initialize();
      const result = await manager.verify();

      if (!result.verified) {
        console.error('⚠️  Migration integrity check failed');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      process.exit(1);
    } finally {
      await manager.close();
    }
  },

  /**
   * Create a new migration file
   */
  async create(name, type = 'sql') {
    if (!name) {
      console.error('❌ Migration name is required');
      console.log('Usage: npm run migrate:create <name> [type]');
      console.log('Types: sql (default), js');
      process.exit(1);
    }

    const timestamp = Date.now();
    const filename = `${timestamp}_${name}.${type}`;
    const filepath = path.join(config.migrationsDir, filename);

    // Create migrations directory if it doesn't exist
    try {
      await fs.mkdir(config.migrationsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    let content;
    if (type === 'sql') {
      content = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- UP
-- Write your migration SQL here


-- DOWN
-- Write your rollback SQL here

`;
    } else if (type === 'js') {
      content = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

module.exports = {
  /**
   * Run migration
   * @param {Pool} pool - PostgreSQL connection pool
   */
  async up(pool) {
    // Write your migration logic here
    await pool.query(\`
      -- Your SQL here
    \`);
  },

  /**
   * Rollback migration
   * @param {Pool} pool - PostgreSQL connection pool
   */
  async down(pool) {
    // Write your rollback logic here
    await pool.query(\`
      -- Your rollback SQL here
    \`);
  }
};
`;
    } else {
      console.error(`❌ Unknown migration type: ${type}`);
      process.exit(1);
    }

    await fs.writeFile(filepath, content);
    console.log(`✅ Created migration: ${filename}`);
    console.log(`   Path: ${filepath}`);
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'up';
const param = args[1];

// Execute command
(async () => {
  console.log('\n🚀 Zekka Migration CLI\n');

  switch (command) {
  case 'init':
    await commands.init();
    break;
  case 'up':
  case 'migrate':
    await commands.up({
      dryRun: args.includes('--dry-run'),
      target: args.includes('--target')
        ? parseInt(args[args.indexOf('--target') + 1])
        : null
    });
    break;
  case 'down':
  case 'rollback':
    await commands.down(param ? parseInt(param) : 1);
    break;
  case 'status':
    await commands.status();
    break;
  case 'verify':
    await commands.verify();
    break;
  case 'create':
    await commands.create(param, args[2] || 'sql');
    break;
  default:
    console.log('Usage: migrate <command> [options]\n');
    console.log('Commands:');
    console.log('  init              Initialize migration system');
    console.log('  up, migrate       Run pending migrations');
    console.log('  down, rollback    Rollback last N migrations');
    console.log('  status            Show migration status');
    console.log('  verify            Verify migration integrity');
    console.log('  create <name>     Create new migration file\n');
    console.log('Options:');
    console.log('  --dry-run         Test migration without applying');
    console.log('  --target <n>      Migrate to specific version');
    process.exit(1);
  }
})();
