/**
 * package_install tool - install npm packages into the workspace.
 *
 * Package names come from model output, so they are strictly validated against
 * the npm naming rules (optionally scoped, optional @version) before being
 * passed to the injected `ctx.exec` runner. This prevents shell-metacharacter
 * injection — no package string containing spaces, `;`, `&&`, backticks, etc.
 * can ever reach the shell.
 *
 * @module orchestrator/tools/package-install.tool
 */

const DEFAULT_TIMEOUT_MS = 3 * 60 * 1000;
const OUTPUT_CAP = 20 * 1024;

// name: optional @scope/, name chars [a-z0-9-._~], optional @version (semver-ish)
const PACKAGE_SPEC = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(@[\w.\-^~*x><=|| ]+)?$/i;

function tail(str, cap) {
  if (typeof str !== 'string') return '';
  return str.length > cap ? str.slice(str.length - cap) : str;
}

const packageInstallTool = {
  name: 'package_install',
  description:
    'Install npm packages into the workspace. args: { packages: array<string>, '
    + 'dev?: boolean }. Package names are strictly validated. Returns install output.',
  schema: {
    packages: { type: 'array', required: true },
    dev: { type: 'boolean', required: false }
  },

  async run(args, ctx = {}) {
    const { exec } = ctx;
    if (typeof exec !== 'function') {
      return { ok: false, error: 'no exec runner available in context' };
    }

    const packages = Array.isArray(args.packages) ? args.packages : [];
    if (packages.length === 0) {
      return { ok: false, error: 'no packages specified' };
    }
    if (packages.length > 25) {
      return { ok: false, error: 'too many packages in one call (max 25)' };
    }

    const invalid = packages.filter(
      (p) => typeof p !== 'string' || !PACKAGE_SPEC.test(p.trim())
    );
    if (invalid.length > 0) {
      return { ok: false, error: `invalid package name(s): ${invalid.join(', ')}` };
    }

    const flag = args.dev ? '--save-dev' : '--save';
    const spec = packages.map((p) => p.trim()).join(' ');
    const command = `npm install ${flag} --no-audit --no-fund ${spec}`;

    const options = {
      cwd: ctx.workspaceRoot,
      timeout: ctx.installTimeoutMs || DEFAULT_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024
    };

    try {
      const { stdout, stderr } = await exec(command, options);
      return {
        ok: true,
        output: {
          installed: packages,
          dev: Boolean(args.dev),
          stdout: tail(stdout, OUTPUT_CAP),
          stderr: tail(stderr, OUTPUT_CAP)
        }
      };
    } catch (err) {
      return {
        ok: false,
        error: `install failed (exit ${typeof err.code === 'number' ? err.code : 1})`,
        output: { stderr: tail(err.stderr || err.message, OUTPUT_CAP) }
      };
    }
  }
};

module.exports = { packageInstallTool };
