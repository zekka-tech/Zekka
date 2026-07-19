import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';

type RedisClient = ReturnType<typeof createClient>;

interface ContextBusOptions {
  /** Redis server hostname (default 'localhost') */
  host?: string;
  /** Redis server port (default 6379) */
  port?: number;
  /** Redis authentication password */
  password?: string;
  /** Prefix for all Redis keys (default 'zekka:') */
  keyPrefix?: string;
  /** Connection timeout in ms (default 5000) */
  connectTimeout?: number;
  /** Maximum connection retry attempts (default 3) */
  maxRetries?: number;
}

interface FileLock {
  agentName: string;
  lockedAt: string;
  taskId: string;
}

interface ActiveLock extends FileLock {
  filePath: string;
}

interface ConflictInput {
  taskId: string;
  [key: string]: unknown;
}

interface ConflictRecord extends ConflictInput {
  conflictId: string;
  createdAt: string;
  status: string;
  resolution?: unknown;
  resolvedAt?: string;
}

/**
 * Context Bus - Centralized State Management and File Locking System
 *
 * The Context Bus is a critical component of the Zekka Framework that provides:
 * - Centralized state management for multi-agent workflows
 * - Distributed file locking to prevent agent collisions
 * - Real-time pub/sub communication between agents
 * - Project and agent context persistence
 * - Conflict detection and resolution support
 *
 * The Context Bus uses Redis as a distributed store to coordinate multiple
 * AI agents working on the same project. It ensures data consistency and
 * prevents race conditions when agents modify shared resources.
 *
 * Key Features:
 * - **File Locking**: Prevents multiple agents from editing the same file
 * - **State Management**: Tracks agent status, project context, and task state
 * - **Pub/Sub**: Real-time notifications for context updates
 * - **Conflict Detection**: Records and manages conflicts for arbitration
 * - **Caching**: General-purpose caching with TTL support
 * - **Metrics**: Counter-based metrics for monitoring
 *
 * @example
 * // Initialize and connect
 * const contextBus = new ContextBus({
 *   host: 'redis',
 *   port: 6379,
 *   password: 'secure-password'
 * });
 * await contextBus.connect();
 *
 * @example
 * // File locking
 * const acquired = await contextBus.requestFileLock(taskId, 'agent-1', 'src/index.ts');
 * if (acquired) {
 *   // Safe to edit file
 *   await contextBus.releaseFileLock(taskId, 'agent-1', 'src/index.ts');
 * }
 */
class ContextBus {
  readonly host: string;
  readonly port: number;
  readonly password: string;
  readonly keyPrefix: string;
  readonly connectTimeout: number;
  readonly maxRetries: number;

  client: RedisClient | null = null;
  subscriber: RedisClient | null = null;
  publisher: RedisClient | null = null;

  constructor(options: ContextBusOptions = {}) {
    this.host = options.host || 'localhost';
    this.port = options.port || 6379;
    this.password = options.password || process.env['REDIS_PASSWORD'] || '';
    this.keyPrefix = options.keyPrefix || 'zekka:';
    this.connectTimeout = options.connectTimeout || 5000;
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Connect to Redis server with authentication support.
   *
   * Establishes three connections:
   * - Main client for read/write operations
   * - Subscriber client for pub/sub subscriptions
   * - Publisher client for pub/sub publishing
   *
   * @throws {Error} If connection fails after max retries
   */
  async connect(): Promise<void> {
    // Build Redis connection options with optional password
    const connectionOptions: Parameters<typeof createClient>[0] = {
      socket: {
        host: this.host,
        port: this.port,
        connectTimeout: this.connectTimeout,
        reconnectStrategy: (retries: number): number | Error => {
          if (retries > this.maxRetries) {
            console.error(
              `❌ Redis connection failed after ${retries} attempts`
            );
            return new Error('Max reconnection attempts reached');
          }
          // Exponential backoff: 100ms, 200ms, 400ms, ...
          const delay = Math.min(retries * 100, 3000);
          console.log(
            `⏳ Redis reconnecting in ${delay}ms (attempt ${retries}/${this.maxRetries})`
          );
          return delay;
        }
      }
    };

    // Add password authentication if configured
    if (this.password && this.password.length > 0) {
      connectionOptions.password = this.password;
    }

    // Main client for operations
    this.client = createClient(connectionOptions);

    // Set up error handling
    this.client.on('error', (err: Error) => {
      console.error('❌ Redis Client Error:', err.message);
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis client reconnecting...');
    });

    await this.client.connect();

    // Pub/Sub clients (duplicate main client config)
    this.subscriber = this.client.duplicate();
    this.publisher = this.client.duplicate();

    this.subscriber.on('error', (err: Error) => {
      console.error('❌ Redis Subscriber Error:', err.message);
    });

    this.publisher.on('error', (err: Error) => {
      console.error('❌ Redis Publisher Error:', err.message);
    });

    await this.subscriber.connect();
    await this.publisher.connect();

    console.log('✅ Context Bus connected to Redis');
  }

  async disconnect(): Promise<void> {
    if (this.client) await this.client.quit();
    if (this.subscriber) await this.subscriber.quit();
    if (this.publisher) await this.publisher.quit();
  }

  isConnected(): boolean {
    return Boolean(this.client && this.client.isOpen);
  }

  /** Main client accessor that fails loudly when connect() was not called. */
  private requireClient(): RedisClient {
    if (!this.client) {
      throw new Error('Context Bus is not connected — call connect() first');
    }
    return this.client;
  }

  private requirePublisher(): RedisClient {
    if (!this.publisher) {
      throw new Error('Context Bus is not connected — call connect() first');
    }
    return this.publisher;
  }

  private requireSubscriber(): RedisClient {
    if (!this.subscriber) {
      throw new Error('Context Bus is not connected — call connect() first');
    }
    return this.subscriber;
  }

  // ========================================
  // Project Context Management
  // ========================================

  async setProjectContext(projectId: string, context: unknown): Promise<void> {
    const key = `project:${projectId}:context`;
    const client = this.requireClient();
    await client.set(key, JSON.stringify(context));
    await client.expire(key, 86400 * 7); // 7 days

    // Publish update event
    await this.requirePublisher().publish(
      'context:update',
      JSON.stringify({ projectId, context })
    );
  }

  async getProjectContext<T = Record<string, unknown>>(
    projectId: string
  ): Promise<T | null> {
    const key = `project:${projectId}:context`;
    const data = await this.requireClient().get(key);
    return data ? (JSON.parse(data) as T) : null;
  }

  async updateProjectContext(
    projectId: string,
    updates: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const context = (await this.getProjectContext(projectId)) || {};
    const updated = {
      ...context,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.setProjectContext(projectId, updated);
    return updated;
  }

  // ========================================
  // File Locking (Critical for preventing conflicts)
  // ========================================

  async requestFileLock(
    taskId: string,
    agentName: string,
    filePath: string,
    ttlSeconds = 300
  ): Promise<boolean> {
    const lockKey = `lock:${taskId}:${filePath}`;
    const lockValue = JSON.stringify({
      agentName,
      lockedAt: new Date().toISOString(),
      taskId
    });

    // Try to acquire lock (SET NX - set if not exists)
    const acquired = await this.requireClient().set(lockKey, lockValue, {
      NX: true,
      EX: ttlSeconds
    });

    if (acquired) {
      console.log(`🔒 Lock acquired: ${agentName} → ${filePath}`);
      return true;
    }
    const existing = await this.requireClient().get(lockKey);
    const holder = existing
      ? (JSON.parse(existing) as FileLock).agentName
      : 'unknown';
    console.log(`⚠️  Lock denied: ${filePath} is locked by ${holder}`);
    return false;
  }

  async releaseFileLock(
    taskId: string,
    agentName: string,
    filePath: string
  ): Promise<boolean> {
    const lockKey = `lock:${taskId}:${filePath}`;
    const client = this.requireClient();
    const existing = await client.get(lockKey);

    if (existing) {
      const lock = JSON.parse(existing) as FileLock;
      if (lock.agentName === agentName) {
        await client.del(lockKey);
        console.log(`🔓 Lock released: ${agentName} → ${filePath}`);
        return true;
      }
      console.log(
        `⚠️  Cannot release: Lock owned by ${lock.agentName}, not ${agentName}`
      );
      return false;
    }

    return false;
  }

  async getActiveLocks(taskId: string): Promise<ActiveLock[]> {
    const pattern = `lock:${taskId}:*`;
    const client = this.requireClient();
    const keys = await client.keys(pattern);

    const locks: ActiveLock[] = [];
    for (const key of keys) {
      const value = await client.get(key);
      if (value) {
        locks.push({
          filePath: key.replace(`lock:${taskId}:`, ''),
          ...(JSON.parse(value) as FileLock)
        });
      }
    }

    return locks;
  }

  // ========================================
  // Agent State Management
  // ========================================

  async setAgentState(
    taskId: string,
    agentName: string,
    state: Record<string, unknown>
  ): Promise<void> {
    const key = `agent:${taskId}:${agentName}`;
    await this.requireClient().set(
      key,
      JSON.stringify({
        ...state,
        lastUpdate: new Date().toISOString()
      }),
      { EX: 3600 }
    ); // 1 hour expiry
  }

  async getAgentState(
    taskId: string,
    agentName: string
  ): Promise<Record<string, unknown> | null> {
    const key = `agent:${taskId}:${agentName}`;
    const data = await this.requireClient().get(key);
    return data ? (JSON.parse(data) as Record<string, unknown>) : null;
  }

  async getAllAgentStates(
    taskId: string
  ): Promise<Record<string, Record<string, unknown>>> {
    const pattern = `agent:${taskId}:*`;
    const client = this.requireClient();
    const keys = await client.keys(pattern);

    const states: Record<string, Record<string, unknown>> = {};
    for (const key of keys) {
      const agentName = key.split(':')[2];
      const data = await client.get(key);
      if (agentName && data) {
        states[agentName] = JSON.parse(data) as Record<string, unknown>;
      }
    }

    return states;
  }

  // ========================================
  // Conflict Detection
  // ========================================

  async recordConflict(conflict: ConflictInput): Promise<string> {
    const conflictId = uuidv4();
    const key = `conflict:${conflict.taskId}:${conflictId}`;
    const client = this.requireClient();

    await client.set(
      key,
      JSON.stringify({
        ...conflict,
        conflictId,
        createdAt: new Date().toISOString(),
        status: 'pending'
      }),
      { EX: 86400 }
    ); // 24 hours

    // Add to pending queue
    await client.lPush('conflict:pending', conflictId);

    return conflictId;
  }

  async getConflict(conflictId: string): Promise<ConflictRecord | null> {
    const pattern = `conflict:*:${conflictId}`;
    const client = this.requireClient();
    const keys = await client.keys(pattern);
    const firstKey = keys[0];

    if (firstKey) {
      const data = await client.get(firstKey);
      return data ? (JSON.parse(data) as ConflictRecord) : null;
    }

    return null;
  }

  async updateConflictStatus(
    conflictId: string,
    status: string,
    resolution: unknown = null
  ): Promise<boolean> {
    const conflict = await this.getConflict(conflictId);
    if (!conflict) return false;

    const key = `conflict:${conflict.taskId}:${conflictId}`;
    const updated = {
      ...conflict,
      status,
      resolution,
      resolvedAt: new Date().toISOString()
    };

    const client = this.requireClient();
    await client.set(key, JSON.stringify(updated), { EX: 86400 * 7 }); // 7 days

    // Remove from pending queue if resolved
    if (status === 'resolved') {
      await client.lRem('conflict:pending', 0, conflictId);
    }

    return true;
  }

  async getPendingConflicts(): Promise<ConflictRecord[]> {
    const conflictIds = await this.requireClient().lRange(
      'conflict:pending',
      0,
      -1
    );
    const conflicts: ConflictRecord[] = [];

    for (const id of conflictIds) {
      const conflict = await this.getConflict(id);
      if (conflict) conflicts.push(conflict);
    }

    return conflicts;
  }

  // ========================================
  // Pub/Sub for Real-time Updates
  // ========================================

  async subscribe(
    channel: string,
    callback: (message: unknown) => void
  ): Promise<void> {
    await this.requireSubscriber().subscribe(channel, (message: string) => {
      callback(JSON.parse(message));
    });
  }

  async publish(channel: string, message: unknown): Promise<void> {
    await this.requirePublisher().publish(channel, JSON.stringify(message));
  }

  // ========================================
  // Cache Management
  // ========================================

  async cache(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
    await this.requireClient().set(`cache:${key}`, JSON.stringify(value), {
      EX: ttlSeconds
    });
  }

  async getCached<T = unknown>(key: string): Promise<T | null> {
    const data = await this.requireClient().get(`cache:${key}`);
    return data ? (JSON.parse(data) as T) : null;
  }

  async clearCache(pattern = '*'): Promise<void> {
    const client = this.requireClient();
    const keys = await client.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await client.del(keys);
    }
  }

  // ========================================
  // Metrics & Monitoring
  // ========================================

  async incrementCounter(metric: string, value = 1): Promise<void> {
    await this.requireClient().incrBy(`metric:${metric}`, value);
  }

  async getCounter(metric: string): Promise<number> {
    const value = await this.requireClient().get(`metric:${metric}`);
    return parseInt(value ?? '', 10) || 0;
  }

  async getMetrics(): Promise<Record<string, number>> {
    const keys = await this.requireClient().keys('metric:*');
    const metrics: Record<string, number> = {};

    for (const key of keys) {
      const metricName = key.replace('metric:', '');
      metrics[metricName] = await this.getCounter(metricName);
    }

    return metrics;
  }
}

export = ContextBus;
