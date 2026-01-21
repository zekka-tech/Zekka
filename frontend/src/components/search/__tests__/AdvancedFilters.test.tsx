import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { AdvancedFilters } from '../AdvancedFilters'

// Mock fireEvent using simulated clicks
const fireEvent = {
  click: (element: HTMLElement) => {
    element.click()
  },
  change: (element: HTMLInputElement, data: any) => {
    element.value = data.target.value
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

describe('AdvancedFilters', () => {
  it('renders filter button', () => {
    const { getByText } = render(<AdvancedFilters />)
    expect(getByText('Filters')).toBeInTheDocument()
  })

  it('toggles expanded state when clicked', () => {
    const { getByText, queryByText } = render(<AdvancedFilters />)
    const button = getByText('Filters').closest('button')

    // Initially collapsed
    expect(queryByText('Sort By')).not.toBeInTheDocument()

    // Click to expand
    fireEvent.click(button!)
    expect(getByText('Sort By')).toBeInTheDocument()

    // Click to collapse
    fireEvent.click(button!)
    expect(queryByText('Sort By')).not.toBeInTheDocument()
  })

  it('displays sort options', () => {
    const { getByText } = render(<AdvancedFilters />)
    const button = getByText('Filters').closest('button')
    fireEvent.click(button!)

    expect(getByText('Relevance')).toBeInTheDocument()
    expect(getByText('Date')).toBeInTheDocument()
    expect(getByText('Name')).toBeInTheDocument()
  })

  it('calls onSortChange when sort option is selected', () => {
    const onSortChange = vi.fn()
    const { getByText } = render(<AdvancedFilters onSortChange={onSortChange} />)
    const button = getByText('Filters').closest('button')
    fireEvent.click(button!)

    const dateButton = getByText('Date')
    fireEvent.click(dateButton)

    expect(onSortChange).toHaveBeenCalledWith('date')
  })

  it('displays categories when provided', () => {
    const categories = ['Projects', 'Conversations', 'Agents']
    const { getByText } = render(
      <AdvancedFilters categories={categories} showCategories={true} />
    )
    const button = getByText('Filters').closest('button')
    fireEvent.click(button!)

    categories.forEach(cat => {
      expect(getByText(cat)).toBeInTheDocument()
    })
  })

  it('calls onFilterChange when category is selected', () => {
    const onFilterChange = vi.fn()
    const categories = ['Projects']
    const { getByText } = render(
      <AdvancedFilters
        categories={categories}
        onFilterChange={onFilterChange}
        showCategories={true}
      />
    )
    const button = getByText('Filters').closest('button')
    fireEvent.click(button!)

    const categoryButton = getByText('Projects')
    fireEvent.click(categoryButton)

    expect(onFilterChange).toHaveBeenCalledWith({ category: 'Projects' })
  })

  it('displays statuses when provided', () => {
    const statuses = ['Active', 'Inactive']
    const { getByText } = render(
      <AdvancedFilters statuses={statuses} showStatus={true} />
    )
    const button = getByText('Filters').closest('button')
    fireEvent.click(button!)

    statuses.forEach(status => {
      expect(getByText(status)).toBeInTheDocument()
    })
  })

  it('shows active filter count', () => {
    const { getByText, container } = render(
      <AdvancedFilters categories={['Projects']} showCategories={true} />
    )
    const button = getByText('Filters').closest('button')
    fireEvent.click(button!)

    const projectButton = getByText('Projects')
    fireEvent.click(projectButton)

    // After selecting a filter, count should show
    const count = container.querySelector('.bg-primary.text-primary-foreground')
    expect(count?.textContent).toBe('1')
  })

  it('clears all filters when Clear All Filters is clicked', () => {
    const onFilterChange = vi.fn()
    const categories = ['Projects']
    const { getByText } = render(
      <AdvancedFilters
        categories={categories}
        onFilterChange={onFilterChange}
        showCategories={true}
      />
    )
    const button = getByText('Filters').closest('button')
    fireEvent.click(button!)

    // Select a filter
    const categoryButton = getByText('Projects')
    fireEvent.click(categoryButton)

    // Clear filters
    const clearButton = getByText('Clear All Filters')
    fireEvent.click(clearButton)

    expect(onFilterChange).toHaveBeenLastCalledWith({})
  })

  it('hides categories when showCategories is false', () => {
    const categories = ['Projects']
    const { getByText, queryByText } = render(
      <AdvancedFilters
        categories={categories}
        showCategories={false}
      />
    )
    const button = getByText('Filters').closest('button')
    fireEvent.click(button!)

    expect(queryByText('Category')).not.toBeInTheDocument()
    expect(queryByText('Projects')).not.toBeInTheDocument()
  })

  it('hides status when showStatus is false', () => {
    const statuses = ['Active']
    const { getByText, queryByText } = render(
      <AdvancedFilters
        statuses={statuses}
        showStatus={false}
      />
    )
    const button = getByText('Filters').closest('button')
    fireEvent.click(button!)

    expect(queryByText('Status')).not.toBeInTheDocument()
  })

  it('toggles category selection', () => {
    const onFilterChange = vi.fn()
    const categories = ['Projects']
    const { getByText } = render(
      <AdvancedFilters
        categories={categories}
        onFilterChange={onFilterChange}
        showCategories={true}
      />
    )
    const button = getByText('Filters').closest('button')
    fireEvent.click(button!)

    const categoryButton = getByText('Projects')

    // Select
    fireEvent.click(categoryButton)
    expect(onFilterChange).toHaveBeenLastCalledWith({ category: 'Projects' })

    // Deselect
    fireEvent.click(categoryButton)
    expect(onFilterChange).toHaveBeenLastCalledWith({})
  })
})
