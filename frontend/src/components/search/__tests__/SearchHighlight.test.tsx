import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { SearchHighlight } from '../SearchHighlight'

describe('SearchHighlight', () => {
  it('renders title', () => {
    const { getByText } = render(
      <SearchHighlight title="Test Project" />
    )
    expect(getByText('Test Project')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    const { getByText } = render(
      <SearchHighlight
        title="Test"
        description="Test description"
      />
    )
    expect(getByText('Test description')).toBeInTheDocument()
  })

  it('renders category badge when provided', () => {
    const { getByText } = render(
      <SearchHighlight
        title="Test"
        category="project"
      />
    )
    expect(getByText('project')).toBeInTheDocument()
  })

  it('renders relevance score as percentage', () => {
    const { getByText } = render(
      <SearchHighlight
        title="Test"
        score={0.3}
      />
    )
    expect(getByText('70%')).toBeInTheDocument()
  })

  it('calls onClick handler when clicked', () => {
    const onClick = vi.fn()
    const { container } = render(
      <SearchHighlight
        title="Test"
        onClick={onClick}
      />
    )
    const button = container.querySelector('button')
    button?.click()
    expect(onClick).toHaveBeenCalled()
  })

  it('applies selected styling when isSelected is true', () => {
    const { container } = render(
      <SearchHighlight
        title="Test"
        isSelected={true}
      />
    )
    const button = container.querySelector('button')
    expect(button).toHaveClass('bg-primary/10')
  })

  it('displays category icon based on category type', () => {
    const { container: projectContainer } = render(
      <SearchHighlight
        title="Test"
        category="project"
      />
    )
    expect(projectContainer.innerHTML).toContain('📁')

    const { container: conversationContainer } = render(
      <SearchHighlight
        title="Test"
        category="conversation"
      />
    )
    expect(conversationContainer.innerHTML).toContain('💬')

    const { container: agentContainer } = render(
      <SearchHighlight
        title="Test"
        category="agent"
      />
    )
    expect(agentContainer.innerHTML).toContain('🤖')
  })

  it('handles long titles with truncation', () => {
    const longTitle = 'This is a very long title that should be truncated to avoid layout issues'
    const { getByText } = render(
      <SearchHighlight title={longTitle} />
    )
    const titleElement = getByText(longTitle)
    expect(titleElement).toHaveClass('truncate')
  })

  it('shows relevance color based on score', () => {
    // Good match (0.2)
    const { container: goodContainer } = render(
      <SearchHighlight title="Test" score={0.2} />
    )
    const goodScore = goodContainer.querySelector('.text-green-600')
    expect(goodScore).toBeInTheDocument()

    // Medium match (0.5)
    const { container: mediumContainer } = render(
      <SearchHighlight title="Test" score={0.5} />
    )
    const mediumScore = mediumContainer.querySelector('.text-yellow-600')
    expect(mediumScore).toBeInTheDocument()

    // Poor match (0.8)
    const { container: poorContainer } = render(
      <SearchHighlight title="Test" score={0.8} />
    )
    const poorScore = poorContainer.querySelector('.text-orange-600')
    expect(poorScore).toBeInTheDocument()
  })
})
