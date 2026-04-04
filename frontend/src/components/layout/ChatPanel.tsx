import type { Project } from '@/types/project.types'
import { ChatInterface } from '@/components/chat/ChatInterface'

interface ChatPanelProps {
  projectId?: string
  projectName?: string
  projects?: Project[]
  onProjectChange?: (projectId: string) => void
  projectsLoading?: boolean
}

export const ChatPanel = ({
  projectId,
  projectName,
  projects = [],
  onProjectChange,
  projectsLoading = false
}: ChatPanelProps) => {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-foreground">Project Chat</h1>
            <p className="text-xs text-muted-foreground">
              Live conversation threads persist to the active project context.
            </p>
          </div>

          <select
            aria-label="Active project"
            value={projectId ?? ''}
            onChange={(event) => {
              if (event.target.value) {
                onProjectChange?.(event.target.value)
              }
            }}
            disabled={projectsLoading || projects.length === 0}
            className="min-w-52 rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">
              {projectsLoading ? 'Loading projects...' : 'Select a project'}
            </option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatInterface projectId={projectId} projectName={projectName} />
      </div>
    </div>
  )
}
