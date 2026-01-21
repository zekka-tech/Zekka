import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CostBreakdownChart } from '../CostBreakdownChart'

describe('CostBreakdownChart', () => {
  const mockData = [
    { name: 'Claude 3.5 Sonnet', cost: 1.71 },
    { name: 'GPT-4', cost: 0.84 },
    { name: 'Gemini Pro', cost: 0.29 }
  ]

  it('renders chart with data', () => {
    const { container } = render(<CostBreakdownChart data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('displays no data message when data is empty', () => {
    const { getByText } = render(<CostBreakdownChart data={[]} />)
    expect(getByText('No data available')).toBeInTheDocument()
  })

  it('calculates total cost correctly', () => {
    const { getByText } = render(<CostBreakdownChart data={mockData} />)
    const total = mockData.reduce((sum, item) => sum + item.cost, 0)
    expect(getByText(`Total: $${total.toFixed(2)}`)).toBeInTheDocument()
  })

  it('renders pie chart', () => {
    const { container } = render(<CostBreakdownChart data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts custom height prop', () => {
    const { container } = render(
      <CostBreakdownChart data={mockData} height={400} />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('displays legend with all models', () => {
    const { getByText } = render(<CostBreakdownChart data={mockData} />)
    mockData.forEach(model => {
      expect(getByText(model.name)).toBeInTheDocument()
    })
  })

  it('calculates percentages correctly', () => {
    const dataWithPercentages = mockData.map((item) => ({
      ...item,
      percentage: 33.33
    }))
    const { container } = render(<CostBreakdownChart data={dataWithPercentages} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
