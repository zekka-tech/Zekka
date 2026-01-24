import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { MessageBubble } from './MessageBubble'
import type { Message } from '@/types/chat.types'

interface StreamingMessageProps {
  messageId: string
  initialContent?: string
  role: 'assistant'
  isStreaming?: boolean
}

export const StreamingMessage = ({ 
  messageId, 
  initialContent = '', 
  role, 
  isStreaming = true 
}: StreamingMessageProps) => {
  const [content, setContent] = useState(initialContent)
  const [isDone, setIsDone] = useState(!isStreaming)
  
  // This would normally listen to a socket event or stream
  // For now we assume the content is updated via props or context in a real app
  // But if we are simulating the streaming effect purely UI side for a string:
  
  useEffect(() => {
    setContent(initialContent)
  }, [initialContent])

  useEffect(() => {
      if (!isStreaming) {
          setIsDone(true)
      }
  }, [isStreaming])

  const message: Message = {
    id: messageId,
    role,
    content,
    timestamp: new Date(),
    status: isDone ? 'complete' : 'streaming'
  }

  return (
    <div className={cn("animate-fade-in")}>
       <MessageBubble message={message} />
       {!isDone && (
         <span className="inline-block w-2 h-4 ml-1 align-middle bg-primary animate-pulse"/>
       )}
    </div>
  )
}
