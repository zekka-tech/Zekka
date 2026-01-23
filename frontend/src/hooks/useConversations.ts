import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/services/api'

export const useConversations = () => {
  const queryClient = useQueryClient()

  // Get all conversations
  const { data: conversations, isLoading, error } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiService.getConversations(),
    staleTime: 2 * 60 * 1000 // 2 minutes
  })

  // Create conversation mutation
  const createMutation = useMutation({
    mutationFn: (data?: { title?: string; projectId?: string }) =>
      apiService.createConversation(data),
    onSuccess: (newConversation) => {
      queryClient.setQueryData(['conversations'], (old: any[] | undefined) => [
        ...(old || []),
        newConversation
      ])
    }
  })

  return {
    conversations: conversations || [],
    isLoading,
    error,
    createConversation: createMutation.mutate,
    createConversationAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending
  }
}

export const useConversation = (conversationId: string | null) => {
  const queryClient = useQueryClient()

  // Get single conversation
  const { data: conversation, isLoading, error } = useQuery({
    queryKey: ['conversations', conversationId],
    queryFn: () =>
      conversationId ? apiService.getConversation(conversationId) : null,
    enabled: !!conversationId,
    staleTime: 1 * 60 * 1000
  })

  // Get messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['conversations', conversationId, 'messages'],
    queryFn: () =>
      conversationId ? apiService.getMessages(conversationId, 50, 0) : null,
    enabled: !!conversationId,
    staleTime: 30 * 1000 // 30 seconds
  })

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      conversationId
        ? apiService.sendMessage(conversationId, content)
        : Promise.reject('No conversation ID'),
    onSuccess: () => {
      // Invalidate messages to refetch
      queryClient.invalidateQueries({
        queryKey: ['conversations', conversationId, 'messages']
      })
    }
  })

  return {
    conversation,
    messages: messages || [],
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
