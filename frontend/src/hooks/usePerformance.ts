import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Debounce hook - delays execution of a callback until after a specified delay
 * Useful for search inputs, resize events, etc.
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Throttle hook - limits execution of a callback to once per specified delay
 * Useful for scroll events, window resize, etc.
 */
export function useThrottle<T>(value: T, delay: number = 500): T {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const lastRan = useRef(Date.now())

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= delay) {
        setThrottledValue(value)
        lastRan.current = Date.now()
      }
    }, delay - (Date.now() - lastRan.current))

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return throttledValue
}

/**
 * Intersection Observer hook - detects when an element enters/exits viewport
 * Useful for lazy loading, infinite scroll, animations on scroll
 */
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options?: IntersectionObserverInit
): IntersectionObserverEntry | null {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry)
      },
      {
        threshold: 0.1,
        rootMargin: '0px',
        ...options,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [elementRef, options])

  return entry
}

/**
 * Media query hook - reactive media query matching
 * Useful for responsive behavior in JS
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    return false
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Modern browsers
    mediaQuery.addEventListener('change', handler)

    return () => {
      mediaQuery.removeEventListener('change', handler)
    }
  }, [query])

  return matches
}

/**
 * Previous value hook - stores previous value of a state
 * Useful for animations, transitions, comparing changes
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}

/**
 * Local storage hook - syncs state with localStorage
 * Useful for persisting UI preferences, theme, etc.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T) => {
      try {
        setStoredValue(value)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(value))
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key]
  )

  return [storedValue, setValue]
}

/**
 * Window size hook - reactive window dimensions
 * Useful for responsive layout calculations
 */
export function useWindowSize() {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  })

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return size
}

/**
 * Click outside hook - detects clicks outside of an element
 * Useful for closing modals, dropdowns, etc.
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: React.RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref?.current
      if (!el || el.contains(event.target as Node)) {
        return
      }
      handler(event)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}

/**
 * Optimistic updates hook - for better UX during async operations
 * Useful for mutations, form submissions, etc.
 */
export function useOptimistic<T>(
  initialValue: T,
  updateFn: (current: T, optimisticValue: T) => Promise<T>
) {
  const [value, setValue] = useState<T>(initialValue)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const update = useCallback(
    async (optimisticValue: T) => {
      setIsPending(true)
      setError(null)
      const previousValue = value

      // Optimistically update
      setValue(optimisticValue)

      try {
        const result = await updateFn(previousValue, optimisticValue)
        setValue(result)
      } catch (err) {
        // Rollback on error
        setValue(previousValue)
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsPending(false)
      }
    },
    [value, updateFn]
  )

  return { value, update, isPending, error }
}

/**
 * Async state hook - manages loading, error, and data states for async operations
 * Useful for API calls, async computations, etc.
 */
export function useAsync<T, E = Error>(
  asyncFunction: () => Promise<T>,
  immediate = true
) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const [value, setValue] = useState<T | null>(null)
  const [error, setError] = useState<E | null>(null)

  const execute = useCallback(async () => {
    setStatus('pending')
    setValue(null)
    setError(null)

    try {
      const response = await asyncFunction()
      setValue(response)
      setStatus('success')
      return response
    } catch (err) {
      setError(err as E)
      setStatus('error')
      throw err
    }
  }, [asyncFunction])

  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [execute, immediate])

  return { execute, status, value, error, isLoading: status === 'pending' }
}

/**
 * Idle detection hook - detects when user is idle
 * Useful for auto-logout, saving drafts, pausing videos, etc.
 */
export function useIdleDetection(timeout: number = 5 * 60 * 1000) {
  const [isIdle, setIsIdle] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const handleActivity = () => {
      setIsIdle(false)
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        setIsIdle(true)
      }, timeout)
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, handleActivity)
    })

    // Initial timeout
    handleActivity()

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [timeout])

  return isIdle
}

/**
 * Copy to clipboard hook - with success/error feedback
 * Useful for copy buttons, share functionality, etc.
 */
export function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const copy = useCallback(async (text: string) => {
    if (!navigator?.clipboard) {
      const err = new Error('Clipboard API not available')
      setError(err)
      return false
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      setError(null)
      
      // Reset after 2 seconds
      setTimeout(() => setCopiedText(null), 2000)
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Copy failed'))
      setCopiedText(null)
      return false
    }
  }, [])

  return { copy, copiedText, error }
}
