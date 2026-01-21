import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { cn } from '@/lib/cn'

export interface AgentMetric {
  name: string
  avgExecutionTime: number
  totalExecutions: number
  successRate?: number
}

interface AgentPerformanceChartProps {
  data: AgentMetric[]
  height?: number
}

export const AgentPerformanceChart = ({
  data,
  height = 300
}: AgentPerformanceChartProps) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }

    return data.map((item) => ({
      ...item,
      displayName: item.name.length > 20
        ? item.name.substring(0, 20) + '...'
        : item.name
    }))
  }, [data])

  const maxTime = useMemo(() => {
    if (chartData.length === 0) return 0
    return Math.max(...chartData.map(d => d.avgExecutionTime))
  }, [chartData])

  const getBarColor = (value: number, max: number) => {
    const percentage = (value / max) * 100
    if (percentage < 33) return 'hsl(140, 100%, 50%)' // Green
    if (percentage < 66) return 'hsl(30, 100%, 50%)'  // Orange
    return 'hsl(0, 100%, 50%)'                        // Red
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null

    const data = payload[0].payload

    return (
      <div className={cn(
        'bg-card border border-border rounded-lg p-2 shadow-lg',
        'text-xs'
      )}>
        <p className="text-muted-foreground">{data.name}</p>
        <p className="text-foreground font-semibold">
          Avg: {data.avgExecutionTime.toFixed(2)}s
        </p>
        <p className="text-muted-foreground">
          Runs: {data.totalExecutions}
        </p>
        {data.successRate !== undefined && (
          <p className="text-muted-foreground">
            Success: {(data.successRate * 100).toFixed(1)}%
          </p>
        )}
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className={cn(
        'w-full rounded-lg border border-border p-8',
        'flex items-center justify-center text-center',
        'bg-muted/30'
      )} style={{ height }}>
        <div>
          <p className="text-sm text-muted-foreground">No data available</p>
          <p className="text-xs text-muted-foreground mt-1">
            Agent performance data will appear as tasks are executed
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'w-full rounded-lg border border-border p-4',
      'bg-card'
    )}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Agent Performance</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Average execution time (lower is better)
        </p>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="displayName"
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
            label={{ value: 'Time (seconds)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="avgExecutionTime"
            fill="hsl(var(--primary))"
            radius={[8, 8, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.avgExecutionTime, maxTime)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(140, 100%, 50%)' }} />
          <span className="text-muted-foreground">Fast (&lt; 33% of max)</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(30, 100%, 50%)' }} />
          <span className="text-muted-foreground">Medium (33-66% of max)</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(0, 100%, 50%)' }} />
          <span className="text-muted-foreground">Slow (&gt; 66% of max)</span>
        </div>
      </div>
    </div>
  )
}
