/**
 * Tool wiring for the agent loop.
 *
 * `createDefaultRegistry` builds a ToolRegistry with the read-only tools that are
 * always safe to expose. Write tools (write_file, git) are additive and gated
 * behind the conflict-resolution machinery — pass `{ includeWrite: true }` to add
 * them once the caller has conflict detection in place.
 *
 * @module orchestrator/tools
 */

const { ToolRegistry } = require('./tool-registry');
const { readFileTool } = require('./read-file.tool');
const { searchCodeTool } = require('./search-code.tool');
const { runTestsTool } = require('./run-tests.tool');
const { writeFileTool } = require('./write-file.tool');
const { gitTool } = require('./git.tool');

/**
 * @param {Object} [options]
 * @param {Object} [options.logger]
 * @param {boolean} [options.includeWrite=false] - Also register write_file + git.
 * @returns {ToolRegistry}
 */
function createDefaultRegistry(options = {}) {
  const registry = new ToolRegistry({ logger: options.logger });
  registry.register(readFileTool);
  registry.register(searchCodeTool);
  registry.register(runTestsTool);
  if (options.includeWrite) {
    registry.register(writeFileTool);
    registry.register(gitTool);
  }
  return registry;
}

module.exports = {
  ToolRegistry,
  createDefaultRegistry,
  readFileTool,
  searchCodeTool,
  runTestsTool,
  writeFileTool,
  gitTool
};
