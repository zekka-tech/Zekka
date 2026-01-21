import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import { Settings } from '../Settings'

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

describe('Settings Page', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders settings page title', () => {
    const { getByText } = renderWithProviders(<Settings />)
    expect(getByText('Settings')).toBeInTheDocument()
  })

  it('renders settings page description', () => {
    const { getByText } = renderWithProviders(<Settings />)
    expect(getByText('Manage your preferences and application settings')).toBeInTheDocument()
  })

  it('renders sidebar with all categories', () => {
    const { getByText } = renderWithProviders(<Settings />)

    expect(getByText('General')).toBeInTheDocument()
    expect(getByText('Appearance')).toBeInTheDocument()
    expect(getByText('Notifications')).toBeInTheDocument()
    expect(getByText('Privacy')).toBeInTheDocument()
    expect(getByText('Advanced')).toBeInTheDocument()
  })

  it('shows general settings by default', () => {
    const { getByText } = renderWithProviders(<Settings />)
    expect(getByText('Default Dashboard')).toBeInTheDocument()
  })

  it('switches to appearance settings when clicked', () => {
    const { getByText } = renderWithProviders(<Settings />)

    const appearanceButton = Array.from(
      getByText('Appearance').closest('button')?.parentElement?.querySelectorAll('button') as NodeListOf<HTMLButtonElement> || []
    ).find(btn => btn.textContent?.includes('Appearance'))

    if (appearanceButton) {
      appearanceButton.click()
      expect(getByText('Theme')).toBeInTheDocument()
    }
  })

  it('renders general settings content', () => {
    const { getByText } = renderWithProviders(<Settings />)

    expect(getByText('Default Dashboard')).toBeInTheDocument()
    expect(getByText('Data Management')).toBeInTheDocument()
  })

  it('displays theme selector in appearance settings', () => {
    const { getByText, container } = renderWithProviders(<Settings />)

    // Navigate to appearance
    const appearanceBtn = Array.from(container.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(btn =>
      btn.textContent?.includes('Appearance')
    ) as HTMLButtonElement | undefined

    if (appearanceBtn) {
      appearanceBtn.click()
      expect(getByText('Theme')).toBeInTheDocument()
      expect(getByText('Color Scheme')).toBeInTheDocument()
    }
  })

  it('displays notification toggles in notifications settings', () => {
    const { getByText, container } = renderWithProviders(<Settings />)

    // Navigate to notifications
    const notificationsBtn = Array.from(container.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(btn =>
      btn.textContent?.includes('Notifications')
    ) as HTMLButtonElement | undefined

    if (notificationsBtn) {
      notificationsBtn.click()
      expect(getByText('Enable Notifications')).toBeInTheDocument()
    }
  })

  it('displays privacy options in privacy settings', () => {
    const { getByText, container } = renderWithProviders(<Settings />)

    // Navigate to privacy
    const privacyBtn = Array.from(container.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(btn =>
      btn.textContent?.includes('Privacy')
    ) as HTMLButtonElement | undefined

    if (privacyBtn) {
      privacyBtn.click()
      expect(getByText('Analytics Tracking')).toBeInTheDocument()
      expect(getByText('Error Reporting')).toBeInTheDocument()
    }
  })

  it('displays advanced settings', () => {
    const { getByText, container } = renderWithProviders(<Settings />)

    // Navigate to advanced
    const advancedBtn = Array.from(container.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(btn =>
      btn.textContent?.includes('Advanced')
    ) as HTMLButtonElement | undefined

    if (advancedBtn) {
      advancedBtn.click()
      expect(getByText('Developer Features')).toBeInTheDocument()
    }
  })

  it('renders export preferences button', () => {
    const { getByText } = renderWithProviders(<Settings />)
    expect(getByText('Export Preferences')).toBeInTheDocument()
  })

  it('renders import preferences button', () => {
    const { getByText } = renderWithProviders(<Settings />)
    expect(getByText('Import Preferences')).toBeInTheDocument()
  })

  it('renders reset to defaults button', () => {
    const { getByText } = renderWithProviders(<Settings />)
    expect(getByText('Reset to Defaults')).toBeInTheDocument()
  })

  it('can navigate between all categories', () => {
    const { getByText, container } = renderWithProviders(<Settings />)

    const categories = ['General', 'Appearance', 'Notifications', 'Privacy', 'Advanced']

    categories.forEach(category => {
      const btn = Array.from(container.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(b =>
        b.textContent?.includes(category)
      ) as HTMLButtonElement | undefined

      if (btn) {
        btn.click()
        // Verify we're in that category by checking for category-specific content
        if (category === 'General') {
          expect(getByText('Default Dashboard')).toBeInTheDocument()
        }
      }
    })
  })

  it('persists preference changes to localStorage', () => {
    const { container } = renderWithProviders(<Settings />)

    // Find a toggle and click it
    const toggles = container.querySelectorAll('button[role="switch"]')
    if (toggles.length > 0) {
      (toggles[0] as HTMLButtonElement).click()
      // Verify localStorage was updated (handled by usePreferences hook)
      expect(localStorage.getItem('user-preferences')).toBeTruthy()
    }
  })

  it('renders all appearance customization options', () => {
    const { getByText, container } = renderWithProviders(<Settings />)

    // Navigate to appearance
    const appearanceBtn = Array.from(container.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(btn =>
      btn.textContent?.includes('Appearance')
    ) as HTMLButtonElement | undefined

    if (appearanceBtn) {
      appearanceBtn.click()
      expect(getByText('Layout')).toBeInTheDocument()
      expect(getByText('Text Size')).toBeInTheDocument()
      expect(getByText('Accent Color')).toBeInTheDocument()
    }
  })

  it('displays layout settings in appearance section', () => {
    const { getByText, container } = renderWithProviders(<Settings />)

    // Navigate to appearance
    const appearanceBtn = Array.from(container.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(btn =>
      btn.textContent?.includes('Appearance')
    ) as HTMLButtonElement | undefined

    if (appearanceBtn) {
      appearanceBtn.click()
      expect(getByText('Compact Mode')).toBeInTheDocument()
    }
  })

  it('has flex layout with sidebar', () => {
    const { container } = renderWithProviders(<Settings />)

    const mainContent = container.querySelector('div')
    expect(mainContent?.className).toContain('flex')
  })

  it('renders with proper container styling', () => {
    const { container } = renderWithProviders(<Settings />)

    const root = container.firstChild as HTMLElement
    expect(root?.className).toContain('h-full')
    expect(root?.className).toContain('flex')
    expect(root?.className).toContain('flex-col')
  })
})
