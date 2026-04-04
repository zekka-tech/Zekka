import { cn } from '@/lib/cn'
import {
  TrendingUpIcon,
  ZapIcon,
  DollarSignIcon,
  BarChart3Icon
} from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'

const GRADIENT_CLASSES = [
  'bg-gradient-to-r from-blue-500 to-cyan-500',
  'bg-gradient-to-r from-purple-500 to-pink-500',
  'bg-gradient-to-r from-green-500 to-emerald-500'
] as const

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-muted rounded', className)} />
  )
}

export const TokenUsagePanel = () => {
  const { data, isLoading, isEmpty } = useAnalytics('month')

  const stats = data?.stats

  if (isLoading) {
    return (
      <div className={cn('space-y-4', 'bg-card rounded-lg border border-border p-4')}>
        <div>
          <SkeletonBlock className="h-5 w-40 mb-1" />
          <SkeletonBlock className="h-3 w-56 mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SkeletonBlock className="h-20 rounded-lg" />
          <SkeletonBlock className="h-20 rounded-lg" />
        </div>
        <SkeletonBlock className="h-28 rounded-lg" />
        <SkeletonBlock className="h-16 rounded-lg" />
      </div>
    )
  }

  if (isEmpty || !stats) {
    return (
      <div className={cn('space-y-4', 'bg-card rounded-lg border border-border p-4')}>
        <div>
          <h2 className="text-lg font-semibold mb-1">Token Usage & Costs</h2>
          <p className="text-xs text-muted-foreground">Today's analytics and monthly breakdown</p>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ZapIcon className="w-8 h-8 text-muted-foreground mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">No usage data yet</p>
          <p className="text-xs text-muted-foreground mt-1">Start a conversation to see token metrics</p>
        </div>
      </div>
    )
  }

  const totalTokensK = (stats.totalTokens / 1000).toFixed(1)
  const totalTokensM = (stats.totalTokens / 1_000_000).toFixed(2)
  const costPerTokenPerM = (stats.averageCostPerToken * 1_000_000).toFixed(3)
  const avgDailyCost = (stats.totalCost / 30).toFixed(2)
  const projectedMonthlyCost = (stats.totalCost / 30 * 30).toFixed(2)

  // Build model breakdown from costBreakdown if available, else show summary
  const modelBreakdown = data.costBreakdown.length > 0
    ? data.costBreakdown.slice(0, 3)
    : null

  return (
    <div className={cn(
      'space-y-4',
      'bg-card rounded-lg border border-border p-4'
    )}>
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Token Usage & Costs</h2>
        <p className="text-xs text-muted-foreground">Monthly analytics breakdown</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Tokens */}
        <div className={cn(
          'p-3 rounded-lg',
          'bg-gradient-to-br from-blue-500/10 to-blue-500/5',
          'border border-blue-500/20'
        )}>
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Total Tokens</span>
            <ZapIcon className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-foreground">
            {stats.totalTokens >= 1_000_000 ? `${totalTokensM}M` : `${totalTokensK}K`}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            ~${stats.totalCost.toFixed(2)} USD
          </p>
        </div>

        {/* Conversations */}
        <div className={cn(
          'p-3 rounded-lg',
          'bg-gradient-to-br from-purple-500/10 to-purple-500/5',
          'border border-purple-500/20'
        )}>
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Conversations</span>
            <BarChart3Icon className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-foreground">
            {stats.totalConversations.toLocaleString()}
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            {stats.totalMessages.toLocaleString()} messages
          </p>
        </div>
      </div>

      {/* Model Breakdown (if available) or token split */}
      <div className={cn(
        'p-3 rounded-lg',
        'bg-muted/30 border border-border'
      )}>
        <h3 className="text-xs font-semibold mb-3 flex items-center gap-2">
          <DollarSignIcon className="w-4 h-4" />
          {modelBreakdown ? 'Model Usage Breakdown' : 'Token Distribution'}
        </h3>

        {modelBreakdown ? (
          <div className="space-y-2">
            {modelBreakdown.map((model, i) => {
              const pct = model.percentage ?? (stats.totalCost > 0
                ? Math.round((model.cost / stats.totalCost) * 100)
                : 0)
              return (
                <div key={model.name ?? i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground truncate max-w-[120px]">{model.name}</span>
                    <span className="text-xs text-muted-foreground">${model.cost.toFixed(2)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden bg-muted">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', GRADIENT_CLASSES[i % 3])}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-end text-xs text-muted-foreground mt-1">
                    <span>{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className="text-muted-foreground">Input tokens</span>
                <span>{stats.totalInputTokens.toLocaleString()}</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                  style={{
                    width: stats.totalTokens > 0
                      ? `${(stats.totalInputTokens / stats.totalTokens) * 100}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className="text-muted-foreground">Output tokens</span>
                <span>{stats.totalOutputTokens.toLocaleString()}</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                  style={{
                    width: stats.totalTokens > 0
                      ? `${(stats.totalOutputTokens / stats.totalTokens) * 100}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cost Efficiency */}
      <div className={cn(
        'p-3 rounded-lg',
        'bg-gradient-to-br from-green-500/10 to-green-500/5',
        'border border-green-500/20'
      )}>
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-muted-foreground font-medium">Cost per Token</span>
          <TrendingUpIcon className="w-4 h-4 text-green-500" />
        </div>
        <p className="text-lg font-bold text-foreground">
          ${costPerTokenPerM}/M
        </p>
        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
          Average rate this month
        </p>
      </div>

      {/* Usage Stats Footer */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
        <p>Average daily cost: ${avgDailyCost}</p>
        <p className="mt-1">Projected monthly spend: ~${projectedMonthlyCost}</p>
      </div>
    </div>
  )
}
