const redis = require('redis');
const { v4: uuidv4 } = require('uuid');

/**
 * Context Bus - Centralized state management and file locking
 * Prevents agent collisions and ensures consistency
 */
class ContextBus {
  constructor(options = {}) {
    this.host = options.host || 'localhost';
    this.port = options.port || 6379;
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
  }

  async connect() {
    // Main client for operations
    this.client = redis.createClient({
      socket: {
        host: this.host,
        port: this.port
      }
    });

    this.client.on('error', (err) => console.error('Redis Client Error:', err));
    await this.client.connect();

    // Pub/Sub clients
    this.subscriber = this.client.duplicate();
    this.publisher = this.client.duplicate();
    await this.subscriber.connect();
    await this.publisher.connect();

    console.log('✅ Context Bus connected to Redis');
  }

  async disconnect() {
    if (this.client) await this.client.quit();
    if (this.subscriber) await this.subscriber.quit();
    if (this.publisher) await this.publisher.quit();
  }

  isConnected() {
    return this.client && this.client.isOpen;
  }

  // ========================================
  // Project Context Management
  // ========================================

  async setProjectContext(projectId, context) {
    const key = `project:${projectId}:context`;
    await this.client.set(key, JSON.stringify(context));
    await this.client.expire(key, 86400 * 7); // 7 days
    
    // Publish update event
    await this.publisher.publish('context:update', JSON.stringify({ projectId, context }));
  }

  async getProjectContext(projectId) {
    const key = `project:${projectId}:context`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async updateProjectContext(projectId, updates) {
    const context = await this.getProjectContext(projectId) || {};
    const updated = { ...context, ...updates, updatedAt: new Date().toISOString() };
    await this.setProjectContext(projectId, updated);
    return updated;
  }

  // ========================================
  // File Locking (Critical for preventing conflicts)
  // ========================================

  async requestFileLock(taskId, agentName, filePath, ttlSeconds = 300) {
    const lockKey = `lock:${taskId}:${filePath}`;
    const lockValue = JSON.stringify({
      agentName,
      lockedAt: new Date().toISOString(),
      taskId
    });

    // Try to acquire lock (SET NX - set if not exists)
    const acquired = await this.client.set(lockKey, lockValue, {
      NX: true,
      EX: ttlSeconds
    });

    if (acquired) {
      console.log(`🔒 Lock acquired: ${agentName} → ${filePath}`);
      return true;
    } else {
      const existing = await this.client.get(lockKey);
      console.log(`⚠️  Lock denied: ${filePath} is locked by ${JSON.parse(existing).agentName}`);
      return false;
    }
  }

  async releaseFileLock(taskId, agentName, filePath) {
    const lockKey = `lock:${taskId}:${filePath}`;
    const existing = await this.client.get(lockKey);

    if (existing) {
      const lock = JSON.parse(existing);
      if (lock.agentName === agentName) {
        await this.client.del(lockKey);
        console.log(`🔓 Lock released: ${agentName} → ${filePath}`);
        return true;
      } else {
        console.log(`⚠️  Cannot release: Lock owned by ${lock.agentName}, not ${agentName}`);
        return false;
      }
    }

    return false;
  }

  async getActiveLocks(taskId) {
    const pattern = `lock:${taskId}:*`;
    const keys = await this.client.keys(pattern);
    
    const locks = [];
    for (const key of keys) {
      const value = await this.client.get(key);
      if (value) {
        locks.push({
          filePath: key.replace(`lock:${taskId}:`, ''),
          ...JSON.parse(value)
        });
      }
    }
    
    return locks;
  }

  // ========================================
  // Agent State Management
  // ========================================

  async setAgentState(taskId, agentName, state) {
    const key = `agent:${taskId}:${agentName}`;
    await this.client.set(key, JSON.stringify({
      ...state,
      lastUpdate: new Date().toISOString()
    }), { EX: 3600 }); // 1 hour expiry
  }

  async getAgentState(taskId, agentName) {
    const key = `agent:${taskId}:${agentName}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async getAllAgentStates(taskId) {
    const pattern = `agent:${taskId}:*`;
    const keys = await this.client.keys(pattern);
    
    const states = {};
    for (const key of keys) {
      const agentName = key.split(':')[2];
      const data = await this.client.get(key);
      if (data) {
        states[agentName] = JSON.parse(data);
      }
    }
    
    return states;
  }

  // ========================================
  // Conflict Detection
  // ========================================

  async recordConflict(conflict) {
    const conflictId = uuidv4();
    const key = `conflict:${conflict.taskId}:${conflictId}`;
    
    await this.client.set(key, JSON.stringify({
      ...conflict,
      conflictId,
      createdAt: new Date().toISOString(),
      status: 'pending'
    }), { EX: 86400 }); // 24 hours

    // Add to pending queue
    await this.client.lPush(`conflict:pending`, conflictId);
    
    return conflictId;
  }

  async getConflict(conflictId) {
    const pattern = `conflict:*:${conflictId}`;
    const keys = await this.client.keys(pattern);
    
    if (keys.length > 0) {
      const data = await this.client.get(keys[0]);
      return data ? JSON.parse(data) : null;
    }
    
    return null;
  }

  async updateConflictStatus(conflictId, status, resolution = null) {
    const conflict = await this.getConflict(conflictId);
    if (!conflict) return false;

    const key = `conflict:${conflict.taskId}:${conflictId}`;
    const updated = {
      ...conflict,
      status,
      resolution,
      resolvedAt: new Date().toISOString()
    };

    await this.client.set(key, JSON.stringify(updated), { EX: 86400 * 7 }); // 7 days
    
    // Remove from pending queue if resolved
    if (status === 'resolved') {
      await this.client.lRem('conflict:pending', 0, conflictId);
    }

    return true;
  }

  async getPendingConflicts() {
    const conflictIds = await this.client.lRange('conflict:pending', 0, -1);
    const conflicts = [];

    for (const id of conflictIds) {
      const conflict = await this.getConflict(id);
      if (conflict) conflicts.push(conflict);
    }

    return conflicts;
  }

  // ========================================
  // Pub/Sub for Real-time Updates
  // ========================================

  async subscribe(channel, callback) {
    await this.subscriber.subscribe(channel, (message) => {
      callback(JSON.parse(message));
    });
  }

  async publish(channel, message) {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  // ========================================
  // Cache Management
  // ========================================

  async cache(key, value, ttlSeconds = 3600) {
    await this.client.set(`cache:${key}`, JSON.stringify(value), { EX: ttlSeconds });
  }

  async getCached(key) {
    const data = await this.client.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  }

  async clearCache(pattern = '*') {
    const keys = await this.client.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  // ========================================
  // Metrics & Monitoring
  // ========================================

  async incrementCounter(metric, value = 1) {
    await this.client.incrBy(`metric:${metric}`, value);
  }

  async getCounter(metric) {
    const value = await this.client.get(`metric:${metric}`);
    return parseInt(value) || 0;
  }

  async getMetrics() {
    const keys = await this.client.keys('metric:*');
    const metrics = {};

    for (const key of keys) {
      const metricName = key.replace('metric:', '');
      metrics[metricName] = await this.getCounter(metricName);
    }

    return metrics;
  }
}

module.exports = ContextBus;
