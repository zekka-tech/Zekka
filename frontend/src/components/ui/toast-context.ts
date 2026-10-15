import { createContext, useContext } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined)

/**
 * useToast hook - Use to show toast notifications
 *
 * @example
 * const { toast } = useToast()
 * toast({ type: 'success', message: 'Saved!' })
 * toast({ type: 'error', message: 'Error', description: 'Something went wrong' })
 */
export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }

  return {
    toast: context.addToast,
    success: (message: string, description?: string) =>
      context.addToast({ type: 'success', message, description }),
    error: (message: string, description?: string) =>
      context.addToast({ type: 'error', message, description }),
    info: (message: string, description?: string) =>
      context.addToast({ type: 'info', message, description }),
    warning: (message: string, description?: string) =>
      context.addToast({ type: 'warning', message, description }),
    remove: context.removeToast,
    clear: context.clearToasts,
  }
}
