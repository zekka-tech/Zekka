import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import { SettingToggle } from '../SettingToggle'

describe('SettingToggle', () => {
  it('renders label and description', () => {
    const mockOnChange = vi.fn()
    const { getByText } = renderWithProviders(
      <SettingToggle
        label="Test Setting"
        description="Test description"
        checked={false}
        onChange={mockOnChange}
      />
    )

    expect(getByText('Test Setting')).toBeInTheDocument()
    expect(getByText('Test description')).toBeInTheDocument()
  })

  it('renders as unchecked initially', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingToggle
        label="Test Setting"
        checked={false}
        onChange={mockOnChange}
      />
    )

    const button = container.querySelector('button[role="switch"]')
    expect(button?.getAttribute('aria-checked')).toBe('false')
  })

  it('renders as checked when checked prop is true', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingToggle
        label="Test Setting"
        checked={true}
        onChange={mockOnChange}
      />
    )

    const button = container.querySelector('button[role="switch"]')
    expect(button?.getAttribute('aria-checked')).toBe('true')
  })

  it('calls onChange when toggled', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingToggle
        label="Test Setting"
        checked={false}
        onChange={mockOnChange}
      />
    )

    const button = container.querySelector('button[role="switch"]') as HTMLButtonElement
    button.click()

    expect(mockOnChange).toHaveBeenCalledWith(true)
  })

  it('toggles to false when already checked', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingToggle
        label="Test Setting"
        checked={true}
        onChange={mockOnChange}
      />
    )

    const button = container.querySelector('button[role="switch"]') as HTMLButtonElement
    button.click()

    expect(mockOnChange).toHaveBeenCalledWith(false)
  })

  it('disables toggle when disabled prop is true', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingToggle
        label="Test Setting"
        checked={false}
        onChange={mockOnChange}
        disabled={true}
      />
    )

    const button = container.querySelector('button[role="switch"]') as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.className).toContain('opacity-50')
  })

  it('does not call onChange when disabled', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingToggle
        label="Test Setting"
        checked={false}
        onChange={mockOnChange}
        disabled={true}
      />
    )

    const button = container.querySelector('button[role="switch"]') as HTMLButtonElement
    button.click()

    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('renders children when provided', () => {
    const mockOnChange = vi.fn()
    const { getByText } = renderWithProviders(
      <SettingToggle
        label="Test Setting"
        checked={false}
        onChange={mockOnChange}
      >
        <div>Child content</div>
      </SettingToggle>
    )

    expect(getByText('Child content')).toBeInTheDocument()
  })

  it('has accessible aria-label', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingToggle
        label="Test Setting"
        checked={false}
        onChange={mockOnChange}
      />
    )

    const button = container.querySelector('button[role="switch"]')
    expect(button?.getAttribute('aria-label')).toBe('Test Setting')
  })

  it('applies correct styling when checked', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingToggle
        label="Test Setting"
        checked={true}
        onChange={mockOnChange}
      />
    )

    const button = container.querySelector('button[role="switch"]')
    expect(button?.className).toContain('bg-primary')
  })

  it('applies correct styling when unchecked', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingToggle
        label="Test Setting"
        checked={false}
        onChange={mockOnChange}
      />
    )

    const button = container.querySelector('button[role="switch"]')
    expect(button?.className).toContain('bg-muted')
  })
})
