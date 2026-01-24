import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import type { Message } from '@/types/chat.types'
import { MessageBubble } from './MessageBubble'
import { StreamingMessage } from './StreamingMessage'

interface MessageListProps {
  messages: Message[]
  isLoading?: boolean
}

export const MessageList = ({ messages, isLoading }: MessageListProps) => {
  const scrollEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className={cn(
      "flex flex-col h-full",
      "overflow-y-auto"
    )}>
      <div className="flex-1 px-4 py-6">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                Start a conversation
              </h3>
              <p className="text-muted-foreground text-sm">
                Ask me anything about your project
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
                message.status === 'streaming' && message.role === 'assistant' ? (
                    <StreamingMessage 
                        key={message.id} 
                        messageId={message.id}
                        initialContent={message.content}
                        role={message.role}
                        isStreaming={true}
                    />
                ) : (
                    <MessageBubble key={message.id} message={message} />
                )
            ))}
            {isLoading && !messages.some(m => m.status === 'streaming') && (
              <div className="flex justify-start mb-4">
                <div className={cn(
                  "bg-card text-card-foreground",
                  "rounded-lg px-4 py-3"
                )}>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={scrollEndRef} />
      </div>
    </div>
  )
}
