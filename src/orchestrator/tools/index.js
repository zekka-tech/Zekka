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
const { webFetchTool } = require('./web-fetch.tool');
const { dbIntrospectTool } = require('./db-introspect.tool');
const { packageInstallTool } = require('./package-install.tool');
const { browserTool } = require('./browser.tool');
const { codeExecTool } = require('./code-exec.tool');

/**
 * @param {Object} [options]
 * @param {Object} [options.logger]
 * @param {boolean} [options.includeWrite=false] - Also register write_file + git.
 * @param {boolean} [options.includeExtended=false] - Also register the extended
 *   tool surface: web_fetch (read-only), db_introspect (read-only), and
 *   package_install (write — gated with the write tools).
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
  if (options.includeExtended) {
    // Read-only extended tools are always safe to expose.
    registry.register(webFetchTool);
    registry.register(dbIntrospectTool);
    registry.register(browserTool); // read-only by default (fetch-based)
    // Mutating / powerful tools only alongside the write set.
    if (options.includeWrite) {
      registry.register(packageInstallTool);
      registry.register(codeExecTool); // secure-by-default (needs a sandbox)
    }
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
  gitTool,
  webFetchTool,
  dbIntrospectTool,
  packageInstallTool,
  browserTool,
  codeExecTool
};
