jest.mock('../../../src/utils/circuit-breaker', () => ({
  CircuitBreaker: jest.fn().mockImplementation(() => ({
    execute: jest.fn(async (fn) => await fn()),
    getStats: jest.fn(() => ({})),
    state: 'closed'
  }))
}));

jest.mock('../../../src/utils/cache-manager', () => ({
  CacheManager: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    close: jest.fn(),
    getStats: jest.fn(() => ({}))
  }))
}));

jest.mock('../../../src/utils/audit-logger', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn()
  }))
}));

const { ExternalAPIClient } = require('../../../src/utils/external-api-client');

describe('ExternalAPIClient streaming wrappers', () => {
  it('aggregates iterator deltas through callOllamaStream without changing the public result shape', async () => {
    const client = new ExternalAPIClient({
      enableCache: false,
      enableLogging: false
    });

    client._iterateOllamaStream = jest.fn(async function *iterate() {
      yield {
        type: 'delta',
        text: 'Hello',
        raw: { response: 'Hello' }
      };
      yield {
        type: 'delta',
        text: ' world',
        raw: { response: ' world' }
      };
      yield {
        type: 'complete',
        data: {
          done: true,
          prompt_eval_count: 12,
          eval_count: 8
        }
      };
    });

    const chunks = [];
    const response = await client.callOllamaStream(
      { model: 'llama3.1:8b', prompt: 'Say hello' },
      {
        onToken: async (text) => {
          chunks.push(text);
        }
      }
    );

    expect(chunks).toEqual(['Hello', ' world']);
    expect(response).toEqual({
      response: 'Hello world',
      model: 'llama3.1:8b',
      prompt_eval_count: 12,
      eval_count: 8,
      done: true,
      raw: {
        done: true,
        prompt_eval_count: 12,
        eval_count: 8
      }
    });
  });

  it('aggregates OpenAI iterator deltas through callOpenAIStream without changing the public result shape', async () => {
    const client = new ExternalAPIClient({
      enableCache: false,
      enableLogging: false
    });

    client._iterateOpenAIStream = jest.fn(async function *iterate() {
      yield {
        type: 'delta',
        text: 'Hello',
        raw: { choices: [{ delta: { content: 'Hello' } }] }
      };
      yield {
        type: 'delta',
        text: ' world',
        raw: { choices: [{ delta: { content: ' world' } }] }
      };
      yield {
        type: 'complete',
        data: {
          usage: {
            prompt_tokens: 12,
            completion_tokens: 8,
            total_tokens: 20
          }
        }
      };
    });

    const chunks = [];
    const response = await client.callOpenAIStream(
      { model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Say hello' }] },
      {
        onToken: async (text) => {
          chunks.push(text);
        }
      }
    );

    expect(chunks).toEqual(['Hello', ' world']);
    expect(response).toEqual({
      response: 'Hello world',
      model: 'gpt-4o-mini',
      usage: {
        prompt_tokens: 12,
        completion_tokens: 8,
        total_tokens: 20
      },
      raw: {
        usage: {
          prompt_tokens: 12,
          completion_tokens: 8,
          total_tokens: 20
        }
      }
    });
  });
});
