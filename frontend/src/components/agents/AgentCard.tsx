import { memo } from 'react'
import { cn } from '@/lib/cn'
import type { Agent } from '@/types/agent.types'
import { Zap, Brain, Wrench, Sparkles, AlertCircle } from 'lucide-react'

interface AgentCardProps {
  agent: Agent
}

const AgentCardComponent = ({ agent }: AgentCardProps) => {
  const getAgentIcon = () => {
    switch (agent.type) {
      case 'strategic':
        return <Brain className="w-5 h-5" />
      case 'implementation':
        return <Wrench className="w-5 h-5" />
      case 'specialized':
        return <Sparkles className="w-5 h-5" />
      case 'support':
        return <Zap className="w-5 h-5" />
      default:
        return <Zap className="w-5 h-5" />
    }
  }

  const getStatusColor = () => {
    switch (agent.status) {
      case 'active':
      case 'processing':
        return 'border-success bg-success/5'
      case 'waiting':
        return 'border-warning bg-warning/5'
      case 'error':
        return 'border-destructive bg-destructive/5'
      case 'idle':
      default:
        return 'border-muted bg-muted/5'
    }
  }

  const getStatusText = () => {
    switch (agent.status) {
      case 'active':
      case 'processing':
        return 'Active'
      case 'waiting':
        return 'Waiting'
      case 'error':
        return 'Error'
      case 'idle':
      default:
        return 'Idle'
    }
  }

  return (
    <div className={cn(
      "p-4 rounded-lg border-2 transition-all",
      getStatusColor()
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-2 rounded-lg",
            agent.status === 'active' || agent.status === 'processing'
              ? 'bg-success/20 text-success'
              : agent.status === 'error'
              ? 'bg-destructive/20 text-destructive'
              : 'bg-muted/20 text-muted-foreground'
          )}>
            {getAgentIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{agent.name}</h3>
            <p className="text-xs text-muted-foreground capitalize">{agent.type}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
          agent.status === 'active' || agent.status === 'processing'
            ? 'bg-success/20 text-success'
            : agent.status === 'error'
            ? 'bg-destructive/20 text-destructive'
            : agent.status === 'waiting'
            ? 'bg-warning/20 text-warning'
            : 'bg-muted/20 text-muted-foreground'
        )}>
          {(agent.status === 'active' || agent.status === 'processing') && (
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          )}
          {agent.status === 'error' && (
            <AlertCircle className="w-3 h-3" />
          )}
          {getStatusText()}
        </div>
      </div>

      {/* Current Task */}
      {agent.currentTask && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1">Task:</p>
          <p className="text-sm line-clamp-2">{agent.currentTask.description}</p>
          {agent.progress !== undefined && (
            <div className="mt-2 w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${agent.progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Token Usage */}
      {agent.tokenUsage && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Input:</span>
            <span>{agent.tokenUsage.input.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Output:</span>
            <span>{agent.tokenUsage.output.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Cost:</span>
            <span className="text-foreground">${agent.tokenUsage.cost.toFixed(4)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Memoized AgentCard to prevent re-renders when parent updates
 * Only re-renders if agent prop actually changes
 */
export const AgentCard = memo(AgentCardComponent)
