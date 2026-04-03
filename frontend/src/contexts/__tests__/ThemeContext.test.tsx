import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ThemeProvider, useTheme } from '../ThemeContext'

const PREFERENCES_KEY = 'user-preferences'

const setStoredTheme = (theme: 'light' | 'dark' | 'system') => {
  localStorage.setItem(
    PREFERENCES_KEY,
    JSON.stringify({
      theme,
      compactMode: false,
      fontSize: 'default',
      accentColor: 'blue',
      notifications: { enabled: true, sound: true, desktop: true, email: false },
      commandPalette: { recentItems: 10, showShortcuts: true },
      analytics: { defaultPeriod: 'week', showCosts: true, autoRefresh: true },
      privacy: { trackingEnabled: true, errorReporting: true },
      advanced: { developerMode: false, showPerformanceMetrics: false }
    })
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.style.colorScheme = ''
  })

  it('throws when used outside ThemeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme must be used within a ThemeProvider'
    )
    spy.mockRestore()
  })

  it('defaults to system theme', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    )
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('system')
    expect(['light', 'dark']).toContain(result.current.resolvedTheme)
  })

  it('loads explicit dark theme from preferences', () => {
    setStoredTheme('dark')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    )
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('dark')
    expect(result.current.resolvedTheme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('persists theme updates to preferences storage', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    )
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setTheme('light')
    })

    const saved = localStorage.getItem(PREFERENCES_KEY)
    expect(saved).toBeTruthy()
    expect(saved).toContain('"theme":"light"')
  })

  it('applies light/dark class and colorScheme', () => {
    setStoredTheme('light')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    )
    renderHook(() => useTheme(), { wrapper })

    const hasThemeClass =
      document.documentElement.classList.contains('light')
      || document.documentElement.classList.contains('dark')

    expect(hasThemeClass).toBe(true)
    expect(['light', 'dark']).toContain(document.documentElement.style.colorScheme)
  })
})
