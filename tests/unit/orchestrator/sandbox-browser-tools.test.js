/**
 * Tests for the execution sandbox (code_exec) and browser tools, plus their
 * registry gating.
 */
const { codeExecTool } = require('../../../src/orchestrator/tools/code-exec.tool');
const { browserTool } = require('../../../src/orchestrator/tools/browser.tool');
const { createDefaultRegistry } = require('../../../src/orchestrator/tools');

describe('code_exec tool', () => {
  it('refuses to run with no sandbox and no explicit opt-in (secure default)', async () => {
    const res = await codeExecTool.run(
      { language: 'javascript', code: 'console.log(1)' },
      { exec: jest.fn() }
    );
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/requires an isolated sandbox/);
  });

  it('delegates to an injected isolated sandbox backend', async () => {
    const sandbox = {
      run: jest.fn().mockResolvedValue({ exitCode: 0, stdout: 'hello', stderr: '' }),
    };
    const res = await codeExecTool.run(
      { language: 'python', code: 'print("hello")' },
      { sandbox }
    );
    expect(res.ok).toBe(true);
    expect(res.output.isolated).toBe(true);
    expect(res.output.stdout).toBe('hello');
    expect(sandbox.run).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'python' })
    );
  });

  it('rejects unsupported languages', async () => {
    const res = await codeExecTool.run(
      { language: 'brainfuck', code: '+' },
      { sandbox: { run: jest.fn() } }
    );
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/unsupported language/);
  });

  it('allows local exec only with explicit opt-in', async () => {
    const exec = jest.fn().mockResolvedValue({ stdout: 'ok', stderr: '' });
    // fs write/unlink will hit the real temp path; use a tmp workspace.
    const res = await codeExecTool.run(
      { language: 'bash', code: 'echo ok' },
      { exec, allowUnsafeLocalExec: true, workspaceRoot: require('os').tmpdir() }
    );
    expect(res.ok).toBe(true);
    expect(res.output.isolated).toBe(false);
    expect(exec).toHaveBeenCalled();
  });
});

describe('browser tool', () => {
  it('blocks private hosts via the shared SSRF guard', async () => {
    const res = await browserTool.run(
      { action: 'read', url: 'http://169.254.169.254/' },
      { fetchImpl: jest.fn() }
    );
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/blocked host/);
  });

  it('reads visible text from a fetched page', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      status: 200,
      text: async () => '<html><body><h1>Hi</h1><script>bad()</script><p>World</p></body></html>',
    });
    const res = await browserTool.run(
      { action: 'read', url: 'https://example.com' },
      { fetchImpl }
    );
    expect(res.ok).toBe(true);
    expect(res.output.text).toBe('Hi World'); // script stripped
  });

  it('extracts outbound links', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      status: 200,
      text: async () => '<a href="/docs">Docs</a><a href="https://x.com/a">X</a>',
    });
    const res = await browserTool.run(
      { action: 'links', url: 'https://example.com' },
      { fetchImpl }
    );
    expect(res.ok).toBe(true);
    expect(res.output.links).toEqual([
      { href: 'https://example.com/docs', text: 'Docs' },
      { href: 'https://x.com/a', text: 'X' },
    ]);
  });

  it('refuses click without a headless backend', async () => {
    const res = await browserTool.run(
      { action: 'click', url: 'https://example.com', selector: '#btn' },
      { fetchImpl: jest.fn() }
    );
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/headless browser backend/);
  });

  it('delegates all actions to an injected headless backend', async () => {
    const browser = { run: jest.fn().mockResolvedValue({ clicked: true }) };
    const res = await browserTool.run(
      { action: 'click', url: 'https://example.com', selector: '#btn' },
      { browser }
    );
    expect(res.ok).toBe(true);
    expect(res.output.headless).toBe(true);
    expect(browser.run).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'click', selector: '#btn' })
    );
  });
});

describe('registry gating', () => {
  it('exposes browser read-only; code_exec only with write', () => {
    const extended = createDefaultRegistry({ includeExtended: true });
    expect(extended.has('browser')).toBe(true);
    expect(extended.has('code_exec')).toBe(false);

    const full = createDefaultRegistry({ includeExtended: true, includeWrite: true });
    expect(full.has('code_exec')).toBe(true);
  });
});
