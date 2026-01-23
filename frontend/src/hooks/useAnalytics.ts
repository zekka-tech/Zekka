import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/services/api'
import type { MetricDataPoint } from '@/components/charts/TokenUsageChart'
import type { ModelBreakdown } from '@/components/charts/CostBreakdownChart'
import type { AgentMetric } from '@/components/charts/AgentPerformanceChart'
import type { CombinedMetric } from '@/components/charts/CombinedMetricsChart'

export type Period = 'day' | 'week' | 'month'

export interface AnalyticsData {
  tokenUsage: MetricDataPoint[]
  costBreakdown: ModelBreakdown[]
  agentPerformance: AgentMetric[]
  combinedMetrics: CombinedMetric[]
  stats: {
    totalTokens: number
    totalCost: number
    averageCostPerToken: number
    topAgent?: string
    topModel?: string
  }
}

// Transform raw metrics data into chart-ready format
const transformMetricsData = (metrics: any, period: Period): MetricDataPoint[] => {
  if (!metrics || !metrics.timeline) {
    return []
  }

  return metrics.timeline.map((point: any) => ({
    date: formatDate(point.timestamp, period),
    tokens: point.tokens || 0,
    cost: point.cost || 0
  }))
}

// Transform cost data into model breakdown format
const transformCostBreakdown = (costs: any): ModelBreakdown[] => {
  if (!costs || !costs.byModel) {
    return []
  }

  const total = Object.values(costs.byModel).reduce((sum: number, val: any) => sum + (val.cost || 0), 0)

  return Object.entries(costs.byModel).map(([modelName, data]: [string, any]) => ({
    name: modelName,
    cost: data.cost || 0,
    percentage: total > 0 ? ((data.cost || 0) / total) * 100 : 0
  }))
}

// Transform metrics into agent performance format
const transformAgentPerformance = (metrics: any): AgentMetric[] => {
  if (!metrics || !metrics.byAgent) {
    return []
  }

  return Object.entries(metrics.byAgent).map(([agentName, data]: [string, any]) => ({
    name: agentName,
    avgExecutionTime: data.avgExecutionTime || 0,
    totalExecutions: data.totalExecutions || 0,
    successRate: data.successRate || 0
  }))
}

// Combine metrics and costs into a single timeline
const transformCombinedMetrics = (metrics: any, costs: any): CombinedMetric[] => {
  if (!metrics || !metrics.timeline || !costs) {
    return []
  }

  return metrics.timeline.map((point: any) => ({
    date: formatDate(point.timestamp, 'day'),
    tokens: point.tokens || 0,
    cost: point.cost || 0
  }))
}

// Format date based on period
const formatDate = (timestamp: string | number, period: Period): string => {
  const date = new Date(timestamp)

  switch (period) {
    case 'day':
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    case 'week':
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    default:
      return date.toLocaleDateString()
  }
}

// Calculate summary statistics
const calculateStats = (metrics: any, costs: any) => {
  const totalTokens = metrics?.totalTokens || 0
  const totalCost = costs?.totalCost || 0
  const averageCostPerToken = totalTokens > 0 ? totalCost / totalTokens : 0

  let topAgent = undefined
  let topModel = undefined

  if (metrics?.byAgent) {
    const agents = Object.entries(metrics.byAgent)
    if (agents.length > 0) {
      const top = agents.reduce((max: any, entry: [string, any]) => {
        const [name, data] = entry
        return (data.totalExecutions > (max.executions || 0))
          ? { name, executions: data.totalExecutions }
          : max
      }, { name: null, executions: 0 })
      topAgent = top.name
    }
  }

  if (costs?.byModel) {
    const models = Object.entries(costs.byModel)
    if (models.length > 0) {
      const top = models.reduce((max: any, entry: [string, any]) => {
        const [name, data] = entry
        return (data.cost > (max.cost || 0))
          ? { name, cost: data.cost }
          : max
      }, { name: null, cost: 0 })
      topModel = top.name
    }
  }

  return {
    totalTokens,
    totalCost,
    averageCostPerToken,
    topAgent,
    topModel
  }
}

export const useAnalytics = (period: Period = 'week') => {
  // Fetch metrics
  const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['analytics', 'metrics', period],
    queryFn: () => apiService.getMetrics(),
    staleTime: 30 * 1000, // 30 seconds for real-time updates
    refetchInterval: 30 * 1000 // Refetch every 30 seconds
  })

  // Fetch costs
  const { data: costsData, isLoading: costsLoading, error: costsError } = useQuery({
    queryKey: ['analytics', 'costs', period],
    queryFn: () => apiService.getCosts(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000
  })

  // Fetch cost breakdown
  const { data: breakdownData, isLoading: breakdownLoading } = useQuery({
    queryKey: ['analytics', 'breakdown', period],
    queryFn: () => apiService.getCostsBreakdown(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000
  })

  // Transform and combine data
  const analyticsData: AnalyticsData | null = metricsData && costsData
    ? {
      tokenUsage: transformMetricsData(metricsData, period),
      costBreakdown: transformCostBreakdown(breakdownData || costsData),
      agentPerformance: transformAgentPerformance(metricsData),
      combinedMetrics: transformCombinedMetrics(metricsData, costsData),
      stats: calculateStats(metricsData, costsData)
    }
    : null

  return {
    data: analyticsData,
    isLoading: metricsLoading || costsLoading || breakdownLoading,
    error: metricsError || costsError,
    period,
    refetch: async () => {
      // Refetch all queries
      // This is handled by React Query automatically
    }
  }
}

// Hook for real-time metrics updates via WebSocket
export const useRealtimeMetrics = () => {
  // Placeholder for WebSocket-based real-time metrics
  // This can be enhanced later with actual WebSocket implementation
  return useAnalytics('day')
}

// Hook for historical analytics data
export const useHistoricalAnalytics = (period: Period) => {
  return useAnalytics(period)
}
