import { AlertCircle, AlertTriangle, WifiOff, ServerCrash, Ban, Bug, RefreshCw, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  type?: 'error' | 'warning' | 'network' | 'server' | 'forbidden' | 'notfound' | 'bug'
  title?: string
  message?: string
  details?: string
  code?: string | number
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  showReload?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const ErrorState = ({
  type = 'error',
  title,
  message,
  details,
  code,
  action,
  secondaryAction,
  showReload = true,
  className,
  size = 'md',
}: ErrorStateProps) => {
  const config = {
    error: {
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      defaultTitle: 'Something went wrong',
      defaultMessage: 'An unexpected error occurred. Please try again.',
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
      defaultTitle: 'Warning',
      defaultMessage: 'Please check your input and try again.',
    },
    network: {
      icon: WifiOff,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      defaultTitle: 'Connection Error',
      defaultMessage: 'Unable to connect to the server. Please check your internet connection.',
    },
    server: {
      icon: ServerCrash,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      defaultTitle: 'Server Error',
      defaultMessage: 'Our servers are experiencing issues. Please try again later.',
    },
    forbidden: {
      icon: Ban,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
      defaultTitle: 'Access Denied',
      defaultMessage: "You don't have permission to access this resource.",
    },
    notfound: {
      icon: AlertCircle,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50 dark:bg-gray-950/20',
      defaultTitle: 'Not Found',
      defaultMessage: 'The resource you are looking for does not exist.',
    },
    bug: {
      icon: Bug,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      defaultTitle: 'Application Error',
      defaultMessage: 'An application bug has been detected.',
    },
  }

  const currentConfig = config[type]
  const Icon = currentConfig.icon

  const sizeStyles = {
    sm: {
      container: 'py-8',
      icon: 'w-12 h-12',
      title: 'text-base',
      message: 'text-sm',
      details: 'text-xs',
    },
    md: {
      container: 'py-12',
      icon: 'w-16 h-16',
      title: 'text-lg',
      message: 'text-base',
      details: 'text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'w-20 h-20',
      title: 'text-xl',
      message: 'text-lg',
      details: 'text-base',
    },
  }

  const styles = sizeStyles[size]

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className={cn('flex items-center justify-center w-full', styles.container, className)}>
      <div className="text-center max-w-lg mx-auto px-4">
        {/* Icon */}
        <div className={cn('flex justify-center mb-4 p-4 rounded-full w-fit mx-auto', currentConfig.bgColor)}>
          <Icon className={cn(styles.icon, currentConfig.color)} strokeWidth={1.5} />
        </div>

        {/* Error Code */}
        {code && (
          <div className="text-sm font-mono text-muted-foreground mb-2">
            Error Code: {code}
          </div>
        )}

        {/* Title */}
        <h3 className={cn('font-semibold text-foreground mb-2', styles.title)}>
          {title || currentConfig.defaultTitle}
        </h3>

        {/* Message */}
        <p className={cn('text-muted-foreground mb-4', styles.message)}>
          {message || currentConfig.defaultMessage}
        </p>

        {/* Details (collapsible in production, visible in dev) */}
        {details && (
          <details className={cn('mb-6 text-left', styles.details)}>
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium mb-2">
              Technical Details
            </summary>
            <pre className="p-3 bg-muted rounded-md text-left overflow-x-auto text-xs font-mono">
              {details}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="inline-flex items-center justify-center px-4 py-2 rounded-md font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {action.label}
            </button>
          )}
          {showReload && !action && (
            <button
              onClick={handleReload}
              className="inline-flex items-center justify-center px-4 py-2 rounded-md font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Page
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="inline-flex items-center justify-center px-4 py-2 rounded-md font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              {secondaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Preset error states for common scenarios
export const NetworkError = ({ onRetry }: { onRetry?: () => void }) => (
  <ErrorState
    type="network"
    action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
    secondaryAction={{
      label: 'Go Home',
      onClick: () => (window.location.href = '/'),
    }}
  />
)

export const ServerError = ({ code, details, onRetry }: { code?: number; details?: string; onRetry?: () => void }) => (
  <ErrorState
    type="server"
    code={code}
    details={details}
    action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
  />
)

export const ForbiddenError = () => (
  <ErrorState
    type="forbidden"
    message="You need proper permissions to access this resource. Contact your administrator if you believe this is an error."
    secondaryAction={{
      label: 'Go Home',
      onClick: () => (window.location.href = '/'),
    }}
    showReload={false}
  />
)

export const NotFoundError = () => (
  <ErrorState
    type="notfound"
    title="404 - Page Not Found"
    message="The page you are looking for might have been removed or is temporarily unavailable."
    code="404"
    secondaryAction={{
      label: 'Go Home',
      onClick: () => (window.location.href = '/'),
    }}
    showReload={false}
  />
)

export const APIError = ({ error, onRetry }: { error: Error; onRetry?: () => void }) => (
  <ErrorState
    type="error"
    title="API Error"
    message={error.message}
    details={error.stack}
    action={onRetry ? { label: 'Retry Request', onClick: onRetry } : undefined}
  />
)

// Inline error (for form fields, etc.)
export const InlineError = ({ message, className }: { message: string; className?: string }) => (
  <div className={cn('flex items-center gap-2 text-sm text-red-500 mt-1', className)}>
    <AlertCircle className="w-4 h-4 flex-shrink-0" />
    <span>{message}</span>
  </div>
)

// Error toast notification content
export const ErrorToast = ({ title, message }: { title: string; message?: string }) => (
  <div className="flex items-start gap-3">
    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
      <div className="font-medium text-foreground">{title}</div>
      {message && <div className="text-sm text-muted-foreground mt-1">{message}</div>}
    </div>
  </div>
)
