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
    generateOrchestratorResponse: jest.fn()
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

describe('ConversationService', () => {
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

    mockDb.getClient.mockResolvedValue(client);
    mockDb.query.mockResolvedValue({ rows: [] });

    modelClient = {
      generateOrchestratorResponse: jest.fn()
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
          content: 'Help me plan this',
          role: 'user',
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
          content: 'Help me plan this',
          metadata: '{}',
          created_at: new Date().toISOString()
        }]
      });

    modelClient.generateOrchestratorResponse.mockResolvedValue({
      text: 'Here is a concrete plan.',
      model: 'gemini-pro',
      usage: {
        promptTokens: 10,
        completionTokens: 8,
        totalTokens: 18
      },
      fallbackUsed: false
    });

    mockDb.getClient.mockResolvedValueOnce(client).mockResolvedValueOnce({
      query: jest.fn()
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
            content: 'Here is a concrete plan.',
            role: 'assistant',
            metadata: '{}',
            citations: null,
            sources: null
          }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
      release: jest.fn()
    });

    const result = await service.sendMessageTurn(
      'conv-1',
      'user-1',
      'Help me plan this',
      {}
    );

    expect(result.userMessage.content).toBe('Help me plan this');
    expect(result.assistantMessage.content).toBe('Here is a concrete plan.');
    expect(modelClient.generateOrchestratorResponse).toHaveBeenCalled();
    expect(analyticsService.trackTokenUsage).toHaveBeenCalledWith(
      'project-1',
      'conv-1',
      'conversation-assistant',
      'gemini-pro',
      10,
      8
    );
  });

  it('stores a fallback assistant message when generation fails', async () => {
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
          content: 'Help me plan this',
          role: 'user',
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
          content: 'Help me plan this',
          metadata: '{}',
          created_at: new Date().toISOString()
        }]
      });

    modelClient.generateOrchestratorResponse.mockRejectedValue(
      new Error('provider unavailable')
    );

    const assistantClient = {
      query: jest.fn()
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
            content: 'I could not generate a response right now. Please retry in a moment.',
            role: 'assistant',
            metadata: '{}',
            citations: null,
            sources: null
          }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
      release: jest.fn()
    };

    mockDb.getClient
      .mockResolvedValueOnce(client)
      .mockResolvedValueOnce(assistantClient);

    const result = await service.sendMessageTurn(
      'conv-1',
      'user-1',
      'Help me plan this',
      {}
    );

    expect(result.assistantMessage.content).toContain(
      'I could not generate a response right now'
    );
    expect(analyticsService.trackTokenUsage).not.toHaveBeenCalled();
  });
});
