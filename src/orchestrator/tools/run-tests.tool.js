/**
 * run_tests tool - run the project's test command inside the workspace.
 *
 * The child-process runner is injected via `ctx.exec` so the loop is unit-testable
 * without spawning real processes. `ctx.exec(command, options)` must resolve to
 * `{ stdout, stderr }` and reject with an Error carrying `{ code, stdout, stderr }`
 * on non-zero exit (the shape of `util.promisify(child_process.exec)`).
 *
 * @module orchestrator/tools/run-tests.tool
 */

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const OUTPUT_CAP = 20 * 1024; // keep observations small enough for the context window

function tail(str, cap) {
  if (typeof str !== 'string') return '';
  return str.length > cap ? str.slice(str.length - cap) : str;
}

const runTestsTool = {
  name: 'run_tests',
  description:
    'Run the project test suite in the workspace. args: { pattern?: string } to '
    + 'restrict to matching test files. Returns { passed, exitCode, stdout, stderr }.',
  schema: {
    pattern: { type: 'string', required: false }
  },

  async run(args, ctx = {}) {
    const { exec } = ctx;
    if (typeof exec !== 'function') {
      return { ok: false, error: 'no exec runner available in context' };
    }

    const testCmd = ctx.testCommand || 'npm test --silent';
    const command = args.pattern
      ? `${testCmd} -- ${args.pattern}`
      : testCmd;

    const options = {
      cwd: ctx.workspaceRoot,
      timeout: ctx.testTimeoutMs || DEFAULT_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024
    };

    try {
      const { stdout, stderr } = await exec(command, options);
      return {
        ok: true,
        output: {
          passed: true,
          exitCode: 0,
          stdout: tail(stdout, OUTPUT_CAP),
          stderr: tail(stderr, OUTPUT_CAP)
        }
      };
    } catch (err) {
      // Non-zero exit == failing tests: a valid observation, not a tool error.
      return {
        ok: true,
        output: {
          passed: false,
          exitCode: typeof err.code === 'number' ? err.code : 1,
          stdout: tail(err.stdout, OUTPUT_CAP),
          stderr: tail(err.stderr || err.message, OUTPUT_CAP)
        }
      };
    }
  }
};

module.exports = { runTestsTool };
