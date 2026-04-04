/**
 * Agent Service Unit Tests
 *
 * Tests for AgentService: status reads/writes via Redis cache,
 * activity logging via pool.query, task lifecycle, and metrics.
 */

jest.mock('../../../src/config/database', () => ({
  pool: { query: jest.fn() }
}));

jest.mock('../../../src/config/redis', () => {
  const CACHE_KEYS = {
    AGENT_STATUS: (agentId) => `zekka:agent:${agentId}:status`,
    CACHE: (key) => `zekka:cache:${key}`
  };

  const TTL = { SHORT: 300, MEDIUM: 1800 };

  const cache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    clearByPattern: jest.fn()
  };

  return { cache, CACHE_KEYS, TTL };
});

const { pool } = require('../../../src/config/database');
const { cache, CACHE_KEYS, TTL } = require('../../../src/config/redis');
const { AgentService, AGENT_DEFINITIONS } = require('../../../src/services/agent.service');

describe('AgentService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AgentService();
  });

  // ─── getAgentStatus ────────────────────────────────────────────────────────

  describe('getAgentStatus', () => {
    it('returns status string from cache when present', async () => {
      cache.get.mockResolvedValue('busy');

      const result = await service.getAgentStatus('pydantic-ai');

      expect(cache.get).toHaveBeenCalledWith(
        CACHE_KEYS.AGENT_STATUS('pydantic-ai'),
        false
      );
      expect(result).toBe('busy');
    });

    it('returns "idle" when cache has no entry for the agent', async () => {
      cache.get.mockResolvedValue(null);

      const result = await service.getAgentStatus('agent-zero');

      expect(result).toBe('idle');
    });
  });

  // ─── updateAgentStatus ─────────────────────────────────────────────────────

  describe('updateAgentStatus', () => {
    it('writes serialised status data to cache with MEDIUM TTL', async () => {
      cache.set.mockResolvedValue(true);
      // logActivity calls pool.query internally; give it a minimal stub
      pool.query.mockResolvedValue({ rows: [{ id: 'act-1' }] });
      // getAgentStatus is called inside logActivity path
      cache.get.mockResolvedValue('idle');

      const result = await service.updateAgentStatus('auto-agent', 'working', {
        task: 'build'
      });

      expect(cache.set).toHaveBeenCalledWith(
        CACHE_KEYS.AGENT_STATUS('auto-agent'),
        expect.stringContaining('"status":"working"'),
        TTL.MEDIUM
      );
      expect(result).toMatchObject({
        success: true,
        agentId: 'auto-agent',
        status: 'working'
      });
    });

    it('throws an error for an invalid status value', async () => {
      await expect(
        service.updateAgentStatus('auto-agent', 'flying')
      ).rejects.toThrow('Invalid status: flying');
    });

    it('accepts every member of the valid-status list without throwing', async () => {
      cache.set.mockResolvedValue(true);
      cache.get.mockResolvedValue('idle');
      pool.query.mockResolvedValue({ rows: [{ id: 'act-x' }] });

      const validStatuses = ['idle', 'busy', 'working', 'error', 'offline', 'paused'];
      for (const status of validStatuses) {
        await expect(
          service.updateAgentStatus('pydantic-ai', status)
        ).resolves.toMatchObject({ status });
      }
    });
  });

  // ─── listAgents ────────────────────────────────────────────────────────────

  describe('listAgents', () => {
    it('returns an array with one entry per AGENT_DEFINITION key', async () => {
      cache.get.mockResolvedValue(null); // status = 'idle' for all
      pool.query.mockResolvedValue({ rows: [] }); // no last-activity rows

      const agents = await service.listAgents();

      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBe(Object.keys(AGENT_DEFINITIONS).length);
    });

    it('each agent entry contains agentId, name, tier, and status fields', async () => {
      cache.get.mockResolvedValue(null);
      pool.query.mockResolvedValue({ rows: [] });

      const agents = await service.listAgents();

      for (const agent of agents) {
        expect(agent).toHaveProperty('agentId');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('tier');
        expect(agent).toHaveProperty('status');
      }
    });

    it('uses "idle" as the default status when the cache returns null', async () => {
      cache.get.mockResolvedValue(null);
      pool.query.mockResolvedValue({ rows: [] });

      const agents = await service.listAgents();

      expect(agents.every((a) => a.status === 'idle')).toBe(true);
    });
  });

  // ─── getAgent ──────────────────────────────────────────────────────────────

  describe('getAgent', () => {
    it('returns null for an unrecognised agent id', async () => {
      const result = await service.getAgent('does-not-exist');
      expect(result).toBeNull();
    });

    it('returns enriched agent object for a known id', async () => {
      cache.get.mockResolvedValue('busy');
      pool.query.mockResolvedValue({
        rows: [{ timestamp: '2025-01-01T00:00:00Z', projects: 3, actions: 10 }]
      });

      const result = await service.getAgent('pydantic-ai');

      expect(result).toMatchObject({
        agentId: 'pydantic-ai',
        name: 'Pydantic AI',
        tier: 1,
        status: 'busy'
      });
      expect(result).toHaveProperty('metrics');
    });
  });

  // ─── logActivity ───────────────────────────────────────────────────────────

  describe('logActivity', () => {
    it('calls pool.query with agentId, action, and JSON-serialised metadata', async () => {
      const fakeRow = { id: 'activity-99', agent_id: 'devin', action: 'task_started' };
      pool.query.mockResolvedValue({ rows: [fakeRow] });

      const meta = { taskId: 'task-1', projectId: 'proj-2' };
      const result = await service.logActivity('devin', 'task_started', meta, 'proj-2');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO agent_activities'),
        expect.arrayContaining(['devin', 'proj-2', 'task_started', JSON.stringify(meta)])
      );
      expect(result).toEqual(fakeRow);
    });
  });

  // ─── createTask ────────────────────────────────────────────────────────────

  describe('createTask', () => {
    it('inserts a task row and returns it, then logs activity', async () => {
      const fakeTask = {
        id: 'task-42',
        agent_id: 'windsurf',
        project_id: 'proj-7',
        description: 'Build something',
        priority: 'high',
        status: 'pending'
      };

      // First call: INSERT into agent_tasks; subsequent calls: logActivity inserts
      pool.query
        .mockResolvedValueOnce({ rows: [fakeTask] })
        .mockResolvedValue({ rows: [{ id: 'act-new' }] });

      cache.get.mockResolvedValue('idle');
      cache.set.mockResolvedValue(true);

      const result = await service.createTask('windsurf', 'proj-7', {
        description: 'Build something',
        priority: 'high'
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO agent_tasks'),
        expect.arrayContaining(['windsurf', 'proj-7', 'Build something', 'high'])
      );
      expect(result).toMatchObject({ id: 'task-42', status: 'pending' });
    });

    it('throws for an invalid task status in updateTaskStatus', async () => {
      await expect(service.updateTaskStatus(1, 'flying')).rejects.toThrow(
        'Invalid task status: flying'
      );
    });
  });

  // ─── getAgentMetrics ───────────────────────────────────────────────────────

  describe('getAgentMetrics', () => {
    it('returns zero-value defaults when no activity rows exist', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const metrics = await service.getAgentMetrics('mintlify', 'month');

      expect(metrics).toMatchObject({
        projects_worked: 0,
        total_actions: 0,
        tasks_completed: 0,
        tasks_failed: 0
      });
    });

    it('returns the first DB row when activity data is present', async () => {
      const fakeMetrics = {
        projects_worked: 3,
        total_actions: 42,
        tasks_completed: 10,
        tasks_failed: 1,
        tasks_pending: 2
      };
      pool.query.mockResolvedValue({ rows: [fakeMetrics] });

      const metrics = await service.getAgentMetrics('devin', 'week');

      expect(metrics).toMatchObject(fakeMetrics);
    });
  });
});
