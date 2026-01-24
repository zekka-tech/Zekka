import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/cn'
import type { Message } from '@/types/chat.types'
import { MessageList } from './MessageList'
import { InputArea } from './InputArea'
import { useConversation } from '@/hooks/useConversations'
import { useWebSocket } from '@/hooks/useWebSocket'

interface ChatInterfaceProps {
  conversationId?: string | null
}

export const ChatInterface = ({ conversationId }: ChatInterfaceProps) => {
  // Use hook with conversationId (can be null)
  const { 
    messages: historyMessages, 
    sendMessage, 
    isSendingMessage,
    createConversation,
    isLoading: isHistoryLoading
  } = useConversation(conversationId || null)
  
  const { on, off } = useWebSocket()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

  // Sync with history when it loads or changes
  useEffect(() => {
    if (historyMessages) {
      setMessages(historyMessages)
    }
  }, [historyMessages])

  // WebSocket listeners for streaming
  useEffect(() => {
    const handleStream = (chunk: { messageId: string, content: string }) => {
      setStreamingMessageId(chunk.messageId)
      setStreamingContent(prev => prev + chunk.content)
    }
    
    const handleComplete = (message: Message) => {
      setStreamingMessageId(null)
      setStreamingContent('')
      setMessages(prev => {
         const exists = prev.some(m => m.id === message.id)
         if (exists) {
             return prev.map(m => m.id === message.id ? message : m)
         }
         return [...prev, message]
      })
    }

    on('chat:stream', handleStream)
    on('chat:complete', handleComplete)

    return () => {
      off('chat:stream', handleStream)
      off('chat:complete', handleComplete)
    }
  }, [on, off])

  const handleSendMessage = useCallback((content: string) => {
    const tempId = 'temp-' + Date.now()
    
    // Optimistic UI update
    const userMessage: Message = {
      id: tempId,
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'sending'
    }
    setMessages(prev => [...prev, userMessage])

    // If no conversation, create one first
    if (!conversationId) {
       // Create new conversation with title from message
       createConversation({ title: content.substring(0, 30) + '...' }, {
           onSuccess: (newConv) => {
               // We need to reload the page or update state to select this new conversation
               // Ideally ChatPanel should handle this via `activeId` state lifting
               // But for now we can try to send message to the new conversation if we had access to it.
               // Since `sendMessage` from hook is bound to `conversationId` (which is null), we can't use it directly here
               // unless we use `apiService` directly or refactor.
               // For this implementation, let's just refresh/redirect or wait for ChatPanel to pick it up.
               window.location.reload(); // Simple brute force for now to pick up new conversation
           }
       })
       return
    }

    sendMessage(content, {
        onSuccess: () => {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'complete' } : m))
        },
        onError: () => {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m))
        }
    })
  }, [conversationId, sendMessage, createConversation])

  // Merge streaming content
  const displayMessages = [...messages]
  if (streamingMessageId && streamingContent) {
      const existing = displayMessages.find(m => m.id === streamingMessageId)
      if (existing) {
          existing.content = streamingContent
          existing.status = 'streaming'
      } else {
          displayMessages.push({
              id: streamingMessageId,
              role: 'assistant',
              content: streamingContent,
              timestamp: new Date(),
              status: 'streaming'
          })
      }
  }

  return (
    <div className={cn(
      "flex flex-col h-full w-full",
      "bg-background"
    )}>
      {/* Message List */}
      <MessageList 
        messages={displayMessages} 
        isLoading={isSendingMessage || isHistoryLoading} 
      />

      {/* Input Area */}
      <InputArea onSubmit={handleSendMessage} isLoading={isSendingMessage} />
    </div>
  )
}
