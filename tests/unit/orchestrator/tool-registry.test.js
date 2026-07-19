/**
 * Unit tests for ToolRegistry - registration, arg validation, and safe dispatch.
 */

const { ToolRegistry } = require('../../../src/orchestrator/tools/tool-registry');

const silentLogger = { warn: () => {}, info: () => {}, error: () => {} };

function makeTool(overrides = {}) {
  return {
    name: 'echo',
    description: 'echoes',
    schema: { msg: { type: 'string', required: true } },
    run: async (args) => ({ ok: true, output: args.msg }),
    ...overrides
  };
}

describe('ToolRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new ToolRegistry({ logger: silentLogger });
  });

  describe('register', () => {
    it('registers a valid tool and reports it', () => {
      registry.register(makeTool());
      expect(registry.has('echo')).toBe(true);
      expect(registry.names()).toEqual(['echo']);
    });

    it('rejects a tool with no name or run()', () => {
      expect(() => registry.register({ run: () => {} })).toThrow(/name is required/);
      expect(() => registry.register({ name: 'x' })).toThrow(/run\(\)/);
    });

    it('rejects duplicate registration', () => {
      registry.register(makeTool());
      expect(() => registry.register(makeTool())).toThrow(/already registered/);
    });
  });

  describe('catalogue via describe()', () => {
    it('returns name/description/schema for prompt building', () => {
      registry.register(makeTool());
      expect(registry.describe()).toEqual([
        { name: 'echo', description: 'echoes', schema: { msg: { type: 'string', required: true } } }
      ]);
    });
  });

  describe('validateArgs', () => {
    it('flags a missing required arg', () => {
      const { valid, errors } = registry.validateArgs({ p: { type: 'string', required: true } }, {});
      expect(valid).toBe(false);
      expect(errors[0]).toMatch(/missing required arg "p"/);
    });

    it('flags a wrong type', () => {
      const { valid, errors } = registry.validateArgs({ n: { type: 'number' } }, { n: 'x' });
      expect(valid).toBe(false);
      expect(errors[0]).toMatch(/must be number, got string/);
    });

    it('accepts valid args and treats optional missing as valid', () => {
      const schema = { a: { type: 'string', required: true }, b: { type: 'number' } };
      expect(registry.validateArgs(schema, { a: 'x' }).valid).toBe(true);
    });
  });

  describe('invoke', () => {
    it('returns structured error for unknown tool', async () => {
      const res = await registry.invoke('nope', {});
      expect(res).toEqual({ ok: false, error: 'unknown tool "nope"' });
    });

    it('returns structured error for invalid args (never throws)', async () => {
      registry.register(makeTool());
      const res = await registry.invoke('echo', {});
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/invalid args/);
    });

    it('dispatches and returns the tool observation', async () => {
      registry.register(makeTool());
      const res = await registry.invoke('echo', { msg: 'hi' });
      expect(res).toEqual({ ok: true, output: 'hi' });
    });

    it('wraps a raw return value into { ok: true, output }', async () => {
      registry.register(makeTool({ name: 'raw', schema: {}, run: async () => 42 }));
      expect(await registry.invoke('raw', {})).toEqual({ ok: true, output: 42 });
    });

    it('converts a thrown error into a structured failure', async () => {
      registry.register(makeTool({
        name: 'boom', schema: {}, run: async () => { throw new Error('kaboom'); }
      }));
      expect(await registry.invoke('boom', {})).toEqual({ ok: false, error: 'kaboom' });
    });
  });
});
