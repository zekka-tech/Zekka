import { useState } from 'react'
import { Send, Paperclip, Mic } from 'lucide-react'
import { cn } from '@/lib/cn'

interface InputAreaProps {
  onSubmit: (message: string) => void
  isLoading?: boolean
  placeholder?: string
}

export const InputArea = ({
  onSubmit,
  isLoading = false,
  placeholder = 'Type your message...'
}: InputAreaProps) => {
  const [message, setMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !isLoading) {
      onSubmit(message)
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn(
      "border-t border-border p-4",
      "bg-background"
    )}>
      <div className={cn(
        "flex gap-2 items-end"
      )}>
        {/* Action buttons */}
        <div className="flex gap-1">
          <button
            type="button"
            className={cn(
              "p-2 rounded-lg",
              "hover:bg-muted",
              "transition-colors",
              "text-muted-foreground hover:text-foreground"
            )}
            title="Attach file"
            disabled={isLoading}
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            type="button"
            className={cn(
              "p-2 rounded-lg",
              "hover:bg-muted",
              "transition-colors",
              "text-muted-foreground hover:text-foreground"
            )}
            title="Voice input"
            disabled={isLoading}
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className={cn(
            "flex-1 px-4 py-2 rounded-lg",
            "bg-muted border border-border",
            "text-foreground placeholder-muted-foreground",
            "resize-none",
            "focus:outline-none focus:ring-2 focus:ring-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          rows={1}
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={isLoading || !message.trim()}
          className={cn(
            "p-2 rounded-lg",
            "bg-primary text-primary-foreground",
            "hover:bg-primary/90",
            "transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          title="Send message (Enter)"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </form>
  )
}
