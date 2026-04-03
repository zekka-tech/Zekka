import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders, screen } from '@/test/test-utils'
import { ThemeToggle } from '../ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('light', 'dark')
  })

  it('renders toggle button', async () => {
    renderWithProviders(<ThemeToggle />)
    expect(await screen.findByRole('button')).toBeInTheDocument()
  })

  it('toggles theme classes on click', async () => {
    renderWithProviders(<ThemeToggle />)

    const button = await screen.findByRole('button')
    fireEvent.click(button)

    const hasThemeClass =
      document.documentElement.classList.contains('light')
      || document.documentElement.classList.contains('dark')

    expect(hasThemeClass).toBe(true)
  })

  it('has accessible label with current theme', async () => {
    renderWithProviders(<ThemeToggle />)
    const button = await screen.findByRole('button')
    expect(button).toHaveAttribute('aria-label')
    expect(button.getAttribute('aria-label')).toContain('Toggle theme')
  })
})
