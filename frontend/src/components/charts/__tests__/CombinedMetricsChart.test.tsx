import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/test-utils'
import { CombinedMetricsChart } from '../CombinedMetricsChart'

describe('CombinedMetricsChart', () => {
  const mockData = [
    { date: 'Mon', tokens: 38000, cost: 2.28 },
    { date: 'Tue', tokens: 42000, cost: 2.52 },
    { date: 'Wed', tokens: 35000, cost: 2.10 },
    { date: 'Thu', tokens: 48000, cost: 2.88 },
    { date: 'Fri', tokens: 45230, cost: 2.84 }
  ]

  it('renders chart summary and computed stats', () => {
    renderWithProviders(<CombinedMetricsChart data={mockData} />)

    const totalTokens = mockData.reduce((sum, d) => sum + d.tokens, 0)
    const totalCost = mockData.reduce((sum, d) => sum + d.cost, 0)

    expect(screen.getByText('Tokens & Costs')).toBeInTheDocument()
    expect(screen.getByText('Total Tokens')).toBeInTheDocument()
    expect(screen.getByText('Total Cost')).toBeInTheDocument()
    expect(screen.getByText('Cost/Token')).toBeInTheDocument()
    expect(screen.getByText(`${(totalTokens / 1000000).toFixed(2)}M`)).toBeInTheDocument()
    expect(screen.getByText(`$${totalCost.toFixed(2)}`)).toBeInTheDocument()
  })

  it('shows empty-state when data is empty', () => {
    renderWithProviders(<CombinedMetricsChart data={[]} />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })
})
