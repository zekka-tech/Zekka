import { useState } from 'react'
import { SettingsSidebar, type SettingCategory } from '@/components/settings/SettingsSidebar'
import { SettingsSection } from '@/components/settings/SettingsSection'
import { SettingToggle } from '@/components/settings/SettingToggle'
import { SettingSelect } from '@/components/settings/SettingSelect'
import { usePreferences } from '@/hooks/usePreferences'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'

export const Settings = () => {
  const [activeCategory, setActiveCategory] = useState<SettingCategory>('general')
  const {
    preferences,
    updatePreference,
    updateNestedPreference,
    resetToDefaults,
    exportPreferences,
    importPreferences,
  } = usePreferences()
  const { theme, setTheme } = useTheme()
  const { success: successToast, error: errorToast } = useToast()

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      importPreferences(file)
        .then(() => {
          successToast('Preferences imported successfully')
        })
        .catch((error) => {
          errorToast('Failed to import preferences', error instanceof Error ? error.message : 'Unknown error')
        })
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your preferences and application settings
        </p>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <SettingsSidebar
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl p-6 space-y-6">
            {/* General Settings */}
            {activeCategory === 'general' && (
              <>
                <SettingsSection
                  title="Default Dashboard"
                  description="Choose which page loads when you open the application"
                >
                  <SettingSelect
                    label="Home Page"
                    value={preferences.analytics.defaultPeriod}
                    options={[
                      { value: 'day', label: 'Analytics (Daily)' },
                      { value: 'week', label: 'Analytics (Weekly)' },
                      { value: 'month', label: 'Analytics (Monthly)' },
                    ]}
                    onChange={(value) =>
                      updateNestedPreference('analytics', {
                        defaultPeriod: value as 'day' | 'week' | 'month',
                      })
                    }
                  />
                </SettingsSection>

                <SettingsSection
                  title="Data Management"
                  description="Export or import your preferences and settings"
                >
                  <div className="space-y-3">
                    <Button
                      onClick={exportPreferences}
                      variant="outline"
                      className="w-full"
                    >
                      Export Preferences
                    </Button>
                    <div>
                      <label className="inline-block">
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleFileImport}
                          className="hidden"
                        />
                        <span className="inline-flex items-center justify-center px-4 py-2 border border-border rounded-md text-sm font-medium cursor-pointer hover:bg-muted transition-colors w-full">
                          Import Preferences
                        </span>
                      </label>
                    </div>
                    <Button
                      onClick={() => {
                        if (
                          confirm(
                            'Are you sure you want to reset all settings to defaults? This cannot be undone.'
                          )
                        ) {
                          resetToDefaults()
                        }
                      }}
                      variant="destructive"
                      className="w-full"
                    >
                      Reset to Defaults
                    </Button>
                  </div>
                </SettingsSection>
              </>
            )}

            {/* Appearance Settings */}
            {activeCategory === 'appearance' && (
              <>
                <SettingsSection
                  title="Theme"
                  description="Customize the visual appearance of the application"
                >
                  <SettingSelect
                    label="Color Scheme"
                    value={theme}
                    options={[
                      {
                        value: 'light',
                        label: 'Light',
                        description: 'Always use light theme',
                      },
                      {
                        value: 'dark',
                        label: 'Dark',
                        description: 'Always use dark theme',
                      },
                      {
                        value: 'system',
                        label: 'System',
                        description: 'Match your system preference',
                      },
                    ]}
                    onChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
                  />
                </SettingsSection>

                <SettingsSection
                  title="Layout"
                  description="Adjust the layout and display options"
                >
                  <SettingToggle
                    label="Compact Mode"
                    description="Use a more compact layout with reduced spacing"
                    checked={preferences.compactMode}
                    onChange={(value) =>
                      updatePreference('compactMode', value)
                    }
                  />
                </SettingsSection>

                <SettingsSection
                  title="Text Size"
                  description="Adjust the default text size across the application"
                >
                  <SettingSelect
                    label="Font Size"
                    value={preferences.fontSize}
                    options={[
                      { value: 'small', label: 'Small' },
                      { value: 'default', label: 'Default' },
                      { value: 'large', label: 'Large' },
                    ]}
                    onChange={(value) =>
                      updatePreference('fontSize', value as 'small' | 'default' | 'large')
                    }
                  />
                </SettingsSection>

                <SettingsSection
                  title="Accent Color"
                  description="Choose your preferred accent color"
                >
                  <SettingSelect
                    label="Accent"
                    value={preferences.accentColor}
                    options={[
                      { value: 'blue', label: 'Blue' },
                      { value: 'purple', label: 'Purple' },
                      { value: 'green', label: 'Green' },
                      { value: 'red', label: 'Red' },
                    ]}
                    onChange={(value) =>
                      updatePreference('accentColor', value as 'blue' | 'purple' | 'green' | 'red')
                    }
                  />
                </SettingsSection>
              </>
            )}

            {/* Notifications Settings */}
            {activeCategory === 'notifications' && (
              <>
                <SettingsSection
                  title="Notifications"
                  description="Manage how and when you receive notifications"
                >
                  <SettingToggle
                    label="Enable Notifications"
                    description="Turn notifications on or off"
                    checked={preferences.notifications.enabled}
                    onChange={(value) =>
                      updateNestedPreference('notifications', {
                        enabled: value,
                      })
                    }
                  />

                  <div className="border-t border-border my-4" />

                  <SettingToggle
                    label="Sound"
                    description="Play sound when notifications arrive"
                    checked={preferences.notifications.sound}
                    onChange={(value) =>
                      updateNestedPreference('notifications', {
                        sound: value,
                      })
                    }
                    disabled={!preferences.notifications.enabled}
                  />

                  <SettingToggle
                    label="Desktop Notifications"
                    description="Show system notifications on your desktop"
                    checked={preferences.notifications.desktop}
                    onChange={(value) =>
                      updateNestedPreference('notifications', {
                        desktop: value,
                      })
                    }
                    disabled={!preferences.notifications.enabled}
                  />

                  <SettingToggle
                    label="Email Notifications"
                    description="Receive important updates via email"
                    checked={preferences.notifications.email}
                    onChange={(value) =>
                      updateNestedPreference('notifications', {
                        email: value,
                      })
                    }
                    disabled={!preferences.notifications.enabled}
                  />
                </SettingsSection>
              </>
            )}

            {/* Privacy Settings */}
            {activeCategory === 'privacy' && (
              <>
                <SettingsSection
                  title="Privacy"
                  description="Control your data and privacy preferences"
                >
                  <SettingToggle
                    label="Analytics Tracking"
                    description="Allow us to collect anonymous usage data to improve the application"
                    checked={preferences.privacy.trackingEnabled}
                    onChange={(value) =>
                      updateNestedPreference('privacy', {
                        trackingEnabled: value,
                      })
                    }
                  />

                  <SettingToggle
                    label="Error Reporting"
                    description="Automatically send error reports to help us identify and fix issues"
                    checked={preferences.privacy.errorReporting}
                    onChange={(value) =>
                      updateNestedPreference('privacy', {
                        errorReporting: value,
                      })
                    }
                  />
                </SettingsSection>
              </>
            )}

            {/* Advanced Settings */}
            {activeCategory === 'advanced' && (
              <>
                <SettingsSection
                  title="Command Palette"
                  description="Configure command palette behavior"
                >
                  <SettingSelect
                    label="Recent Items Count"
                    description="Maximum number of recent items to show"
                    value={preferences.commandPalette.recentItems}
                    options={[
                      { value: 5, label: '5 items' },
                      { value: 10, label: '10 items' },
                      { value: 20, label: '20 items' },
                      { value: 50, label: '50 items' },
                    ]}
                    onChange={(value) =>
                      updateNestedPreference('commandPalette', {
                        recentItems: value as number,
                      })
                    }
                  />

                  <SettingToggle
                    label="Show Keyboard Shortcuts"
                    description="Display keyboard shortcut hints in command palette"
                    checked={preferences.commandPalette.showShortcuts}
                    onChange={(value) =>
                      updateNestedPreference('commandPalette', {
                        showShortcuts: value,
                      })
                    }
                  />
                </SettingsSection>

                <SettingsSection
                  title="Analytics"
                  description="Analytics page preferences"
                >
                  <SettingToggle
                    label="Show Costs"
                    description="Display cost information in analytics charts"
                    checked={preferences.analytics.showCosts}
                    onChange={(value) =>
                      updateNestedPreference('analytics', {
                        showCosts: value,
                      })
                    }
                  />

                  <SettingToggle
                    label="Auto Refresh"
                    description="Automatically refresh analytics data every 30 seconds"
                    checked={preferences.analytics.autoRefresh}
                    onChange={(value) =>
                      updateNestedPreference('analytics', {
                        autoRefresh: value,
                      })
                    }
                  />
                </SettingsSection>

                <SettingsSection
                  title="Developer Features"
                  description="Advanced features for developers"
                >
                  <SettingToggle
                    label="Developer Mode"
                    description="Enable developer-specific features and tools"
                    checked={preferences.advanced.developerMode}
                    onChange={(value) =>
                      updateNestedPreference('advanced', {
                        developerMode: value,
                      })
                    }
                  />

                  <SettingToggle
                    label="Performance Metrics"
                    description="Display performance metrics in the UI"
                    checked={preferences.advanced.showPerformanceMetrics}
                    onChange={(value) =>
                      updateNestedPreference('advanced', {
                        showPerformanceMetrics: value,
                      })
                    }
                  />
                </SettingsSection>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
