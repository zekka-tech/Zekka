/**
 * search_code tool - recursively grep the workspace for a regex pattern.
 *
 * Pure-Node implementation (no ripgrep dependency) so it is deterministic and
 * hermetically testable. Skips VCS/dependency/build dirs and binary-ish files.
 *
 * @module orchestrator/tools/search-code.tool
 */

const fs = require('fs/promises');
const path = require('path');
const { resolveInWorkspace } = require('./workspace');

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.cache'
]);
const DEFAULT_MAX_RESULTS = 100;
const MAX_FILE_BYTES = 512 * 1024;

async function walk(dir, onFile) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(full, onFile);
    } else if (entry.isFile()) {
      await onFile(full);
    }
  }
}

const searchCodeTool = {
  name: 'search_code',
  description:
    'Search the workspace for a regular expression. args: { query: string (regex), '
    + 'maxResults?: number }. Returns matches as { file, line, text }.',
  schema: {
    query: { type: 'string', required: true },
    maxResults: { type: 'number', required: false }
  },

  async run(args, ctx = {}) {
    const root = resolveInWorkspace(ctx.workspaceRoot, '.');
    const maxResults = Number.isFinite(args.maxResults) && args.maxResults > 0
      ? Math.floor(args.maxResults)
      : DEFAULT_MAX_RESULTS;

    let regex;
    try {
      regex = new RegExp(args.query);
    } catch (err) {
      return { ok: false, error: `invalid regex: ${err.message}` };
    }

    const matches = [];
    let truncated = false;
    const NUL = String.fromCharCode(0);

    await walk(root, async (full) => {
      if (truncated) return;
      let stat;
      try {
        stat = await fs.stat(full);
      } catch {
        return;
      }
      if (stat.size > MAX_FILE_BYTES) return;

      let content;
      try {
        content = await fs.readFile(full, 'utf8');
      } catch {
        return; // unreadable
      }
      if (content.includes(NUL)) return; // binary

      const rel = path.relative(root, full);
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        if (regex.test(lines[i])) {
          matches.push({ file: rel, line: i + 1, text: lines[i].slice(0, 400) });
          if (matches.length >= maxResults) {
            truncated = true;
            break;
          }
        }
      }
    });

    return {
      ok: true,
      output: { query: args.query, count: matches.length, truncated, matches }
    };
  }
};

module.exports = { searchCodeTool };
