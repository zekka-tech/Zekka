/**
 * git tool - run a whitelisted git subcommand inside the workspace.
 *
 * Only a fixed set of subcommands is allowed, and arguments are passed as an
 * argv array (never a shell string) to a caller-injected `ctx.execFile` runner —
 * `ctx.execFile(file, argsArray, options) -> { stdout, stderr }` — so model
 * output can never inject shell metacharacters.
 *
 * @module orchestrator/tools/git.tool
 */

const { resolveInWorkspace } = require('./workspace');

const ALLOWED = new Set(['status', 'diff', 'add', 'commit', 'log']);
const OUTPUT_CAP = 20 * 1024;

function tail(str, cap) {
  if (typeof str !== 'string') return '';
  return str.length > cap ? str.slice(str.length - cap) : str;
}

/** Reject args that could be interpreted as options/paths outside the sandbox. */
function sanitizePathArgs(paths) {
  return paths
    .filter((p) => typeof p === 'string' && p.trim() !== '' && !p.startsWith('-'))
    .map((p) => p.replace(/^[/\\]+/, ''));
}

const gitTool = {
  name: 'git',
  description:
    'Run a git subcommand in the workspace. args: { command: '
    + '"status"|"diff"|"add"|"commit"|"log", paths?: string[], message?: string }. '
    + 'commit requires message; add requires paths.',
  schema: {
    command: { type: 'string', required: true },
    paths: { type: 'array', required: false },
    message: { type: 'string', required: false }
  },

  async run(args, ctx = {}) {
    const { execFile } = ctx;
    if (typeof execFile !== 'function') {
      return { ok: false, error: 'no execFile runner available in context' };
    }
    if (!ALLOWED.has(args.command)) {
      return { ok: false, error: `git command not allowed: ${args.command}` };
    }
    // Confirm the workspace root resolves (throws if misconfigured).
    const cwd = resolveInWorkspace(ctx.workspaceRoot, '.');

    const argv = [args.command];
    if (args.command === 'commit') {
      if (typeof args.message !== 'string' || args.message.trim() === '') {
        return { ok: false, error: 'commit requires a non-empty message' };
      }
      argv.push('-m', args.message);
    } else if (args.command === 'add') {
      const paths = sanitizePathArgs(Array.isArray(args.paths) ? args.paths : []);
      if (paths.length === 0) {
        return { ok: false, error: 'add requires at least one path' };
      }
      argv.push('--', ...paths);
    } else if (args.command === 'diff' && Array.isArray(args.paths)) {
      const paths = sanitizePathArgs(args.paths);
      if (paths.length > 0) argv.push('--', ...paths);
    }

    try {
      const { stdout, stderr } = await execFile('git', argv, {
        cwd,
        timeout: ctx.gitTimeoutMs || 30000,
        maxBuffer: 10 * 1024 * 1024
      });
      return {
        ok: true,
        output: {
          command: args.command,
          exitCode: 0,
          stdout: tail(stdout, OUTPUT_CAP),
          stderr: tail(stderr, OUTPUT_CAP)
        }
      };
    } catch (err) {
      return {
        ok: false,
        error: `git ${args.command} failed: ${tail(err.stderr || err.message, 2000)}`
      };
    }
  }
};

module.exports = { gitTool };
