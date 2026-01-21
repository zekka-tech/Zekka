import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { cn } from '@/lib/cn'

export interface CombinedMetric {
  date: string
  tokens: number
  cost: number
}

interface CombinedMetricsChartProps {
  data: CombinedMetric[]
  height?: number
}

export const CombinedMetricsChart = ({
  data,
  height = 300
}: CombinedMetricsChartProps) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }
    return data.map(point => ({
      date: point.date,
      tokens: point.tokens,
      cost: point.cost
    }))
  }, [data])

  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { totalTokens: 0, totalCost: 0, avgCostPerToken: 0 }
    }

    const totalTokens = chartData.reduce((sum, d) => sum + d.tokens, 0)
    const totalCost = chartData.reduce((sum, d) => sum + d.cost, 0)
    const avgCostPerToken = totalTokens > 0 ? totalCost / totalTokens : 0

    return { totalTokens, totalCost, avgCostPerToken }
  }, [chartData])

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null

    return (
      <div className={cn(
        'bg-card border border-border rounded-lg p-3 shadow-lg',
        'text-xs space-y-1'
      )}>
        <p className="text-muted-foreground font-medium">{payload[0].payload.date}</p>
        {payload.map((item: any, index: number) => (
          <p key={index} style={{ color: item.color }}>
            {item.name}: {item.name === 'Cost'
              ? `$${item.value.toFixed(2)}`
              : `${(item.value / 1000).toFixed(1)}K`
            }
          </p>
        ))}
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
            Combined metrics will appear as usage is tracked
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'w-full rounded-lg border border-border p-4',
      'bg-card space-y-4'
    )}>
      <div>
        <h3 className="text-sm font-semibold text-foreground">Tokens & Costs</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Combined usage and cost metrics
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className={cn(
          'p-2 rounded-lg',
          'bg-gradient-to-br from-blue-500/10 to-blue-500/5',
          'border border-blue-500/20'
        )}>
          <p className="text-xs text-muted-foreground">Total Tokens</p>
          <p className="text-sm font-bold text-foreground">
            {(stats.totalTokens / 1000000).toFixed(2)}M
          </p>
        </div>
        <div className={cn(
          'p-2 rounded-lg',
          'bg-gradient-to-br from-purple-500/10 to-purple-500/5',
          'border border-purple-500/20'
        )}>
          <p className="text-xs text-muted-foreground">Total Cost</p>
          <p className="text-sm font-bold text-foreground">
            ${stats.totalCost.toFixed(2)}
          </p>
        </div>
        <div className={cn(
          'p-2 rounded-lg',
          'bg-gradient-to-br from-green-500/10 to-green-500/5',
          'border border-green-500/20'
        )}>
          <p className="text-xs text-muted-foreground">Cost/Token</p>
          <p className="text-sm font-bold text-foreground">
            ${(stats.avgCostPerToken * 1000000).toFixed(3)}/M
          </p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0} />
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
            yAxisId="left"
            stroke="hsl(210, 100%, 50%)"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="hsl(270, 100%, 50%)"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          <Bar
            yAxisId="left"
            dataKey="tokens"
            fill="hsl(210, 100%, 50%)"
            name="Tokens"
            radius={[8, 8, 0, 0]}
            opacity={0.7}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cost"
            stroke="hsl(270, 100%, 50%)"
            strokeWidth={2}
            name="Cost ($)"
            dot={{ fill: 'hsl(270, 100%, 50%)', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
