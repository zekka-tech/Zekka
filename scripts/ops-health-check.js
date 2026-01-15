#!/usr/bin/env node
/**
 * Comprehensive Health Check - 17 Zekka Artifacts
 * Single command to verify entire system health
 * Usage: npm run ops:health
 */

const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const execPromise = util.promisify(exec);

const ARTIFACTS = [
  {
    name: 'API Gateway',
    type: 'http',
    url: 'http://localhost:3000/health',
    timeout: 5000,
    critical: true
  },
  {
    name: 'PostgreSQL Primary',
    type: 'postgres',
    command: 'pg_isready -h localhost -p 5432',
    critical: true
  },
  {
    name: 'PostgreSQL Standby',
    type: 'postgres',
    command: 'pg_isready -h postgresql-standby.zekka.internal -p 5432',
    critical: false
  },
  {
    name: 'Redis Primary',
    type: 'redis',
    command: 'redis-cli -h localhost -p 6379 ping',
    critical: true
  },
  {
    name: 'Redis Sentinel',
    type: 'redis',
    command: 'redis-cli -h localhost -p 26379 sentinel master mymaster',
    critical: true
  },
  {
    name: 'ALAMA Inference',
    type: 'http',
    url: 'http://alama-inference.zekka-production.svc.cluster.local:8080',
    timeout: 10000,
    critical: false
  },
  {
    name: 'Elastic GPU Pool',
    type: 'k8s',
    command: 'kubectl get pods -n zekka-production -l app=elastic-gpu -o json',
    critical: false
  },
  {
    name: 'Prometheus',
    type: 'http',
    url: 'http://localhost:9090/-/healthy',
    timeout: 5000,
    critical: false
  },
  {
    name: 'Grafana',
    type: 'http',
    url: 'http://localhost:3001/api/health',
    timeout: 5000,
    critical: false
  },
  {
    name: 'Nginx',
    type: 'command',
    command: 'systemctl is-active nginx || echo "not-running"',
    critical: true
  },
  {
    name: 'Audit Log Service',
    type: 'file',
    path: '/var/log/zekka/audit',
    maxAge: 300, // 5 minutes
    critical: true
  },
  {
    name: 'S3 Audit Archive (Primary)',
    type: 's3',
    bucket: 'zekka-audit-logs-us-east-1',
    critical: true
  },
  {
    name: 'S3 Audit Archive (Secondary)',
    type: 's3',
    bucket: 'zekka-audit-logs-eu-west-1',
    critical: false
  },
  {
    name: 'Falco Runtime Security',
    type: 'k8s',
    command: 'kubectl get pods -n falco-system -l app=falco -o json',
    critical: true
  },
  {
    name: 'Image Signing Service',
    type: 'command',
    command: 'cosign version 2>/dev/null || echo "not-installed"',
    critical: false
  },
  {
    name: 'CI/CD Pipeline',
    type: 'github',
    repo: 'zekka-tech/Zekka',
    critical: false
  },
  {
    name: 'Context Bus',
    type: 'http',
    url: 'http://localhost:3000/api/context/health',
    timeout: 5000,
    critical: true
  }
];

class HealthChecker {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async checkHTTP(artifact) {
    try {
      const response = await axios.get(artifact.url, {
        timeout: artifact.timeout,
        validateStatus: (status) => status < 500
      });
      
      return {
        status: response.status === 200 ? 'HEALTHY' : 'WARNING',
        message: `HTTP ${response.status}`,
        latency: Date.now() - this.startTime
      };
    } catch (error) {
      return {
        status: 'DOWN',
        message: error.code || error.message,
        latency: null
      };
    }
  }

  async checkCommand(artifact) {
    try {
      const { stdout, stderr } = await execPromise(artifact.command);
      const output = (stdout || stderr).trim();
      
      if (artifact.type === 'postgres') {
        return {
          status: output.includes('accepting connections') ? 'HEALTHY' : 'DOWN',
          message: output.substring(0, 50)
        };
      } else if (artifact.type === 'redis') {
        return {
          status: output === 'PONG' || output.includes('master') ? 'HEALTHY' : 'DOWN',
          message: output.substring(0, 50)
        };
      } else {
        const isHealthy = output === 'active' || 
                         output.includes('version') || 
                         output.includes('running');
        return {
          status: isHealthy ? 'HEALTHY' : 'WARNING',
          message: output.substring(0, 50)
        };
      }
    } catch (error) {
      return {
        status: 'DOWN',
        message: error.message.substring(0, 50)
      };
    }
  }

  async checkK8s(artifact) {
    try {
      const { stdout } = await execPromise(artifact.command);
      const pods = JSON.parse(stdout);
      
      if (!pods.items || pods.items.length === 0) {
        return { status: 'DOWN', message: 'No pods found' };
      }
      
      const runningPods = pods.items.filter(pod => pod.status.phase === 'Running');
      const totalPods = pods.items.length;
      
      if (runningPods.length === 0) {
        return { status: 'DOWN', message: 'No running pods' };
      } else if (runningPods.length < totalPods) {
        return { 
          status: 'WARNING', 
          message: `${runningPods.length}/${totalPods} pods running` 
        };
      } else {
        return { 
          status: 'HEALTHY', 
          message: `All ${totalPods} pods running` 
        };
      }
    } catch (error) {
      return { 
        status: 'DOWN', 
        message: 'kubectl error or no access'
      };
    }
  }

  async checkFile(artifact) {
    try {
      const stats = await fs.stat(artifact.path);
      
      if (stats.isDirectory()) {
        // Check for recent files in directory
        const files = await fs.readdir(artifact.path);
        if (files.length === 0) {
          return { status: 'WARNING', message: 'Directory empty' };
        }
        
        // Check most recent file
        const latestFile = files.sort().reverse()[0];
        const fileStats = await fs.stat(`${artifact.path}/${latestFile}`);
        const ageSeconds = (Date.now() - fileStats.mtimeMs) / 1000;
        
        if (ageSeconds > artifact.maxAge) {
          return {
            status: 'WARNING',
            message: `Last log ${Math.floor(ageSeconds)}s ago (max: ${artifact.maxAge}s)`
          };
        }
        
        return {
          status: 'HEALTHY',
          message: `Latest log ${Math.floor(ageSeconds)}s ago`
        };
      } else {
        // Single file
        const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;
        
        if (ageSeconds > artifact.maxAge) {
          return {
            status: 'WARNING',
            message: `File ${Math.floor(ageSeconds)}s old (max: ${artifact.maxAge}s)`
          };
        }
        
        return {
          status: 'HEALTHY',
          message: `File updated ${Math.floor(ageSeconds)}s ago`
        };
      }
    } catch (error) {
      return { 
        status: 'DOWN', 
        message: 'Path not found or no access' 
      };
    }
  }

  async checkS3(artifact) {
    try {
      const { stdout } = await execPromise(
        `aws s3 ls s3://${artifact.bucket}/ --max-items 1 2>&1`
      );
      
      if (stdout.includes('NoSuchBucket') || stdout.includes('AccessDenied')) {
        return { 
          status: 'DOWN', 
          message: 'Bucket not accessible' 
        };
      }
      
      return {
        status: 'HEALTHY',
        message: 'Bucket accessible'
      };
    } catch (error) {
      return { 
        status: 'WARNING', 
        message: 'AWS CLI not configured' 
      };
    }
  }

  async checkGitHub(artifact) {
    try {
      const { stdout } = await execPromise(
        `gh repo view ${artifact.repo} --json name 2>&1`
      );
      
      if (stdout.includes('error') || stdout.includes('not found')) {
        return { 
          status: 'WARNING', 
          message: 'Repo not accessible' 
        };
      }
      
      const repo = JSON.parse(stdout);
      return {
        status: 'HEALTHY',
        message: `Repository: ${repo.name}`
      };
    } catch (error) {
      return { 
        status: 'WARNING', 
        message: 'GitHub CLI not configured' 
      };
    }
  }

  async checkArtifact(artifact) {
    let result;
    
    switch (artifact.type) {
      case 'http':
        result = await this.checkHTTP(artifact);
        break;
      case 'postgres':
      case 'redis':
      case 'command':
        result = await this.checkCommand(artifact);
        break;
      case 'k8s':
        result = await this.checkK8s(artifact);
        break;
      case 'file':
        result = await this.checkFile(artifact);
        break;
      case 's3':
        result = await this.checkS3(artifact);
        break;
      case 'github':
        result = await this.checkGitHub(artifact);
        break;
      default:
        result = { status: 'UNKNOWN', message: 'Unsupported check type' };
    }
    
    return {
      name: artifact.name,
      critical: artifact.critical,
      ...result
    };
  }

  async checkAll() {
    console.log('🔍 Zekka Health Check - Checking 17 artifacts...\n');
    
    const checks = ARTIFACTS.map(artifact => this.checkArtifact(artifact));
    this.results = await Promise.all(checks);
    
    this.printResults();
    this.printSummary();
    
    // Exit with error code if any critical service is down
    const criticalDown = this.results.filter(r => r.critical && r.status === 'DOWN');
    if (criticalDown.length > 0) {
      console.error(`\n❌ CRITICAL: ${criticalDown.length} critical service(s) down!`);
      process.exit(1);
    } else {
      console.log('\n✅ All critical services are operational');
      process.exit(0);
    }
  }

  printResults() {
    const statusSymbols = {
      'HEALTHY': '✅',
      'WARNING': '⚠️',
      'DOWN': '❌',
      'UNKNOWN': '❓'
    };
    
    const statusColors = {
      'HEALTHY': '\x1b[32m',
      'WARNING': '\x1b[33m',
      'DOWN': '\x1b[31m',
      'UNKNOWN': '\x1b[90m'
    };
    
    const reset = '\x1b[0m';
    
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                   ARTIFACT HEALTH STATUS                  ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    
    this.results.forEach(result => {
      const symbol = statusSymbols[result.status] || '❓';
      const color = statusColors[result.status] || '';
      const critical = result.critical ? ' [CRITICAL]' : '';
      const nameWidth = 30;
      const paddedName = result.name.padEnd(nameWidth);
      
      console.log(`║ ${symbol} ${color}${result.status.padEnd(7)}${reset} ${paddedName}${critical}`);
      if (result.message) {
        console.log(`║    ${result.message.substring(0, 50)}`);
      }
    });
    
    console.log('╚════════════════════════════════════════════════════════════╝');
  }

  printSummary() {
    const healthy = this.results.filter(r => r.status === 'HEALTHY').length;
    const warning = this.results.filter(r => r.status === 'WARNING').length;
    const down = this.results.filter(r => r.status === 'DOWN').length;
    const total = this.results.length;
    
    const healthPercent = ((healthy / total) * 100).toFixed(1);
    
    console.log('\n📊 SUMMARY');
    console.log(`   Total Artifacts: ${total}`);
    console.log(`   ✅ Healthy: ${healthy} (${healthPercent}%)`);
    console.log(`   ⚠️  Warning: ${warning}`);
    console.log(`   ❌ Down: ${down}`);
    console.log(`   Duration: ${Date.now() - this.startTime}ms`);
  }
}

// Run health check
const checker = new HealthChecker();
checker.checkAll().catch(error => {
  console.error('Health check failed:', error);
  process.exit(1);
});
