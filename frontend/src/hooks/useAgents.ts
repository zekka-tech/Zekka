import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/services/api'

export const useAgents = () => {
  const { data: agents, isLoading, error } = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiService.getAgents(),
    staleTime: 10 * 1000 // 10 seconds (frequent updates)
  })

  return {
    agents: agents || [],
    isLoading,
    error
  }
}

export const useAgent = (agentId: string | null) => {
  const { data: agent, isLoading, error } = useQuery({
    queryKey: ['agents', agentId],
    queryFn: () => (agentId ? apiService.getAgent(agentId) : null),
    enabled: !!agentId,
    staleTime: 5 * 1000 // 5 seconds
  })

  const { data: status } = useQuery({
    queryKey: ['agents', agentId, 'status'],
    queryFn: () => (agentId ? apiService.getAgentStatus(agentId) : null),
    enabled: !!agentId,
    staleTime: 5 * 1000
  })

  const { data: activity } = useQuery({
    queryKey: ['agents', agentId, 'activity'],
    queryFn: () => (agentId ? apiService.getAgentActivity(agentId) : null),
    enabled: !!agentId,
    staleTime: 10 * 1000
  })

  return {
    agent,
    status,
    activity: activity || [],
    isLoading,
    error
  }
}

export const useMetrics = () => {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => apiService.getMetrics(),
    staleTime: 10 * 1000
  })

  return {
    metrics,
    isLoading,
    error
  }
}

export const useCosts = () => {
  const { data: costs, isLoading, error } = useQuery({
    queryKey: ['costs'],
    queryFn: () => apiService.getCosts(),
    staleTime: 60 * 1000 // 1 minute
  })

  const { data: breakdown } = useQuery({
    queryKey: ['costs', 'breakdown'],
    queryFn: () => apiService.getCostsBreakdown(),
    staleTime: 60 * 1000
  })

  return {
    costs,
    breakdown,
    isLoading,
    error
  }
}
