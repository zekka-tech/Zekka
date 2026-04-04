import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiService, type AnalyticsSummaryResponse } from '@/services/api'
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
    totalInputTokens: number
    totalOutputTokens: number
    totalCost: number
    averageCostPerToken: number
    totalProjects: number
    totalConversations: number
    totalMessages: number
    modelsUsed: number
    agentsUsed: number
    topAgent?: string
    topModel?: string
  }
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    return Number(value) || 0
  }

  return 0
}

const buildAnalyticsData = (summary: AnalyticsSummaryResponse): AnalyticsData => {
  const totalInputTokens = toNumber(summary.total_input_tokens)
  const totalOutputTokens = toNumber(summary.total_output_tokens)
  const totalTokens = totalInputTokens + totalOutputTokens
  const totalCost = toNumber(summary.total_cost)
  const averageCostPerToken = totalTokens > 0 ? totalCost / totalTokens : 0

  return {
    tokenUsage: [],
    costBreakdown: [],
    agentPerformance: [],
    combinedMetrics: [],
    stats: {
      totalTokens,
      totalInputTokens,
      totalOutputTokens,
      totalCost,
      averageCostPerToken,
      totalProjects: toNumber(summary.total_projects),
      totalConversations: toNumber(summary.total_conversations),
      totalMessages: toNumber(summary.total_messages),
      modelsUsed: toNumber(summary.models_used),
      agentsUsed: toNumber(summary.agents_used)
    }
  }
}

export const useAnalytics = (period: Period = 'week') => {
  const queryClient = useQueryClient()

  const { data: summaryData, isLoading, error } = useQuery({
    queryKey: ['analytics', 'summary', period],
    queryFn: () => apiService.getAnalyticsMetrics(period),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000 // Refetch every 30 seconds
  })

  const analyticsData = summaryData ? buildAnalyticsData(summaryData) : null
  const isSummaryEmpty = !summaryData || (
    toNumber(summaryData.total_projects) === 0
    && toNumber(summaryData.total_conversations) === 0
    && toNumber(summaryData.total_messages) === 0
    && toNumber(summaryData.total_input_tokens) === 0
    && toNumber(summaryData.total_output_tokens) === 0
    && toNumber(summaryData.total_cost) === 0
  )

  const isEmpty =
    !isLoading &&
    !error &&
    isSummaryEmpty

  return {
    data: analyticsData,
    isLoading,
    error,
    isEmpty,
    period,
    refetch: async () => {
      await queryClient.refetchQueries({
        queryKey: ['analytics', 'summary', period],
        exact: true
      })
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
