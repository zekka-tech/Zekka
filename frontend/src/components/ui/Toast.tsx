import { type ReactNode, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ToastContext, type Toast, type ToastType } from './toast-context'

export type { Toast, ToastType }

/**
 * Toast Provider - Manages toast notifications
 * Wrap your app with this provider to use toasts
 *
 * @example
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = { ...toast, id, duration: toast.duration ?? 5000 }

    setToasts((prev) => [...prev, newToast])

    // Auto-remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => removeToast(id), newToast.duration)
    }

    return id
  }, [removeToast])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

/**
 * ToastContainer - Renders all active toasts
 */
const ToastContainer = ({
  toasts,
  onRemove,
}: {
  toasts: Toast[]
  onRemove: (id: string) => void
}) => {
  return (
    <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-3 p-4 pointer-events-none">
      {toasts.map((toast) => (
        <ToastElement key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

/**
 * ToastElement - Individual toast notification
 */
const ToastElement = ({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) => {
  const variants = {
    success: {
      bg: 'bg-green-50 dark:bg-green-950',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-900 dark:text-green-100',
      icon: <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />,
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-950',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-900 dark:text-red-100',
      icon: <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-900 dark:text-amber-100',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />,
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-900 dark:text-blue-100',
      icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />,
    },
  }

  const variant = variants[toast.type]

  return (
    <div
      className={cn(
        'rounded-lg border shadow-lg p-4 pointer-events-auto',
        'max-w-md w-full',
        'animate-in slide-in-from-right-full duration-300',
        'transition-all',
        variant.bg,
        variant.border,
        variant.text
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {variant.icon}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{toast.message}</p>
          {toast.description && <p className="text-sm opacity-90 mt-1">{toast.description}</p>}

          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick()
                onRemove(toast.id)
              }}
              className={cn(
                'text-sm font-semibold mt-2 underline',
                'hover:opacity-80 transition-opacity',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                toast.type === 'success' && 'focus:ring-green-500',
                toast.type === 'error' && 'focus:ring-red-500',
                toast.type === 'warning' && 'focus:ring-amber-500',
                toast.type === 'info' && 'focus:ring-blue-500'
              )}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          onClick={() => onRemove(toast.id)}
          className={cn(
            'flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 rounded',
            toast.type === 'success' && 'focus:ring-green-500',
            toast.type === 'error' && 'focus:ring-red-500',
            toast.type === 'warning' && 'focus:ring-amber-500',
            toast.type === 'info' && 'focus:ring-blue-500'
          )}
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
