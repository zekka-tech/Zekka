import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/services/api'
import type { Conversation, Message } from '@/types/chat.types'

type ConversationRecord = {
  id: string
  title?: string | null
  created_at?: string
  updated_at?: string
  createdAt?: string
  updatedAt?: string
}

type MessageRecord = {
  id: string
  role?: Message['role']
  content?: string | null
  created_at?: string
  createdAt?: string
  metadata?: Message['metadata']
}

type SendMessageResult =
  | MessageRecord
  | {
      message?: MessageRecord
      userMessage?: MessageRecord
      assistantMessage?: MessageRecord
      messages?: MessageRecord[]
    }

const parseDate = (value?: string) => {
  if (!value) return new Date()
  return new Date(value)
}

const toConversation = (conversation: ConversationRecord): Conversation => ({
  id: conversation.id,
  title: conversation.title?.trim() || 'Untitled conversation',
  messages: [],
  createdAt: parseDate(conversation.created_at ?? conversation.createdAt),
  updatedAt: parseDate(conversation.updated_at ?? conversation.updatedAt)
})

const toMessage = (
  message: MessageRecord,
  status: Message['status'] = 'complete'
): Message => ({
  id: message.id,
  role: message.role ?? 'user',
  content: message.content ?? '',
  timestamp: parseDate(message.created_at ?? message.createdAt),
  metadata: message.metadata ?? undefined,
  status
})

const normalizeSendMessageResult = (result: SendMessageResult) => {
  if ('messages' in result && Array.isArray(result.messages)) {
    return result.messages
  }

  const messages = [
    'userMessage' in result ? result.userMessage : undefined,
    'assistantMessage' in result ? result.assistantMessage : undefined,
    'message' in result ? result.message : undefined
  ].filter(Boolean) as MessageRecord[]

  if (messages.length > 0) {
    return messages
  }

  return [result as MessageRecord]
}

const createConversationTitle = (content: string, projectName?: string) => {
  const trimmed = content.trim().replace(/\s+/g, ' ')

  if (trimmed) {
    return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed
  }

  return projectName ? `${projectName} conversation` : 'New conversation'
}

export const useConversations = (projectId?: string | null) => {
  const queryClient = useQueryClient()
  const conversationKey = ['conversations', projectId ?? 'all']

  const { data, isLoading, error } = useQuery({
    queryKey: conversationKey,
    queryFn: () => apiService.getConversations(projectId ?? undefined),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000
  })

  const conversations = useMemo(
    () => ((data as ConversationRecord[] | undefined) ?? []).map(toConversation),
    [data]
  )

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; projectId: string }) =>
      apiService.createConversation(payload),
    onSuccess: (newConversation) => {
      queryClient.setQueryData(
        conversationKey,
        (old: ConversationRecord[] | undefined) => [
          newConversation as ConversationRecord,
          ...((old ?? []).filter((conversation) => conversation.id !== newConversation.id))
        ]
      )
    }
  })

  return {
    conversations,
    isLoading,
    error,
    createConversation: createMutation.mutate,
    createConversationAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending
  }
}

export const useConversation = (conversationId: string | null) => {
  const queryClient = useQueryClient()

  const { data: conversationData, isLoading, error } = useQuery({
    queryKey: ['conversations', conversationId],
    queryFn: () =>
      conversationId ? apiService.getConversation(conversationId) : null,
    enabled: !!conversationId,
    staleTime: 1 * 60 * 1000
  })

  const { data: messageData, isLoading: messagesLoading } = useQuery({
    queryKey: ['conversations', conversationId, 'messages'],
    queryFn: () =>
      conversationId ? apiService.getMessages(conversationId, 50, 0) : null,
    enabled: !!conversationId,
    staleTime: 30 * 1000
  })

  const conversation = useMemo(
    () => (conversationData ? toConversation(conversationData as ConversationRecord) : null),
    [conversationData]
  )

  const messages = useMemo(
    () => ((messageData as MessageRecord[] | undefined) ?? []).map((message) => toMessage(message)),
    [messageData]
  )

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      conversationId
        ? apiService.sendMessage(conversationId, content)
        : Promise.reject(new Error('No conversation ID')),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conversations', conversationId, 'messages']
      })
    }
  })

  return {
    conversation,
    messages,
    isLoading,
    messagesLoading,
    error,
    sendMessage: sendMessageMutation.mutate,
    sendMessageAsync: sendMessageMutation.mutateAsync,
    isSendingMessage: sendMessageMutation.isPending,
    sendMessageError: sendMessageMutation.error,
    refetchMessages: () =>
      queryClient.invalidateQueries({
        queryKey: ['conversations', conversationId, 'messages']
      })
  }
}

export const useConversationRuntime = (
  projectId?: string,
  projectName?: string
) => {
  const queryClient = useQueryClient()
  const {
    conversations,
    isLoading: conversationsLoading,
    error: conversationsError,
    createConversationAsync,
    isCreating
  } = useConversations(projectId)

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([])
  const [sendError, setSendError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const streamingEnabled = import.meta.env.VITE_CONVERSATION_STREAMING === 'true'

  useEffect(() => {
    if (!projectId) {
      setActiveConversationId(null)
      setOptimisticMessages([])
      setSendError(null)
      return
    }

    if (
      activeConversationId &&
      conversations.some((conversation) => conversation.id === activeConversationId)
    ) {
      return
    }

    setActiveConversationId(conversations[0]?.id ?? null)
    setOptimisticMessages([])
  }, [activeConversationId, conversations, projectId])

  const {
    conversation,
    messages,
    isLoading: conversationLoading,
    messagesLoading,
    error: conversationError
  } = useConversation(activeConversationId)

  const activeConversation =
    conversation ??
    conversations.find((conversationItem) => conversationItem.id === activeConversationId) ??
    null

  useEffect(() => {
    if (messages.length === 0) {
      return
    }

    setOptimisticMessages((previous) =>
      previous.filter(
        (optimisticMessage) =>
          optimisticMessage.status === 'error' ||
          !messages.some((message) => message.id === optimisticMessage.id)
      )
    )
  }, [messages])

  const allMessages = useMemo(() => {
    const mergedMessages = [...messages]

    for (const optimisticMessage of optimisticMessages) {
      if (!mergedMessages.some((message) => message.id === optimisticMessage.id)) {
        mergedMessages.push(optimisticMessage)
      }
    }

    return mergedMessages
  }, [messages, optimisticMessages])

  const startNewConversation = () => {
    setActiveConversationId(null)
    setOptimisticMessages([])
    setSendError(null)
  }

  const sendMessage = async (content: string) => {
    if (!projectId) {
      return
    }

    setSendError(null)

    const optimisticId = `optimistic-${Date.now()}`
    const optimisticMessage = toMessage(
      {
        id: optimisticId,
        role: 'user',
        content,
        createdAt: new Date().toISOString()
      },
      'sending'
    )

    setOptimisticMessages((previous) => [...previous, optimisticMessage])

    try {
      let conversationId = activeConversationId

      if (!conversationId) {
        const createdConversation = await createConversationAsync({
          title: createConversationTitle(content, projectName),
          projectId
        })

        conversationId = createdConversation.id
        setActiveConversationId(conversationId)
      }

      if (!conversationId) {
        throw new Error('Conversation could not be created')
      }

      let returnedMessages: MessageRecord[] = []

      if (streamingEnabled) {
        let streamingAssistantId: string | null = null

        await apiService.sendMessageStream(conversationId, content, {
          onEvent: (event) => {
            if (event.type === 'userMessage' && event.data) {
              returnedMessages = normalizeSendMessageResult(event.data as SendMessageResult)
              return
            }

            if (event.type === 'assistantMessage' && event.data) {
              const assistantMessage = event.data as MessageRecord
              streamingAssistantId = assistantMessage.id
              setOptimisticMessages((previous) => [
                ...previous.filter((message) => message.id !== optimisticId),
                toMessage(assistantMessage, 'streaming')
              ])
              return
            }

            if (event.type === 'content' && typeof event.data === 'string' && streamingAssistantId) {
              setOptimisticMessages((previous) =>
                previous.map((message) =>
                  message.id === streamingAssistantId
                    ? {
                        ...message,
                        content: `${message.content}${event.data as string}`,
                        status: 'streaming'
                      }
                    : message
                )
              )
              return
            }

            if (event.type === 'done' && streamingAssistantId) {
              setOptimisticMessages((previous) =>
                previous.map((message) =>
                  message.id === streamingAssistantId
                    ? { ...message, status: 'complete' }
                    : message
                )
              )
            }
          }
        })
      } else {
        const sentMessage = await apiService.sendMessage(conversationId, content)
        returnedMessages = normalizeSendMessageResult(sentMessage as SendMessageResult)
      }

      setOptimisticMessages((previous) => {
        const nextMessages = previous.filter((message) => message.id !== optimisticId)

        if (returnedMessages.length === 0) {
          return nextMessages
        }

        const normalizedReturnedMessages = returnedMessages.map((message) =>
          toMessage(message, 'complete')
        )

        return [
          ...nextMessages.filter(
            (message) =>
              !normalizedReturnedMessages.some((returned) => returned.id === message.id)
          ),
          ...normalizedReturnedMessages
        ]
      })

      queryClient.setQueryData(
        ['conversations', conversationId, 'messages'],
        (existing: MessageRecord[] | undefined) => {
          const currentMessages = existing ?? []
          const nextMessages = currentMessages.filter(
            (message) => !returnedMessages.some((returned) => returned.id === message.id)
          )

          return [...nextMessages, ...returnedMessages]
        }
      )

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['conversations', projectId]
        }),
        queryClient.invalidateQueries({
          queryKey: ['conversations', conversationId]
        }),
        queryClient.invalidateQueries({
          queryKey: ['conversations', conversationId, 'messages']
        })
      ])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to send message'
      setSendError(message)
      setOptimisticMessages((previous) =>
        previous.map((entry) =>
          entry.id === optimisticId ? { ...entry, status: 'error' } : entry
        )
      )
    } finally {
      setIsSending(false)
    }
  }

  return {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    messages: allMessages,
    isLoading: Boolean(projectId) && conversationsLoading,
    isConversationLoading: conversationLoading || messagesLoading,
    isSending: isCreating || isSending,
    error:
      sendError ||
      (conversationError instanceof Error
        ? conversationError.message
        : conversationsError instanceof Error
          ? conversationsError.message
          : null),
    sendMessage,
    startNewConversation
  }
}
