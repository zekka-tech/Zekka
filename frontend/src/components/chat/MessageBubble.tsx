import { memo } from 'react'
import { cn } from '@/lib/cn'
import type { Message } from '@/types/chat.types'
import { InlineCitation } from './InlineCitation'
import { Loader } from 'lucide-react'
import { ActionButtons } from './ActionButtons'

interface MessageBubbleProps {
  message: Message
}

const MessageBubbleComponent = ({ message }: MessageBubbleProps) => {
  const isUser = message.role === 'user'

  return (
    <div className={cn(
      "flex w-full mb-4",
      isUser ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        "max-w-2xl rounded-lg px-4 py-3",
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-card text-card-foreground'
      )}>
        {/* Content */}
        <p className={cn(
          "whitespace-pre-wrap leading-relaxed",
          "text-sm"
        )}>
          {message.content}
        </p>

        {/* Citations */}
        {message.metadata?.citations && message.metadata.citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-current opacity-50 flex flex-wrap gap-2">
            {message.metadata.citations.map(citation => (
              <InlineCitation key={citation.id} citation={citation} />
            ))}
          </div>
        )}

        {/* Status */}
        {message.status === 'streaming' && (
          <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
            <Loader className="w-3 h-3 animate-spin" />
            <span>Streaming...</span>
          </div>
        )}

        {/* Token usage */}
        {message.metadata?.tokenUsage && (
          <div className="mt-2 text-xs opacity-70">
            {message.metadata.tokenUsage.input} in | {message.metadata.tokenUsage.output} out
          </div>
        )}
        
        {/* Action Buttons for Assistant */}
        {!isUser && message.status === 'complete' && (
             <ActionButtons 
                content={message.content} 
                className="mt-2 pt-2 border-t border-border/10"
             />
        )}
      </div>
    </div>
  )
}

/**
 * Memoized MessageBubble to prevent re-renders when parent updates
 * Only re-renders if message prop actually changes
 */
export const MessageBubble = memo(MessageBubbleComponent)
