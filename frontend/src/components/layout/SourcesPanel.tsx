import { useState, useRef } from 'react'
import { cn } from '@/lib/cn'
import { useSources, useCreateSource, useDeleteSource } from '@/hooks/useSources'
import type { Source } from '@/types/project.types'
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

export const SourcesPanel = ({ projectId }: SourcesPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resolvedProjectId = projectId?.trim() ?? ''
  const hasProject = resolvedProjectId.length > 0

  const {
    data: sourcesData,
    isLoading,
    error,
    refetch
  } = useSources(resolvedProjectId)
  const sources = (sourcesData ?? []) as Source[]
  const createSourceMutation = useCreateSource(resolvedProjectId)
  const deleteSourceMutation = useDeleteSource(resolvedProjectId)

  const filteredSources = hasProject ? sources.filter(source =>
    source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (source.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  ) : []

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
    if (bytes === 0) return '0B'
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  const handleDeleteSource = async (sourceId: string) => {
    try {
      await deleteSourceMutation.mutateAsync(sourceId)
    } catch (deleteError) {
      console.error('Failed to delete source:', deleteError)
    }
  }

  const renderState = () => {
    if (!hasProject) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-8 text-center">
          <FileIcon className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm font-medium text-foreground mb-1">
            Sources unavailable
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Select a project to view uploaded files, folders, and import history.
          </p>
        </div>
      )
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-xs text-muted-foreground">Loading sources...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-8 text-center">
          <FileIcon className="w-8 h-8 text-destructive/60 mb-2" />
          <p className="text-sm font-medium text-foreground mb-1">
            Unable to load sources
          </p>
          <p className="text-xs text-muted-foreground max-w-xs mb-4">
            {error instanceof Error ? error.message : 'The sources service is unavailable.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium',
              'bg-muted text-foreground hover:bg-muted/80 transition-colors'
            )}
          >
            Retry
          </button>
        </div>
      )
    }

    if (filteredSources.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-8">
          <FileIcon className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground text-center">
            {searchQuery ? 'No sources found' : 'No sources yet. Upload files to get started.'}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-1">
        {filteredSources.map((source) => (
          <SourceItem
            key={source.id}
            source={source}
            onDelete={() => handleDeleteSource(source.id)}
            isDeleting={deleteSourceMutation.isPending}
          />
        ))}
      </div>
    )
  }

  const footerContent = !hasProject ? (
    <p className="text-xs text-muted-foreground">
      Select a project to view source counts and storage usage.
    </p>
  ) : error ? (
    <p className="text-xs text-muted-foreground">
      Source stats are unavailable until the query succeeds.
    </p>
  ) : (
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
  )

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
            disabled={!hasProject || createSourceMutation.isPending}
            className={cn(
              "p-1.5 rounded hover:bg-muted transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            title={hasProject ? 'Upload files' : 'Select a project to upload files'}
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
            disabled={!hasProject || isLoading || !!error}
            className={cn(
              "flex-1 bg-transparent outline-none",
              "text-sm placeholder:text-muted-foreground",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
        </div>
      </div>

      {/* Sources List */}
      <div className={cn(
        "flex-1 overflow-y-auto",
        "p-2"
      )}>
        {renderState()}
      </div>

      {/* Stats Footer */}
      <div className={cn(
        "border-t border-border p-3",
        "bg-muted/50 text-xs text-muted-foreground"
      )}>
        {footerContent}
      </div>
    </div>
  )
}

interface SourceItemProps {
  source: Source
  onDelete: () => void
  isDeleting?: boolean
}

const SourceItem = ({ source, onDelete, isDeleting = false }: SourceItemProps) => {
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

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onDelete()
        }}
        disabled={isDeleting}
        className={cn(
          "p-1 rounded hover:bg-destructive/10",
          "text-muted-foreground hover:text-destructive",
          "transition-colors flex-shrink-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isHovered || isDeleting
            ? "opacity-100"
            : "opacity-0 group-focus-within:opacity-100 focus-visible:opacity-100"
        )}
        title="Delete source"
        aria-label={`Delete source ${source.name}`}
      >
        <TrashIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
