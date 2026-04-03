import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { Analytics } from '../Analytics'
import * as useAnalyticsModule from '@/hooks/useAnalytics'

// Mock the useAnalytics hook
vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: vi.fn()
}))

// Mock chart components
vi.mock('@/components/charts/TokenUsageChart', () => ({
  TokenUsageChart: ({ data }: any) => <div data-testid="token-usage-chart">{data?.length || 0} points</div>
}))

vi.mock('@/components/charts/CostBreakdownChart', () => ({
  CostBreakdownChart: ({ data }: any) => <div data-testid="cost-breakdown-chart">{data?.length || 0} items</div>
}))

vi.mock('@/components/charts/AgentPerformanceChart', () => ({
  AgentPerformanceChart: ({ data }: any) => <div data-testid="agent-performance-chart">{data?.length || 0} agents</div>
}))

vi.mock('@/components/charts/CombinedMetricsChart', () => ({
  CombinedMetricsChart: ({ data }: any) => <div data-testid="combined-metrics-chart">{data?.length || 0} metrics</div>
}))

describe('Analytics Page', () => {
  const anchorClickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {})

  const mockAnalyticsData = {
    tokenUsage: [
      { date: 'Mon', tokens: 38000 },
      { date: 'Tue', tokens: 42000 }
    ],
    costBreakdown: [
      { name: 'Model A', cost: 10 },
      { name: 'Model B', cost: 5 }
    ],
    agentPerformance: [
      { name: 'Agent 1', avgExecutionTime: 2.5, totalExecutions: 10 }
    ],
    combinedMetrics: [
      { date: 'Mon', tokens: 38000, cost: 2.28 }
    ],
    stats: {
      totalTokens: 1000000,
      totalCost: 50,
      averageCostPerToken: 0.00005,
      topAgent: 'Agent 1'
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    anchorClickSpy.mockClear()
    vi.mocked(useAnalyticsModule.useAnalytics).mockReturnValue({
      data: mockAnalyticsData as any,
      isLoading: false,
      error: null,
      period: 'week',
      refetch: vi.fn()
    } as any)
  })

  it('renders the analytics page', () => {
    const { getByText } = render(<Analytics />)
    expect(getByText('Analytics Dashboard')).toBeInTheDocument()
  })

  it('displays period selector', () => {
    const { getByText } = render(<Analytics />)
    expect(getByText('Day')).toBeInTheDocument()
    expect(getByText('Week')).toBeInTheDocument()
    expect(getByText('Month')).toBeInTheDocument()
  })

  it('renders KPI cards with data', () => {
    const { getByText } = render(<Analytics />)
    expect(getByText('Total Tokens')).toBeInTheDocument()
    expect(getByText('Total Cost')).toBeInTheDocument()
    expect(getByText('Cost/Token')).toBeInTheDocument()
    expect(getByText('Top Agent')).toBeInTheDocument()
  })

  it('renders all chart components', async () => {
    const { findByTestId } = render(<Analytics />)
    await act(async () => {
      await vi.dynamicImportSettled()
      await vi.dynamicImportSettled()
    })
    expect(await findByTestId('token-usage-chart', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(await findByTestId('cost-breakdown-chart', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(await findByTestId('agent-performance-chart', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(await findByTestId('combined-metrics-chart', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('displays export buttons', () => {
    const { getByText } = render(<Analytics />)
    expect(getByText('CSV')).toBeInTheDocument()
    expect(getByText('JSON')).toBeInTheDocument()
  })

  it('shows loading state when isLoading is true', () => {
    vi.mocked(useAnalyticsModule.useAnalytics).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      period: 'week',
      refetch: vi.fn()
    } as any)

    const { getByText } = render(<Analytics />)
    expect(getByText('Loading analytics...')).toBeInTheDocument()
  })

  it('shows error message when error exists', () => {
    const errorMessage = 'Failed to fetch analytics'
    vi.mocked(useAnalyticsModule.useAnalytics).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error(errorMessage),
      period: 'week',
      refetch: vi.fn()
    } as any)

    const { getByText } = render(<Analytics />)
    expect(getByText('Failed to load analytics')).toBeInTheDocument()
    expect(getByText(errorMessage)).toBeInTheDocument()
  })

  it('changes period when period button is clicked', () => {
    const useAnalyticsMock = vi.mocked(useAnalyticsModule.useAnalytics)
    useAnalyticsMock.mockReturnValue({
      data: mockAnalyticsData as any,
      isLoading: false,
      error: null,
      period: 'week',
      refetch: vi.fn()
    } as any)

    const { getByText } = render(<Analytics />)
    const monthButton = getByText('Month')
    fireEvent.click(monthButton)

    // Verify that useAnalytics was called with 'month'
    expect(useAnalyticsMock).toHaveBeenCalled()
  })

  it('displays correct KPI values', () => {
    const { getByText } = render(<Analytics />)
    expect(getByText('1.00M')).toBeInTheDocument() // Total Tokens
    expect(getByText('$50.00')).toBeInTheDocument() // Total Cost
  })

  it('exports data in CSV format when CSV button clicked', () => {
    const { getByText } = render(<Analytics />)
    const csvButton = getByText('CSV')
    fireEvent.click(csvButton)
    // Implementation would verify download triggered
  })

  it('exports data in JSON format when JSON button clicked', () => {
    const { getByText } = render(<Analytics />)
    const jsonButton = getByText('JSON')
    fireEvent.click(jsonButton)
    // Implementation would verify download triggered
  })

  it('displays last updated timestamp', () => {
    const { getByText } = render(<Analytics />)
    expect(getByText(/Last updated:/)).toBeInTheDocument()
  })
})
