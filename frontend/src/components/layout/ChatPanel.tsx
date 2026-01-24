import { useState, useEffect } from 'react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { useConversations } from '@/hooks/useConversations'

export const ChatPanel = () => {
  const { conversations, isLoading } = useConversations()
  const [activeId, setActiveId] = useState<string | null>(null)

  // Select most recent conversation by default
  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id)
    }
  }, [conversations, activeId])

  if (isLoading && !activeId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading chat...
      </div>
    )
  }

  return <ChatInterface conversationId={activeId} />
}
