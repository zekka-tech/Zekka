import Fuse, { type FuseResultMatch, type IFuseOptions } from 'fuse.js'

export interface SearchableItem {
  id: string
  title: string
  description?: string
  category?: string
  tags?: string[]
  metadata?: Record<string, any>
}

export interface SearchResult<T> {
  item: T
  score: number
  matches?: FuseResultMatch[]
  highlightedTitle?: string
  highlightedDescription?: string
}

// Create a Fuse.js search index
export const createSearchIndex = <T extends SearchableItem>(
  items: T[],
  options?: Partial<IFuseOptions<T>>
): Fuse<T> => {
  const defaultOptions: IFuseOptions<T> = {
    keys: [
      { name: 'title' as const, weight: 0.8 },
      { name: 'description' as const, weight: 0.5 },
      { name: 'category' as const, weight: 0.3 },
      { name: 'tags' as const, weight: 0.6 }
    ],
    threshold: 0.3,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
    ignoreLocation: true,
    ...options
  } as IFuseOptions<T>

  return new Fuse(items, defaultOptions)
}

// Search items and return formatted results
export const searchItems = <T extends SearchableItem>(
  items: T[],
  query: string,
  options?: Partial<IFuseOptions<T>>
): SearchResult<T>[] => {
  if (!query.trim()) {
    return []
  }

  const fuse = createSearchIndex(items, options)
  const results = fuse.search(query)

  return results.map(result => ({
    item: result.item,
    score: result.score || 0,
    matches: result.matches ? Array.from(result.matches) : undefined,
    highlightedTitle: highlightMatches(result.item.title, result.matches ? Array.from(result.matches) : undefined),
    highlightedDescription: result.item.description
      ? highlightMatches(result.item.description, result.matches ? Array.from(result.matches) : undefined)
      : undefined
  }))
}

// Highlight matched text in a string
export const highlightMatches = (
  text: string,
  matches?: FuseResultMatch[]
): string => {
  if (!matches || matches.length === 0) {
    return text
  }

  // Find matches for this specific key
  const keyMatches = matches.find(m => m.key === 'title' || m.key === 'description')
  if (!keyMatches || !keyMatches.indices) {
    return text
  }

  // Sort indices in reverse order so we can replace without offset issues
  const indices = [...keyMatches.indices].sort((a, b) => b[0] - a[0])

  let result = text
  indices.forEach(([start, end]) => {
    const before = result.substring(0, start)
    const match = result.substring(start, end + 1)
    const after = result.substring(end + 1)
    result = `${before}<mark>${match}</mark>${after}`
  })

  return result
}

// Normalize search query (lowercase, trim, remove extra spaces)
export const normalizeQuery = (query: string): string => {
  return query.trim().toLowerCase().replace(/\s+/g, ' ')
}

// Filter results by category
export const filterByCategory = <T extends SearchableItem>(
  results: SearchResult<T>[],
  category: string
): SearchResult<T>[] => {
  return results.filter(result => result.item.category === category)
}

// Filter results by score threshold
export const filterByScore = <T extends SearchableItem>(
  results: SearchResult<T>[],
  minScore: number = 0.5
): SearchResult<T>[] => {
  return results.filter(result => result.score <= minScore)
}

// Sort results (higher scores first = better matches)
export const sortByRelevance = <T extends SearchableItem>(
  results: SearchResult<T>[]
): SearchResult<T>[] => {
  return [...results].sort((a, b) => (a.score || 0) - (b.score || 0))
}

// Limit results
export const limitResults = <T extends SearchableItem>(
  results: SearchResult<T>[],
  limit: number = 10
): SearchResult<T>[] => {
  return results.slice(0, limit)
}

// Combine all filtering operations
export const processSearchResults = <T extends SearchableItem>(
  results: SearchResult<T>[],
  options?: {
    category?: string
    minScore?: number
    limit?: number
    sortByScore?: boolean
  }
): SearchResult<T>[] => {
  let processed = results

  if (options?.category) {
    processed = filterByCategory(processed, options.category)
  }

  if (options?.minScore !== undefined) {
    processed = filterByScore(processed, options.minScore)
  }

  if (options?.sortByScore !== false) {
    processed = sortByRelevance(processed)
  }

  if (options?.limit) {
    processed = limitResults(processed, options.limit)
  }

  return processed
}
