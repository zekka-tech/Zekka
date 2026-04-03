import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders, screen } from '@/test/test-utils'
import { GlobalSearch } from '../GlobalSearch'

const addToHistory = vi.fn()
const useUnifiedSearchMock = vi.fn()

vi.mock('@/hooks/useUnifiedSearch', () => ({
  useUnifiedSearch: (...args: unknown[]) => useUnifiedSearchMock(...args)
}))

vi.mock('@/hooks/useSearchHistory', () => ({
  useSearchHistory: () => ({
    history: [{ query: 'React', timestamp: Date.now(), category: 'framework' }],
    addToHistory,
    isEmpty: false
  })
}))

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUnifiedSearchMock.mockReturnValue({
      all: [
        {
          item: { id: '1', title: 'React Project', category: 'project' },
          score: 0.1
        }
      ],
      total: 1,
      isEmpty: false
    })
  })

  it('does not render when closed', () => {
    renderWithProviders(<GlobalSearch isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByPlaceholderText(/Search projects/i)).not.toBeInTheDocument()
  })

  it('renders and closes from backdrop', () => {
    const onClose = vi.fn()
    const { container } = renderWithProviders(
      <GlobalSearch isOpen={true} onClose={onClose} />
    )

    fireEvent.click(container.querySelector('.bg-black\\/30') as HTMLElement)
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on Escape and supports keyboard selection', () => {
    const onClose = vi.fn()
    const onSelect = vi.fn()
    renderWithProviders(
      <GlobalSearch isOpen={true} onClose={onClose} onSelect={onSelect} />
    )

    const input = screen.getByPlaceholderText(/Search projects/i)
    fireEvent.change(input, { target: { value: 'react' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('shows recent searches when query is empty', () => {
    renderWithProviders(<GlobalSearch isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText(/Recent Searches/i)).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
  })

  it('shows advanced filter toggle when query has text', () => {
    renderWithProviders(<GlobalSearch isOpen={true} onClose={vi.fn()} />)
    const input = screen.getByPlaceholderText(/Search projects/i)
    fireEvent.change(input, { target: { value: 'react' } })
    expect(screen.getByRole('button', { name: /advanced filters/i })).toBeInTheDocument()
  })

  it('shows no-results state', () => {
    useUnifiedSearchMock.mockReturnValue({
      all: [],
      total: 0,
      isEmpty: true
    })

    renderWithProviders(<GlobalSearch isOpen={true} onClose={vi.fn()} />)
    const input = screen.getByPlaceholderText(/Search projects/i)
    fireEvent.change(input, { target: { value: 'xyznonexistent' } })
    expect(screen.getByText(/No results found/i)).toBeInTheDocument()
  })
})
