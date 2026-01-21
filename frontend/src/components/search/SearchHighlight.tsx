import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import { ChevronRight } from 'lucide-react'

export interface SearchHighlightProps {
  title: string
  description?: string
  category?: string
  score?: number
  onClick?: () => void
  isSelected?: boolean
}

export const SearchHighlight = ({
  title,
  description,
  category,
  score,
  onClick,
  isSelected = false
}: SearchHighlightProps) => {
  const getIcon = useMemo(() => {
    switch (category) {
      case 'project':
        return '📁'
      case 'conversation':
        return '💬'
      case 'agent':
        return '🤖'
      default:
        return '📄'
    }
  }, [category])

  const getRelevanceColor = useMemo(() => {
    if (!score) return 'text-muted-foreground'
    if (score < 0.3) return 'text-green-600 dark:text-green-400' // Best match
    if (score < 0.6) return 'text-yellow-600 dark:text-yellow-400' // Good match
    return 'text-orange-600 dark:text-orange-400' // Partial match
  }, [score])

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2 rounded-lg',
        'border border-transparent',
        'transition-colors',
        'hover:bg-muted/50',
        isSelected && 'bg-primary/10 border-primary text-primary'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{getIcon}</span>
            <p className={cn(
              'text-sm font-medium truncate',
              'text-foreground'
            )}>
              {title}
            </p>
            {category && (
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded',
                'bg-muted text-muted-foreground',
                'whitespace-nowrap'
              )}>
                {category}
              </span>
            )}
          </div>

          {description && (
            <p className={cn(
              'text-xs truncate',
              'text-muted-foreground'
            )}>
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {score !== undefined && (
            <span className={cn(
              'text-xs font-medium',
              getRelevanceColor
            )}>
              {Math.round((1 - score) * 100)}%
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </button>
  )
}
