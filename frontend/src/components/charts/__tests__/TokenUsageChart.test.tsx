import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/test-utils'
import { TokenUsageChart } from '../TokenUsageChart'

describe('TokenUsageChart', () => {
  const mockData = [
    { date: 'Mon', tokens: 38000 },
    { date: 'Tue', tokens: 42000 },
    { date: 'Wed', tokens: 35000 },
    { date: 'Thu', tokens: 48000 },
    { date: 'Fri', tokens: 45230 }
  ]

  it('renders chart container when data exists', () => {
    const { container } = renderWithProviders(<TokenUsageChart data={mockData} />)
    expect(container.firstChild).toBeInTheDocument()
    expect(screen.queryByText('No data available')).not.toBeInTheDocument()
  })

  it('renders empty-state for no data', () => {
    renderWithProviders(<TokenUsageChart data={[]} />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('supports non-area mode and custom height without crashing', () => {
    const { container } = renderWithProviders(
      <TokenUsageChart data={mockData} showArea={false} height={400} />
    )
    expect(container.firstChild).toBeInTheDocument()
  })
})
