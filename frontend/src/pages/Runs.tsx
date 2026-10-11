import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { apiService, type AgentRun } from '@/services/api'
import { RunInspector } from '@/components/agents/RunInspector'
import { Loader2, RefreshCw, Activity } from 'lucide-react'

/**
 * Runs page — the live run inspector. Lists recent agent runs and streams the
 * selected run's plan → act → observe timeline in real time.
 */
export default function RunsPage() {
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRuns = useCallback(() => {
    setLoading(true)
    setError(null)
    return apiService
      .getRuns()
      .then((data) => {
        setRuns(data)
        setSelected((cur) => cur ?? (data.length > 0 ? data[0].id : null))
      })
      .catch((e) => setError(e?.message || 'Failed to load runs'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    // setState happens inside the promise callbacks, not synchronously here.
    void loadRuns()
  }, [loadRuns])

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Run list */}
      <aside className="w-80 shrink-0 border-r flex flex-col">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" /> Agent Runs
          </h2>
          <button
            type="button"
            onClick={loadRuns}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Refresh runs"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {error && <div className="p-4 text-sm text-red-500">{error}</div>}
          {!error && runs.length === 0 && !loading && (
            <div className="p-4 text-sm text-muted-foreground">No runs yet.</div>
          )}
          {loading && runs.length === 0 && (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}
          {runs.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => setSelected(run.id)}
              className={cn(
                'w-full border-b p-3 text-left text-sm hover:bg-muted/50',
                selected === run.id && 'bg-primary/5'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">
                  {run.agent_name || run.agent_key || 'agent'}
                </span>
                <span
                  className={cn(
                    'text-xs',
                    run.status === 'completed' && 'text-emerald-600',
                    run.status === 'running' && 'text-blue-600',
                    !['completed', 'running'].includes(run.status) && 'text-red-500'
                  )}
                >
                  {run.status}
                </span>
              </div>
              {run.goal && (
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{run.goal}</div>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Inspector */}
      <main className="flex-1 min-w-0">
        <RunInspector runId={selected} />
      </main>
    </div>
  )
}
