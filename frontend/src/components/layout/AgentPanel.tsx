import { useEffect } from 'react'
import { AgentDashboard } from '@/components/agents/AgentDashboard'
import { useAgents } from '@/hooks/useAgents'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useQueryClient } from '@tanstack/react-query'

export const AgentPanel = () => {
  const { agents, isLoading } = useAgents()
  const { on } = useWebSocket()
  const queryClient = useQueryClient()

  useEffect(() => {
    const handleAgentUpdate = (updatedAgent: any) => {
      queryClient.setQueryData(['agents'], (oldAgents: any[]) => {
        if (!oldAgents) return [updatedAgent]
        
        // Check if agent exists
        const exists = oldAgents.some(a => a.id === updatedAgent.id)
        if (exists) {
          return oldAgents.map(agent => 
            agent.id === updatedAgent.id ? { ...agent, ...updatedAgent } : agent
          )
        } else {
          return [...oldAgents, updatedAgent]
        }
      })
    }

    const unsubUpdate = on('agent:update', handleAgentUpdate)
    const unsubStatus = on('agent:status', handleAgentUpdate)
    
    return () => {
      unsubUpdate()
      unsubStatus()
    }
  }, [on, queryClient])

  // Show loading state or dashboard
  // Even if loading, we might want to show dashboard with skeletons, but simpler for now
  if (isLoading && !agents?.length) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Loading agents...</span>
        </div>
      </div>
    )
  }

  return <AgentDashboard agents={agents} />
}
