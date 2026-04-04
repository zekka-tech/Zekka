import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useConversationRuntime } from '../useConversations'
import { apiService } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiService: {
    getConversations: vi.fn(),
    createConversation: vi.fn(),
    getConversation: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    sendMessageStream: vi.fn()
  }
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: ReactNode }) => (
    createElement(QueryClientProvider, { client: queryClient }, children)
  )
}

describe('useConversationRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('loads existing conversations and messages for a project', async () => {
    vi.mocked(apiService.getConversations).mockResolvedValue([
      {
        id: 'conv-1',
        title: 'Existing thread',
        created_at: '2026-04-04T08:00:00.000Z',
        updated_at: '2026-04-04T08:05:00.000Z'
      }
    ])
    vi.mocked(apiService.getConversation).mockResolvedValue({
      id: 'conv-1',
      title: 'Existing thread',
      created_at: '2026-04-04T08:00:00.000Z',
      updated_at: '2026-04-04T08:05:00.000Z'
    })
    vi.mocked(apiService.getMessages).mockResolvedValue([
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello runtime',
        created_at: '2026-04-04T08:06:00.000Z'
      }
    ])

    const { result } = renderHook(
      () => useConversationRuntime('project-1', 'Alpha'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.activeConversationId).toBe('conv-1')
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1)
    })

    expect(result.current.messages[0].content).toBe('Hello runtime')
    expect(apiService.getConversations).toHaveBeenCalledWith('project-1')
    expect(apiService.getMessages).toHaveBeenCalledWith('conv-1', 50, 0)
  })

  it('creates a conversation on first send when none exists', async () => {
    vi.mocked(apiService.getConversations)
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        {
          id: 'conv-2',
          title: 'Ship the runtime integration',
          created_at: '2026-04-04T09:00:00.000Z',
          updated_at: '2026-04-04T09:00:00.000Z'
        }
      ])
    vi.mocked(apiService.createConversation).mockResolvedValue({
      id: 'conv-2',
      title: 'Ship the runtime integration',
      created_at: '2026-04-04T09:00:00.000Z',
      updated_at: '2026-04-04T09:00:00.000Z'
    })
    vi.mocked(apiService.getConversation).mockResolvedValue({
      id: 'conv-2',
      title: 'Ship the runtime integration',
      created_at: '2026-04-04T09:00:00.000Z',
      updated_at: '2026-04-04T09:00:00.000Z'
    })
    vi.mocked(apiService.getMessages)
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        {
          id: 'msg-2',
          role: 'user',
          content: 'Ship the runtime integration',
          created_at: '2026-04-04T09:01:00.000Z'
        }
      ])
    vi.mocked(apiService.sendMessage).mockResolvedValue({
      id: 'msg-2',
      role: 'user',
      content: 'Ship the runtime integration',
      created_at: '2026-04-04T09:01:00.000Z'
    })

    const { result } = renderHook(
      () => useConversationRuntime('project-1', 'Alpha'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(apiService.getConversations).toHaveBeenCalledWith('project-1')
    })

    await act(async () => {
      await result.current.sendMessage('Ship the runtime integration')
    })

    expect(apiService.createConversation).toHaveBeenCalledWith({
      title: 'Ship the runtime integration',
      projectId: 'project-1'
    })
    expect(apiService.sendMessage).toHaveBeenCalledWith(
      'conv-2',
      'Ship the runtime integration'
    )

    await waitFor(() => {
      expect(result.current.activeConversationId).toBe('conv-2')
    })
  })

  it('keeps a draft conversation selected until the next message creates it', async () => {
    vi.mocked(apiService.getConversations).mockResolvedValue([
      {
        id: 'conv-existing',
        title: 'Existing thread',
        created_at: '2026-04-04T09:00:00.000Z',
        updated_at: '2026-04-04T09:00:00.000Z'
      }
    ])
    vi.mocked(apiService.getConversation).mockResolvedValue({
      id: 'conv-existing',
      title: 'Existing thread',
      created_at: '2026-04-04T09:00:00.000Z',
      updated_at: '2026-04-04T09:00:00.000Z'
    })
    vi.mocked(apiService.getMessages).mockResolvedValue([])
    vi.mocked(apiService.createConversation).mockResolvedValue({
      id: 'conv-draft',
      title: 'Start fresh',
      created_at: '2026-04-04T09:10:00.000Z',
      updated_at: '2026-04-04T09:10:00.000Z'
    })
    vi.mocked(apiService.sendMessage).mockResolvedValue({
      id: 'msg-draft',
      role: 'user',
      content: 'Start fresh',
      created_at: '2026-04-04T09:11:00.000Z'
    })

    const { result } = renderHook(
      () => useConversationRuntime('project-1', 'Alpha'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.activeConversationId).toBe('conv-existing')
    })

    act(() => {
      result.current.startNewConversation()
    })

    expect(result.current.activeConversationId).toBeNull()

    await act(async () => {
      await result.current.sendMessage('Start fresh')
    })

    expect(apiService.createConversation).toHaveBeenCalledWith({
      title: 'Start fresh',
      projectId: 'project-1'
    })
    expect(apiService.sendMessage).toHaveBeenCalledWith('conv-draft', 'Start fresh')
  })

  it('normalizes assistant responses returned with the send-message payload', async () => {
    vi.mocked(apiService.getConversations).mockResolvedValue([
      {
        id: 'conv-3',
        title: 'Assistant ready',
        created_at: '2026-04-04T10:00:00.000Z',
        updated_at: '2026-04-04T10:00:00.000Z'
      }
    ])
    vi.mocked(apiService.getConversation).mockResolvedValue({
      id: 'conv-3',
      title: 'Assistant ready',
      created_at: '2026-04-04T10:00:00.000Z',
      updated_at: '2026-04-04T10:00:00.000Z'
    })
    vi.mocked(apiService.getMessages).mockResolvedValue([])
    vi.mocked(apiService.sendMessage).mockResolvedValue({
      userMessage: {
        id: 'msg-user',
        role: 'user',
        content: 'Explain the patch',
        created_at: '2026-04-04T10:01:00.000Z'
      },
      assistantMessage: {
        id: 'msg-assistant',
        role: 'assistant',
        content: 'Here is the explanation.',
        created_at: '2026-04-04T10:01:01.000Z',
        metadata: {
          codeBlocks: [
            {
              id: 'code-1',
              language: 'typescript',
              code: 'const answer = 42'
            }
          ]
        }
      }
    })

    const { result } = renderHook(
      () => useConversationRuntime('project-1', 'Alpha'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.activeConversationId).toBe('conv-3')
    })

    await act(async () => {
      await result.current.sendMessage('Explain the patch')
    })

    expect(apiService.sendMessage).toHaveBeenCalledWith('conv-3', 'Explain the patch')

    await waitFor(() => {
      expect(result.current.messages.map((message) => message.id)).toEqual(
        expect.arrayContaining(['msg-user', 'msg-assistant'])
      )
    })
  })

  it('consumes the backend streaming event contract', async () => {
    vi.stubEnv('VITE_CONVERSATION_STREAMING', 'true')
    vi.mocked(apiService.getConversations).mockResolvedValue([
      {
        id: 'conv-4',
        title: 'Streaming thread',
        created_at: '2026-04-04T11:00:00.000Z',
        updated_at: '2026-04-04T11:00:00.000Z'
      }
    ])
    vi.mocked(apiService.getConversation).mockResolvedValue({
      id: 'conv-4',
      title: 'Streaming thread',
      created_at: '2026-04-04T11:00:00.000Z',
      updated_at: '2026-04-04T11:00:00.000Z'
    })
    vi.mocked(apiService.getMessages).mockResolvedValue([])
    vi.mocked(apiService.sendMessageStream).mockImplementation(
      async (_conversationId, _content, handlers) => {
        handlers?.onEvent?.({
          type: 'userMessage',
          data: {
            id: 'msg-user-stream',
            role: 'user',
            content: 'Stream this reply',
            created_at: '2026-04-04T11:01:00.000Z'
          }
        })
        handlers?.onEvent?.({
          type: 'assistantMessageStart',
          data: {
            id: 'msg-assistant-stream',
            role: 'assistant',
            content: '',
            created_at: '2026-04-04T11:01:01.000Z'
          }
        })
        handlers?.onEvent?.({
          type: 'assistantMessageDelta',
          data: {
            id: 'msg-assistant-stream',
            conversationId: 'conv-4',
            chunk: 'Hello '
          }
        })
        handlers?.onEvent?.({
          type: 'assistantMessageDelta',
          data: {
            id: 'msg-assistant-stream',
            conversationId: 'conv-4',
            chunk: 'world'
          }
        })
        handlers?.onEvent?.({
          type: 'assistantMessageComplete',
          data: {
            id: 'msg-assistant-stream',
            role: 'assistant',
            content: 'Hello world',
            created_at: '2026-04-04T11:01:02.000Z'
          }
        })
        handlers?.onEvent?.({ type: 'done' })
      }
    )

    const { result } = renderHook(
      () => useConversationRuntime('project-1', 'Alpha'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.activeConversationId).toBe('conv-4')
    })

    await act(async () => {
      await result.current.sendMessage('Stream this reply')
    })

    await waitFor(() => {
      expect(result.current.messages.map((message) => message.id)).toEqual(
        expect.arrayContaining(['msg-user-stream', 'msg-assistant-stream'])
      )
    })

    expect(
      result.current.messages.find((message) => message.id === 'msg-assistant-stream')
    ).toMatchObject({
      content: 'Hello world',
      status: 'complete'
    })

    vi.unstubAllEnvs()
  })

  it('persists a streamed assistant reply when the stream ends without a replayed completion payload', async () => {
    vi.stubEnv('VITE_CONVERSATION_STREAMING', 'true')
    vi.mocked(apiService.getConversations).mockResolvedValue([
      {
        id: 'conv-5',
        title: 'Token stream thread',
        created_at: '2026-04-04T12:00:00.000Z',
        updated_at: '2026-04-04T12:00:00.000Z'
      }
    ])
    vi.mocked(apiService.getConversation).mockResolvedValue({
      id: 'conv-5',
      title: 'Token stream thread',
      created_at: '2026-04-04T12:00:00.000Z',
      updated_at: '2026-04-04T12:00:00.000Z'
    })
    vi.mocked(apiService.getMessages).mockResolvedValue([])
    vi.mocked(apiService.sendMessageStream).mockImplementation(
      async (_conversationId, _content, handlers) => {
        handlers?.onEvent?.({
          type: 'userMessage',
          data: {
            id: 'msg-user-token-stream',
            role: 'user',
            content: 'Token stream only',
            created_at: '2026-04-04T12:01:00.000Z'
          }
        })
        handlers?.onEvent?.({
          type: 'assistantMessageStart',
          data: {
            id: 'msg-assistant-token-stream',
            role: 'assistant',
            content: '',
            created_at: '2026-04-04T12:01:01.000Z'
          }
        })
        handlers?.onEvent?.({
          type: 'assistantMessageDelta',
          data: {
            id: 'msg-assistant-token-stream',
            conversationId: 'conv-5',
            chunk: 'Token '
          }
        })
        handlers?.onEvent?.({
          type: 'assistantMessageDelta',
          data: {
            id: 'msg-assistant-token-stream',
            conversationId: 'conv-5',
            chunk: 'stream'
          }
        })
        handlers?.onEvent?.({ type: 'done' })
      }
    )

    const { result } = renderHook(
      () => useConversationRuntime('project-1', 'Alpha'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.activeConversationId).toBe('conv-5')
    })

    await act(async () => {
      await result.current.sendMessage('Token stream only')
    })

    await waitFor(() => {
      expect(result.current.messages.map((message) => message.id)).toEqual(
        expect.arrayContaining(['msg-user-token-stream', 'msg-assistant-token-stream'])
      )
    })

    expect(
      result.current.messages.find(
        (message) => message.id === 'msg-assistant-token-stream'
      )
    ).toMatchObject({
      content: 'Token stream',
      status: 'complete'
    })

    vi.unstubAllEnvs()
  })
})
