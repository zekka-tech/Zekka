import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAnalytics } from '../useAnalytics'
import { apiService } from '@/services/api'

// Mock the API service
vi.mock('@/services/api', () => ({
  apiService: {
    getMetrics: vi.fn(),
    getCosts: vi.fn(),
    getCostsBreakdown: vi.fn()
  }
}))

// Mock React Query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return {
    ...actual,
    useQuery: vi.fn(({ queryFn }) => {
      try {
        const data = queryFn()
        return { data, isLoading: false, error: null }
      } catch (error) {
        return { data: null, isLoading: false, error }
      }
    })
  }
})

describe('useAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns default values when data is null', () => {
    vi.mocked(apiService.getMetrics).mockResolvedValue(null)
    vi.mocked(apiService.getCosts).mockResolvedValue(null)

    const { result } = renderHook(() => useAnalytics())

    expect(result.current.data).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('transforms metrics data correctly', () => {
    const mockMetrics = {
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

    const mockCosts = {
      totalCost: 50,
      byModel: {
        'Model A': { cost: 30 },
        'Model B': { cost: 20 }
      }
    }

    vi.mocked(apiService.getMetrics).mockResolvedValue(mockMetrics)
    vi.mocked(apiService.getCosts).mockResolvedValue(mockCosts)
    vi.mocked(apiService.getCostsBreakdown).mockResolvedValue(mockCosts)

    const { result } = renderHook(() => useAnalytics('week'))

    expect(result.current.data?.tokenUsage).toBeDefined()
    expect(result.current.data?.costBreakdown).toBeDefined()
    expect(result.current.data?.agentPerformance).toBeDefined()
    expect(result.current.data?.stats).toBeDefined()
  })

  it('calculates statistics correctly', () => {
    const mockMetrics = {
      totalTokens: 1000000,
      timeline: [],
      byAgent: {
        'TopAgent': { totalExecutions: 100, avgExecutionTime: 2.5 }
      }
    }

    const mockCosts = {
      totalCost: 50,
      byModel: {
        'TopModel': { cost: 30 },
        'OtherModel': { cost: 20 }
      }
    }

    vi.mocked(apiService.getMetrics).mockResolvedValue(mockMetrics)
    vi.mocked(apiService.getCosts).mockResolvedValue(mockCosts)
    vi.mocked(apiService.getCostsBreakdown).mockResolvedValue(mockCosts)

    const { result } = renderHook(() => useAnalytics())

    expect(result.current.data?.stats.totalTokens).toBe(1000000)
    expect(result.current.data?.stats.totalCost).toBe(50)
    expect(result.current.data?.stats.averageCostPerToken).toBeCloseTo(0.00005)
  })

  it('accepts different periods', () => {
    vi.mocked(apiService.getMetrics).mockResolvedValue({ timeline: [], totalTokens: 0, byAgent: {} })
    vi.mocked(apiService.getCosts).mockResolvedValue({ totalCost: 0, byModel: {} })
    vi.mocked(apiService.getCostsBreakdown).mockResolvedValue({ byModel: {} })

    const { result: dayResult } = renderHook(() => useAnalytics('day'))
    const { result: weekResult } = renderHook(() => useAnalytics('week'))
    const { result: monthResult } = renderHook(() => useAnalytics('month'))

    expect(dayResult.current.period).toBe('day')
    expect(weekResult.current.period).toBe('week')
    expect(monthResult.current.period).toBe('month')
  })

  it('handles empty responses gracefully', () => {
    vi.mocked(apiService.getMetrics).mockResolvedValue({
      totalTokens: 0,
      timeline: [],
      byAgent: {}
    })
    vi.mocked(apiService.getCosts).mockResolvedValue({
      totalCost: 0,
      byModel: {}
    })
    vi.mocked(apiService.getCostsBreakdown).mockResolvedValue({
      byModel: {}
    })

    const { result } = renderHook(() => useAnalytics())

    expect(result.current.data?.tokenUsage).toEqual([])
    expect(result.current.data?.costBreakdown).toEqual([])
    expect(result.current.data?.agentPerformance).toEqual([])
  })
})
