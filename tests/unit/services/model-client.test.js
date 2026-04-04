jest.mock('../../../src/utils/external-api-client', () => ({
  ExternalAPIClient: jest.fn().mockImplementation(() => ({
    callOllama: jest.fn(),
    callOllamaStream: jest.fn(),
    callOpenAIStream: jest.fn(),
    callAnthropicStream: jest.fn(),
    getStats: jest.fn(() => ({})),
    close: jest.fn()
  }))
}));

const ModelClient = require('../../../src/services/model-client');
const { ExternalAPIClient } = require('../../../src/utils/external-api-client');

describe('ModelClient streaming', () => {
  let modelClient;
  let apiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    modelClient = new ModelClient({
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    });
    apiClient = ExternalAPIClient.mock.results[0].value;
  });

  it('uses native Ollama streaming when the orchestrator model is Ollama', async () => {
    modelClient.modelConfig.orchestrator.primary = 'ollama';
    modelClient.modelConfig.ollama.model = 'llama3.1:8b';

    const chunks = [];
    apiClient.callOllamaStream.mockImplementation(async (_payload, options) => {
      await options.onToken('Hello', { done: false });
      await options.onToken(' world', { done: true });

      return {
        response: 'Hello world',
        model: 'llama3.1:8b',
        prompt_eval_count: 12,
        eval_count: 8
      };
    });

    const response = await modelClient.generateOrchestratorResponseStream(
      'Say hello',
      {
        onToken: async (chunk) => {
          chunks.push(chunk);
        }
      }
    );

    expect(apiClient.callOllamaStream).toHaveBeenCalledTimes(1);
    expect(chunks).toEqual(['Hello', ' world']);
    expect(response).toEqual(
      expect.objectContaining({
        text: 'Hello world',
        model: 'llama3.1:8b',
        streamUsed: true,
        usage: expect.objectContaining({
          promptTokens: 12,
          completionTokens: 8,
          totalTokens: 20
        })
      })
    );
  });

  it('uses native OpenAI streaming when the requested model is an OpenAI chat model', async () => {
    const chunks = [];
    apiClient.callOpenAIStream.mockImplementation(async (_payload, options) => {
      await options.onToken('Native', { done: false });
      await options.onToken(' stream', { done: false });

      return {
        response: 'Native stream',
        model: 'gpt-4o-mini',
        usage: {
          prompt_tokens: 14,
          completion_tokens: 6,
          total_tokens: 20
        }
      };
    });

    const response = await modelClient.generateOrchestratorResponseStream(
      'Say hello',
      {
        model: 'gpt-4o-mini',
        onToken: async (chunk) => {
          chunks.push(chunk);
        }
      }
    );

    expect(apiClient.callOpenAIStream).toHaveBeenCalledTimes(1);
    expect(chunks).toEqual(['Native', ' stream']);
    expect(response).toEqual(
      expect.objectContaining({
        text: 'Native stream',
        model: 'gpt-4o-mini',
        streamUsed: true,
        usage: expect.objectContaining({
          promptTokens: 14,
          completionTokens: 6,
          totalTokens: 20
        })
      })
    );
  });

  it('falls back to Ollama streaming when OpenAI streaming fails', async () => {
    apiClient.callOpenAIStream.mockRejectedValue(new Error('OpenAI down'));
    apiClient.callOllamaStream.mockResolvedValue({
      response: 'Fallback stream',
      model: 'llama3.1:8b',
      prompt_eval_count: 10,
      eval_count: 4
    });

    const response = await modelClient.generateOrchestratorResponseStream(
      'Recover please',
      {
        model: 'gpt-4o-mini'
      }
    );

    expect(apiClient.callOpenAIStream).toHaveBeenCalledTimes(1);
    expect(apiClient.callOllamaStream).toHaveBeenCalledTimes(1);
    expect(response).toEqual(
      expect.objectContaining({
        text: 'Fallback stream',
        model: 'llama3.1:8b',
        fallbackUsed: true,
        streamUsed: true
      })
    );
  });

  it('preserves an explicit zero temperature for streaming requests', async () => {
    apiClient.callOpenAIStream.mockResolvedValue({
      response: 'Deterministic stream',
      model: 'gpt-4o-mini',
      usage: {
        prompt_tokens: 10,
        completion_tokens: 2,
        total_tokens: 12
      }
    });

    await modelClient.generateOrchestratorResponseStream('Be exact', {
      model: 'gpt-4o-mini',
      temperature: 0
    });

    expect(apiClient.callOpenAIStream).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0
      }),
      expect.any(Object)
    );
  });
});
