/**
 * ModelClient native tool-use tests: schema conversion + tool_use parsing.
 */
jest.mock('../../../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const ModelClient = require('../../../src/services/model-client');

describe('ModelClient.toAnthropicTools', () => {
  it('converts a registry catalogue into JSON-Schema input_schema', () => {
    const tools = ModelClient.toAnthropicTools([
      {
        name: 'read_file',
        description: 'read a file',
        schema: { path: { type: 'string', required: true }, maxBytes: { type: 'number' } }
      }
    ]);
    expect(tools[0]).toMatchObject({
      name: 'read_file',
      input_schema: {
        type: 'object',
        properties: { path: { type: 'string' }, maxBytes: { type: 'number' } },
        required: ['path']
      }
    });
  });
});

describe('ModelClient.generateWithTools', () => {
  const OLD_KEY = process.env.ANTHROPIC_API_KEY;
  afterAll(() => { process.env.ANTHROPIC_API_KEY = OLD_KEY; });

  it('parses text + tool_use blocks from the Messages response', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    const client = new ModelClient({ logger: { info: jest.fn(), warn: jest.fn() } });
    client.apiClient.callAnthropic = jest.fn().mockResolvedValue({
      stop_reason: 'tool_use',
      usage: { input_tokens: 10, output_tokens: 5 },
      content: [
        { type: 'text', text: 'Let me read that file.' },
        { type: 'tool_use', id: 'tu_1', name: 'read_file', input: { path: 'a.js' } }
      ]
    });

    const res = await client.generateWithTools(
      [{ role: 'user', content: 'read a.js' }],
      ModelClient.toAnthropicTools([
        { name: 'read_file', description: 'r', schema: { path: { type: 'string', required: true } } }
      ])
    );

    expect(res.text).toContain('read that file');
    expect(res.toolCalls).toEqual([{ id: 'tu_1', name: 'read_file', input: { path: 'a.js' } }]);
    expect(res.stopReason).toBe('tool_use');
    // tools were forwarded to the API
    expect(client.apiClient.callAnthropic.mock.calls[0][0].tools).toHaveLength(1);
  });

  it('throws when no API key is configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const client = new ModelClient({ logger: { info: jest.fn(), warn: jest.fn() } });
    await expect(
      client.generateWithTools([{ role: 'user', content: 'hi' }], [])
    ).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });
});
