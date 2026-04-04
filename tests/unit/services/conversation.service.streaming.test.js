const mockDb = {
  getClient: jest.fn(),
  query: jest.fn()
};

jest.mock('../../../src/config/database', () => mockDb);
jest.mock('../../../src/middleware/websocket', () => ({
  getIO: jest.fn(() => ({
    to: jest.fn(() => ({
      emit: jest.fn()
    }))
  }))
}));
jest.mock('../../../src/services/model-client', () => {
  return jest.fn().mockImplementation(() => ({
    generateOrchestratorResponse: jest.fn(),
    generateOrchestratorResponseStream: jest.fn()
  }));
});
jest.mock('../../../src/services/analytics.service', () => ({
  trackTokenUsage: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const { ConversationService } = require('../../../src/services/conversation.service');

describe('ConversationService sendMessageTurnStream', () => {
  let service;
  let client;
  let assistantClient;
  let modelClient;
  let analyticsService;

  beforeEach(() => {
    jest.clearAllMocks();

    client = {
      query: jest.fn(),
      release: jest.fn()
    };
    assistantClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    mockDb.getClient
      .mockResolvedValueOnce(client)
      .mockResolvedValueOnce(assistantClient);

    mockDb.query.mockReset();

    modelClient = {
      generateOrchestratorResponse: jest.fn(),
      generateOrchestratorResponseStream: jest.fn()
    };
    analyticsService = {
      trackTokenUsage: jest.fn().mockResolvedValue(undefined)
    };

    service = new ConversationService({
      modelClient,
      analyticsService,
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    });
  });

  it('streams assistant tokens and persists one final assistant message', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'conv-1',
          project_id: 'project-1',
          title: 'Conversation',
          metadata: '{}',
          owner_id: 'user-1'
        }]
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'user-msg-1',
          conversation_id: 'conv-1',
          user_id: 'user-1',
          content: 'Stream this',
          role: 'user',
          metadata: '{}',
          citations: null,
          sources: null
        }]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    assistantClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'conv-1',
          project_id: 'project-1',
          title: 'Conversation',
          metadata: '{}',
          owner_id: 'user-1'
        }]
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'assistant-msg-1',
          conversation_id: 'conv-1',
          user_id: null,
          content: 'Hello world',
          role: 'assistant',
          metadata: '{}',
          citations: null,
          sources: null
        }]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    mockDb.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'conv-1',
          project_id: 'project-1',
          title: 'Conversation',
          metadata: '{}',
          project_name: 'Alpha'
        }]
      })
      .mockResolvedValueOnce({
        rows: [{
          role: 'user',
          content: 'Stream this',
          metadata: '{}',
          created_at: new Date().toISOString()
        }]
      });

    const chunks = [];
    modelClient.generateOrchestratorResponseStream.mockImplementation(
      async (_prompt, options) => {
        await options.onToken('Hello', { done: false });
        await options.onToken(' world', { done: true });

        return {
          text: 'Hello world',
          model: 'llama3.1:8b',
          usage: {
            promptTokens: 5,
            completionTokens: 2,
            totalTokens: 7
          },
          fallbackUsed: false,
          streamUsed: true
        };
      }
    );

    const result = await service.sendMessageTurnStream(
      'conv-1',
      'user-1',
      'Stream this',
      { model: 'ollama' },
      {
        onAssistantDelta: async (delta) => {
          chunks.push(delta.chunk);
        }
      }
    );

    expect(chunks).toEqual(['Hello', ' world']);
    expect(modelClient.generateOrchestratorResponseStream).toHaveBeenCalledTimes(1);
    expect(result.assistantMessage.content).toBe('Hello world');
    expect(analyticsService.trackTokenUsage).toHaveBeenCalledWith(
      'project-1',
      'conv-1',
      'conversation-assistant',
      'llama3.1:8b',
      5,
      2
    );
  });
});
