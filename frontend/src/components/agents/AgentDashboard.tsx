import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import type { Agent, Activity } from '@/types/agent.types'
import { AgentCard } from './AgentCard'
import { Clock } from 'lucide-react'

interface AgentDashboardProps {
  agents?: Agent[]
  activities?: Activity[]
}

export const AgentDashboard = ({
  agents = [],
  activities = []
}: AgentDashboardProps) => {
  // Mock data for demo
  const mockAgents: Agent[] = agents.length > 0 ? agents : [
    {
      id: '1',
      name: 'Pydantic AI',
      type: 'strategic',
      status: 'active',
      progress: 75,
      currentTask: {
        id: 't1',
        description: 'Analyzing project architecture and requirements',
        stage: 2,
        priority: 'critical',
        startedAt: new Date(Date.now() - 300000)
      },
      tokenUsage: {
        input: 2450,
        output: 1820,
        cost: 0.145
      }
    },
    {
      id: '2',
      name: 'Astron Agent',
      type: 'implementation',
      status: 'processing',
      progress: 45,
      currentTask: {
        id: 't2',
        description: 'Implementing core features and components',
        stage: 3,
        priority: 'high',
        startedAt: new Date(Date.now() - 600000)
      },
      tokenUsage: {
        input: 1890,
        output: 1240,
        cost: 0.098
      }
    },
    {
      id: '3',
      name: 'CodeRabbit',
      type: 'specialized',
      status: 'idle',
      tokenUsage: {
        input: 850,
        output: 520,
        cost: 0.043
      }
    },
    {
      id: '4',
      name: 'SonarCube',
      type: 'specialized',
      status: 'waiting',
      tokenUsage: {
        input: 620,
        output: 340,
        cost: 0.032
      }
    }
  ]

  const stats = useMemo(() => {
    const activeCount = mockAgents.filter(a => a.status === 'active' || a.status === 'processing').length
    const totalCost = mockAgents.reduce((sum, a) => sum + (a.tokenUsage?.cost || 0), 0)
    const successRate = 92

    return {
      activeCount,
      totalCost,
      successRate
    }
  }, [mockAgents])

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
            <p className="text-xs text-muted-foreground">Success Rate</p>
            <p className="text-lg font-semibold">{stats.successRate}%</p>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className={cn(
        "flex-1 overflow-y-auto p-4",
        "space-y-3"
      )}>
        <div className="grid gap-3">
          {mockAgents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
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
