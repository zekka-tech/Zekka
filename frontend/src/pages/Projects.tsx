import { useState } from 'react'
import { cn } from '@/lib/cn'
import { useProjects } from '@/hooks/useProjects'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'
import { PlusIcon, SearchIcon } from 'lucide-react'
import type { Project } from '@/types/project.types'

export const Projects = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all')
  const [isCreating, setIsCreating] = useState(false)

  const { projects = [], isLoading, createProjectAsync } = useProjects()

  const filteredProjects = (projects as Project[]).filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleCreateProject = async (data: { name: string; description?: string; settings?: any }) => {
    try {
      setIsCreating(true)
      await createProjectAsync(data)
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const stats = {
    total: projects.length,
    active: (projects as Project[]).filter(p => p.status === 'active').length,
    paused: (projects as Project[]).filter(p => p.status === 'paused').length,
    completed: (projects as Project[]).filter(p => p.status === 'completed').length
  }

  return (
    <div className={cn(
      "h-full w-full",
      "bg-background",
      "overflow-hidden flex flex-col"
    )}>
      {/* Header */}
      <div className={cn(
        "border-b border-border p-6",
        "bg-card"
      )}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Projects</h1>
              <p className="text-muted-foreground">Manage your AI agent projects and workspaces</p>
            </div>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90 transition-colors",
                "font-medium"
              )}
            >
              <PlusIcon className="w-4 h-4" />
              New Project
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total', value: stats.total, color: 'bg-blue-500/10' },
              { label: 'Active', value: stats.active, color: 'bg-green-500/10' },
              { label: 'Paused', value: stats.paused, color: 'bg-yellow-500/10' },
              { label: 'Completed', value: stats.completed, color: 'bg-purple-500/10' }
            ].map((stat, i) => (
              <div key={i} className={cn('p-3 rounded-lg', stat.color)}>
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={cn(
        "border-b border-border p-4",
        "bg-card"
      )}>
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          {/* Search */}
          <div className={cn(
            "flex-1 flex items-center",
            "px-3 py-2 rounded-lg",
            "bg-muted border border-border"
          )}>
            <SearchIcon className="w-4 h-4 text-muted-foreground mr-2" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            {(['all', 'active', 'paused', 'completed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                  statusFilter === status
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className={cn(
        "flex-1 overflow-auto p-6",
        "bg-background"
      )}>
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <PlusIcon className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No projects found</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                {searchQuery
                  ? 'Try adjusting your search criteria'
                  : 'Create your first project to get started with AI agent orchestration'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className={cn(
                    "mt-4 px-4 py-2 rounded-lg",
                    "bg-primary text-primary-foreground",
                    "hover:bg-primary/90 transition-colors",
                    "font-medium"
                  )}
                >
                  Create Project
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateProject}
        isLoading={isCreating}
      />
    </div>
  )
}
