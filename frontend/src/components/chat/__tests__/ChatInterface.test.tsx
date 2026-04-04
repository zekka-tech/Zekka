import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import { ChatInterface } from '../ChatInterface'

const mockUseConversationRuntime = vi.fn()

vi.mock('@/hooks/useConversations', () => ({
  useConversationRuntime: (...args: unknown[]) => mockUseConversationRuntime(...args)
}))

describe('ChatInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a project-selection state when no project is active', () => {
    mockUseConversationRuntime.mockReturnValue({
      conversations: [],
      activeConversation: null,
      activeConversationId: null,
      setActiveConversationId: vi.fn(),
      messages: [],
      isLoading: false,
      isConversationLoading: false,
      isSending: false,
      error: null,
      sendMessage: vi.fn(),
      startNewConversation: vi.fn()
    })

    renderWithProviders(<ChatInterface />)

    expect(screen.getByText('Select a project to start chatting')).toBeInTheDocument()
    expect(
      screen.getByText(
        'The dashboard chat now uses the live conversation API and must be scoped to a project before it can create or load threads.'
      )
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('renders an active conversation and messages', () => {
    mockUseConversationRuntime.mockReturnValue({
      conversations: [{ id: 'conv-1', title: 'Existing thread' }],
      activeConversation: { id: 'conv-1', title: 'Existing thread' },
      activeConversationId: 'conv-1',
      setActiveConversationId: vi.fn(),
      messages: [
        {
          id: 'message-1',
          role: 'user',
          content: 'Hello runtime',
          timestamp: new Date(),
          status: 'complete'
        }
      ],
      isLoading: false,
      isConversationLoading: false,
      isSending: false,
      error: null,
      sendMessage: vi.fn(),
      startNewConversation: vi.fn()
    })

    renderWithProviders(
      <ChatInterface projectId="project-1" projectName="Alpha" />
    )

    expect(screen.getByText('Project: Alpha')).toBeInTheDocument()
    expect(screen.getByText('Hello runtime')).toBeInTheDocument()
  })

  it('creates a conversation on first send and persists the message through the runtime', async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined)

    mockUseConversationRuntime.mockReturnValue({
      conversations: [],
      activeConversation: null,
      activeConversationId: null,
      setActiveConversationId: vi.fn(),
      messages: [],
      isLoading: false,
      isConversationLoading: false,
      isSending: false,
      error: null,
      sendMessage,
      startNewConversation: vi.fn()
    })

    renderWithProviders(
      <ChatInterface projectId="project-1" projectName="Project One" />
    )

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Hello world' }
    })
    fireEvent.click(screen.getByTitle('Send message (Enter)'))

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith('Hello world')
    })
  })
})
