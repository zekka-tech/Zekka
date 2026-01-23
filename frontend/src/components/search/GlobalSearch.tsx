import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/cn'
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import { SearchHighlight } from './SearchHighlight'
import { AdvancedFilters, type FilterState } from './AdvancedFilters'
import { Search, Clock, X } from 'lucide-react'

export interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
  onSelect?: (id: string, category: string) => void
}

export const GlobalSearch = ({
  isOpen,
  onClose,
  onSelect
}: GlobalSearchProps) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const { history, addToHistory } = useSearchHistory()

  const searchResults = useUnifiedSearch(query, {
    category: filters.category as any,
    limit: 10
  })

  const displayResults = !query.trim() && history.length > 0
    ? history.slice(0, 5).map(item => ({
      item: {
        id: item.query,
        title: item.query,
        category: 'history'
      },
      score: 0,
      highlightedTitle: item.query
    }))
    : searchResults.all

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < displayResults.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0))
        break
      case 'Enter':
        e.preventDefault()
        if (displayResults[selectedIndex]) {
          const result = displayResults[selectedIndex]
          if (query.trim()) {
            addToHistory(query, result.item.category)
          }
          onSelect?.(result.item.id, result.item.category || '')
          setQuery('')
          onClose()
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
      default:
        break
    }
  }, [displayResults, selectedIndex, query, onSelect, onClose, addToHistory])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(
        'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        'w-full max-w-2xl max-h-[80vh]',
        'bg-background border border-border rounded-lg shadow-2xl',
        'z-50 overflow-hidden flex flex-col'
      )}>
        {/* Search Input */}
        <div className={cn(
          'border-b border-border p-4',
          'flex items-center gap-3'
        )}>
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search projects, conversations, agents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              'flex-1 bg-transparent outline-none',
              'text-foreground placeholder-muted-foreground',
              'text-base'
            )}
          />
          <button
            onClick={onClose}
            className={cn(
              'p-1 rounded-lg',
              'hover:bg-muted transition-colors'
            )}
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Filters Toggle */}
        {query.trim() && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'px-4 py-2 text-xs text-muted-foreground',
              'hover:text-foreground transition-colors',
              'border-b border-border'
            )}
          >
            {showFilters ? 'Hide' : 'Show'} Advanced Filters
          </button>
        )}

        {/* Advanced Filters */}
        {showFilters && query.trim() && (
          <div className="border-b border-border p-4">
            <AdvancedFilters
              onFilterChange={setFilters}
              categories={['project', 'conversation', 'agent']}
              statuses={['active', 'inactive']}
            />
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {!query.trim() && history.length > 0 ? (
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2 px-3 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-muted-foreground">
                  Recent Searches
                </h3>
              </div>
              {displayResults.map((result, index) => (
                <SearchHighlight
                  key={result.item.id}
                  title={result.item.title}
                  category={result.item.category}
                  isSelected={index === selectedIndex}
                  onClick={() => {
                    setQuery(result.item.title)
                    addToHistory(result.item.title, result.item.category)
                    onSelect?.(result.item.id, result.item.category || '')
                    setQuery('')
                    onClose()
                  }}
                />
              ))}
            </div>
          ) : displayResults.length > 0 ? (
            <div className="p-4 space-y-2">
              <div className="text-xs text-muted-foreground px-3 mb-3">
                Found {searchResults.total} result{searchResults.total !== 1 ? 's' : ''}
              </div>
              {displayResults.map((result, index) => (
                <SearchHighlight
                  key={result.item.id}
                  title={result.item.title}
                  description={'highlightedDescription' in result ? result.highlightedDescription : undefined}
                  category={result.item.category}
                  score={result.score}
                  isSelected={index === selectedIndex}
                  onClick={() => {
                    if (query.trim()) {
                      addToHistory(query, result.item.category)
                    }
                    onSelect?.(result.item.id, result.item.category || '')
                    setQuery('')
                    onClose()
                  }}
                />
              ))}
            </div>
          ) : query.trim() ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No results found for "{query}"</p>
              <p className="text-xs text-muted-foreground mt-2">
                Try adjusting your search query or filters
              </p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className={cn(
          'border-t border-border p-3',
          'flex items-center justify-between text-xs text-muted-foreground'
        )}>
          <div className="flex gap-3">
            <span><kbd>↑↓</kbd> Navigate</span>
            <span><kbd>Enter</kbd> Select</span>
            <span><kbd>Esc</kbd> Close</span>
          </div>
          {displayResults.length > 0 && (
            <span>{selectedIndex + 1} of {displayResults.length}</span>
          )}
        </div>
      </div>
    </>
  )
}
