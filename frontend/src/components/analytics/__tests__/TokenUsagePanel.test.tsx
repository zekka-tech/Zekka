import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import { TokenUsagePanel } from '../TokenUsagePanel'

describe('TokenUsagePanel', () => {
  it('renders the component', () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />)
    expect(getByText('Token Usage & Costs')).toBeInTheDocument()
  })

  it('displays header with title and description', () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />)

    expect(getByText('Token Usage & Costs')).toBeInTheDocument()
    expect(getByText("Today's analytics and monthly breakdown")).toBeInTheDocument()
  })

  it("displays today's token metrics", () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />)

    expect(getByText(/Today's Tokens/)).toBeInTheDocument()
    expect(getByText(/45\.2K/)).toBeInTheDocument()
  })

  it('displays this month metrics', () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />)

    expect(getByText(/This Month/)).toBeInTheDocument()
    expect(getByText(/1\.25M/)).toBeInTheDocument()
  })

  it('displays model usage breakdown section', () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />)

    expect(getByText(/Model Usage Breakdown/)).toBeInTheDocument()
  })

  it('displays all model names', () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />)

    expect(getByText('Claude 3.5 Sonnet')).toBeInTheDocument()
    expect(getByText('GPT-4')).toBeInTheDocument()
    expect(getByText('Gemini Pro')).toBeInTheDocument()
  })

  it('displays model costs', () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />)

    expect(getByText('$1.71')).toBeInTheDocument()
    expect(getByText('$0.84')).toBeInTheDocument()
    expect(getByText('$0.29')).toBeInTheDocument()
  })

  it('displays cost per token metric', () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />)

    expect(getByText(/Cost per Token/)).toBeInTheDocument()
    expect(getByText(/\/M/)).toBeInTheDocument()
  })

  it('displays weekly trend section', () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />)

    expect(getByText(/Weekly Trend/)).toBeInTheDocument()
  })

  it('displays all weekday data', () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />)

    expect(getByText('Mon')).toBeInTheDocument()
    expect(getByText('Tue')).toBeInTheDocument()
    expect(getByText('Wed')).toBeInTheDocument()
    expect(getByText('Thu')).toBeInTheDocument()
    expect(getByText('Fri')).toBeInTheDocument()
  })

  it('displays usage stats footer', () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />)

    expect(getByText(/Average daily cost/)).toBeInTheDocument()
    expect(getByText(/At current usage rate/)).toBeInTheDocument()
  })

  it('displays token counts with proper formatting', () => {
    const { container } = renderWithProviders(<TokenUsagePanel />)

    const tokenTexts = container.innerHTML
    expect(tokenTexts).toContain('K tokens')
    expect(tokenTexts).toContain('M')
  })

  it('displays cost values formatted correctly', () => {
    const { container } = renderWithProviders(<TokenUsagePanel />)

    const costTexts = container.innerHTML
    expect(costTexts).toContain('USD')
    expect(costTexts).toMatch(/\$\d+\.\d{2}/)
  })

  it('renders gradient styled cards', () => {
    const { container } = renderWithProviders(<TokenUsagePanel />)

    const gradientElements = container.querySelectorAll('[class*="gradient"]')
    expect(gradientElements.length).toBeGreaterThan(0)
  })

  it('displays icon indicators', () => {
    const { container } = renderWithProviders(<TokenUsagePanel />)

    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('renders progress bars for model breakdown', () => {
    const { container } = renderWithProviders(<TokenUsagePanel />)

    // Look for divs with style that represents progress bar widths
    const progressBars = Array.from(container.querySelectorAll('div') as NodeListOf<HTMLDivElement>).filter(
      el => el.style.width && el.style.width.includes('%')
    )
    expect(progressBars.length).toBeGreaterThan(0)
  })

  it('displays percentage values for models', () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />)

    expect(getByText('63%')).toBeInTheDocument()
    expect(getByText('26%')).toBeInTheDocument()
    expect(getByText('11%')).toBeInTheDocument()
  })

  it('displays token counts for models', () => {
    const { getByText } = renderWithProviders(<TokenUsagePanel />)

    expect(getByText('28,500 tokens')).toBeInTheDocument()
    expect(getByText('12,000 tokens')).toBeInTheDocument()
    expect(getByText('4,730 tokens')).toBeInTheDocument()
  })

  it('renders without errors', () => {
    const { container } = renderWithProviders(<TokenUsagePanel />)
    expect(container).toBeTruthy()
  })

  it('has proper layout structure', () => {
    const { container } = renderWithProviders(<TokenUsagePanel />)

    // Check for main container
    const mainContainer = container.querySelector('[class*="space-y-4"]')
    expect(mainContainer).toBeTruthy()

    // Check for grid layout
    const gridLayout = container.querySelector('[class*="grid"]')
    expect(gridLayout).toBeTruthy()
  })

  it('displays responsive grid for metrics', () => {
    const { container } = renderWithProviders(<TokenUsagePanel />)

    const gridElement = container.querySelector('[class*="grid-cols"]')
    expect(gridElement?.className).toContain('grid-cols-2')
  })

  it('uses appropriate color schemes', () => {
    const { container } = renderWithProviders(<TokenUsagePanel />)

    const blueElements = Array.from(container.querySelectorAll('[class*="blue"]'))
    const purpleElements = Array.from(container.querySelectorAll('[class*="purple"]'))
    const greenElements = Array.from(container.querySelectorAll('[class*="green"]'))

    expect(blueElements.length + purpleElements.length + greenElements.length).toBeGreaterThan(0)
  })

  it('renders border styling for cards', () => {
    const { container } = renderWithProviders(<TokenUsagePanel />)

    const borderedElements = container.querySelectorAll('[class*="border"]')
    expect(borderedElements.length).toBeGreaterThan(0)
  })

  it('displays rounded corners on components', () => {
    const { container } = renderWithProviders(<TokenUsagePanel />)

    const roundedElements = container.querySelectorAll('[class*="rounded"]')
    expect(roundedElements.length).toBeGreaterThan(0)
  })
})
