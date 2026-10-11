import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RunInspector } from '../RunInspector'

const useRunInspectorMock = vi.fn()

vi.mock('@/hooks/useRunInspector', () => ({
  useRunInspector: (runId: string | null) => useRunInspectorMock(runId),
}))

describe('RunInspector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useRunInspectorMock.mockReturnValue({
      run: null,
      events: [],
      loading: false,
      error: null,
    })
  })

  it('prompts to select a run when none is given', () => {
    render(<RunInspector runId={null} />)
    expect(screen.getByText(/Select a run to inspect/i)).toBeInTheDocument()
  })

  it('renders the run header and streamed timeline', () => {
    useRunInspectorMock.mockReturnValue({
      loading: false,
      error: null,
      run: {
        id: 'run-1',
        agent_name: 'Devin',
        goal: 'Build the login page',
        status: 'running',
        steps: 2,
        cost_usd: 0.0123,
        files_written: ['src/Login.tsx'],
      },
      events: [
        { id: 1, step: 0, type: 'plan', tool: null, payload: {} },
        { id: 2, step: 0, type: 'act', tool: 'write_file', payload: { path: 'src/Login.tsx' } },
        { id: 3, step: 0, type: 'observe', tool: 'write_file', payload: { ok: true } },
      ],
    })

    render(<RunInspector runId="run-1" />)

    expect(screen.getByText('Devin')).toBeInTheDocument()
    expect(screen.getByText('Build the login page')).toBeInTheDocument()
    expect(screen.getByText('running')).toBeInTheDocument()
    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(screen.getByText('Act')).toBeInTheDocument()
    expect(screen.getByText('Observe')).toBeInTheDocument()
    // tool chip appears for the act + observe steps
    expect(screen.getAllByText('write_file').length).toBeGreaterThanOrEqual(1)
  })

  it('surfaces load errors', () => {
    useRunInspectorMock.mockReturnValue({
      run: null,
      events: [],
      loading: false,
      error: 'boom',
    })
    render(<RunInspector runId="run-1" />)
    expect(screen.getByText(/Failed to load run: boom/)).toBeInTheDocument()
  })
})
