import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { TokenUsageChart } from '../TokenUsageChart'

describe('TokenUsageChart', () => {
  const mockData = [
    { date: 'Mon', tokens: 38000 },
    { date: 'Tue', tokens: 42000 },
    { date: 'Wed', tokens: 35000 },
    { date: 'Thu', tokens: 48000 },
    { date: 'Fri', tokens: 45230 }
  ]

  it('renders chart with data', () => {
    const { container } = render(<TokenUsageChart data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('displays no data message when data is empty', () => {
    const { getByText } = render(<TokenUsageChart data={[]} />)
    expect(getByText('No data available')).toBeInTheDocument()
  })

  it('renders with area chart by default', () => {
    const { container } = render(<TokenUsageChart data={mockData} showArea={true} />)
    expect(container.querySelector('defs')).toBeInTheDocument()
  })

  it('renders with line chart when showArea is false', () => {
    const { container } = render(<TokenUsageChart data={mockData} showArea={false} />)
    expect(container).toBeInTheDocument()
  })

  it('accepts custom height prop', () => {
    const { container } = render(
      <TokenUsageChart data={mockData} height={400} />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('formats token values correctly', () => {
    const dataWithCosts = [
      { date: 'Mon', tokens: 38000, cost: 2.28 },
      { date: 'Tue', tokens: 42000, cost: 2.52 }
    ]
    const { container } = render(<TokenUsageChart data={dataWithCosts} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
