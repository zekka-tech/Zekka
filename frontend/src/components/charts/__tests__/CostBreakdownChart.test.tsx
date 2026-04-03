import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/test-utils'
import { CostBreakdownChart } from '../CostBreakdownChart'

describe('CostBreakdownChart', () => {
  const mockData = [
    { name: 'Claude 3.5 Sonnet', cost: 1.71 },
    { name: 'GPT-4', cost: 0.84 },
    { name: 'Gemini Pro', cost: 0.29 }
  ]

  it('renders title, total, and legend entries', () => {
    renderWithProviders(<CostBreakdownChart data={mockData} />)
    const total = mockData.reduce((sum, item) => sum + item.cost, 0)

    expect(screen.getByText('Cost Breakdown')).toBeInTheDocument()
    expect(screen.getByText(`Total: $${total.toFixed(2)}`)).toBeInTheDocument()
    for (const model of mockData) {
      expect(screen.getByText(model.name)).toBeInTheDocument()
    }
  })

  it('shows empty-state when no data is provided', () => {
    renderWithProviders(<CostBreakdownChart data={[]} />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })
})
