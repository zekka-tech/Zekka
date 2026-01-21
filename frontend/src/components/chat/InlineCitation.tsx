import { FileText } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Citation } from '@/types/chat.types'

interface InlineCitationProps {
  citation: Citation
  onClick?: () => void
}

export const InlineCitation = ({ citation, onClick }: InlineCitationProps) => {
  const filename = citation.filePath.split('/').pop() || citation.filePath

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 mx-1",
        "rounded-full text-xs",
        "bg-primary/10 text-primary hover:bg-primary/20",
        "border border-primary/30",
        "transition-colors"
      )}
      title={`${citation.filePath}${citation.lineNumber ? `:${citation.lineNumber}` : ''}`}
    >
      <FileText className="w-3 h-3" />
      <span>{filename}</span>
      {citation.lineNumber && <span>:{citation.lineNumber}</span>}
    </button>
  )
}
