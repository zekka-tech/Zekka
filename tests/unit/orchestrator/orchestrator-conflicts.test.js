/**
 * Unit tests for the orchestrator's agent-loop integration and conflict machinery:
 * executeTask → AgentRunner, checkForConflicts, arbitration, and re-queue.
 *
 * The DB pool, modelClient, contextBus, and agentRunner are injected/overridden so
 * no real Postgres or model calls are made.
 */

const ZekkaOrchestrator = require('../../../src/orchestrator/orchestrator');

const silentLogger = {
  info: () => {}, warn: () => {}, error: () => {}
};

function makeOrchestrator({ agentRunner } = {}) {
  process.env.DATABASE_URL = 'postgres://test';
  const contextBus = {
    setAgentState: jest.fn().mockResolvedValue(),
    getAgentState: jest.fn().mockResolvedValue(null),
    getProjectContext: jest.fn().mockResolvedValue({ requirements: ['req A'] })
  };
  const orch = new ZekkaOrchestrator({
    contextBus,
    logger: silentLogger,
    agentRunner: agentRunner || { run: jest.fn() }
  });
  // Override the real pool + model client with mocks.
  orch.db = { query: jest.fn().mockResolvedValue({ rows: [] }) };
  orch.modelClient = { generateArbitratorResponse: jest.fn() };
  return orch;
}

describe('executeTask (AgentRunner integration)', () => {
  it('runs the agent loop and records a completed task', async () => {
    const agentRunner = {
      run: jest.fn().mockResolvedValue({
        status: 'completed', reason: 'done', steps: 3, result: { summary: 'ok' }, filesWritten: ['a.js']
      })
    };
    const orch = makeOrchestrator({ agentRunner });
    orch.db.query = jest.fn()
      .mockResolvedValueOnce({ rows: [] }) // UPDATE running
      .mockResolvedValueOnce({ rows: [{ task_id: 't1', agent_name: 'agent-1-1', stage: 3 }] }) // SELECT
      .mockResolvedValue({ rows: [] }); // subsequent updates

    const res = await orch.executeTask('t1', 'p1', { complexity: 'high', stageName: 'Development' });

    expect(res.status).toBe('completed');
    expect(agentRunner.run).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 't1', projectId: 'p1', agentName: 'agent-1-1', complexity: 'high'
    }));
    // Footprint persisted for conflict detection.
    expect(orch.contextBus.setAgentState).toHaveBeenCalledWith(
      't1', 'agent-1-1', expect.objectContaining({ filesWritten: ['a.js'] })
    );
    // Task row marked completed.
    const completedCall = orch.db.query.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('output_data')
    );
    expect(completedCall[1][0]).toBe('completed');
  });

  it('records a failed task when the agent loop does not complete', async () => {
    const agentRunner = {
      run: jest.fn().mockResolvedValue({
        status: 'max_steps', reason: 'hit cap', steps: 12, result: null, filesWritten: []
      })
    };
    const orch = makeOrchestrator({ agentRunner });
    orch.db.query = jest.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ task_id: 't1', agent_name: 'agent-1-1', stage: 3 }] })
      .mockResolvedValue({ rows: [] });

    await orch.executeTask('t1', 'p1', {});
    const completedCall = orch.db.query.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('output_data')
    );
    expect(completedCall[1][0]).toBe('failed');
  });
});

describe('checkForConflicts', () => {
  it('returns files written by more than one agent', async () => {
    const orch = makeOrchestrator();
    orch.db.query = jest.fn().mockResolvedValue({
      rows: [
        { task_id: 't1', agent_name: 'a1' },
        { task_id: 't2', agent_name: 'a2' },
        { task_id: 't3', agent_name: 'a3' }
      ]
    });
    orch.contextBus.getAgentState = jest.fn()
      .mockResolvedValueOnce({ filesWritten: ['shared.js', 'only1.js'] })
      .mockResolvedValueOnce({ filesWritten: ['shared.js'] })
      .mockResolvedValueOnce({ filesWritten: ['only3.js'] });

    const conflicts = await orch.checkForConflicts('p1', 3);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].file).toBe('shared.js');
    expect(conflicts[0].agents.map((a) => a.taskId).sort()).toEqual(['t1', 't2']);
  });

  it('returns no conflicts when footprints are disjoint', async () => {
    const orch = makeOrchestrator();
    orch.db.query = jest.fn().mockResolvedValue({
      rows: [{ task_id: 't1', agent_name: 'a1' }, { task_id: 't2', agent_name: 'a2' }]
    });
    orch.contextBus.getAgentState = jest.fn()
      .mockResolvedValueOnce({ filesWritten: ['a.js'] })
      .mockResolvedValueOnce({ filesWritten: ['b.js'] });

    expect(await orch.checkForConflicts('p1', 3)).toEqual([]);
  });
});

describe('arbitrateConflict', () => {
  const conflict = {
    file: 'shared.js',
    agents: [{ taskId: 't1', agentName: 'a1' }, { taskId: 't2', agentName: 'a2' }]
  };

  it('returns the arbitrator-chosen winner when valid', async () => {
    const orch = makeOrchestrator();
    orch.modelClient.generateArbitratorResponse = jest.fn().mockResolvedValue({
      text: 'ruling: {"winner":"t2","reason":"cleaner"}'
    });
    expect(await orch.arbitrateConflict('p1', 3, conflict)).toBe('t2');
  });

  it('falls back to the first agent when the ruling is unparseable', async () => {
    const orch = makeOrchestrator();
    orch.modelClient.generateArbitratorResponse = jest.fn().mockResolvedValue({ text: 'nope' });
    expect(await orch.arbitrateConflict('p1', 3, conflict)).toBe('t1');
  });

  it('falls back to the first agent when the winner is not a candidate', async () => {
    const orch = makeOrchestrator();
    orch.modelClient.generateArbitratorResponse = jest.fn().mockResolvedValue({
      text: '{"winner":"t99"}'
    });
    expect(await orch.arbitrateConflict('p1', 3, conflict)).toBe('t1');
  });
});

describe('resolveStageConflicts', () => {
  it('re-queues losing tasks and keeps the winner', async () => {
    const orch = makeOrchestrator();
    // checkForConflicts: 2 tasks, both wrote shared.js
    orch.db.query = jest.fn().mockImplementation((sql) => {
      if (sql.includes('SELECT task_id')) {
        return Promise.resolve({
          rows: [{ task_id: 't1', agent_name: 'a1' }, { task_id: 't2', agent_name: 'a2' }]
        });
      }
      return Promise.resolve({ rows: [] }); // UPDATE re-queue
    });
    orch.contextBus.getAgentState = jest.fn()
      .mockResolvedValueOnce({ filesWritten: ['shared.js'] })
      .mockResolvedValueOnce({ filesWritten: ['shared.js'] });
    orch.modelClient.generateArbitratorResponse = jest.fn().mockResolvedValue({
      text: '{"winner":"t1"}'
    });

    const result = await orch.resolveStageConflicts('p1', 3);
    expect(result.conflicts).toBe(1);
    expect(result.requeued).toEqual(['t2']);

    const requeueCall = orch.db.query.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes("status = 'pending'")
    );
    expect(requeueCall[1][0]).toBe('t2');
  });

  it('does nothing when there are no conflicts', async () => {
    const orch = makeOrchestrator();
    orch.db.query = jest.fn().mockResolvedValue({ rows: [] });
    const result = await orch.resolveStageConflicts('p1', 3);
    expect(result).toEqual({ conflicts: 0, requeued: [] });
    expect(orch.modelClient.generateArbitratorResponse).not.toHaveBeenCalled();
  });
});
