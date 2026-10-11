/**
 * code_exec tool - run agent-generated code in an isolated sandbox.
 *
 * SECURITY POSTURE (secure by default):
 *   Model-generated code is untrusted. This tool executes code ONLY through an
 *   injected isolated sandbox backend (`ctx.sandbox.run`). That backend is the
 *   integration point for a per-run microVM / container isolate — e.g.
 *   Cloudflare Sandbox SDK, Firecracker, gVisor, or Docker-per-run.
 *
 *   If no sandbox is wired, the tool REFUSES to run unless the caller explicitly
 *   opts into unsafe local execution (`ctx.allowUnsafeLocalExec === true`),
 *   which is intended only for trusted single-tenant / local-dev use. In that
 *   mode it shells out via `ctx.exec` to a temp file inside the workspace with a
 *   hard timeout and output caps — NOT safe for untrusted multi-tenant input.
 *
 * Sandbox contract:
 *   ctx.sandbox.run({ language, code, timeoutMs, workspaceRoot })
 *     => Promise<{ exitCode:number, stdout:string, stderr:string }>
 *
 * @module orchestrator/tools/code-exec.tool
 */

const path = require('path');
const fs = require('fs/promises');

const OUTPUT_CAP = 20 * 1024;
const DEFAULT_TIMEOUT_MS = 30 * 1000;
const MAX_TIMEOUT_MS = 5 * 60 * 1000;

const RUNNERS = {
  javascript: { ext: 'js', cmd: (file) => `node ${file}` },
  python: { ext: 'py', cmd: (file) => `python3 ${file}` },
  bash: { ext: 'sh', cmd: (file) => `bash ${file}` }
};

function tail(str, cap) {
  if (typeof str !== 'string') return '';
  return str.length > cap ? str.slice(str.length - cap) : str;
}

function clampTimeout(ms) {
  const n = Number.isFinite(ms) && ms > 0 ? Math.floor(ms) : DEFAULT_TIMEOUT_MS;
  return Math.min(n, MAX_TIMEOUT_MS);
}

const codeExecTool = {
  name: 'code_exec',
  description:
    'Execute code in an isolated sandbox. args: { language: "javascript"|"python"'
    + '|"bash", code: string, timeoutMs?: number }. Returns { exitCode, stdout, stderr }.',
  schema: {
    language: { type: 'string', required: true },
    code: { type: 'string', required: true },
    timeoutMs: { type: 'number', required: false }
  },

  async run(args, ctx = {}) {
    const language = String(args.language || '').toLowerCase();
    const runner = RUNNERS[language];
    if (!runner) {
      return {
        ok: false,
        error: `unsupported language "${args.language}" (use javascript|python|bash)`
      };
    }
    const timeoutMs = clampTimeout(args.timeoutMs);

    // --- Preferred path: an injected, isolated sandbox backend ---
    if (ctx.sandbox && typeof ctx.sandbox.run === 'function') {
      try {
        const res = await ctx.sandbox.run({
          language,
          code: args.code,
          timeoutMs,
          workspaceRoot: ctx.workspaceRoot
        });
        return {
          ok: (res.exitCode ?? 0) === 0,
          output: {
            isolated: true,
            exitCode: res.exitCode ?? 0,
            stdout: tail(res.stdout, OUTPUT_CAP),
            stderr: tail(res.stderr, OUTPUT_CAP)
          }
        };
      } catch (err) {
        return { ok: false, error: `sandbox run failed: ${err.message}` };
      }
    }

    // --- Fallback: refuse unless explicitly allowed (trusted/dev only) ---
    if (ctx.allowUnsafeLocalExec !== true) {
      return {
        ok: false,
        error:
          'code_exec requires an isolated sandbox (ctx.sandbox.run). No sandbox is '
          + 'configured and unsafe local execution is disabled. Wire a per-run '
          + 'isolate (e.g. Cloudflare Sandbox SDK / Firecracker) or set '
          + 'ctx.allowUnsafeLocalExec for trusted single-tenant use.'
      };
    }

    const { exec } = ctx;
    if (typeof exec !== 'function') {
      return { ok: false, error: 'no exec runner available for local execution' };
    }

    const root = ctx.workspaceRoot || process.cwd();
    const file = path.join(root, `.zekka_exec_${Date.now()}.${runner.ext}`);
    try {
      await fs.writeFile(file, args.code, 'utf8');
      const { stdout, stderr } = await exec(runner.cmd(JSON.stringify(file)), {
        cwd: root,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024
      });
      return {
        ok: true,
        output: {
          isolated: false,
          exitCode: 0,
          stdout: tail(stdout, OUTPUT_CAP),
          stderr: tail(stderr, OUTPUT_CAP)
        }
      };
    } catch (err) {
      return {
        ok: true, // non-zero exit is a valid observation, not a tool error
        output: {
          isolated: false,
          exitCode: typeof err.code === 'number' ? err.code : 1,
          stdout: tail(err.stdout, OUTPUT_CAP),
          stderr: tail(err.stderr || err.message, OUTPUT_CAP)
        }
      };
    } finally {
      await fs.unlink(file).catch(() => {});
    }
  }
};

module.exports = { codeExecTool };
