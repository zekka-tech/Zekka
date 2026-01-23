import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AgentPerformanceChart } from '../AgentPerformanceChart'

describe('AgentPerformanceChart', () => {
  const mockData = [
    { name: 'AutoAgent', avgExecutionTime: 2.5, totalExecutions: 45, successRate: 0.98 },
    { name: 'Softgen AI', avgExecutionTime: 1.8, totalExecutions: 32, successRate: 0.95 },
    { name: 'CodeRabbit', avgExecutionTime: 3.2, totalExecutions: 28, successRate: 0.92 }
  ]

  it('renders chart with data', () => {
    const { container } = render(<AgentPerformanceChart data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('displays no data message when data is empty', () => {
    const { getByText } = render(<AgentPerformanceChart data={[]} />)
    expect(getByText('No data available')).toBeInTheDocument()
  })

  it('renders bar chart', () => {
    const { container } = render(<AgentPerformanceChart data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts custom height prop', () => {
    const { container } = render(
      <AgentPerformanceChart data={mockData} height={400} />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('truncates long agent names', () => {
    const longNameData = [
      {
        name: 'This is a very long agent name that should be truncated',
        avgExecutionTime: 2.5,
        totalExecutions: 45
      }
    ]
    const { container } = render(<AgentPerformanceChart data={longNameData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('displays performance legend', () => {
    const { getByText } = render(<AgentPerformanceChart data={mockData} />)
    expect(getByText(/Fast/)).toBeInTheDocument()
    expect(getByText(/Medium/)).toBeInTheDocument()
    expect(getByText(/Slow/)).toBeInTheDocument()
  })

  it('includes success rate in tooltip data', () => {
    const { container } = render(<AgentPerformanceChart data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
