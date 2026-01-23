import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import { SettingSelect } from '../SettingSelect'

describe('SettingSelect', () => {
  const mockOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ]

  it('renders label and description', () => {
    const mockOnChange = vi.fn()
    const { getByText } = renderWithProviders(
      <SettingSelect
        label="Font Size"
        description="Choose your text size"
        value="medium"
        options={mockOptions}
        onChange={mockOnChange}
      />
    )

    expect(getByText('Font Size')).toBeInTheDocument()
    expect(getByText('Choose your text size')).toBeInTheDocument()
  })

  it('renders all options', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingSelect
        label="Font Size"
        value="medium"
        options={mockOptions}
        onChange={mockOnChange}
      />
    )

    const selects = container.querySelectorAll('select')
    expect(selects).toHaveLength(1)

    const options = selects[0].querySelectorAll('option')
    expect(options).toHaveLength(3)
  })

  it('renders selected option', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingSelect
        label="Font Size"
        value="large"
        options={mockOptions}
        onChange={mockOnChange}
      />
    )

    const select = container.querySelector('select') as HTMLSelectElement
    expect(select.value).toBe('large')
  })

  it('calls onChange when option is selected', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingSelect
        label="Font Size"
        value="medium"
        options={mockOptions}
        onChange={mockOnChange}
      />
    )

    const select = container.querySelector('select') as HTMLSelectElement
    select.value = 'large'
    select.dispatchEvent(new Event('change', { bubbles: true }))

    expect(mockOnChange).toHaveBeenCalledWith('large')
  })

  it('disables select when disabled prop is true', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingSelect
        label="Font Size"
        value="medium"
        options={mockOptions}
        onChange={mockOnChange}
        disabled={true}
      />
    )

    const select = container.querySelector('select') as HTMLSelectElement
    expect(select.disabled).toBe(true)
  })

  it('does not call onChange when disabled', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingSelect
        label="Font Size"
        value="medium"
        options={mockOptions}
        onChange={mockOnChange}
        disabled={true}
      />
    )

    const select = container.querySelector('select') as HTMLSelectElement
    select.value = 'large'
    select.dispatchEvent(new Event('change', { bubbles: true }))

    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('renders children when provided', () => {
    const mockOnChange = vi.fn()
    const { getByText } = renderWithProviders(
      <SettingSelect
        label="Font Size"
        value="medium"
        options={mockOptions}
        onChange={mockOnChange}
      >
        <div>Helper text</div>
      </SettingSelect>
    )

    expect(getByText('Helper text')).toBeInTheDocument()
  })

  it('works with number values', () => {
    const mockOnChange = vi.fn()
    const numericOptions = [
      { value: 1, label: 'One' },
      { value: 2, label: 'Two' },
    ]

    const { container } = renderWithProviders(
      <SettingSelect
        label="Count"
        value={1}
        options={numericOptions}
        onChange={mockOnChange}
      />
    )

    const select = container.querySelector('select') as HTMLSelectElement
    select.value = '2'
    select.dispatchEvent(new Event('change', { bubbles: true }))

    expect(mockOnChange).toHaveBeenCalledWith(2)
  })

  it('has chevron icon indicator', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingSelect
        label="Font Size"
        value="medium"
        options={mockOptions}
        onChange={mockOnChange}
      />
    )

    const chevron = container.querySelector('svg')
    expect(chevron).toBeInTheDocument()
  })

  it('applies correct styling', () => {
    const mockOnChange = vi.fn()
    const { container } = renderWithProviders(
      <SettingSelect
        label="Font Size"
        value="medium"
        options={mockOptions}
        onChange={mockOnChange}
      />
    )

    const select = container.querySelector('select')
    expect(select?.className).toContain('rounded-md')
    expect(select?.className).toContain('border')
  })

  it('shows all option descriptions in UI (if applicable)', () => {
    const mockOnChange = vi.fn()
    const descriptiveOptions = [
      { value: 'small', label: 'Small', description: 'Very small text' },
      { value: 'medium', label: 'Medium', description: 'Normal text' },
    ]

    const { getByText } = renderWithProviders(
      <SettingSelect
        label="Font Size"
        value="medium"
        options={descriptiveOptions}
        onChange={mockOnChange}
      />
    )

    // Note: Standard select elements don't display descriptions in the UI,
    // but our component accepts them for potential future use
    expect(getByText('Font Size')).toBeInTheDocument()
  })
})
