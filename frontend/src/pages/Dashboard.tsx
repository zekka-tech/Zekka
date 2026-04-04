import { useEffect, useMemo, useState } from 'react'
import { ThreeColumnLayout } from '@/components/layout/ThreeColumnLayout'
import { SourcesPanel } from '@/components/layout/SourcesPanel'
import { ChatPanel } from '@/components/layout/ChatPanel'
import { AgentPanel } from '@/components/layout/AgentPanel'
import { useProjects } from '@/hooks/useProjects'
import type { Project } from '@/types/project.types'

export const Dashboard = () => {
  const { projects: rawProjects = [], isLoading: projectsLoading } = useProjects()
  const projects = useMemo<Project[]>(() => {
    if (Array.isArray(rawProjects)) {
      return rawProjects as Project[]
    }

    if (Array.isArray((rawProjects as { data?: Project[] })?.data)) {
      return (rawProjects as { data: Project[] }).data
    }

    return []
  }, [rawProjects])

  const [activeProjectId, setActiveProjectId] = useState<string | undefined>(() => {
    return localStorage.getItem('dashboard-active-project') || undefined
  })

  useEffect(() => {
    if (projectsLoading) {
      return
    }

    if (projects.length === 0) {
      setActiveProjectId(undefined)
      localStorage.removeItem('dashboard-active-project')
      return
    }

    if (activeProjectId && projects.some((project) => project.id === activeProjectId)) {
      return
    }

    const nextProjectId = projects[0].id
    setActiveProjectId(nextProjectId)
    localStorage.setItem('dashboard-active-project', nextProjectId)
  }, [activeProjectId, projects, projectsLoading])

  const handleProjectChange = (projectId: string) => {
    setActiveProjectId(projectId)
    localStorage.setItem('dashboard-active-project', projectId)
  }

  const activeProject = projects.find((project) => project.id === activeProjectId)

  return (
    <ThreeColumnLayout
      leftPanel={{
        id: 'sources',
        children: <SourcesPanel projectId={activeProjectId} />,
        defaultWidth: 280,
        collapsible: true,
      }}
      centerPanel={{
        id: 'chat',
        children: (
          <ChatPanel
            projectId={activeProjectId}
            projectName={activeProject?.name}
            projects={projects}
            projectsLoading={projectsLoading}
            onProjectChange={handleProjectChange}
          />
        ),
        defaultWidth: 600,
      }}
      rightPanel={{
        id: 'agents',
        children: <AgentPanel />,
        defaultWidth: 360,
        collapsible: true,
      }}
    />
  )
}
