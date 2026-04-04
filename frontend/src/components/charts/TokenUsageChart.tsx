import { useMemo } from 'react'
import {
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { cn } from '@/lib/cn'

export interface MetricDataPoint {
  date: string
  tokens: number
  cost?: number
}

interface TokenUsageChartProps {
  data: MetricDataPoint[]
  period?: 'day' | 'week' | 'month'
  showArea?: boolean
  height?: number
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; name?: string; payload?: Record<string, unknown> }>
  label?: string
}

const TokenUsageTooltip = ({ active, payload }: TooltipProps) => {
  if (!active || !payload || payload.length === 0) return null

  const point = payload[0].payload as { date?: string; cost?: number }

  return (
    <div className={cn(
      'bg-card border border-border rounded-lg p-2 shadow-lg',
      'text-xs'
    )}>
      <p className="text-muted-foreground">{point.date}</p>
      <p className="text-foreground font-semibold">
        {(payload[0].value / 1000).toFixed(1)}K tokens
      </p>
      {point.cost && (
        <p className="text-muted-foreground">
          ${point.cost.toFixed(2)}
        </p>
      )}
    </div>
  )
}

export const TokenUsageChart = ({
  data,
  showArea = true,
  height = 300
}: TokenUsageChartProps) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }
    return data.map(point => ({
      date: point.date,
      tokens: point.tokens,
      cost: point.cost || 0
    }))
  }, [data])

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
            Data will appear as usage is tracked
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
      <ResponsiveContainer width="100%" height={height}>
        {showArea ? (
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<TokenUsageTooltip />} />
            <Area
              type="monotone"
              dataKey="tokens"
              stroke="hsl(var(--primary))"
              fill="url(#tokenGradient)"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<TokenUsageTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            <Line
              type="monotone"
              dataKey="tokens"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
              name="Tokens Used"
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
