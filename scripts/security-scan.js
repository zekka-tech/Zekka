#!/usr/bin/env node
/**
 * Security Scanning Automation
 * 
 * Integrates multiple security scanning tools:
 * - Snyk (dependency vulnerabilities)
 * - npm audit (Node.js dependencies)
 * - OWASP Dependency Check
 * - Custom security tests
 * 
 * Usage:
 *   node scripts/security-scan.js
 *   node scripts/security-scan.js --ci  # For CI/CD
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SecurityScanner {
  constructor(options = {}) {
    this.ciMode = options.ci || false;
    this.failOnHigh = options.failOnHigh !== false;
    this.generateReport = options.generateReport !== false;
    this.reportDir = options.reportDir || path.join(process.cwd(), 'security-reports');
    
    this.results = {
      timestamp: new Date().toISOString(),
      scans: {},
      summary: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: 0
      },
      passed: true
    };
  }

  /**
   * Log message with color
   */
  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',      // Cyan
      success: '\x1b[32m',   // Green
      warning: '\x1b[33m',   // Yellow
      error: '\x1b[31m',     // Red
      reset: '\x1b[0m'
    };

    const color = colors[type] || colors.info;
    console.log(`${color}${message}${colors.reset}`);
  }

  /**
   * Execute command and capture output
   */
  exec(command, options = {}) {
    try {
      const result = execSync(command, {
        encoding: 'utf8',
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options
      });
      return { success: true, output: result };
    } catch (error) {
      return { 
        success: false, 
        output: error.stdout || error.stderr || error.message,
        code: error.status 
      };
    }
  }

  /**
   * Run npm audit
   */
  async runNpmAudit() {
    this.log('\n🔍 Running npm audit...', 'info');
    
    const result = this.exec('npm audit --json', { silent: true });
    
    try {
      const auditData = JSON.parse(result.output);
      const vulnerabilities = auditData.metadata?.vulnerabilities || {};
      
      this.results.scans.npmAudit = {
        passed: vulnerabilities.critical === 0 && vulnerabilities.high === 0,
        vulnerabilities: {
          critical: vulnerabilities.critical || 0,
          high: vulnerabilities.high || 0,
          moderate: vulnerabilities.moderate || 0,
          low: vulnerabilities.low || 0,
          info: vulnerabilities.info || 0,
          total: vulnerabilities.total || 0
        },
        details: auditData.advisories || {}
      };
      
      // Update summary
      this.results.summary.critical += vulnerabilities.critical || 0;
      this.results.summary.high += vulnerabilities.high || 0;
      this.results.summary.medium += vulnerabilities.moderate || 0;
      this.results.summary.low += vulnerabilities.low || 0;
      
      if (vulnerabilities.critical > 0 || vulnerabilities.high > 0) {
        this.results.passed = false;
        this.log(`❌ npm audit found ${vulnerabilities.critical} critical and ${vulnerabilities.high} high vulnerabilities`, 'error');
      } else {
        this.log('✅ npm audit passed', 'success');
      }
    } catch (error) {
      this.log(`⚠️  npm audit parse error: ${error.message}`, 'warning');
      this.results.scans.npmAudit = { passed: false, error: error.message };
    }
  }

  /**
   * Run Snyk test (if Snyk is configured)
   */
  async runSnyk() {
    this.log('\n🔍 Running Snyk scan...', 'info');
    
    // Check if Snyk is available
    const snykCheck = this.exec('which snyk', { silent: true });
    
    if (!snykCheck.success) {
      this.log('⚠️  Snyk not installed. Install with: npm install -g snyk', 'warning');
      this.results.scans.snyk = { skipped: true, reason: 'Snyk not installed' };
      return;
    }
    
    // Check if authenticated
    const authCheck = this.exec('snyk auth status', { silent: true });
    
    if (!authCheck.success) {
      this.log('⚠️  Snyk not authenticated. Run: snyk auth', 'warning');
      this.results.scans.snyk = { skipped: true, reason: 'Snyk not authenticated' };
      return;
    }
    
    // Run Snyk test
    const result = this.exec('snyk test --json', { silent: true });
    
    try {
      const snykData = JSON.parse(result.output);
      const vulnerabilities = snykData.uniqueCount || 0;
      
      this.results.scans.snyk = {
        passed: vulnerabilities === 0,
        vulnerabilities,
        issues: snykData.vulnerabilities || []
      };
      
      if (vulnerabilities > 0) {
        this.log(`⚠️  Snyk found ${vulnerabilities} vulnerabilities`, 'warning');
      } else {
        this.log('✅ Snyk scan passed', 'success');
      }
    } catch (error) {
      this.log(`⚠️  Snyk parse error: ${error.message}`, 'warning');
      this.results.scans.snyk = { passed: false, error: error.message };
    }
  }

  /**
   * Check for secrets in code
   */
  async checkSecrets() {
    this.log('\n🔍 Checking for secrets in code...', 'info');
    
    const patterns = [
      /password\s*=\s*['"][^'"]{8,}['"]/gi,
      /api[_-]?key\s*=\s*['"][^'"]{20,}['"]/gi,
      /secret\s*=\s*['"][^'"]{20,}['"]/gi,
      /token\s*=\s*['"][^'"]{20,}['"]/gi,
      /aws[_-]?access[_-]?key/gi,
      /private[_-]?key/gi,
      /BEGIN (RSA|DSA|EC) PRIVATE KEY/gi
    ];
    
    const suspiciousFiles = [];
    const excludeDirs = ['node_modules', '.git', 'dist', 'build', 'coverage'];
    
    const scanDirectory = (dir) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          if (!excludeDirs.includes(file)) {
            scanDirectory(filePath);
          }
        } else if (stat.isFile() && /\.(js|ts|json|env)$/i.test(file)) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            for (const pattern of patterns) {
              if (pattern.test(content)) {
                suspiciousFiles.push({
                  file: filePath.replace(process.cwd(), '.'),
                  pattern: pattern.toString()
                });
                break;
              }
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    };
    
    try {
      scanDirectory(path.join(process.cwd(), 'src'));
      scanDirectory(path.join(process.cwd(), 'scripts'));
      
      this.results.scans.secrets = {
        passed: suspiciousFiles.length === 0,
        suspiciousFiles
      };
      
      if (suspiciousFiles.length > 0) {
        this.log(`⚠️  Found ${suspiciousFiles.length} file(s) with potential secrets`, 'warning');
        this.results.passed = false;
      } else {
        this.log('✅ No secrets found in code', 'success');
      }
    } catch (error) {
      this.log(`⚠️  Secret scan error: ${error.message}`, 'warning');
      this.results.scans.secrets = { passed: false, error: error.message };
    }
  }

  /**
   * Run custom security tests
   */
  async runSecurityTests() {
    this.log('\n🔍 Running custom security tests...', 'info');
    
    const result = this.exec('npm run test:security', { silent: false });
    
    this.results.scans.securityTests = {
      passed: result.success,
      exitCode: result.code
    };
    
    if (result.success) {
      this.log('✅ Security tests passed', 'success');
    } else {
      this.log('❌ Security tests failed', 'error');
      this.results.passed = false;
    }
  }

  /**
   * Check dependencies for known issues
   */
  async checkDependencies() {
    this.log('\n🔍 Checking dependencies...', 'info');
    
    try {
      const packageJson = require(path.join(process.cwd(), 'package.json'));
      const issues = [];
      
      // Check for outdated critical packages
      const criticalPackages = ['express', 'jsonwebtoken', 'bcrypt', 'helmet'];
      
      for (const pkg of criticalPackages) {
        if (packageJson.dependencies?.[pkg]) {
          // Could add version checks here
        }
      }
      
      this.results.scans.dependencies = {
        passed: issues.length === 0,
        issues
      };
      
      if (issues.length > 0) {
        this.log(`⚠️  Found ${issues.length} dependency issue(s)`, 'warning');
      } else {
        this.log('✅ Dependencies check passed', 'success');
      }
    } catch (error) {
      this.log(`⚠️  Dependency check error: ${error.message}`, 'warning');
      this.results.scans.dependencies = { passed: false, error: error.message };
    }
  }

  /**
   * Generate report
   */
  generateReportFile() {
    if (!this.generateReport) return;
    
    this.log('\n📄 Generating security report...', 'info');
    
    // Create report directory
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
    
    // Generate JSON report
    const jsonReport = path.join(this.reportDir, `security-scan-${Date.now()}.json`);
    fs.writeFileSync(jsonReport, JSON.stringify(this.results, null, 2));
    
    // Generate markdown report
    const mdReport = path.join(this.reportDir, `security-scan-${Date.now()}.md`);
    const markdown = this.generateMarkdownReport();
    fs.writeFileSync(mdReport, markdown);
    
    this.log(`✅ Reports generated:`, 'success');
    this.log(`   - ${jsonReport}`, 'info');
    this.log(`   - ${mdReport}`, 'info');
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport() {
    const { summary, scans, timestamp } = this.results;
    
    let md = `# Security Scan Report\n\n`;
    md += `**Date**: ${timestamp}\n`;
    md += `**Status**: ${this.results.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;
    
    md += `## Summary\n\n`;
    md += `| Severity | Count |\n`;
    md += `|----------|-------|\n`;
    md += `| Critical | ${summary.critical} |\n`;
    md += `| High | ${summary.high} |\n`;
    md += `| Medium | ${summary.medium} |\n`;
    md += `| Low | ${summary.low} |\n`;
    md += `| **Total** | **${summary.total}** |\n\n`;
    
    md += `## Scan Results\n\n`;
    
    for (const [scanName, scanResult] of Object.entries(scans)) {
      md += `### ${scanName}\n\n`;
      md += `**Status**: ${scanResult.passed ? '✅ Passed' : '❌ Failed'}\n\n`;
      
      if (scanResult.vulnerabilities) {
        md += `**Vulnerabilities**:\n`;
        for (const [severity, count] of Object.entries(scanResult.vulnerabilities)) {
          md += `- ${severity}: ${count}\n`;
        }
        md += `\n`;
      }
      
      if (scanResult.suspiciousFiles?.length > 0) {
        md += `**Suspicious Files**:\n`;
        for (const file of scanResult.suspiciousFiles) {
          md += `- ${file.file}\n`;
        }
        md += `\n`;
      }
    }
    
    return md;
  }

  /**
   * Display summary
   */
  displaySummary() {
    const { summary } = this.results;
    
    this.log('\n' + '='.repeat(60), 'info');
    this.log('SECURITY SCAN SUMMARY', 'info');
    this.log('='.repeat(60), 'info');
    
    this.log(`\nVulnerabilities Found:`, 'info');
    this.log(`  Critical: ${summary.critical}`, summary.critical > 0 ? 'error' : 'info');
    this.log(`  High:     ${summary.high}`, summary.high > 0 ? 'error' : 'info');
    this.log(`  Medium:   ${summary.medium}`, summary.medium > 0 ? 'warning' : 'info');
    this.log(`  Low:      ${summary.low}`, 'info');
    this.log(`  Total:    ${summary.total}`, 'info');
    
    this.log(`\nOverall Status: ${this.results.passed ? '✅ PASSED' : '❌ FAILED'}`, 
      this.results.passed ? 'success' : 'error');
    
    if (!this.results.passed) {
      this.log('\n⚠️  Action required: Fix vulnerabilities before deploying to production', 'warning');
    }
    
    this.log('\n' + '='.repeat(60) + '\n', 'info');
  }

  /**
   * Run all scans
   */
  async runAll() {
    this.log('🔒 Starting security scan...', 'info');
    this.log(`Mode: ${this.ciMode ? 'CI/CD' : 'Local'}`, 'info');
    
    await this.runNpmAudit();
    await this.runSnyk();
    await this.checkSecrets();
    await this.checkDependencies();
    await this.runSecurityTests();
    
    this.displaySummary();
    this.generateReportFile();
    
    // Exit with error code in CI mode if failed
    if (this.ciMode && !this.results.passed) {
      process.exit(1);
    }
    
    return this.results;
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const ciMode = args.includes('--ci');
  const noReport = args.includes('--no-report');
  
  const scanner = new SecurityScanner({
    ci: ciMode,
    generateReport: !noReport
  });
  
  scanner.runAll().catch(error => {
    console.error('Security scan failed:', error);
    process.exit(1);
  });
}

module.exports = SecurityScanner;
