import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import { cn } from '@/lib/cn'

export interface ModelBreakdown {
  name: string
  cost: number
  percentage?: number
}

interface CostBreakdownChartProps {
  data: ModelBreakdown[]
  height?: number
}

const COLORS = [
  'hsl(210, 100%, 50%)',   // Blue
  'hsl(270, 100%, 50%)',   // Purple
  'hsl(140, 100%, 50%)',   // Green
  'hsl(0, 100%, 50%)',     // Red
  'hsl(30, 100%, 50%)',    // Orange
  'hsl(60, 100%, 50%)'     // Yellow
]

export const CostBreakdownChart = ({
  data,
  height = 300
}: CostBreakdownChartProps) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }

    const total = data.reduce((sum, item) => sum + item.cost, 0)

    return data.map((item, index) => ({
      ...item,
      percentage: total > 0 ? ((item.cost / total) * 100).toFixed(1) : 0,
      color: COLORS[index % COLORS.length]
    }))
  }, [data])

  const totalCost = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.cost, 0)
  }, [chartData])

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
          ${data.cost.toFixed(2)}
        </p>
        <p className="text-muted-foreground">
          {data.percentage}%
        </p>
      </div>
    )
  }

  const CustomLegend = (props: any) => {
    const { payload } = props

    return (
      <div className={cn('mt-4 space-y-2')}>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">
              {entry.value}
            </span>
            <span className="text-foreground font-semibold ml-auto">
              ${chartData[index]?.cost.toFixed(2)}
            </span>
          </div>
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
            Data will appear as costs are tracked
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Cost Breakdown</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Total: ${totalCost.toFixed(2)}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="cost"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <CustomLegend payload={chartData.map((item, index) => ({
        value: item.name,
        color: item.color,
        index
      }))} />
    </div>
  )
}
