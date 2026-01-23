import { useState, useCallback, useEffect } from 'react'

export interface UserPreferences {
  // Appearance
  theme: 'light' | 'dark' | 'system'
  compactMode: boolean
  fontSize: 'small' | 'default' | 'large'
  accentColor: 'blue' | 'purple' | 'green' | 'red'

  // Notifications
  notifications: {
    enabled: boolean
    sound: boolean
    desktop: boolean
    email: boolean
  }

  // Command Palette
  commandPalette: {
    recentItems: number
    showShortcuts: boolean
  }

  // Analytics
  analytics: {
    defaultPeriod: 'day' | 'week' | 'month'
    showCosts: boolean
    autoRefresh: boolean
  }

  // Privacy
  privacy: {
    trackingEnabled: boolean
    errorReporting: boolean
  }

  // Advanced
  advanced: {
    developerMode: boolean
    showPerformanceMetrics: boolean
  }
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  compactMode: false,
  fontSize: 'default',
  accentColor: 'blue',
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
    email: false
  },
  commandPalette: {
    recentItems: 10,
    showShortcuts: true
  },
  analytics: {
    defaultPeriod: 'week',
    showCosts: true,
    autoRefresh: true
  },
  privacy: {
    trackingEnabled: true,
    errorReporting: true
  },
  advanced: {
    developerMode: false,
    showPerformanceMetrics: false
  }
}

const PREFERENCES_KEY = 'user-preferences'

export const usePreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem(PREFERENCES_KEY)
      return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES
    } catch {
      return DEFAULT_PREFERENCES
    }
  })

  // Persist to localStorage whenever preferences change
  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, [preferences])

  // Update a nested preference value
  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  // Update nested object properties
  const updateNestedPreference = useCallback(<K extends keyof UserPreferences>(
    section: K,
    updates: Partial<UserPreferences[K]>
  ) => {
    setPreferences(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        ...updates
      }
    }))
  }, [])

  // Reset to default preferences
  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES)
  }, [])

  // Export preferences to JSON
  const exportPreferences = useCallback(() => {
    const data = JSON.stringify(preferences, null, 2)
    const element = document.createElement('a')
    element.setAttribute('href', `data:application/json;charset=utf-8,${encodeURIComponent(data)}`)
    element.setAttribute('download', `preferences-${Date.now()}.json`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }, [preferences])

  // Import preferences from JSON
  const importPreferences = useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string)
          setPreferences(prev => ({ ...prev, ...imported }))
          resolve()
        } catch (error) {
          reject(new Error('Failed to parse preferences file'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }, [])

  return {
    preferences,
    updatePreference,
    updateNestedPreference,
    resetToDefaults,
    exportPreferences,
    importPreferences
  }
}
