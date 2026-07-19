/**
 * write_file tool - write a UTF-8 text file inside the workspace sandbox.
 *
 * Reports the written path via `writes` so the agent runner can accumulate each
 * agent's file footprint; the orchestrator's conflict detector compares those
 * footprints across agents in the same stage.
 *
 * @module orchestrator/tools/write-file.tool
 */

const fs = require('fs/promises');
const path = require('path');
const { resolveInWorkspace } = require('./workspace');

const writeFileTool = {
  name: 'write_file',
  description:
    'Write a UTF-8 text file (creating parent dirs). args: { path: string '
    + '(relative to workspace), content: string }. Overwrites existing files.',
  schema: {
    path: { type: 'string', required: true },
    content: { type: 'string', required: true }
  },

  async run(args, ctx = {}) {
    const abs = resolveInWorkspace(ctx.workspaceRoot, args.path);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, args.content, 'utf8');

    return {
      ok: true,
      output: {
        path: args.path,
        bytes: Buffer.byteLength(args.content, 'utf8')
      },
      writes: [args.path]
    };
  }
};

module.exports = { writeFileTool };
