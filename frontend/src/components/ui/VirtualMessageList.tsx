import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import type { Message } from '@/types/chat.types'

interface VirtualMessageListProps {
  messages: Message[]
  renderMessage: (message: Message, index: number) => React.ReactNode
  height: number
  itemSize?: number
}

/**
 * Optimized message list with virtual scrolling for performance
 * Automatically scrolls to the most recent message
 */
export const VirtualMessageList = ({
  messages,
  renderMessage,
  height,
  itemSize = 100
}: VirtualMessageListProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col overflow-y-auto",
        "space-y-0"
      )}
      style={{ height: `${height}px` }}
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>No messages yet. Start a conversation!</p>
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                "px-4",
                index > 0 && "border-t border-border"
              )}
              style={{ minHeight: `${itemSize}px` }}
            >
              {renderMessage(message, index)}
            </div>
          ))}
          <div ref={endRef} />
        </>
      )}
    </div>
  )
}
