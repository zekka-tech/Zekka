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

describe('ConversationService buffered turns', () => {
  let service;
  let client;
  let modelClient;
  let analyticsService;

  beforeEach(() => {
    jest.clearAllMocks();

    client = {
      query: jest.fn(),
      release: jest.fn()
    };

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

  it('creates a user message and an assistant reply in one authoritative turn', async () => {
    const conversationId = '11111111-1111-4111-8111-111111111111';
    const userId = '22222222-2222-4222-8222-222222222222';
    const projectId = '33333333-3333-4333-8333-333333333333';

    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: conversationId,
          project_id: projectId,
          title: 'Build assistant',
          metadata: {}
        }]
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          conversation_id: conversationId,
          user_id: userId,
          content: 'How should I structure the API?',
          role: 'user',
          metadata: {}
        }]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const assistantClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: conversationId,
            project_id: projectId,
            title: 'Build assistant',
            metadata: {}
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            conversation_id: conversationId,
            user_id: null,
            content: 'Start with a service that owns turn execution.',
            role: 'assistant',
            model: 'gemini-pro',
            tokens_used: 100,
            cost: 0.00005,
            metadata: { generation: { fallbackUsed: false } }
          }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
      release: jest.fn()
    };

    mockDb.getClient
      .mockResolvedValueOnce(client)
      .mockResolvedValueOnce(assistantClient);

    mockDb.query
      .mockResolvedValueOnce({
        rows: [{
          id: conversationId,
          project_id: projectId,
          title: 'Build assistant',
          project_name: 'Zekka',
          creator_name: 'User',
          message_count: '1',
          metadata: {}
        }]
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          role: 'user',
          content: 'How should I structure the API?',
          metadata: {}
        }]
      });

    modelClient.generateOrchestratorResponse.mockResolvedValue({
      text: 'Start with a service that owns turn execution.',
      model: 'gemini-pro',
      usage: {
        promptTokens: 60,
        completionTokens: 40,
        totalTokens: 100
      },
      fallbackUsed: false
    });

    const result = await service.sendMessageTurn(
      conversationId,
      userId,
      'How should I structure the API?',
      {}
    );

    expect(result.userMessage.role).toBe('user');
    expect(result.assistantMessage.role).toBe('assistant');
    expect(result.assistantMessage.content).toContain('service that owns turn execution');
    expect(modelClient.generateOrchestratorResponse).toHaveBeenCalledTimes(1);
  });

  it('persists an assistant error message when generation fails', async () => {
    const conversationId = '11111111-1111-4111-8111-111111111111';
    const userId = '22222222-2222-4222-8222-222222222222';
    const projectId = '33333333-3333-4333-8333-333333333333';

    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: conversationId,
          project_id: projectId,
          title: 'Build assistant',
          metadata: {}
        }]
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          conversation_id: conversationId,
          user_id: userId,
          content: 'Trigger failure',
          role: 'user',
          metadata: {}
        }]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const assistantClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: conversationId,
            project_id: projectId,
            title: 'Build assistant',
            metadata: {}
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            conversation_id: conversationId,
            user_id: null,
            content: 'I could not generate a response right now. Please retry in a moment.',
            role: 'assistant',
            status: 'error',
            error_message: 'LLM unavailable',
            metadata: { generation: { failed: true } }
          }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
      release: jest.fn()
    };

    mockDb.getClient
      .mockResolvedValueOnce(client)
      .mockResolvedValueOnce(assistantClient);

    mockDb.query
      .mockResolvedValueOnce({
        rows: [{
          id: conversationId,
          project_id: projectId,
          title: 'Build assistant',
          project_name: 'Zekka',
          creator_name: 'User',
          message_count: '1',
          metadata: {}
        }]
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          role: 'user',
          content: 'Trigger failure',
          metadata: {}
        }]
      });

    modelClient.generateOrchestratorResponse.mockRejectedValue(
      new Error('LLM unavailable')
    );

    const result = await service.sendMessageTurn(
      conversationId,
      userId,
      'Trigger failure',
      {}
    );

    expect(result.assistantMessage.status).toBe('error');
    expect(result.assistantMessage.content).toContain('could not generate');
    expect(analyticsService.trackTokenUsage).not.toHaveBeenCalled();
  });

});
