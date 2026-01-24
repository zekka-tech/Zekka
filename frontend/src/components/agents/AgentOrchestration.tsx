import { cn } from '@/lib/cn'

interface AgentOrchestrationProps {
  stats: {
    activeCount: number
    totalCost: number
    successRate: number
  }
}

export const AgentOrchestration = ({ stats }: AgentOrchestrationProps) => {
  return (
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
  )
}
