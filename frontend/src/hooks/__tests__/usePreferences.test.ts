import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePreferences } from '../usePreferences'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('usePreferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns preferences object', () => {
    const { result } = renderHook(() => usePreferences())

    expect(result.current.preferences).toBeDefined()
    expect(result.current.updatePreference).toBeDefined()
    expect(result.current.updateNestedPreference).toBeDefined()
  })

  it('loads default preferences initially', () => {
    const { result } = renderHook(() => usePreferences())

    expect(result.current.preferences.theme).toBe('system')
    expect(result.current.preferences.compactMode).toBe(false)
  })

  it('persists preferences to localStorage', () => {
    const { result } = renderHook(() => usePreferences())

    act(() => {
      result.current.updatePreference('compactMode', true)
    })

    const stored = localStorage.getItem('user-preferences')
    expect(stored).toBeTruthy()

    const parsed = JSON.parse(stored!)
    expect(parsed.compactMode).toBe(true)
  })

  it('loads preferences from localStorage', () => {
    const prefs = {
      theme: 'dark',
      compactMode: true,
      fontSize: 'large',
      accentColor: 'purple',
      notifications: { enabled: false, sound: false, desktop: false, email: false },
      commandPalette: { recentItems: 10, showShortcuts: true },
      analytics: { defaultPeriod: 'month', showCosts: true, autoRefresh: true },
      privacy: { trackingEnabled: false, errorReporting: false },
      advanced: { developerMode: true, showPerformanceMetrics: true },
    }

    localStorage.setItem('user-preferences', JSON.stringify(prefs))

    const { result } = renderHook(() => usePreferences())

    expect(result.current.preferences.theme).toBe('dark')
    expect(result.current.preferences.compactMode).toBe(true)
  })

  it('updates top-level preferences', () => {
    const { result } = renderHook(() => usePreferences())

    act(() => {
      result.current.updatePreference('compactMode', true)
    })

    expect(result.current.preferences.compactMode).toBe(true)
  })

  it('updates nested preferences', () => {
    const { result } = renderHook(() => usePreferences())

    act(() => {
      result.current.updateNestedPreference('notifications', { enabled: false })
    })

    expect(result.current.preferences.notifications.enabled).toBe(false)
  })

  it('resets to default preferences', () => {
    const { result } = renderHook(() => usePreferences())

    // Change some preferences
    act(() => {
      result.current.updatePreference('compactMode', true)
      result.current.updatePreference('theme', 'dark')
    })

    expect(result.current.preferences.compactMode).toBe(true)

    // Reset
    act(() => {
      result.current.resetToDefaults()
    })

    expect(result.current.preferences.compactMode).toBe(false)
    expect(result.current.preferences.theme).toBe('system')
  })

  it('exports preferences as JSON', () => {
    const { result } = renderHook(() => usePreferences())

    const createElementSpy = vi.spyOn(document, 'createElement')
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const removeChildSpy = vi.spyOn(document.body, 'removeChild')

    act(() => {
      result.current.exportPreferences()
    })

    expect(createElementSpy).toHaveBeenCalledWith('a')
    expect(appendChildSpy).toHaveBeenCalled()
    expect(removeChildSpy).toHaveBeenCalled()

    createElementSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  })

  it('handles malformed localStorage gracefully', () => {
    localStorage.setItem('user-preferences', 'invalid json')

    const { result } = renderHook(() => usePreferences())

    expect(result.current.preferences.theme).toBe('system')
  })

  it('merges saved preferences with defaults', () => {
    const partialPrefs = {
      theme: 'dark',
      compactMode: true,
      // Missing other properties
    }

    localStorage.setItem('user-preferences', JSON.stringify(partialPrefs))

    const { result } = renderHook(() => usePreferences())

    expect(result.current.preferences.theme).toBe('dark')
    expect(result.current.preferences.notifications.enabled).toBe(true)
  })

  it('preserves nested object structure when updating', () => {
    const { result } = renderHook(() => usePreferences())

    const originalSound = result.current.preferences.notifications.sound

    act(() => {
      result.current.updateNestedPreference('notifications', { enabled: false })
    })

    expect(result.current.preferences.notifications.sound).toBe(originalSound)
  })

  it('handles theme preference update', () => {
    const { result } = renderHook(() => usePreferences())

    act(() => {
      result.current.updatePreference('theme', 'dark')
    })

    expect(result.current.preferences.theme).toBe('dark')
  })

  it('handles fontSize update', () => {
    const { result } = renderHook(() => usePreferences())

    act(() => {
      result.current.updatePreference('fontSize', 'large')
    })

    expect(result.current.preferences.fontSize).toBe('large')
  })

  it('handles accentColor update', () => {
    const { result } = renderHook(() => usePreferences())

    act(() => {
      result.current.updatePreference('accentColor', 'purple')
    })

    expect(result.current.preferences.accentColor).toBe('purple')
  })

  it('handles analytics settings update', () => {
    const { result } = renderHook(() => usePreferences())

    act(() => {
      result.current.updateNestedPreference('analytics', {
        defaultPeriod: 'month',
        showCosts: false,
      })
    })

    expect(result.current.preferences.analytics.defaultPeriod).toBe('month')
    expect(result.current.preferences.analytics.showCosts).toBe(false)
  })

  it('handles privacy settings update', () => {
    const { result } = renderHook(() => usePreferences())

    act(() => {
      result.current.updateNestedPreference('privacy', {
        trackingEnabled: false,
      })
    })

    expect(result.current.preferences.privacy.trackingEnabled).toBe(false)
  })

  it('handles advanced settings update', () => {
    const { result } = renderHook(() => usePreferences())

    act(() => {
      result.current.updateNestedPreference('advanced', {
        developerMode: true,
      })
    })

    expect(result.current.preferences.advanced.developerMode).toBe(true)
  })
})
