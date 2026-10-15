import { useEffect, type ReactNode } from 'react'
import { usePreferences } from '@/hooks/usePreferences'
import { ThemeContext, type ThemeMode } from './theme-context'

export type { ThemeMode }

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { preferences, updatePreference } = usePreferences()

  // Detect system preference
  const systemPreference = (
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  ) ? 'dark' : 'light'

  // Resolve the actual theme to use
  const resolvedTheme = (
    preferences.theme === 'system'
      ? systemPreference
      : preferences.theme
  ) as 'light' | 'dark'

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement

    // Remove both theme classes
    root.classList.remove('light', 'dark')

    // Add the resolved theme class
    root.classList.add(resolvedTheme)

    // Set CSS variables for theme
    if (resolvedTheme === 'dark') {
      root.style.colorScheme = 'dark'
    } else {
      root.style.colorScheme = 'light'
    }
  }, [resolvedTheme])

  // Listen for system theme changes
  useEffect(() => {
    if (preferences.theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      // Trigger re-render by updating a dummy state
      const root = document.documentElement
      root.classList.toggle('dark', mediaQuery.matches)
      root.classList.toggle('light', !mediaQuery.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [preferences.theme])

  const setTheme = (theme: ThemeMode) => {
    updatePreference('theme', theme)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme: preferences.theme,
        setTheme,
        resolvedTheme,
        systemPreference
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
