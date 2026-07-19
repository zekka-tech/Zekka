/**
 * Unit tests for AgentRunner - the agent loop driven by a scripted mock modelClient.
 */

const { AgentRunner } = require('../../../src/orchestrator/agent-runner');
const { ToolRegistry } = require('../../../src/orchestrator/tools/tool-registry');

const silentLogger = { info: () => {}, warn: () => {}, error: () => {} };

/** A modelClient whose replies are a scripted queue of raw strings. */
function scriptedClient(replies) {
  const queue = [...replies];
  return {
    calls: 0,
    async generateOrchestratorResponse() {
      this.calls += 1;
      const text = queue.length ? queue.shift() : '{"type":"finish","result":null}';
      return { text, model: 'mock' };
    }
  };
}

function registryWith(tool) {
  const r = new ToolRegistry({ logger: silentLogger });
  r.register(tool);
  return r;
}

const echoTool = {
  name: 'echo',
  description: 'echo',
  schema: { msg: { type: 'string', required: true } },
  run: async (args) => ({ ok: true, output: args.msg })
};

function baseTask(overrides = {}) {
  return {
    taskId: 't1', projectId: 'p1', agentName: 'agent-1', goal: 'do a thing', ...overrides
  };
}

describe('AgentRunner', () => {
  it('throws without required deps', () => {
    expect(() => new AgentRunner({})).toThrow(/modelClient/);
    expect(() => new AgentRunner({ modelClient: {} })).toThrow(/toolRegistry/);
  });

  it('runs a tool then finishes (happy path)', async () => {
    const modelClient = scriptedClient([
      '{"tool":"echo","args":{"msg":"hello"}}',
      '{"type":"finish","result":{"summary":"done"}}'
    ]);
    const runner = new AgentRunner({
      modelClient, toolRegistry: registryWith(echoTool), logger: silentLogger
    });

    const res = await runner.run(baseTask());
    expect(res.status).toBe('completed');
    expect(res.result).toEqual({ summary: 'done' });
    expect(res.steps).toBe(2);
    expect(res.memory[0].observation).toEqual({ ok: true, output: 'hello' });
  });

  it('feeds a repair hint back when a reply is unparseable', async () => {
    const modelClient = scriptedClient([
      'not json at all',
      '{"type":"finish","result":null}'
    ]);
    const runner = new AgentRunner({
      modelClient, toolRegistry: registryWith(echoTool), logger: silentLogger
    });

    const res = await runner.run(baseTask());
    expect(res.status).toBe('completed');
    expect(modelClient.calls).toBe(2);
    expect(res.memory[0]).toMatchObject({ parseError: true });
  });

  it('stops at MAX_STEPS when the model never finishes', async () => {
    // Distinct args each turn so the no-progress guard does not fire first.
    let n = 0;
    const modelClient = {
      async generateOrchestratorResponse() {
        n += 1;
        return { text: `{"tool":"echo","args":{"msg":"m${n}"}}` };
      }
    };
    const runner = new AgentRunner({
      modelClient, toolRegistry: registryWith(echoTool), logger: silentLogger, maxSteps: 4
    });

    const res = await runner.run(baseTask());
    expect(res.status).toBe('max_steps');
    expect(res.steps).toBe(4);
  });

  it('stops on no-progress when the same action repeats', async () => {
    const modelClient = {
      async generateOrchestratorResponse() {
        return { text: '{"tool":"echo","args":{"msg":"same"}}' };
      }
    };
    const runner = new AgentRunner({
      modelClient,
      toolRegistry: registryWith(echoTool),
      logger: silentLogger,
      maxSteps: 10,
      noProgressLimit: 3
    });

    const res = await runner.run(baseTask());
    expect(res.status).toBe('no_progress');
    expect(res.steps).toBe(3);
  });

  it('terminates immediately when budget is exhausted', async () => {
    const modelClient = scriptedClient(['{"type":"finish"}']);
    const tokenEconomics = {
      getBudgetStatus: jest.fn().mockResolvedValue({
        daily: { remaining: 0, percent: 120 },
        monthly: { remaining: 5, percent: 10 }
      })
    };
    const runner = new AgentRunner({
      modelClient, toolRegistry: registryWith(echoTool), tokenEconomics, logger: silentLogger
    });

    const res = await runner.run(baseTask());
    expect(res.status).toBe('budget_exhausted');
    expect(res.steps).toBe(0);
    expect(modelClient.calls).toBe(0); // never called the model
  });

  it('uses tokenEconomics.selectModel to pick the model', async () => {
    const modelClient = {
      generateOrchestratorResponse: jest.fn().mockResolvedValue({ text: '{"type":"finish"}' })
    };
    const tokenEconomics = {
      getBudgetStatus: jest.fn().mockResolvedValue({
        daily: { remaining: 10, percent: 1 }, monthly: { remaining: 10, percent: 1 }
      }),
      selectModel: jest.fn().mockResolvedValue('gemini-pro')
    };
    const runner = new AgentRunner({
      modelClient, toolRegistry: registryWith(echoTool), tokenEconomics, logger: silentLogger
    });

    await runner.run(baseTask({ complexity: 'high' }));
    expect(tokenEconomics.selectModel).toHaveBeenCalledWith('high', 'p1');
    expect(modelClient.generateOrchestratorResponse).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ model: 'gemini-pro' })
    );
  });

  it('accumulates filesWritten from tool observations', async () => {
    const writeTool = {
      name: 'write_file',
      description: 'w',
      schema: { path: { type: 'string', required: true } },
      run: async (args) => ({ ok: true, output: { path: args.path }, writes: [args.path] })
    };
    const modelClient = scriptedClient([
      '{"tool":"write_file","args":{"path":"a.js"}}',
      '{"tool":"write_file","args":{"path":"b.js"}}',
      '{"type":"finish"}'
    ]);
    const runner = new AgentRunner({
      modelClient, toolRegistry: registryWith(writeTool), logger: silentLogger
    });

    const res = await runner.run(baseTask());
    expect(res.filesWritten).toEqual(['a.js', 'b.js']);
  });

  it('persists each step to the context bus', async () => {
    const contextBus = { setAgentState: jest.fn().mockResolvedValue() };
    const modelClient = scriptedClient([
      '{"tool":"echo","args":{"msg":"x"}}',
      '{"type":"finish"}'
    ]);
    const runner = new AgentRunner({
      modelClient, toolRegistry: registryWith(echoTool), contextBus, logger: silentLogger
    });

    await runner.run(baseTask());
    expect(contextBus.setAgentState).toHaveBeenCalledWith(
      't1', 'agent-1', expect.objectContaining({ lastTool: 'echo', lastOk: true })
    );
  });

  it('fails gracefully when the model call throws', async () => {
    const modelClient = {
      generateOrchestratorResponse: jest.fn().mockRejectedValue(new Error('network down'))
    };
    const runner = new AgentRunner({
      modelClient, toolRegistry: registryWith(echoTool), logger: silentLogger
    });

    const res = await runner.run(baseTask());
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/network down/);
  });
});
