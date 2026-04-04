import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import type { Agent, Activity } from '@/types/agent.types'
import { AgentCard } from './AgentCard'
import { useAgents } from '@/hooks/useAgents'
import { Clock } from 'lucide-react'

interface AgentDashboardProps {
  agents?: Agent[]
  activities?: Activity[]
}

export const AgentDashboard = ({
  agents,
  activities = []
}: AgentDashboardProps) => {
  const { agents: liveAgents, isLoading, error } = useAgents()
  const resolvedAgents = (agents ?? liveAgents) as Agent[]
  const isUsingLiveAgents = agents === undefined

  const stats = useMemo(() => {
    const activeCount = resolvedAgents.filter((agent: Agent) => agent.status === 'active' || agent.status === 'processing').length
    const totalCost = resolvedAgents.reduce((sum: number, agent: Agent) => sum + (agent.tokenUsage?.cost || 0), 0)

    return {
      activeCount,
      totalCost,
      activityCount: activities.length
    }
  }, [activities.length, resolvedAgents])

  const renderAgents = () => {
    if (isUsingLiveAgents && isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[220px]">
          <p className="text-sm text-muted-foreground">Loading agents...</p>
        </div>
      )
    }

    if (isUsingLiveAgents && error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[220px] text-center">
          <p className="text-sm font-medium text-foreground mb-1">
            Unable to load agents
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Agent telemetry is unavailable until the backend orchestration service is reachable.
          </p>
        </div>
      )
    }

    if (resolvedAgents.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[220px] text-center">
          <p className="text-sm font-medium text-foreground mb-1">
            No agents connected
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Connect the orchestration backend to surface live agent activity, token usage, and execution status.
          </p>
        </div>
      )
    }

    return (
      <div className="grid gap-3">
        {resolvedAgents.map((agent: Agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    )
  }

  return (
    <div className={cn(
      "flex flex-col h-full",
      "overflow-hidden"
    )}>
      {/* Header */}
      <div className={cn(
        "border-b border-border p-4",
        "bg-card"
      )}>
        <h2 className="text-lg font-semibold mb-3">Agent Orchestration</h2>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className={cn(
            "p-2 rounded-lg bg-muted/50"
          )}>
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-lg font-semibold">{stats.activeCount}</p>
          </div>
          <div className={cn(
            "p-2 rounded-lg bg-muted/50"
          )}>
            <p className="text-xs text-muted-foreground">Cost</p>
            <p className="text-lg font-semibold">${stats.totalCost.toFixed(3)}</p>
          </div>
          <div className={cn(
            "p-2 rounded-lg bg-muted/50"
          )}>
            <p className="text-xs text-muted-foreground">Events</p>
            <p className="text-lg font-semibold">{stats.activityCount}</p>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className={cn(
        "flex-1 overflow-y-auto p-4",
        "space-y-3"
      )}>
        {renderAgents()}
      </div>

      {/* Activity Timeline */}
      {activities.length > 0 && (
        <div className={cn(
          "border-t border-border p-4",
          "bg-card max-h-40 overflow-y-auto"
        )}>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Activity
          </h3>
          <div className="space-y-1">
            {activities.slice(0, 5).map(activity => (
              <div key={activity.id} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{activity.agentName}</span>
                {' '} {activity.action}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
