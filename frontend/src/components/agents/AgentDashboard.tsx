import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import type { Agent, Activity } from '@/types/agent.types'
import { AgentCard } from './AgentCard'
import { AgentOrchestration } from './AgentOrchestration'
import { AgentActivityTimeline } from './AgentActivityTimeline'

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
      {/* Header with Stats */}
      <AgentOrchestration stats={stats} />

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
      <AgentActivityTimeline activities={activities} />
    </div>
  )
}
