import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import {
  TrendingUpIcon,
  ZapIcon,
  DollarSignIcon,
  BarChart3Icon
} from 'lucide-react'

export const TokenUsagePanel = () => {

  // Demo metrics for visualization
  const mockMetrics = {
    totalTokensToday: 45230,
    totalTokensThisMonth: 1250340,
    costToday: 2.84,
    costThisMonth: 85.32,
    averageCostPerToken: 0.000068,
    models: [
      { name: 'Claude 3.5 Sonnet', tokens: 28500, cost: 1.71, percentage: 63 },
      { name: 'GPT-4', tokens: 12000, cost: 0.84, percentage: 26 },
      { name: 'Gemini Pro', tokens: 4730, cost: 0.29, percentage: 11 }
    ],
    trends: [
      { date: 'Mon', tokens: 38000, cost: 2.28 },
      { date: 'Tue', tokens: 42000, cost: 2.52 },
      { date: 'Wed', tokens: 35000, cost: 2.10 },
      { date: 'Thu', tokens: 48000, cost: 2.88 },
      { date: 'Fri', tokens: 45230, cost: 2.84 }
    ]
  }

  const stats = useMemo(() => {
    return {
      todayTokens: mockMetrics.totalTokensToday,
      todayCost: mockMetrics.costToday,
      monthTokens: mockMetrics.totalTokensThisMonth,
      monthCost: mockMetrics.costThisMonth,
      costPerToken: mockMetrics.averageCostPerToken
    }
  }, [])

  return (
    <div className={cn(
      "space-y-4",
      "bg-card rounded-lg border border-border p-4"
    )}>
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Token Usage & Costs</h2>
        <p className="text-xs text-muted-foreground">Today's analytics and monthly breakdown</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        {/* Today's Usage */}
        <div className={cn(
          "p-3 rounded-lg",
          "bg-gradient-to-br from-blue-500/10 to-blue-500/5",
          "border border-blue-500/20"
        )}>
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Today's Tokens</span>
            <ZapIcon className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-foreground">
            {(stats.todayTokens / 1000).toFixed(1)}K
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            ~{stats.todayCost.toFixed(2)} USD
          </p>
        </div>

        {/* This Month */}
        <div className={cn(
          "p-3 rounded-lg",
          "bg-gradient-to-br from-purple-500/10 to-purple-500/5",
          "border border-purple-500/20"
        )}>
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">This Month</span>
            <BarChart3Icon className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-foreground">
            {(stats.monthTokens / 1000000).toFixed(2)}M
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            ~${stats.monthCost.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Model Breakdown */}
      <div className={cn(
        "p-3 rounded-lg",
        "bg-muted/30 border border-border"
      )}>
        <h3 className="text-xs font-semibold mb-3 flex items-center gap-2">
          <DollarSignIcon className="w-4 h-4" />
          Model Usage Breakdown
        </h3>

        <div className="space-y-2">
          {mockMetrics.models.map((model, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">{model.name}</span>
                <span className="text-xs text-muted-foreground">${model.cost.toFixed(2)}</span>
              </div>
              <div className={cn(
                "w-full h-2 rounded-full overflow-hidden",
                "bg-muted"
              )}>
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    i === 0 && 'bg-gradient-to-r from-blue-500 to-cyan-500',
                    i === 1 && 'bg-gradient-to-r from-purple-500 to-pink-500',
                    i === 2 && 'bg-gradient-to-r from-green-500 to-emerald-500'
                  )}
                  style={{ width: `${model.percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span>{model.tokens.toLocaleString()} tokens</span>
                <span>{model.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost Efficiency */}
      <div className={cn(
        "p-3 rounded-lg",
        "bg-gradient-to-br from-green-500/10 to-green-500/5",
        "border border-green-500/20"
      )}>
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-muted-foreground font-medium">Cost per Token</span>
          <TrendingUpIcon className="w-4 h-4 text-green-500" />
        </div>
        <p className="text-lg font-bold text-foreground">
          ${(stats.costPerToken * 1000000).toFixed(3)}/M
        </p>
        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
          Average rate this month
        </p>
      </div>

      {/* Weekly Trend Chart (Simple bars) */}
      <div className={cn(
        "p-3 rounded-lg",
        "bg-muted/30 border border-border"
      )}>
        <h3 className="text-xs font-semibold mb-3">Weekly Trend</h3>

        <div className="space-y-2">
          {mockMetrics.trends.map((day, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{day.date}</span>
                <span className="text-foreground font-medium">
                  {(day.tokens / 1000).toFixed(0)}K tokens
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                    style={{
                      width: `${(day.tokens / mockMetrics.trends[3].tokens) * 100}%`
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground min-w-fit">
                  ${day.cost.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Stats Footer */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
        <p>Average daily cost: ${(stats.monthCost / 30).toFixed(2)}</p>
        <p className="mt-1">At current usage rate, monthly budget: ~${(stats.todayCost * 30).toFixed(2)}</p>
      </div>
    </div>
  )
}
