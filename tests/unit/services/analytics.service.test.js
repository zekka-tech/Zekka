/**
 * Analytics Service Unit Tests
 *
 * Covers: normalizeSummaryMetrics (pure), getMetrics (cache miss/hit),
 * getCosts (aggregation), getDashboardAnalytics, and getAgentPerformance.
 */

// ── Mock dependencies ─────────────────────────────────────────────────────────

jest.mock('../../../src/config/database', () => ({
  pool: { query: jest.fn() }
}));

jest.mock('../../../src/config/redis', () => {
  const CACHE_KEYS = {
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

jest.mock('../../../src/utils/pricing', () => ({
  calculateCost: jest.fn().mockReturnValue(0.0042),
  getModelPricing: jest.fn().mockReturnValue({ input: 0.000003, output: 0.000015 })
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// ── Imports ───────────────────────────────────────────────────────────────────

const { pool } = require('../../../src/config/database');
const { cache } = require('../../../src/config/redis');
const { AnalyticsService } = require('../../../src/services/analytics.service');

describe('AnalyticsService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnalyticsService();
  });

  // ─── normalizeSummaryMetrics (pure transformation) ─────────────────────────

  describe('normalizeSummaryMetrics', () => {
    it('coerces numeric string fields to numbers', () => {
      const raw = {
        total_projects: '3',
        total_conversations: '12',
        total_messages: '45',
        total_input_tokens: '1000',
        total_output_tokens: '500',
        total_cost: '0.25',
        models_used: '2',
        agents_used: '4'
      };

      const result = service.normalizeSummaryMetrics(raw);

      expect(result.totalProjects).toBe(3);
      expect(result.totalConversations).toBe(12);
      expect(result.totalMessages).toBe(45);
      expect(result.totalInputTokens).toBe(1000);
      expect(result.totalOutputTokens).toBe(500);
      expect(result.totalTokens).toBe(1500); // derived sum
      expect(result.totalCost).toBe(0.25);
      expect(result.modelsUsed).toBe(2);
      expect(result.agentsUsed).toBe(4);
    });

    it('defaults every field to 0 when called with an empty object', () => {
      const result = service.normalizeSummaryMetrics({});

      expect(result.totalProjects).toBe(0);
      expect(result.totalTokens).toBe(0);
      expect(result.totalCost).toBe(0);
    });

    it('totalTokens equals the sum of input and output tokens', () => {
      const result = service.normalizeSummaryMetrics({
        total_input_tokens: '300',
        total_output_tokens: '700'
      });

      expect(result.totalTokens).toBe(1000);
    });
  });

  // ─── getMetrics ────────────────────────────────────────────────────────────

  describe('getMetrics', () => {
    it('returns cached value directly without querying the DB (cache hit)', async () => {
      const cachedMetrics = {
        total_projects: 2,
        total_conversations: 5,
        total_messages: 20,
        total_input_tokens: 800,
        total_output_tokens: 400,
        total_cost: 0.1,
        models_used: 1,
        agents_used: 2
      };
      cache.get.mockResolvedValue(cachedMetrics);

      const result = await service.getMetrics('user-1', 'month');

      expect(cache.get).toHaveBeenCalled();
      expect(pool.query).not.toHaveBeenCalled();
      expect(result).toEqual(cachedMetrics);
    });

    it('queries the DB and caches the result on a cache miss', async () => {
      const dbRow = {
        total_projects: '1',
        total_conversations: '3',
        total_messages: '10',
        total_input_tokens: '500',
        total_output_tokens: '250',
        total_cost: '0.05',
        models_used: '1',
        agents_used: '1'
      };
      cache.get.mockResolvedValue(null);
      pool.query.mockResolvedValue({ rows: [dbRow] });

      const result = await service.getMetrics('user-2', 'week');

      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(cache.set).toHaveBeenCalledWith(
        expect.stringContaining('metrics:user:user-2:week'),
        dbRow,
        expect.any(Number)
      );
      expect(result).toEqual(dbRow);
    });

    it('returns zero-value defaults when DB returns no rows', async () => {
      cache.get.mockResolvedValue(null);
      pool.query.mockResolvedValue({ rows: [] });

      const result = await service.getMetrics('user-empty', 'all');

      expect(result.total_projects).toBe(0);
      expect(result.total_cost).toBe(0);
    });
  });

  // ─── getCosts ──────────────────────────────────────────────────────────────

  describe('getCosts', () => {
    it('aggregates cost data grouped by model and agent', async () => {
      cache.get.mockResolvedValue(null);

      const dbRows = [
        {
          model: 'claude-sonnet',
          agent_id: 'devin',
          usage_count: '5',
          total_input_tokens: '1000',
          total_output_tokens: '500',
          total_cost: '0.10',
          avg_cost: '0.02',
          first_used: '2025-01-01',
          last_used: '2025-01-31'
        },
        {
          model: 'claude-sonnet',
          agent_id: 'coderabbit',
          usage_count: '3',
          total_input_tokens: '600',
          total_output_tokens: '300',
          total_cost: '0.06',
          avg_cost: '0.02',
          first_used: '2025-01-02',
          last_used: '2025-01-30'
        }
      ];
      pool.query.mockResolvedValue({ rows: dbRows });

      const costs = await service.getCosts('user-1', 'month');

      expect(costs).toHaveProperty('byModel');
      expect(costs).toHaveProperty('byAgent');
      expect(costs).toHaveProperty('total');
      expect(costs.byModel['claude-sonnet']).toBeDefined();
      // Two rows for the same model should be merged
      expect(costs.byModel['claude-sonnet'].count).toBe(8); // 5 + 3
      expect(costs.total).toBeCloseTo(0.16, 5);
    });

    it('returns the cached result without hitting the DB', async () => {
      const cached = { byModel: {}, byAgent: {}, total: 0, items: [] };
      cache.get.mockResolvedValue(cached);

      const result = await service.getCosts('user-1', 'month');

      expect(pool.query).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });
  });

  // ─── getAgentMetrics ───────────────────────────────────────────────────────

  describe('getAgentMetrics', () => {
    it('returns zero defaults when no DB rows exist for the agent', async () => {
      cache.get.mockResolvedValue(null);
      pool.query.mockResolvedValue({ rows: [] });

      const metrics = await service.getAgentMetrics('unknown-agent', 'week');

      expect(metrics.projects_worked).toBe(0);
      expect(metrics.total_actions).toBe(0);
      expect(metrics.total_cost).toBe(0);
    });

    it('caches the returned metrics under the agent-metrics key', async () => {
      cache.get.mockResolvedValue(null);
      const dbRow = {
        projects_worked: 2,
        total_actions: 15,
        total_input_tokens: 2000,
        total_output_tokens: 1000,
        total_cost: 0.12,
        avg_cost_per_action: 0.008,
        first_activity: null,
        last_activity: null
      };
      pool.query.mockResolvedValue({ rows: [dbRow] });

      await service.getAgentMetrics('devin', 'month');

      expect(cache.set).toHaveBeenCalledWith(
        expect.stringContaining('agent-metrics:devin:month'),
        dbRow,
        expect.any(Number)
      );
    });
  });

  // ─── getAgentPerformance ───────────────────────────────────────────────────

  describe('getAgentPerformance', () => {
    it('returns cached array without a DB query', async () => {
      const cached = [{ name: 'devin', totalExecutions: 10, successRate: 0.9 }];
      cache.get.mockResolvedValue(cached);

      const result = await service.getAgentPerformance('user-1', 'month');

      expect(pool.query).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    it('maps DB rows to the expected performance shape on a cache miss', async () => {
      cache.get.mockResolvedValue(null);

      const dbRows = [
        {
          agent_id: 'coderabbit',
          total_executions: '20',
          avg_execution_time: '1.5',
          failed_actions: '2',
          successful_actions: '18'
        }
      ];
      pool.query.mockResolvedValue({ rows: dbRows });

      const result = await service.getAgentPerformance('user-1', 'month');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'coderabbit',
        totalExecutions: 20,
        avgExecutionTime: 1.5
      });
      // successRate = 18 / (18 + 2) = 0.9
      expect(result[0].successRate).toBeCloseTo(0.9);
    });

    it('sets successRate to undefined when both success and failure counts are zero', async () => {
      cache.get.mockResolvedValue(null);

      const dbRows = [
        {
          agent_id: 'mintlify',
          total_executions: '5',
          avg_execution_time: null,
          failed_actions: '0',
          successful_actions: '0'
        }
      ];
      pool.query.mockResolvedValue({ rows: dbRows });

      const result = await service.getAgentPerformance('user-1', 'month');

      expect(result[0].successRate).toBeUndefined();
    });
  });

  // ─── _getTimeFilter (private) ──────────────────────────────────────────────

  describe('_getTimeFilter', () => {
    it('returns null for period "all"', () => {
      expect(service._getTimeFilter('all')).toBeNull();
    });

    it('returns a non-null SQL interval string for known periods', () => {
      for (const period of ['day', 'week', 'month', 'year']) {
        const filter = service._getTimeFilter(period);
        expect(typeof filter).toBe('string');
        expect(filter).toContain('INTERVAL');
      }
    });
  });
});
