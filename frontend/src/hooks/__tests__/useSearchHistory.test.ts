import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSearchHistory } from '../useSearchHistory'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    })
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('useSearchHistory', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('initializes with empty history', () => {
    const { result } = renderHook(() => useSearchHistory())
    expect(result.current.history).toHaveLength(0)
    expect(result.current.isEmpty).toBe(true)
  })

  it('adds search query to history', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => {
      result.current.addToHistory('React')
    })

    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0].query).toBe('React')
  })

  it('ignores empty queries', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => {
      result.current.addToHistory('')
      result.current.addToHistory('   ')
    })

    expect(result.current.history).toHaveLength(0)
  })

  it('removes duplicates when adding', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => {
      result.current.addToHistory('React')
      result.current.addToHistory('Vue')
      result.current.addToHistory('React') // Duplicate
    })

    expect(result.current.history).toHaveLength(2)
    expect(result.current.history[0].query).toBe('React') // Most recent first
  })

  it('respects max items limit', () => {
    const { result } = renderHook(() => useSearchHistory(3))

    act(() => {
      result.current.addToHistory('Item 1')
      result.current.addToHistory('Item 2')
      result.current.addToHistory('Item 3')
      result.current.addToHistory('Item 4') // Should remove Item 1
    })

    expect(result.current.history).toHaveLength(3)
    expect(result.current.history.map(h => h.query)).not.toContain('Item 1')
  })

  it('removes item from history', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => {
      result.current.addToHistory('React')
      result.current.addToHistory('Vue')
    })

    act(() => {
      result.current.removeFromHistory('React')
    })

    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0].query).toBe('Vue')
  })

  it('clears all history', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => {
      result.current.addToHistory('React')
      result.current.addToHistory('Vue')
    })

    act(() => {
      result.current.clearHistory()
    })

    expect(result.current.history).toHaveLength(0)
    expect(result.current.isEmpty).toBe(true)
  })

  it('filters history by category', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => {
      result.current.addToHistory('React', 'framework')
      result.current.addToHistory('Node', 'runtime')
      result.current.addToHistory('Vue', 'framework')
    })

    const frameworkHistory = result.current.getByCategory('framework')
    expect(frameworkHistory).toHaveLength(2)
    expect(frameworkHistory.every(h => h.category === 'framework')).toBe(true)
  })

  it('persists history to localStorage', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => {
      result.current.addToHistory('React')
    })

    expect(localStorageMock.setItem).toHaveBeenCalled()
    const stored = localStorage.getItem('search-history')
    expect(stored).toBeDefined()
  })

  it('loads history from localStorage on mount', () => {
    const mockHistory = [
      { query: 'React', timestamp: Date.now(), category: 'framework' }
    ]
    localStorageMock.setItem('search-history', JSON.stringify(mockHistory))

    const { result } = renderHook(() => useSearchHistory())

    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0].query).toBe('React')
  })

  it('trims whitespace from queries', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => {
      result.current.addToHistory('  React  ')
    })

    expect(result.current.history[0].query).toBe('React')
  })

  it('includes timestamp for each entry', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => {
      result.current.addToHistory('React')
    })

    expect(result.current.history[0].timestamp).toBeDefined()
    expect(typeof result.current.history[0].timestamp).toBe('number')
  })
})
