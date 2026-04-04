import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentDashboard } from '../AgentDashboard'

const useAgentsMock = vi.fn()

vi.mock('@/hooks/useAgents', () => ({
  useAgents: () => useAgentsMock()
}))

describe('AgentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAgentsMock.mockReturnValue({
      agents: [],
      isLoading: false,
      error: null
    })
  })

  it('shows an explicit empty state when no agents are connected', () => {
    render(<AgentDashboard />)

    expect(screen.getByText('No agents connected')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Connect the orchestration backend to surface live agent activity, token usage, and execution status.'
      )
    ).toBeInTheDocument()
  })

  it('renders live agents when the backend returns agent data', () => {
    useAgentsMock.mockReturnValue({
      agents: [
        {
          id: 'agent-1',
          name: 'Executor',
          type: 'implementation',
          status: 'active',
          progress: 80,
          tokenUsage: {
            input: 1200,
            output: 800,
            cost: 0.12
          }
        }
      ],
      isLoading: false,
      error: null
    })

    render(<AgentDashboard />)

    expect(screen.getByText('Executor')).toBeInTheDocument()
    expect(screen.getByText('1,200')).toBeInTheDocument()
  })

  it('shows an unavailable state when the agent query fails', () => {
    useAgentsMock.mockReturnValue({
      agents: [],
      isLoading: false,
      error: new Error('Agent service unavailable')
    })

    render(<AgentDashboard />)

    expect(screen.getByText('Unable to load agents')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Agent telemetry is unavailable until the backend orchestration service is reachable.'
      )
    ).toBeInTheDocument()
  })
})
