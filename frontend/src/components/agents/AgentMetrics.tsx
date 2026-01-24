import { cn } from '@/lib/cn'
import type { Agent } from '@/types/agent.types'

interface AgentMetricsProps {
  tokenUsage: Agent['tokenUsage']
  className?: string
}

export const AgentMetrics = ({ tokenUsage, className }: AgentMetricsProps) => {
  if (!tokenUsage) return null

  return (
    <div className={cn("text-xs text-muted-foreground space-y-1", className)}>
      <div className="flex justify-between">
        <span>Input:</span>
        <span>{tokenUsage.input.toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span>Output:</span>
        <span>{tokenUsage.output.toLocaleString()}</span>
      </div>
      <div className="flex justify-between font-medium">
        <span>Cost:</span>
        <span className="text-foreground">${tokenUsage.cost.toFixed(4)}</span>
      </div>
    </div>
  )
}
