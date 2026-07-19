/**
 * read_file tool - read a UTF-8 text file from within the workspace sandbox.
 *
 * @module orchestrator/tools/read-file.tool
 */

const fs = require('fs/promises');
const { resolveInWorkspace } = require('./workspace');

const DEFAULT_MAX_BYTES = 100 * 1024; // 100 KB guard against dumping huge files into context

const readFileTool = {
  name: 'read_file',
  description:
    'Read a UTF-8 text file. args: { path: string (relative to workspace), '
    + 'maxBytes?: number }. Returns file content (truncated to maxBytes).',
  schema: {
    path: { type: 'string', required: true },
    maxBytes: { type: 'number', required: false }
  },

  async run(args, ctx = {}) {
    const abs = resolveInWorkspace(ctx.workspaceRoot, args.path);
    const maxBytes = Number.isFinite(args.maxBytes) && args.maxBytes > 0
      ? Math.floor(args.maxBytes)
      : DEFAULT_MAX_BYTES;

    const buf = await fs.readFile(abs);
    const truncated = buf.length > maxBytes;
    const content = buf.subarray(0, maxBytes).toString('utf8');

    return {
      ok: true,
      output: {
        path: args.path,
        bytes: buf.length,
        truncated,
        content
      }
    };
  }
};

module.exports = { readFileTool };
