import { useState, useRef } from 'react'
import { cn } from '@/lib/cn'
import { useSources, useCreateSource } from '@/hooks/useSources'
import {
  FileIcon,
  FolderIcon,
  UploadIcon,
  TrashIcon,
  SearchIcon,
  FileTextIcon,
  CodeIcon,
  ImageIcon
} from 'lucide-react'

interface SourcesPanelProps {
  projectId?: string
}

export const SourcesPanel = ({ projectId = 'demo' }: SourcesPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: sources = [], isLoading } = useSources(projectId)
  const createSourceMutation = useCreateSource(projectId)

  // Demo data when no sources
  const demoSources = sources.length === 0 ? [
    {
      id: '1',
      projectId,
      name: 'main.ts',
      type: 'file' as const,
      path: '/src/main.ts',
      fileSize: 2048,
      uploadedAt: new Date(Date.now() - 86400000),
      metadata: { mimeType: 'text/typescript', language: 'typescript', lines: 145 },
      tags: ['typescript', 'core']
    },
    {
      id: '2',
      projectId,
      name: 'README.md',
      type: 'file' as const,
      path: '/README.md',
      fileSize: 5120,
      uploadedAt: new Date(Date.now() - 172800000),
      metadata: { mimeType: 'text/markdown', language: 'markdown', lines: 89 },
      tags: ['documentation']
    },
    {
      id: '3',
      projectId,
      name: 'styles.css',
      type: 'file' as const,
      path: '/src/styles.css',
      fileSize: 3200,
      uploadedAt: new Date(Date.now() - 259200000),
      metadata: { mimeType: 'text/css', language: 'css', lines: 120 },
      tags: ['styling']
    }
  ] : sources

  const filteredSources = demoSources.filter(source =>
    source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (source.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  )

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (!files) return

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)

      try {
        await createSourceMutation.mutateAsync(formData)
      } catch (error) {
        console.error('Failed to upload file:', error)
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <div className={cn(
      "flex flex-col h-full",
      "bg-card border-r border-border",
      "overflow-hidden"
    )}>
      {/* Header */}
      <div className={cn(
        "border-b border-border p-3",
        "bg-card"
      )}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Sources</h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={createSourceMutation.isPending}
            className={cn(
              "p-1.5 rounded hover:bg-muted transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            title="Upload files"
          >
            <UploadIcon className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            accept="*/*"
          />
        </div>

        {/* Search */}
        <div className={cn(
          "relative flex items-center",
          "px-2 py-1.5 rounded",
          "bg-muted border border-border"
        )}>
          <SearchIcon className="w-3.5 h-3.5 text-muted-foreground mr-2 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "flex-1 bg-transparent outline-none",
              "text-sm placeholder:text-muted-foreground"
            )}
          />
        </div>
      </div>

      {/* Sources List */}
      <div className={cn(
        "flex-1 overflow-y-auto",
        "p-2"
      )}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">Loading sources...</p>
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <FileIcon className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground text-center">
              {searchQuery ? 'No sources found' : 'No sources yet. Upload files to get started.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredSources.map((source) => (
              <SourceItem
                key={source.id}
                source={source}
                onDelete={() => {
                  // Handle delete
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className={cn(
        "border-t border-border p-3",
        "bg-muted/50 text-xs text-muted-foreground"
      )}>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Files:</span>
            <span className="font-medium">{filteredSources.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Size:</span>
            <span className="font-medium">
              {formatFileSize(filteredSources.reduce((sum, s) => sum + (s.fileSize || 0), 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface SourceItemProps {
  source: any
  onDelete: () => void
}

const SourceItem = ({ source, onDelete }: SourceItemProps) => {
  const [isHovered, setIsHovered] = useState(false)

  const getIcon = () => {
    if (source.type === 'folder') return <FolderIcon className="w-4 h-4" />
    const mimeType = source.metadata?.mimeType || ''
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
    if (mimeType.includes('javascript') || mimeType.includes('typescript')) {
      return <CodeIcon className="w-4 h-4" />
    }
    return <FileTextIcon className="w-4 h-4" />
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded",
        "hover:bg-muted transition-colors cursor-pointer group",
        "text-xs"
      )}
    >
      <div className="text-muted-foreground flex-shrink-0">
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-foreground">
          {source.name}
        </p>
        <p className="text-muted-foreground text-xs">
          {source.path && source.path.split('/').slice(0, -1).join('/') + '/'}
        </p>
        {source.metadata?.lines && (
          <p className="text-muted-foreground text-xs">
            {source.metadata.lines} lines
          </p>
        )}
      </div>

      {isHovered && (
        <button
          onClick={onDelete}
          className={cn(
            "p-1 rounded hover:bg-destructive/10",
            "text-muted-foreground hover:text-destructive",
            "transition-colors flex-shrink-0"
          )}
          title="Delete source"
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
