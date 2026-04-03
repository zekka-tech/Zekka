import { describe, it, expect, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders, screen } from '@/test/test-utils'
import { AdvancedFilters } from '../AdvancedFilters'

const expandFilters = () => {
  fireEvent.click(screen.getByRole('button', { name: /filters/i }))
}

describe('AdvancedFilters', () => {
  it('renders collapsed by default and toggles expansion', () => {
    renderWithProviders(<AdvancedFilters />)
    expect(screen.queryByText('Sort By')).not.toBeInTheDocument()

    expandFilters()
    expect(screen.getByText('Sort By')).toBeInTheDocument()

    expandFilters()
    expect(screen.queryByText('Sort By')).not.toBeInTheDocument()
  })

  it('emits sort changes', () => {
    const onSortChange = vi.fn()
    renderWithProviders(<AdvancedFilters onSortChange={onSortChange} />)

    expandFilters()
    fireEvent.click(screen.getByRole('button', { name: 'Date' }))
    expect(onSortChange).toHaveBeenCalledWith('date')
  })

  it('shows and applies category filters', () => {
    const onFilterChange = vi.fn()
    renderWithProviders(
      <AdvancedFilters
        categories={['Projects', 'Agents']}
        onFilterChange={onFilterChange}
      />
    )

    expandFilters()
    const projects = screen.getByRole('button', { name: 'Projects' })
    fireEvent.click(projects)
    expect(onFilterChange).toHaveBeenLastCalledWith({ category: 'Projects' })

    fireEvent.click(projects)
    expect(onFilterChange).toHaveBeenLastCalledWith({ category: undefined })
  })

  it('shows and applies status filters', () => {
    const onFilterChange = vi.fn()
    renderWithProviders(
      <AdvancedFilters
        statuses={['active', 'inactive']}
        onFilterChange={onFilterChange}
      />
    )

    expandFilters()
    fireEvent.click(screen.getByRole('button', { name: 'active' }))
    expect(onFilterChange).toHaveBeenLastCalledWith({ status: 'active' })
  })

  it('shows active filter count and clear action', () => {
    const onFilterChange = vi.fn()
    renderWithProviders(
      <AdvancedFilters
        categories={['Projects']}
        onFilterChange={onFilterChange}
      />
    )

    expandFilters()
    fireEvent.click(screen.getByRole('button', { name: 'Projects' }))

    expect(screen.getByText('1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /clear all filters/i }))
    expect(onFilterChange).toHaveBeenLastCalledWith({})
  })
})
