import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ThemeToggle } from '../ThemeToggle'

// Mock fireEvent using simulated clicks
const fireEvent = {
  click: (element: HTMLElement) => {
    element.click()
  }
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders toggle button', () => {
    const queries = render(<ThemeToggle />)
    const button = queries.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('toggles between light and dark mode', async () => {
    const queries = render(<ThemeToggle />)
    const button = queries.getByRole('button')

    // Initially should be light mode (sun icon visible)
    expect(button.querySelector('svg')).toBeInTheDocument()

    // Click to toggle
    fireEvent.click(button)

    // Verify localStorage was updated
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark')
  })

  it('applies dark class to document element', () => {
    const queries = render(<ThemeToggle />)
    const button = queries.getByRole('button')

    // Toggle to dark
    fireEvent.click(button)

    // Verify dark class is added
    expect(document.documentElement.classList.contains('dark')).toBeTruthy()
  })

  it('has accessible aria-label', () => {
    const queries = render(<ThemeToggle />)
    const button = queries.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Toggle theme')
  })
})
