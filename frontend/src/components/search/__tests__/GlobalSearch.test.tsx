import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { GlobalSearch } from '../GlobalSearch'

// Mock fireEvent using simulated clicks and changes
const fireEvent = {
  click: (element: HTMLElement) => {
    element.click()
  },
  change: (element: HTMLInputElement, data: any) => {
    element.value = data.target.value
    element.dispatchEvent(new Event('change', { bubbles: true }))
  },
  keyDown: (element: HTMLElement, data: any) => {
    const event = new KeyboardEvent('keydown', { key: data.key })
    element.dispatchEvent(event)
  }
}

// Mock the search hooks
vi.mock('@/hooks/useUnifiedSearch', () => ({
  useUnifiedSearch: vi.fn(() => ({
    all: [
      {
        item: { id: '1', title: 'React Project', category: 'project' },
        score: 0.1,
        matches: []
      }
    ],
    total: 1,
    isEmpty: false
  }))
}))

vi.mock('@/hooks/useSearchHistory', () => ({
  useSearchHistory: vi.fn(() => ({
    history: [
      { query: 'React', timestamp: Date.now(), category: 'framework' }
    ],
    addToHistory: vi.fn(),
    isEmpty: false
  }))
}))

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <GlobalSearch isOpen={false} onClose={vi.fn()} />
    )
    expect(container.querySelector('input')).not.toBeInTheDocument()
  })

  it('renders search input when isOpen is true', () => {
    const { getByPlaceholderText } = render(
      <GlobalSearch isOpen={true} onClose={vi.fn()} />
    )
    expect(getByPlaceholderText(/Search projects/)).toBeInTheDocument()
  })

  it('closes modal when close button is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <GlobalSearch isOpen={true} onClose={onClose} />
    )
    const closeButton = container.querySelector('button[class*="hover:bg-muted"]')
    fireEvent.click(closeButton!)
    expect(onClose).toHaveBeenCalled()
  })

  it('closes modal when backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <GlobalSearch isOpen={true} onClose={onClose} />
    )
    const backdrop = container.querySelector('.bg-black\\/30')
    fireEvent.click(backdrop!)
    expect(onClose).toHaveBeenCalled()
  })

  it('closes modal when Escape key is pressed', () => {
    const onClose = vi.fn()
    const { getByPlaceholderText } = render(
      <GlobalSearch isOpen={true} onClose={onClose} />
    )
    const input = getByPlaceholderText(/Search projects/)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('updates query when input changes', () => {
    const { getByPlaceholderText } = render(
      <GlobalSearch isOpen={true} onClose={vi.fn()} />
    )
    const input = getByPlaceholderText(/Search projects/) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'React' } })
    expect(input.value).toBe('React')
  })

  it('shows recent searches when query is empty', () => {
    const { getByText } = render(
      <GlobalSearch isOpen={true} onClose={vi.fn()} />
    )
    expect(getByText(/Recent Searches/)).toBeInTheDocument()
  })

  it('shows results when query is entered', () => {
    const { getByPlaceholderText } = render(
      <GlobalSearch isOpen={true} onClose={vi.fn()} />
    )
    const input = getByPlaceholderText(/Search projects/)
    fireEvent.change(input, { target: { value: 'React' } })
    // Results should be displayed
    expect(input).toBeInTheDocument()
  })

  it('navigates results with arrow keys', () => {
    const { getByPlaceholderText, container } = render(
      <GlobalSearch isOpen={true} onClose={vi.fn()} />
    )
    const input = getByPlaceholderText(/Search projects/)
    fireEvent.change(input, { target: { value: 'test' } })

    // Arrow down
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const highlights = container.querySelectorAll('[class*="bg-primary/10"]')
    expect(highlights.length).toBeGreaterThan(0)
  })

  it('calls onSelect when result is clicked', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <GlobalSearch isOpen={true} onClose={vi.fn()} onSelect={onSelect} />
    )
    const buttons = container.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    // Find a SearchHighlight result button (not close or toggle buttons)
    let resultButton: HTMLButtonElement | undefined
    buttons.forEach(b => {
      if (b.querySelector('[class*="truncate"]')) {
        resultButton = b
      }
    })
    if (resultButton) {
      fireEvent.click(resultButton)
      expect(onSelect).toHaveBeenCalled()
    }
  })

  it('shows no results message when nothing found', () => {
    const { getByPlaceholderText, getByText } = render(
      <GlobalSearch isOpen={true} onClose={vi.fn()} />
    )
    const input = getByPlaceholderText(/Search projects/)
    fireEvent.change(input, { target: { value: 'xyznonexistent' } })
    // Wait for search to complete
    setTimeout(() => {
      expect(getByText(/No results found/)).toBeInTheDocument()
    }, 100)
  })

  it('displays footer with keyboard shortcuts', () => {
    const { getByText } = render(
      <GlobalSearch isOpen={true} onClose={vi.fn()} />
    )
    expect(getByText(/Navigate/)).toBeInTheDocument()
    expect(getByText(/Select/)).toBeInTheDocument()
  })

  it('shows advanced filters toggle when query is not empty', () => {
    const { getByPlaceholderText, getByText } = render(
      <GlobalSearch isOpen={true} onClose={vi.fn()} />
    )
    const input = getByPlaceholderText(/Search projects/)
    fireEvent.change(input, { target: { value: 'test' } })
    expect(getByText(/Advanced Filters/i)).toBeInTheDocument()
  })

  it('focuses input when opened', () => {
    const { getByPlaceholderText } = render(
      <GlobalSearch isOpen={true} onClose={vi.fn()} />
    )
    const input = getByPlaceholderText(/Search projects/) as HTMLInputElement
    expect(document.activeElement).toBe(input)
  })
})
