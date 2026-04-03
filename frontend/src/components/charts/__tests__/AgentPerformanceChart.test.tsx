import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/test-utils'
import { AgentPerformanceChart } from '../AgentPerformanceChart'

describe('AgentPerformanceChart', () => {
  const mockData = [
    { name: 'AutoAgent', avgExecutionTime: 2.5, totalExecutions: 45, successRate: 0.98 },
    { name: 'Softgen AI', avgExecutionTime: 1.8, totalExecutions: 32, successRate: 0.95 },
    { name: 'CodeRabbit', avgExecutionTime: 3.2, totalExecutions: 28, successRate: 0.92 }
  ]

  it('renders title and legend when data is present', () => {
    renderWithProviders(<AgentPerformanceChart data={mockData} />)
    expect(screen.getByText('Agent Performance')).toBeInTheDocument()
    expect(screen.getByText(/Average execution time/i)).toBeInTheDocument()
    expect(screen.getByText(/Fast/i)).toBeInTheDocument()
    expect(screen.getByText(/Medium/i)).toBeInTheDocument()
    expect(screen.getByText(/Slow/i)).toBeInTheDocument()
  })

  it('displays empty-state message when no data exists', () => {
    renderWithProviders(<AgentPerformanceChart data={[]} />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('accepts long names without crashing', () => {
    renderWithProviders(
      <AgentPerformanceChart
        data={[
          {
            name: 'This is a very long agent name that should be truncated',
            avgExecutionTime: 2.5,
            totalExecutions: 45
          }
        ]}
      />
    )
    expect(screen.getByText('Agent Performance')).toBeInTheDocument()
  })
})
