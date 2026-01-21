import { useState } from 'react'
import { cn } from '@/lib/cn'
import { ChevronDown, X } from 'lucide-react'

export type SortOption = 'relevance' | 'date' | 'name'
export type FilterType = 'status' | 'category' | 'date'

export interface AdvancedFiltersProps {
  onFilterChange?: (filters: FilterState) => void
  onSortChange?: (sort: SortOption) => void
  showCategories?: boolean
  showStatus?: boolean
  categories?: string[]
  statuses?: string[]
}

export interface FilterState {
  category?: string
  status?: string
  dateFrom?: Date
  dateTo?: Date
  search?: string
}

export const AdvancedFilters = ({
  onFilterChange,
  onSortChange,
  showCategories = true,
  showStatus = true,
  categories = [],
  statuses = []
}: AdvancedFiltersProps) => {
  const [filters, setFilters] = useState<FilterState>({})
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const [isExpanded, setIsExpanded] = useState(false)

  const handleCategoryChange = (category: string) => {
    const newFilters = {
      ...filters,
      category: filters.category === category ? undefined : category
    }
    setFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  const handleStatusChange = (status: string) => {
    const newFilters = {
      ...filters,
      status: filters.status === status ? undefined : status
    }
    setFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort)
    onSortChange?.(sort)
  }

  const handleClearFilters = () => {
    setFilters({})
    onFilterChange?.({})
  }

  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined).length

  return (
    <div className={cn(
      'w-full bg-card border border-border rounded-lg',
      'transition-all duration-200'
    )}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full px-4 py-3',
          'flex items-center justify-between',
          'hover:bg-muted/30 transition-colors',
          'border-b border-border'
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Filters</span>
          {activeFiltersCount > 0 && (
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              'bg-primary text-primary-foreground'
            )}>
              {activeFiltersCount}
            </span>
          )}
        </div>
        <ChevronDown className={cn(
          'w-5 h-5 text-muted-foreground transition-transform',
          isExpanded && 'rotate-180'
        )} />
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-4 space-y-4">
          {/* Sort Options */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">
              Sort By
            </label>
            <div className="flex gap-2 flex-wrap">
              {(['relevance', 'date', 'name'] as const).map(option => (
                <button
                  key={option}
                  onClick={() => handleSortChange(option)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium',
                    'transition-colors',
                    sortBy === option
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          {showCategories && categories.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                Category
              </label>
              <div className="flex gap-2 flex-wrap">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm',
                      'transition-colors',
                      filters.category === category
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status Filter */}
          {showStatus && statuses.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                Status
              </label>
              <div className="flex gap-2 flex-wrap">
                {statuses.map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm',
                      'transition-colors',
                      filters.status === status
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <button
              onClick={handleClearFilters}
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm',
                'flex items-center justify-center gap-2',
                'bg-muted/30 text-muted-foreground',
                'hover:bg-muted/50 transition-colors'
              )}
            >
              <X className="w-4 h-4" />
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
