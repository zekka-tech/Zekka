import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAnalytics } from '../useAnalytics'
import { apiService } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiService: {
    getMetrics: vi.fn(),
    getCosts: vi.fn(),
    getCostsBreakdown: vi.fn()
  }
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 }
    }
  })

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty transformed data when APIs return nullish values', async () => {
    vi.mocked(apiService.getMetrics).mockResolvedValue(null)
    vi.mocked(apiService.getCosts).mockResolvedValue(null)
    vi.mocked(apiService.getCostsBreakdown).mockResolvedValue(null)

    const { result } = renderHook(() => useAnalytics(), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toBeNull()
  })

  it('transforms metrics and costs for charts', async () => {
    const metrics = {
      totalTokens: 1000000,
      timeline: [
        { timestamp: '2024-01-15T10:00:00Z', tokens: 100000, cost: 5 },
        { timestamp: '2024-01-15T11:00:00Z', tokens: 150000, cost: 7.5 }
      ],
      byAgent: {
        'Agent 1': { totalExecutions: 10, avgExecutionTime: 2.5, successRate: 0.95 },
        'Agent 2': { totalExecutions: 8, avgExecutionTime: 1.8, successRate: 0.9 }
      }
    }

    const costs = {
      totalCost: 50,
      byModel: {
        'Model A': { cost: 30 },
        'Model B': { cost: 20 }
      }
    }

    vi.mocked(apiService.getMetrics).mockResolvedValue(metrics)
    vi.mocked(apiService.getCosts).mockResolvedValue(costs)
    vi.mocked(apiService.getCostsBreakdown).mockResolvedValue(costs)

    const { result } = renderHook(() => useAnalytics('week'), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data?.tokenUsage).toHaveLength(2)
    expect(result.current.data?.costBreakdown).toHaveLength(2)
    expect(result.current.data?.agentPerformance).toHaveLength(2)
    expect(result.current.data?.stats.totalTokens).toBe(1000000)
    expect(result.current.data?.stats.totalCost).toBe(50)
  })

  it('calculates statistics correctly', async () => {
    vi.mocked(apiService.getMetrics).mockResolvedValue({
      totalTokens: 1000000,
      timeline: [],
      byAgent: {
        TopAgent: { totalExecutions: 100, avgExecutionTime: 2.5 }
      }
    })
    vi.mocked(apiService.getCosts).mockResolvedValue({
      totalCost: 50,
      byModel: {
        TopModel: { cost: 30 },
        OtherModel: { cost: 20 }
      }
    })
    vi.mocked(apiService.getCostsBreakdown).mockResolvedValue({
      byModel: {
        TopModel: { cost: 30 },
        OtherModel: { cost: 20 }
      }
    })

    const { result } = renderHook(() => useAnalytics(), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data?.stats.totalTokens).toBe(1000000)
    expect(result.current.data?.stats.totalCost).toBe(50)
    expect(result.current.data?.stats.averageCostPerToken).toBeCloseTo(0.00005)
    expect(result.current.data?.stats.topAgent).toBe('TopAgent')
    expect(result.current.data?.stats.topModel).toBe('TopModel')
  })
})
