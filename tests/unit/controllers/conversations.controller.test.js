jest.mock('../../../src/services/conversation.service', () => ({
  sendMessageTurn: jest.fn(),
  sendMessageTurnStream: jest.fn()
}));

const conversationService = require('../../../src/services/conversation.service');
const controller = require('../../../src/controllers/conversations.controller');

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

  it('streams a stable SSE event sequence derived from the authoritative turn result', async () => {
    conversationService.sendMessageTurnStream.mockImplementation(
      async (_conversationId, _userId, _content, _metadata, handlers) => {
        await handlers.onUserMessage({ id: 'user-msg-1', content: 'Hello' });
        await handlers.onAssistantStart({
          id: 'assistant-msg-1',
          conversation_id: 'conv-1',
          content: ''
        });
        await handlers.onAssistantDelta({
          id: 'assistant-msg-1',
          conversationId: 'conv-1',
          chunk: 'Hi there '
        });
        await handlers.onAssistantDelta({
          id: 'assistant-msg-1',
          conversationId: 'conv-1',
          chunk: 'with a bounded response'
        });
        await handlers.onAssistantComplete({
          id: 'assistant-msg-1',
          conversation_id: 'conv-1',
          content: 'Hi there with a bounded response'
        });
      }
    );

    const req = {
      user: { userId: 'user-1' },
      params: { id: 'conv-1' },
      body: { content: 'Hello', metadata: {} }
    };
    const writes = [];
    const res = {
      headersSent: false,
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      flush: jest.fn(),
      write: jest.fn((chunk) => {
        writes.push(chunk);
      }),
      end: jest.fn()
    };
    const next = jest.fn();

    await controller.sendMessageStream(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    expect(res.flushHeaders).toHaveBeenCalled();
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();

    const payloads = writes.map((chunk) =>
      JSON.parse(chunk.replace(/^data: /, '').trim())
    );

    expect(payloads[0]).toEqual({
      type: 'userMessage',
      data: { id: 'user-msg-1', content: 'Hello' }
    });
    expect(payloads[1]).toEqual({
      type: 'assistantMessageStart',
      data: {
        id: 'assistant-msg-1',
        conversation_id: 'conv-1',
        content: ''
      }
    });
    expect(payloads[payloads.length - 2]).toEqual({
      type: 'assistantMessageComplete',
      data: {
        id: 'assistant-msg-1',
        conversation_id: 'conv-1',
        content: 'Hi there with a bounded response'
      }
    });
    expect(payloads[payloads.length - 1]).toEqual({ type: 'done' });

    const deltaPayloads = payloads.filter(
      (payload) => payload.type === 'assistantMessageDelta'
    );
    expect(deltaPayloads).toEqual([
      {
        type: 'assistantMessageDelta',
        data: {
          id: 'assistant-msg-1',
          conversationId: 'conv-1',
          chunk: 'Hi there '
        }
      },
      {
        type: 'assistantMessageDelta',
        data: {
          id: 'assistant-msg-1',
          conversationId: 'conv-1',
          chunk: 'with a bounded response'
        }
      }
    ]);
  });

  it('writes an SSE error event when streaming generation fails', async () => {
    conversationService.sendMessageTurnStream.mockRejectedValue(
      new Error('stream failed')
    );

    const req = {
      user: { userId: 'user-1' },
      params: { id: 'conv-1' },
      body: { content: 'Hello', metadata: {} }
    };
    const writes = [];
    const res = {
      headersSent: false,
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      flush: jest.fn(),
      write: jest.fn((chunk) => {
        writes.push(chunk);
      }),
      end: jest.fn()
    };
    const next = jest.fn();

    await controller.sendMessageStream(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalled();

    const payloads = writes.map((chunk) => JSON.parse(chunk.replace(/^data: /, '').trim()));
    expect(payloads).toEqual([
      {
        type: 'error',
        error: 'stream failed'
      }
    ]);
  });
});
