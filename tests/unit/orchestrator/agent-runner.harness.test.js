/**
 * AgentRunner harness-integration tests: streamed events + cross-run memory.
 */
const { AgentRunner } = require('../../../src/orchestrator/agent-runner');
const { ToolRegistry } = require('../../../src/orchestrator/tools/tool-registry');

const silentLogger = { info: () => {}, warn: () => {}, error: () => {} };

function scriptedClient(replies) {
  const queue = [...replies];
  return {
    async generateOrchestratorResponse() {
      const text = queue.length ? queue.shift() : '{"type":"finish","result":null}';
      return { text, model: 'mock' };
    }
  };
}

const echoTool = {
  name: 'echo',
  description: 'echo',
  schema: { msg: { type: 'string', required: true } },
  async run(args) { return { ok: true, output: args.msg, writes: ['f.txt'] }; }
};

function registryWith(tool) {
  const r = new ToolRegistry({ logger: silentLogger });
  r.register(tool);
  return r;
}

describe('AgentRunner event streaming', () => {
  it('emits plan/act/observe/terminal events in order', async () => {
    const events = [];
    const runner = new AgentRunner({
      modelClient: scriptedClient([
        '{"type":"tool","tool":"echo","args":{"msg":"hi"}}',
        '{"type":"finish","result":"done"}'
      ]),
      toolRegistry: registryWith(echoTool),
      logger: silentLogger,
      onEvent: (e) => { events.push(e.type); }
    });

    const result = await runner.run({ taskId: 't1', agentName: 'a', goal: 'g' });

    expect(result.status).toBe('completed');
    expect(events).toEqual(['plan', 'act', 'observe', 'plan', 'terminal']);
  });

  it('recalls memory at start and persists a summary on finish', async () => {
    const memoryStore = {
      recall: jest.fn().mockResolvedValue([{ content: 'prior fact' }]),
      remember: jest.fn().mockResolvedValue({})
    };
    const runner = new AgentRunner({
      modelClient: scriptedClient(['{"type":"finish","result":"ok"}']),
      toolRegistry: registryWith(echoTool),
      logger: silentLogger,
      memoryStore
    });

    await runner.run({
      taskId: 't2', agentName: 'devin', agentKey: 'devin', goal: 'build it', projectId: 'p1'
    });

    expect(memoryStore.recall).toHaveBeenCalledWith(
      expect.objectContaining({ agentKey: 'devin', query: 'build it' })
    );
    expect(memoryStore.remember).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'summary', agentKey: 'devin', projectId: 'p1' })
    );
  });

  it('does not break when no hooks are provided (backward compatible)', async () => {
    const runner = new AgentRunner({
      modelClient: scriptedClient(['{"type":"finish","result":null}']),
      toolRegistry: registryWith(echoTool),
      logger: silentLogger
    });
    const result = await runner.run({ taskId: 't3', agentName: 'a', goal: 'g' });
    expect(result.status).toBe('completed');
  });
});
