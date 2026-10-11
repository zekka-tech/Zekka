/**
 * Agent Registry Service Unit Tests
 * Covers built-in seeding (idempotency), scope-aware resolution, and versioning.
 */
jest.mock('../../../src/config/database', () => ({
  pool: { query: jest.fn() }
}));
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn()
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('../../../src/config/database');
import {
  AgentRegistryService,
  BUILTIN_AGENTS
} from '../../../src/services/agent-registry.service';

const poolQuery = db.pool.query as jest.Mock;
const TENANT = 'a1b2c3d4-0000-0000-0000-000000000011';

let service: AgentRegistryService;

beforeEach(() => {
  jest.clearAllMocks();
  service = new AgentRegistryService();
});

describe('seedBuiltins', () => {
  it('inserts each built-in agent once and reports the count', async () => {
    poolQuery.mockResolvedValue({ rowCount: 1 });
    const inserted = await service.seedBuiltins();
    expect(inserted).toBe(BUILTIN_AGENTS.length);
    expect(poolQuery).toHaveBeenCalledTimes(BUILTIN_AGENTS.length);
    // Seeding uses a guarded INSERT ... WHERE NOT EXISTS (idempotent).
    expect(poolQuery.mock.calls[0]![0]).toContain('WHERE NOT EXISTS');
  });

  it('is a no-op count when all agents already exist', async () => {
    poolQuery.mockResolvedValue({ rowCount: 0 });
    const inserted = await service.seedBuiltins();
    expect(inserted).toBe(0);
  });
});

describe('getAgent', () => {
  it('prefers a tenant-scoped definition over the global one', async () => {
    poolQuery.mockResolvedValue({
      rows: [{
        id: 'x', agent_key: 'devin', version: 2, name: 'Devin', tier: 3,
        description: null, capabilities: '[]', system_prompt: null,
        tools: '["read_file"]', model: null, is_builtin: false,
        is_active: true, tenant_id: TENANT
      }]
    });
    const agent = await service.getAgent('devin', TENANT);
    expect(agent?.tenant_id).toBe(TENANT);
    expect(agent?.tools).toEqual(['read_file']);
    // scope-preference ordering is expressed in SQL
    expect(poolQuery.mock.calls[0]![0]).toContain('tenant_id = $2) DESC');
  });

  it('returns null when nothing matches', async () => {
    poolQuery.mockResolvedValue({ rows: [] });
    expect(await service.getAgent('nope')).toBeNull();
  });
});

describe('registerAgent', () => {
  it('assigns the next version in scope and persists tools as JSON', async () => {
    poolQuery
      .mockResolvedValueOnce({ rows: [{ next: 3 }] }) // version lookup
      .mockResolvedValueOnce({
        rows: [{
          id: 'y', agent_key: 'custom', version: 3, name: 'Custom', tier: 2,
          description: null, capabilities: '[]', system_prompt: null,
          tools: '[]', model: null, is_builtin: false, is_active: true,
          tenant_id: TENANT
        }]
      });

    const agent = await service.registerAgent(
      { agentKey: 'custom', name: 'Custom' },
      TENANT
    );
    expect(agent.version).toBe(3);
    const insertParams = poolQuery.mock.calls[1]![1] as unknown[];
    expect(insertParams[1]).toBe(3); // version
    expect(insertParams[9]).toBe(TENANT); // tenant scope
  });

  it('rejects a registration missing required fields', async () => {
    await expect(
      service.registerAgent({ agentKey: '', name: '' } as never)
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
