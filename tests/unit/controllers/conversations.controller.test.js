const conversationService = require('../../../src/services/conversation.service');
const controller = require('../../../src/controllers/conversations.controller');

jest.mock('../../../src/services/conversation.service', () => ({
  sendMessageTurn: jest.fn()
}));

describe('ConversationsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the authoritative turn result for sendMessage', async () => {
    conversationService.sendMessageTurn.mockResolvedValue({
      conversationId: 'conv-1',
      userMessage: { id: 'user-msg-1', content: 'Hello' },
      assistantMessage: { id: 'assistant-msg-1', content: 'Hi there' }
    });

    const req = {
      user: { userId: 'user-1' },
      params: { id: 'conv-1' },
      body: { content: 'Hello', metadata: {} }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    await controller.sendMessage(req, res, next);

    expect(conversationService.sendMessageTurn).toHaveBeenCalledWith(
      'conv-1',
      'user-1',
      'Hello',
      {}
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          conversationId: 'conv-1'
        }),
        userMessage: expect.objectContaining({ id: 'user-msg-1' }),
        assistantMessage: expect.objectContaining({ id: 'assistant-msg-1' })
      })
    );
  });
});
