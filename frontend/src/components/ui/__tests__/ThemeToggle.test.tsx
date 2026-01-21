import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ThemeToggle } from '../ThemeToggle'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '@testing-library/react'

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders toggle button', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /toggle theme/i })
    expect(button).toBeInTheDocument()
  })

  it('toggles between light and dark mode', async () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button')

    // Initially should be light mode (sun icon visible)
    expect(button.querySelector('svg')).toBeInTheDocument()

    // Click to toggle
    fireEvent.click(button)

    // Verify localStorage was updated
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark')
  })

  it('applies dark class to document element', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button')

    // Toggle to dark
    fireEvent.click(button)

    // Verify dark class is added
    expect(document.documentElement.classList.contains('dark')).toBeTruthy()
  })

  it('has accessible aria-label', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Toggle theme')
  })
})
