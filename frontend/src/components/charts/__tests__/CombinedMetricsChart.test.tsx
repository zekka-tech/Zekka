import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CombinedMetricsChart } from '../CombinedMetricsChart'

describe('CombinedMetricsChart', () => {
  const mockData = [
    { date: 'Mon', tokens: 38000, cost: 2.28 },
    { date: 'Tue', tokens: 42000, cost: 2.52 },
    { date: 'Wed', tokens: 35000, cost: 2.10 },
    { date: 'Thu', tokens: 48000, cost: 2.88 },
    { date: 'Fri', tokens: 45230, cost: 2.84 }
  ]

  it('renders chart with data', () => {
    const { container } = render(<CombinedMetricsChart data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('displays no data message when data is empty', () => {
    const { getByText } = render(<CombinedMetricsChart data={[]} />)
    expect(getByText('No data available')).toBeInTheDocument()
  })

  it('renders composed chart', () => {
    const { container } = render(<CombinedMetricsChart data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts custom height prop', () => {
    const { container } = render(
      <CombinedMetricsChart data={mockData} height={400} />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('calculates and displays stats summary', () => {
    const { getByText } = render(<CombinedMetricsChart data={mockData} />)
    expect(getByText('Total Tokens')).toBeInTheDocument()
    expect(getByText('Total Cost')).toBeInTheDocument()
    expect(getByText('Cost/Token')).toBeInTheDocument()
  })

  it('calculates correct total tokens', () => {
    const { getByText } = render(<CombinedMetricsChart data={mockData} />)
    const totalTokens = mockData.reduce((sum, d) => sum + d.tokens, 0)
    const expectedText = `${(totalTokens / 1000000).toFixed(2)}M`
    expect(getByText(expectedText)).toBeInTheDocument()
  })

  it('calculates correct total cost', () => {
    const { getByText } = render(<CombinedMetricsChart data={mockData} />)
    const totalCost = mockData.reduce((sum, d) => sum + d.cost, 0)
    const expectedText = `$${totalCost.toFixed(2)}`
    expect(getByText(expectedText)).toBeInTheDocument()
  })
})
