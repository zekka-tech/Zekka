import { useMemo } from 'react'
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

  const donutSegments = useMemo(() => {
    let accumulatedPercent = 0

    return chartData.map((item) => {
      const percentage = Number(item.percentage)
      const start = accumulatedPercent
      accumulatedPercent += percentage
      const end = accumulatedPercent

      const startAngle = (start / 100) * Math.PI * 2 - Math.PI / 2
      const endAngle = (end / 100) * Math.PI * 2 - Math.PI / 2
      const largeArcFlag = end - start > 50 ? 1 : 0
      const radius = 64
      const center = 80
      const startX = center + radius * Math.cos(startAngle)
      const startY = center + radius * Math.sin(startAngle)
      const endX = center + radius * Math.cos(endAngle)
      const endY = center + radius * Math.sin(endAngle)

      return {
        ...item,
        path: `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`
      }
    })
  }, [chartData])

  const legend = (
    <div className={cn('mt-4 space-y-2')}>
      {chartData.map((item, index) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground">
            {item.name}
          </span>
          <span className="text-muted-foreground ml-auto">
            {item.percentage}%
          </span>
          <span className="text-foreground font-semibold min-w-fit">
            ${item.cost.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )

  const donut = (
    <div className="flex items-center justify-center" style={{ height }}>
      <svg
        viewBox="0 0 160 160"
        className="w-full max-w-[220px] overflow-visible"
        aria-label="Cost breakdown donut chart"
      >
        <circle
          cx="80"
          cy="80"
          r="64"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="24"
        />
        {donutSegments.map((segment, index) => (
          <path
            key={index}
            d={segment.path}
            fill="none"
            stroke={segment.color}
            strokeWidth="24"
            strokeLinecap="round"
          >
            <title>
              {segment.name}: ${segment.cost.toFixed(2)} ({segment.percentage}%)
            </title>
          </path>
        ))}
        <circle cx="80" cy="80" r="42" fill="hsl(var(--card))" />
        <text
          x="80"
          y="76"
          textAnchor="middle"
          className="fill-foreground text-[10px] font-medium"
        >
          Total
        </text>
        <text
          x="80"
          y="92"
          textAnchor="middle"
          className="fill-foreground text-[14px] font-bold"
        >
          ${totalCost.toFixed(2)}
        </text>
      </svg>
    </div>
  )

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

      {donut}
      {legend}
    </div>
  )
}
