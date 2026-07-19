/**
 * ToolRegistry - registry, validation, and dispatch for agent tools.
 *
 * A tool is a plain object:
 *   {
 *     name: string,
 *     description: string,
 *     schema: { <argName>: { type: 'string'|'number'|'boolean'|'array'|'object',
 *                            required?: boolean } },
 *     run: async (args, ctx) => any
 *   }
 *
 * The registry validates `args` against `schema` before dispatch (so a malformed
 * model action becomes a structured error the agent can recover from, never a
 * thrown exception that kills the loop) and exposes `describe()` to render the
 * tool catalogue into the agent prompt.
 *
 * @module orchestrator/tools/tool-registry
 */

const VALID_TYPES = new Set(['string', 'number', 'boolean', 'array', 'object']);

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

class ToolRegistry {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.tools = new Map();
  }

  /**
   * Register a tool. Throws on a malformed definition or duplicate name.
   * @param {Object} tool
   * @returns {ToolRegistry} this (chainable)
   */
  register(tool) {
    if (!tool || typeof tool.name !== 'string' || tool.name.trim() === '') {
      throw new Error('tool.name is required');
    }
    if (typeof tool.run !== 'function') {
      throw new Error(`tool "${tool.name}" must define a run() function`);
    }
    if (this.tools.has(tool.name)) {
      throw new Error(`tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, {
      name: tool.name,
      description: tool.description || '',
      schema: tool.schema || {},
      run: tool.run
    });
    return this;
  }

  /** @param {string} name @returns {boolean} */
  has(name) {
    return this.tools.has(name);
  }

  /** @returns {string[]} registered tool names */
  names() {
    return [...this.tools.keys()];
  }

  /**
   * Machine-readable tool catalogue for prompt construction.
   * @returns {Array<{name: string, description: string, schema: Object}>}
   */
  describe() {
    return [...this.tools.values()].map(({ name, description, schema }) => ({
      name,
      description,
      schema
    }));
  }

  /**
   * Validate args against a tool's schema.
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateArgs(schema, args) {
    const errors = [];
    const provided = args && typeof args === 'object' ? args : {};

    for (const [key, spec] of Object.entries(schema)) {
      const has = Object.prototype.hasOwnProperty.call(provided, key)
        && provided[key] !== undefined
        && provided[key] !== null;

      if (spec.required && !has) {
        errors.push(`missing required arg "${key}"`);
        continue;
      }
      if (has && spec.type && VALID_TYPES.has(spec.type)) {
        const actual = typeOf(provided[key]);
        if (actual !== spec.type) {
          errors.push(`arg "${key}" must be ${spec.type}, got ${actual}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate + dispatch a tool call. Never throws for expected failures; returns
   * a structured observation the agent loop can feed back to the model.
   *
   * @param {string} name
   * @param {Object} args
   * @param {Object} ctx - Execution context passed to the tool (workspaceRoot, etc.)
   * @returns {Promise<{ ok: boolean, output?: *, error?: string, writes?: string[] }>}
   */
  async invoke(name, args, ctx = {}) {
    const tool = this.tools.get(name);
    if (!tool) {
      return { ok: false, error: `unknown tool "${name}"` };
    }

    const { valid, errors } = this.validateArgs(tool.schema, args);
    if (!valid) {
      return { ok: false, error: `invalid args: ${errors.join('; ')}` };
    }

    try {
      const result = await tool.run(args || {}, ctx);
      // A tool may return a fully-formed observation ({ ok, ... }) or a raw value.
      if (result && typeof result === 'object' && typeof result.ok === 'boolean') {
        return result;
      }
      return { ok: true, output: result };
    } catch (err) {
      this.logger.warn(`tool "${name}" threw: ${err.message}`);
      return { ok: false, error: err.message };
    }
  }
}

module.exports = { ToolRegistry };
