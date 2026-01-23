import { useState, useCallback } from 'react'
import { cn } from '@/lib/cn'
import type { Message } from '@/types/chat.types'
import { MessageList } from './MessageList'
import { InputArea } from './InputArea'

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = useCallback((content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'complete'
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    // Simulate API call with streaming response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I received your message: "${content}"\n\nThis is a demo response. In production, this would be connected to the backend AI service with real-time streaming.`,
        timestamp: new Date(),
        status: 'complete',
        metadata: {
          model: 'claude-sonnet-4.5',
          tokenUsage: {
            input: Math.floor(Math.random() * 500) + 50,
            output: Math.floor(Math.random() * 200) + 50
          }
        }
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }, [])

  return (
    <div className={cn(
      "flex flex-col h-full w-full",
      "bg-background"
    )}>
      {/* Message List */}
      <MessageList messages={messages} isLoading={isLoading} />

      {/* Input Area */}
      <InputArea onSubmit={handleSendMessage} isLoading={isLoading} />
    </div>
  )
}
