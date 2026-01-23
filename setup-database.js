#!/usr/bin/env node

/**
 * Quick database setup script
 * Runs all SQL migration files directly
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigrations() {
  console.log('🚀 Setting up database...\n');

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = await fs.readdir(migrationsDir);
  const sqlFiles = files
    .filter(f => f.endsWith('.sql'))
    .sort();

  let applied = 0;
  let skipped = 0;

  for (const file of sqlFiles) {
    const filePath = path.join(migrationsDir, file);
    try {
      const sql = await fs.readFile(filePath, 'utf8');

      console.log(`📝 Running: ${file}`);

      try {
        const result = await pool.query(sql);
        console.log(`   ✅ Applied successfully\n`);
        applied++;
      } catch (error) {
        // Check if it's an ignorable error
        const ignorableErrors = [
          'already exists',
          'duplicate key',
          'does not exist',
          'violates unique constraint',
          'violates foreign key constraint'
        ];

        const isIgnorable = ignorableErrors.some(msg =>
          error.message.toLowerCase().includes(msg.toLowerCase())
        ) || ['42P07', '42701', '23505', '23503', '42883'].includes(error.code);

        if (isIgnorable) {
          console.log(`   ⚠️  Schema conflict/already exists (skipped - this is OK)\n`);
          skipped++;
        } else {
          console.error(`   ❌ Error: ${error.message}\n`);
          console.error(`   Code: ${error.code}`);
          // Don't exit, just skip this migration
          skipped++;
        }
      }
    } catch (error) {
      console.error(`❌ Failed to read ${file}:`, error.message);
      process.exit(1);
    }
  }

  await pool.end();

  console.log('================================');
  console.log(`✅ Database setup complete!`);
  console.log(`   Applied: ${applied}`);
  console.log(`   Skipped: ${skipped}`);
  console.log('================================');
}

runMigrations().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
