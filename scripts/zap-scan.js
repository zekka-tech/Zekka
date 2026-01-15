#!/usr/bin/env node
/**
 * OWASP ZAP Security Scanner Integration
 * 
 * Automated dynamic application security testing using OWASP ZAP
 * 
 * Features:
 * - Baseline scan (passive)
 * - Full scan (active)
 * - API scan
 * - Spider scan
 * - Custom rules
 * 
 * Usage:
 *   node scripts/zap-scan.js --mode baseline
 *   node scripts/zap-scan.js --mode full
 *   node scripts/zap-scan.js --mode api
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ZAPScanner {
  constructor(options = {}) {
    this.mode = options.mode || 'baseline';
    this.target = options.target || process.env.ZAP_TARGET_URL || 'http://localhost:3000';
    this.apiKey = options.apiKey || process.env.ZAP_API_KEY;
    this.zapHost = options.zapHost || 'localhost';
    this.zapPort = options.zapPort || 8080;
    this.reportDir = options.reportDir || path.join(process.cwd(), 'security-reports', 'zap');
    this.rulesFile = options.rulesFile || path.join(process.cwd(), '.zap', 'rules.tsv');
    
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
    
    const zapConfigDir = path.join(process.cwd(), '.zap');
    if (!fs.existsSync(zapConfigDir)) {
      fs.mkdirSync(zapConfigDir, { recursive: true });
    }
  }

  /**
   * Log message
   */
  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    const color = colors[type] || colors.info;
    console.log(`${color}${message}${colors.reset}`);
  }

  /**
   * Run ZAP baseline scan
   */
  async runBaselineScan() {
    this.log('🔍 Running OWASP ZAP Baseline Scan...', 'info');
    
    return new Promise((resolve, reject) => {
      const reportFile = path.join(this.reportDir, `baseline-${Date.now()}.html`);
      
      const args = [
        'run', '--rm',
        '-v', `${this.reportDir}:/zap/wrk:rw`,
        'owasp/zap2docker-stable',
        'zap-baseline.py',
        '-t', this.target,
        '-r', path.basename(reportFile),
        '-J', `baseline-${Date.now()}.json`,
        '-d'  // Enable debug mode
      ];
      
      if (fs.existsSync(this.rulesFile)) {
        args.push('-c', path.basename(this.rulesFile));
      }
      
      const zap = spawn('docker', args);
      
      zap.stdout.on('data', (data) => {
        console.log(data.toString());
      });
      
      zap.stderr.on('data', (data) => {
        console.error(data.toString());
      });
      
      zap.on('close', (code) => {
        if (code === 0 || code === 2) {  // 0 = success, 2 = warnings
          this.log('✅ ZAP Baseline Scan completed', 'success');
          this.log(`Report saved to: ${reportFile}`, 'info');
          resolve({ code, reportFile });
        } else {
          this.log(`❌ ZAP Baseline Scan failed with code ${code}`, 'error');
          reject(new Error(`ZAP scan failed with code ${code}`));
        }
      });
    });
  }

  /**
   * Run ZAP full scan
   */
  async runFullScan() {
    this.log('🔍 Running OWASP ZAP Full Scan...', 'info');
    this.log('⚠️  Warning: This may take a long time (30+ minutes)', 'warning');
    
    return new Promise((resolve, reject) => {
      const reportFile = path.join(this.reportDir, `full-${Date.now()}.html`);
      
      const args = [
        'run', '--rm',
        '-v', `${this.reportDir}:/zap/wrk:rw`,
        'owasp/zap2docker-stable',
        'zap-full-scan.py',
        '-t', this.target,
        '-r', path.basename(reportFile),
        '-J', `full-${Date.now()}.json`,
        '-d'
      ];
      
      if (fs.existsSync(this.rulesFile)) {
        args.push('-c', path.basename(this.rulesFile));
      }
      
      const zap = spawn('docker', args);
      
      zap.stdout.on('data', (data) => {
        console.log(data.toString());
      });
      
      zap.stderr.on('data', (data) => {
        console.error(data.toString());
      });
      
      zap.on('close', (code) => {
        if (code === 0 || code === 2) {
          this.log('✅ ZAP Full Scan completed', 'success');
          this.log(`Report saved to: ${reportFile}`, 'info');
          resolve({ code, reportFile });
        } else {
          this.log(`❌ ZAP Full Scan failed with code ${code}`, 'error');
          reject(new Error(`ZAP scan failed with code ${code}`));
        }
      });
    });
  }

  /**
   * Run ZAP API scan
   */
  async runAPIScan() {
    this.log('🔍 Running OWASP ZAP API Scan...', 'info');
    
    const apiDefinition = path.join(process.cwd(), 'openapi.json');
    
    if (!fs.existsSync(apiDefinition)) {
      this.log('⚠️  OpenAPI definition not found. Generating...', 'warning');
      // Generate OpenAPI definition first
      const { execSync } = require('child_process');
      try {
        execSync('npm run docs:generate', { stdio: 'inherit' });
      } catch (error) {
        this.log('❌ Failed to generate OpenAPI definition', 'error');
        throw error;
      }
    }
    
    return new Promise((resolve, reject) => {
      const reportFile = path.join(this.reportDir, `api-${Date.now()}.html`);
      
      const args = [
        'run', '--rm',
        '-v', `${this.reportDir}:/zap/wrk:rw`,
        '-v', `${apiDefinition}:/zap/openapi.json:ro`,
        'owasp/zap2docker-stable',
        'zap-api-scan.py',
        '-t', '/zap/openapi.json',
        '-f', 'openapi',
        '-r', path.basename(reportFile),
        '-J', `api-${Date.now()}.json`,
        '-d'
      ];
      
      const zap = spawn('docker', args);
      
      zap.stdout.on('data', (data) => {
        console.log(data.toString());
      });
      
      zap.stderr.on('data', (data) => {
        console.error(data.toString());
      });
      
      zap.on('close', (code) => {
        if (code === 0 || code === 2) {
          this.log('✅ ZAP API Scan completed', 'success');
          this.log(`Report saved to: ${reportFile}`, 'info');
          resolve({ code, reportFile });
        } else {
          this.log(`❌ ZAP API Scan failed with code ${code}`, 'error');
          reject(new Error(`ZAP scan failed with code ${code}`));
        }
      });
    });
  }

  /**
   * Generate default rules file
   */
  generateDefaultRules() {
    const rules = [
      '# ZAP Scanning Rules',
      '# Format: RULE_ID\tACTION\tREASON',
      '# Actions: IGNORE, WARN, FAIL',
      '',
      '# Ignore false positives',
      '10015\tIGNORE\tFalse positive in test environment',
      '10021\tIGNORE\tX-Content-Type-Options header not required for static assets',
      '',
      '# Warnings',
      '10016\tWARN\tWeb Browser XSS Protection Not Enabled',
      '10020\tWARN\tX-Frame-Options Header Not Set',
      '',
      '# Must fix',
      '40012\tFAIL\tCross Site Scripting (Reflected)',
      '40014\tFAIL\tCross Site Scripting (Persistent)',
      '40018\tFAIL\tSQL Injection',
      '90019\tFAIL\tServer Side Code Injection',
      '90020\tFAIL\tRemote OS Command Injection'
    ].join('\n');
    
    fs.writeFileSync(this.rulesFile, rules);
    this.log(`✅ Default rules file created: ${this.rulesFile}`, 'success');
  }

  /**
   * Run scan based on mode
   */
  async run() {
    // Generate rules file if it doesn't exist
    if (!fs.existsSync(this.rulesFile)) {
      this.generateDefaultRules();
    }
    
    try {
      let result;
      
      switch (this.mode) {
        case 'baseline':
          result = await this.runBaselineScan();
          break;
        case 'full':
          result = await this.runFullScan();
          break;
        case 'api':
          result = await this.runAPIScan();
          break;
        default:
          throw new Error(`Unknown scan mode: ${this.mode}`);
      }
      
      this.log('\n' + '='.repeat(60), 'info');
      this.log('OWASP ZAP SCAN COMPLETE', 'success');
      this.log('='.repeat(60), 'info');
      this.log(`Mode: ${this.mode}`, 'info');
      this.log(`Target: ${this.target}`, 'info');
      this.log(`Report: ${result.reportFile}`, 'info');
      this.log('='.repeat(60) + '\n', 'info');
      
      return result;
    } catch (error) {
      this.log(`\n❌ Scan failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args.includes('--mode') ? args[args.indexOf('--mode') + 1] : 'baseline';
  const target = args.includes('--target') ? args[args.indexOf('--target') + 1] : undefined;
  
  const scanner = new ZAPScanner({ mode, target });
  
  scanner.run().catch(error => {
    console.error('Scan failed:', error);
    process.exit(1);
  });
}

module.exports = ZAPScanner;
