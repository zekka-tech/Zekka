import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useUnifiedSearch } from '../useUnifiedSearch'

// Mock the individual data hooks
vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({
    projects: [
      {
        id: 'proj1',
        name: 'React Dashboard',
        description: 'Dashboard for analytics',
        category: 'project',
      },
      {
        id: 'proj2',
        name: 'API Server',
        description: 'Backend API for data',
        category: 'project',
      },
    ],
  }),
}))

vi.mock('@/hooks/useConversations', () => ({
  useConversations: () => ({
    conversations: [
      {
        id: 'conv1',
        title: 'React hooks discussion',
        description: 'How to use React hooks',
        category: 'conversation',
      },
      {
        id: 'conv2',
        title: 'TypeScript guide',
        description: 'TypeScript basics',
        category: 'conversation',
      },
    ],
  }),
}))

vi.mock('@/hooks/useAgents', () => ({
  useAgents: () => ({
    agents: [
      {
        id: 'agent1',
        name: 'Analytics Agent',
        description: 'Analyzes metrics',
        category: 'agent',
      },
    ],
  }),
}))

describe('useUnifiedSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns search result object', () => {
    const { result } = renderHook(() => useUnifiedSearch('', {}))

    expect(result.current.projects).toBeDefined()
    expect(result.current.conversations).toBeDefined()
    expect(result.current.agents).toBeDefined()
    expect(result.current.all).toBeDefined()
    expect(result.current.total).toBeDefined()
    expect(result.current.isEmpty).toBeDefined()
  })

  it('searches across projects', () => {
    const { result } = renderHook(() => useUnifiedSearch('React', {}))

    expect(result.current.projects.length).toBeGreaterThan(0)
  })

  it('searches across conversations', () => {
    const { result } = renderHook(() => useUnifiedSearch('hooks', {}))

    expect(result.current.conversations.length).toBeGreaterThan(0)
  })

  it('searches across agents', () => {
    const { result } = renderHook(() => useUnifiedSearch('Analytics', {}))

    expect(result.current.agents.length).toBeGreaterThan(0)
  })

  it('combines results from all sources', () => {
    const { result } = renderHook(() => useUnifiedSearch('guide', {}))

    expect(result.current.all.length).toBeGreaterThan(0)
  })

  it('returns empty results for no matches', () => {
    const { result } = renderHook(() => useUnifiedSearch('xyzabc', {}))

    expect(result.current.isEmpty).toBe(true)
  })

  it('returns correct total count', () => {
    const { result } = renderHook(() => useUnifiedSearch('', {}))

    expect(result.current.total).toBe(result.current.all.length)
  })

  it('respects empty query', () => {
    const { result } = renderHook(() => useUnifiedSearch('', {}))

    expect(result.current.all.length).toBe(0)
  })

  it('is case insensitive', () => {
    const { result: result1 } = renderHook(() => useUnifiedSearch('react', {}))
    const { result: result2 } = renderHook(() => useUnifiedSearch('REACT', {}))

    expect(result1.current.all.length).toBe(result2.current.all.length)
  })

  it('filters by category when provided', () => {
    const { result } = renderHook(() =>
      useUnifiedSearch('', { category: 'projects' })
    )

    expect(result.current.all.every(item => item.item.category === 'project')).toBe(true)
  })

  it('has getByCategory method', () => {
    const { result } = renderHook(() => useUnifiedSearch('Analytics', {}))

    expect(result.current.getByCategory).toBeDefined()
  })

  it('getByCategory filters correctly', () => {
    const { result } = renderHook(() => useUnifiedSearch('Analytics', {}))

    const agents = result.current.getByCategory('agents')
    expect(agents.every(item => item.item.category === 'agent')).toBe(true)
  })

  it('handles null/undefined results gracefully', () => {
    const { result } = renderHook(() => useUnifiedSearch('', {}))

    expect(result.current.projects).toBeDefined()
    expect(Array.isArray(result.current.projects)).toBe(true)
  })

  it('merges all results into single array', () => {
    const { result } = renderHook(() => useUnifiedSearch('', {}))

    expect(result.current.all).toBeDefined()
    expect(Array.isArray(result.current.all)).toBe(true)
  })

  it('maintains source type information', () => {
    const { result } = renderHook(() => useUnifiedSearch('React', {}))

    result.current.all.forEach(item => {
      expect(['project', 'conversation', 'agent']).toContain(item.item.category)
    })
  })

  it('handles special characters in search', () => {
    const { result } = renderHook(() => useUnifiedSearch('C++', {}))

    expect(Array.isArray(result.current.all)).toBe(true)
  })

  it('returns consistent results on same query', () => {
    const { result: result1 } = renderHook(() => useUnifiedSearch('React', {}))
    const { result: result2 } = renderHook(() => useUnifiedSearch('React', {}))

    expect(result1.current.all.length).toBe(result2.current.all.length)
  })
})
