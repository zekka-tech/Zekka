import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAnalytics } from '../useAnalytics'
import { apiService } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiService: {
    getAnalyticsMetrics: vi.fn()
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

  it('returns empty analytics when the backend summary is unavailable', async () => {
    vi.mocked(apiService.getAnalyticsMetrics).mockResolvedValue(null)

    const { result } = renderHook(() => useAnalytics(), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(apiService.getAnalyticsMetrics).toHaveBeenCalledWith('week')
    expect(result.current.data).toBeNull()
    expect(result.current.isEmpty).toBe(true)
  })

  it('passes the period through and transforms the backend summary payload', async () => {
    vi.mocked(apiService.getAnalyticsMetrics).mockResolvedValue({
      total_projects: 4,
      total_conversations: 12,
      total_messages: 42,
      total_input_tokens: 1000000,
      total_output_tokens: 250000,
      total_cost: 50,
      models_used: 3,
      agents_used: 5
    })

    const { result } = renderHook(() => useAnalytics('month'), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(apiService.getAnalyticsMetrics).toHaveBeenCalledWith('month')
    expect(result.current.data?.tokenUsage).toHaveLength(0)
    expect(result.current.data?.costBreakdown).toHaveLength(0)
    expect(result.current.data?.agentPerformance).toHaveLength(0)
    expect(result.current.data?.combinedMetrics).toHaveLength(0)
    expect(result.current.data?.stats.totalProjects).toBe(4)
    expect(result.current.data?.stats.totalConversations).toBe(12)
    expect(result.current.data?.stats.totalMessages).toBe(42)
    expect(result.current.data?.stats.totalTokens).toBe(1250000)
    expect(result.current.data?.stats.totalCost).toBe(50)
    expect(result.current.data?.stats.averageCostPerToken).toBeCloseTo(0.00004)
    expect(result.current.data?.stats.modelsUsed).toBe(3)
    expect(result.current.data?.stats.agentsUsed).toBe(5)
    expect(result.current.isEmpty).toBe(false)
  })

  it('refetches the analytics summary when refreshed', async () => {
    vi.mocked(apiService.getAnalyticsMetrics).mockResolvedValue({
      total_projects: 1,
      total_conversations: 2,
      total_messages: 3,
      total_input_tokens: 100,
      total_output_tokens: 25,
      total_cost: 1.25,
      models_used: 2,
      agents_used: 1
    })

    const { result } = renderHook(() => useAnalytics(), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(apiService.getAnalyticsMetrics).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.refetch()
    })

    await waitFor(() => expect(apiService.getAnalyticsMetrics).toHaveBeenCalledTimes(2))
  })
})
