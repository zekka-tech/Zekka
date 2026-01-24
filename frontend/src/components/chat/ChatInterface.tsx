import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/cn'
import type { Message } from '@/types/chat.types'
import { MessageList } from './MessageList'
import { InputArea } from './InputArea'
import { useConversation, useConversations } from '@/hooks/useConversations'
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
    isLoading: isHistoryLoading
  } = useConversation(conversationId || null)
  
  const { createConversation } = useConversations()
  
  const { on } = useWebSocket()
  
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

    const unsubStream = on('chat:stream', handleStream)
    const unsubComplete = on('chat:complete', handleComplete)

    return () => {
      unsubStream()
      unsubComplete()
    }
  }, [on])

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
           onSuccess: (_newConv: any) => {
               // We need to reload the page or update state to select this new conversation
               window.location.reload(); 
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
