import { cn } from '@/lib/cn'
import { AlertCircle } from 'lucide-react'
import type { Agent } from '@/types/agent.types'

interface AgentStatusBadgeProps {
  status: Agent['status']
  className?: string
}

export const AgentStatusBadge = ({ status, className }: AgentStatusBadgeProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'active':
      case 'processing':
        return 'bg-success/20 text-success'
      case 'error':
        return 'bg-destructive/20 text-destructive'
      case 'waiting':
        return 'bg-warning/20 text-warning'
      case 'idle':
      default:
        return 'bg-muted/20 text-muted-foreground'
    }
  }

  const getStatusText = () => {
    switch (status) {
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
      "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
      getStatusColor(),
      className
    )}>
      {(status === 'active' || status === 'processing') && (
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
      )}
      {status === 'error' && (
        <AlertCircle className="w-3 h-3" />
      )}
      {getStatusText()}
    </div>
  )
}
