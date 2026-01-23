import { useMemo } from 'react'
import { searchItems, processSearchResults, type SearchableItem, type SearchResult } from '@/lib/search'
import { useProjects } from './useProjects'
import { useConversations } from './useConversations'
import { useAgents } from './useAgents'

export type SearchCategory = 'projects' | 'conversations' | 'agents' | 'all'

export interface SearchFilters {
  category?: SearchCategory
  tags?: string[]
  minScore?: number
  limit?: number
}

export interface UnifiedSearchResult {
  projects: SearchResult<SearchableItem>[]
  conversations: SearchResult<SearchableItem>[]
  agents: SearchResult<SearchableItem>[]
  all: SearchResult<SearchableItem>[]
  total: number
}

// Convert projects to searchable items
const projectsToSearchable = (projects: any[]): SearchableItem[] => {
  return projects.map(p => ({
    id: p.id,
    title: p.name,
    description: p.description,
    category: 'project',
    tags: p.tags || [],
    metadata: { type: p.type, status: p.status }
  }))
}

// Convert conversations to searchable items
const conversationsToSearchable = (conversations: any[]): SearchableItem[] => {
  return conversations.map(c => ({
    id: c.id,
    title: c.title || 'Untitled',
    description: c.lastMessage?.content,
    category: 'conversation',
    tags: c.tags || [],
    metadata: { projectId: c.projectId, messageCount: c.messageCount }
  }))
}

// Convert agents to searchable items
const agentsToSearchable = (agents: any[]): SearchableItem[] => {
  return agents.map(a => ({
    id: a.id,
    title: a.name,
    description: a.description,
    category: 'agent',
    tags: a.tags || [],
    metadata: { status: a.status, type: a.type }
  }))
}

export const useUnifiedSearch = (query: string, filters?: SearchFilters) => {
  const { projects } = useProjects()
  const { conversations } = useConversations()
  const { agents } = useAgents()

  const results = useMemo<UnifiedSearchResult>(() => {
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      return {
        projects: [],
        conversations: [],
        agents: [],
        all: [],
        total: 0
      }
    }

    // Convert to searchable items
    const searchableProjects = projectsToSearchable(projects)
    const searchableConversations = conversationsToSearchable(conversations)
    const searchableAgents = agentsToSearchable(agents)

    // Search each category
    const projectResults = searchItems(searchableProjects, trimmedQuery)
    const conversationResults = searchItems(searchableConversations, trimmedQuery)
    const agentResults = searchItems(searchableAgents, trimmedQuery)

    // Apply filters
    const processedProjects = processSearchResults(projectResults, {
      minScore: filters?.minScore,
      limit: filters?.category === 'projects' ? filters?.limit : 5
    })

    const processedConversations = processSearchResults(conversationResults, {
      minScore: filters?.minScore,
      limit: filters?.category === 'conversations' ? filters?.limit : 5
    })

    const processedAgents = processSearchResults(agentResults, {
      minScore: filters?.minScore,
      limit: filters?.category === 'agents' ? filters?.limit : 5
    })

    // Combine all results
    const allResults = [
      ...processedProjects,
      ...processedConversations,
      ...processedAgents
    ].sort((a, b) => (a.score || 0) - (b.score || 0))

    const limitedAll = filters?.limit
      ? allResults.slice(0, filters.limit)
      : allResults.slice(0, 10)

    return {
      projects: processedProjects,
      conversations: processedConversations,
      agents: processedAgents,
      all: limitedAll,
      total: allResults.length
    }
  }, [query, projects, conversations, agents, filters])

  const getByCategory = (category: SearchCategory) => {
    switch (category) {
      case 'projects':
        return results.projects
      case 'conversations':
        return results.conversations
      case 'agents':
        return results.agents
      default:
        return results.all
    }
  }

  const isEmpty = results.total === 0

  return {
    ...results,
    getByCategory,
    isEmpty,
    isLoading: false
  }
}
