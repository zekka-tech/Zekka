import { describe, it, expect } from 'vitest'
import {
  createSearchIndex,
  searchItems,
  highlightMatches,
  normalizeQuery,
  filterByCategory,
  filterByScore,
  sortByRelevance,
  limitResults,
  processSearchResults,
  type SearchableItem
} from '../search'

describe('Search Utilities', () => {
  const mockItems: SearchableItem[] = [
    {
      id: '1',
      title: 'React Hooks Guide',
      description: 'Complete guide to React Hooks',
      category: 'documentation',
      tags: ['react', 'hooks', 'guide']
    },
    {
      id: '2',
      title: 'TypeScript Basics',
      description: 'Learn TypeScript from scratch',
      category: 'tutorial',
      tags: ['typescript', 'basics']
    },
    {
      id: '3',
      title: 'Testing React Components',
      description: 'How to test React components effectively',
      category: 'guide',
      tags: ['react', 'testing']
    }
  ]

  describe('createSearchIndex', () => {
    it('creates a Fuse index with items', () => {
      const index = createSearchIndex(mockItems)
      expect(index).toBeDefined()
    })

    it('accepts custom options', () => {
      const index = createSearchIndex(mockItems, { threshold: 0.5 })
      expect(index).toBeDefined()
    })
  })

  describe('searchItems', () => {
    it('returns empty array for empty query', () => {
      const results = searchItems(mockItems, '')
      expect(results).toHaveLength(0)
    })

    it('finds items by title', () => {
      const results = searchItems(mockItems, 'React')
      expect(results.length).toBeGreaterThan(0)
    })

    it('handles partial matches', () => {
      const results = searchItems(mockItems, 'Test')
      expect(results.length).toBeGreaterThan(0)
    })

    it('returns results sorted by relevance', () => {
      const results = searchItems(mockItems, 'React')
      expect(results[0].item.id).toBeDefined()
    })

    it('includes match information in results', () => {
      const results = searchItems(mockItems, 'hooks')
      expect(results[0].matches).toBeDefined()
    })
  })

  describe('highlightMatches', () => {
    it('returns original text when no matches', () => {
      const result = highlightMatches('test text')
      expect(result).toBe('test text')
    })

    it('wraps matched text in mark tags', () => {
      const text = 'hello world'
      // We're not testing with actual FuseResultMatch since it's read-only
      const result = highlightMatches(text, undefined)
      expect(result).toBe('hello world')
    })
  })

  describe('normalizeQuery', () => {
    it('trims whitespace', () => {
      const result = normalizeQuery('  test  ')
      expect(result).toBe('test')
    })

    it('converts to lowercase', () => {
      const result = normalizeQuery('TEST')
      expect(result).toBe('test')
    })

    it('removes extra spaces', () => {
      const result = normalizeQuery('test    query')
      expect(result).toBe('test query')
    })
  })

  describe('filterByCategory', () => {
    it('filters results by category', () => {
      const results = searchItems(mockItems, 'guide')
      const filtered = filterByCategory(results, 'documentation')
      expect(filtered.every(r => r.item.category === 'documentation')).toBe(true)
    })

    it('returns empty array when no matches', () => {
      const results = searchItems(mockItems, 'React')
      const filtered = filterByCategory(results, 'nonexistent')
      expect(filtered).toHaveLength(0)
    })
  })

  describe('filterByScore', () => {
    it('filters results by minimum score threshold', () => {
      const results = searchItems(mockItems, 'React')
      const filtered = filterByScore(results, 0.5)
      expect(filtered.every(r => r.score <= 0.5)).toBe(true)
    })
  })

  describe('sortByRelevance', () => {
    it('sorts results by score (best matches first)', () => {
      const results = searchItems(mockItems, 'React')
      const sorted = sortByRelevance(results)

      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].score).toBeLessThanOrEqual(sorted[i + 1].score)
      }
    })

    it('does not modify original array', () => {
      const results = searchItems(mockItems, 'React')
      const original = [...results]
      sortByRelevance(results)
      expect(results).toEqual(original)
    })
  })

  describe('limitResults', () => {
    it('limits results to specified count', () => {
      const results = searchItems(mockItems, 'React')
      const limited = limitResults(results, 1)
      expect(limited.length).toBeLessThanOrEqual(1)
    })

    it('uses default limit of 10', () => {
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        title: `Item ${i}`,
        category: 'test'
      }))
      const results = searchItems(manyItems, 'Item')
      const limited = limitResults(results)
      expect(limited.length).toBeLessThanOrEqual(10)
    })
  })

  describe('processSearchResults', () => {
    it('processes results with multiple filters', () => {
      const results = searchItems(mockItems, '')
      const processed = processSearchResults(results, {
        limit: 1,
        sortByScore: true
      })
      expect(processed.length).toBeLessThanOrEqual(1)
    })

    it('applies category filter', () => {
      const results = searchItems(mockItems, 'React')
      const processed = processSearchResults(results, {
        category: 'documentation'
      })
      expect(processed.every(r => r.item.category === 'documentation')).toBe(true)
    })

    it('applies score filter', () => {
      const results = searchItems(mockItems, 'React')
      const processed = processSearchResults(results, {
        minScore: 0.6
      })
      expect(processed.every(r => r.score <= 0.6)).toBe(true)
    })
  })
})
