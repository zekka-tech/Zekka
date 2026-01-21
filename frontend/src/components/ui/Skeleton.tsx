import { type HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'rect' | 'circle' | 'text'
  width?: string | number
  height?: string | number
  count?: number
}

/**
 * Base Skeleton component for loading states
 * Creates animated placeholder while content loads
 *
 * @example
 * // Basic skeleton
 * <Skeleton className="w-full h-12" />
 *
 * // Circle skeleton (avatar)
 * <Skeleton variant="circle" className="w-10 h-10" />
 *
 * // Multiple text lines
 * <Skeleton variant="text" count={3} />
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = 'rect', className, count = 1, width, height, ...props }, ref) => {
    const skeletons = Array.from({ length: count }, (_, i) => i)

    const baseClasses = cn(
      'animate-pulse',
      'dark:bg-slate-700 bg-slate-200',
      'rounded-md',
      variant === 'circle' && 'rounded-full',
      variant === 'text' && 'h-4',
      className
    )

    const widthClass = width ? (typeof width === 'number' ? `w-[${width}px]` : width) : undefined
    const heightClass = height ? (typeof height === 'number' ? `h-[${height}px]` : height) : undefined

    const skeletonClass = cn(baseClasses, widthClass, heightClass)

    if (count > 1) {
      return (
        <div className="space-y-2">
          {skeletons.map((i) => (
            <div key={i} className={skeletonClass} {...props} />
          ))}
        </div>
      )
    }

    return <div ref={ref} className={skeletonClass} {...props} />
  }
)

Skeleton.displayName = 'Skeleton'

/**
 * SkeletonText component
 * Creates multiple lines of text skeleton
 *
 * @example
 * <SkeletonText lines={3} />
 */
export interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  lines?: number
}

export const SkeletonText = forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ lines = 1, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            variant="text"
            className={i === lines - 1 ? 'w-2/3' : 'w-full'}
          />
        ))}
      </div>
    )
  }
)

SkeletonText.displayName = 'SkeletonText'

/**
 * SkeletonCard component
 * Creates card-like skeleton layout
 *
 * @example
 * <SkeletonCard />
 */
export interface SkeletonCardProps extends HTMLAttributes<HTMLDivElement> {
  hasAvatar?: boolean
  lines?: number
}

export const SkeletonCard = forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ hasAvatar = false, lines = 2, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-slate-200 dark:border-slate-700 p-4',
          'space-y-4',
          className
        )}
        {...props}
      >
        {hasAvatar && (
          <div className="flex items-center space-x-4">
            <Skeleton variant="circle" className="w-10 h-10" />
            <Skeleton variant="text" className="flex-1 h-4" />
          </div>
        )}
        <SkeletonText lines={lines} />
      </div>
    )
  }
)

SkeletonCard.displayName = 'SkeletonCard'

/**
 * SkeletonChart component
 * Creates chart placeholder
 *
 * @example
 * <SkeletonChart />
 */
export interface SkeletonChartProps extends HTMLAttributes<HTMLDivElement> {
  height?: number
}

export const SkeletonChart = forwardRef<HTMLDivElement, SkeletonChartProps>(
  ({ height = 300, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-slate-200 dark:border-slate-700 p-4',
          'flex flex-col space-y-4',
          className
        )}
        {...props}
      >
        {/* Chart header */}
        <div className="flex justify-between items-center">
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-20 h-4" />
        </div>

        {/* Chart bars */}
        <div className={`w-full flex items-end gap-2 justify-around`} style={{ height }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <Skeleton
                className="w-full"
                height={Math.random() * (height * 0.8) + height * 0.2}
              />
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-4 pt-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-3 h-3 rounded-full" />
            <Skeleton className="w-16 h-3" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-3 h-3 rounded-full" />
            <Skeleton className="w-16 h-3" />
          </div>
        </div>
      </div>
    )
  }
)

SkeletonChart.displayName = 'SkeletonChart'

/**
 * SkeletonList component
 * Creates list item skeleton
 *
 * @example
 * <SkeletonList count={5} />
 */
export interface SkeletonListProps extends HTMLAttributes<HTMLDivElement> {
  count?: number
  hasAvatar?: boolean
}

export const SkeletonList = forwardRef<HTMLDivElement, SkeletonListProps>(
  ({ count = 3, hasAvatar = true, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-3', className)} {...props}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            {hasAvatar && <Skeleton variant="circle" className="w-8 h-8 flex-shrink-0" />}
            <div className="flex-1 space-y-2">
              <Skeleton className="w-3/4 h-3" />
              <Skeleton className="w-1/2 h-3" />
            </div>
          </div>
        ))}
      </div>
    )
  }
)

SkeletonList.displayName = 'SkeletonList'

/**
 * SkeletonGrid component
 * Creates grid of skeleton cards
 *
 * @example
 * <SkeletonGrid cols={3} count={6} />
 */
export interface SkeletonGridProps extends HTMLAttributes<HTMLDivElement> {
  cols?: number
  count?: number
}

export const SkeletonGrid = forwardRef<HTMLDivElement, SkeletonGridProps>(
  ({ cols = 3, count = 6, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(`grid grid-cols-${cols} gap-4`, className)}
        {...props}
      >
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} hasAvatar={true} lines={2} />
        ))}
      </div>
    )
  }
)

SkeletonGrid.displayName = 'SkeletonGrid'
