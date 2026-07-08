import { useCallback, useEffect, useRef, useState } from 'react'
import { useOnlineStatus } from './useOnlineStatus'

export interface QueuedMutation<T = unknown> {
  id: string
  label: string
  fn: () => Promise<T>
  retries?: number
}

interface MutationQueueState {
  pending: QueuedMutation[]
  isFlusing: boolean
}

/**
 * Accumulates write operations while offline and re-runs them in FIFO order
 * once connectivity is restored.
 *
 * Usage:
 *   const { enqueue, pending, isFlushing } = useMutationQueue()
 *   // Instead of calling the mutation directly:
 *   enqueue({ id: 'create-msg-123', label: 'Send message', fn: () => api.sendMessage(...) })
 */
export function useMutationQueue() {
  const isOnline = useOnlineStatus()
  const [state, setState] = useState<MutationQueueState>({ pending: [], isFlusing: false })
  const queueRef = useRef<QueuedMutation[]>([])
  const isFlushing = useRef(false)

  const enqueue = useCallback(<T>(mutation: QueuedMutation<T>) => {
    if (isOnline && !isFlushing.current) {
      // Online and idle — run immediately, no queuing needed
      mutation.fn().catch((err) => {
        console.error(`[MutationQueue] ${mutation.label} failed:`, err)
      })
      return
    }

    queueRef.current = [...queueRef.current, mutation as QueuedMutation]
    setState((s) => ({ ...s, pending: queueRef.current }))
  }, [isOnline])

  const flush = useCallback(async () => {
    if (isFlushing.current || queueRef.current.length === 0) return
    isFlushing.current = true
    setState((s) => ({ ...s, isFlusing: true }))

    const toRun = [...queueRef.current]
    const failed: QueuedMutation[] = []

    for (const mutation of toRun) {
      try {
        await mutation.fn()
        queueRef.current = queueRef.current.filter((m) => m.id !== mutation.id)
        setState((s) => ({ ...s, pending: queueRef.current }))
      } catch (err) {
        console.error(`[MutationQueue] ${mutation.label} failed during flush:`, err)
        const retries = (mutation.retries ?? 0) + 1
        if (retries < 3) {
          failed.push({ ...mutation, retries })
        } else {
          console.error(`[MutationQueue] Dropping ${mutation.label} after 3 retries`)
          queueRef.current = queueRef.current.filter((m) => m.id !== mutation.id)
        }
      }
    }

    // Re-queue failed items with incremented retry count
    if (failed.length > 0) {
      queueRef.current = [...failed, ...queueRef.current.filter((m) => !failed.find((f) => f.id === m.id))]
    }

    isFlushing.current = false
    setState((s) => ({ ...s, pending: queueRef.current, isFlusing: false }))
  }, [])

  // Auto-flush when connection returns
  useEffect(() => {
    if (isOnline && queueRef.current.length > 0) {
      flush()
    }
  }, [isOnline, flush])

  return {
    enqueue,
    flush,
    pending: state.pending,
    isFlushing: state.isFlusing,
    pendingCount: state.pending.length
  }
}
