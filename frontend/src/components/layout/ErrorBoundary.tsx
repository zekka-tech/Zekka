import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    }
  }

  static getDerivedStateFromError(_error: Error): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('Error caught by boundary:', error)
    console.error('Error info:', errorInfo.componentStack)

    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }))

    // Send error to logging service (if available)
    if (window.__errorLogger) {
      window.__errorLogger({
        error,
        errorInfo,
        timestamp: new Date().toISOString()
      })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      // If custom fallback provided, use it
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className={cn(
          'flex flex-col items-center justify-center min-h-screen',
          'bg-gradient-to-b from-slate-900 to-slate-950',
          'text-slate-100 p-4'
        )}>
          <div className={cn(
            'bg-slate-800 border border-red-500/30 rounded-lg',
            'p-8 max-w-lg w-full shadow-xl'
          )}>
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-red-950/50 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-2xl font-bold text-center mb-2">
              Something went wrong
            </h1>
            <p className="text-center text-slate-400 mb-6">
              We encountered an unexpected error. Please try refreshing the page or
              contact support if the problem persists.
            </p>

            {/* Error Details (in development only) */}
            {import.meta.env.MODE === 'development' && this.state.error && (
              <div className={cn(
                'bg-slate-900 rounded p-4 mb-6',
                'text-xs font-mono text-red-300',
                'max-h-48 overflow-y-auto border border-red-500/20'
              )}>
                <p className="font-bold mb-2">Error Details:</p>
                <p className="mb-2">{this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <details className="cursor-pointer">
                    <summary className="font-bold mb-2">Stack Trace</summary>
                    <pre className="whitespace-pre-wrap text-xs">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Error Count Warning */}
            {this.state.errorCount > 2 && (
              <div className={cn(
                'bg-yellow-950/50 border border-yellow-700/50 rounded p-3 mb-6',
                'text-xs text-yellow-300'
              )}>
                <p className="font-semibold mb-1">Multiple Errors Detected</p>
                <p>This component has encountered {this.state.errorCount} error(s). Consider reloading the entire page.</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2',
                  'px-4 py-2 rounded',
                  'bg-blue-600 hover:bg-blue-700',
                  'text-white font-medium',
                  'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500'
                )}
                aria-label="Try again"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  'flex-1 px-4 py-2 rounded',
                  'bg-slate-700 hover:bg-slate-600',
                  'text-white font-medium',
                  'transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500'
                )}
                aria-label="Reload page"
              >
                Reload Page
              </button>
            </div>

            {/* Support Link */}
            <p className="text-center text-xs text-slate-500 mt-6">
              If problems persist,{' '}
              <a
                href="mailto:support@zekka.ai"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                contact support
              </a>
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Type augmentation for error logger
declare global {
  interface Window {
    __errorLogger?: (error: any) => void
  }
}
