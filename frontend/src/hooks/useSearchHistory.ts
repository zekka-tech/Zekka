import { useState, useCallback, useEffect } from 'react'

const SEARCH_HISTORY_KEY = 'search-history'
const DEFAULT_MAX_ITEMS = 10

export interface SearchHistoryItem {
  query: string
  timestamp: number
  category?: string
}

export const useSearchHistory = (maxItems: number = DEFAULT_MAX_ITEMS) => {
  const [history, setHistory] = useState<SearchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(SEARCH_HISTORY_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Persist history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history))
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, [history])

  // Add a search query to history
  const addToHistory = useCallback((query: string, category?: string) => {
    if (!query.trim()) return

    setHistory(prev => {
      // Remove duplicate if it exists
      const filtered = prev.filter(item => item.query !== query)

      // Add new item at the beginning
      const newItem: SearchHistoryItem = {
        query: query.trim(),
        timestamp: Date.now(),
        category
      }

      // Keep only maxItems most recent searches
      return [newItem, ...filtered].slice(0, maxItems)
    })
  }, [maxItems])

  // Remove a specific item from history
  const removeFromHistory = useCallback((query: string) => {
    setHistory(prev => prev.filter(item => item.query !== query))
  }, [])

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  // Get history filtered by category
  const getByCategory = useCallback((category: string) => {
    return history.filter(item => item.category === category)
  }, [history])

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getByCategory,
    isEmpty: history.length === 0
  }
}
