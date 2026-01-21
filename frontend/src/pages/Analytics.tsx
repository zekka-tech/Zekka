import { useState } from 'react'
import { cn } from '@/lib/cn'
import { useAnalytics, type Period } from '@/hooks/useAnalytics'
import { TokenUsageChart } from '@/components/charts/TokenUsageChart'
import { CostBreakdownChart } from '@/components/charts/CostBreakdownChart'
import { AgentPerformanceChart } from '@/components/charts/AgentPerformanceChart'
import { CombinedMetricsChart } from '@/components/charts/CombinedMetricsChart'
import { BarChart3Icon, TrendingUpIcon, DollarSignIcon, ZapIcon, RefreshCwIcon, DownloadIcon } from 'lucide-react'

export const Analytics = () => {
  const [period, setPeriod] = useState<Period>('week')
  const { data, isLoading, error, refetch } = useAnalytics(period)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const handleRefresh = async () => {
    setLastUpdated(new Date())
    await refetch?.()
  }

  const handleExport = (format: 'csv' | 'json') => {
    if (!data) return

    const exportData = {
      period,
      exportedAt: new Date().toISOString(),
      data: {
        tokenUsage: data.tokenUsage,
        costBreakdown: data.costBreakdown,
        agentPerformance: data.agentPerformance,
        stats: data.stats
      }
    }

    const content = format === 'json'
      ? JSON.stringify(exportData, null, 2)
      : convertToCSV(exportData)

    const element = document.createElement('a')
    element.setAttribute('href', `data:text/${format},${encodeURIComponent(content)}`)
    element.setAttribute('download', `analytics-${period}-${Date.now()}.${format}`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const convertToCSV = (data: any): string => {
    let csv = `Analytics Export - ${data.period}\n`
    csv += `Exported: ${data.exportedAt}\n\n`

    // Stats section
    csv += 'Summary Statistics\n'
    csv += `Total Tokens,${data.data.stats.totalTokens}\n`
    csv += `Total Cost,${data.data.stats.totalCost}\n`
    csv += `Avg Cost/Token,${data.data.stats.averageCostPerToken}\n\n`

    // Token usage
    csv += 'Token Usage\n'
    csv += 'Date,Tokens,Cost\n'
    data.data.tokenUsage.forEach((item: any) => {
      csv += `${item.date},${item.tokens},${item.cost}\n`
    })

    return csv
  }

  if (error) {
    return (
      <div className={cn(
        'flex items-center justify-center min-h-[400px]',
        'text-center'
      )}>
        <div>
          <p className="text-lg font-semibold text-foreground mb-2">Failed to load analytics</p>
          <p className="text-sm text-muted-foreground mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <button
            onClick={handleRefresh}
            className={cn(
              'px-4 py-2 rounded-lg',
              'bg-primary text-primary-foreground',
              'hover:opacity-90 transition-opacity'
            )}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time metrics and cost analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={cn(
              'p-2 rounded-lg border border-border',
              'hover:bg-muted/50 transition-colors',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
            title="Refresh data"
          >
            <RefreshCwIcon className={cn(
              'w-5 h-5 text-muted-foreground',
              isLoading && 'animate-spin'
            )} />
          </button>

          <div className="text-xs text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Period Selector and Export */}
      <div className={cn(
        'flex items-center justify-between',
        'bg-card border border-border rounded-lg p-4'
      )}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Period:</span>
          <div className="flex gap-2">
            {(['day', 'week', 'month'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium',
                  'transition-colors',
                  period === p
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={!data}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm',
              'flex items-center gap-2',
              'bg-muted text-muted-foreground',
              'hover:bg-muted/80 transition-colors',
              !data && 'opacity-50 cursor-not-allowed'
            )}
          >
            <DownloadIcon className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={!data}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm',
              'flex items-center gap-2',
              'bg-muted text-muted-foreground',
              'hover:bg-muted/80 transition-colors',
              !data && 'opacity-50 cursor-not-allowed'
            )}
          >
            <DownloadIcon className="w-4 h-4" />
            JSON
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Tokens */}
          <div className={cn(
            'p-4 rounded-lg border border-border',
            'bg-card'
          )}>
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Total Tokens</span>
              <ZapIcon className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {(data.stats.totalTokens / 1000000).toFixed(2)}M
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              {data.tokenUsage.length} data points
            </p>
          </div>

          {/* Total Cost */}
          <div className={cn(
            'p-4 rounded-lg border border-border',
            'bg-card'
          )}>
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Total Cost</span>
              <DollarSignIcon className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              ${data.stats.totalCost.toFixed(2)}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              USD spent this period
            </p>
          </div>

          {/* Cost per Token */}
          <div className={cn(
            'p-4 rounded-lg border border-border',
            'bg-card'
          )}>
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Cost/Token</span>
              <TrendingUpIcon className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              ${(data.stats.averageCostPerToken * 1000000).toFixed(3)}/M
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
              Average rate
            </p>
          </div>

          {/* Top Agent */}
          <div className={cn(
            'p-4 rounded-lg border border-border',
            'bg-card'
          )}>
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Top Agent</span>
              <BarChart3Icon className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-lg font-bold text-foreground truncate">
              {data.stats.topAgent || 'N/A'}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
              Most executions
            </p>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Usage */}
        {data ? (
          <TokenUsageChart
            data={data.tokenUsage}
            period={period}
            showArea={true}
            height={350}
          />
        ) : (
          <div className={cn(
            'rounded-lg border border-border p-8',
            'bg-muted/30',
            'flex items-center justify-center'
          )} style={{ height: 350 }}>
            <p className="text-muted-foreground">Loading chart...</p>
          </div>
        )}

        {/* Combined Metrics */}
        {data ? (
          <CombinedMetricsChart
            data={data.combinedMetrics}
            height={350}
          />
        ) : (
          <div className={cn(
            'rounded-lg border border-border p-8',
            'bg-muted/30',
            'flex items-center justify-center'
          )} style={{ height: 350 }}>
            <p className="text-muted-foreground">Loading chart...</p>
          </div>
        )}

        {/* Cost Breakdown */}
        {data ? (
          <CostBreakdownChart
            data={data.costBreakdown}
            height={350}
          />
        ) : (
          <div className={cn(
            'rounded-lg border border-border p-8',
            'bg-muted/30',
            'flex items-center justify-center'
          )} style={{ height: 350 }}>
            <p className="text-muted-foreground">Loading chart...</p>
          </div>
        )}

        {/* Agent Performance */}
        {data ? (
          <AgentPerformanceChart
            data={data.agentPerformance}
            height={350}
          />
        ) : (
          <div className={cn(
            'rounded-lg border border-border p-8',
            'bg-muted/30',
            'flex items-center justify-center'
          )} style={{ height: 350 }}>
            <p className="text-muted-foreground">Loading chart...</p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className={cn(
          'fixed inset-0 bg-black/50 flex items-center justify-center',
          'rounded-lg'
        )}>
          <div className="text-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-white">Loading analytics...</p>
          </div>
        </div>
      )}
    </div>
  )
}
