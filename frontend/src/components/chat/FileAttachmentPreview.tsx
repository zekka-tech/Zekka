import { X, FileText, Image, Code } from 'lucide-react'
import { cn } from '@/lib/cn'

interface FileAttachmentPreviewProps {
  files: File[]
  onRemove: (index: number) => void
  disabled?: boolean
}

function fileIcon(file: File) {
  if (file.type.startsWith('image/')) return <Image className="w-3.5 h-3.5" />
  if (
    file.type.startsWith('text/') ||
    file.name.match(/\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|cs|rb|php)$/)
  ) {
    return <Code className="w-3.5 h-3.5" />
  }
  return <FileText className="w-3.5 h-3.5" />
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const FileAttachmentPreview = ({
  files,
  onRemove,
  disabled = false
}: FileAttachmentPreviewProps) => {
  if (files.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 px-4 pt-3">
      {files.map((file, i) => (
        <div
          key={`${file.name}-${i}`}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-md',
            'bg-muted border border-border',
            'text-xs text-foreground max-w-[200px]'
          )}
        >
          <span className="text-muted-foreground shrink-0">{fileIcon(file)}</span>
          <span className="truncate">{file.name}</span>
          <span className="text-muted-foreground shrink-0">{formatSize(file.size)}</span>
          {!disabled && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={`Remove ${file.name}`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
