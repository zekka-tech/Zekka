/**
 * Agent Memory Service tests — persistence + scoped retrieval.
 */
jest.mock('../../../src/config/database', () => ({ pool: { query: jest.fn() } }));

const { pool } = require('../../../src/config/database');
const { AgentMemoryService } = require('../../../src/services/agent-memory.service');

let svc;
beforeEach(() => {
  jest.clearAllMocks();
  svc = new AgentMemoryService();
});

describe('remember', () => {
  it('persists a memory with clamped importance', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 'm1' }] });
    await svc.remember({ content: 'the API uses VARCHAR ids', importance: 99, agentKey: 'devin' });
    const params = pool.query.mock.calls[0][1];
    expect(pool.query.mock.calls[0][0]).toContain('INSERT INTO agent_memory');
    expect(params[6]).toBe(10); // importance clamped to max 10
  });

  it('rejects empty content', async () => {
    await expect(svc.remember({})).rejects.toThrow(/content is required/);
  });
});

describe('recall', () => {
  it('uses full-text ranking when a query is supplied', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 'm1' }] });
    await svc.recall({ agentKey: 'devin', query: 'id format', limit: 3 });
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toContain('ts_rank');
    expect(sql).toContain('plainto_tsquery');
  });

  it('falls back to recency/importance without a query and scopes by agent', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    await svc.recall({ agentKey: 'devin' });
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toContain('ORDER BY importance DESC');
    expect(sql).toContain('agent_key = $1 OR agent_key IS NULL');
  });
});
