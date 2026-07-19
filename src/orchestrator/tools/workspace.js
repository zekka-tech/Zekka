/**
 * Workspace sandboxing helpers for agent tools.
 *
 * Agent tools operate on files, and the arguments come from model output, so
 * every path must be confined to a workspace root. `resolveInWorkspace` resolves
 * a candidate path and throws if it escapes the root (via `..`, absolute paths,
 * or symlink-style traversal in the literal path).
 *
 * @module orchestrator/tools/workspace
 */

const path = require('path');

/**
 * Resolve a user/model-supplied path against the workspace root, guaranteeing the
 * result stays inside the root.
 *
 * @param {string} workspaceRoot - Absolute path to the sandbox root.
 * @param {string} candidate - Relative (or absolute) path from tool args.
 * @returns {string} Absolute, normalized path guaranteed to be within the root.
 * @throws {Error} If the resolved path escapes the workspace root.
 */
function resolveInWorkspace(workspaceRoot, candidate) {
  if (typeof workspaceRoot !== 'string' || workspaceRoot.trim() === '') {
    throw new Error('workspaceRoot is required');
  }
  if (typeof candidate !== 'string' || candidate.trim() === '') {
    throw new Error('path is required');
  }

  const root = path.resolve(workspaceRoot);
  // Treat the candidate as always relative to the root: strip a leading slash so
  // an absolute-looking arg ("/etc/passwd") cannot escape the sandbox.
  const relative = candidate.replace(/^[/\\]+/, '');
  const resolved = path.resolve(root, relative);

  const withSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(withSep)) {
    throw new Error(`path escapes workspace: ${candidate}`);
  }

  return resolved;
}

module.exports = { resolveInWorkspace };
