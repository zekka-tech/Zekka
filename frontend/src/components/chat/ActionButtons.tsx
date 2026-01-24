import { Copy, Play, Edit2, Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useState } from 'react'

interface ActionButtonsProps {
  content: string
  onApply?: () => void
  onModify?: () => void
  className?: string
}

export const ActionButtons = ({ content, onApply, onModify, className }: ActionButtonsProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <div className={cn("flex items-center gap-1 mt-2", className)}>
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Copy to clipboard"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
      
      {onApply && (
        <button
          onClick={onApply}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Apply code"
        >
          <Play className="w-4 h-4" />
        </button>
      )}

      {onModify && (
        <button
          onClick={onModify}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Modify"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
