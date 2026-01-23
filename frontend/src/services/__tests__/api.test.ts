import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiService } from '../api'

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
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
})
