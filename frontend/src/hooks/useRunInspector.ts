import { useCallback, useEffect, useRef, useState } from 'react'
import { apiService, type AgentRun, type AgentRunEvent } from '../services/api'
import { webSocketService } from '../services/websocket'

interface RunEventPayload {
  runId: string
  step: number
  type: AgentRunEvent['type']
  tool: string | null
  payload: Record<string, unknown>
}

interface RunCompletedPayload {
  runId: string
  status: string
  reason: string | null
  steps: number
}

/**
 * Subscribes to a single agent run: loads the run + its event history, then
 * streams new plan/act/observe/terminal events live over WebSocket. Events are
 * de-duplicated by id so an HTTP replay (after reconnect) and the live stream
 * never double-count.
 */
export function useRunInspector(runId: string | null) {
  const [run, setRun] = useState<AgentRun | null>(null)
  const [events, setEvents] = useState<AgentRunEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seenIds = useRef<Set<number>>(new Set())

  const addEvents = useCallback((incoming: AgentRunEvent[]) => {
    setEvents((prev) => {
      const next = [...prev]
      for (const ev of incoming) {
        const id = ev.id ?? next.length + 1
        if (seenIds.current.has(id)) continue
        seenIds.current.add(id)
        next.push({ ...ev, id })
      }
      return next.sort((a, b) => a.id - b.id)
    })
  }, [])

  useEffect(() => {
    if (!runId) return
    let cancelled = false
    seenIds.current = new Set()
    setEvents([])
    setLoading(true)
    setError(null)

    Promise.all([apiService.getRun(runId), apiService.getRunEvents(runId)])
      .then(([r, evs]) => {
        if (cancelled) return
        setRun(r)
        addEvents(evs)
      })
      .catch((e) => !cancelled && setError(e?.message || 'Failed to load run'))
      .finally(() => !cancelled && setLoading(false))

    const onEvent = (...args: unknown[]) => {
      const data = args[0] as RunEventPayload
      if (!data || data.runId !== runId) return
      addEvents([
        {
          id: Date.now() + Math.random(),
          step: data.step,
          type: data.type,
          tool: data.tool,
          payload: data.payload || {},
        },
      ])
    }
    const onCompleted = (...args: unknown[]) => {
      const data = args[0] as RunCompletedPayload
      if (!data || data.runId !== runId) return
      setRun((prev) =>
        prev ? { ...prev, status: data.status, reason: data.reason, steps: data.steps } : prev
      )
    }

    webSocketService.emit('subscribe:run', runId)
    webSocketService.on('run:event', onEvent)
    webSocketService.on('run:completed', onCompleted)

    return () => {
      cancelled = true
      webSocketService.emit('unsubscribe:run', runId)
      webSocketService.off('run:event', onEvent)
      webSocketService.off('run:completed', onCompleted)
    }
  }, [runId, addEvents])

  return { run, events, loading, error }
}
