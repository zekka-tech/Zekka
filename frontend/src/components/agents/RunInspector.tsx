import { memo, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useRunInspector } from '@/hooks/useRunInspector'
import type { AgentRunEvent } from '@/services/api'
import {
  Brain,
  Wrench,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
} from 'lucide-react'

interface RunInspectorProps {
  runId: string | null
}

const EVENT_META: Record<
  AgentRunEvent['type'],
  { icon: ReactNode; label: string; color: string }
> = {
  plan: { icon: <Brain className="w-4 h-4" />, label: 'Plan', color: 'text-blue-500' },
  act: { icon: <Wrench className="w-4 h-4" />, label: 'Act', color: 'text-amber-500' },
  observe: { icon: <Eye className="w-4 h-4" />, label: 'Observe', color: 'text-emerald-500' },
  terminal: { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Done', color: 'text-emerald-600' },
  error: { icon: <XCircle className="w-4 h-4" />, label: 'Error', color: 'text-red-500' },
}

function statusBadge(status: string) {
  const ok = status === 'completed'
  const running = status === 'running'
  return cn(
    'px-2 py-0.5 rounded-full text-xs font-medium',
    ok && 'bg-emerald-100 text-emerald-700',
    running && 'bg-blue-100 text-blue-700',
    !ok && !running && 'bg-red-100 text-red-700'
  )
}

/**
 * Live inspector for a single agent run: streams the plan → act → observe
 * timeline, the tools called, files written, and the terminal status/cost.
 */
const RunInspectorComponent = ({ runId }: RunInspectorProps) => {
  const { run, events, loading, error } = useRunInspector(runId)

  if (!runId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Select a run to inspect its agent loop.
      </div>
    )
  }

  if (loading && !run) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading run…
      </div>
    )
  }

  if (error) {
    return <div className="p-6 text-sm text-red-500">Failed to load run: {error}</div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{run?.agent_name || run?.agent_key || 'Agent run'}</div>
          {run && (
            <span className={statusBadge(run.status)}>
              {run.status === 'running' && (
                <Loader2 className="inline w-3 h-3 mr-1 animate-spin" />
              )}
              {run.status}
            </span>
          )}
        </div>
        {run?.goal && <div className="text-sm text-muted-foreground">{run.goal}</div>}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Steps: {run?.steps ?? events.length}</span>
          {typeof run?.cost_usd === 'number' && <span>Cost: ${run.cost_usd.toFixed(4)}</span>}
          {run?.files_written?.length ? (
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {run.files_written.length} file(s)
            </span>
          ) : null}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {events.length === 0 && (
          <div className="text-sm text-muted-foreground">Waiting for the first step…</div>
        )}
        {events.map((ev) => {
          const meta = EVENT_META[ev.type] ?? EVENT_META.observe
          const payload = ev.payload as Record<string, unknown>
          const ok = payload?.ok
          return (
            <div
              key={ev.id}
              className="flex items-start gap-3 rounded-md border bg-card/50 p-3 text-sm"
            >
              <div className={cn('mt-0.5', meta.color)}>{meta.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{meta.label}</span>
                  <span className="text-xs text-muted-foreground">step {ev.step}</span>
                  {ev.tool && (
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{ev.tool}</code>
                  )}
                  {ev.type === 'observe' && typeof ok === 'boolean' && (
                    <span className={ok ? 'text-emerald-500' : 'text-red-500'}>
                      {ok ? '✓' : '✗'}
                    </span>
                  )}
                </div>
                {Object.keys(payload || {}).length > 0 && (
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
                    {JSON.stringify(payload, null, 2).slice(0, 600)}
                  </pre>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const RunInspector = memo(RunInspectorComponent)
