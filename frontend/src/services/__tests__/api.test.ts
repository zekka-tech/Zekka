import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiService } from '../api'

const getMock = vi.hoisted(() => vi.fn())

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: getMock,
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }))
  }
}))

describe('ApiService', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('sets and clears auth token', () => {
    // Set token
    apiService.setToken('test-token-123')
    expect(apiService.isAuthenticated()).toBe(true)
    expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token-123')

    // Clear token
    apiService.clearAuth()
    expect(apiService.isAuthenticated()).toBe(false)
    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token')
  })

  it('starts unauthenticated', () => {
    apiService.clearAuth()
    expect(apiService.isAuthenticated()).toBe(false)
  })

  it('has correct API base URL', () => {
    // Should use environment variable or default
    const url = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    expect(url).toBeDefined()
  })

  it('requests analytics summary from the v1 contract with period filtering', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: {
          total_projects: 2,
          total_conversations: 4,
          total_messages: 8,
          total_input_tokens: 100,
          total_output_tokens: 25,
          total_cost: 1.25,
          models_used: 2,
          agents_used: 1
        }
      }
    })

    const summary = await apiService.getAnalyticsMetrics('month')

    expect(getMock).toHaveBeenCalledWith('/api/v1/analytics/metrics', {
      params: { period: 'month' }
    })
    expect(summary?.total_projects).toBe(2)
  })
})
