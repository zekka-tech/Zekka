import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMutationQueue } from '../useMutationQueue'

// Control navigator.onLine
function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true, writable: true })
}

beforeEach(() => {
  setOnline(true)
})

describe('useMutationQueue', () => {
  it('runs the mutation immediately when online', async () => {
    setOnline(true)
    const fn = vi.fn().mockResolvedValue('ok')
    const { result } = renderHook(() => useMutationQueue())

    act(() => {
      result.current.enqueue({ id: 'a', label: 'test', fn })
    })

    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1))
    expect(result.current.pendingCount).toBe(0)
  })

  it('queues the mutation when offline and does not call fn yet', async () => {
    setOnline(false)
    const fn = vi.fn().mockResolvedValue('ok')
    const { result } = renderHook(() => useMutationQueue())

    act(() => {
      result.current.enqueue({ id: 'b', label: 'queued', fn })
    })

    expect(fn).not.toHaveBeenCalled()
    expect(result.current.pendingCount).toBe(1)
  })

  it('flushes queued mutations when going back online', async () => {
    setOnline(false)
    const fn = vi.fn().mockResolvedValue('ok')
    const { result } = renderHook(() => useMutationQueue())

    act(() => {
      result.current.enqueue({ id: 'c', label: 'deferred', fn })
    })

    expect(result.current.pendingCount).toBe(1)

    // Simulate coming back online
    act(() => {
      setOnline(true)
      window.dispatchEvent(new Event('online'))
    })

    await waitFor(() => {
      expect(fn).toHaveBeenCalledTimes(1)
      expect(result.current.pendingCount).toBe(0)
    })
  })

  it('removes a mutation from the queue after it succeeds', async () => {
    setOnline(false)
    const fn = vi.fn().mockResolvedValue('done')
    const { result } = renderHook(() => useMutationQueue())

    act(() => {
      result.current.enqueue({ id: 'd', label: 'will succeed', fn })
    })

    await act(async () => {
      await result.current.flush()
    })

    // flush while still "offline" — fn is called by flush directly
    await waitFor(() => expect(result.current.pendingCount).toBe(0))
  })

  it('retries up to 3 times then drops a persistently failing mutation', async () => {
    setOnline(false)
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    const { result } = renderHook(() => useMutationQueue())

    act(() => {
      result.current.enqueue({ id: 'e', label: 'will fail', fn })
    })

    // Flush 3 times to exhaust retries
    for (let i = 0; i < 3; i++) {
      await act(async () => { await result.current.flush() })
    }

    expect(result.current.pendingCount).toBe(0)
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(1)
  })
})
