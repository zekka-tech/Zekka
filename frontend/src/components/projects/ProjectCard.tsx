import { useState } from 'react'
import { cn } from '@/lib/cn'
import { useProject, useProjectStats } from '@/hooks/useProjects'
import { MoreVerticalIcon, EditIcon, TrashIcon, ArchiveIcon, MessageSquareIcon } from 'lucide-react'
import type { Project } from '@/types/project.types'

interface ProjectCardProps {
  project: Project
}

export const ProjectCard = ({ project }: ProjectCardProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: stats } = useProjectStats(project.id)
  const { deleteAsync, isDeleting } = useProject(project.id)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-700 dark:text-green-400'
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
      case 'completed':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
      case 'archived':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
    }
  }

  const handleDelete = async () => {
    try {
      await deleteAsync()
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  const formatDate = (date?: Date) => {
    if (!date) return 'Never'
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className={cn(
      "flex flex-col rounded-lg border border-border",
      "bg-card hover:bg-card/80 transition-colors",
      "overflow-hidden group"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground line-clamp-1">
              {project.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {project.description || 'No description provided'}
            </p>
          </div>

          {/* More Menu */}
          <div className="relative ml-2">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={cn(
                "p-1.5 rounded hover:bg-muted transition-colors",
                "opacity-0 group-hover:opacity-100"
              )}
            >
              <MoreVerticalIcon className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className={cn(
                "absolute right-0 top-full mt-1 z-10",
                "bg-popover border border-border rounded-lg shadow-lg",
                "w-48 py-1"
              )}>
                <button
                  onClick={() => {
                    setIsMenuOpen(false)
                    // TODO: Open edit dialog
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm",
                    "hover:bg-muted transition-colors text-foreground"
                  )}
                >
                  <EditIcon className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false)
                    // TODO: Archive project
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm",
                    "hover:bg-muted transition-colors text-foreground"
                  )}
                >
                  <ArchiveIcon className="w-4 h-4" />
                  Archive
                </button>
                <div className="border-t border-border my-1" />
                <button
                  onClick={() => {
                    setIsMenuOpen(false)
                    setShowDeleteConfirm(true)
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm",
                    "hover:bg-destructive/10 transition-colors text-destructive"
                  )}
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-2 py-1 rounded text-xs font-medium",
            getStatusColor(project.status)
          )}>
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-semibold">{stats?.totalConversations || 0}</p>
            <p className="text-xs text-muted-foreground">Conversations</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats?.totalMessages || 0}</p>
            <p className="text-xs text-muted-foreground">Messages</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats?.totalTokensUsed || 0}</p>
            <p className="text-xs text-muted-foreground">Tokens</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span>Created: {formatDate(project.createdAt)}</span>
          <span>{project.members?.length || 0} members</span>
        </div>

        <button className={cn(
          "w-full flex items-center justify-center gap-2 px-3 py-2",
          "rounded-lg bg-muted hover:bg-muted/80 transition-colors",
          "text-sm font-medium text-foreground"
        )}>
          <MessageSquareIcon className="w-4 h-4" />
          Open Project
        </button>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className={cn(
          "absolute inset-0 bg-black/50 rounded-lg",
          "flex flex-col items-center justify-center",
          "p-4 z-50"
        )}>
          <div className="bg-card rounded-lg p-4 max-w-sm">
            <h3 className="font-semibold mb-2">Delete Project?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This action cannot be undone. All conversations and data associated with this project will be permanently deleted.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={cn(
                  "px-3 py-2 rounded text-sm font-medium",
                  "bg-muted hover:bg-muted/80 transition-colors"
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={cn(
                  "px-3 py-2 rounded text-sm font-medium",
                  "bg-destructive text-destructive-foreground",
                  "hover:bg-destructive/90 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
