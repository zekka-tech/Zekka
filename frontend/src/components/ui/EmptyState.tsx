import { LucideIcon, Inbox, Search, AlertCircle, FileQuestion, Users, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'search' | 'error' | 'minimal'
}

export const EmptyState = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
  variant = 'default',
}: EmptyStateProps) => {
  const sizeStyles = {
    sm: {
      container: 'py-8',
      icon: 'w-12 h-12',
      title: 'text-base',
      description: 'text-sm',
    },
    md: {
      container: 'py-12',
      icon: 'w-16 h-16',
      title: 'text-lg',
      description: 'text-base',
    },
    lg: {
      container: 'py-16',
      icon: 'w-20 h-20',
      title: 'text-xl',
      description: 'text-lg',
    },
  }

  const variantStyles = {
    default: 'text-muted-foreground',
    search: 'text-blue-500',
    error: 'text-red-500',
    minimal: 'text-muted-foreground/70',
  }

  const styles = sizeStyles[size]

  return (
    <div className={cn('flex items-center justify-center w-full', styles.container, className)}>
      <div className="text-center max-w-md mx-auto px-4">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <Icon className={cn(styles.icon, variantStyles[variant])} strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h3 className={cn('font-semibold text-foreground mb-2', styles.title)}>{title}</h3>

        {/* Description */}
        {description && (
          <p className={cn('text-muted-foreground mb-6', styles.description)}>{description}</p>
        )}

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {action && (
              <button
                onClick={action.onClick}
                className={cn(
                  'inline-flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors',
                  action.variant === 'primary' || !action.variant
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                )}
              >
                {action.label}
              </button>
            )}
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="inline-flex items-center justify-center px-4 py-2 rounded-md font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Preset empty states for common scenarios
export const EmptyStateNoProjects = ({ onCreateProject }: { onCreateProject: () => void }) => (
  <EmptyState
    icon={Inbox}
    title="No projects yet"
    description="Get started by creating your first project. Projects help you organize your work and collaborate with AI agents."
    action={{
      label: 'Create Project',
      onClick: onCreateProject,
      variant: 'primary',
    }}
    secondaryAction={{
      label: 'Learn More',
      onClick: () => window.open('/docs/projects', '_blank'),
    }}
  />
)

export const EmptyStateNoSearchResults = ({ onClearSearch }: { onClearSearch: () => void }) => (
  <EmptyState
    icon={Search}
    title="No results found"
    description="Try adjusting your search or filters to find what you're looking for."
    variant="search"
    action={{
      label: 'Clear Search',
      onClick: onClearSearch,
      variant: 'secondary',
    }}
  />
)

export const EmptyStateNoAgents = ({ onAddAgent }: { onAddAgent: () => void }) => (
  <EmptyState
    icon={Users}
    title="No agents available"
    description="Add AI agents to help automate tasks, write code, and collaborate on your projects."
    action={{
      label: 'Add Agent',
      onClick: onAddAgent,
      variant: 'primary',
    }}
  />
)

export const EmptyStateNoActivity = () => (
  <EmptyState
    icon={Zap}
    title="No recent activity"
    description="When you start working on projects, your activity will appear here."
    size="sm"
    variant="minimal"
  />
)

export const EmptyStateError = ({ error, onRetry }: { error: string; onRetry?: () => void }) => (
  <EmptyState
    icon={AlertCircle}
    title="Something went wrong"
    description={error}
    variant="error"
    action={
      onRetry
        ? {
            label: 'Try Again',
            onClick: onRetry,
            variant: 'primary',
          }
        : undefined
    }
  />
)

export const EmptyStateNoData = ({ resource }: { resource: string }) => (
  <EmptyState
    icon={FileQuestion}
    title={`No ${resource} found`}
    description={`There are no ${resource} to display at the moment.`}
    size="sm"
    variant="minimal"
  />
)

// Empty state with custom illustration
export const EmptyStateWithIllustration = ({
  illustration,
  title,
  description,
  action,
}: {
  illustration: string | React.ReactNode
  title: string
  description?: string
  action?: EmptyStateProps['action']
}) => (
  <div className="flex items-center justify-center w-full py-12">
    <div className="text-center max-w-md mx-auto px-4">
      {/* Custom Illustration */}
      <div className="flex justify-center mb-6">
        {typeof illustration === 'string' ? (
          <img src={illustration} alt="" className="w-48 h-48 object-contain opacity-80" />
        ) : (
          illustration
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-lg text-foreground mb-2">{title}</h3>

      {/* Description */}
      {description && <p className="text-base text-muted-foreground mb-6">{description}</p>}

      {/* Action */}
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center justify-center px-4 py-2 rounded-md font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  </div>
)
