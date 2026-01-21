import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import { SettingsSection } from '../SettingsSection'

describe('SettingsSection', () => {
  it('renders title', () => {
    const { getByText } = renderWithProviders(
      <SettingsSection title="Test Section">
        <div>Content</div>
      </SettingsSection>
    )

    expect(getByText('Test Section')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    const { getByText } = renderWithProviders(
      <SettingsSection
        title="Test Section"
        description="Test description"
      >
        <div>Content</div>
      </SettingsSection>
    )

    expect(getByText('Test description')).toBeInTheDocument()
  })

  it('renders children content', () => {
    const { getByText } = renderWithProviders(
      <SettingsSection title="Test Section">
        <div>Child content goes here</div>
      </SettingsSection>
    )

    expect(getByText('Child content goes here')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    const { queryByText, getByText } = renderWithProviders(
      <SettingsSection title="Test Section">
        <div>Content</div>
      </SettingsSection>
    )

    expect(getByText('Test Section')).toBeInTheDocument()
    expect(queryByText('Test description')).not.toBeInTheDocument()
  })

  it('applies correct styling to title', () => {
    const { getByText } = renderWithProviders(
      <SettingsSection title="Test Section">
        <div>Content</div>
      </SettingsSection>
    )

    const title = getByText('Test Section')
    expect(title.tagName).toBe('H3')
    expect(title.className).toContain('font-semibold')
  })

  it('applies correct styling to description', () => {
    const { getByText } = renderWithProviders(
      <SettingsSection
        title="Test Section"
        description="Test description"
      >
        <div>Content</div>
      </SettingsSection>
    )

    const description = getByText('Test description')
    expect(description.tagName).toBe('P')
    expect(description.className).toContain('text-xs')
    expect(description.className).toContain('text-muted-foreground')
  })

  it('renders border styling', () => {
    const { container } = renderWithProviders(
      <SettingsSection title="Test Section">
        <div>Content</div>
      </SettingsSection>
    )

    const section = container.querySelector('div')
    expect(section?.className).toContain('border-b')
  })

  it('renders multiple children', () => {
    const { getByText } = renderWithProviders(
      <SettingsSection title="Test Section">
        <div>First child</div>
        <div>Second child</div>
        <div>Third child</div>
      </SettingsSection>
    )

    expect(getByText('First child')).toBeInTheDocument()
    expect(getByText('Second child')).toBeInTheDocument()
    expect(getByText('Third child')).toBeInTheDocument()
  })

  it('renders with proper spacing', () => {
    const { container } = renderWithProviders(
      <SettingsSection
        title="Test Section"
        description="Test description"
      >
        <div>Content</div>
      </SettingsSection>
    )

    const section = container.querySelector('div')
    expect(section?.className).toContain('py-6')
    expect(section?.className).toContain('px-6')
  })

  it('applies last:border-b-0 styling', () => {
    const { container } = renderWithProviders(
      <SettingsSection title="Test Section">
        <div>Content</div>
      </SettingsSection>
    )

    const section = container.querySelector('div')
    expect(section?.className).toContain('last:border-b-0')
  })
})
