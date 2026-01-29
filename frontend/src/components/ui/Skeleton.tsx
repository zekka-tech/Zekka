import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export const Skeleton = ({
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
  className,
  style,
  ...props
}: SkeletonProps) => {
  const baseStyles = 'bg-muted'
  
  const variantStyles = {
    text: 'rounded-sm h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-md',
  }

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-wave',
    none: '',
  }

  const dimensionStyles = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  }

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={{ ...dimensionStyles, ...style }}
      aria-busy="true"
      aria-live="polite"
      {...props}
    />
  )
}

// Preset skeleton components for common patterns
export const SkeletonText = ({ lines = 3, className }: { lines?: number; className?: string }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} variant="text" className={i === lines - 1 ? 'w-4/5' : 'w-full'} />
    ))}
  </div>
)

export const SkeletonAvatar = ({ size = 40, className }: { size?: number; className?: string }) => (
  <Skeleton variant="circular" width={size} height={size} className={className} />
)

export const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn('p-4 border border-border rounded-lg space-y-3', className)}>
    <div className="flex items-center space-x-3">
      <SkeletonAvatar size={48} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
)

export const SkeletonTable = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={`header-${i}`} variant="text" height={20} />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={`cell-${rowIndex}-${colIndex}`} variant="text" height={16} />
        ))}
      </div>
    ))}
  </div>
)

export const SkeletonList = ({ items = 5, className }: { items?: number; className?: string }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3 p-3 border border-border rounded-md">
        <SkeletonAvatar size={32} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
    ))}
  </div>
)

// Dashboard specific skeletons
export const SkeletonDashboard = () => (
  <div className="space-y-6">
    {/* Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 border border-border rounded-lg space-y-2">
          <Skeleton variant="text" width="50%" />
          <Skeleton variant="text" height={32} width="70%" />
        </div>
      ))}
    </div>
    {/* Main Content Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Skeleton variant="rounded" height={300} />
        <SkeletonTable rows={5} columns={3} />
      </div>
      <div className="space-y-4">
        <SkeletonList items={5} />
      </div>
    </div>
  </div>
)

export const SkeletonChat = () => (
  <div className="flex flex-col h-full">
    {/* Chat Header */}
    <div className="p-4 border-b border-border">
      <div className="flex items-center space-x-3">
        <SkeletonAvatar size={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="text" width="20%" />
        </div>
      </div>
    </div>
    {/* Chat Messages */}
    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
          <div className={cn('max-w-[70%] space-y-2', i % 2 === 0 ? 'items-start' : 'items-end')}>
            <div className="flex items-center space-x-2">
              {i % 2 === 0 && <SkeletonAvatar size={24} />}
              <Skeleton variant="text" width={100} />
            </div>
            <Skeleton variant="rounded" height={60} className="w-full" />
          </div>
        </div>
      ))}
    </div>
    {/* Chat Input */}
    <div className="p-4 border-t border-border">
      <Skeleton variant="rounded" height={40} />
    </div>
  </div>
)
