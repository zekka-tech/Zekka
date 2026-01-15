#!/usr/bin/env node
/**
 * Emergency Rollback Script
 * One-command rollback to last known good state
 * Usage: npm run ops:rollback
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

class EmergencyRollback {
  constructor() {
    this.steps = [];
    this.errors = [];
  }

  async execute() {
    console.log('🚨 EMERGENCY ROLLBACK INITIATED');
    console.log('================================\n');
    
    // Confirm rollback
    const confirm = await question('⚠️  This will rollback to the last known good state. Continue? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Rollback cancelled.');
      rl.close();
      return;
    }
    
    console.log('\n🔄 Starting rollback...\n');
    
    try {
      // Step 1: Rollback database migrations
      await this.rollbackDatabase();
      
      // Step 2: Rollback application deployment
      await this.rollbackApplication();
      
      // Step 3: Restart services
      await this.restartServices();
      
      // Step 4: Verify health
      await this.verifyHealth();
      
      console.log('\n✅ ROLLBACK COMPLETE');
      this.printSummary();
      process.exit(0);
    } catch (error) {
      console.error('\n❌ ROLLBACK FAILED:', error.message);
      this.printErrors();
      process.exit(1);
    } finally {
      rl.close();
    }
  }

  async rollbackDatabase() {
    console.log('📦 Step 1: Rolling back database migrations...');
    
    try {
      const { stdout } = await execPromise('npm run migrate:status');
      const lines = stdout.split('\n');
      
      // Find last executed migration
      const executedMigrations = lines.filter(line => line.includes('EXECUTED') || line.includes('✓'));
      
      if (executedMigrations.length > 0) {
        const lastMigration = executedMigrations[executedMigrations.length - 1];
        console.log(`   Rolling back migration: ${lastMigration.trim()}`);
        await execPromise('npm run migrate:rollback');
        this.steps.push('Database migration rolled back');
        console.log('   ✅ Database rollback complete');
      } else {
        console.log('   ℹ️  No migrations to rollback');
      }
    } catch (error) {
      this.errors.push(`Database rollback failed: ${error.message}`);
      console.warn('   ⚠️  Database rollback skipped (not critical)');
    }
  }

  async rollbackApplication() {
    console.log('🔙 Step 2: Rolling back application deployment...');
    
    try {
      // Git: Get last known good commit
      const { stdout: currentCommit } = await execPromise('git rev-parse HEAD');
      const { stdout: lastGoodCommit } = await execPromise('git rev-parse HEAD~1');
      
      console.log(`   Current commit: ${currentCommit.trim()}`);
      console.log(`   Rolling back to: ${lastGoodCommit.trim()}`);
      
      // Check if we're in a Kubernetes environment
      try {
        await execPromise('kubectl version --client --short');
        // Kubernetes: Rollback deployment
        await execPromise('kubectl rollout undo deployment/zekka-app -n zekka-production');
        await execPromise('kubectl rollout status deployment/zekka-app -n zekka-production --timeout=5m');
        this.steps.push(`Application rolled back to ${lastGoodCommit.trim()} (Kubernetes)`);
      } catch {
        // Non-Kubernetes: Git checkout
        await execPromise('git stash');
        await execPromise('git checkout HEAD~1');
        this.steps.push(`Application rolled back to ${lastGoodCommit.trim()} (Git)`);
      }
      
      console.log('   ✅ Application rollback complete');
    } catch (error) {
      this.errors.push(`Application rollback failed: ${error.message}`);
      throw error;
    }
  }

  async restartServices() {
    console.log('🔄 Step 3: Restarting services...');
    
    const services = [
      { name: 'Node.js App', command: 'pm2 restart all' },
      { name: 'Nginx', command: 'systemctl is-active nginx && sudo systemctl restart nginx || echo "nginx not managed by systemd"' },
      { name: 'Redis', command: 'systemctl is-active redis && sudo systemctl restart redis || echo "redis not managed by systemd"' }
    ];
    
    for (const service of services) {
      try {
        console.log(`   Restarting ${service.name}...`);
        const { stdout } = await execPromise(service.command);
        if (!stdout.includes('not managed')) {
          this.steps.push(`${service.name} restarted`);
          console.log(`   ✅ ${service.name} restarted`);
        } else {
          console.log(`   ℹ️  ${service.name} ${stdout.trim()}`);
        }
      } catch (error) {
        this.errors.push(`${service.name} restart failed: ${error.message}`);
        console.warn(`   ⚠️  ${service.name} restart failed (non-critical)`);
      }
    }
    
    // Wait for services to stabilize
    console.log('   ⏱️  Waiting 5 seconds for services to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  async verifyHealth() {
    console.log('🔍 Step 4: Verifying system health...');
    
    try {
      // Run health check
      await execPromise('node scripts/ops-health-check.js');
      this.steps.push('Health check passed');
      console.log('   ✅ System health verified');
    } catch (error) {
      // Health check script exits with 1 if critical services are down
      if (error.code === 1) {
        this.errors.push('Health check failed: Critical services down');
        throw new Error('System health verification failed');
      } else {
        this.errors.push(`Health check failed: ${error.message}`);
        throw error;
      }
    }
  }

  printSummary() {
    console.log('\n📋 ROLLBACK SUMMARY');
    console.log('═══════════════════');
    this.steps.forEach((step, index) => {
      console.log(`${index + 1}. ✅ ${step}`);
    });
    
    if (this.errors.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }
    
    console.log('\n💡 NEXT STEPS:');
    console.log('   1. Review application logs: pm2 logs');
    console.log('   2. Check error rates in monitoring dashboard');
    console.log('   3. Investigate root cause of issue');
    console.log('   4. Plan hotfix or redeploy when ready');
  }

  printErrors() {
    console.log('\n❌ ERRORS:');
    this.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
    
    console.log('\n🆘 EMERGENCY CONTACTS:');
    console.log('   - On-call: +1-XXX-XXX-XXXX');
    console.log('   - DevOps: ops@zekka.internal');
    console.log('   - Slack: #zekka-incidents');
  }
}

// Execute rollback
const rollback = new EmergencyRollback();
rollback.execute();
