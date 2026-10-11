/**
 * Extended agent tool tests: web_fetch, db_introspect, package_install.
 * Covers the security guards (SSRF blocking, identifier/package validation)
 * and the happy paths, plus registry wiring via includeExtended.
 */
const { webFetchTool } = require('../../../src/orchestrator/tools/web-fetch.tool');
const { dbIntrospectTool } = require('../../../src/orchestrator/tools/db-introspect.tool');
const { packageInstallTool } = require('../../../src/orchestrator/tools/package-install.tool');
const { createDefaultRegistry } = require('../../../src/orchestrator/tools');

describe('web_fetch tool', () => {
  it('blocks loopback / private hosts (SSRF guard)', async () => {
    for (const url of [
      'http://localhost/admin',
      'http://127.0.0.1/',
      'http://169.254.169.254/latest/meta-data',
      'http://10.0.0.1/',
      'http://192.168.1.1/'
    ]) {
      const res = await webFetchTool.run({ url }, { fetchImpl: jest.fn() });
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/blocked host/);
    }
  });

  it('rejects non-http protocols', async () => {
    const res = await webFetchTool.run(
      { url: 'file:///etc/passwd' },
      { fetchImpl: jest.fn() }
    );
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/unsupported protocol/);
  });

  it('fetches a public URL and truncates the body', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      status: 200,
      headers: { get: () => 'text/plain' },
      text: async () => 'x'.repeat(100)
    });
    const res = await webFetchTool.run(
      { url: 'https://example.com', maxBytes: 10 },
      { fetchImpl }
    );
    expect(res.ok).toBe(true);
    expect(res.output.truncated).toBe(true);
    expect(res.output.body).toHaveLength(10);
  });
});

describe('db_introspect tool', () => {
  it('lists public tables when no table is given', async () => {
    const dbQuery = jest.fn().mockResolvedValue({
      rows: [{ table_name: 'users' }, { table_name: 'projects' }]
    });
    const res = await dbIntrospectTool.run({}, { dbQuery });
    expect(res.ok).toBe(true);
    expect(res.output.tables).toEqual(['users', 'projects']);
  });

  it('rejects an invalid table identifier (no SQL issued)', async () => {
    const dbQuery = jest.fn();
    const res = await dbIntrospectTool.run({ table: 'users; DROP TABLE x' }, { dbQuery });
    expect(res.ok).toBe(false);
    expect(dbQuery).not.toHaveBeenCalled();
  });

  it('returns columns for a valid table', async () => {
    const dbQuery = jest.fn().mockResolvedValue({
      rows: [{ column_name: 'id', data_type: 'uuid', is_nullable: 'NO', column_default: null }]
    });
    const res = await dbIntrospectTool.run({ table: 'users' }, { dbQuery });
    expect(res.ok).toBe(true);
    expect(res.output.columns[0]).toMatchObject({ name: 'id', nullable: false });
  });
});

describe('package_install tool', () => {
  it('rejects package names with shell metacharacters', async () => {
    const exec = jest.fn();
    const res = await packageInstallTool.run(
      { packages: ['lodash; rm -rf /'] },
      { exec }
    );
    expect(res.ok).toBe(false);
    expect(exec).not.toHaveBeenCalled();
  });

  it('installs valid (incl. scoped/versioned) packages', async () => {
    const exec = jest.fn().mockResolvedValue({ stdout: 'added 2 packages', stderr: '' });
    const res = await packageInstallTool.run(
      { packages: ['lodash@4.17.21', '@types/node'], dev: true },
      { exec, workspaceRoot: '/tmp/ws' }
    );
    expect(res.ok).toBe(true);
    const command = exec.mock.calls[0][0];
    expect(command).toContain('--save-dev');
    expect(command).toContain('lodash@4.17.21');
    expect(command).toContain('@types/node');
  });
});

describe('createDefaultRegistry includeExtended', () => {
  it('adds read-only extended tools, and package_install only with write', () => {
    const readOnly = createDefaultRegistry({ includeExtended: true });
    expect(readOnly.has('web_fetch')).toBe(true);
    expect(readOnly.has('db_introspect')).toBe(true);
    expect(readOnly.has('package_install')).toBe(false);

    const full = createDefaultRegistry({ includeExtended: true, includeWrite: true });
    expect(full.has('package_install')).toBe(true);
  });
});
