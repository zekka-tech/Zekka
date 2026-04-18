import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders, screen } from '@/test/test-utils'
import { Settings } from '../Settings'

describe('Settings Page', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders page header and default section', () => {
    renderWithProviders(<Settings />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(
      screen.getByText('Manage your preferences and application settings')
    ).toBeInTheDocument()
    expect(screen.getByText('Default Dashboard')).toBeInTheDocument()
  })

  it('renders sidebar categories', { timeout: 15000 }, () => {
    renderWithProviders(<Settings />)
    expect(screen.getByRole('button', { name: /General/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Appearance/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Notifications/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Privacy/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Advanced/i })).toBeInTheDocument()
  })

  it('switches between sections', () => {
    renderWithProviders(<Settings />)

    fireEvent.click(screen.getByRole('button', { name: /Appearance/i }))
    expect(screen.getByText('Theme')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))
    expect(screen.getByText('Enable Notifications')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Privacy/i }))
    expect(screen.getByText('Analytics Tracking')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Advanced/i }))
    expect(screen.getByText('Developer Features')).toBeInTheDocument()
  })

  it('renders data management actions in general section', () => {
    renderWithProviders(<Settings />)
    expect(screen.getByRole('button', { name: 'Export Preferences' })).toBeInTheDocument()
    expect(screen.getByText('Import Preferences')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset to Defaults' })).toBeInTheDocument()
  })

  it('persists preference updates', () => {
    renderWithProviders(<Settings />)
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))

    const toggle = screen.getByRole('switch', { name: /Enable Notifications/i })
    fireEvent.click(toggle)

    expect(localStorage.getItem('user-preferences')).toBeTruthy()
  })

  it('confirms before reset', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderWithProviders(<Settings />)

    fireEvent.click(screen.getByRole('button', { name: 'Reset to Defaults' }))
    expect(confirmSpy).toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})
