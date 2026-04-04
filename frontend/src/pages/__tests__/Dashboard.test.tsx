import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { Dashboard } from '../Dashboard'

const mockUseProjects = vi.fn()
const mockChatPanel = vi.fn()

vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => mockUseProjects()
}))

vi.mock('@/components/layout/ThreeColumnLayout', () => ({
  ThreeColumnLayout: ({
    leftPanel,
    centerPanel,
    rightPanel
  }: {
    leftPanel: { children: ReactNode }
    centerPanel: { children: ReactNode }
    rightPanel: { children: ReactNode }
  }) => (
    <div>
      <div data-testid="left-panel">{leftPanel.children}</div>
      <div data-testid="center-panel">{centerPanel.children}</div>
      <div data-testid="right-panel">{rightPanel.children}</div>
    </div>
  )
}))

vi.mock('@/components/layout/SourcesPanel', () => ({
  SourcesPanel: ({ projectId }: { projectId?: string }) => (
    <div data-testid="sources-panel">{projectId ?? 'none'}</div>
  )
}))

vi.mock('@/components/layout/ChatPanel', () => ({
  ChatPanel: (props: Record<string, unknown>) => {
    mockChatPanel(props)
    return <div data-testid="chat-panel">{String(props.projectId ?? 'none')}</div>
  }
}))

vi.mock('@/components/layout/AgentPanel', () => ({
  AgentPanel: () => <div data-testid="agent-panel">agents</div>
}))

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('keeps the persisted project while projects are still loading', () => {
    localStorage.setItem('dashboard-active-project', 'project-2')
    mockUseProjects.mockReturnValue({
      projects: [],
      isLoading: true
    })

    render(<Dashboard />)

    expect(screen.getByTestId('sources-panel')).toHaveTextContent('project-2')
    expect(localStorage.getItem('dashboard-active-project')).toBe('project-2')
  })

  it('preserves a persisted project when it exists in the loaded project list', () => {
    localStorage.setItem('dashboard-active-project', 'project-2')
    mockUseProjects.mockReturnValue({
      projects: [
        { id: 'project-1', name: 'Alpha' },
        { id: 'project-2', name: 'Beta' }
      ],
      isLoading: false
    })

    render(<Dashboard />)

    expect(screen.getByTestId('sources-panel')).toHaveTextContent('project-2')
    expect(mockChatPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-2',
        projectName: 'Beta'
      })
    )
    expect(localStorage.getItem('dashboard-active-project')).toBe('project-2')
  })
})
