import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import { SettingsSidebar } from '../SettingsSidebar'

describe('SettingsSidebar', () => {
  it('renders all setting categories', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingsSidebar activeCategory="general" onCategoryChange={mockOnChange} />
    )

    const buttons = container.querySelectorAll('button')
    expect(buttons).toHaveLength(5)
  })

  it('displays category labels', () => {
    const mockOnChange = vi.fn()
    const { getByText } = renderWithProviders(
      <SettingsSidebar activeCategory="general" onCategoryChange={mockOnChange} />
    )

    expect(getByText('General')).toBeInTheDocument()
    expect(getByText('Appearance')).toBeInTheDocument()
    expect(getByText('Notifications')).toBeInTheDocument()
    expect(getByText('Privacy')).toBeInTheDocument()
    expect(getByText('Advanced')).toBeInTheDocument()
  })

  it('highlights active category', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingsSidebar activeCategory="appearance" onCategoryChange={mockOnChange} />
    )

    const buttons = Array.from(container.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
    const appearanceButton = buttons.find(btn => btn.textContent?.includes('Appearance'))

    expect(appearanceButton).toBeTruthy()
    expect(appearanceButton?.className).toContain('bg-primary')
  })

  it('calls onCategoryChange when category is clicked', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingsSidebar activeCategory="general" onCategoryChange={mockOnChange} />
    )

    const buttons = Array.from(container.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
    const appearanceButton = buttons.find(btn => btn.textContent?.includes('Appearance')) as HTMLButtonElement | undefined

    appearanceButton?.click()
    expect(mockOnChange).toHaveBeenCalledWith('appearance')
  })

  it('displays category descriptions', () => {
    const mockOnChange = vi.fn()
    const { getByText } = renderWithProviders(
      <SettingsSidebar activeCategory="general" onCategoryChange={mockOnChange} />
    )

    expect(getByText('Basic application settings')).toBeInTheDocument()
    expect(getByText('Theme and visual preferences')).toBeInTheDocument()
  })

  it('sets aria-current on active category', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingsSidebar activeCategory="privacy" onCategoryChange={mockOnChange} />
    )

    const buttons = Array.from(container.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
    const privacyButton = buttons.find(btn => btn.textContent?.includes('Privacy')) as HTMLButtonElement | undefined

    expect(privacyButton?.getAttribute('aria-current')).toBe('page')
  })

  it('does not set aria-current on inactive categories', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingsSidebar activeCategory="general" onCategoryChange={mockOnChange} />
    )

    const buttons = Array.from(container.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
    const appearanceButton = buttons.find(btn => btn.textContent?.includes('Appearance')) as HTMLButtonElement | undefined

    expect(appearanceButton?.getAttribute('aria-current')).toBeNull()
  })
})
