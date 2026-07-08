import { WifiOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

interface OfflineBannerProps {
  pendingCount?: number
}

/**
 * Displays a sticky banner at the top of the viewport when the device is offline.
 * Optionally shows how many mutations are queued for retry.
 */
export const OfflineBanner = ({ pendingCount = 0 }: OfflineBannerProps) => {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed top-0 inset-x-0 z-[100]',
        'flex items-center justify-center gap-2 px-4 py-2',
        'bg-destructive text-destructive-foreground text-sm font-medium',
        'shadow-md'
      )}
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>
        You are offline.
        {pendingCount > 0
          ? ` ${pendingCount} change${pendingCount !== 1 ? 's' : ''} will sync when reconnected.`
          : ' Changes will sync when reconnected.'}
      </span>
    </div>
  )
}
