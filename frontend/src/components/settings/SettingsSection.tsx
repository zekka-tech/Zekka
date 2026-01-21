import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
}

export const SettingsSection = ({
  title,
  description,
  children
}: SettingsSectionProps) => {
  return (
    <div className={cn(
      'border-b border-border last:border-b-0',
      'py-6 px-6'
    )}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}
