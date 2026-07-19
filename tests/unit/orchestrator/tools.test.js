/**
 * Unit tests for agent tools and the workspace sandbox.
 * File tools run against a real temp workspace; process tools use injected runners.
 */

const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const { resolveInWorkspace } = require('../../../src/orchestrator/tools/workspace');
const { readFileTool } = require('../../../src/orchestrator/tools/read-file.tool');
const { searchCodeTool } = require('../../../src/orchestrator/tools/search-code.tool');
const { runTestsTool } = require('../../../src/orchestrator/tools/run-tests.tool');
const { writeFileTool } = require('../../../src/orchestrator/tools/write-file.tool');
const { gitTool } = require('../../../src/orchestrator/tools/git.tool');

let workspace;

beforeEach(async () => {
  workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'zekka-ws-'));
});

afterEach(async () => {
  await fs.rm(workspace, { recursive: true, force: true });
});

describe('resolveInWorkspace', () => {
  it('resolves a relative path inside the root', () => {
    expect(resolveInWorkspace('/root', 'a/b.txt')).toBe(path.resolve('/root/a/b.txt'));
  });

  it('strips a leading slash so absolute-looking args stay sandboxed', () => {
    expect(resolveInWorkspace('/root', '/etc/passwd')).toBe(path.resolve('/root/etc/passwd'));
  });

  it('throws when the path escapes via ..', () => {
    expect(() => resolveInWorkspace('/root', '../../etc/passwd')).toThrow(/escapes workspace/);
  });

  it('throws on empty inputs', () => {
    expect(() => resolveInWorkspace('', 'x')).toThrow(/workspaceRoot is required/);
    expect(() => resolveInWorkspace('/root', '')).toThrow(/path is required/);
  });
});

describe('read_file tool', () => {
  it('reads a file within the workspace', async () => {
    await fs.writeFile(path.join(workspace, 'hello.txt'), 'hi there');
    const res = await readFileTool.run({ path: 'hello.txt' }, { workspaceRoot: workspace });
    expect(res.ok).toBe(true);
    expect(res.output.content).toBe('hi there');
    expect(res.output.truncated).toBe(false);
  });

  it('truncates to maxBytes', async () => {
    await fs.writeFile(path.join(workspace, 'big.txt'), 'abcdefghij');
    const res = await readFileTool.run({ path: 'big.txt', maxBytes: 4 }, { workspaceRoot: workspace });
    expect(res.output.content).toBe('abcd');
    expect(res.output.truncated).toBe(true);
    expect(res.output.bytes).toBe(10);
  });

  it('rejects path traversal', async () => {
    await expect(
      readFileTool.run({ path: '../outside.txt' }, { workspaceRoot: workspace })
    ).rejects.toThrow(/escapes workspace/);
  });
});

describe('search_code tool', () => {
  it('finds matches and reports file/line', async () => {
    await fs.writeFile(path.join(workspace, 'a.js'), 'const x = 1;\nTODO fix\nconst y = 2;');
    await fs.writeFile(path.join(workspace, 'b.js'), 'nothing here');
    const res = await searchCodeTool.run({ query: 'TODO' }, { workspaceRoot: workspace });
    expect(res.ok).toBe(true);
    expect(res.output.count).toBe(1);
    expect(res.output.matches[0]).toMatchObject({ file: 'a.js', line: 2, text: 'TODO fix' });
  });

  it('skips node_modules', async () => {
    await fs.mkdir(path.join(workspace, 'node_modules'));
    await fs.writeFile(path.join(workspace, 'node_modules', 'dep.js'), 'NEEDLE');
    await fs.writeFile(path.join(workspace, 'src.js'), 'NEEDLE');
    const res = await searchCodeTool.run({ query: 'NEEDLE' }, { workspaceRoot: workspace });
    expect(res.output.count).toBe(1);
    expect(res.output.matches[0].file).toBe('src.js');
  });

  it('honors maxResults and reports truncation', async () => {
    await fs.writeFile(path.join(workspace, 'many.txt'), 'x\nx\nx\nx\nx');
    const res = await searchCodeTool.run({ query: 'x', maxResults: 2 }, { workspaceRoot: workspace });
    expect(res.output.count).toBe(2);
    expect(res.output.truncated).toBe(true);
  });

  it('returns a structured error on invalid regex', async () => {
    const res = await searchCodeTool.run({ query: '(' }, { workspaceRoot: workspace });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/invalid regex/);
  });
});

describe('run_tests tool', () => {
  const ctx = (exec) => ({ workspaceRoot: '/ws', exec });

  it('reports passed on zero exit', async () => {
    const exec = jest.fn().mockResolvedValue({ stdout: 'ok', stderr: '' });
    const res = await runTestsTool.run({}, ctx(exec));
    expect(res.output).toMatchObject({ passed: true, exitCode: 0, stdout: 'ok' });
    expect(exec).toHaveBeenCalledWith('npm test --silent', expect.objectContaining({ cwd: '/ws' }));
  });

  it('reports failed (not a tool error) on non-zero exit', async () => {
    const err = Object.assign(new Error('fail'), { code: 1, stdout: 'F', stderr: 'boom' });
    const exec = jest.fn().mockRejectedValue(err);
    const res = await runTestsTool.run({}, ctx(exec));
    expect(res.ok).toBe(true);
    expect(res.output).toMatchObject({ passed: false, exitCode: 1, stderr: 'boom' });
  });

  it('appends a pattern to the command', async () => {
    const exec = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
    await runTestsTool.run({ pattern: 'auth' }, ctx(exec));
    expect(exec).toHaveBeenCalledWith('npm test --silent -- auth', expect.any(Object));
  });

  it('errors when no exec runner is provided', async () => {
    const res = await runTestsTool.run({}, { workspaceRoot: '/ws' });
    expect(res).toEqual({ ok: false, error: 'no exec runner available in context' });
  });
});

describe('write_file tool', () => {
  it('writes a file and reports it via writes[]', async () => {
    const res = await writeFileTool.run(
      { path: 'sub/dir/out.txt', content: 'payload' },
      { workspaceRoot: workspace }
    );
    expect(res.ok).toBe(true);
    expect(res.writes).toEqual(['sub/dir/out.txt']);
    const written = await fs.readFile(path.join(workspace, 'sub/dir/out.txt'), 'utf8');
    expect(written).toBe('payload');
  });

  it('rejects path traversal', async () => {
    await expect(
      writeFileTool.run({ path: '../evil.txt', content: 'x' }, { workspaceRoot: workspace })
    ).rejects.toThrow(/escapes workspace/);
  });
});

describe('git tool', () => {
  const ctx = (execFile) => ({ workspaceRoot: workspace, execFile });

  it('runs a whitelisted command with argv (no shell string)', async () => {
    const execFile = jest.fn().mockResolvedValue({ stdout: 'clean', stderr: '' });
    const res = await gitTool.run({ command: 'status' }, ctx(execFile));
    expect(res.ok).toBe(true);
    expect(execFile).toHaveBeenCalledWith('git', ['status'], expect.objectContaining({ cwd: workspace }));
  });

  it('rejects a non-whitelisted command', async () => {
    const execFile = jest.fn();
    const res = await gitTool.run({ command: 'push' }, ctx(execFile));
    expect(res.ok).toBe(false);
    expect(execFile).not.toHaveBeenCalled();
  });

  it('requires a message for commit', async () => {
    const execFile = jest.fn();
    const res = await gitTool.run({ command: 'commit' }, ctx(execFile));
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/message/);
  });

  it('passes commit message as a separate argv entry', async () => {
    const execFile = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
    await gitTool.run({ command: 'commit', message: 'feat: x' }, ctx(execFile));
    expect(execFile).toHaveBeenCalledWith('git', ['commit', '-m', 'feat: x'], expect.any(Object));
  });

  it('sanitizes add paths (drops flags, strips leading slash) after --', async () => {
    const execFile = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
    await gitTool.run({ command: 'add', paths: ['-rf', '/a.js', 'b.js'] }, ctx(execFile));
    expect(execFile).toHaveBeenCalledWith('git', ['add', '--', 'a.js', 'b.js'], expect.any(Object));
  });
});
