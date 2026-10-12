/**
 * DockerSandbox - a real isolated backend for the `code_exec` tool.
 *
 * Satisfies the sandbox contract the tool expects:
 *   sandbox.run({ language, code, timeoutMs, workspaceRoot })
 *     => Promise<{ exitCode, stdout, stderr }>
 *
 * Each invocation runs agent-generated code in a throwaway container with
 * defence-in-depth isolation:
 *   --network none           no network access
 *   --read-only + tmpfs      immutable root FS, small writable /tmp
 *   --user 1000:1000         non-root
 *   --cap-drop ALL           no Linux capabilities
 *   --security-opt no-new-privileges
 *   --memory / --cpus / --pids-limit   resource caps
 *   --rm                     container removed after exit
 * The code is written to a host temp file mounted READ-ONLY into the container,
 * and the interpreter is invoked via execFile with an argument array (never a
 * shell string), so model output can't inject shell commands.
 *
 * `execFile` is injected for testability; it defaults to
 * util.promisify(child_process.execFile) and resolves `{ stdout, stderr }`,
 * rejecting with an Error carrying `{ code, stdout, stderr }` on non-zero exit.
 *
 * NOTE: requires Docker on the host (and the per-language images pullable or
 * pre-pulled). Wire it in via config.sandbox; if Docker is absent, code_exec
 * stays refused-by-default (see code-exec.tool.js).
 *
 * @module orchestrator/sandbox/docker-sandbox
 */

const path = require('path');
const os = require('os');
const fs = require('fs/promises');
const { promisify } = require('util');
const childProcess = require('child_process');

const OUTPUT_CAP = 20 * 1024;
const DEFAULT_TIMEOUT_MS = 30 * 1000;

// Minimal images per language. Alpine variants keep pulls small.
const DEFAULT_IMAGES = {
  javascript: 'node:22-alpine',
  python: 'python:3.12-alpine',
  bash: 'alpine:3.20'
};

const RUNNERS = {
  javascript: { ext: 'js', cmd: (f) => ['node', f] },
  python: { ext: 'py', cmd: (f) => ['python3', f] },
  bash: { ext: 'sh', cmd: (f) => ['sh', f] }
};

function tail(str, cap) {
  if (typeof str !== 'string') return '';
  return str.length > cap ? str.slice(str.length - cap) : str;
}

class DockerSandbox {
  /**
   * @param {Object} [options]
   * @param {Function} [options.execFile] injected execFile(cmd, args, opts) runner
   * @param {Object}   [options.images]   per-language image overrides
   * @param {string}   [options.memory]   docker --memory (default '512m')
   * @param {string}   [options.cpus]     docker --cpus (default '1')
   * @param {number}   [options.pidsLimit] docker --pids-limit (default 128)
   * @param {Object}   [options.logger]
   */
  constructor(options = {}) {
    this.execFile = options.execFile || promisify(childProcess.execFile);
    this.images = { ...DEFAULT_IMAGES, ...(options.images || {}) };
    this.memory = options.memory || '512m';
    this.cpus = options.cpus || '1';
    this.pidsLimit = options.pidsLimit || 128;
    this.logger = options.logger || console;
  }

  /**
   * @param {{language:string, code:string, timeoutMs?:number}} input
   * @returns {Promise<{exitCode:number, stdout:string, stderr:string}>}
   */
  async run({ language, code, timeoutMs } = {}) {
    const runner = RUNNERS[language];
    const image = this.images[language];
    if (!runner || !image) {
      throw new Error(`unsupported sandbox language: ${language}`);
    }

    const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0
      ? timeoutMs
      : DEFAULT_TIMEOUT_MS;

    // Host temp dir mounted read-only into the container.
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zekka-sbx-'));
    const file = `main.${runner.ext}`;
    await fs.writeFile(path.join(dir, file), code ?? '', 'utf8');

    const args = [
      'run', '--rm',
      '--network', 'none',
      '--memory', this.memory,
      '--cpus', this.cpus,
      '--pids-limit', String(this.pidsLimit),
      '--read-only',
      '--tmpfs', '/tmp:rw,size=64m,noexec',
      '--user', '1000:1000',
      '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges',
      '-v', `${dir}:/sandbox:ro`,
      '-w', '/sandbox',
      image,
      ...runner.cmd(`/sandbox/${file}`)
    ];

    try {
      const { stdout, stderr } = await this.execFile('docker', args, {
        timeout,
        maxBuffer: 10 * 1024 * 1024
      });
      return { exitCode: 0, stdout: tail(stdout, OUTPUT_CAP), stderr: tail(stderr, OUTPUT_CAP) };
    } catch (err) {
      // Non-zero exit from the sandboxed program is a valid result, not a tool
      // failure — surface its code/output. A missing `docker` binary (ENOENT)
      // or a timeout is a real error and is rethrown.
      if (err && typeof err.code === 'number') {
        return {
          exitCode: err.code,
          stdout: tail(err.stdout, OUTPUT_CAP),
          stderr: tail(err.stderr, OUTPUT_CAP)
        };
      }
      throw err;
    } finally {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

module.exports = { DockerSandbox };
