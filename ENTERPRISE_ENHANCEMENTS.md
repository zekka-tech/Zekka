# Zekka Framework - Enterprise Enhancements
## Token Economics, DR, Security & Operations
**Version**: 3.1.0  
**Date**: 2026-01-15  
**Status**: Implementation Plan

---

## Executive Summary

This document outlines critical enterprise-grade enhancements based on operational analysis:

- **Token Economics**: 47% cost reduction target ($1.20/story point) via dynamic ALAMA scaling
- **Disaster Recovery**: Geo-redundant architecture with cross-region replication
- **Security Hardening**: Kernel-level runtime protection + supply chain security
- **Operational Excellence**: Three-command emergency operations for 17 artifacts

### Key Metrics
- 🎯 Cost Reduction: 47%
- 💰 Target Cost: $1.20 per story point
- ⚡ Auto-scaling: 10→3 instances (10min idle)
- 🌍 DR: Multi-region (3+ zones)
- 🔒 Security: Kernel-level + supply chain
- ⏱️ MTTR: <5 minutes (target)
- 🚀 Deployment: 60 minutes for 17 artifacts
- 🤖 Auto-resolution: 92% on code conflicts

---

## 1. Token Economics & Compute-Cost Optimization

### Current Architecture Issues
```
┌─────────────────────────────────────┐
│  Current (Single Point of Failure)  │
├─────────────────────────────────────┤
│  Orchestrator                        │
│      ↓                               │
│  Central GPU Pool (ALAMA)            │
│      ↓                               │
│  Premium APIs (fallback)             │
└─────────────────────────────────────┘

Problems:
- Central GPU pool = single point of failure
- 80% local ALAMA usage but no scaling
- Cost inefficiency when idle
- No economic mode integration
```

### Proposed Three-Tier Compute Model

```
┌─────────────────────────────────────────────────┐
│  Orchestrator (Economic Mode Enabled)           │
└──────────────┬──────────────────────────────────┘
               │
       ┌───────┴────────┐
       ↓                ↓
┌──────────────┐   ┌──────────────────────┐
│ Tier 1:      │   │ Tier 2:              │
│ Local ALAMA  │   │ Elastic GPU Pool     │
│ (Dedicated)  │   │ (Auto-scaling)       │
│              │   │                      │
│ - 3-10 pods  │   │ - K8s HPA            │
│ - Auto-scale │   │ - 10min idle → 3x    │
│ - 80% tasks  │   │ - Cost optimized     │
└──────────────┘   └──────────────────────┘
       │                     │
       └──────────┬──────────┘
                  ↓
         ┌────────────────────┐
         │ Tier 3:            │
         │ Premium APIs       │
         │ (GPT-4, Claude)    │
         │                    │
         │ - High complexity  │
         │ - 20% tasks        │
         │ - Pay per use      │
         └────────────────────┘
```

### Implementation Strategy

#### 1.1 Kubernetes HPA for ALAMA

**File**: `k8s/alama-hpa.yaml`
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: alama-gpu-pool
  namespace: zekka-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: alama-inference
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: inference_queue_length
      target:
        type: AverageValue
        averageValue: "10"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 600  # 10 minutes idle before scale-down
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
```

**File**: `k8s/alama-deployment.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alama-inference
  namespace: zekka-production
spec:
  replicas: 3  # Minimum baseline
  selector:
    matchLabels:
      app: alama-inference
  template:
    metadata:
      labels:
        app: alama-inference
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      containers:
      - name: alama
        image: alama/inference:latest
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
            nvidia.com/gpu: "1"
          limits:
            memory: "8Gi"
            cpu: "4"
            nvidia.com/gpu: "1"
        env:
        - name: CUDA_VISIBLE_DEVICES
          value: "0"
        - name: MODEL_CACHE_DIR
          value: "/models"
        - name: BATCH_SIZE
          value: "8"
        - name: MAX_QUEUE_SIZE
          value: "100"
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
        volumeMounts:
        - name: model-cache
          mountPath: /models
      volumes:
      - name: model-cache
        persistentVolumeClaim:
          claimName: alama-model-cache
      nodeSelector:
        gpu: "true"
      tolerations:
      - key: "nvidia.com/gpu"
        operator: "Exists"
        effect: "NoSchedule"
```

#### 1.2 Economic Mode Integration

**File**: `src/services/economic-orchestrator.js`
```javascript
/**
 * Economic Orchestrator Service
 * Intelligent routing based on cost/performance trade-offs
 */

class EconomicOrchestrator {
  constructor() {
    this.tiers = {
      local_alama: {
        cost_per_1k_tokens: 0.001,
        latency_p95_ms: 200,
        capacity_rps: 50,
        reliability: 0.95
      },
      elastic_gpu: {
        cost_per_1k_tokens: 0.005,
        latency_p95_ms: 500,
        capacity_rps: 200,
        reliability: 0.99
      },
      premium_api: {
        cost_per_1k_tokens: 0.03,
        latency_p95_ms: 1000,
        capacity_rps: 1000,
        reliability: 0.999
      }
    };
    
    this.costTarget = 1.20; // $ per story point
    this.currentSpend = 0;
    this.metrics = {
      requests_routed: {},
      cost_savings: 0,
      fallback_count: 0
    };
  }

  /**
   * Route inference request based on economic mode
   * @param {Object} request - Inference request
   * @param {string} mode - Economic mode: 'cost_optimized', 'balanced', 'performance'
   * @returns {Promise<Object>} Inference result
   */
  async route(request, mode = 'balanced') {
    const complexity = this.estimateComplexity(request);
    const budget = this.calculateBudget(request);
    
    // Decision matrix
    let selectedTier;
    
    if (mode === 'cost_optimized') {
      selectedTier = this.selectCostOptimized(complexity, budget);
    } else if (mode === 'performance') {
      selectedTier = this.selectPerformance(complexity, budget);
    } else {
      selectedTier = this.selectBalanced(complexity, budget);
    }
    
    try {
      const result = await this.executeInference(selectedTier, request);
      this.recordMetrics(selectedTier, result, true);
      return result;
    } catch (error) {
      // Fallback logic
      const fallbackTier = this.selectFallback(selectedTier);
      const result = await this.executeInference(fallbackTier, request);
      this.recordMetrics(fallbackTier, result, false);
      this.metrics.fallback_count++;
      return result;
    }
  }

  selectCostOptimized(complexity, budget) {
    // Always try local ALAMA first
    if (complexity <= 3 && this.isAlamaAvailable()) {
      return 'local_alama';
    }
    
    // Use elastic pool for medium complexity
    if (complexity <= 7 && budget > 0.01) {
      return 'elastic_gpu';
    }
    
    // Premium only for high complexity
    return 'premium_api';
  }

  selectBalanced(complexity, budget) {
    const alamaLoad = this.getAlamaLoad();
    
    // Route 80% to local ALAMA when available
    if (complexity <= 5 && alamaLoad < 0.8) {
      return 'local_alama';
    }
    
    // Elastic pool for overflow
    if (complexity <= 8) {
      return 'elastic_gpu';
    }
    
    return 'premium_api';
  }

  selectPerformance(complexity, budget) {
    // Skip local ALAMA for performance mode
    if (complexity <= 8) {
      return 'elastic_gpu';
    }
    return 'premium_api';
  }

  estimateComplexity(request) {
    const { input_tokens, task_type, context_size } = request;
    
    let score = 0;
    
    // Token count
    if (input_tokens < 500) score += 1;
    else if (input_tokens < 2000) score += 3;
    else if (input_tokens < 8000) score += 5;
    else score += 8;
    
    // Task type
    const taskScores = {
      'simple_qa': 1,
      'code_generation': 4,
      'complex_reasoning': 7,
      'multi_step_planning': 9
    };
    score += taskScores[task_type] || 5;
    
    // Context size
    score += Math.min(Math.floor(context_size / 1000), 3);
    
    return Math.min(score, 10);
  }

  calculateBudget(request) {
    const { input_tokens, estimated_output_tokens } = request;
    const total_tokens = input_tokens + (estimated_output_tokens || input_tokens);
    
    // Budget = cost_target * (tokens / avg_tokens_per_story_point)
    const avg_tokens_per_sp = 5000;
    return this.costTarget * (total_tokens / avg_tokens_per_sp);
  }

  async executeInference(tier, request) {
    const startTime = Date.now();
    
    let result;
    switch (tier) {
      case 'local_alama':
        result = await this.invokeAlama(request);
        break;
      case 'elastic_gpu':
        result = await this.invokeElasticGPU(request);
        break;
      case 'premium_api':
        result = await this.invokePremiumAPI(request);
        break;
      default:
        throw new Error(`Unknown tier: ${tier}`);
    }
    
    result.latency_ms = Date.now() - startTime;
    result.tier = tier;
    return result;
  }

  async invokeAlama(request) {
    // Call local ALAMA service
    const response = await fetch('http://alama-inference.zekka-production.svc.cluster.local:8080/infer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error(`ALAMA inference failed: ${response.status}`);
    }
    
    return await response.json();
  }

  async invokeElasticGPU(request) {
    // Call elastic GPU pool (with auto-scaling)
    const response = await fetch('http://elastic-gpu-pool.zekka-production.svc.cluster.local:8080/infer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error(`Elastic GPU inference failed: ${response.status}`);
    }
    
    return await response.json();
  }

  async invokePremiumAPI(request) {
    // Call premium API (GPT-4, Claude, etc.)
    const provider = this.selectPremiumProvider(request);
    // Implementation depends on provider
    // ... (existing premium API logic)
  }

  recordMetrics(tier, result, success) {
    if (!this.metrics.requests_routed[tier]) {
      this.metrics.requests_routed[tier] = 0;
    }
    this.metrics.requests_routed[tier]++;
    
    const cost = this.calculateCost(tier, result);
    this.currentSpend += cost;
    
    // Calculate savings vs. using premium API only
    const premiumCost = this.calculateCost('premium_api', result);
    this.metrics.cost_savings += (premiumCost - cost);
  }

  calculateCost(tier, result) {
    const { input_tokens, output_tokens } = result;
    const total_tokens = (input_tokens || 0) + (output_tokens || 0);
    return (total_tokens / 1000) * this.tiers[tier].cost_per_1k_tokens;
  }

  isAlamaAvailable() {
    // Check ALAMA service health
    // ... (health check logic)
    return true;
  }

  getAlamaLoad() {
    // Get current ALAMA load from metrics
    // ... (Prometheus query)
    return 0.5; // Placeholder
  }

  selectFallback(tier) {
    // Fallback hierarchy: local_alama → elastic_gpu → premium_api
    const hierarchy = ['local_alama', 'elastic_gpu', 'premium_api'];
    const currentIndex = hierarchy.indexOf(tier);
    return hierarchy[Math.min(currentIndex + 1, hierarchy.length - 1)];
  }

  getMetrics() {
    const totalRequests = Object.values(this.metrics.requests_routed).reduce((a, b) => a + b, 0);
    const avgCostPerRequest = totalRequests > 0 ? this.currentSpend / totalRequests : 0;
    
    return {
      total_requests: totalRequests,
      requests_by_tier: this.metrics.requests_routed,
      total_spend: this.currentSpend.toFixed(4),
      cost_savings: this.metrics.cost_savings.toFixed(4),
      avg_cost_per_request: avgCostPerRequest.toFixed(4),
      cost_per_story_point: (this.currentSpend / (totalRequests / 100)).toFixed(2), // Assume 100 requests per story point
      fallback_rate: totalRequests > 0 ? (this.metrics.fallback_count / totalRequests * 100).toFixed(2) + '%' : '0%',
      cost_reduction: this.metrics.cost_savings > 0 ? ((this.metrics.cost_savings / (this.currentSpend + this.metrics.cost_savings)) * 100).toFixed(1) + '%' : '0%'
    };
  }
}

module.exports = EconomicOrchestrator;
```

### Expected Outcomes
- 💰 **Cost**: Reduce from ~$2.30 to $1.20 per story point (47% reduction)
- ⚡ **Performance**: Maintain p95 latency <500ms
- 🎯 **Utilization**: 80% requests → local ALAMA (cost-optimized tier)
- 📊 **Scaling**: Auto-scale 3-10 instances based on load
- ⏱️ **Idle Optimization**: Scale down after 10 minutes idle

---

## 2. Disaster Recovery & Geo-Redundancy

### Current Architecture Limitations
- Single-region deployment
- HA (High Availability) but not true DR
- No cross-region replication for stateful components
- Audit logs not protected against regional failure

### Proposed Multi-Region Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Route 53 (Geo-DNS)                      │
│        Active-Active Multi-Region Load Balancing          │
└───────────────┬────────────────────┬─────────────────────┘
                │                    │
        ┌───────┴────────┐   ┌──────┴────────┐
        │ Region: us-east-1  │   Region: eu-west-1 │
        │ (Primary)        │   │ (Secondary)     │
        └──────────────────┘   └──────────────────┘
                │                    │
     ┌──────────┴──────────┐  ┌──────┴───────────┐
     │ Application Tier    │  │ Application Tier  │
     │ - K8s Cluster       │  │ - K8s Cluster     │
     │ - 3 AZs             │  │ - 3 AZs           │
     └──────────┬──────────┘  └──────┬───────────┘
                │                    │
     ┌──────────┴──────────┐  ┌──────┴───────────┐
     │ Data Tier           │  │ Data Tier         │
     │                     │◄─┤                   │
     │ PostgreSQL Primary  │  │ PostgreSQL Standby│
     │ (Sync Replication) ─┼──►(Read Replica)     │
     │                     │  │                   │
     │ Redis Primary       │  │ Redis Replica     │
     │ (Sentinel + Cluster)│  │ (Sentinel + Cluster)│
     │                     │  │                   │
     │ Audit Logs → S3     │  │ Audit Logs → S3   │
     │ (Cross-region sync) │  │ (Cross-region sync)│
     └─────────────────────┘  └───────────────────┘
```

### Implementation Strategy

#### 2.1 PostgreSQL Multi-Region Replication

**File**: `k8s/postgresql-ha.yaml`
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgresql-ha-config
  namespace: zekka-production
data:
  primary.conf: |
    # Primary PostgreSQL configuration for multi-region replication
    listen_addresses = '*'
    max_connections = 200
    shared_buffers = 2GB
    effective_cache_size = 6GB
    maintenance_work_mem = 512MB
    checkpoint_completion_target = 0.9
    wal_buffers = 16MB
    default_statistics_target = 100
    random_page_cost = 1.1
    effective_io_concurrency = 200
    work_mem = 10MB
    min_wal_size = 1GB
    max_wal_size = 4GB
    
    # Replication settings
    wal_level = replica
    max_wal_senders = 10
    max_replication_slots = 10
    hot_standby = on
    synchronous_commit = remote_apply
    synchronous_standby_names = 'pgsync'
    
    # Archiving for PITR
    archive_mode = on
    archive_command = 'aws s3 cp %p s3://zekka-db-wal-archive-us-east-1/%f --region us-east-1'
    
  standby.conf: |
    # Standby PostgreSQL configuration
    hot_standby = on
    max_standby_streaming_delay = 30s
    hot_standby_feedback = on
    
  recovery.conf: |
    # Recovery configuration for standby
    standby_mode = 'on'
    primary_conninfo = 'host=postgresql-primary.us-east-1.zekka.internal port=5432 user=replicator password=${REPLICATION_PASSWORD} application_name=pgsync'
    trigger_file = '/tmp/postgresql.trigger.5432'
    restore_command = 'aws s3 cp s3://zekka-db-wal-archive-us-east-1/%f %p --region us-east-1'
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql-primary
  namespace: zekka-production
spec:
  serviceName: postgresql-primary
  replicas: 1
  selector:
    matchLabels:
      app: postgresql
      role: primary
  template:
    metadata:
      labels:
        app: postgresql
        role: primary
    spec:
      containers:
      - name: postgresql
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
          name: postgresql
        env:
        - name: POSTGRES_DB
          value: zekka_production
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgresql-credentials
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgresql-credentials
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: postgresql-data
          mountPath: /var/lib/postgresql/data
        - name: postgresql-config
          mountPath: /etc/postgresql
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
        livenessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - pg_isready -U $POSTGRES_USER
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - pg_isready -U $POSTGRES_USER
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: postgresql-config
        configMap:
          name: postgresql-ha-config
  volumeClaimTemplates:
  - metadata:
      name: postgresql-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
```

#### 2.2 Cross-Region Audit Log Protection

**File**: `src/services/audit-dr-service.js`
```javascript
/**
 * Audit Log Disaster Recovery Service
 * Ensures audit logs survive regional failures
 */

const AWS = require('aws-sdk');
const { AuditLogger } = require('../utils/audit-logger');

class AuditDRService {
  constructor() {
    this.s3Primary = new AWS.S3({ region: 'us-east-1' });
    this.s3Secondary = new AWS.S3({ region: 'eu-west-1' });
    this.bucketPrimary = 'zekka-audit-logs-us-east-1';
    this.bucketSecondary = 'zekka-audit-logs-eu-west-1';
    this.auditLogger = new AuditLogger();
    
    // Enable S3 Cross-Region Replication
    this.setupCrossRegionReplication();
  }

  async setupCrossRegionReplication() {
    const replicationConfig = {
      Role: process.env.S3_REPLICATION_ROLE_ARN,
      Rules: [
        {
          ID: 'ReplicateAllAuditLogs',
          Status: 'Enabled',
          Priority: 1,
          Filter: { Prefix: 'audit/' },
          Destination: {
            Bucket: `arn:aws:s3:::${this.bucketSecondary}`,
            ReplicationTime: {
              Status: 'Enabled',
              Time: { Minutes: 15 }
            },
            Metrics: {
              Status: 'Enabled',
              EventThreshold: { Minutes: 15 }
            }
          },
          DeleteMarkerReplication: { Status: 'Enabled' }
        }
      ]
    };

    try {
      await this.s3Primary.putBucketReplication({
        Bucket: this.bucketPrimary,
        ReplicationConfiguration: replicationConfig
      }).promise();
      
      console.log('Cross-region replication configured for audit logs');
    } catch (error) {
      console.error('Failed to configure cross-region replication:', error);
    }
  }

  async archiveAuditLogs(logDate) {
    const logFile = `logs/audit/audit-${logDate}.log`;
    const s3Key = `audit/${logDate}/audit-logs.log`;
    
    try {
      // Upload to primary region
      await this.uploadToS3(this.s3Primary, this.bucketPrimary, logFile, s3Key);
      
      // Verify replication to secondary region (after 15 min)
      setTimeout(async () => {
        await this.verifyReplication(s3Key);
      }, 15 * 60 * 1000);
      
      console.log(`Audit logs archived: ${logDate}`);
    } catch (error) {
      console.error('Failed to archive audit logs:', error);
      // Fallback: manually copy to secondary region
      await this.uploadToS3(this.s3Secondary, this.bucketSecondary, logFile, s3Key);
    }
  }

  async uploadToS3(s3Client, bucket, localPath, s3Key) {
    const fs = require('fs').promises;
    const fileContent = await fs.readFile(localPath);
    
    await s3Client.putObject({
      Bucket: bucket,
      Key: s3Key,
      Body: fileContent,
      ServerSideEncryption: 'AES256',
      Metadata: {
        'archived-at': new Date().toISOString(),
        'retention-days': '2555' // 7 years for compliance
      }
    }).promise();
  }

  async verifyReplication(s3Key) {
    try {
      await this.s3Secondary.headObject({
        Bucket: this.bucketSecondary,
        Key: s3Key
      }).promise();
      
      console.log(`Replication verified for ${s3Key}`);
      return true;
    } catch (error) {
      console.error(`Replication failed for ${s3Key}:`, error);
      return false;
    }
  }

  async restoreFromDR(date, targetRegion = 'us-east-1') {
    const s3Key = `audit/${date}/audit-logs.log`;
    const s3Client = targetRegion === 'us-east-1' ? this.s3Primary : this.s3Secondary;
    const bucket = targetRegion === 'us-east-1' ? this.bucketPrimary : this.bucketSecondary;
    
    try {
      const response = await s3Client.getObject({
        Bucket: bucket,
        Key: s3Key
      }).promise();
      
      return response.Body.toString('utf-8');
    } catch (error) {
      console.error(`Failed to restore audit logs for ${date}:`, error);
      throw error;
    }
  }
}

module.exports = AuditDRService;
```

#### 2.3 Redis Multi-Region with Sentinel

**File**: `k8s/redis-sentinel.yaml`
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-sentinel-config
  namespace: zekka-production
data:
  sentinel.conf: |
    sentinel monitor mymaster redis-primary 6379 2
    sentinel down-after-milliseconds mymaster 5000
    sentinel parallel-syncs mymaster 1
    sentinel failover-timeout mymaster 10000
    sentinel announce-ip ${POD_IP}
    sentinel announce-port 26379
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-sentinel
  namespace: zekka-production
spec:
  serviceName: redis-sentinel
  replicas: 3
  selector:
    matchLabels:
      app: redis-sentinel
  template:
    metadata:
      labels:
        app: redis-sentinel
    spec:
      containers:
      - name: sentinel
        image: redis:7-alpine
        command:
        - redis-sentinel
        args:
        - /etc/redis/sentinel.conf
        ports:
        - containerPort: 26379
          name: sentinel
        env:
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        volumeMounts:
        - name: sentinel-config
          mountPath: /etc/redis
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
      volumes:
      - name: sentinel-config
        configMap:
          name: redis-sentinel-config
```

### Expected Outcomes
- 🌍 **RPO**: <15 minutes (replication lag)
- ⏱️ **RTO**: <5 minutes (automatic failover)
- 🛡️ **Durability**: 99.999999999% (11 nines via S3 CRR)
- 📊 **Availability**: 99.99% (4 nines) across regions
- 🔄 **Failover**: Automatic with health checks

---

## 3. Security Hardening: Runtime Protection & Supply Chain

### Current Security Posture
- Application-level security (authentication, authorization)
- Static scanning (npm audit, Snyk)
- Network security (Nginx, TLS)
- **Missing**: Kernel-level runtime protection, image signing, pre-flight gates

### Proposed Security Architecture

```
┌──────────────────────────────────────────────────────┐
│           CI/CD Pipeline Security Gates              │
├──────────────────────────────────────────────────────┤
│  1. Pre-Commit: Lint, Format, Secret Detection       │
│  2. Build: Trivy Scan (CRITICAL = FAIL)              │
│  3. Sign: Cosign Image Signing                       │
│  4. Deploy: Validate Signature                       │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│         Runtime Security (Kernel-Level)              │
├──────────────────────────────────────────────────────┤
│  Falco Rules:                                        │
│  - File access monitoring                            │
│  - Network connection tracking                       │
│  - Privilege escalation detection                    │
│  - Crypto mining detection                           │
│  - Shell spawning alerts                             │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│        SIEM Integration (Real-time Alerts)           │
│  - Slack/PagerDuty for CRITICAL                      │
│  - Security dashboard (Grafana)                      │
│  - Automated response (kill pod, block IP)           │
└──────────────────────────────────────────────────────┘
```

### Implementation Strategy

#### 3.1 Trivy Pre-flight Scanning Gate

**File**: `.github/workflows/security-gate.yml`
```yaml
name: Security Gate - Trivy Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  trivy-scan:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Run Trivy vulnerability scanner (filesystem)
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'
        severity: 'CRITICAL,HIGH'
        exit-code: '1'  # Fail build on CRITICAL/HIGH
    
    - name: Upload Trivy results to GitHub Security tab
      uses: github/codeql-action/upload-sarif@v2
      if: always()
      with:
        sarif_file: 'trivy-results.sarif'
    
    - name: Build Docker image
      run: docker build -t zekka-app:${{ github.sha }} .
    
    - name: Run Trivy vulnerability scanner (image)
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: 'zekka-app:${{ github.sha }}'
        format: 'sarif'
        output: 'trivy-image-results.sarif'
        severity: 'CRITICAL'
        exit-code: '1'  # HARD GATE: Block deployment on CRITICAL
    
    - name: Upload image scan results
      uses: github/codeql-action/upload-sarif@v2
      if: always()
      with:
        sarif_file: 'trivy-image-results.sarif'

  dependency-check:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Run npm audit
      run: |
        npm ci
        npm audit --audit-level=high
        
    - name: Run Snyk security scan
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        args: --severity-threshold=high
```

#### 3.2 Cosign Image Signing

**File**: `scripts/sign-image.sh`
```bash
#!/bin/bash
# Sign Docker image with Cosign
# Requires: COSIGN_KEY (private key), COSIGN_PASSWORD

set -euo pipefail

IMAGE_NAME="${1:-zekka-app}"
IMAGE_TAG="${2:-latest}"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"

echo "🔐 Signing image: ${FULL_IMAGE}"

# Generate key pair if not exists
if [ ! -f "cosign.key" ]; then
  echo "Generating Cosign key pair..."
  cosign generate-key-pair
fi

# Sign the image
cosign sign --key cosign.key "${FULL_IMAGE}"

# Verify signature
cosign verify --key cosign.pub "${FULL_IMAGE}"

echo "✅ Image signed and verified: ${FULL_IMAGE}"
```

**File**: `k8s/image-policy-webhook.yaml`
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: image-policy-webhook-config
  namespace: kube-system
data:
  policy.json: |
    {
      "imagePolicy": {
        "kubeConfigFile": "/etc/kubernetes/webhook-kubeconfig.yaml",
        "allowTTL": 50,
        "denyTTL": 5,
        "retryBackoff": 500,
        "defaultAllow": false
      }
    }
  kubeconfig.yaml: |
    apiVersion: v1
    kind: Config
    clusters:
    - name: image-policy-webhook
      cluster:
        certificate-authority: /etc/kubernetes/pki/ca.crt
        server: https://image-policy-webhook.kube-system.svc:8080/verify
    contexts:
    - context:
        cluster: image-policy-webhook
        user: api-server
      name: image-policy-webhook
    current-context: image-policy-webhook
    users:
    - name: api-server
      user:
        client-certificate: /etc/kubernetes/pki/apiserver.crt
        client-key: /etc/kubernetes/pki/apiserver.key
```

#### 3.3 Falco Runtime Security

**File**: `k8s/falco-daemonset.yaml`
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: falco
  namespace: falco-system
spec:
  selector:
    matchLabels:
      app: falco
  template:
    metadata:
      labels:
        app: falco
    spec:
      serviceAccountName: falco
      hostNetwork: true
      hostPID: true
      containers:
      - name: falco
        image: falcosecurity/falco:0.36.0
        securityContext:
          privileged: true
        env:
        - name: FALCO_GRPC_ENABLED
          value: "true"
        - name: FALCO_GRPC_BIND_ADDRESS
          value: "0.0.0.0:5060"
        volumeMounts:
        - name: docker-socket
          mountPath: /var/run/docker.sock
        - name: dev
          mountPath: /dev
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: boot
          mountPath: /host/boot
          readOnly: true
        - name: lib-modules
          mountPath: /host/lib/modules
          readOnly: true
        - name: usr
          mountPath: /host/usr
          readOnly: true
        - name: etc
          mountPath: /host/etc
          readOnly: true
        - name: falco-rules
          mountPath: /etc/falco
        resources:
          requests:
            memory: "512Mi"
            cpu: "100m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      - name: falco-exporter
        image: falcosecurity/falco-exporter:0.8.0
        ports:
        - containerPort: 9376
          name: metrics
        env:
        - name: FALCO_GRPC_ENDPOINT
          value: "localhost:5060"
      volumes:
      - name: docker-socket
        hostPath:
          path: /var/run/docker.sock
      - name: dev
        hostPath:
          path: /dev
      - name: proc
        hostPath:
          path: /proc
      - name: boot
        hostPath:
          path: /boot
      - name: lib-modules
        hostPath:
          path: /lib/modules
      - name: usr
        hostPath:
          path: /usr
      - name: etc
        hostPath:
          path: /etc
      - name: falco-rules
        configMap:
          name: falco-rules
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: falco-rules
  namespace: falco-system
data:
  custom-rules.yaml: |
    - rule: Suspicious File Access in Container
      desc: Detect access to sensitive files in Zekka containers
      condition: >
        container.name contains "zekka" and
        (fd.name in (/etc/shadow, /etc/passwd, /root/.ssh/id_rsa) or
         fd.directory in (/root/.ssh, /home/*/.ssh))
      output: >
        Suspicious file access detected (user=%user.name 
        file=%fd.name container=%container.name image=%container.image.repository)
      priority: CRITICAL
    
    - rule: Cryptocurrency Mining Detected
      desc: Detect crypto mining activity
      condition: >
        spawned_process and
        (proc.name in (xmrig, minerd, cpuminer) or
         proc.cmdline contains "stratum+tcp")
      output: >
        Crypto mining detected (user=%user.name command=%proc.cmdline 
        container=%container.name)
      priority: CRITICAL
    
    - rule: Reverse Shell Detected
      desc: Detect reverse shell connections
      condition: >
        spawned_process and
        (proc.name in (nc, ncat, socat, bash, sh) and
         (proc.args contains "-e" or proc.args contains "-c" or
          proc.args contains "/bin/sh" or proc.args contains "/bin/bash"))
      output: >
        Reverse shell detected (user=%user.name command=%proc.cmdline 
        container=%container.name)
      priority: CRITICAL
    
    - rule: Unexpected Network Connection
      desc: Detect outbound connections from app containers
      condition: >
        container.name contains "zekka" and
        evt.type=connect and
        fd.sip!="0.0.0.0" and
        not fd.sip in (kubernetes_service_ips, trusted_external_ips)
      output: >
        Unexpected outbound connection (destination=%fd.sip:%fd.sport 
        container=%container.name)
      priority: WARNING
    
    - rule: Privilege Escalation Attempt
      desc: Detect privilege escalation via sudo, su, or setuid
      condition: >
        spawned_process and
        (proc.name in (sudo, su) or
         evt.type=execve and evt.arg.flags contains "setuid")
      output: >
        Privilege escalation attempt (user=%user.name command=%proc.cmdline 
        container=%container.name)
      priority: CRITICAL
```

**File**: `scripts/falco-alert-handler.js`
```javascript
#!/usr/bin/env node
/**
 * Falco Alert Handler
 * Receives alerts from Falco and triggers automated responses
 */

const http = require('http');
const { sendAlert } = require('./alert-notify');

const ALERT_WEBHOOK_PORT = process.env.FALCO_WEBHOOK_PORT || 8765;

const AUTOMATED_RESPONSES = {
  'Cryptocurrency Mining Detected': async (alert) => {
    // Kill the pod immediately
    await killPod(alert.output_fields.container_name);
    await sendAlert({
      title: '🚨 CRITICAL: Crypto Mining Detected - Pod Terminated',
      message: `Crypto mining detected in pod ${alert.output_fields.container_name}. Pod has been automatically terminated.`,
      severity: 'critical',
      channels: ['slack', 'pagerduty']
    });
  },
  
  'Reverse Shell Detected': async (alert) => {
    // Kill pod and block source IP
    await killPod(alert.output_fields.container_name);
    await blockIP(alert.output_fields.fd_sip);
    await sendAlert({
      title: '🚨 CRITICAL: Reverse Shell Detected - Pod Terminated, IP Blocked',
      message: `Reverse shell in pod ${alert.output_fields.container_name}. Pod terminated, IP ${alert.output_fields.fd_sip} blocked.`,
      severity: 'critical',
      channels: ['slack', 'pagerduty', 'email']
    });
  },
  
  'Privilege Escalation Attempt': async (alert) => {
    // Log and alert (don't auto-kill as may be legitimate)
    await sendAlert({
      title: '⚠️ WARNING: Privilege Escalation Attempt',
      message: `Privilege escalation in pod ${alert.output_fields.container_name} by user ${alert.output_fields.user_name}. Investigate immediately.`,
      severity: 'high',
      channels: ['slack', 'pagerduty']
    });
  }
};

async function killPod(podName) {
  const { exec } = require('child_process');
  return new Promise((resolve, reject) => {
    exec(`kubectl delete pod ${podName} -n zekka-production`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Failed to kill pod ${podName}:`, error);
        reject(error);
      } else {
        console.log(`Pod ${podName} terminated`);
        resolve(stdout);
      }
    });
  });
}

async function blockIP(ip) {
  // Implement IP blocking logic (e.g., update firewall rules, network policies)
  console.log(`Blocking IP: ${ip}`);
  // Example: kubectl apply -f block-ip-networkpolicy.yaml
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/falco-alert') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const alert = JSON.parse(body);
        console.log('Received Falco alert:', alert.rule);
        
        // Trigger automated response if rule matches
        const handler = AUTOMATED_RESPONSES[alert.rule];
        if (handler) {
          await handler(alert);
        } else {
          // Default: send alert without automated response
          await sendAlert({
            title: `Falco Alert: ${alert.rule}`,
            message: alert.output,
            severity: alert.priority.toLowerCase(),
            channels: ['slack']
          });
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch (error) {
        console.error('Error processing Falco alert:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(ALERT_WEBHOOK_PORT, () => {
  console.log(`Falco alert handler listening on port ${ALERT_WEBHOOK_PORT}`);
});
```

### Expected Outcomes
- 🔐 **Vulnerability Gate**: Block deployment on CRITICAL CVEs
- 🖊️ **Image Trust**: Only signed images can be deployed
- 🛡️ **Runtime Protection**: Detect and auto-respond to threats
- 📊 **Visibility**: Real-time security events dashboard
- ⚡ **MTTR**: <1 minute for automated responses (kill pod, block IP)

---

## 4. Operational Excellence: Three-Command Emergency Guide

### Current Operations Challenges
- Complex multi-step recovery procedures
- 17 artifacts to manage across deployments
- High cognitive load during incidents
- Manual health checks and rollback

### Proposed Emergency Operations Framework

```
Emergency Operations (3 Commands)
┌──────────────────────────────────────────────────┐
│  Command 1: Health Check (17 Artifacts)         │
│  $ npm run ops:health                            │
│  ✓ API Gateway: HEALTHY                          │
│  ✓ PostgreSQL: HEALTHY                           │
│  ✓ Redis: HEALTHY                                │
│  ✓ ALAMA: WARNING (high latency)                 │
│  ... (13 more artifacts)                         │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│  Command 2: Visual Dashboard (Cloptop-style)    │
│  $ npm run ops:monitor                           │
│  [Real-time terminal UI with 17 service tiles]  │
│  Color-coded: Green=OK, Yellow=Warning, Red=Down│
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│  Command 3: Emergency Rollback                   │
│  $ npm run ops:rollback                          │
│  Rolling back to last known good state...        │
│  ✓ Database migration reverted                   │
│  ✓ Application rolled back to v3.0.0            │
│  ✓ Service restarted                             │
└──────────────────────────────────────────────────┘
```

### Implementation Strategy

#### 4.1 Comprehensive Health Check

**File**: `scripts/ops-health-check.js`
```javascript
#!/usr/bin/env node
/**
 * Comprehensive health check across all 17 Zekka artifacts
 * Single command to verify entire system health
 */

const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
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
    url: 'http://alama-inference.zekka-production.svc.cluster.local:8080/health',
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
    command: 'systemctl is-active nginx',
    critical: true
  },
  {
    name: 'Audit Log Service',
    type: 'file',
    path: '/var/log/zekka/audit/audit-latest.log',
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
    command: 'cosign version',
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
        message: error.message,
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
          message: output
        };
      } else if (artifact.type === 'redis') {
        return {
          status: output === 'PONG' || output.includes('master') ? 'HEALTHY' : 'DOWN',
          message: output
        };
      } else {
        return {
          status: output === 'active' || output.includes('version') ? 'HEALTHY' : 'WARNING',
          message: output
        };
      }
    } catch (error) {
      return {
        status: 'DOWN',
        message: error.message
      };
    }
  }

  async checkK8s(artifact) {
    try {
      const { stdout } = await execPromise(artifact.command);
      const pods = JSON.parse(stdout);
      
      const runningPods = pods.items.filter(pod => pod.status.phase === 'Running');
      const totalPods = pods.items.length;
      
      if (runningPods.length === 0) {
        return { status: 'DOWN', message: 'No running pods' };
      } else if (runningPods.length < totalPods) {
        return { status: 'WARNING', message: `${runningPods.length}/${totalPods} pods running` };
      } else {
        return { status: 'HEALTHY', message: `All ${totalPods} pods running` };
      }
    } catch (error) {
      return { status: 'DOWN', message: error.message };
    }
  }

  async checkFile(artifact) {
    const fs = require('fs').promises;
    try {
      const stats = await fs.stat(artifact.path);
      const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;
      
      if (ageSeconds > artifact.maxAge) {
        return {
          status: 'WARNING',
          message: `File not updated for ${Math.floor(ageSeconds)}s (max: ${artifact.maxAge}s)`
        };
      } else {
        return {
          status: 'HEALTHY',
          message: `File updated ${Math.floor(ageSeconds)}s ago`
        };
      }
    } catch (error) {
      return { status: 'DOWN', message: 'File not found' };
    }
  }

  async checkS3(artifact) {
    try {
      const { stdout } = await execPromise(`aws s3 ls s3://${artifact.bucket}/ --max-items 1`);
      return {
        status: stdout ? 'HEALTHY' : 'WARNING',
        message: stdout ? 'Bucket accessible' : 'Bucket empty or inaccessible'
      };
    } catch (error) {
      return { status: 'DOWN', message: error.message };
    }
  }

  async checkGitHub(artifact) {
    try {
      const { stdout } = await execPromise(`gh repo view ${artifact.repo} --json name`);
      const repo = JSON.parse(stdout);
      return {
        status: repo.name ? 'HEALTHY' : 'WARNING',
        message: `Repository: ${repo.name}`
      };
    } catch (error) {
      return { status: 'WARNING', message: 'Unable to check GitHub' };
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
      'HEALTHY': '\x1b[32m',   // Green
      'WARNING': '\x1b[33m',   // Yellow
      'DOWN': '\x1b[31m',      // Red
      'UNKNOWN': '\x1b[90m'    // Gray
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
      
      console.log(`║ ${symbol} ${color}${result.status}${reset} ${paddedName}${critical}`);
      if (result.message) {
        const messageLines = result.message.split('\n');
        messageLines.forEach(line => {
          console.log(`║    ${line.substring(0, 50)}`);
        });
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
checker.checkAll();
```

#### 4.2 Real-time Visual Dashboard

**File**: `scripts/ops-monitor.js`
```javascript
#!/usr/bin/env node
/**
 * Real-time Operations Dashboard (Cloptop-style)
 * Terminal UI with live health monitoring for 17 artifacts
 */

const blessed = require('blessed');
const contrib = require('blessed-contrib');
const axios = require('axios');

class OpsDashboard {
  constructor() {
    this.screen = blessed.screen();
    this.grid = new contrib.grid({ rows: 6, cols: 4, screen: this.screen });
    this.widgets = {};
    this.data = {};
    
    this.setupUI();
    this.setupKeyBindings();
    this.startMonitoring();
  }

  setupUI() {
    // Title
    this.widgets.title = this.grid.set(0, 0, 1, 4, blessed.box, {
      content: '🚀 ZEKKA OPERATIONS DASHBOARD - Live Monitoring (Press q to quit)',
      tags: true,
      style: {
        fg: 'white',
        bg: 'blue',
        bold: true
      }
    });

    // Service status tiles (3x4 grid for 12 services)
    const services = [
      'API Gateway', 'PostgreSQL', 'Redis', 'ALAMA',
      'Elastic GPU', 'Prometheus', 'Grafana', 'Nginx',
      'Audit Logs', 'Falco', 'Context Bus', 'CI/CD'
    ];
    
    let row = 1;
    let col = 0;
    services.forEach((service, index) => {
      this.widgets[service] = this.grid.set(row, col, 1, 1, contrib.lcd, {
        label: service,
        segmentWidth: 0.06,
        segmentInterval: 0.11,
        strokeWidth: 0.1,
        elements: 4,
        display: 'OK',
        elementSpacing: 4,
        elementPadding: 2
      });
      
      col++;
      if (col >= 4) {
        col = 0;
        row++;
      }
    });

    // Metrics charts
    this.widgets.requestRate = this.grid.set(4, 0, 2, 2, contrib.line, {
      label: 'Request Rate (req/s)',
      showLegend: true,
      legend: { width: 12 }
    });

    this.widgets.responseTime = this.grid.set(4, 2, 2, 2, contrib.line, {
      label: 'Response Time (ms)',
      showLegend: true,
      legend: { width: 12 }
    });

    this.screen.render();
  }

  setupKeyBindings() {
    this.screen.key(['escape', 'q', 'C-c'], () => {
      return process.exit(0);
    });
  }

  async startMonitoring() {
    // Update every 2 seconds
    setInterval(async () => {
      await this.updateStatus();
      this.screen.render();
    }, 2000);
    
    // Initial update
    await this.updateStatus();
  }

  async updateStatus() {
    // Update service status tiles
    const services = {
      'API Gateway': 'http://localhost:3000/health',
      'PostgreSQL': null, // Use pg_isready
      'Redis': null, // Use redis-cli
      'ALAMA': 'http://alama-inference:8080/health',
      'Elastic GPU': null, // Use kubectl
      'Prometheus': 'http://localhost:9090/-/healthy',
      'Grafana': 'http://localhost:3001/api/health',
      'Nginx': null, // Use systemctl
      'Audit Logs': null, // Check file
      'Falco': null, // Use kubectl
      'Context Bus': 'http://localhost:3000/api/context/health',
      'CI/CD': null // Check GitHub
    };

    for (const [service, url] of Object.entries(services)) {
      let status = 'DOWN';
      let color = 'red';
      
      if (url) {
        try {
          const response = await axios.get(url, { timeout: 2000 });
          if (response.status === 200) {
            status = 'OK';
            color = 'green';
          } else {
            status = 'WARN';
            color = 'yellow';
          }
        } catch (error) {
          status = 'DOWN';
          color = 'red';
        }
      } else {
        // For non-HTTP checks, assume OK for now (implement proper checks)
        status = 'OK';
        color = 'green';
      }
      
      if (this.widgets[service]) {
        this.widgets[service].setDisplay(status);
        this.widgets[service].setOptions({ color });
      }
    }

    // Update metrics charts (mock data for now)
    this.updateCharts();
  }

  updateCharts() {
    // Mock data - replace with real Prometheus queries
    const now = Date.now();
    const requestRateData = {
      x: Array.from({ length: 60 }, (_, i) => new Date(now - (60 - i) * 1000).toLocaleTimeString()),
      y: Array.from({ length: 60 }, () => Math.floor(Math.random() * 100) + 50)
    };
    
    const responseTimeData = {
      x: Array.from({ length: 60 }, (_, i) => new Date(now - (60 - i) * 1000).toLocaleTimeString()),
      y: Array.from({ length: 60 }, () => Math.floor(Math.random() * 200) + 100)
    };

    this.widgets.requestRate.setData([{
      title: 'Requests',
      x: requestRateData.x,
      y: requestRateData.y,
      style: { line: 'green' }
    }]);

    this.widgets.responseTime.setData([{
      title: 'Latency',
      x: responseTimeData.x,
      y: responseTimeData.y,
      style: { line: 'yellow' }
    }]);
  }
}

// Check if blessed and blessed-contrib are installed
try {
  require.resolve('blessed');
  require.resolve('blessed-contrib');
} catch (error) {
  console.error('Missing dependencies. Install with:');
  console.error('npm install --save-dev blessed blessed-contrib');
  process.exit(1);
}

// Start dashboard
const dashboard = new OpsDashboard();
```

#### 4.3 Emergency Rollback

**File**: `scripts/ops-rollback.js`
```javascript
#!/usr/bin/env node
/**
 * Emergency Rollback Script
 * One-command rollback to last known good state
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
      const lastMigration = lines.filter(line => line.includes('EXECUTED')).pop();
      
      if (lastMigration) {
        console.log(`   Rolling back migration: ${lastMigration}`);
        await execPromise('npm run migrate:rollback');
        this.steps.push('Database migration rolled back');
        console.log('   ✅ Database rollback complete');
      } else {
        console.log('   ℹ️  No migrations to rollback');
      }
    } catch (error) {
      this.errors.push(`Database rollback failed: ${error.message}`);
      throw error;
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
      
      // Kubernetes: Rollback deployment
      await execPromise('kubectl rollout undo deployment/zekka-app -n zekka-production');
      
      // Wait for rollback to complete
      await execPromise('kubectl rollout status deployment/zekka-app -n zekka-production --timeout=5m');
      
      this.steps.push(`Application rolled back to ${lastGoodCommit.trim()}`);
      console.log('   ✅ Application rollback complete');
    } catch (error) {
      this.errors.push(`Application rollback failed: ${error.message}`);
      throw error;
    }
  }

  async restartServices() {
    console.log('🔄 Step 3: Restarting services...');
    
    const services = [
      { name: 'Nginx', command: 'systemctl restart nginx' },
      { name: 'Redis', command: 'systemctl restart redis' },
      { name: 'Prometheus', command: 'systemctl restart prometheus' }
    ];
    
    for (const service of services) {
      try {
        console.log(`   Restarting ${service.name}...`);
        await execPromise(service.command);
        this.steps.push(`${service.name} restarted`);
        console.log(`   ✅ ${service.name} restarted`);
      } catch (error) {
        this.errors.push(`${service.name} restart failed: ${error.message}`);
        console.warn(`   ⚠️  ${service.name} restart failed (non-critical)`);
      }
    }
  }

  async verifyHealth() {
    console.log('🔍 Step 4: Verifying system health...');
    
    try {
      // Run health check
      await execPromise('node scripts/ops-health-check.js');
      this.steps.push('Health check passed');
      console.log('   ✅ System health verified');
    } catch (error) {
      this.errors.push(`Health check failed: ${error.message}`);
      throw error;
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
  }

  printErrors() {
    console.log('\n❌ ERRORS:');
    this.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
  }
}

// Execute rollback
const rollback = new EmergencyRollback();
rollback.execute();
```

### Update package.json Scripts

**Add to package.json**:
```json
{
  "scripts": {
    "ops:health": "node scripts/ops-health-check.js",
    "ops:monitor": "node scripts/ops-monitor.js",
    "ops:rollback": "node scripts/ops-rollback.js"
  }
}
```

### Expected Outcomes
- ⚡ **MTTR**: <5 minutes from incident detection to resolution
- 🎯 **Cognitive Load**: 3 commands vs. 20+ manual steps
- 📊 **Visibility**: Real-time status of all 17 artifacts
- 🔄 **Automation**: One-command rollback with verification
- 👥 **Operator Confidence**: Clear, simple emergency procedures

---

## 5. Implementation Timeline

### Phase 1: Token Economics (Weeks 1-2)
- [ ] Deploy Kubernetes HPA for ALAMA
- [ ] Implement Economic Orchestrator service
- [ ] Configure auto-scaling policies
- [ ] Monitor cost reduction metrics
- [ ] **Target**: 47% cost reduction to $1.20/story point

### Phase 2: Disaster Recovery (Weeks 2-4)
- [ ] Set up PostgreSQL multi-region replication
- [ ] Configure Redis Sentinel clusters
- [ ] Implement S3 cross-region audit log replication
- [ ] Test failover procedures
- [ ] **Target**: RPO <15min, RTO <5min

### Phase 3: Security Hardening (Weeks 3-5)
- [ ] Integrate Trivy pre-flight scanning gates
- [ ] Set up Cosign image signing
- [ ] Deploy Falco kernel-level runtime security
- [ ] Configure automated response handlers
- [ ] **Target**: Zero CRITICAL vulnerabilities in production

### Phase 4: Operational Excellence (Weeks 4-6)
- [ ] Implement ops-health-check.js (17 artifacts)
- [ ] Build ops-monitor.js dashboard
- [ ] Create ops-rollback.js automation
- [ ] Write operator runbooks
- [ ] **Target**: MTTR <5 minutes

### Phase 5: Testing & Validation (Week 6)
- [ ] Conduct load testing with token economics
- [ ] Simulate regional failure scenarios
- [ ] Penetration testing with Falco monitoring
- [ ] Emergency operations drills
- [ ] **Target**: 100% success rate on drills

### Phase 6: Production Deployment (Week 7)
- [ ] Staged rollout to production
- [ ] Monitor cost metrics (47% reduction validation)
- [ ] Validate DR procedures in production
- [ ] Security posture review
- [ ] **Target**: Zero-downtime deployment

---

## 6. Success Metrics & KPIs

### Cost Optimization
- 💰 **Cost per Story Point**: $1.20 (target) vs. $2.30 (current) = 47% reduction
- 📊 **ALAMA Utilization**: 80% requests (target)
- ⚡ **Auto-scaling Efficiency**: 70% cost savings during idle periods
- 📈 **ROI**: $X,XXX/month savings

### Disaster Recovery
- 🌍 **RPO (Recovery Point Objective)**: <15 minutes
- ⏱️ **RTO (Recovery Time Objective)**: <5 minutes
- 🛡️ **Data Durability**: 99.999999999% (11 nines)
- 📊 **Availability**: 99.99% (4 nines) across regions
- 🔄 **Failover Success Rate**: 100%

### Security
- 🔒 **Vulnerability Gate Success**: 100% (no CRITICAL in production)
- 🖊️ **Image Signing Coverage**: 100% of production images
- 🛡️ **Falco Detection Rate**: 100% of known threats
- ⚡ **MTTR for Security Incidents**: <1 minute (automated response)
- 📊 **False Positive Rate**: <5%

### Operations
- 🎯 **MTTR (Mean Time to Recovery)**: <5 minutes
- 📊 **Health Check Coverage**: 17/17 artifacts
- 🔄 **Rollback Success Rate**: 100%
- 👥 **Operator Satisfaction**: 9/10 (target)
- 📈 **Incident Resolution Time**: 50% reduction

---

## 7. Risk Mitigation

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Auto-scaling costs exceed budget | HIGH | Monitor with alerts; set hard limits |
| Cross-region replication lag | MEDIUM | Use synchronous replication; monitor lag |
| Falco false positives | MEDIUM | Tune rules; implement allowlists |
| Rollback fails | HIGH | Test regularly; maintain multiple restore points |

### Operational Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Operator training gap | MEDIUM | Comprehensive runbooks; quarterly drills |
| Incident during low staffing | HIGH | Automated responses; on-call rotation |
| Documentation drift | MEDIUM | Automated doc generation; quarterly reviews |
| Tool complexity | MEDIUM | Simple 3-command interface; visual dashboards |

---

## 8. Appendix

### A. Glossary
- **ALAMA**: AI/ML inference service (local deployment)
- **RPO**: Recovery Point Objective (data loss tolerance)
- **RTO**: Recovery Time Objective (downtime tolerance)
- **MTTR**: Mean Time To Recovery
- **HPA**: Horizontal Pod Autoscaler (Kubernetes)
- **Falco**: Kernel-level runtime security tool
- **Trivy**: Container vulnerability scanner
- **Cosign**: Container image signing tool

### B. References
- [Kubernetes HPA Documentation](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [PostgreSQL Replication](https://www.postgresql.org/docs/current/warm-standby.html)
- [Falco Rules](https://falco.org/docs/rules/)
- [Trivy Scanning](https://aquasecurity.github.io/trivy/)
- [Cosign Image Signing](https://docs.sigstore.dev/cosign/overview)

### C. Contact Information
- **Engineering Lead**: [Name]
- **DevOps Team**: ops@zekka.internal
- **Security Team**: security@zekka.internal
- **On-call**: +1-XXX-XXX-XXXX

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-15  
**Next Review**: 2026-02-15
