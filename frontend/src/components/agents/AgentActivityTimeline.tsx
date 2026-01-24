import { cn } from '@/lib/cn'
import { Clock } from 'lucide-react'
import type { Activity } from '@/types/agent.types'

interface AgentActivityTimelineProps {
  activities: Activity[]
  className?: string
}

export const AgentActivityTimeline = ({ activities, className }: AgentActivityTimelineProps) => {
  if (activities.length === 0) return null

  return (
    <div className={cn(
      "border-t border-border p-4",
      "bg-card max-h-40 overflow-y-auto",
      className
    )}>
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Recent Activity
      </h3>
      <div className="space-y-1">
        {activities.slice(0, 50).map(activity => (
          <div key={activity.id} className="text-xs text-muted-foreground flex justify-between gap-2">
            <span className="flex-1">
                <span className="font-medium text-foreground">{activity.agentName}</span>
                {' '} {activity.action}
            </span>
            <span className="text-[10px] whitespace-nowrap opacity-70">
                {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
