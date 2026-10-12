/**
 * DockerSandbox tests — isolation flags, exit-code mapping, and error passthrough.
 * execFile is injected (no real docker/containers spawned).
 */
const { DockerSandbox } = require('../../../src/orchestrator/sandbox/docker-sandbox');

const silentLogger = { info: () => {}, warn: () => {}, error: () => {} };

describe('DockerSandbox', () => {
  it('runs with hardened isolation flags and returns exit 0 on success', async () => {
    const execFile = jest.fn().mockResolvedValue({ stdout: 'hello', stderr: '' });
    const sbx = new DockerSandbox({ execFile, logger: silentLogger });

    const res = await sbx.run({ language: 'python', code: 'print("hello")' });

    expect(res).toEqual({ exitCode: 0, stdout: 'hello', stderr: '' });
    const [cmd, args] = execFile.mock.calls[0];
    expect(cmd).toBe('docker');
    // defence-in-depth flags present
    for (const flag of ['--network', 'none', '--read-only', '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges', '--user', '1000:1000']) {
      expect(args).toContain(flag);
    }
    // read-only mount + python interpreter on the mounted file
    expect(args.some((a) => /:\/sandbox:ro$/.test(a))).toBe(true);
    expect(args).toContain('python:3.12-alpine');
    expect(args).toContain('python3');
    expect(args[args.length - 1]).toBe('/sandbox/main.py');
  });

  it('maps a non-zero program exit to a result (not a throw)', async () => {
    const err = Object.assign(new Error('exit 1'), { code: 1, stdout: 'out', stderr: 'boom' });
    const execFile = jest.fn().mockRejectedValue(err);
    const sbx = new DockerSandbox({ execFile, logger: silentLogger });

    const res = await sbx.run({ language: 'javascript', code: 'process.exit(1)' });
    expect(res).toEqual({ exitCode: 1, stdout: 'out', stderr: 'boom' });
  });

  it('rethrows when docker is missing (ENOENT, no numeric code)', async () => {
    const err = Object.assign(new Error('spawn docker ENOENT'), { code: 'ENOENT' });
    const execFile = jest.fn().mockRejectedValue(err);
    const sbx = new DockerSandbox({ execFile, logger: silentLogger });

    await expect(sbx.run({ language: 'bash', code: 'echo hi' }))
      .rejects.toThrow(/ENOENT/);
  });

  it('rejects an unsupported language', async () => {
    const sbx = new DockerSandbox({ execFile: jest.fn(), logger: silentLogger });
    await expect(sbx.run({ language: 'ruby', code: 'puts 1' }))
      .rejects.toThrow(/unsupported sandbox language/);
  });
});
